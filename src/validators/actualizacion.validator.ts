/**
 * BarberControl v1.2 | Validación de las actualizaciones de una cita
 * src/validators/actualizacion.validator.ts
 *
 * Solo FORMATO. Permisos y reglas de agenda viven en los servicios.
 */
import { ESTADO } from '../constants/catalogos';
import type { SolicitudCambioDeEstado, SolicitudReprogramacion } from '../types/cita';
import { LectorDeCampos } from './lector-de-campos';

const CAMPOS_REPROGRAMABLES = ['fechaHoraInicio', 'idBarbero', 'idServicio', 'observaciones'];

/** PATCH /api/citas/:folio — todos los campos son opcionales, pero debe venir al menos uno. */
export function validarReprogramacion(cuerpo: unknown): SolicitudReprogramacion {
  const campos = new LectorDeCampos(cuerpo);

  const idUsuario = campos.enteroPositivo('idUsuario');
  const fechaHoraInicio = campos.fechaHoraLocal('fechaHoraInicio', { opcional: true });
  const idBarbero = campos.enteroPositivo('idBarbero', { opcional: true });
  const idServicio = campos.enteroPositivo('idServicio', { opcional: true });
  const observaciones = campos.texto('observaciones', { max: 255, opcional: true });
  campos.exigir(
    CAMPOS_REPROGRAMABLES.some((campo) => campos.trae(campo)),
    `Indica al menos un dato a cambiar: ${CAMPOS_REPROGRAMABLES.join(', ')}`,
  );
  campos.exigir(!campos.trae('idCliente'), 'idCliente no se puede cambiar: la cita pertenece a quien la agendó');
  campos.terminar();

  return { idUsuario: idUsuario!, fechaHoraInicio, idBarbero, idServicio, observaciones };
}

/** PATCH /api/citas/:folio/estado — { idUsuario, idEstado } */
export function validarCambioDeEstado(cuerpo: unknown): SolicitudCambioDeEstado {
  const campos = new LectorDeCampos(cuerpo);

  const idUsuario = campos.enteroPositivo('idUsuario');
  const idEstado = campos.enteroPositivo('idEstado');
  const destinosPosibles: number[] = [ESTADO.EN_ATENCION, ESTADO.FINALIZADA, ESTADO.CANCELADA];
  campos.exigir(
    idEstado === undefined || destinosPosibles.includes(idEstado),
    'idEstado debe ser 2 (En Atención), 3 (Finalizada) o 4 (Cancelada)',
  );
  campos.terminar();

  return { idUsuario: idUsuario!, idEstado: idEstado! };
}
