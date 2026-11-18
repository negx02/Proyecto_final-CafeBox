# CafeBox — Backend

Servicio HTTP de suscripciones de café de especialidad con entregas recurrentes.
Guarda los datos y aplica las reglas; el frontend le pide todo por la red.

Node 20 o superior · TypeScript · Express · Prisma sobre MySQL 8

- Corre en `http://localhost:3000`
- Documentación navegable en `http://localhost:3000/documentacion`

---

## Cómo arrancarlo

Necesitas MySQL 8.0.16 o superior corriendo en tu máquina. Antes de esa versión
MySQL aceptaba las restricciones `CHECK` pero no las aplicaba, y aquí son parte
de las reglas.

```bash
npm install
npm run migrar
npm run sembrar
npm run dev
```

| Comando            | Qué hace                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `npm install`      | Instala y genera el cliente de Prisma desde `prisma/schema.prisma`. No hay que correr `prisma generate` a mano. |
| `npm run migrar`   | `prisma migrate deploy`: crea la base `cafebox` si no existe y aplica las cinco migraciones.                    |
| `npm run sembrar`  | Deja los datos de prueba. Se puede repetir sin duplicar nada.                                                   |
| `npm run dev`      | Levanta el servicio con recarga automática.                                                                     |
| `npm run preparar` | Los dos de en medio juntos: migrar y sembrar.                                                                   |

## La conexión a MySQL

Ya viene configurada en `.env`:

```
DATABASE_URL=mysql://root:Nicolas12@localhost:3306/cafebox
```

El formato es `mysql://USUARIO:CONTRASENA@HOST:PUERTO/BASE`. Si tu usuario no es
`root` o tu MySQL no está en el puerto 3306, cambia esa línea. Si la contraseña
trae `@`, `:`, `/` o `#`, escríbela codificada: `@` es `%40`.

Para comprobar que MySQL responde:

```bash
mysql -u root -p -e "SELECT VERSION();"
```

## Otros comandos

| Comando                 | Qué hace                                                        |
| ----------------------- | --------------------------------------------------------------- |
| `npm run bd:estudio`    | Prisma Studio: ver y editar los datos en el navegador.          |
| `npm run bd:reiniciar`  | Borra la base y vuelve a aplicar todo. Pide confirmación.       |
| `npm run verificar`     | Revisa los tipos de todo el proyecto.                           |
| `npm run prueba:reglas` | Corre 70 comprobaciones de las reglas, sin base y sin servidor. |

## Variables de entorno

Están todas en `.env.example` con valores de relleno. `.env` no viaja al
repositorio.

| Variable          | Para qué sirve                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `PORT`            | Puerto del servicio. Por defecto 3000.                                                                        |
| `PERSISTENCIA`    | `prisma` o `memoria`.                                                                                         |
| `DATABASE_URL`    | Conexión a MySQL. Sólo se exige con `prisma`.                                                                 |
| `JWT_SECRET`      | Llave con la que se firman las credenciales.                                                                  |
| `JWT_EXPIRES_IN`  | Cuánto dura una credencial. Por defecto 2h.                                                                   |
| `FRONTEND_ORIGIN` | Orígenes que el CORS acepta, separados por coma.                                                              |
| `TZ_NEGOCIO`      | Zona horaria del negocio. Identificador IANA, no el nombre de la ciudad: para Sonora es `America/Hermosillo`. |
| `BCRYPT_COSTO`    | Costo del hash de contraseñas.                                                                                |

## Sin base de datos

Con `PERSISTENCIA=memoria` en el `.env`, el servicio arranca sin MySQL y guarda
todo en memoria. Sirve para probar las reglas en una máquina donde no hay base
instalada. Los datos se van al apagar el proceso.

---

## Cómo está organizado

