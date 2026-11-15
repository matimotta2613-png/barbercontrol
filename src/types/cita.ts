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

/** Cambios pedidos al reprogramar (HU-09). Solo trae lo que el usuario quiere modificar. */
export interface SolicitudReprogramacion {
  idUsuario: number; // quién hace el cambio (temporal hasta tener login, HU-05)
  fechaHoraInicio?: Date;
  idBarbero?: number;
  idServicio?: number;
  observaciones?: string;
}

/** Solicitud de cambio de estado (HU-06 cancelar, HU-08 atender/finalizar). */
export interface SolicitudCambioDeEstado {
  idUsuario: number;
  idEstado: number;
}

/** Lo que se escribe en la BD al reprogramar. */
export interface CambiosDeCita {
  fechaHoraInicio: Date;
  idBarbero: number;
  idServicio: number;
  duracionMin: number;
  precio: unknown; // Prisma.Decimal: copia del catálogo si cambió el servicio
  observaciones?: string;
}
