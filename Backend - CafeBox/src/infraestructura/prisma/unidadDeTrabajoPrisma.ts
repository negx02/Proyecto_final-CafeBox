import { Prisma, PrismaClient } from '@prisma/client';

import { ErrorDeRegla, MENSAJES_DE_REGLA, type CodigoRegla } from '../../dominio/errores.js';
import type { UnidadDeTrabajo } from '../../dominio/puertos.js';
import { crearRepositoriosPrisma } from './repositoriosPrisma.js';

export function crearClientePrisma(urlDeConexion: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: urlDeConexion } },

    log: ['error', 'warn'],
  });
}

export function crearUnidadPrisma(prisma: PrismaClient): UnidadDeTrabajo {
  return {
    repos: crearRepositoriosPrisma(prisma),

    async enTransaccion(trabajo) {
      try {
        return await prisma.$transaction(
          async (tx) => trabajo(crearRepositoriosPrisma(tx)),
          {

            maxWait: 10_000,
            timeout: 60_000,
          },
        );
      } catch (error) {
        throw traducirErrorDePrisma(error);
      }
    },

    async cerrar() {
      await prisma.$disconnect();
    },
  };
}

const REGLA_POR_RESTRICCION: { patron: RegExp; codigo: CodigoRegla }[] = [
  { patron: /stock/, codigo: 'STOCK_INSUFICIENTE' },
  { patron: /entregas_suscripcion_ciclo/, codigo: 'CICLO_YA_GENERADO' },
  { patron: /cobros_suscripcion_ciclo|cobros_entrega_unico/, codigo: 'COBRO_YA_REGISTRADO' },
  { patron: /saltos_suscripcion_ciclo/, codigo: 'CICLO_YA_SALTADO' },
  { patron: /usuarios_correo/, codigo: 'CORREO_DUPLICADO' },
  { patron: /zonas_cobertura|primary/, codigo: 'CIUDAD_DUPLICADA' },
];

function traducirErrorDePrisma(error: unknown): unknown {

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const objetivo = error.meta?.target;
    const pista = String(Array.isArray(objetivo) ? objetivo.join(' ') : (objetivo ?? error.message))
      .toLowerCase();

    const regla = REGLA_POR_RESTRICCION.find(({ patron }) => patron.test(pista));
    if (regla) {
      return new ErrorDeRegla(regla.codigo, MENSAJES_DE_REGLA[regla.codigo], {
        origen: 'restriccion_de_base_de_datos',
        restriccion: pista,
      });
    }
    return error;
  }

  const mensaje = error instanceof Error ? error.message.toLowerCase() : '';
  if (mensaje.includes('check constraint') && mensaje.includes('stock')) {
    return new ErrorDeRegla('STOCK_INSUFICIENTE', MENSAJES_DE_REGLA.STOCK_INSUFICIENTE, {
      origen: 'restriccion_de_base_de_datos',
    });
  }

  return error;
}
