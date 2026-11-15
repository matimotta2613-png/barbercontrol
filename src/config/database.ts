/**
 * BarberControl v1.0 | Capa de acceso a datos
 * src/config/database.ts
 *
 * Punto único de conexión entre la aplicación (Node.js + TypeScript) y la base
 * de datos PostgreSQL de la Actividad 7.1. Todo el sistema importa "prisma"
 * desde aquí, así solo existe UN cliente con su propio pool de conexiones.
 *
 * La cadena de conexión NO va en el código: Prisma la lee de la variable
 * DATABASE_URL del archivo .env (ver .env.example).
 */
import { PrismaClient } from '@prisma/client';

// En desarrollo, "tsx watch" recarga los módulos en cada cambio. Guardamos el
// cliente en globalThis para no abrir un pool de conexiones nuevo cada vez.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalParaPrisma.prisma ??
  new PrismaClient({
    // Registra advertencias y errores; con PRISMA_LOG_QUERIES=1 también el SQL generado.
    log: process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalParaPrisma.prisma = prisma;
}

/** Resultado de la prueba de conexión. */
export interface EstadoConexion {
  motor: string;
  baseDeDatos: string;
  usuario: string;
  latenciaMs: number;
}

/**
 * Abre la conexión y ejecuta una consulta mínima para confirmar que el
 * servidor responde. Lanza un error si la conexión falla.
 */
export async function probarConexion(): Promise<EstadoConexion> {
  const inicio = performance.now();
  await prisma.$connect();

  const [fila] = await prisma.$queryRaw<
    { motor: string; base_de_datos: string; usuario: string }[]
  >`SELECT version() AS motor, current_database() AS base_de_datos, current_user AS usuario`;

  return {
    motor: fila.motor.split(' on ')[0], // "PostgreSQL 16.x"
    baseDeDatos: fila.base_de_datos,
    usuario: fila.usuario,
    latenciaMs: Math.round(performance.now() - inicio),
  };
}

/** Cierra el pool de conexiones (al terminar un script o apagar el servidor). */
export async function cerrarConexion(): Promise<void> {
  await prisma.$disconnect();
}
