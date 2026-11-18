import { crearServicioCambiosDePlan } from '../src/dominio/servicios/servicioCambiosDePlan.js';
import { crearServicioCatalogo } from '../src/dominio/servicios/servicioCatalogo.js';
import { crearServicioCiclos } from '../src/dominio/servicios/servicioCiclos.js';
import { crearServicioCobros } from '../src/dominio/servicios/servicioCobros.js';
import { crearServicioSuscripciones } from '../src/dominio/servicios/servicioSuscripciones.js';
import { crearServicioTablero } from '../src/dominio/servicios/servicioTablero.js';
import { ErrorDeRegla } from '../src/dominio/errores.js';
import { fechaDelCiclo, sumarDias } from '../src/dominio/calendario.js';
import type { Identidad } from '../src/dominio/tipos.js';
import { crearUnidadEnMemoria } from '../src/infraestructura/memoria/repositoriosEnMemoria.js';
import { crearGeneradorDeId, crearRelojFijo } from '../src/infraestructura/relojYIds.js';

const HOY = '2026-11-16';
const reloj = crearRelojFijo(HOY);
const ids = crearGeneradorDeId();

let pasadas = 0;
const fallas: string[] = [];

function afirmar(condicion: boolean, descripcion: string): void {
  if (condicion) {
    pasadas += 1;
    console.log(`  ✓ ${descripcion}`);
  } else {
    fallas.push(descripcion);
    console.log(`  ✗ ${descripcion}`);
  }
}

async function afirmaRegla(
  codigoEsperado: string,
  descripcion: string,
  operacion: () => Promise<unknown>,
): Promise<void> {
  try {
    await operacion();
    fallas.push(`${descripcion} (no rechazó nada)`);
    console.log(`  ✗ ${descripcion} — se esperaba 409 ${codigoEsperado} y pasó`);
  } catch (error) {
    if (error instanceof ErrorDeRegla && error.codigo === codigoEsperado) {
      pasadas += 1;
      console.log(`  ✓ ${descripcion} → 409 ${codigoEsperado}`);
    } else {
      const visto = error instanceof ErrorDeRegla ? error.codigo : String(error);
      fallas.push(`${descripcion} (salió ${visto})`);
      console.log(`  ✗ ${descripcion} — se esperaba ${codigoEsperado}, salió ${visto}`);
    }
  }
}

function construir() {
  const unidad = crearUnidadEnMemoria();
  return {
    unidad,
    catalogo: crearServicioCatalogo({ unidad, reloj, ids }),
    suscripciones: crearServicioSuscripciones({ unidad, reloj, ids }),
    ciclos: crearServicioCiclos({ unidad, reloj, ids }),
    cobros: crearServicioCobros({ unidad, reloj }),
    cambios: crearServicioCambiosDePlan({ unidad, reloj }),
    tablero: crearServicioTablero({ unidad, reloj }),
  };
}

const cliente = (clienteId: string): Identidad => ({
  usuarioId: `u-${clienteId}`,
  rol: 'CLIENTE',
  clienteId,
  correo: `${clienteId}@prueba.test`,
});

const ADMIN: Identidad = {
  usuarioId: 'u-admin',
  rol: 'ADMIN',
  clienteId: null,
  correo: 'admin@prueba.test',
};

