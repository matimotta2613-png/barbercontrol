/**
 * BarberControl v1.2 | Proceso de ACTUALIZACIÓN de citas (Sprint 2)
 * src/services/cita-actualizacion.service.ts
 *
 *  - reprogramarCita(): cambia fecha/hora, barbero, servicio u observaciones (HU-09).
 *  - cambiarEstado(): cancelar (HU-06, RF-05), atender y finalizar (HU-08).
 *
 * Igual que el alta, cada proceso se lee como una receta de pasos con nombre.
 */
import { NoEncontradoError } from '../errors/errores';
import { buscarCitaParaActualizar, cambiarEstadoCita, reprogramarCita as guardarReprogramacion } from '../repositories/cita.repository';
import { buscarUsuarioActivo } from '../repositories/usuario.repository';
import type { CambiosDeCita, SolicitudReprogramacion } from '../types/cita';
import { validarCambioDeEstado, validarReprogramacion } from '../validators/actualizacion.validator';
import { exigirCambioDeEstadoPermitido, exigirReprogramacionPermitida, type Actor, type CitaActual } from './permisos-cita';
import { exigirBarberoQueOfrece, exigirHorarioDisponible, exigirServicioActivo } from './reglas-cita';

type CitaGuardada = NonNullable<Awaited<ReturnType<typeof buscarCitaParaActualizar>>>;

export async function reprogramarCita(folio: string, cuerpo: unknown) {
  const solicitud = validarReprogramacion(cuerpo);
  const actor = await exigirActor(solicitud.idUsuario);
  const cita = await exigirCita(folio);

  exigirReprogramacionPermitida(actor, comoCitaActual(cita));
  const cambios = await calcularCambios(cita, solicitud);

  return guardarReprogramacion(cita.idCita, cambios, actor.idUsuario);
}

export async function cambiarEstado(folio: string, cuerpo: unknown) {
  const { idUsuario, idEstado } = validarCambioDeEstado(cuerpo);
  const actor = await exigirActor(idUsuario);
  const cita = await exigirCita(folio);

  exigirCambioDeEstadoPermitido(actor, comoCitaActual(cita), idEstado);

  return cambiarEstadoCita(cita.idCita, cita.idEstado, idEstado, actor.idUsuario);
}

// ---------------------------------------------------------------------
// Pasos
// ---------------------------------------------------------------------

async function exigirActor(idUsuario: number): Promise<Actor> {
  const usuario = await buscarUsuarioActivo(idUsuario);
  if (!usuario) throw new NoEncontradoError('Usuario');
  return usuario;
}

async function exigirCita(folio: string): Promise<CitaGuardada> {
  const cita = await buscarCitaParaActualizar(folio);
  if (!cita) throw new NoEncontradoError('Cita');
  return cita;
}

function comoCitaActual(cita: CitaGuardada): CitaActual {
  return { idEstado: cita.idEstado, idCliente: cita.idCliente, idUsuarioBarbero: cita.barbero.idUsuario };
}

/**
 * Combina lo que ya tiene la cita con lo que se pidió cambiar y vuelve a
 * aplicar las MISMAS reglas que el alta, pero solo si cambia la agenda:
 * si únicamente se editan las observaciones no hace falta revisar horarios.
 */
async function calcularCambios(cita: CitaGuardada, solicitud: SolicitudReprogramacion): Promise<CambiosDeCita> {
  const idBarbero = solicitud.idBarbero ?? cita.idBarbero;
  const idServicio = solicitud.idServicio ?? cita.idServicio;
  const fechaHoraInicio = solicitud.fechaHoraInicio ?? cita.fechaHoraInicio;
  const observaciones = solicitud.observaciones ?? cita.observaciones ?? undefined;

  const cambiaServicio = idServicio !== cita.idServicio;
  const cambiaAgenda =
    cambiaServicio || idBarbero !== cita.idBarbero || fechaHoraInicio.getTime() !== cita.fechaHoraInicio.getTime();

  // Precio y duración quedaron "congelados" al reservar; solo se recalculan si cambia el servicio.
  let duracionMin = cita.duracionMinAplicada;
  let precio: unknown = cita.precioAplicado;
  if (cambiaServicio) {
    const servicio = await exigirServicioActivo(idServicio);
    duracionMin = servicio.duracionMin;
    precio = servicio.precio;
  }

  if (cambiaAgenda) {
    await exigirBarberoQueOfrece(idBarbero, idServicio);
    await exigirHorarioDisponible({ idBarbero, fechaHoraInicio, duracionMin });
  }

  return { fechaHoraInicio, idBarbero, idServicio, duracionMin, precio, observaciones };
}
