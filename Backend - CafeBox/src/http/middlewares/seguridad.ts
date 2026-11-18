import type { NextFunction, Request, Response } from 'express';

import { ErrorNoAutenticado, ErrorSinPermiso } from '../../dominio/errores.js';
import type { Credenciales } from '../../dominio/puertos.js';
import type { Identidad, Rol } from '../../dominio/tipos.js';

declare global {

  namespace Express {
    interface Request {
      identidad?: Identidad;
    }
  }
}

export function leerIdentidad(credenciales: Credenciales) {
  return (req: Request, _res: Response, siguiente: NextFunction): void => {
    const encabezado = req.header('authorization');
    if (!encabezado?.startsWith('Bearer ')) {
      siguiente();
      return;
    }
    try {
      const leida = credenciales.leer(encabezado.slice('Bearer '.length).trim());
      req.identidad = {
        usuarioId: leida.usuarioId,
        rol: leida.rol as Rol,
        clienteId: leida.clienteId,
        correo: leida.correo,
      };
      siguiente();
    } catch (error) {

      siguiente(error);
    }
  };
}

export function exigirSesion(req: Request, _res: Response, siguiente: NextFunction): void {
  if (!req.identidad) {
    siguiente(new ErrorNoAutenticado());
    return;
  }
  siguiente();
}

export function exigirRol(...roles: Rol[]) {
  return (req: Request, _res: Response, siguiente: NextFunction): void => {
    if (!req.identidad) {
      siguiente(new ErrorNoAutenticado());
      return;
    }
    if (!roles.includes(req.identidad.rol)) {
      siguiente(
        new ErrorSinPermiso(
          `Esta operación es para el rol ${roles.join(' o ')} y tu cuenta es ${req.identidad.rol}`,
        ),
      );
      return;
    }
    siguiente();
  };
}

export function identidadDe(req: Request): Identidad {
  if (!req.identidad) throw new ErrorNoAutenticado();
  return req.identidad;
}
