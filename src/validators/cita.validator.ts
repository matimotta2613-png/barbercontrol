/**
 * BarberControl v1.0 | Validación del alta de cita
 * src/validators/cita.validator.ts
 *
 * Solo revisa FORMATO (tipos, longitudes, fecha legible). Las reglas que
 * necesitan consultar la BD (barbero activo, horario libre...) viven en
 * services/cita.service.ts.
 */
import type { SolicitudCita } from '../types/cita';
import { LectorDeCampos } from './lector-de-campos';

export function validarNuevaCita(cuerpo: unknown): SolicitudCita {
  const campos = new LectorDeCampos(cuerpo);

  const idCliente = campos.enteroPositivo('idCliente');
  const idBarbero = campos.enteroPositivo('idBarbero');
  const idServicio = campos.enteroPositivo('idServicio');
  const fechaHoraInicio = campos.fechaHoraLocal('fechaHoraInicio');
  const observaciones = campos.texto('observaciones', { max: 255, opcional: true });
  campos.terminar();

  return {
    idCliente: idCliente!,
    idBarbero: idBarbero!,
    idServicio: idServicio!,
    fechaHoraInicio: fechaHoraInicio!,
    observaciones,
  };
}
