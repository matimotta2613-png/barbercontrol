/**
 * BarberControl v1.2 | Proceso de CONSULTA de citas (Sprint 2)
 * src/services/cita-consulta.service.ts
 *
 *  - consultarCitas(): listado con filtros (fecha o rango, barbero, cliente,
 *    estado) y paginación. Cubre el historial del cliente (HU-10) y la
 *    búsqueda del administrador.
 *  - consultarAgendaDelDia(): agenda diaria a partir de la vista v_agenda_diaria (RF-04, HU-07).
 *  - La consulta de una sola cita por folio (HU-04) ya existía desde el Sprint 1.
 */
import { agendaDelDia, listarCitas } from '../repositories/cita.repository';
import { validarFechaDeAgenda, validarFiltrosDeCitas } from '../validators/consulta.validator';

export async function consultarCitas(query: Record<string, unknown>) {
  const filtros = validarFiltrosDeCitas(query);
  const { total, citas } = await listarCitas({
    desde: filtros.desde,
    hasta: filtros.hasta,
    idBarbero: filtros.idBarbero,
    idCliente: filtros.idCliente,
    idEstado: filtros.idEstado,
    saltar: (filtros.pagina - 1) * filtros.porPagina,
    tomar: filtros.porPagina,
  });

  return {
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    total,
    totalPaginas: Math.ceil(total / filtros.porPagina),
    citas,
  };
}

export async function consultarAgendaDelDia(fecha: string, incluirCanceladas: boolean) {
  const filas = await agendaDelDia(validarFechaDeAgenda(fecha));
  const citas = incluirCanceladas ? filas : filas.filter((fila) => fila.estado !== 'Cancelada');
  return { fecha, totalCitas: citas.length, citas };
}