```
src/
├── dominio/
│   ├── tipos.ts
│   ├── errores.ts
│   ├── calendario.ts
│   ├── generacion.ts
│   ├── puertos.ts
│   └── servicios/
├── infraestructura/
│   ├── prisma/
│   └── memoria/
├── http/
│   ├── rutas/
│   ├── middlewares/
│   ├── documentacion/
│   ├── respuesta.ts
│   └── servidor.ts
├── configuracion.ts
└── composicion.ts
```

`src/dominio/` no importa nada de `infraestructura`, de `@prisma/client` ni de
`express`. Las reglas no saben dónde se guardan los datos ni que existe HTTP:
hablan con interfaces declaradas en `puertos.ts`. Se puede comprobar:

```bash
grep -rn "infraestructura\|@prisma\|express" src/dominio/
```

No devuelve nada.

## Un solo lugar decide la implementación

`src/composicion.ts` es el único archivo del proyecto donde se elige entre
MySQL y memoria:

```ts
const unidad: UnidadDeTrabajo =
  configuracion.persistencia === 'prisma'
    ? crearUnidadPrisma(crearClientePrisma(configuracion.urlBaseDeDatos))
    : crearUnidadEnMemoria();
```

Cambia `PERSISTENCIA` en el `.env`, vuelve a arrancar y ningún servicio de
dominio se enteró.

Cada operación del negocio corre dentro de una transacción: el servicio pide
`unidad.enTransaccion(...)` y recibe los repositorios ya enlazados. Si una regla
falla a la mitad, no queda nada escrito.

---

## Formato uniforme de respuesta

Todo sale por `src/http/respuesta.ts`. Siempre una de estas dos formas:

```json
{ "ok": true, "datos": {} }
```

```json
{ "ok": false, "error": { "codigo": "FUERA_DE_COBERTURA", "mensaje": "Todavía no entregamos en Nogales" } }
```

El `mensaje` viene redactado en lenguaje del usuario, así que el portal lo
muestra tal cual sin traducir códigos técnicos.

## Códigos

| HTTP      | Cuándo                                           | Código                                                                                                                                                              |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 200 / 201 | Operación realizada o recurso creado             | —                                                                                                                                                                   |
| 400       | Petición mal formada o dato inválido             | `VALIDACION`, con `campos`                                                                                                                                          |
| 401       | Sin credencial, vencida o alterada               | `NO_AUTENTICADO`                                                                                                                                                    |
| 403       | Credencial válida, rol o dueño equivocado        | `SIN_PERMISO`                                                                                                                                                       |
| 404       | El recurso no existe                             | `ENTIDAD_NO_ENCONTRADA`                                                                                                                                             |
| 409       | Cualquier regla de negocio que impida algo       | `SUSCRIPCION_DUPLICADA`, `FUERA_DE_COBERTURA`, `STOCK_INSUFICIENTE`, `OMISION_FUERA_DE_TIEMPO`, `LIMITE_OMISIONES`, `CICLO_YA_GENERADO`, `CICLO_EN_CURSO`, y 20 más |
| 500       | Falla inesperada, sin exponer el detalle interno | `ERROR_INTERNO`                                                                                                                                                     |

Toda regla de negocio responde 409 y no hay forma de que escape por otro
código: `ErrorDeRegla` tiene una sola salida en
`src/http/middlewares/manejadorDeErrores.ts`, y ninguna ruta escribe un estado
HTTP a mano.

Un 400 trae el detalle por campo, para que el formulario lo muestre junto al
campo que lo provocó:

```json
{
  "ok": false,
  "error": {
    "codigo": "VALIDACION",
    "mensaje": "Hay datos inválidos en la petición",
    "campos": [
      { "campo": "correo", "mensaje": "Debe ser un correo electrónico válido" }
    ]
  }
}
```

---

## Puntos de entrada

Son 39. Están todos en `/documentacion` con sus cuerpos y respuestas.

### Público

