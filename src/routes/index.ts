/**
 * BarberControl v1.0 | Rutas de la API
 * src/routes/index.ts
 */
import { Router } from 'express';
import { getAgenda, getCita, getCitas, postCita } from '../controllers/cita.controller';
import { postCliente } from '../controllers/cliente.controller';
import { getEstado, getServicios } from '../controllers/sistema.controller';
import { envolver } from '../middlewares/manejar-errores';

export const rutas = Router();

rutas.get('/status', envolver(getEstado));
rutas.get('/servicios', envolver(getServicios));
rutas.post('/clientes', envolver(postCliente));

// Citas: alta (Sprint 1) y consulta (Sprint 2)
rutas.post('/citas', envolver(postCita));
rutas.get('/citas', envolver(getCitas));
rutas.get('/citas/:folio', envolver(getCita));
rutas.get('/agenda/:fecha', envolver(getAgenda));
