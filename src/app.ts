/**
 * BarberControl v1.0 | Aplicación Express (sin arrancar el servidor)
 * src/app.ts
 */
import express from 'express';
import { manejarErrores } from './middlewares/manejar-errores';
import { rutas } from './routes';

export const app = express();

app.use(express.json());
app.use('/api', rutas);
app.use(manejarErrores); // siempre al final
