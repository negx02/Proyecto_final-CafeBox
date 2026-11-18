import { Router } from 'express';

import type { Aplicacion } from '../../composicion.js';
import { manejar } from '../asincrono.js';
import {
  contrasena,
  correo,
  textoNoVacio,
  uuid,
  validar,
  z,
} from '../middlewares/validacion.js';
import { creado, exito } from '../respuesta.js';

export function rutasPublicas(app: Aplicacion): Router {
  const router = Router();
  const { cuentas, catalogo } = app.servicios;

  router.post(
    '/usuarios',
    validar({
      body: z.object({
        correo,
        contrasena,
        nombre: textoNoVacio('El nombre'),
        ciudad: textoNoVacio('La ciudad', 80),
        direccion: textoNoVacio('La dirección', 300).optional(),
        telefono: z.string().trim().max(20).optional(),
      }),
    }),
    manejar(async (req, res) => {
      const resultado = await cuentas.registrar(req.body);
      creado(res, resultado);
    }),
  );

  router.post(
    '/sesiones',
    validar({
      body: z.object({
        correo: z.string().trim().toLowerCase().min(1, 'El correo no puede estar vacío'),
        contrasena: z.string().min(1, 'La contraseña no puede estar vacía'),
      }),
    }),
    manejar(async (req, res) => {
      const resultado = await cuentas.iniciarSesion(req.body.correo, req.body.contrasena);
      creado(res, resultado);
    }),
  );

  router.get(
    '/planes',
    manejar(async (_req, res) => {
      exito(res, await catalogo.listarPlanesDisponibles());
    }),
  );

  router.get(
    '/planes/:id',
    validar({ params: z.object({ id: uuid }) }),
    manejar(async (req, res) => {
      exito(res, await catalogo.obtenerPlan(req.params.id));
    }),
  );

  router.get(
    '/zonas-cobertura',
    manejar(async (_req, res) => {
      exito(res, await catalogo.listarZonas());
    }),
  );

  router.get('/salud', (_req, res) => {
    exito(res, {
      servicio: 'CafeBox',
      persistencia: app.configuracion.persistencia,
      hoy: app.reloj.hoy(),
    });
  });

  return router;
}
