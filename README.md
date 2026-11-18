# CafeBox — Avance 3

Proyecto final de Tópico de Aplicaciones Web, plan 2023. Proyecto 6:
suscripciones de café de especialidad con entregas recurrentes.

Este avance entrega **el portal del cliente**: la aplicación con la que el
cliente compara planes, se suscribe y administra lo que ya contrató. El servicio
que guarda los datos y aplica las reglas es el del avance 2, incluido aquí
porque el portal no funciona sin él.

|                   |                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------ |
| Repositorio       | https://github.com/negx02/Proyecto_final-CafeBox                                     |
| Capturas y video  | https://drive.google.com/drive/folders/172OoP9Q_X3FR2z50aqw-ZY-9mrIjceNW?usp=sharing |
| Rama del servicio | `feat-servicio`                                                                      |
| Rama del portal   | `feat-storefront`                                                                    |

---

## Qué hay en esta carpeta

```
Avance3/
├── Backend - CafeBox/
└── Frontend - CafeBox/
```

| Carpeta              | Qué es                                                                    | Su documentación               |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| `Backend - CafeBox`  | Servicio HTTP. Express, Prisma, MySQL. Aplica todas las reglas.           | `Backend - CafeBox/README.md`  |
| `Frontend - CafeBox` | Portal del cliente. React, Vite, axios. No guarda datos ni aplica reglas. | `Frontend - CafeBox/README.md` |

Cada carpeta tiene su README con el detalle: puntos de entrada, reglas, cuentas
de prueba, estructura interna y qué falta en cada una. Lo que sigue aquí es lo
que vale para el proyecto completo.

---

## Capturas y video

Los dos están en la carpeta de Drive de arriba. No viajan en el repositorio,
para no cargarlo con imágenes.

| Archivo en Drive     | Qué muestra                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `01-cargando`        | Pantalla pidiendo datos, con el esqueleto del contenido.                  |
| `02-con-informacion` | Mis suscripciones de Ana, con su historial de entregas y cobros.          |
| `03-vacia`           | Mis suscripciones de una cuenta recién creada, con la salida al catálogo. |
| `04-error`           | El portal cuando el servicio no contesta, con el botón de reintentar.     |
| `video-demostracion` | Recorrido completo, de 5 a 10 minutos.                                    |

Cómo se provocó cada una, por si hay que repetirlas:

| Situación       | Cómo provocarla                                               |
| --------------- | ------------------------------------------------------------- |
| Cargando        | DevTools, pestaña Network, throttling en Slow 3G, y recargar. |
| Con información | Entrar como `ana@cafebox.test` y abrir Mis suscripciones.     |
| Vacía           | Registrar una cuenta nueva y abrir Mis suscripciones.         |
| Con error       | Apagar el backend con Ctrl+C y recargar la pantalla.          |

El video recorre, en este orden: las dos terminales arrancando, el registro y el
ingreso, el catálogo, contratar un plan, el rechazo por cobertura con una
dirección en Nogales, la suscripción de Ana con su historial, la pausa, el
cambio de plan, la suspensión por cobro fallido de Mario, y los cuatro estados
de pantalla.

---

## Cómo levantarlo

Hacen falta Node 20 o superior y MySQL 8.0.16 o superior. Dos terminales, una
por carpeta.

Primero el backend:

```bash
cd "Backend - CafeBox"
npm install
npm run migrar
npm run sembrar
npm run dev
```

Después el frontend:

```bash
cd "Frontend - CafeBox"
npm install
npm run dev
```

El portal queda en `http://localhost:5173` y el servicio en
`http://localhost:3000`, con su documentación navegable en
`http://localhost:3000/documentacion`.

La conexión a MySQL vive en `Backend - CafeBox/.env`. Si tu usuario no es `root`
o tu contraseña es otra, es la única línea que hay que cambiar:

```
DATABASE_URL=mysql://root:TU_CONTRASENA@localhost:3306/cafebox
```

Los dos `.env` no viajan al repositorio. Lo que sí viaja es `.env.example`, con
los mismos nombres y valores de relleno.

## Cuentas para probar

Las deja `npm run sembrar`. La contraseña de los clientes es `Demo12345` y la
del administrador es `Admin12345`.

| Correo               | Qué se ve con esta cuenta                                                |
| -------------------- | ------------------------------------------------------------------------ |
| `ana@cafebox.test`   | Suscripción con historial y un cambio de plan en revisión.               |
| `sofia@cafebox.test` | Suscripción pausada: el portal explica por qué no llega nada.            |
| `mario@cafebox.test` | Suscripción suspendida por cobro fallido, con el camino para reintentar. |
| `luis@cafebox.test`  | Está en Nogales: al suscribirse sale el rechazo por cobertura.           |
| `admin@cafebox.test` | Operaciones de backoffice, por ahora sólo por HTTP.                      |

Se entrega en Guaymas y Empalme. Nogales queda fuera a propósito, para que el
rechazo por cobertura se pueda demostrar.

---

## Dónde se cumple cada requerimiento del avance 3

