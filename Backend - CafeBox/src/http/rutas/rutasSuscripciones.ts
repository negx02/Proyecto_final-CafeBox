import { Router } from 'express';

import type { Aplicacion } from '../../composicion.js';
import { manejar } from '../asincrono.js';
import { exigirRol, exigirSesion, identidadDe } from '../middlewares/seguridad.js';
import {
  diaDeLaSemana,
  estadoSuscripcion,
  fechaIso,
  textoNoVacio,
  uuid,
  validar,
  z,
} from '../middlewares/validacion.js';
import { creado, exito } from '../respuesta.js';

export function rutasSuscripciones(app: Aplicacion): Router {
  const router = Router();
  const { suscripciones, cuentas } = app.servicios;

  router.use(exigirSesion);

  router.get(
    '/perfil',
    manejar(async (req, res) => {
      exito(res, await cuentas.verPerfil(identidadDe(req).usuarioId));
    }),
  );

  router.patch(
    '/perfil',
    exigirRol('CLIENTE'),
    validar({
      body: z
        .object({
          direccion: textoNoVacio('La dirección', 300).optional(),
          telefono: z.string().trim().max(20).optional(),
          ciudad: textoNoVacio('La ciudad', 80).optional(),
          pagoTitular: textoNoVacio('El titular', 120).optional(),
          pagoUltimos4: z
            .string()
            .regex(/^\d{4}$/, 'Deben ser los últimos 4 dígitos de la tarjeta')
            .optional(),
        })
        .refine((v) => Object.keys(v).length > 0, 'No hay nada que actualizar'),
    }),
    manejar(async (req, res) => {
      const identidad = identidadDe(req);
      exito(res, await cuentas.actualizarPerfil(identidad.clienteId!, req.body));
    }),
  );

  router.post(
    '/suscripciones',
    exigirRol('CLIENTE'),
    validar({
      body: z.object({
        planId: uuid,
        direccionEntrega: textoNoVacio('La dirección de entrega', 300),
        ciudad: textoNoVacio('La ciudad', 80),
        diaEntregaPreferido: diaDeLaSemana,
        fechaInicio: fechaIso.optional(),
      }),
    }),
    manejar(async (req, res) => {
      creado(res, await suscripciones.contratar(identidadDe(req), req.body));
    }),
  );

  router.get(
    '/suscripciones',
    validar({
      query: z.object({
        planId: uuid.optional(),
        estado: estadoSuscripcion.optional(),
        clienteId: uuid.optional(),
      }),
    }),
    manejar(async (req, res) => {
      exito(res, await suscripciones.listar(identidadDe(req), req.query));
    }),
  );

  router.get(
    '/suscripciones/:id',
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      exito(res, await suscripciones.obtenerDetalle(identidadDe(req), req.params.id));
    }),
  );

  router.get(
    '/suscripciones/:id/proximas-entregas',
    validar({
      params: z.object({ id: uuid }),
      query: z.object({ cuantas: z.coerce.number().int().min(1).max(24).optional() }),
    }),
    manejar(async (req, res) => {
      exito(
        res,
        await suscripciones.proximasEntregas(
          identidadDe(req),
          req.params.id,
          req.query.cuantas ?? 6,
        ),
      );
    }),
  );

  router.post(
    '/suscripciones/:id/pausas',
    exigirRol('CLIENTE'),
    validar({
      params: z.object({ id: uuid }),
      body: z.object({ desde: fechaIso, hasta: fechaIso }),
    }),
    manejar(async (req, res) => {
      creado(
        res,
        await suscripciones.pausar(
          identidadDe(req),
          req.params.id,
          req.body.desde,
          req.body.hasta,
        ),
      );
    }),
  );

  router.delete(
    '/suscripciones/:id/pausas',
    exigirRol('CLIENTE'),
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      exito(res, await suscripciones.reanudar(identidadDe(req), req.params.id));
    }),
  );

  router.post(
    '/suscripciones/:id/omisiones',
    exigirRol('CLIENTE'),
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      creado(res, await suscripciones.saltarProximaEntrega(identidadDe(req), req.params.id));
    }),
  );

  router.post(
    '/suscripciones/:id/cambios-de-plan',
    exigirRol('CLIENTE'),
    validar({
      params: z.object({ id: uuid }),
      body: z.object({ planNuevoId: uuid }),
    }),
    manejar(async (req, res) => {
      creado(
        res,
        await suscripciones.solicitarCambioDePlan(
          identidadDe(req),
          req.params.id,
          req.body.planNuevoId,
        ),
      );
    }),
  );

  router.patch(
    '/suscripciones/:id',
    exigirRol('CLIENTE'),
    validar({
      params: z.object({ id: uuid }),
      body: z.object({
        estado: z.literal('CANCELADA', {
          errorMap: () => ({
            message: 'El único estado al que puedes cambiar tu suscripción es CANCELADA',
          }),
        }),
      }),
    }),
    manejar(async (req, res) => {
      exito(res, await suscripciones.cancelar(identidadDe(req), req.params.id));
    }),
  );

  return router;
}
