import jwt from 'jsonwebtoken';

import { ErrorNoAutenticado } from '../../dominio/errores.js';
import type { Credenciales } from '../../dominio/puertos.js';

export function crearCredencialesJwt(llave: string, duracion: string): Credenciales {
  return {
    emitir(identidad) {
      const credencial = jwt.sign(
        {
          sub: identidad.usuarioId,
          rol: identidad.rol,
          clienteId: identidad.clienteId,
          correo: identidad.correo,
        },
        llave,
        { expiresIn: duracion as jwt.SignOptions['expiresIn'] },
      );

      const { exp } = jwt.decode(credencial) as { exp: number };
      return { credencial, expiraEn: new Date(exp * 1000).toISOString() };
    },

    leer(credencial) {
      try {
        const carga = jwt.verify(credencial, llave) as {
          sub: string;
          rol: string;
          clienteId: string | null;
          correo: string;
        };
        return {
          usuarioId: carga.sub,
          rol: carga.rol,
          clienteId: carga.clienteId ?? null,
          correo: carga.correo,
        };
      } catch (error) {
        const vencida = error instanceof jwt.TokenExpiredError;
        throw new ErrorNoAutenticado(
          vencida ? 'Tu sesión expiró: inicia sesión otra vez' : 'La credencial no es válida',
        );
      }
    },
  };
}
