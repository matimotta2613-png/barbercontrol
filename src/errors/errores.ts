/**
 * BarberControl v1.0 | Errores de la aplicación
 * src/errors/errores.ts
 *
 * Cada error lleva su código HTTP y un código estable para el cliente de la API.
 * Así los servicios solo "lanzan" el problema y un único middleware decide
 * cómo responder (ver middlewares/manejar-errores.ts).
 */
export class ErrorDeAplicacion extends Error {
  constructor(
    mensaje: string,
    readonly estadoHttp: number,
    readonly codigo: string,
    readonly detalles: string[] = [],
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** 400: el cuerpo de la petición no cumple el formato esperado. */
export class ErrorDeValidacion extends ErrorDeAplicacion {
  constructor(detalles: string[]) {
    super('Los datos enviados no son válidos', 400, 'VALIDACION', detalles);
  }
}

/** 404: el registro buscado no existe. */
export class NoEncontradoError extends ErrorDeAplicacion {
  constructor(recurso: string) {
    super(`${recurso} no encontrado`, 404, 'NO_ENCONTRADO');
  }
}

/** 403: quien hace la petición no tiene permiso para esa acción. */
export class ProhibidoError extends ErrorDeAplicacion {
  constructor(mensaje: string) {
    super(mensaje, 403, 'SIN_PERMISO');
  }
}

/** 409: la acción choca con algo que ya existe (correo repetido, horario ocupado). */
export class ConflictoError extends ErrorDeAplicacion {
  constructor(mensaje: string, codigo: string) {
    super(mensaje, 409, codigo);
  }
}

/** 422: los datos son válidos, pero rompen una regla del negocio. */
export class ReglaDeNegocioError extends ErrorDeAplicacion {
  constructor(mensaje: string, codigo: string) {
    super(mensaje, 422, codigo);
  }
}
