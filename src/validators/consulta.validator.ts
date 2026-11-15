/**
 * BarberControl v1.2 | Validación de los filtros de consulta de citas
 * src/validators/consulta.validator.ts
 *
 * Los parámetros de la URL (?fecha=...&idBarbero=...) siempre llegan como
 * texto. Aquí se convierten a números/fechas y se acumulan TODOS los errores.
 */
import { ErrorDeValidacion } from '../errors/errores';
import { leerFechaLocal } from '../utils/fechas';

export const POR_PAGINA_PREDETERMINADO = 20;
export const POR_PAGINA_MAXIMO = 100;
const ESTADOS_VALIDOS = [1, 2, 3, 4];
const PARAMETROS_PERMITIDOS = ['fecha', 'desde', 'hasta', 'idBarbero', 'idCliente', 'idEstado', 'pagina', 'porPagina'];

/** Filtros ya convertidos. Un campo undefined significa "no filtrar por eso". */
export interface FiltrosCitas {
  desde?: Date; // inicio del rango (incluido)
  hasta?: Date; // fin del rango (excluido)
  idBarbero?: number;
  idCliente?: number;
  idEstado?: number;
  pagina: number;
  porPagina: number;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export function validarFiltrosDeCitas(query: Record<string, unknown>): FiltrosCitas {
  const errores: string[] = [];
  const texto = (campo: string): string | undefined => {
    const valor = query[campo];
    if (valor === undefined || valor === '') return undefined;
    if (typeof valor !== 'string') {
      errores.push(`${campo} debe enviarse una sola vez`);
      return undefined;
    }
    return valor.trim();
  };
  const entero = (campo: string, min = 1): number | undefined => {
    const valor = texto(campo);
    if (valor === undefined) return undefined;
    if (!/^\d+$/.test(valor) || Number(valor) < min) {
      errores.push(`${campo} debe ser un número entero mayor o igual a ${min}`);
      return undefined;
    }
    return Number(valor);
  };
  const dia = (campo: string): Date | undefined => {
    const valor = texto(campo);
    if (valor === undefined) return undefined;
    const fecha = leerFechaLocal(valor);
    if (!fecha) errores.push(`${campo} debe tener el formato AAAA-MM-DD`);
    return fecha ?? undefined;
  };

  for (const campo of Object.keys(query)) {
    if (!PARAMETROS_PERMITIDOS.includes(campo)) errores.push(`Parámetro desconocido: ${campo}`);
  }

  const fecha = dia('fecha');
  const desde = dia('desde');
  const hasta = dia('hasta');
  const idBarbero = entero('idBarbero');
  const idCliente = entero('idCliente');
  const idEstado = entero('idEstado');
  const pagina = entero('pagina') ?? 1;
  const porPagina = entero('porPagina') ?? POR_PAGINA_PREDETERMINADO;

  if (fecha && (desde || hasta)) errores.push('Usa fecha (un solo día) o desde/hasta (rango), no ambos');
  if (desde && hasta && hasta < desde) errores.push('hasta no puede ser anterior a desde');
  if (idEstado !== undefined && !ESTADOS_VALIDOS.includes(idEstado)) {
    errores.push('idEstado debe ser 1 (Pendiente), 2 (En Atención), 3 (Finalizada) o 4 (Cancelada)');
  }
  if (porPagina > POR_PAGINA_MAXIMO) errores.push(`porPagina no puede pasar de ${POR_PAGINA_MAXIMO}`);

  if (errores.length > 0) throw new ErrorDeValidacion(errores);

  // "hasta" es inclusivo para quien consulta (todo ese día), por eso se le suma un día.
  const inicioRango = fecha ?? desde;
  const finRango = fecha ? new Date(fecha.getTime() + UN_DIA_MS) : hasta && new Date(hasta.getTime() + UN_DIA_MS);

  return { desde: inicioRango, hasta: finRango, idBarbero, idCliente, idEstado, pagina, porPagina };
}

/** Fecha de la agenda diaria (RF-04): GET /api/agenda/:fecha */
export function validarFechaDeAgenda(texto: string): string {
  if (!leerFechaLocal(texto)) throw new ErrorDeValidacion(['La fecha debe tener el formato AAAA-MM-DD']);
  return texto;
}
