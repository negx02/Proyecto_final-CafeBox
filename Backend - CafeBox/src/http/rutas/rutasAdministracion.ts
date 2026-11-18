import { Router } from 'express';

import type { Aplicacion } from '../../composicion.js';
import { manejar } from '../asincrono.js';
import { exigirRol, exigirSesion } from '../middlewares/seguridad.js';
import {
  dineroPositivo,
  enteroNoNegativo,
  enteroPositivo,
  fechaIso,
  frecuencia,
  textoNoVacio,
  uuid,
  validar,
  z,
} from '../middlewares/validacion.js';
import { creado, exito } from '../respuesta.js';

export function rutasAdministracion(app: Aplicacion): Router {
  const router = Router();
  const { catalogo, ciclos, cambiosDePlan, tablero } = app.servicios;

  router.use(exigirSesion, exigirRol('ADMIN'));

  router.get(
    '/planes',
    manejar(async (_req, res) => {
      exito(res, await catalogo.listarTodosLosPlanes());
    }),
  );

  router.post(
    '/planes',
    validar({
      body: z.object({
        nombre: textoNoVacio('El nombre'),
        descripcion: textoNoVacio('La descripción', 500),
        productoId: uuid,
        bolsasPorEntrega: enteroPositivo,
        precioCiclo: dineroPositivo,
        frecuencia,
      }),
    }),
    manejar(async (req, res) => {
      creado(res, await catalogo.crearPlan(req.body));
    }),
  );

  router.patch(
    '/planes/:id',
    validar({
      params: z.object({ id: uuid }),
      body: z
        .object({
          nombre: textoNoVacio('El nombre').optional(),
          descripcion: textoNoVacio('La descripción', 500).optional(),
          productoId: uuid.optional(),
          bolsasPorEntrega: enteroPositivo.optional(),
          precioCiclo: dineroPositivo.optional(),
          frecuencia: frecuencia.optional(),
          activo: z.boolean().optional(),
        })
        .refine((v) => Object.keys(v).length > 0, 'No hay nada que actualizar'),
    }),
    manejar(async (req, res) => {
      exito(res, await catalogo.actualizarPlan(req.params.id, req.body));
    }),
  );

  router.get(
    '/productos',
    manejar(async (_req, res) => {
      exito(res, await catalogo.listarProductos());
    }),
  );

  router.patch(
    '/productos/:id',
    validar({
      params: z.object({ id: uuid }),
      body: z.object({ stockDisponible: enteroNoNegativo }),
    }),
    manejar(async (req, res) => {
      exito(res, await catalogo.ajustarStock(req.params.id, req.body.stockDisponible));
    }),
  );

  router.post(
    '/zonas-cobertura',
    validar({ body: z.object({ ciudad: textoNoVacio('La ciudad', 80) }) }),
    manejar(async (req, res) => {
      creado(res, await catalogo.agregarZona(req.body.ciudad));
    }),
  );

  router.delete(
    '/zonas-cobertura/:ciudad',
    validar({ params: z.object({ ciudad: textoNoVacio('La ciudad', 80) }) }),
    manejar(async (req, res) => {
      exito(res, await catalogo.quitarZona(req.params.ciudad));
    }),
  );

  router.post(
    '/ciclos',
    validar({ body: z.object({ hasta: fechaIso.optional() }).optional() }),
    manejar(async (req, res) => {
      creado(res, await ciclos.generarSiguienteCiclo({ hasta: req.body?.hasta }));
    }),
  );

  router.get(
    '/cambios-de-plan',
    validar({
      query: z.object({ estado: z.enum(['SOLICITADO', 'CONFIRMADO', 'RECHAZADO']).optional() }),
    }),
    manejar(async (req, res) => {
      exito(res, await cambiosDePlan.listar(req.query));
    }),
  );

  router.patch(
    '/cambios-de-plan/:id',
    validar({
      params: z.object({ id: uuid }),
      body: z.object({
        estado: z.enum(['CONFIRMADO', 'RECHAZADO']),
        cicloAplica: enteroPositivo.optional(),
      }),
    }),
    manejar(async (req, res) => {
      exito(
        res,
        await cambiosDePlan.resolver(req.params.id, req.body.estado, req.body.cicloAplica),
      );
    }),
  );

  router.get(
    '/reportes/cajas-por-armar',
    validar({ query: z.object({ fecha: fechaIso }) }),
    manejar(async (req, res) => {
      exito(res, await ciclos.cajasPorArmar(req.query.fecha as string));
    }),
  );

  router.get(
    '/reportes/tablero',
    validar({ query: z.object({ desde: fechaIso.optional(), hasta: fechaIso.optional() }) }),
    manejar(async (req, res) => {
      exito(res, await tablero.resumen(req.query));
    }),
  );

  return router;
}
