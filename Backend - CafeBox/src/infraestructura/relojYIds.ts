import { randomUUID } from 'node:crypto';

import type { GeneradorDeId, Reloj } from '../dominio/puertos.js';

export function crearRelojDelSistema(zona = 'America/Hermosillo'): Reloj {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return {
    hoy() {
      return formato.format(new Date());
    },
    ahora() {
      return new Date().toISOString();
    },
  };
}

export function crearRelojFijo(fecha: string): Reloj {
  return {
    hoy: () => fecha,
    ahora: () => `${fecha}T12:00:00.000Z`,
  };
}

export function crearGeneradorDeId(): GeneradorDeId {
  return { nuevo: () => randomUUID() };
}
