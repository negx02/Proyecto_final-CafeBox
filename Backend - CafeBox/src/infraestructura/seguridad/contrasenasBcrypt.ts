import bcrypt from 'bcryptjs';

import type { Contrasenas } from '../../dominio/puertos.js';

export function crearContrasenasBcrypt(costo = 10): Contrasenas {
  return {
    async transformar(contrasena) {
      return bcrypt.hash(contrasena, costo);
    },
    async verificar(contrasena, hash) {
      try {
        return await bcrypt.compare(contrasena, hash);
      } catch {

        return false;
      }
    },
  };
}
