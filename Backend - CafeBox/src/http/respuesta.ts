import type { Response } from 'express';

export interface RespuestaExitosa<T> {
  ok: true;
  datos: T;
  meta?: Record<string, unknown>;
}

export interface RespuestaConError {
  ok: false;
  error: {
    codigo: string;
    mensaje: string;
    detalle?: unknown;
    campos?: { campo: string; mensaje: string }[];
  };
}

export type Respuesta<T> = RespuestaExitosa<T> | RespuestaConError;

export function exito<T>(
  res: Response,
  datos: T,
  codigoHttp = 200,
  meta?: Record<string, unknown>,
): void {
  const cuerpo: RespuestaExitosa<T> = meta ? { ok: true, datos, meta } : { ok: true, datos };
  res.status(codigoHttp).json(cuerpo);
}

export function creado<T>(res: Response, datos: T): void {
  exito(res, datos, 201);
}

export function error(
  res: Response,
  codigoHttp: number,
  codigo: string,
  mensaje: string,
  extra?: { detalle?: unknown; campos?: { campo: string; mensaje: string }[] },
): void {
  const cuerpo: RespuestaConError = {
    ok: false,
    error: { codigo, mensaje, ...extra },
  };
  res.status(codigoHttp).json(cuerpo);
}
