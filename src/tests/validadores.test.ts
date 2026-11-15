import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ErrorDeValidacion } from '../errors/errores';
import { validarNuevaCita } from '../validators/cita.validator';
import { validarNuevoCliente } from '../validators/cliente.validator';

const clienteValido = {
  nombre: ' Ana ', apellidos: 'López Ruiz', correo: 'ana@correo.com',
  telefono: '6395550123', password: 'Segura1234', aceptoAvisoPrivacidad: true,
};
const citaValida = { idCliente: 5, idBarbero: 1, idServicio: 2, fechaHoraInicio: '2026-11-20 11:00' };

function detallesDelError(accion: () => unknown): string[] {
  try { accion(); } catch (error) {
    assert.ok(error instanceof ErrorDeValidacion);
    return error.detalles;
  }
  assert.fail('Se esperaba un ErrorDeValidacion');
}

test('cliente válido: recorta espacios y conserva la contraseña tal cual', () => {
  const datos = validarNuevoCliente(clienteValido);
  assert.equal(datos.nombre, 'Ana');
  assert.equal(datos.password, 'Segura1234');
});

test('cliente: el teléfono es opcional', () => {
  const { telefono, ...sinTelefono } = clienteValido;
  assert.equal(validarNuevoCliente(sinTelefono).telefono, undefined);
});

test('cliente inválido: reporta todos los errores juntos', () => {
  const detalles = detallesDelError(() =>
    validarNuevoCliente({ nombre: '', correo: 'sin-arroba', password: 'corta', telefono: '123' }),
  );
  assert.ok(detalles.includes('nombre es obligatorio'));
  assert.ok(detalles.includes('apellidos es obligatorio'));
  assert.ok(detalles.includes('correo no tiene un formato válido'));
  assert.ok(detalles.includes('telefono debe tener 10 dígitos'));
  assert.ok(detalles.includes('password debe tener al menos 8 caracteres'));
  assert.ok(detalles.includes('Debes aceptar el aviso de privacidad'));
});

test('cuerpo que no es un objeto se rechaza', () => {
  assert.deepEqual(detallesDelError(() => validarNuevoCliente(undefined)), ['El cuerpo de la petición debe ser un objeto JSON']);
});

test('cita válida: interpreta la fecha y deja observaciones vacías', () => {
  const cita = validarNuevaCita(citaValida);
  assert.equal(cita.fechaHoraInicio.toISOString(), '2026-11-20T11:00:00.000Z');
  assert.equal(cita.observaciones, undefined);
});

test('cita inválida: ids no enteros y fecha mal escrita', () => {
  const detalles = detallesDelError(() =>
    validarNuevaCita({ idCliente: '5', idBarbero: -1, fechaHoraInicio: '20/11/2026' }),
  );
  assert.ok(detalles.includes('idCliente debe ser un número entero positivo'));
  assert.ok(detalles.includes('idBarbero debe ser un número entero positivo'));
  assert.ok(detalles.includes('idServicio es obligatorio'));
  assert.ok(detalles.includes('fechaHoraInicio debe tener el formato AAAA-MM-DD HH:mm'));
});