| Requerimiento                                            | Dónde                                             |
| -------------------------------------------------------- | ------------------------------------------------- |
| Catálogo y detalle de planes                             | `Frontend/src/caracteristicas/planes/`            |
| Contratar una suscripción                                | `planes/PantallaSuscribirse.tsx`                  |
| Ver, pausar, reanudar, saltar y cancelar                 | `caracteristicas/suscripciones/`                  |
| Pedir un cambio de plan                                  | `suscripciones/DialogoCambioDePlan.tsx`           |
| Calendario de entregas                                   | `caracteristicas/entregas/`                       |
| Historial de cobros y reintento                          | `caracteristicas/cobros/`                         |
| Perfil, dirección y datos de pago                        | `caracteristicas/perfil/`                         |
| Registro, ingreso y sesión                               | `Frontend/src/sesion/`                            |
| Rutas protegidas que regresan al destino                 | `sesion/RutaProtegida.tsx`                        |
| Las cuatro situaciones de cada pantalla                  | `src/api/consulta.ts` y `componentes/Estados.tsx` |
| Un solo lugar habla con la red                           | `src/api/cliente.ts`                              |
| Navegación sin recargar, detalle con su propia dirección | `src/App.tsx`                                     |
| Encabezado y pie comunes                                 | `componentes/Disposicion.tsx`                     |
| Funciona en teléfono                                     | `tailwind.config.js` y cada pantalla              |

---

## Preguntas que suelen hacerse

**¿Dónde se cambia entre base de datos y memoria?**
En `Backend - CafeBox/src/composicion.ts`, en una sola expresión. Se controla con
`PERSISTENCIA` en el `.env`, que acepta `prisma` o `memoria`. Ningún servicio de
dominio cambia, y con `memoria` el servicio arranca sin MySQL instalado.

**¿Cómo se sabe que el dominio no depende de la infraestructura?**
Porque no la importa. Esto no devuelve nada:

```bash
grep -rn "infraestructura\|@prisma\|express" "Backend - CafeBox/src/dominio/"
```

**¿Por qué todas las reglas responden 409?**
Porque un 409 es exactamente eso: la petición está bien formada, pero el estado
actual del negocio no la permite. `ErrorDeRegla` tiene una sola salida en
`manejadorDeErrores.ts` y ninguna ruta escribe un estado HTTP a mano, así que
ninguna regla puede escapar por otro código. Son 27 reglas con su propio código
y su mensaje en español.

**¿Y el 400, entonces?**
Es para los datos mal formados: un correo sin arroba, una contraseña corta, un
día de la semana fuera de rango. Lo revisa `zod` antes de que la petición llegue
al dominio, y la respuesta trae el detalle por campo para que el formulario lo
muestre junto al campo que lo provocó.

**¿Dónde se valida, en el portal o en el servicio?**
En los dos, y a propósito. El portal valida antes de enviar, porque el servicio
no es quien debe decirle al usuario que dejó un campo vacío. El servicio valida
de nuevo todo lo que recibe, porque el portal no es una fuente confiable: quien
quiera puede llamar al servicio con `curl`.

**¿Esconder un botón protege algo?**
No. Lo que protege es el control de acceso del servicio. Si alguien escribe a
mano la dirección de la suscripción de otro cliente, el servicio responde 403 y
el portal muestra "esta suscripción no es tuya" — no porque el portal lo haya
comprobado, sino porque el servicio se lo negó.

**¿Por qué Prisma y no SQL a mano?**
Por el cliente con tipos: si una consulta pide una columna que no existe, el
proyecto no compila. Las migraciones, en cambio, sí están escritas a mano en
SQL, porque las restricciones `CHECK` y los índices de las reglas no se pueden
expresar en el esquema de Prisma, y porque así se ve qué hace cada una.

**¿Por qué axios y no `fetch`?**
Por los interceptores. La credencial se adjunta en un solo lugar, el sobre
`{ ok, datos }` se desenvuelve en un solo lugar, y el 401 cierra la sesión en un
solo lugar. Ninguna pantalla importa axios: se comprueba con
`grep -rn "axios" src/`, que sólo encuentra `src/api/cliente.ts`.

**¿Por qué `TZ_NEGOCIO=America/Hermosillo` si el negocio entrega en Guaymas?**
Porque es el identificador IANA de la zona horaria de Sonora, no el nombre de la
ciudad del negocio. `America/Guaymas` no existe en la base de datos de zonas
horarias, y ponerlo impide que el servicio arranque. Guaymas y Empalme usan esa
zona.

**¿Por qué el código no tiene comentarios?**
Es una decisión del equipo: los nombres de archivos, funciones y variables
cargan la explicación, y lo que necesita contexto está en estos README, donde no
se desactualiza al editar una línea. Los tipos hacen el resto.

**¿Dónde está el panel del administrador?**
No es parte de este avance. El servicio ya expone sus puntos de entrada en
`/admin/...`, probados desde `/documentacion`, pero el portal de este avance es
sólo el del cliente.

**¿El cobro usa una pasarela real?**
No. El portal guarda el titular y los últimos cuatro dígitos, que es lo que el
cliente necesita para identificar su tarjeta, y el resultado del cobro lo
registra el negocio. Integrar Stripe o Conekta no cambiaría el modelo ni
ninguna pantalla: el cobro seguiría siendo un recurso por ciclo con estado.

**¿Qué pasa si no tengo MySQL instalado?**
Pon `PERSISTENCIA=memoria` en `Backend - CafeBox/.env` y el servicio arranca sin
base. Los datos se van al apagar el proceso, pero todas las reglas y todas las
pantallas funcionan igual. También corre `npm run prueba:reglas`, que ejecuta 70
comprobaciones de las reglas sin base y sin servidor.

---

## Equipo

Proyecto desarrollado por un equipo de cuatro integrantes para la materia Tópico
de Aplicaciones Web, plan 2023.
