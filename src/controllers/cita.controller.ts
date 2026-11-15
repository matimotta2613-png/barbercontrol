/**
 * BarberControl v1.0 | Controlador de Citas (HTTP)
 * src/controllers/cita.controller.ts
 */
import type { Request, Response } from 'express';
import { NoEncontradoError } from '../errors/errores';
import { buscarCitaPorFolio } from '../repositories/cita.repository';
import { cambiarEstado, reprogramarCita } from '../services/cita-actualizacion.service';
import { consultarAgendaDelDia, consultarCitas } from '../services/cita-consulta.service';
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

/** GET /api/citas?fecha=&desde=&hasta=&idBarbero=&idCliente=&idEstado=&pagina=&porPagina= */
export async function getCitas(req: Request, res: Response): Promise<void> {
  res.json(await consultarCitas(req.query as Record<string, unknown>));
}

/** GET /api/agenda/:fecha?incluirCanceladas=true */
export async function getAgenda(req: Request, res: Response): Promise<void> {
  res.json(await consultarAgendaDelDia(req.params.fecha, req.query.incluirCanceladas === 'true'));
}

/** PATCH /api/citas/:folio — reprogramar (HU-09) */
export async function patchCita(req: Request, res: Response): Promise<void> {
  res.json(await reprogramarCita(req.params.folio, req.body));
}

/** PATCH /api/citas/:folio/estado — cancelar (HU-06), atender o finalizar (HU-08) */
export async function patchEstadoCita(req: Request, res: Response): Promise<void> {
  res.json(await cambiarEstado(req.params.folio, req.body));
}
