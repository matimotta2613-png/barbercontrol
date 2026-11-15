/**
 * BarberControl v1.0 | Controlador de Clientes (HTTP)
 * src/controllers/cliente.controller.ts
 */
import type { Request, Response } from 'express';
import { registrarCliente } from '../services/cliente.service';

/** POST /api/clientes */
export async function postCliente(req: Request, res: Response): Promise<void> {
  const cliente = await registrarCliente(req.body);
  res.status(201).location(`/api/clientes/${cliente.idUsuario}`).json(cliente);
}
