/**
 * BarberControl v1.0 | Servicio de Citas (reglas del negocio)
 * src/services/cita.service.ts
 *
 * registrarCita() es el proceso de ALTA de la entidad central. Lee como una
 * receta: cada paso es una función con nombre propio que lanza un error de
 * negocio si la regla no se cumple. La última barrera (RF-03) la pone la BD.
 */
import { ReglaDeNegocioError, NoEncontradoError } from '../errors/errores';
import { hayBloqueoEn, listarTramosDelDia } from '../repositories/agenda.repository';
import { barberoOfreceServicio, buscarBarberoActivo, buscarServicioActivo } from '../repositories/catalogo.repository';
import { crearCita } from '../repositories/cita.repository';
import { buscarClienteActivo } from '../repositories/usuario.repository';
import type { SolicitudCita } from '../types/cita';
import { ahoraLocal, sumarMinutos } from '../utils/fechas';
import { validarNuevaCita } from '../validators/cita.validator';
import { cabeEnAlgunTramo, diaDeLaSemana, empiezaEnBloqueDe15 } from './disponibilidad';

export async function registrarCita(cuerpo: unknown) {
  const solicitud = validarNuevaCita(cuerpo);

  await exigirClienteActivo(solicitud.idCliente);
  const servicio = await exigirServicioActivo(solicitud.idServicio);
  await exigirBarberoQueOfrece(solicitud.idBarbero, solicitud.idServicio);
  exigirFechaFutura(solicitud.fechaHoraInicio);
  await exigirDentroDelHorario(solicitud, servicio.duracionMin);
  await exigirSinBloqueo(solicitud, servicio.duracionMin);

  return crearCita({
    ...solicitud,
    duracionMin: servicio.duracionMin,
    precio: servicio.precio,
    idUsuarioActor: solicitud.idCliente, // el cliente agenda por sí mismo (aún no hay login)
  });
}

async function exigirClienteActivo(idCliente: number): Promise<void> {
  if (!(await buscarClienteActivo(idCliente))) throw new NoEncontradoError('Cliente');
}

async function exigirServicioActivo(idServicio: number) {
  const servicio = await buscarServicioActivo(idServicio);
  if (!servicio) throw new NoEncontradoError('Servicio');
  return servicio;
}

async function exigirBarberoQueOfrece(idBarbero: number, idServicio: number): Promise<void> {
  if (!(await buscarBarberoActivo(idBarbero))) throw new NoEncontradoError('Barbero');
  if (!(await barberoOfreceServicio(idBarbero, idServicio))) {
    throw new ReglaDeNegocioError('El barbero seleccionado no ofrece este servicio', 'BARBERO_NO_OFRECE_SERVICIO');
  }
}

function exigirFechaFutura(inicio: Date): void {
  if (inicio.getTime() <= ahoraLocal().getTime()) {
    throw new ReglaDeNegocioError('La cita debe agendarse en una fecha y hora futuras', 'FECHA_PASADA');
  }
  if (!empiezaEnBloqueDe15(inicio)) {
    throw new ReglaDeNegocioError('La hora de inicio debe ser múltiplo de 15 minutos (:00, :15, :30, :45)', 'HORA_NO_VALIDA');
  }
}

async function exigirDentroDelHorario({ idBarbero, fechaHoraInicio }: SolicitudCita, duracionMin: number): Promise<void> {
  const tramos = await listarTramosDelDia(idBarbero, diaDeLaSemana(fechaHoraInicio));
  if (!cabeEnAlgunTramo(fechaHoraInicio, duracionMin, tramos)) {
    throw new ReglaDeNegocioError('El barbero no atiende en ese horario', 'FUERA_DE_HORARIO');
  }
}

async function exigirSinBloqueo({ idBarbero, fechaHoraInicio }: SolicitudCita, duracionMin: number): Promise<void> {
  const fin = sumarMinutos(fechaHoraInicio, duracionMin);
  if (await hayBloqueoEn(idBarbero, fechaHoraInicio, fin)) {
    throw new ReglaDeNegocioError('El barbero tiene la agenda bloqueada en ese horario', 'AGENDA_BLOQUEADA');
  }
}
