import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ErrorDeValidacion } from '../errors/errores';
import { validarCambioDeEstado, validarReprogramacion } from '../validators/actualizacion.validator';
import { POR_PAGINA_PREDETERMINADO, validarFechaDeAgenda, validarFiltrosDeCitas } from '../validators/consulta.validator';

function detallesDelError(accion: () => unknown): string[] {
  try {
    accion();
  } catch (error) {
    assert.ok(error instanceof ErrorDeValidacion);
    return error.detalles;
  }
  return assert.fail('Se esperaba un ErrorDeValidacion');
}

// ---------- Actualización ----------

test('reprogramar: acepta solo los campos que cambian', () => {
  const solicitud = validarReprogramacion({ idUsuario: 5, fechaHoraInicio: '2026-12-04 12:00' });
  assert.equal(solicitud.fechaHoraInicio?.toISOString(), '2026-12-04T12:00:00.000Z');
  assert.equal(solicitud.idBarbero, undefined);
  assert.equal(solicitud.idServicio, undefined);
});

test('reprogramar: exige quién actúa y al menos un dato a cambiar', () => {
  const detalles = detallesDelError(() => validarReprogramacion({}));
  assert.ok(detalles.includes('idUsuario es obligatorio'));
  assert.ok(detalles.some((d) => d.startsWith('Indica al menos un dato a cambiar')));
});

test('reprogramar: rechaza formatos inválidos y el cambio de cliente', () => {
  const detalles = detallesDelError(() =>
    validarReprogramacion({ idUsuario: 5, fechaHoraInicio: '04/12/2026', idBarbero: 0, idCliente: 7 }),
  );
  assert.ok(detalles.includes('fechaHoraInicio debe tener el formato AAAA-MM-DD HH:mm'));
  assert.ok(detalles.includes('idBarbero debe ser un número entero positivo'));
  assert.ok(detalles.some((d) => d.startsWith('idCliente no se puede cambiar')));
});

test('cambio de estado: solo 2, 3 o 4 (no se regresa a Pendiente)', () => {
  assert.deepEqual(validarCambioDeEstado({ idUsuario: 5, idEstado: 4 }), { idUsuario: 5, idEstado: 4 });
  const detalles = detallesDelError(() => validarCambioDeEstado({ idUsuario: 5, idEstado: 1 }));
  assert.ok(detalles.includes('idEstado debe ser 2 (En Atención), 3 (Finalizada) o 4 (Cancelada)'));
});

// ---------- Consulta ----------

test('consulta sin filtros: primera página con el tamaño predeterminado', () => {
  const filtros = validarFiltrosDeCitas({});
  assert.equal(filtros.pagina, 1);
  assert.equal(filtros.porPagina, POR_PAGINA_PREDETERMINADO);
  assert.equal(filtros.desde, undefined);
  assert.equal(filtros.hasta, undefined);
});

test('consulta por fecha: abarca el día completo [00:00, 00:00 del día siguiente)', () => {
  const filtros = validarFiltrosDeCitas({ fecha: '2026-10-15', idBarbero: '2' });
  assert.equal(filtros.desde?.toISOString(), '2026-10-15T00:00:00.000Z');
  assert.equal(filtros.hasta?.toISOString(), '2026-10-16T00:00:00.000Z');
  assert.equal(filtros.idBarbero, 2);
});

test('consulta por rango: "hasta" incluye ese día completo', () => {
  const filtros = validarFiltrosDeCitas({ desde: '2026-10-01', hasta: '2026-10-31', idCliente: '5', pagina: '2' });
  assert.equal(filtros.desde?.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(filtros.hasta?.toISOString(), '2026-11-01T00:00:00.000Z');
  assert.equal(filtros.pagina, 2);
});

test('consulta inválida: reporta todos los errores juntos', () => {
  const detalles = detallesDelError(() =>
    validarFiltrosDeCitas({ fecha: '2026-02-30', idBarbero: 'dos', idEstado: '9', porPagina: '500', orden: 'x' }),
  );
  assert.ok(detalles.includes('fecha debe tener el formato AAAA-MM-DD'));
  assert.ok(detalles.includes('idBarbero debe ser un número entero mayor o igual a 1'));
  assert.ok(detalles.some((d) => d.startsWith('idEstado debe ser 1')));
  assert.ok(detalles.includes('porPagina no puede pasar de 100'));
  assert.ok(detalles.includes('Parámetro desconocido: orden'));
});

test('consulta: no se combina fecha con rango, ni un rango al revés', () => {
  assert.ok(detallesDelError(() => validarFiltrosDeCitas({ fecha: '2026-10-15', desde: '2026-10-01' }))
    .includes('Usa fecha (un solo día) o desde/hasta (rango), no ambos'));
  assert.ok(detallesDelError(() => validarFiltrosDeCitas({ desde: '2026-10-31', hasta: '2026-10-01' }))
    .includes('hasta no puede ser anterior a desde'));
});

test('agenda: valida la fecha de la URL', () => {
  assert.equal(validarFechaDeAgenda('2026-10-15'), '2026-10-15');
  assert.throws(() => validarFechaDeAgenda('mañana'), ErrorDeValidacion);
});
