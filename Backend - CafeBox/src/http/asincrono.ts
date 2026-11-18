import type { NextFunction, Request, RequestHandler, Response } from 'express';

export function manejar(
  manejador: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, siguiente: NextFunction) => {
    manejador(req, res).catch(siguiente);
  };
}
