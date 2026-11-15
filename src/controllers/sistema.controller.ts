/**
 * BarberControl v1.0 | Controlador de sistema y catálogo (HTTP)
 * src/controllers/sistema.controller.ts
 */
import type { Request, Response } from 'express';
import { probarConexion } from '../config/database';
import { listarServiciosActivos } from '../repositories/catalogo.repository';

/** GET /api/status */
export async function getEstado(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ system: 'BarberControl v1.0', status: 'ONLINE', db: await probarConexion() });
  } catch (error) {
    res.status(503).json({ system: 'BarberControl v1.0', status: 'DB_OFFLINE', error: (error as Error).message });
  }
}

/** GET /api/servicios */
export async function getServicios(_req: Request, res: Response): Promise<void> {
  res.json(await listarServiciosActivos());
}
