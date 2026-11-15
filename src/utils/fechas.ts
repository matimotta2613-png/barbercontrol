/**
 * BarberControl v1.0 | Utilidades de fecha
 * src/utils/fechas.ts
 *
 * Las columnas de la BD son TIMESTAMP *sin* zona horaria y guardan la hora
 * local de la barbería tal cual (p. ej. 11:00). Prisma intercambia esos valores
 * como fechas UTC, así que para que 11:00 se guarde como 11:00 (y no se recorra
 * 6 horas por la zona de México) construimos y mostramos las fechas en UTC.
 */

const ZONA_HORARIA_BARBERIA = process.env.ZONA_HORARIA ?? 'America/Chihuahua';
const MS_POR_MINUTO = 60_000;

/** "2026-11-20 11:00" -> Date que Prisma guardará como 2026-11-20 11:00:00 */
export function horaLocal(texto: string): Date {
  return new Date(texto.replace(' ', 'T') + ':00Z');
}

/** Date leído de la BD -> "2026-11-20 11:00" */
export function formatearFechaHora(fecha: Date | null): string {
  return fecha ? fecha.toISOString().slice(0, 16).replace('T', ' ') : '—';
}

/** Como horaLocal, pero devuelve null si el texto no es una fecha y hora reales ("2026-02-30 10:00"). */
export function leerHoraLocal(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(texto)) return null;
  const fecha = horaLocal(texto);
  const esValida = !Number.isNaN(fecha.getTime()) && formatearFechaHora(fecha) === texto.replace('T', ' ');
  return esValida ? fecha : null;
}

/** "2026-11-20" -> Date a las 00:00 de ese día, o null si no es una fecha real ("2026-02-30"). */
export function leerFechaLocal(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  return leerHoraLocal(`${texto} 00:00`);
}

/** Hora actual en la barbería, expresada con la misma convención (reloj local guardado como UTC). */
export function ahoraLocal(ahora: Date = new Date()): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_BARBERIA,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(ahora);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return horaLocal(`${valor('year')}-${valor('month')}-${valor('day')} ${valor('hour')}:${valor('minute')}`);
}

export function sumarMinutos(fecha: Date, minutos: number): Date {
  return new Date(fecha.getTime() + minutos * MS_POR_MINUTO);
}
