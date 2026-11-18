# CafeBox — Frontend

Portal del cliente de CafeBox. Es donde el cliente compara planes, se suscribe y
administra lo que ya contrató. No guarda datos ni aplica reglas: todo lo pide al
backend por HTTP.

React 18 · TypeScript · Vite · React Router · Tailwind CSS · axios

Corre en `http://localhost:5173`.

---

## Cómo arrancarlo

El backend tiene que estar corriendo primero, en `http://localhost:3000`.

```bash
npm install
npm run dev
```

La dirección del servicio sale de `VITE_DIRECCION_SERVICIO`, en `.env.local`:

```
VITE_DIRECCION_SERVICIO=http://localhost:3000
```

Si el backend corre en otro puerto o en otra máquina, cambia esa línea y vuelve
a arrancar. Vite lee las variables al arrancar, no en caliente.

## Otros comandos

| Comando                 | Qué hace                                              |
| ----------------------- | ----------------------------------------------------- |
| `npm run construir`     | Compila para producción en `dist/`.                   |
| `npm run previsualizar` | Sirve lo compilado, para revisarlo antes de entregar. |
| `npm run verificar`     | Revisa los tipos de todo el proyecto.                 |

## Cuentas para probar

Las que deja `npm run sembrar` en el backend. La contraseña de todas es
`Demo12345`.

| Correo               | Qué se ve con esta cuenta                                                |
| -------------------- | ------------------------------------------------------------------------ |
| `ana@cafebox.test`   | Suscripción con historial de entregas y un cambio de plan en revisión.   |
| `sofia@cafebox.test` | Suscripción pausada: el portal explica por qué no llega nada.            |
| `mario@cafebox.test` | Suscripción suspendida por cobro fallido, con el camino para reintentar. |
| `luis@cafebox.test`  | Está en Nogales: al suscribirse sale el rechazo por cobertura.           |

---

## Cómo está organizado

Una carpeta por área del negocio, no por tipo de archivo. Agrupar por tipo
obliga a abrir cinco carpetas para tocar una sola pantalla.

```
src/
├── api/
│   ├── cliente.ts
│   ├── errores.ts
│   ├── tipos.ts
│   └── consulta.ts
├── sesion/
│   ├── ContextoSesion.tsx
│   ├── RutaProtegida.tsx
│   ├── PantallaIngreso.tsx
│   └── PantallaRegistro.tsx
├── componentes/
│   ├── Disposicion.tsx
│   ├── Estados.tsx
│   ├── ui.tsx
│   └── formato.ts
├── caracteristicas/
│   ├── inicio/
│   ├── planes/
│   ├── suscripciones/
│   ├── entregas/
│   ├── cobros/
│   └── perfil/
├── App.tsx
└── PantallaNoEncontrada.tsx
```

| Carpeta            | Qué contiene                                                           |
| ------------------ | ---------------------------------------------------------------------- |
| `api/`             | Lo único que habla con la red.                                         |
| `sesion/`          | Quién está dentro, y las rutas que exigen sesión.                      |
| `componentes/`     | Lo compartido: disposición, estados, controles, formato.               |
| `caracteristicas/` | Una carpeta por área: planes, suscripciones, entregas, cobros, perfil. |

## Ninguna pantalla habla directamente con la red

Todas las peticiones pasan por `src/api/cliente.ts`, que crea una instancia de
axios con dos interceptores. Ahí, y sólo ahí, se:

1. Arma la dirección, con `baseURL` desde `VITE_DIRECCION_SERVICIO`.
2. Manda la credencial en cada petición, como `Authorization: Bearer`, sin que
   la pantalla se entere.
3. Interpreta el formato uniforme `{ ok, datos }` y `{ ok, error }`. Las
   pantallas reciben los datos pelados o una excepción tipada; no ven el sobre.
4. Reacciona a la credencial vencida: ante un 401 la borra y avisa al contexto
   de sesión, que cierra la sesión y muestra una franja arriba.

Ninguna pantalla importa axios. Se puede comprobar:

```bash
grep -rn "axios" src/
```

Sólo aparece en `src/api/cliente.ts`. Es la prueba práctica del requisito:
cuando el proyecto pasó de `fetch` a axios, ése fue el único archivo que cambió.

---

## Las cuatro situaciones de cada pantalla

El hook `useConsulta` de `src/api/consulta.ts` obliga a resolver las cuatro. No
hay forma de olvidar una, porque la pantalla no compila sin cubrirlas.

