const respuestaConError = {
  type: 'object',
  required: ['ok', 'error'],
  properties: {
    ok: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        codigo: { type: 'string', example: 'FUERA_DE_COBERTURA' },
        mensaje: { type: 'string', example: 'Todavía no entregamos en tu ciudad.' },
        detalle: { type: 'object', nullable: true },
        campos: {
          type: 'array',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              campo: { type: 'string', example: 'correo' },
              mensaje: { type: 'string', example: 'Debe ser un correo electrónico válido' },
            },
          },
        },
      },
    },
  },
};

const exitoCon = (datos: object) => ({
  type: 'object',
  required: ['ok', 'datos'],
  properties: { ok: { type: 'boolean', example: true }, datos },
});

const errores = (...codigos: number[]) =>
  Object.fromEntries(
    codigos.map((codigo) => [
      String(codigo),
      {
        description:
          {
            400: 'Petición mal formada o dato inválido (VALIDACION)',
            401: 'Sin credencial, vencida o alterada (NO_AUTENTICADO)',
            403: 'Credencial válida, rol o dueño equivocado (SIN_PERMISO)',
            404: 'El recurso no existe (ENTIDAD_NO_ENCONTRADA)',
            409: 'Una regla de negocio lo impide',
            500: 'Falla inesperada (ERROR_INTERNO)',
          }[codigo] ?? 'Error',
        content: { 'application/json': { schema: respuestaConError } },
      },
    ]),
  );

const parametroId = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

