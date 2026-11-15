/**
 * BarberControl v1.2 | Quién puede modificar una cita y cómo (funciones puras)
 * src/services/permisos-cita.ts
 *
 * Ciclo de vida de la cita (estados del script 7.1):
 *
 *     Pendiente ──► En Atención ──► Finalizada
 *         │
 *         └──────► Cancelada   (libera el horario, RF-05)
 *
 *  - Cancelar: el cliente dueño de la cita o el administrador.
 *  - Atender / finalizar: el barbero asignado o el administrador.
 *  - Reprogramar: el cliente dueño o el administrador, solo si sigue Pendiente.
 *
 * No consultan la BD, por eso se prueban sin ella (tests/permisos-cita.test.ts).
 */
import { ESTADO, NOMBRE_ESTADO, ROL } from '../constants/catalogos';
import { ProhibidoError, ReglaDeNegocioError } from '../errors/errores';

/** Quién realiza la acción. */
export interface Actor {
  idUsuario: number;
  idRol: number;
}

/** Lo que hace falta saber de la cita para decidir. */
export interface CitaActual {
  idEstado: number;
  idCliente: number;
  idUsuarioBarbero: number; // usuario del barbero asignado
}

/** Estado actual -> estados a los que puede pasar. */
export const TRANSICIONES: Readonly<Record<number, readonly number[]>> = {
  [ESTADO.PENDIENTE]: [ESTADO.EN_ATENCION, ESTADO.CANCELADA],
  [ESTADO.EN_ATENCION]: [ESTADO.FINALIZADA],
  [ESTADO.FINALIZADA]: [],
  [ESTADO.CANCELADA]: [],
};

export function esTransicionValida(actual: number, nuevo: number): boolean {
  return TRANSICIONES[actual]?.includes(nuevo) ?? false;
}

const esAdmin = (actor: Actor) => actor.idRol === ROL.ADMINISTRADOR;
const esElCliente = (actor: Actor, cita: CitaActual) => actor.idRol === ROL.CLIENTE && actor.idUsuario === cita.idCliente;
const esSuBarbero = (actor: Actor, cita: CitaActual) =>
  actor.idRol === ROL.BARBERO && actor.idUsuario === cita.idUsuarioBarbero;

/** ¿Este actor puede llevar la cita a ese estado? (sin revisar todavía si la transición existe) */
export function puedeCambiarA(actor: Actor, cita: CitaActual, nuevo: number): boolean {
  if (esAdmin(actor)) return true;
  if (nuevo === ESTADO.CANCELADA) return esElCliente(actor, cita);
  return esSuBarbero(actor, cita); // En Atención / Finalizada
}

export function exigirCambioDeEstadoPermitido(actor: Actor, cita: CitaActual, nuevo: number): void {
  if (!puedeCambiarA(actor, cita, nuevo)) {
    throw new ProhibidoError(`No tienes permiso para marcar esta cita como ${NOMBRE_ESTADO[nuevo] ?? nuevo}`);
  }
  if (!esTransicionValida(cita.idEstado, nuevo)) {
    throw new ReglaDeNegocioError(
      `Una cita ${NOMBRE_ESTADO[cita.idEstado]} no puede pasar a ${NOMBRE_ESTADO[nuevo] ?? nuevo}`,
      'TRANSICION_NO_PERMITIDA',
    );
  }
}

export function exigirReprogramacionPermitida(actor: Actor, cita: CitaActual): void {
  if (!esAdmin(actor) && !esElCliente(actor, cita)) {
    throw new ProhibidoError('Solo el cliente de la cita o el administrador pueden reprogramarla');
  }
  if (cita.idEstado !== ESTADO.PENDIENTE) {
    throw new ReglaDeNegocioError(
      `Solo se reprograman citas Pendientes; esta cita está ${NOMBRE_ESTADO[cita.idEstado]}`,
      'CITA_NO_MODIFICABLE',
    );
  }
}
