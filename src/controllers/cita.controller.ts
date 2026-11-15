/**
 * BarberControl v1.0 | Controlador de Citas (HTTP)
 * src/controllers/cita.controller.ts
 */
import type { Request, Response } from 'express';
import { NoEncontradoError } from '../errors/errores';
import { buscarCitaPorFolio } from '../repositories/cita.repository';
import { registrarCita } from '../services/cita.service';

/** POST /api/citas */
export async function postCita(req: Request, res: Response): Promise<void> {
  const cita = await registrarCita(req.body);
  res.status(201).location(`/api/citas/${cita.folio}`).json(cita);
}

/** GET /api/citas/:folio */
export async function getCita(req: Request, res: Response): Promise<void> {
  const cita = await buscarCitaPorFolio(req.params.folio);
  if (!cita) throw new NoEncontradoError('Cita');
  res.json(cita);
}
