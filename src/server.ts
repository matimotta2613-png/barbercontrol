/**
 * BarberControl v1.0 | Arranque del servidor
 * src/server.ts
 */
import { app } from './app';
import { cerrarConexion, probarConexion } from './config/database';

const PORT = Number(process.env.PORT ?? 3000);

// Verifica la BD antes de aceptar peticiones.
probarConexion()
  .then((c) => {
    console.log(`[DB] Conectado a ${c.motor} (${c.baseDeDatos}) en ${c.latenciaMs} ms`);
    app.listen(PORT, () => console.log(`[BarberControl Server] http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error('[DB] No se pudo conectar:', error.message);
    process.exit(1);
  });

// Cierra el pool de conexiones al detener el servidor (Ctrl + C).
process.on('SIGINT', async () => {
  await cerrarConexion();
  process.exit(0);
});
