import type { NextFunction, Request, Response } from 'express';
import { z, ZodError, type ZodTypeAny } from 'zod';

import { ErrorDeValidacion } from '../../dominio/errores.js';
import { esFechaValida } from '../../dominio/calendario.js';

type Parte = 'body' | 'query' | 'params';

export function validar(esquemas: Partial<Record<Parte, ZodTypeAny>>) {
  return (req: Request, _res: Response, siguiente: NextFunction): void => {
    const campos: { campo: string; mensaje: string }[] = [];

    for (const parte of ['params', 'query', 'body'] as Parte[]) {
      const esquema = esquemas[parte];
      if (!esquema) continue;
      const resultado = esquema.safeParse(req[parte]);
      if (resultado.success) {

        Object.defineProperty(req, parte, { value: resultado.data, writable: true });
      } else {
        campos.push(...aCampos(resultado.error, parte));
      }
    }

    if (campos.length > 0) {
      siguiente(new ErrorDeValidacion(campos));
      return;
    }
    siguiente();
  };
}

function aCampos(error: ZodError, parte: Parte): { campo: string; mensaje: string }[] {
  return error.issues.map((problema) => ({
    campo: problema.path.length ? problema.path.join('.') : parte,
    mensaje: problema.message,
  }));
}

export const uuid = z.string().uuid('Debe ser un identificador válido');

export const fechaIso = z
  .string()
  .refine(esFechaValida, 'Debe ser una fecha con formato AAAA-MM-DD');

export const correo = z
  .string()
  .trim()
  .toLowerCase()
  .email('Debe ser un correo electrónico válido');

export const contrasena = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres');

export const textoNoVacio = (nombre: string, maximo = 200) =>
  z.string().trim().min(1, `${nombre} no puede estar vacío`).max(maximo, `${nombre} es demasiado largo`);

export const enteroNoNegativo = z.coerce
  .number()
  .int('Debe ser un número entero')
  .min(0, 'No puede ser negativo');

export const enteroPositivo = z.coerce
  .number()
  .int('Debe ser un número entero')
  .positive('Debe ser mayor que cero');

export const dineroPositivo = z.coerce
  .number()
  .positive('Debe ser mayor que cero')
  .max(1_000_000, 'El monto es demasiado grande');

export const diaDeLaSemana = z.coerce
  .number()
  .int('Debe ser un número entero')
  .min(1, 'El día va de 1 (lunes) a 7 (domingo)')
  .max(7, 'El día va de 1 (lunes) a 7 (domingo)');

export const frecuencia = z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL'], {
  errorMap: () => ({ message: 'La frecuencia sólo puede ser SEMANAL, QUINCENAL o MENSUAL' }),
});

export const estadoSuscripcion = z.enum(['ACTIVA', 'PAUSADA', 'SUSPENDIDA', 'CANCELADA']);
export const estadoEntrega = z.enum(['PROGRAMADA', 'SALTADA', 'ARMADA', 'ENVIADA', 'ENTREGADA']);
export const estadoCobro = z.enum(['PENDIENTE', 'COBRADO', 'FALLIDO', 'CANCELADO']);

export { z };
