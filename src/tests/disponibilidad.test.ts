import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cabeEnAlgunTramo, diaDeLaSemana, empiezaEnBloqueDe15 } from '../services/disponibilidad';
import { horaLocal } from '../utils/fechas';

// Horario del script 7.1: 10:00-14:00 y 15:00-19:00
const tramos = [
  { horaInicio: new Date('1970-01-01T10:00:00Z'), horaFin: new Date('1970-01-01T14:00:00Z') },
  { horaInicio: new Date('1970-01-01T15:00:00Z'), horaFin: new Date('1970-01-01T19:00:00Z') },
];

test('diaDeLaSemana usa 1 = lunes ... 7 = domingo', () => {
  assert.equal(diaDeLaSemana(horaLocal('2026-11-16 10:00')), 1); // lunes
  assert.equal(diaDeLaSemana(horaLocal('2026-11-20 10:00')), 5); // viernes
  assert.equal(diaDeLaSemana(horaLocal('2026-11-22 10:00')), 7); // domingo
});

test('una cita dentro de un tramo cabe', () => {
  assert.equal(cabeEnAlgunTramo(horaLocal('2026-11-20 11:00'), 60, tramos), true);
  assert.equal(cabeEnAlgunTramo(horaLocal('2026-11-20 13:00'), 60, tramos), true); // termina justo a las 14:00
});

test('una cita que invade la hora de comida no cabe', () => {
  assert.equal(cabeEnAlgunTramo(horaLocal('2026-11-20 13:30'), 60, tramos), false);
});

test('una cita fuera del horario o sin tramos no cabe', () => {
  assert.equal(cabeEnAlgunTramo(horaLocal('2026-11-20 09:30'), 30, tramos), false);
  assert.equal(cabeEnAlgunTramo(horaLocal('2026-11-20 11:00'), 30, []), false);
});

test('la hora de inicio debe ser múltiplo de 15', () => {
  assert.equal(empiezaEnBloqueDe15(horaLocal('2026-11-20 11:45')), true);
  assert.equal(empiezaEnBloqueDe15(horaLocal('2026-11-20 11:10')), false);
});
