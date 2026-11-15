import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatearFechaHora, leerHoraLocal, sumarMinutos } from '../utils/fechas';

test('leerHoraLocal acepta una fecha y hora reales', () => {
  const fecha = leerHoraLocal('2026-11-20 11:00');
  assert.equal(formatearFechaHora(fecha), '2026-11-20 11:00');
});

test('leerHoraLocal rechaza formatos y fechas imposibles', () => {
  assert.equal(leerHoraLocal('20/11/2026 11:00'), null);
  assert.equal(leerHoraLocal('2026-02-30 10:00'), null);
  assert.equal(leerHoraLocal('2026-11-20 25:00'), null);
});

test('sumarMinutos calcula la hora de fin', () => {
  const inicio = leerHoraLocal('2026-11-20 11:00')!;
  assert.equal(formatearFechaHora(sumarMinutos(inicio, 60)), '2026-11-20 12:00');
});
