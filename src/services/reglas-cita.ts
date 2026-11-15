/**
 * BarberControl v1.2 | Reglas de agenda compartidas por alta y reprogramación
 * src/services/reglas-cita.ts
 *
 * Antes vivían dentro de cita.service.ts. Se separaron en el Sprint 2 porque
 * reprogramar una cita (HU-09) debe cumplir exactamente las mismas reglas que
 * agendarla: barbero que ofrece el servicio, fecha futura, horario y bloqueos.
 */
import { NoEncontradoError, ReglaDeNegocioError } from '../errors/errores';
import { hayBloqueoEn, listarTramosDelDia } from '../repositories/agenda.repository';
import { barberoOfreceServicio, buscarBarberoActivo, buscarServicioActivo } from '../repositories/catalogo.repository';
import { ahoraLocal, sumarMinutos } from '../utils/fechas';
import { cabeEnAlgunTramo, diaDeLaSemana, empiezaEnBloqueDe15 } from './disponibilidad';

/** Lo mínimo que hace falta para revisar si un horario está disponible. */
export interface HorarioSolicitado {
  idBarbero: number;
  fechaHoraInicio: Date;
  duracionMin: number;
}

export async function exigirServicioActivo(idServicio: number) {
  const servicio = await buscarServicioActivo(idServicio);
  if (!servicio) throw new NoEncontradoError('Servicio');
  return servicio;
}

export async function exigirBarberoQueOfrece(idBarbero: number, idServicio: number): Promise<void> {
  if (!(await buscarBarberoActivo(idBarbero))) throw new NoEncontradoError('Barbero');
  if (!(await barberoOfreceServicio(idBarbero, idServicio))) {
    throw new ReglaDeNegocioError('El barbero seleccionado no ofrece este servicio', 'BARBERO_NO_OFRECE_SERVICIO');
  }
}

export function exigirFechaFutura(inicio: Date): void {
  if (inicio.getTime() <= ahoraLocal().getTime()) {
    throw new ReglaDeNegocioError('La cita debe agendarse en una fecha y hora futuras', 'FECHA_PASADA');
  }
  if (!empiezaEnBloqueDe15(inicio)) {
    throw new ReglaDeNegocioError('La hora de inicio debe ser múltiplo de 15 minutos (:00, :15, :30, :45)', 'HORA_NO_VALIDA');
  }
}

/** Fecha futura + dentro del horario del barbero + sin bloqueo. El traslape (RF-03) lo revisa la BD. */
export async function exigirHorarioDisponible(horario: HorarioSolicitado): Promise<void> {
  exigirFechaFutura(horario.fechaHoraInicio);
  await exigirDentroDelHorario(horario);
  await exigirSinBloqueo(horario);
}

async function exigirDentroDelHorario({ idBarbero, fechaHoraInicio, duracionMin }: HorarioSolicitado): Promise<void> {
  const tramos = await listarTramosDelDia(idBarbero, diaDeLaSemana(fechaHoraInicio));
  if (!cabeEnAlgunTramo(fechaHoraInicio, duracionMin, tramos)) {
    throw new ReglaDeNegocioError('El barbero no atiende en ese horario', 'FUERA_DE_HORARIO');
  }
}

async function exigirSinBloqueo({ idBarbero, fechaHoraInicio, duracionMin }: HorarioSolicitado): Promise<void> {
  const fin = sumarMinutos(fechaHoraInicio, duracionMin);
  if (await hayBloqueoEn(idBarbero, fechaHoraInicio, fin)) {
    throw new ReglaDeNegocioError('El barbero tiene la agenda bloqueada en ese horario', 'AGENDA_BLOQUEADA');
  }
}
