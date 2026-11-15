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
import type { CitaParaGuardar } from '../types/cita';

export const ESTADO = { PENDIENTE: 1, EN_ATENCION: 2, FINALIZADA: 3, CANCELADA: 4 } as const;

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
