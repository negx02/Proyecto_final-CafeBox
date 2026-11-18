import cors from 'cors';
import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';

import type { Aplicacion } from '../composicion.js';
import { documentoOpenApi } from './documentacion/openapi.js';
import { manejadorDeErrores, rutaNoEncontrada } from './middlewares/manejadorDeErrores.js';
import { registroDePeticiones } from './middlewares/registro.js';
import { leerIdentidad } from './middlewares/seguridad.js';
import { rutasAdministracion } from './rutas/rutasAdministracion.js';
import { rutasEntregasYCobros } from './rutas/rutasEntregasYCobros.js';
import { rutasPublicas } from './rutas/rutasPublicas.js';
import { rutasSuscripciones } from './rutas/rutasSuscripciones.js';
import { error } from './respuesta.js';

export function crearServidor(app: Aplicacion): Express {
  const servidor = express();
  const { origenesPermitidos } = app.configuracion;

  servidor.use(
    cors({
      origin(origen, responder) {
        if (!origen || origenesPermitidos.includes(origen)) {
          responder(null, true);
          return;
        }
        responder(new Error(`Origen no permitido: ${origen}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  servidor.use(express.json({ limit: '100kb' }));

  servidor.use(registroDePeticiones);

  servidor.use(leerIdentidad(app.credenciales));

  servidor.use(
    '/documentacion',
    swaggerUi.serve,
    swaggerUi.setup(documentoOpenApi(app.configuracion.puerto), {
      customSiteTitle: 'CafeBox — servicio',
    }),
  );

  servidor.use('/', rutasPublicas(app));
  servidor.use('/', rutasSuscripciones(app));
  servidor.use('/', rutasEntregasYCobros(app));
  servidor.use('/admin', rutasAdministracion(app));

  servidor.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      siguiente: express.NextFunction,
    ) => {
      if (err instanceof SyntaxError && 'body' in err) {
        error(res, 400, 'VALIDACION', 'El cuerpo de la petición no es JSON válido');
        return;
      }
      siguiente(err);
    },
  );

  servidor.use(rutaNoEncontrada);
  servidor.use(manejadorDeErrores);

  return servidor;
}
