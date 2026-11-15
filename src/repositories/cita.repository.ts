/**
 * BarberControl v1.0 | Repositorio de Citas (capa Modelo del MVC)
 * src/repositories/cita.repository.ts
 *
 * Solo guarda y consulta. Las reglas del negocio (¿el barbero atiende ese día?,
 * ¿el cliente existe?...) viven en services/cita.service.ts.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ConflictoError } from '../errors/errores';
import { ESTADO } from '../constants/catalogos';
import type { CambiosDeCita, CitaParaGuardar } from '../types/cita';

export { ESTADO }; // se conserva la exportación del Sprint 1

/** Error de negocio: el horario ya está ocupado (RF-03). */
export class HorarioOcupadoError extends ConflictoError {
  constructor() {
    super('RF-03: el barbero ya tiene una cita en ese horario', 'HORARIO_OCUPADO');
  }
}

/** Relaciones que se cargan al consultar una cita (JOIN con 5 tablas). */
const detalleCita = {
  cliente: { select: { nombre: true, apellidos: true, correo: true } },
  barbero: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
  servicio: true,
  estado: true,
  historial: { include: { estadoNuevo: true }, orderBy: { fechaCambio: 'asc' } },
} satisfies Prisma.CitaInclude;

/**
 * INSERT de la cita dentro de una transacción.
 * La BD genera el folio, calcula fecha_hora_fin, pone el estado Pendiente y
 * rechaza el INSERT si se traslapa con otra cita (EXCLUDE, RF-03).
 */
export async function crearCita(cita: CitaParaGuardar) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Indica al trigger de bitácora quién hace el cambio (SET LOCAL).
      await tx.$queryRaw`SELECT set_config('barbercontrol.id_usuario', ${String(cita.idUsuarioActor)}, true)`;

      return tx.cita.create({
        data: {
          idCliente: cita.idCliente,
          idBarbero: cita.idBarbero,
          idServicio: cita.idServicio,
          fechaHoraInicio: cita.fechaHoraInicio,
          duracionMinAplicada: cita.duracionMin, // copia del catálogo
          precioAplicado: cita.precio as Prisma.Decimal, // copia del catálogo
          observaciones: cita.observaciones,
        },
        include: detalleCita,
      });
    });
  } catch (error) {
    if (esViolacionDeSolapamiento(error)) throw new HorarioOcupadoError();
    throw error;
  }
}

/** PostgreSQL responde con SQLSTATE 23P01 y el nombre de la restricción. */
function esViolacionDeSolapamiento(error: unknown): boolean {
  return String((error as Error)?.message).includes('ex_cita_sin_solapamiento');
}

/** SELECT de una cita por folio con cliente, barbero, servicio, estado e historial. */
export function buscarCitaPorFolio(folio: string) {
  return prisma.cita.findUnique({ where: { folio }, include: detalleCita });
}

/** Fila de la vista v_agenda_diaria (RF-04). */
export interface FilaAgenda {
  folio: string;
  fecha_hora_inicio: Date;
  fecha_hora_fin: Date;
  barbero: string;
  cliente: string;
  servicio: string;
  estado: string;
}

/**
 * Consulta SQL directa (parametrizada) a la vista v_agenda_diaria.
 * Las vistas se consultan con $queryRaw; Prisma escapa ${fecha} como parámetro $1.
 */
export function agendaDelDia(fecha: string) {
  return prisma.$queryRaw<FilaAgenda[]>`
    SELECT folio, fecha_hora_inicio, fecha_hora_fin, barbero, cliente, servicio, estado
    FROM v_agenda_diaria
    WHERE fecha = ${fecha}::date
    ORDER BY fecha_hora_inicio`;
}

/** Columnas que se muestran en los listados (más ligero que detalleCita). */
const resumenCita = {
  folio: true,
  fechaHoraInicio: true,
  fechaHoraFin: true,
  precioAplicado: true,
  observaciones: true,
  cliente: { select: { idUsuario: true, nombre: true, apellidos: true } },
  barbero: { select: { idBarbero: true, usuario: { select: { nombre: true, apellidos: true } } } },
  servicio: { select: { idServicio: true, nombre: true } },
  estado: { select: { idEstado: true, nombre: true } },
} satisfies Prisma.CitaSelect;