| Método y ruta          | Qué hace                            |
| ---------------------- | ----------------------------------- |
| `POST /usuarios`       | Registro de un cliente.             |
| `POST /sesiones`       | Ingreso. Devuelve la credencial.    |
| `GET /planes`          | Catálogo de planes activos.         |
| `GET /planes/:id`      | Detalle de un plan.                 |
| `GET /zonas-cobertura` | Ciudades donde se entrega.          |
| `GET /salud`           | Comprobar que el servicio responde. |

### Cliente

| Método y ruta                              | Qué hace                                     |
| ------------------------------------------ | -------------------------------------------- |
| `GET /perfil`                              | Datos del cliente.                           |
| `PATCH /perfil`                            | Cambiar dirección y datos de pago.           |
| `POST /suscripciones`                      | Contratar un plan.                           |
| `GET /suscripciones`                       | Las suscripciones del cliente.               |
| `GET /suscripciones/:id`                   | Detalle, con entregas y cobros.              |
| `GET /suscripciones/:id/proximas-entregas` | Calendario estimado.                         |
| `POST /suscripciones/:id/pausas`           | Pausar.                                      |
| `DELETE /suscripciones/:id/pausas`         | Reanudar.                                    |
| `POST /suscripciones/:id/omisiones`        | Saltarse una entrega.                        |
| `POST /suscripciones/:id/cambios-de-plan`  | Pedir un cambio de plan.                     |
| `PATCH /suscripciones/:id`                 | Cambiar dirección, día preferido o cancelar. |
| `GET /entregas`                            | Entregas del cliente.                        |
| `GET /entregas/:id`                        | Detalle de una entrega.                      |
| `GET /cobros`                              | Historial de cobros.                         |
| `POST /cobros/:id/reintentos`              | Reintentar un cobro fallido.                 |

### Administrador

| Método y ruta                           | Qué hace                                   |
| --------------------------------------- | ------------------------------------------ |
| `GET /admin/planes`                     | Todos los planes, incluidos los retirados. |
| `POST /admin/planes`                    | Crear un plan.                             |
| `PATCH /admin/planes/:id`               | Editar o retirar un plan.                  |
| `GET /admin/productos`                  | Inventario.                                |
| `PATCH /admin/productos/:id`            | Ajustar stock o precio.                    |
| `POST /admin/zonas-cobertura`           | Abrir una ciudad.                          |
| `DELETE /admin/zonas-cobertura/:ciudad` | Cerrar una ciudad.                         |
| `POST /admin/ciclos`                    | Generar el ciclo de entregas y sus cobros. |
| `GET /admin/cambios-de-plan`            | Cambios pendientes de revisión.            |
| `PATCH /admin/cambios-de-plan/:id`      | Aprobar o rechazar un cambio.              |
| `GET /admin/reportes/cajas-por-armar`   | Reporte de cajas por armar.                |
| `GET /admin/reportes/tablero`           | Tablero de indicadores.                    |
| `POST /entregas/:id/armados`            | Marcar una entrega como armada.            |
| `POST /entregas/:id/envios`             | Marcar como enviada.                       |
| `POST /entregas/:id/recepciones`        | Marcar como recibida.                      |
| `POST /armados`                         | Armar varias entregas de una vez.          |
| `POST /envios`                          | Enviar varias de una vez.                  |
| `PATCH /cobros/:id`                     | Registrar el resultado de un cobro.        |

## Roles

| Con qué credencial  | `PATCH /admin/productos/:id` responde |
| ------------------- | ------------------------------------- |
| Ninguna             | `401 NO_AUTENTICADO`                  |
| De un cliente       | `403 SIN_PERMISO`                     |
| De un administrador | `200` con el producto actualizado     |

Un cliente tampoco puede ver la suscripción de otro: el servicio compara el
dueño del recurso contra el de la credencial y responde 403. Esconder un botón
en la interfaz no es seguridad; lo que protege es esta comprobación.

---

## Las reglas del negocio

