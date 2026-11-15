/**
 * BarberControl v1.0 | Tipos compartidos de la entidad Cita
 * src/types/cita.ts
 */

/** Datos de una cita ya validados en formato (salida del validador). */
export interface SolicitudCita {
  idCliente: number;
  idBarbero: number;
  idServicio: number;
  fechaHoraInicio: Date; // hora local de la barbería (ver utils/fechas.ts)
  observaciones?: string;
}

/** Cita lista para insertarse: ya incluye la copia de duración y precio del catálogo. */
export interface CitaParaGuardar extends SolicitudCita {
  duracionMin: number;
  precio: unknown; // Prisma.Decimal tal como lo entrega el catálogo
  idUsuarioActor: number; // quién realiza la acción (bitácora)
}
