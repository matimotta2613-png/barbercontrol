/**
 * BarberControl v1.0 | Reglas de disponibilidad (funciones puras)
 * src/services/disponibilidad.ts
 *
 * No consultan la BD: reciben datos y responden sí/no. Por eso se pueden
 * probar sin base de datos (ver tests/disponibilidad.test.ts).
 */

/** Tramo de trabajo de un barbero (fila de horario_barbero). Las columnas TIME llegan como Date en UTC. */
export interface TramoHorario {
  horaInicio: Date;
  horaFin: Date;
}

export const MINUTOS_POR_BLOQUE = 15; // las duraciones del catálogo son múltiplos de 15

/** Día ISO como lo guarda horario_barbero: 1 = lunes ... 7 = domingo. */
export function diaDeLaSemana(fecha: Date): number {
  return fecha.getUTCDay() === 0 ? 7 : fecha.getUTCDay();
}

export function minutosDelDia(fecha: Date): number {
  return fecha.getUTCHours() * 60 + fecha.getUTCMinutes();
}

export function empiezaEnBloqueDe15(inicio: Date): boolean {
  return minutosDelDia(inicio) % MINUTOS_POR_BLOQUE === 0;
}

/** La cita completa (inicio + duración) debe caber dentro de UN tramo de trabajo. */
export function cabeEnAlgunTramo(inicio: Date, duracionMin: number, tramos: TramoHorario[]): boolean {
  const minutoInicio = minutosDelDia(inicio);
  const minutoFin = minutoInicio + duracionMin;
  return tramos.some(
    (tramo) => minutoInicio >= minutosDelDia(tramo.horaInicio) && minutoFin <= minutosDelDia(tramo.horaFin),
  );
}
