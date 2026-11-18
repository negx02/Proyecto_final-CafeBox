import type { Configuracion } from './configuracion.js';
import { crearServicioCambiosDePlan } from './dominio/servicios/servicioCambiosDePlan.js';
import { crearServicioCatalogo } from './dominio/servicios/servicioCatalogo.js';
import { crearServicioCiclos } from './dominio/servicios/servicioCiclos.js';
import { crearServicioCobros } from './dominio/servicios/servicioCobros.js';
import { crearServicioCuentas } from './dominio/servicios/servicioCuentas.js';
import { crearServicioSuscripciones } from './dominio/servicios/servicioSuscripciones.js';
import { crearServicioTablero } from './dominio/servicios/servicioTablero.js';
import type {
  Contrasenas,
  Credenciales,
  GeneradorDeId,
  Reloj,
  UnidadDeTrabajo,
} from './dominio/puertos.js';
import { crearUnidadEnMemoria } from './infraestructura/memoria/repositoriosEnMemoria.js';
import {
  crearClientePrisma,
  crearUnidadPrisma,
} from './infraestructura/prisma/unidadDeTrabajoPrisma.js';
import { crearGeneradorDeId, crearRelojDelSistema } from './infraestructura/relojYIds.js';
import { crearContrasenasBcrypt } from './infraestructura/seguridad/contrasenasBcrypt.js';
import { crearCredencialesJwt } from './infraestructura/seguridad/credencialesJwt.js';

export interface Servicios {
  cuentas: ReturnType<typeof crearServicioCuentas>;
  catalogo: ReturnType<typeof crearServicioCatalogo>;
  suscripciones: ReturnType<typeof crearServicioSuscripciones>;
  ciclos: ReturnType<typeof crearServicioCiclos>;
  cobros: ReturnType<typeof crearServicioCobros>;
  cambiosDePlan: ReturnType<typeof crearServicioCambiosDePlan>;
  tablero: ReturnType<typeof crearServicioTablero>;
}

export interface Aplicacion {
  servicios: Servicios;
  unidad: UnidadDeTrabajo;
  credenciales: Credenciales;
  contrasenas: Contrasenas;
  reloj: Reloj;
  ids: GeneradorDeId;
  configuracion: Configuracion;
  cerrar(): Promise<void>;
}

export function componer(configuracion: Configuracion): Aplicacion {
  const reloj: Reloj = crearRelojDelSistema(configuracion.zonaHoraria);
  const ids: GeneradorDeId = crearGeneradorDeId();
  const contrasenas: Contrasenas = crearContrasenasBcrypt(configuracion.costoBcrypt);
  const credenciales: Credenciales = crearCredencialesJwt(
    configuracion.llaveFirma,
    configuracion.duracionCredencial,
  );

  const unidad: UnidadDeTrabajo =
    configuracion.persistencia === 'prisma'
      ? crearUnidadPrisma(crearClientePrisma(configuracion.urlBaseDeDatos))
      : crearUnidadEnMemoria();

  const servicios: Servicios = {
    cuentas: crearServicioCuentas({ unidad, reloj, ids, contrasenas, credenciales }),
    catalogo: crearServicioCatalogo({ unidad, reloj, ids }),
    suscripciones: crearServicioSuscripciones({ unidad, reloj, ids }),
    ciclos: crearServicioCiclos({ unidad, reloj, ids }),
    cobros: crearServicioCobros({ unidad, reloj }),
    cambiosDePlan: crearServicioCambiosDePlan({ unidad, reloj }),
    tablero: crearServicioTablero({ unidad, reloj }),
  };

  return {
    servicios,
    unidad,
    credenciales,
    contrasenas,
    reloj,
    ids,
    configuracion,
    async cerrar() {
      await unidad.cerrar();
    },
  };
}
