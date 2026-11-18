import type { NextFunction, Request, Response } from 'express';

export function registroDePeticiones(req: Request, res: Response, siguiente: NextFunction): void {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1_000_000;
    const linea = `${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(0)}ms`;
    if (res.statusCode >= 500) console.error(linea);
    else console.log(linea);
  });

  siguiente();
}
