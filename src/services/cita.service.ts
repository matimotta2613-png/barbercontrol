/**
 * BarberControl v1.0 | Servicio de Citas (reglas del negocio)
 * src/services/cita.service.ts
 *
 * registrarCita() es el proceso de ALTA de la entidad central. Lee como una
 * receta: cada paso es una función con nombre propio que lanza un error de
 * negocio si la regla no se cumple. La última barrera (RF-03) la pone la BD.
 * Las reglas de agenda se comparten con la reprogramación (reglas-cita.ts).
 */
import { NoEncontradoError } from '../errors/errores';
import { crearCita } from '../repositories/cita.repository';
import { buscarClienteActivo } from '../repositories/usuario.repository';
import { validarNuevaCita } from '../validators/cita.validator';
import { exigirBarberoQueOfrece, exigirHorarioDisponible, exigirServicioActivo } from './reglas-cita';

export async function registrarCita(cuerpo: unknown) {
  const solicitud = validarNuevaCita(cuerpo);

  await exigirClienteActivo(solicitud.idCliente);
  const servicio = await exigirServicioActivo(solicitud.idServicio);
  await exigirBarberoQueOfrece(solicitud.idBarbero, solicitud.idServicio);
  await exigirHorarioDisponible({
    idBarbero: solicitud.idBarbero,
    fechaHoraInicio: solicitud.fechaHoraInicio,
    duracionMin: servicio.duracionMin,
  });

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