| Regla                                            | Código que devuelve       |
| ------------------------------------------------ | ------------------------- |
| Una sola suscripción vigente por cliente y plan  | `SUSCRIPCION_DUPLICADA`   |
| Sólo se entrega en las ciudades con cobertura    | `FUERA_DE_COBERTURA`      |
| No se contrata un plan sin inventario            | `STOCK_INSUFICIENTE`      |
| Saltarse una entrega requiere 48 horas de aviso  | `OMISION_FUERA_DE_TIEMPO` |
| Como máximo dos omisiones por trimestre          | `LIMITE_OMISIONES`        |
| Un ciclo no se genera dos veces                  | `CICLO_YA_GENERADO`       |
| No se adelanta un ciclo con el anterior en curso | `CICLO_EN_CURSO`          |
| Una entrega no se envía sin su cobro cobrado     | `ENTREGA_SIN_COBRO`       |
| Un cambio de plan pendiente a la vez             | `CAMBIO_PENDIENTE`        |
| Dos cobros fallidos suspenden la suscripción     | se refleja en el estado   |

Son 27 códigos en total, con su mensaje en español, en `src/dominio/errores.ts`.

## Estados

| Entidad        | Estados                                                  |
| -------------- | -------------------------------------------------------- |
| Suscripción    | `ACTIVA`, `PAUSADA`, `SUSPENDIDA`, `CANCELADA`           |
| Entrega        | `PROGRAMADA`, `ARMADA`, `ENVIADA`, `RECIBIDA`, `OMITIDA` |
| Cobro          | `PENDIENTE`, `COBRADO`, `FALLIDO`, `CANCELADO`           |
| Cambio de plan | `PENDIENTE`, `APROBADO`, `RECHAZADO`                     |

Una suscripción pausada no genera entregas. Una suspendida tampoco, pero sí
aparece en el reporte con su motivo, para que nadie quede olvidado. Un cobro
fallido que se reintenta con éxito reactiva la suscripción.

## Cómo se generan las entregas

`src/dominio/generacion.ts` tiene una sola función que decide, por suscripción,
uno de estos resultados:

| Resultado    | Cuándo                                                               |
| ------------ | -------------------------------------------------------------------- |
| `GENERADA`   | Se creó la entrega y su cobro.                                       |
| `YA_EXISTIA` | El ciclo ya se había generado. Repetir la operación no duplica nada. |
| `SALTADA`    | El cliente pidió saltarse esta entrega.                              |
| `SIN_STOCK`  | No hay inventario. Queda reportada, no se pierde.                    |
| `OMITIDA`    | La suscripción está pausada, suspendida o cancelada.                 |

Las fechas se calculan sobre texto `AAAA-MM-DD` con aritmética propia, nunca con
`new Date(texto)`, que interpreta la cadena en UTC y en Sonora adelanta el día.

---

## Seguridad

- Contraseñas con `bcrypt`. La tabla de usuarios guarda el hash, nunca el texto.
- Credenciales JWT firmadas con `JWT_SECRET`, con caducidad.
- Los usuarios viven fuera del dominio: el dominio conoce clientes, no cuentas.
- CORS restringido a los orígenes de `FRONTEND_ORIGIN`. Cualquier otro se
  rechaza.
- Cuerpos limitados a 100 kB.
- Cada petición se registra con su tiempo: `POST /suscripciones 409 12ms`.
- El 500 no expone el detalle interno; sólo queda en la consola del servicio.

---

## La base de datos

Diez tablas definidas en `prisma/schema.prisma`, con nombres en snake_case por
`@map`. Las migraciones están escritas a mano, en SQL, para que se vea qué
hace cada una:

| Migración                             | Qué agrega                                          |
| ------------------------------------- | --------------------------------------------------- |
| `001_crear_tablas_dominio`            | Clientes, productos, planes, zonas y suscripciones. |
| `002_crear_usuarios`                  | Cuentas y roles, separados del dominio.             |
| `003_indices_de_reglas`               | Índices únicos que sostienen las reglas.            |
| `004_ciclos_cobros_y_cambios_de_plan` | Entregas, cobros y cambios de plan.                 |
| `005_restricciones_de_integridad`     | Las restricciones `CHECK`.                          |

