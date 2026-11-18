import type { NextFunction, Request, Response } from 'express';

import {
  ErrorDeRegla,
  ErrorDeValidacion,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorSinPermiso,
} from '../../dominio/errores.js';
import { error as responderError } from '../respuesta.js';

export function manejadorDeErrores(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ErrorDeValidacion) {
    responderError(res, 400, err.codigo, err.message, { campos: err.campos });
    return;
  }
  if (err instanceof ErrorNoAutenticado) {
    responderError(res, 401, err.codigo, err.message);
    return;
  }
  if (err instanceof ErrorSinPermiso) {
    responderError(res, 403, err.codigo, err.message);
    return;
  }
  if (err instanceof ErrorNoEncontrado) {
    responderError(res, 404, err.codigo, err.message, {
      detalle: { entidad: err.entidad, id: err.id },
    });
    return;
  }
  if (err instanceof ErrorDeRegla) {
    responderError(res, 409, err.codigo, err.message, { detalle: err.detalle });
    return;
  }

  console.error('[error-interno]', err);
  responderError(res, 500, 'ERROR_INTERNO', 'Ocurrió un error inesperado en el servicio');
}

export function rutaNoEncontrada(req: Request, res: Response): void {
  responderError(
    res,
    404,
    'RUTA_NO_ENCONTRADA',
    `No existe el punto de entrada ${req.method} ${req.path}`,
  );
}