export function documentoOpenApi(puerto: number) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'CafeBox — servicio central',
      version: '2.0.0',
      description: [
        'Suscripciones de café de especialidad con entregas recurrentes.',
        '',
        '**Formato uniforme.** Toda respuesta trae `ok`. Con éxito, `datos`;',
        'con error, `error.codigo` y `error.mensaje` en lenguaje del usuario.',
        '',
        '**Códigos.** 400 validación · 401 sin credencial o vencida ·',
        '403 rol o dueño equivocado · 404 no existe · 409 *cualquier* regla de',
        'negocio · 500 falla inesperada.',
        '',
        '**Cómo probar.** Llama a `POST /sesiones`, copia el campo `credencial`',
        'y pégalo en el botón *Authorize* de arriba.',
      ].join('\n'),
    },
    servers: [{ url: `http://localhost:${puerto}`, description: 'Local' }],
    components: {
      securitySchemes: {
        credencial: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      { name: 'Cuentas', description: 'Registro, inicio de sesión y perfil' },
      { name: 'Catálogo', description: 'Planes y cobertura (público)' },
      { name: 'Suscripciones', description: 'Contratar, pausar, saltar, cambiar de plan, cancelar' },
      { name: 'Entregas', description: 'Calendario y avance de estados' },
      { name: 'Cobros', description: 'Cobros por ciclo' },
      { name: 'Backoffice', description: 'Sólo rol ADMIN' },
    ],
    paths: {
      '/usuarios': {
        post: {
          tags: ['Cuentas'],
          summary: 'Registra un cliente',
          description:
            'No valida cobertura: cualquiera puede crear cuenta desde cualquier ciudad. La cobertura se aplica al contratar.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['correo', 'contrasena', 'nombre', 'ciudad'],
                  properties: {
                    correo: { type: 'string', format: 'email' },
                    contrasena: { type: 'string', minLength: 8 },
                    nombre: { type: 'string' },
                    ciudad: { type: 'string', example: 'Guaymas' },
                    direccion: { type: 'string' },
                    telefono: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Cuenta creada', content: { 'application/json': { schema: exitoCon({ type: 'object' }) } } },
            ...errores(400, 409),
          },
        },
      },

      '/sesiones': {
        post: {
          tags: ['Cuentas'],
          summary: 'Inicia sesión',
          description:
            'Ante correo inexistente o contraseña equivocada responde lo mismo, para no revelar qué correos existen.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['correo', 'contrasena'],
                  properties: {
                    correo: { type: 'string', example: 'ana@cafebox.test' },
                    contrasena: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Credencial emitida',
              content: {
                'application/json': {
                  schema: exitoCon({
                    type: 'object',
                    properties: {
                      credencial: { type: 'string' },
                      expiraEn: { type: 'string', format: 'date-time' },
                    },
                  }),
                },
              },
            },
            ...errores(400, 401),
          },
        },
      },

      '/perfil': {
        get: {
          tags: ['Cuentas'],
          summary: 'Quién soy',
          description:
            'El portal lo llama al arrancar con una credencial guardada: si responde 401, la credencial ya no vale y cierra la sesión.',
          security: [{ credencial: [] }],
          responses: { 200: { description: 'Perfil' }, ...errores(401) },
        },
        patch: {
          tags: ['Cuentas'],
          summary: 'Corrige dirección, teléfono o datos de pago',
          security: [{ credencial: [] }],
          responses: { 200: { description: 'Perfil actualizado' }, ...errores(400, 401, 403) },
        },
      },

      '/planes': {
        get: {
          tags: ['Catálogo'],
          summary: 'Planes disponibles',
          responses: { 200: { description: 'Lista de planes con su contenido, precio y frecuencia' } },
        },
      },
      '/planes/{id}': {
        get: {
          tags: ['Catálogo'],
          summary: 'Detalle de un plan',
          parameters: [parametroId],
          responses: { 200: { description: 'Plan' }, ...errores(400, 404) },
        },
      },
      '/zonas-cobertura': {
        get: {
          tags: ['Catálogo'],
          summary: 'Ciudades con cobertura',
          responses: { 200: { description: 'Lista de ciudades' } },
        },
      },
      '/salud': {
        get: {
          tags: ['Catálogo'],
          summary: 'Estado del servicio',
          responses: { 200: { description: 'El servicio responde' } },
        },
      },

      '/suscripciones': {
        post: {
          tags: ['Suscripciones'],
          summary: 'Contrata un plan y programa la primera entrega',
          description:
            'Reglas, en orden: cobertura (FUERA_DE_COBERTURA), plan retirado (PLAN_RETIRADO), duplicado (SUSCRIPCION_DUPLICADA), inventario (STOCK_INSUFICIENTE). Todas responden 409.',
          security: [{ credencial: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['planId', 'direccionEntrega', 'ciudad', 'diaEntregaPreferido'],
                  properties: {
                    planId: { type: 'string', format: 'uuid' },
                    direccionEntrega: { type: 'string' },
                    ciudad: { type: 'string' },
                    diaEntregaPreferido: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 7,
                      description: '1 = lunes … 7 = domingo',
                    },
                    fechaInicio: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Suscripción creada con su primera entrega' },
            ...errores(400, 401, 403, 404, 409),
          },
        },
        get: {
          tags: ['Suscripciones'],
          summary: 'Lista suscripciones',
          description: 'El CLIENTE ve las suyas; el ADMIN ve todas y puede filtrar.',
          security: [{ credencial: [] }],
          parameters: [
            { name: 'planId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            {
              name: 'estado',
              in: 'query',
              schema: { type: 'string', enum: ['ACTIVA', 'PAUSADA', 'SUSPENDIDA', 'CANCELADA'] },
            },
            { name: 'clienteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Lista' }, ...errores(400, 401) },
        },
      },

      '/suscripciones/{id}': {
        get: {
          tags: ['Suscripciones'],
          summary: 'Detalle con historial de ciclos',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 200: { description: 'Detalle' }, ...errores(400, 401, 403, 404) },
        },
        patch: {
          tags: ['Suscripciones'],
          summary: 'Cancela la suscripción',
          description:
            'El único estado al que se puede cambiar es CANCELADA. Si el ciclo programado ya está cobrado, esa entrega se respeta y se informa cuál será la última.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['estado'],
                  properties: { estado: { type: 'string', enum: ['CANCELADA'] } },
                },
              },
            },
          },
          responses: { 200: { description: 'Cancelada' }, ...errores(400, 401, 403, 404, 409) },
        },
      },

      '/suscripciones/{id}/proximas-entregas': {
        get: {
          tags: ['Entregas'],
          summary: 'Calendario de las próximas entregas',
          description:
            'Mezcla las entregas ya generadas con las previstas, para que la respuesta no dependa de que el administrador ya haya corrido la generación.',
          security: [{ credencial: [] }],
          parameters: [
            parametroId,
            { name: 'cuantas', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24 } },
          ],
          responses: { 200: { description: 'Calendario' }, ...errores(400, 401, 403, 404) },
        },
      },

      '/suscripciones/{id}/pausas': {
        post: {
          tags: ['Suscripciones'],
          summary: 'Pausa la suscripción por un periodo',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['desde', 'hasta'],
                  properties: {
                    desde: { type: 'string', format: 'date' },
                    hasta: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Pausada' }, ...errores(400, 401, 403, 404, 409) },
        },
        delete: {
          tags: ['Suscripciones'],
          summary: 'Reanuda antes de tiempo',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 200: { description: 'Reanudada' }, ...errores(400, 401, 403, 404, 409) },
        },
      },

      '/suscripciones/{id}/omisiones': {
        post: {
          tags: ['Suscripciones'],
          summary: 'Se salta una entrega puntual',
          description:
            'Reglas: OMISION_FUERA_DE_TIEMPO si falta menos de 2 días, LIMITE_OMISIONES tras 2 saltos seguidos, CICLO_YA_COBRADO si ese ciclo ya se pagó.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 201: { description: 'Entrega saltada' }, ...errores(400, 401, 403, 404, 409) },
        },
      },

      '/suscripciones/{id}/cambios-de-plan': {
        post: {
          tags: ['Suscripciones'],
          summary: 'Pide cambiar de plan',
          description: 'Responde desde qué ciclo aplicaría y cuánto pagaría a partir de ahí.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['planNuevoId'],
                  properties: { planNuevoId: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
          responses: { 201: { description: 'Solicitud registrada' }, ...errores(400, 401, 403, 404, 409) },
        },
      },

      '/entregas': {
        get: {
          tags: ['Entregas'],
          summary: 'Lista entregas',
          description: 'El CLIENTE ve las suyas; el ADMIN filtra por fecha, ciudad, plan y estado.',
          security: [{ credencial: [] }],
          parameters: [
            { name: 'fecha', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'ciudad', in: 'query', schema: { type: 'string' } },
            { name: 'planId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            {
              name: 'estado',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['PROGRAMADA', 'SALTADA', 'ARMADA', 'ENVIADA', 'ENTREGADA'],
              },
            },
          ],
          responses: { 200: { description: 'Lista' }, ...errores(400, 401) },
        },
      },
      '/entregas/{id}': {
        get: {
          tags: ['Entregas'],
          summary: 'Detalle de una entrega',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 200: { description: 'Entrega' }, ...errores(400, 401, 403, 404) },
        },
      },
      '/entregas/{id}/armados': {
        post: {
          tags: ['Backoffice'],
          summary: 'Marca la caja como armada',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 201: { description: 'Armada' }, ...errores(400, 401, 403, 404, 409) },
        },
      },
      '/entregas/{id}/envios': {
        post: {
          tags: ['Backoffice'],
          summary: 'Registra que la caja salió',
          description: 'Exige que el ciclo esté cobrado: si no, 409 ENTREGA_SIN_COBRO.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 201: { description: 'Enviada' }, ...errores(400, 401, 403, 404, 409) },
        },
      },
      '/entregas/{id}/recepciones': {
        post: {
          tags: ['Backoffice'],
          summary: 'Marca la entrega como recibida',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 201: { description: 'Entregada' }, ...errores(400, 401, 403, 404, 409) },
        },
      },
      '/armados': {
        post: {
          tags: ['Backoffice'],
          summary: 'Marca como armadas todas las entregas de un día',
          security: [{ credencial: [] }],
          responses: { 201: { description: 'Resumen del lote' }, ...errores(400, 401, 403) },
        },
      },
      '/envios': {
        post: {
          tags: ['Backoffice'],
          summary: 'Marca como enviadas todas las armadas de un día',
          security: [{ credencial: [] }],
          responses: { 201: { description: 'Resumen del lote' }, ...errores(400, 401, 403) },
        },
      },

      '/cobros': {
        get: {
          tags: ['Cobros'],
          summary: 'Historial de cobros por ciclo',
          security: [{ credencial: [] }],
          parameters: [
            {
              name: 'estado',
              in: 'query',
              schema: { type: 'string', enum: ['PENDIENTE', 'COBRADO', 'FALLIDO', 'CANCELADO'] },
            },
            { name: 'suscripcionId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: { description: 'Lista' }, ...errores(400, 401) },
        },
      },
      '/cobros/{id}': {
        patch: {
          tags: ['Backoffice'],
          summary: 'Registra el resultado del cobro de un ciclo',
          description: 'FALLIDO suspende la suscripción y detiene la generación de sus entregas.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['estado'],
                  properties: {
                    estado: { type: 'string', enum: ['COBRADO', 'FALLIDO'] },
                    motivoFallo: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Cobro registrado' }, ...errores(400, 401, 403, 404, 409) },
        },
      },
      '/cobros/{id}/reintentos': {
        post: {
          tags: ['Cobros'],
          summary: 'Reintenta un cobro fallido',
          description:
            'El cliente lo pide después de corregir sus datos de pago: el cobro vuelve a PENDIENTE y la suscripción a ACTIVA.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 201: { description: 'Reintento registrado' }, ...errores(400, 401, 403, 404, 409) },
        },
      },

      '/admin/planes': {
        get: { tags: ['Backoffice'], summary: 'Planes, incluidos los retirados', security: [{ credencial: [] }], responses: { 200: { description: 'Lista' }, ...errores(401, 403) } },
        post: { tags: ['Backoffice'], summary: 'Da de alta un plan', security: [{ credencial: [] }], responses: { 201: { description: 'Plan creado' }, ...errores(400, 401, 403, 404) } },
      },
      '/admin/planes/{id}': {
        patch: {
          tags: ['Backoffice'],
          summary: 'Cambia precio o contenido, o retira el plan',
          description:
            'Retirar es `activo: false`. Los ya suscritos conservan sus condiciones: sus entregas generadas y sus cobros registrados no cambian.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 200: { description: 'Plan actualizado' }, ...errores(400, 401, 403, 404) },
        },
      },
      '/admin/productos': {
        get: { tags: ['Backoffice'], summary: 'Inventario con su stock', security: [{ credencial: [] }], responses: { 200: { description: 'Lista' }, ...errores(401, 403) } },
      },
      '/admin/productos/{id}': {
        patch: {
          tags: ['Backoffice'],
          summary: 'Ajusta el stock disponible',
          description:
            'Operación con la que se demuestran los tres resultados del control de acceso: sin credencial 401, con credencial de CLIENTE 403, con credencial de ADMIN 200.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 200: { description: 'Stock ajustado' }, ...errores(400, 401, 403, 404) },
        },
      },
      '/admin/zonas-cobertura': {
        post: { tags: ['Backoffice'], summary: 'Agrega una ciudad con cobertura', security: [{ credencial: [] }], responses: { 201: { description: 'Agregada' }, ...errores(400, 401, 403, 409) } },
      },
      '/admin/zonas-cobertura/{ciudad}': {
        delete: {
          tags: ['Backoffice'],
          summary: 'Quita una ciudad de la cobertura',
          security: [{ credencial: [] }],
          parameters: [{ name: 'ciudad', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Quitada' }, ...errores(400, 401, 403, 404) },
        },
      },
      '/admin/ciclos': {
        post: {
          tags: ['Backoffice'],
          summary: 'Genera las entregas del siguiente ciclo',
          description:
            'Una entrega por suscripción activa. Omite suspendidas y canceladas, registra como SALTADA la de quien pausó o pidió salto, y no duplica: repetir la llamada no cambia el resultado.',
          security: [{ credencial: [] }],
          responses: { 201: { description: 'Resumen de la generación' }, ...errores(400, 401, 403) },
        },
      },
      '/admin/cambios-de-plan': {
        get: { tags: ['Backoffice'], summary: 'Solicitudes de cambio de plan', security: [{ credencial: [] }], responses: { 200: { description: 'Lista' }, ...errores(400, 401, 403) } },
      },
      '/admin/cambios-de-plan/{id}': {
        patch: {
          tags: ['Backoffice'],
          summary: 'Confirma o rechaza un cambio de plan',
          description: 'Al confirmar se indica desde qué ciclo aplica; no puede ser un ciclo ya generado.',
          security: [{ credencial: [] }],
          parameters: [parametroId],
          responses: { 200: { description: 'Resuelto' }, ...errores(400, 401, 403, 404, 409) },
        },
      },
      '/admin/reportes/cajas-por-armar': {
        get: {
          tags: ['Backoffice'],
          summary: 'Cuántas cajas de cada plan hay que armar para una fecha',
          security: [{ credencial: [] }],
          parameters: [
            { name: 'fecha', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          ],
          responses: { 200: { description: 'Reporte' }, ...errores(400, 401, 403) },
        },
      },
      '/admin/reportes/tablero': {
        get: {
          tags: ['Backoffice'],
          summary: 'Tablero del negocio',
          description:
            'Suscriptores activos por plan, pausados, cancelados en el periodo, ingreso recurrente del mes y entregas pendientes de armar.',
          security: [{ credencial: [] }],
          responses: { 200: { description: 'Tablero' }, ...errores(400, 401, 403) },
        },
      },
    },
  };
}
