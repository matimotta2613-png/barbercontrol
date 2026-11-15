import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESTADO, ROL } from '../constants/catalogos';
import { ProhibidoError, ReglaDeNegocioError } from '../errors/errores';
import {
  esTransicionValida,
  exigirCambioDeEstadoPermitido,
  exigirReprogramacionPermitida,
  type Actor,
  type CitaActual,
} from '../services/permisos-cita';

// Cita del cliente 5 atendida por el barbero cuyo usuario es el 2 (datos del script 7.1).
const citaPendiente: CitaActual = { idEstado: ESTADO.PENDIENTE, idCliente: 5, idUsuarioBarbero: 2 };
const admin: Actor = { idUsuario: 1, idRol: ROL.ADMINISTRADOR };
const clienteDueno: Actor = { idUsuario: 5, idRol: ROL.CLIENTE };
const otroCliente: Actor = { idUsuario: 6, idRol: ROL.CLIENTE };
const barberoAsignado: Actor = { idUsuario: 2, idRol: ROL.BARBERO };
const otroBarbero: Actor = { idUsuario: 3, idRol: ROL.BARBERO };

const conEstado = (idEstado: number): CitaActual => ({ ...citaPendiente, idEstado });

test('transiciones: solo se avanza Pendiente -> En Atención -> Finalizada, o Pendiente -> Cancelada', () => {
  assert.ok(esTransicionValida(ESTADO.PENDIENTE, ESTADO.EN_ATENCION));
  assert.ok(esTransicionValida(ESTADO.PENDIENTE, ESTADO.CANCELADA));
  assert.ok(esTransicionValida(ESTADO.EN_ATENCION, ESTADO.FINALIZADA));
  assert.ok(!esTransicionValida(ESTADO.PENDIENTE, ESTADO.FINALIZADA), 'no se finaliza sin atender');
  assert.ok(!esTransicionValida(ESTADO.EN_ATENCION, ESTADO.CANCELADA), 'no se cancela una cita en curso');
  assert.ok(!esTransicionValida(ESTADO.FINALIZADA, ESTADO.PENDIENTE));
  assert.ok(!esTransicionValida(ESTADO.CANCELADA, ESTADO.PENDIENTE), 'una cancelación no se revierte');
});

test('cancelar (HU-06): el cliente dueño y el administrador sí; otro cliente o el barbero no', () => {
  assert.doesNotThrow(() => exigirCambioDeEstadoPermitido(clienteDueno, citaPendiente, ESTADO.CANCELADA));
  assert.doesNotThrow(() => exigirCambioDeEstadoPermitido(admin, citaPendiente, ESTADO.CANCELADA));
  assert.throws(() => exigirCambioDeEstadoPermitido(otroCliente, citaPendiente, ESTADO.CANCELADA), ProhibidoError);
  assert.throws(() => exigirCambioDeEstadoPermitido(barberoAsignado, citaPendiente, ESTADO.CANCELADA), ProhibidoError);
});

test('atender y finalizar (HU-08): solo el barbero asignado o el administrador', () => {
  assert.doesNotThrow(() => exigirCambioDeEstadoPermitido(barberoAsignado, citaPendiente, ESTADO.EN_ATENCION));
  assert.doesNotThrow(() => exigirCambioDeEstadoPermitido(barberoAsignado, conEstado(ESTADO.EN_ATENCION), ESTADO.FINALIZADA));
  assert.doesNotThrow(() => exigirCambioDeEstadoPermitido(admin, conEstado(ESTADO.EN_ATENCION), ESTADO.FINALIZADA));
  assert.throws(() => exigirCambioDeEstadoPermitido(otroBarbero, citaPendiente, ESTADO.EN_ATENCION), ProhibidoError);
  assert.throws(() => exigirCambioDeEstadoPermitido(clienteDueno, citaPendiente, ESTADO.EN_ATENCION), ProhibidoError);
});

test('con permiso pero transición inválida -> 422 TRANSICION_NO_PERMITIDA', () => {
  assert.throws(
    () => exigirCambioDeEstadoPermitido(admin, conEstado(ESTADO.CANCELADA), ESTADO.EN_ATENCION),
    (error) => error instanceof ReglaDeNegocioError && error.codigo === 'TRANSICION_NO_PERMITIDA',
  );
});

test('reprogramar (HU-09): dueño o admin, y solo si la cita sigue Pendiente', () => {
  assert.doesNotThrow(() => exigirReprogramacionPermitida(clienteDueno, citaPendiente));
  assert.doesNotThrow(() => exigirReprogramacionPermitida(admin, citaPendiente));
  assert.throws(() => exigirReprogramacionPermitida(otroCliente, citaPendiente), ProhibidoError);
  assert.throws(() => exigirReprogramacionPermitida(barberoAsignado, citaPendiente), ProhibidoError);
  assert.throws(
    () => exigirReprogramacionPermitida(clienteDueno, conEstado(ESTADO.FINALIZADA)),
    (error) => error instanceof ReglaDeNegocioError && error.codigo === 'CITA_NO_MODIFICABLE',
  );
});