| Situación       | Qué muestra el portal                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Cargando        | Esqueleto del contenido, no un texto suelto, para que no salte el diseño al llegar los datos.            |
| Con información | El contenido.                                                                                            |
| Vacía           | Explica que no hay nada y ofrece la salida: desde "Mis suscripciones" vacía, el botón lleva al catálogo. |
| Con error       | Dice qué pasó, en lenguaje del usuario, y ofrece reintentar.                                             |

### Cómo ver cada estado

| Estado          | Cómo provocarlo                                               |
| --------------- | ------------------------------------------------------------- |
| Cargando        | DevTools, pestaña Network, throttling en Slow 3G, y recargar. |
| Con información | Entrar como Ana y abrir "Mis suscripciones".                  |
| Vacía           | Registrar una cuenta nueva y abrir "Mis suscripciones".       |
| Con error       | Apagar el backend con Ctrl+C y recargar la pantalla.          |

---

## Errores: qué muestra el portal en cada caso

| Qué pasó                                                                         | Cómo responde el portal                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------- | -------.----------------------------------------------------------------------------------------------- |
| El backend no contesta: apagado, sin red, o se agotó el tiempo de espera de 15 s | Pantalla de error que lo dice con todas sus letras y ofrece reintentar. Nunca una pantalla en blanco.                                                                                                                                                                                      |
| 400 validación                                                                   | El mensaje se reparte por campo: cada uno aparece junto al campo que lo provocó, nunca como un aviso general.                                                                                                                                                                                     |
| 409 regla de negocio                                                             | Se muestra el mensaje que manda el servicio, ya redactado en lenguaje del usuario, más la salida que corresponde: "ya tienes esta suscripción" enlaza a esa suscripción, "fuera de cobertura" dice en qué ciudades sí entregamos, "sin inventario" lleva a los otros planes.                                       |
| 401 credencial vencida                                                           | Cierra la sesión y avisa con una franja arriba. No se queda mostrando pantallas vacías.                                                                                                                                                                                      |
| 403 o 404 en un detalle                                                          | Pantalla de "no encontrado" o "esto no es tuyo", con una salida.                                                                                                                                                                                                                                                                                                                                                                                                 |
| 500                                                                              | "El servicio tuvo un problema interno", con reintentar. No se expone el detalle técnico.                                                                                                                                                                                     |

Los formularios además validan antes de enviar: el servicio no es quien debe
decirle al usuario que dejó un campo vacío.

---

## Navegación y sesión

- Navegación sin recargar la página, con la dirección del navegador reflejando
  siempre dónde está el usuario.
- Encabezado y pie comunes en `Disposicion.tsx`, no repetidos en cada pantalla.
- Las pantallas de detalle tienen su propia dirección, `/planes/:id`,
  `/suscripciones/:id`, `/entregas/:id`, así que el enlace se puede copiar y
  compartir.
- Las pantallas con sesión redirigen a entrar y regresan al destino: si alguien
  abre `/suscripciones/abc` sin sesión, entra y cae justo ahí.

Esconder un botón no es seguridad. Lo que protege es el control de acceso del
backend; la interfaz sólo acomoda lo que le corresponde ver a cada usuario. Si
alguien escribe a mano la dirección de la suscripción de otro cliente, el
backend responde 403 y el portal muestra "esta suscripción no es tuya" — no
porque el portal lo haya comprobado, sino porque el backend se lo negó.

---

## Presentación

- Funciona en la pantalla de un teléfono: una sola columna, menú plegable,
  diálogos que suben desde abajo.
- Paleta y tipografía en `tailwind.config.js`, con los colores nombrados por lo
  que son, `cafe`, `crema`, `ambar`, para que una pantalla nueva use la misma
  escala.
- Sin fuentes externas: el portal no depende de la red para verse bien.
- El foco del teclado siempre se ve, los diálogos cierran con Escape, los
  mensajes de error usan `role="alert"` y los campos `aria-invalid` con
  `aria-describedby`.

---

## Qué falta y por qué

- El panel administrativo no está aquí. Es el avance 4. El backend ya expone sus
  puntos de entrada en `/admin/...`, pero este portal es sólo el storefront,
  como pide el avance 3.
- No hay cobro con tarjeta real. El portal guarda el titular y los últimos
  cuatro dígitos, que es lo que el cliente necesita para identificar su tarjeta;
  el cargo lo registra el negocio. Integrar una pasarela no cambiaría ninguna
  pantalla de las que hay.