Lo que la base refuerza por sí misma: montos y cantidades no negativas, estados
dentro de su lista, fechas coherentes, un cobro por entrega, un ciclo por número
de ciclo en cada suscripción, y las llaves foráneas con su regla de borrado.

### Tres reglas que la base NO refuerza, y por qué

MySQL no tiene índices únicos parciales, que es lo que PostgreSQL usaba para
estas tres:

| Regla                                       | Dónde se aplica ahora                    |
| ------------------------------------------- | ---------------------------------------- |
| Una suscripción vigente por cliente y plan  | En el dominio, dentro de la transacción. |
| Una entrega `PROGRAMADA` por suscripción    | En el dominio, dentro de la transacción. |
| Un cambio de plan pendiente por suscripción | En el dominio, dentro de la transacción. |

Las tres siguen respondiendo 409. El riesgo que queda es acotado y conviene
decirlo: dos peticiones idénticas en el mismo instante podrían colarse las dos,
porque ya no hay una segunda red de seguridad en la base. Con la carga de este
proyecto no ocurre, y la alternativa sería una tabla auxiliar con una llave
única calculada, que se puede agregar sin tocar el dominio.

---

## Datos de arranque

| Cuenta        | Correo               | Contraseña   | Para qué sirve                                             |
| ------------- | -------------------- | ------------ | ---------------------------------------------------------- |
| Administrador | `admin@cafebox.test` | `Admin12345` | Todas las operaciones de backoffice.                       |
| Ana Torres    | `ana@cafebox.test`   | `Demo12345`  | Suscripción con historial y un cambio de plan en revisión. |
| Luis Peña     | `luis@cafebox.test`  | `Demo12345`  | Está en Nogales: rechazo por cobertura.                    |
| Mario Sánchez | `mario@cafebox.test` | `Demo12345`  | Suspendido por cobro fallido.                              |
| Sofía Ramírez | `sofia@cafebox.test` | `Demo12345`  | Pausada por viaje.                                         |

Cobertura: Guaymas y Empalme. Nogales queda fuera a propósito, para demostrar el
rechazo. Productos: Chiapas con stock amplio, Oaxaca con stock 2 para probar la
falta de inventario, y Veracruz. Planes: semanal, quincenal y mensual de
Chiapas, caja de Oaxaca con 5 bolsas, y una caja de temporada retirada.

---

## Demostrar el criterio de terminado

Ingresa como Ana y guarda la credencial:

```bash
CRED=$(curl -s -X POST http://localhost:3000/sesiones \
  -H 'Content-Type: application/json' \
  -d '{"correo":"ana@cafebox.test","contrasena":"Demo12345"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).datos.credencial")
```

Contratar dos veces el mismo plan devuelve `409 SUSCRIPCION_DUPLICADA`:

```bash
curl -i -X POST http://localhost:3000/suscripciones \
  -H "Authorization: Bearer $CRED" -H 'Content-Type: application/json' \
  -d '{"planId":"00000000-0000-4000-8000-000000000041","direccionEntrega":"Calle 1","ciudad":"Guaymas","diaEntregaPreferido":3}'
```

Con la credencial de Luis y `"ciudad":"Nogales"` sale `409 FUERA_DE_COBERTURA`.
Con el plan `...044`, que es el de Oaxaca con stock 2, sale `409
STOCK_INSUFICIENTE`.

Sin credencial, `PATCH /admin/productos/:id` responde 401; con la de Ana, 403.

---

## Qué falta y por qué

- El cobro no toca una pasarela de pago real. `PATCH /cobros/:id` registra el
  resultado que el negocio ya conoce. Integrar Stripe o Conekta no cambiaría el
  modelo: el cobro seguiría siendo un recurso por ciclo con estado.
- La generación de ciclos la lanza el administrador, no un trabajo programado.
  El enunciado lo pide así, y la operación es idempotente, de modo que ponerla
  en un cron después no requiere cambiar nada.
