/**
 * BarberControl v1.0 | Manejo centralizado de errores
 * src/middlewares/manejar-errores.ts
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ErrorDeAplicacion } from '../errors/errores';

type ControladorAsincrono = (req: Request, res: Response) => Promise<void>;

/** Express 4 no captura errores de funciones async: este envoltorio los pasa al manejador. */
export function envolver(controlador: ControladorAsincrono): RequestHandler {
  return (req, res, next) => {
    controlador(req, res).catch(next);
  };
}

export function manejarErrores(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ErrorDeAplicacion) {
    res.status(error.estadoHttp).json({
      error: { codigo: error.codigo, mensaje: error.message, detalles: error.detalles },
    });
    return;
  }
  if ((error as { type?: string })?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo no es un JSON válido', detalles: [] } });
    return;
  }
  console.error('[Error no controlado]', error);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado', detalles: [] } });
}