export interface CriteriosDeBusqueda {
  desde?: Date;
  hasta?: Date;
  idBarbero?: number;
  idCliente?: number;
  idEstado?: number;
  saltar: number;
  tomar: number;
}

/**
 * SELECT con filtros opcionales + COUNT(*) del total, en una sola transacción
 * para que la página y el total sean consistentes entre sí.
 * Prisma ignora los filtros undefined (equivale a no escribir ese WHERE).
 * Usa el índice idx_cita_barbero_inicio cuando se filtra por barbero y fecha (RNF-01).
 */
export async function listarCitas(criterios: CriteriosDeBusqueda) {
  const where: Prisma.CitaWhereInput = {
    idBarbero: criterios.idBarbero,
    idCliente: criterios.idCliente,
    idEstado: criterios.idEstado,
    fechaHoraInicio: criterios.desde || criterios.hasta ? { gte: criterios.desde, lt: criterios.hasta } : undefined,
  };
  const [total, citas] = await prisma.$transaction([
    prisma.cita.count({ where }),
    prisma.cita.findMany({
      where,
      select: resumenCita,
      orderBy: [{ fechaHoraInicio: 'asc' }, { idCita: 'asc' }],
      skip: criterios.saltar,
      take: criterios.tomar,
    }),
  ]);
  return { total, citas };
}

/** Datos mínimos de la cita para decidir permisos y reglas antes de modificarla. */
export function buscarCitaParaActualizar(folio: string) {
  return prisma.cita.findUnique({
    where: { folio },
    select: {
      idCita: true,
      idEstado: true,
      idCliente: true,
      idBarbero: true,
      idServicio: true,
      fechaHoraInicio: true,
      duracionMinAplicada: true,
      precioAplicado: true,
      observaciones: true,
      barbero: { select: { idUsuario: true } },
    },
  });
}

/** Otra petición cambió la cita entre la lectura y la escritura. */
export class CitaModificadaError extends ConflictoError {
  constructor() {
    super('La cita cambió mientras se procesaba tu solicitud; vuelve a consultarla', 'CITA_MODIFICADA');
  }
}

/**
 * UPDATE de horario/barbero/servicio dentro de una transacción.
 *  - "WHERE id_estado = Pendiente" evita reprogramar una cita que otro usuario
 *    acaba de cancelar o atender (si no se actualiza ninguna fila -> 409).
 *  - La BD recalcula fecha_hora_fin y vuelve a aplicar la restricción EXCLUDE:
 *    si el nuevo horario se traslapa con otra cita activa, rechaza el UPDATE (RF-03).
 */
export async function reprogramarCita(idCita: number, cambios: CambiosDeCita, idUsuarioActor: number) {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('barbercontrol.id_usuario', ${String(idUsuarioActor)}, true)`;

      const { count } = await tx.cita.updateMany({
        where: { idCita, idEstado: ESTADO.PENDIENTE },
        data: {
          fechaHoraInicio: cambios.fechaHoraInicio,
          idBarbero: cambios.idBarbero,
          idServicio: cambios.idServicio,
          duracionMinAplicada: cambios.duracionMin,
          precioAplicado: cambios.precio as Prisma.Decimal,
          observaciones: cambios.observaciones,
        },
      });
      if (count === 0) throw new CitaModificadaError();

      return tx.cita.findUniqueOrThrow({ where: { idCita }, include: detalleCita });
    });
  } catch (error) {
    if (esViolacionDeSolapamiento(error)) throw new HorarioOcupadoError();
    throw error;
  }
}

/**
 * UPDATE del estado. El trigger trg_cita_historial escribe la bitácora con el
 * usuario indicado en SET LOCAL. "WHERE id_estado = estadoActual" protege
 * contra dos cambios simultáneos (p. ej. cancelar y atender a la vez).
 * Al pasar a Cancelada, la restricción EXCLUDE deja de considerar la cita y
 * el horario queda libre (RF-05).
 */
export async function cambiarEstadoCita(idCita: number, estadoActual: number, estadoNuevo: number, idUsuarioActor: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('barbercontrol.id_usuario', ${String(idUsuarioActor)}, true)`;

    const { count } = await tx.cita.updateMany({
      where: { idCita, idEstado: estadoActual },
      data: { idEstado: estadoNuevo },
    });
    if (count === 0) throw new CitaModificadaError();

    return tx.cita.findUniqueOrThrow({ where: { idCita }, include: detalleCita });
  });
}