async function escenario() {
  const mundo = construir();
  const repos = mundo.unidad.repos;

  await repos.zonas.agregar('Guaymas');

  await repos.productos.crear({
    id: 'prod-chiapas',
    nombre: 'Café de Chiapas',
    origen: 'Chiapas',
    gramaje: 340,
    precioUnitario: 185,
    stockDisponible: 50,
    activo: true,
  });
  await repos.productos.crear({
    id: 'prod-escaso',
    nombre: 'Café de Oaxaca',
    origen: 'Oaxaca',
    gramaje: 340,
    precioUnitario: 210,
    stockDisponible: 2,
    activo: true,
  });

  await repos.planes.crear({
    id: 'plan-semanal',
    nombre: 'Caja semanal',
    descripcion: 'Una bolsa cada semana',
    productoId: 'prod-chiapas',
    bolsasPorEntrega: 1,
    precioCiclo: 199,
    frecuencia: 'SEMANAL',
    activo: true,
    retiradoEn: null,
  });
  await repos.planes.crear({
    id: 'plan-mensual',
    nombre: 'Caja mensual',
    descripcion: 'Tres bolsas al mes',
    productoId: 'prod-chiapas',
    bolsasPorEntrega: 3,
    precioCiclo: 529,
    frecuencia: 'MENSUAL',
    activo: true,
    retiradoEn: null,
  });
  await repos.planes.crear({
    id: 'plan-escaso',
    nombre: 'Caja para cafetería',
    descripcion: 'Cinco bolsas cada semana',
    productoId: 'prod-escaso',
    bolsasPorEntrega: 5,
    precioCiclo: 1090,
    frecuencia: 'SEMANAL',
    activo: true,
    retiradoEn: null,
  });
  await repos.planes.crear({
    id: 'plan-retirado',
    nombre: 'Caja de temporada',
    descripcion: 'Ya no se ofrece',
    productoId: 'prod-chiapas',
    bolsasPorEntrega: 1,
    precioCiclo: 150,
    frecuencia: 'SEMANAL',
    activo: false,
    retiradoEn: reloj.ahora(),
  });

  for (const [id, nombre, ciudad] of [
    ['ana', 'Ana Torres', 'Guaymas'],
    ['luis', 'Luis Peña', 'Nogales'],
    ['sofia', 'Sofía Ramírez', 'Guaymas'],
  ] as const) {
    await repos.clientes.crear({
      id,
      nombre,
      ciudad,
      direccion: 'Calle 1',
      telefono: null,
      pagoTitular: nombre,
      pagoUltimos4: '4242',
      creadoEn: reloj.ahora(),
    });
  }

  return mundo;
}

const contratacionBase = {
  direccionEntrega: 'Av. Serdán 455',
  ciudad: 'Guaymas',
  diaEntregaPreferido: 3,
};

