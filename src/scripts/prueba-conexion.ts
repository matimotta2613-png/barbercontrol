/**
 * BarberControl v1.0 | Actividad 10.1 - Prueba de conexión a la base de datos
 * src/scripts/prueba-conexion.ts
 *
 * Pasos:
 *  1. Conecta a PostgreSQL y muestra versión, base de datos y latencia.
 *  2. INSERT de un cliente de prueba            (modelo Usuario)
 *  3. INSERT de una cita para ese cliente       (modelo Cita)
 *  4. SELECT de la cita por folio con sus JOINs (Cita + Usuario + Barbero + Servicio + EstadoCita)
 *  5. SELECT SQL directo a la vista v_agenda_diaria
 *  6. Prueba de la regla RF-03 (la BD debe rechazar una cita traslapada)
 *
 * Es re-ejecutable: al iniciar elimina los datos de prueba de corridas anteriores.
 */
import { prisma, probarConexion, cerrarConexion } from '../config/database';
import { crearCliente, buscarPorCorreo } from '../repositories/usuario.repository';
import { buscarCitaPorFolio, agendaDelDia, HorarioOcupadoError } from '../repositories/cita.repository';
import { registrarCita } from '../services/cita.service';
import { formatearFechaHora } from '../utils/fechas';

const CORREO_PRUEBA = 'prueba.conexion@barbercontrol.mx';
/** Un día hábil (lunes a sábado) dentro de 7 días, para que la prueba siga siendo válida con el tiempo. */
function calcularFechaDePrueba(): string {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + 7);
  if (fecha.getUTCDay() === 0) fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().slice(0, 10);
}
const FECHA_PRUEBA = calcularFechaDePrueba();
const ID_BARBERO = 1;      // Roberto Hernández (script 7.1)
const ID_SERVICIO = 2;     // Corte + Barba, 60 min, $250.00

const linea = () => console.log('─'.repeat(64));
const titulo = (t: string) => { linea(); console.log(t); linea(); };

/** Borra lo que haya dejado una ejecución anterior (respeta las llaves foráneas). */
async function limpiarDatosDePrueba(): Promise<number> {
  const cliente = await buscarPorCorreo(CORREO_PRUEBA);
  if (!cliente) return 0;
  await prisma.$transaction([
    prisma.historialEstadoCita.deleteMany({ where: { cita: { idCliente: cliente.idUsuario } } }),
    prisma.pago.deleteMany({ where: { cita: { idCliente: cliente.idUsuario } } }),
    prisma.cita.deleteMany({ where: { idCliente: cliente.idUsuario } }),
    prisma.usuario.delete({ where: { idUsuario: cliente.idUsuario } }),
  ]);
  return 1;
}

async function main(): Promise<void> {
  // ── 1. Conexión ───────────────────────────────────────────────
  titulo('1. CONEXIÓN A LA BASE DE DATOS');
  const estado = await probarConexion();
  console.log(`✔ Conectado a: ${estado.motor}`);
  console.log(`  Base de datos: ${estado.baseDeDatos} | Usuario: ${estado.usuario} | Latencia: ${estado.latenciaMs} ms`);
  if (await limpiarDatosDePrueba()) console.log('  (se eliminaron datos de una prueba anterior)');

  // ── 2. INSERT usuario ─────────────────────────────────────────
  titulo('2. INSERT  -> usuario (modelo Usuario)');
  const cliente = await crearCliente({
    nombre: 'Cliente',
    apellidos: 'Prueba Conexión',
    correo: CORREO_PRUEBA,
    telefono: '6395550999',
    passwordHash: '$2b$12$HASH_PRUEBA_CONEXION',
  });
  console.log(`✔ Cliente insertado: id_usuario = ${cliente.idUsuario}, rol = ${cliente.rol.nombre}`);
  console.log(`  ${cliente.nombre} ${cliente.apellidos} <${cliente.correo}>`);

  // ── 3. INSERT cita ────────────────────────────────────────────
  titulo('3. INSERT  -> cita (modelo Cita, dentro de una transacción)');
  const cita = await registrarCita({
    idCliente: cliente.idUsuario,
    idBarbero: ID_BARBERO,
    idServicio: ID_SERVICIO,
    fechaHoraInicio: `${FECHA_PRUEBA} 11:00`,
    observaciones: 'Registro de prueba - Actividad 11.1',
  });
  console.log(`✔ Cita insertada: id_cita = ${cita.idCita}, folio = ${cita.folio} (generado por la BD)`);

  // ── 4. SELECT con relaciones ─────────────────────────────────
  titulo('4. SELECT  -> cita por folio con relaciones (JOIN de 5 tablas)');
  const leida = await buscarCitaPorFolio(cita.folio);
  if (!leida) throw new Error('La cita insertada no se encontró');
  console.table([{
    folio: leida.folio,
    cliente: `${leida.cliente.nombre} ${leida.cliente.apellidos}`,
    barbero: `${leida.barbero.usuario.nombre} ${leida.barbero.usuario.apellidos}`,
    servicio: leida.servicio.nombre,
    inicio: formatearFechaHora(leida.fechaHoraInicio),
    fin: formatearFechaHora(leida.fechaHoraFin),
    precio: `$${leida.precioAplicado.toFixed(2)}`,
    estado: leida.estado.nombre,
  }]);
  console.log(`  fecha_hora_fin calculada por la BD: ${leida.duracionMinAplicada} min después del inicio`);
  console.log(`  Bitácora (trigger): ${leida.historial.map((h) => `${h.estadoNuevo.nombre} por id_usuario ${h.idUsuario}`).join(', ')}`);

  // ── 5. SELECT SQL directo a la vista ─────────────────────────
  titulo(`5. SELECT  -> vista v_agenda_diaria del ${FECHA_PRUEBA} (SQL con $queryRaw)`);
  const agenda = await agendaDelDia(FECHA_PRUEBA);
  console.table(agenda.map((f) => ({
    folio: f.folio,
    hora: `${formatearFechaHora(f.fecha_hora_inicio).slice(11)}-${formatearFechaHora(f.fecha_hora_fin).slice(11)}`,
    barbero: f.barbero,
    cliente: f.cliente,
    servicio: f.servicio,
    estado: f.estado,
  })));

  // ── 6. Regla RF-03 ────────────────────────────────────────────
  titulo('6. PRUEBA RF-03 -> cita traslapada (misma hora, mismo barbero)');
  try {
    await registrarCita({
      idCliente: cliente.idUsuario,
      idBarbero: ID_BARBERO,
      idServicio: 1, // Corte clásico, 30 min
      fechaHoraInicio: `${FECHA_PRUEBA} 11:30`,
    });
    console.log('✘ ERROR: la base de datos aceptó una cita traslapada');
    process.exitCode = 1;
  } catch (error) {
    if (!(error instanceof HorarioOcupadoError)) throw error;
    console.log(`✔ Rechazada correctamente: ${error.message}`);
  }

  // ── Resumen ──────────────────────────────────────────────────
  titulo('RESUMEN');
  const [usuarios, citas] = await Promise.all([prisma.usuario.count(), prisma.cita.count()]);
  console.log(`Registros en BD -> usuario: ${usuarios} | cita: ${citas}`);
  if (process.argv.includes('--limpiar')) {
    await limpiarDatosDePrueba();
    console.log('Datos de prueba eliminados (--limpiar).');
  }
  console.log('✔ PRUEBA DE CONEXIÓN, INSERCIÓN Y CONSULTA COMPLETADA');
}

main()
  .catch((error) => {
    console.error('✘ La prueba falló:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(cerrarConexion);
