/**
 * BarberControl v1.0 | Repositorio de disponibilidad (horarios y bloqueos)
 * src/repositories/agenda.repository.ts
 */
import { prisma } from '../config/database';

/** Tramos de trabajo de un barbero en un día de la semana (1 = lunes ... 7 = domingo). */
export function listarTramosDelDia(idBarbero: number, diaSemana: number) {
  return prisma.horarioBarbero.findMany({ where: { idBarbero, diaSemana } });
}

/** ¿Hay un bloqueo (falta, vacaciones...) que se traslape con [inicio, fin)? */
export async function hayBloqueoEn(idBarbero: number, inicio: Date, fin: Date): Promise<boolean> {
  const total = await prisma.bloqueoAgenda.count({
    where: { idBarbero, fechaHoraInicio: { lt: fin }, fechaHoraFin: { gt: inicio } },
  });
  return total > 0;
}