async function main(): Promise<void> {
  console.log(`\nReglas de negocio (implementación en memoria, hoy = ${HOY})\n`);

  console.log('Calendario de ciclos');
  {

    afirmar(fechaDelCiclo(HOY, 3, 'SEMANAL', 1) === '2026-11-18', 'el ciclo 1 cae en el día preferido');
    afirmar(fechaDelCiclo(HOY, 3, 'SEMANAL', 2) === '2026-11-25', 'semanal avanza 7 días por ciclo');
    afirmar(fechaDelCiclo(HOY, 3, 'QUINCENAL', 3) === '2026-12-16', 'quincenal avanza 14 días por ciclo');
    afirmar(
      fechaDelCiclo(HOY, 3, 'MENSUAL', 2) === '2026-12-16',
      'mensual avanza un mes y se reacomoda al día preferido',
    );
    afirmar(
      fechaDelCiclo(HOY, 3, 'SEMANAL', 7) === fechaDelCiclo(HOY, 3, 'SEMANAL', 7),
      'la fecha de un ciclo es siempre la misma (función pura)',
    );
  }

  console.log('\nContratación');
  {
    const m = await escenario();

    const { suscripcion, primeraEntrega, cobro } = await m.suscripciones.contratar(
      cliente('ana'),
      { ...contratacionBase, planId: 'plan-semanal' },
    );
    afirmar(suscripcion.estado === 'ACTIVA', 'la suscripción nace ACTIVA');
    afirmar(primeraEntrega?.fechaProgramada === '2026-11-18', 'programa la primera entrega');
    afirmar(cobro?.estado === 'PENDIENTE', 'crea el cobro del primer ciclo como PENDIENTE');
    const stock = await m.unidad.repos.productos.obtener('prod-chiapas');
    afirmar(stock?.stockDisponible === 49, 'reserva el café de la caja');

    await afirmaRegla('SUSCRIPCION_DUPLICADA', 'contratar dos veces el mismo plan', () =>
      m.suscripciones.contratar(cliente('ana'), { ...contratacionBase, planId: 'plan-semanal' }),
    );

    await afirmaRegla('FUERA_DE_COBERTURA', 'contratar desde una ciudad sin cobertura', () =>
      m.suscripciones.contratar(cliente('luis'), {
        ...contratacionBase,
        ciudad: 'Nogales',
        planId: 'plan-semanal',
      }),
    );

    await afirmaRegla('STOCK_INSUFICIENTE', 'contratar un plan sin café suficiente', () =>
      m.suscripciones.contratar(cliente('sofia'), { ...contratacionBase, planId: 'plan-escaso' }),
    );

    await afirmaRegla('PLAN_RETIRADO', 'contratar un plan retirado', () =>
      m.suscripciones.contratar(cliente('sofia'), { ...contratacionBase, planId: 'plan-retirado' }),
    );

    const deSofia = await m.unidad.repos.suscripciones.listar({ clienteId: 'sofia' });
    afirmar(deSofia.length === 0, 'un rechazo no deja la suscripción a medias (transacción)');
    const escaso = await m.unidad.repos.productos.obtener('prod-escaso');
    afirmar(escaso?.stockDisponible === 2, 'un rechazo no consume inventario');
  }

  console.log('\nGeneración de las entregas del ciclo');
  {
    const m = await escenario();
    const { suscripcion } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });

    const conCicloEnCurso = await m.ciclos.generarSiguienteCiclo();
    afirmar(
      conCicloEnCurso.generadas === 0 &&
        conCicloEnCurso.omitidas.some((o) => o.motivo === 'CICLO_EN_CURSO'),
      'no adelanta un ciclo mientras el anterior no sale',
    );

    const enCurso = (await m.unidad.repos.entregas.obtenerProgramada(suscripcion.id))!;
    const cobroEnCurso = (await m.unidad.repos.cobros.obtenerPorCiclo(suscripcion.id, 1))!;
    await m.cobros.registrar(cobroEnCurso.id, 'COBRADO');
    await m.ciclos.avanzarEstado(enCurso.id, 'ARMADA');
    await m.ciclos.avanzarEstado(enCurso.id, 'ENVIADA');

    const primera = await m.ciclos.generarSiguienteCiclo();
    afirmar(primera.generadas === 1, 'genera el siguiente ciclo de la suscripción activa');

    const repetida = await m.ciclos.generarSiguienteCiclo();
    afirmar(repetida.generadas === 0, 'repetir la generación no duplica entregas');

    const entregas = await m.unidad.repos.entregas.listar({ suscripcionId: suscripcion.id });
    const ciclos = entregas.map((e) => e.ciclo);
    afirmar(
      new Set(ciclos).size === ciclos.length,
      'no hay dos entregas para el mismo ciclo (no duplica)',
    );
    afirmar(
      ciclos.sort((a, b) => a - b).every((ciclo, i) => ciclo === i + 1),
      'los ciclos van consecutivos (no se salta ninguno)',
    );
    afirmar(
      entregas.filter((e) => e.estado === 'PROGRAMADA').length === 1,
      'sólo hay una entrega PROGRAMADA a la vez',
    );
  }

  console.log('\nPausas y saltos');
  {
    const m = await escenario();
    const { suscripcion } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });

    const antes = (await m.unidad.repos.productos.obtener('prod-chiapas'))!.stockDisponible;
    const salto = await m.suscripciones.saltarProximaEntrega(cliente('ana'), suscripcion.id);
    afirmar(salto.cicloSaltado === 1, 'salta el ciclo que estaba programado');

    const devuelto = (await m.unidad.repos.productos.obtener('prod-chiapas'))!.stockDisponible;
    afirmar(devuelto === antes + 1, 'devuelve el café al inventario');

    const cobroSaltado = await m.unidad.repos.cobros.obtenerPorCiclo(suscripcion.id, 1);
    afirmar(cobroSaltado?.estado === 'CANCELADO', 'no cobra el ciclo saltado');

    const entregaSaltada = await m.unidad.repos.entregas.obtenerPorCiclo(suscripcion.id, 1);
    afirmar(entregaSaltada?.estado === 'SALTADA', 'el ciclo queda registrado como SALTADA');

    await m.ciclos.generarSiguienteCiclo();
    await m.suscripciones.saltarProximaEntrega(cliente('ana'), suscripcion.id);
    await m.ciclos.generarSiguienteCiclo();

    await afirmaRegla('LIMITE_OMISIONES', 'saltarse una tercera entrega seguida', () =>
      m.suscripciones.saltarProximaEntrega(cliente('ana'), suscripcion.id),
    );
  }

  {
    const m = await escenario();

    const { suscripcion } = await m.suscripciones.contratar(cliente('sofia'), {
      ...contratacionBase,
      planId: 'plan-semanal',
      diaEntregaPreferido: 2,
    });
    await afirmaRegla('OMISION_FUERA_DE_TIEMPO', 'saltarse una entrega con menos de 2 días', () =>
      m.suscripciones.saltarProximaEntrega(cliente('sofia'), suscripcion.id),
    );
  }

  {
    const m = await escenario();
    const { suscripcion } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });

    await m.suscripciones.pausar(
      cliente('ana'),
      suscripcion.id,
      sumarDias(HOY, 1),
      sumarDias(HOY, 30),
    );
    const pausada = await m.unidad.repos.suscripciones.obtener(suscripcion.id);
    afirmar(pausada?.estado === 'PAUSADA', 'la pausa cambia el estado a PAUSADA');

    const resumen = await m.ciclos.generarSiguienteCiclo();
    afirmar(resumen.saltadasPorPausa >= 1, 'la generación no arma cajas dentro de la pausa');

    const cobros = await m.unidad.repos.cobros.listar({ suscripcionId: suscripcion.id });
    afirmar(
      cobros.every((c) => c.estado !== 'PENDIENTE' || c.ciclo === 1),
      'no cobra los ciclos de la pausa',
    );

    await afirmaRegla('SUSCRIPCION_PAUSADA', 'pausar una suscripción ya pausada', () =>
      m.suscripciones.pausar(cliente('ana'), suscripcion.id, sumarDias(HOY, 2), sumarDias(HOY, 9)),
    );

    await afirmaRegla('PAUSA_INVALIDA', 'pausar con fechas al revés', async () => {
      await m.suscripciones.reanudar(cliente('ana'), suscripcion.id);
      return m.suscripciones.pausar(
        cliente('ana'),
        suscripcion.id,
        sumarDias(HOY, 9),
        sumarDias(HOY, 2),
      );
    });
  }

  console.log('\nCobros y suspensión');
  {
    const m = await escenario();
    const { suscripcion, cobro } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });

    const fallido = await m.cobros.registrar(cobro!.id, 'FALLIDO', 'Tarjeta rechazada');
    afirmar(fallido.suscripcionSuspendida, 'un cobro fallido suspende la suscripción');

    const suspendida = await m.unidad.repos.suscripciones.obtener(suscripcion.id);
    afirmar(suspendida?.estado === 'SUSPENDIDA', 'la suscripción queda SUSPENDIDA');

    const resumen = await m.ciclos.generarSiguienteCiclo();
    afirmar(
      resumen.omitidas.some((o) => o.motivo === 'SUSPENDIDA'),
      'no se generan entregas de una suscripción suspendida',
    );

    await afirmaRegla('SUSCRIPCION_SUSPENDIDA', 'saltar una entrega estando suspendido', () =>
      m.suscripciones.saltarProximaEntrega(cliente('ana'), suscripcion.id),
    );

    const reintento = await m.cobros.reintentar(cliente('ana'), cobro!.id);
    afirmar(reintento.suscripcionReactivada, 'el reintento reactiva la suscripción');

    await afirmaRegla('COBRO_NO_FALLIDO', 'reintentar un cobro que no falló', () =>
      m.cobros.reintentar(cliente('ana'), cobro!.id),
    );

    await m.cobros.registrar(cobro!.id, 'COBRADO');
    await afirmaRegla('COBRO_YA_REGISTRADO', 'registrar dos veces el cobro de un ciclo', () =>
      m.cobros.registrar(cobro!.id, 'COBRADO'),
    );
  }

  console.log('\nEstados de la entrega');
  {
    const m = await escenario();
    const { primeraEntrega, cobro } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });

    await afirmaRegla('TRANSICION_INVALIDA', 'enviar una caja que no se ha armado', () =>
      m.ciclos.avanzarEstado(primeraEntrega!.id, 'ENVIADA'),
    );

    await m.ciclos.avanzarEstado(primeraEntrega!.id, 'ARMADA');
    await afirmaRegla('ENTREGA_SIN_COBRO', 'enviar una caja de un ciclo sin cobrar', () =>
      m.ciclos.avanzarEstado(primeraEntrega!.id, 'ENVIADA'),
    );

    await m.cobros.registrar(cobro!.id, 'COBRADO');
    const enviada = await m.ciclos.avanzarEstado(primeraEntrega!.id, 'ENVIADA');
    afirmar(enviada.estado === 'ENVIADA' && enviada.enviadaEn !== null, 'registra el envío con su fecha');

    const entregada = await m.ciclos.avanzarEstado(primeraEntrega!.id, 'ENTREGADA');
    afirmar(entregada.estado === 'ENTREGADA', 'registra la entrega');

    await afirmaRegla('TRANSICION_INVALIDA', 'mover una entrega ya ENTREGADA', () =>
      m.ciclos.avanzarEstado(primeraEntrega!.id, 'ENVIADA'),
    );
  }

  console.log('\nCambio de plan');
  {
    const m = await escenario();
    const { suscripcion } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });

    const solicitud = await m.suscripciones.solicitarCambioDePlan(
      cliente('ana'),
      suscripcion.id,
      'plan-mensual',
    );
    afirmar(solicitud.aplicaDesdeElCiclo === 2, 'el cambio aplica desde el siguiente ciclo');
    afirmar(solicitud.pagaraPorCiclo === 529, 'informa cuánto pagará a partir de ahí');

    await afirmaRegla('CAMBIO_YA_SOLICITADO', 'pedir dos cambios de plan a la vez', () =>
      m.suscripciones.solicitarCambioDePlan(cliente('ana'), suscripcion.id, 'plan-mensual'),
    );

    await afirmaRegla('PLAN_IGUAL', 'pedir cambio al mismo plan', async () => {
      await m.cambios.resolver(solicitud.cambio.id, 'RECHAZADO');
      return m.suscripciones.solicitarCambioDePlan(cliente('ana'), suscripcion.id, 'plan-semanal');
    });

    const segunda = await m.suscripciones.solicitarCambioDePlan(
      cliente('ana'),
      suscripcion.id,
      'plan-mensual',
    );
    await afirmaRegla('CICLO_YA_PASADO', 'aplicar el cambio a un ciclo ya generado', () =>
      m.cambios.resolver(segunda.cambio.id, 'CONFIRMADO', 1),
    );

    const confirmado = await m.cambios.resolver(segunda.cambio.id, 'CONFIRMADO');
    afirmar(confirmado.suscripcion.planId === 'plan-mensual', 'al confirmar cambia el plan');

    const entregaVieja = await m.unidad.repos.entregas.obtenerPorCiclo(suscripcion.id, 1);
    afirmar(
      entregaVieja?.planId === 'plan-semanal',
      'la entrega ya generada conserva el plan con el que se armó',
    );

    const historial = await m.unidad.repos.cambiosDePlan.listar({ suscripcionId: suscripcion.id });
    afirmar(historial.length === 2, 'queda registrado el historial de cambios');

    await afirmaRegla('CAMBIO_YA_RESUELTO', 'resolver dos veces el mismo cambio', () =>
      m.cambios.resolver(segunda.cambio.id, 'CONFIRMADO'),
    );
  }

  console.log('\nCancelación');
  {
    const m = await escenario();
    const { suscripcion, cobro } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });

    await m.cobros.registrar(cobro!.id, 'COBRADO');
    const { ultimaEntrega } = await m.suscripciones.cancelar(cliente('ana'), suscripcion.id);
    afirmar(ultimaEntrega?.ciclo === 1, 'respeta la entrega del ciclo ya pagado y dice cuál es la última');
    afirmar(ultimaEntrega?.estado === 'PROGRAMADA', 'esa entrega sigue en pie');

    await afirmaRegla('SUSCRIPCION_CANCELADA', 'cancelar dos veces', () =>
      m.suscripciones.cancelar(cliente('ana'), suscripcion.id),
    );

    const resumen = await m.ciclos.generarSiguienteCiclo();
    afirmar(
      resumen.generadas === 0,
      'una suscripción cancelada no vuelve a generar entregas',
    );

    const nueva = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });
    afirmar(nueva.suscripcion.estado === 'ACTIVA', 'después de cancelar se puede volver a contratar');
  }

  {
    const m = await escenario();
    const { suscripcion } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });
    const antes = (await m.unidad.repos.productos.obtener('prod-chiapas'))!.stockDisponible;
    await m.suscripciones.cancelar(cliente('ana'), suscripcion.id);
    const despues = (await m.unidad.repos.productos.obtener('prod-chiapas'))!.stockDisponible;
    afirmar(despues === antes + 1, 'cancelar sin haber pagado libera el café de esa caja');
  }

  console.log('\nControl de acceso (lo decide el dominio, no la pantalla)');
  {
    const m = await escenario();
    const { suscripcion } = await m.suscripciones.contratar(cliente('ana'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });

    try {
      await m.suscripciones.obtenerDetalle(cliente('sofia'), suscripcion.id);
      fallas.push('otro cliente no debería poder ver la suscripción');
      console.log('  ✗ otro cliente puede ver una suscripción ajena');
    } catch (error) {
      afirmar(
        (error as Error).name === 'ErrorSinPermiso',
        'otro cliente no puede ver una suscripción ajena (403)',
      );
    }

    const comoAdmin = await m.suscripciones.obtenerDetalle(ADMIN, suscripcion.id);
    afirmar(comoAdmin.id === suscripcion.id, 'el administrador sí puede verla');

    try {
      await m.suscripciones.cancelar(ADMIN, suscripcion.id);
      fallas.push('el administrador no debería poder cancelar la de un cliente');
      console.log('  ✗ el administrador canceló una suscripción ajena');
    } catch (error) {
      afirmar(
        (error as Error).name === 'ErrorSinPermiso',
        'el administrador puede ver pero no cancelar la de un cliente (403)',
      );
    }

    const listaDeAna = await m.suscripciones.listar(cliente('ana'));
    const listaDeSofia = await m.suscripciones.listar(cliente('sofia'));
    afirmar(listaDeAna.length === 1, 'el cliente ve las suyas');
    afirmar(listaDeSofia.length === 0, 'el cliente no ve las de otros');
  }

  console.log('\nReportes');
  {
    const m = await escenario();
    await m.suscripciones.contratar(cliente('ana'), { ...contratacionBase, planId: 'plan-semanal' });
    await m.suscripciones.contratar(cliente('sofia'), {
      ...contratacionBase,
      planId: 'plan-semanal',
    });
    await m.suscripciones.contratar(cliente('sofia'), {
      ...contratacionBase,
      planId: 'plan-mensual',
    });

    const reporte = await m.ciclos.cajasPorArmar('2026-11-18');
    afirmar(reporte.totalCajas === 3, 'cuenta las cajas que hay que armar para una fecha');
    const semanal = reporte.renglones.find((r) => r.planId === 'plan-semanal');
    afirmar(semanal?.cajas === 2, 'agrupa las cajas por plan');
    afirmar(
      reporte.renglones.find((r) => r.planId === 'plan-mensual')?.bolsas === 3,
      'suma las bolsas de cada plan',
    );

    const tablero = await m.tablero.resumen();
    afirmar(tablero.suscriptores.activos === 3, 'el tablero cuenta los suscriptores activos');
    afirmar(tablero.entregas.pendientesDeArmar === 3, 'el tablero cuenta las entregas por armar');
    afirmar(
      tablero.dinero.ingresoRecurrenteMensual > 0,
      'el tablero calcula el ingreso recurrente mensual',
    );
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (fallas.length === 0) {
    console.log(`Todas las comprobaciones pasaron: ${pasadas}.\n`);
    process.exit(0);
  }
  console.log(`${pasadas} pasaron, ${fallas.length} fallaron:\n`);
  for (const falla of fallas) console.log(`  - ${falla}`);
  console.log('');
  process.exit(1);
}

main().catch((error) => {
  console.error('\nLa prueba se interrumpió:', error);
  process.exit(1);
});
