import { Router } from 'express';

import type { Aplicacion } from '../../composicion.js';
import { manejar } from '../asincrono.js';
import { exigirRol, exigirSesion, identidadDe } from '../middlewares/seguridad.js';
import {
  estadoCobro,
  estadoEntrega,
  fechaIso,
  textoNoVacio,
  uuid,
  validar,
  z,
} from '../middlewares/validacion.js';
import { creado, exito } from '../respuesta.js';

export function rutasEntregasYCobros(app: Aplicacion): Router {
  const router = Router();
  const { ciclos, cobros } = app.servicios;

  router.use(exigirSesion);

  router.get(
    '/entregas',
    validar({
      query: z.object({
        fecha: fechaIso.optional(),
        desde: fechaIso.optional(),
        hasta: fechaIso.optional(),
        ciudad: textoNoVacio('La ciudad', 80).optional(),
        planId: uuid.optional(),
        estado: estadoEntrega.optional(),
        suscripcionId: uuid.optional(),
      }),
    }),
    manejar(async (req, res) => {
      exito(res, await ciclos.listar(identidadDe(req), req.query));
    }),
  );

  router.get(
    '/entregas/:id',
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      exito(res, await ciclos.obtener(identidadDe(req), req.params.id));
    }),
  );

  router.post(
    '/entregas/:id/armados',
    exigirRol('ADMIN'),
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      creado(res, await ciclos.avanzarEstado(req.params.id, 'ARMADA'));
    }),
  );

  router.post(
    '/entregas/:id/envios',
    exigirRol('ADMIN'),
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      creado(res, await ciclos.avanzarEstado(req.params.id, 'ENVIADA'));
    }),
  );

  router.post(
    '/entregas/:id/recepciones',
    exigirRol('ADMIN'),
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      creado(res, await ciclos.avanzarEstado(req.params.id, 'ENTREGADA'));
    }),
  );

  router.post(
    '/armados',
    exigirRol('ADMIN'),
    validar({ body: z.object({ fecha: fechaIso }) }),
    manejar(async (req, res) => {
      creado(res, await ciclos.avanzarPorFecha(req.body.fecha, 'ARMADA'));
    }),
  );

  router.post(
    '/envios',
    exigirRol('ADMIN'),
    validar({ body: z.object({ fecha: fechaIso }) }),
    manejar(async (req, res) => {
      creado(res, await ciclos.avanzarPorFecha(req.body.fecha, 'ENVIADA'));
    }),
  );

  router.get(
    '/cobros',
    validar({
      query: z.object({
        estado: estadoCobro.optional(),
        suscripcionId: uuid.optional(),
        desde: fechaIso.optional(),
        hasta: fechaIso.optional(),
      }),
    }),
    manejar(async (req, res) => {
      exito(res, await cobros.listar(identidadDe(req), req.query));
    }),
  );

  router.patch(
    '/cobros/:id',
    exigirRol('ADMIN'),
    validar({
      params: z.object({ id: uuid }),
      body: z.object({
        estado: z.enum(['COBRADO', 'FALLIDO'], {
          errorMap: () => ({ message: 'El resultado del cobro sólo puede ser COBRADO o FALLIDO' }),
        }),
        motivoFallo: z.string().trim().max(200).optional(),
      }),
    }),
    manejar(async (req, res) => {
      exito(res, await cobros.registrar(req.params.id, req.body.estado, req.body.motivoFallo));
    }),
  );

  router.post(
    '/cobros/:id/reintentos',
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      creado(res, await cobros.reintentar(identidadDe(req), req.params.id));
    }),
  );

  return router;
}
