import { fechaDelCiclo, fechaEnRango } from './calendario.js';
import type { GeneradorDeId, Reloj, Repositorios } from './puertos.js';
import type { Cobro, Entrega, Plan, Suscripcion } from './tipos.js';

export type ResultadoGeneracion =
  | { tipo: 'GENERADA'; entrega: Entrega; cobro: Cobro }
  | { tipo: 'SALTADA'; entrega: Entrega; motivo: 'PAUSA' | 'SALTO_DEL_CLIENTE' }
  | { tipo: 'YA_EXISTIA'; entrega: Entrega }
  | { tipo: 'SIN_STOCK'; faltan: number }
  | { tipo: 'OMITIDA'; motivo: 'SUSPENDIDA' | 'CANCELADA' | 'CICLO_EN_CURSO' };

export async function generarCiclo(
  repos: Repositorios,
  deps: { reloj: Reloj; ids: GeneradorDeId },
  suscripcion: Suscripcion,
  plan: Plan,
  ciclo: number,
): Promise<ResultadoGeneracion> {
  const { reloj, ids } = deps;

  if (suscripcion.estado === 'CANCELADA') return { tipo: 'OMITIDA', motivo: 'CANCELADA' };
  if (suscripcion.estado === 'SUSPENDIDA') return { tipo: 'OMITIDA', motivo: 'SUSPENDIDA' };

  const yaExiste = await repos.entregas.obtenerPorCiclo(suscripcion.id, ciclo);
  if (yaExiste) return { tipo: 'YA_EXISTIA', entrega: yaExiste };

  const enCurso = await repos.entregas.obtenerProgramada(suscripcion.id);
  if (enCurso) return { tipo: 'OMITIDA', motivo: 'CICLO_EN_CURSO' };

  const fechaProgramada = fechaDelCiclo(
    suscripcion.fechaInicio,
    suscripcion.diaEntregaPreferido,
    plan.frecuencia,
    ciclo,
  );

  const salto = await repos.suscripciones.obtenerSalto(suscripcion.id, ciclo);
  if (salto) {
    const entrega = await registrarSaltada(
      repos,
      deps,
      suscripcion,
      plan,
      ciclo,
      fechaProgramada,
      'SALTO_DEL_CLIENTE',
    );
    return { tipo: 'SALTADA', entrega, motivo: 'SALTO_DEL_CLIENTE' };
  }

  const pausas = await repos.suscripciones.listarPausas(suscripcion.id);
  const enPausa = pausas.some((p) => fechaEnRango(fechaProgramada, p.desde, p.hasta));
  if (enPausa) {
    const entrega = await registrarSaltada(
      repos,
      deps,
      suscripcion,
      plan,
      ciclo,
      fechaProgramada,
      'PAUSA',
    );
    return { tipo: 'SALTADA', entrega, motivo: 'PAUSA' };
  }

  const producto = await repos.productos.obtener(plan.productoId);
  const stock = producto?.stockDisponible ?? 0;
  if (stock < plan.bolsasPorEntrega) {
    return { tipo: 'SIN_STOCK', faltan: plan.bolsasPorEntrega - stock };
  }
  await repos.productos.actualizarStock(plan.productoId, stock - plan.bolsasPorEntrega);

  const entrega: Entrega = {
    id: ids.nuevo(),
    suscripcionId: suscripcion.id,
    planId: plan.id,
    ciclo,
    fechaProgramada,
    estado: 'PROGRAMADA',
    bolsas: plan.bolsasPorEntrega,
    motivoSalto: null,
    armadaEn: null,
    enviadaEn: null,
    entregadaEn: null,
    creadoEn: reloj.ahora(),
  };
  await repos.entregas.crear(entrega);

  const cobro: Cobro = {
    id: ids.nuevo(),
    suscripcionId: suscripcion.id,
    entregaId: entrega.id,
    ciclo,
    monto: plan.precioCiclo,
    estado: 'PENDIENTE',
    fecha: fechaProgramada,
    motivoFallo: null,
    creadoEn: reloj.ahora(),
  };
  await repos.cobros.crear(cobro);

  await repos.suscripciones.actualizar({
    ...suscripcion,
    ciclosGenerados: Math.max(suscripcion.ciclosGenerados, ciclo),
  });

  return { tipo: 'GENERADA', entrega, cobro };
}

async function registrarSaltada(
  repos: Repositorios,
  deps: { reloj: Reloj; ids: GeneradorDeId },
  suscripcion: Suscripcion,
  plan: Plan,
  ciclo: number,
  fechaProgramada: string,
  motivo: 'PAUSA' | 'SALTO_DEL_CLIENTE',
): Promise<Entrega> {
  const entrega: Entrega = {
    id: deps.ids.nuevo(),
    suscripcionId: suscripcion.id,
    planId: plan.id,
    ciclo,
    fechaProgramada,
    estado: 'SALTADA',
    bolsas: 0,
    motivoSalto: motivo,
    armadaEn: null,
    enviadaEn: null,
    entregadaEn: null,
    creadoEn: deps.reloj.ahora(),
  };
  await repos.entregas.crear(entrega);
  await repos.suscripciones.actualizar({
    ...suscripcion,
    ciclosGenerados: Math.max(suscripcion.ciclosGenerados, ciclo),
  });
  return entrega;
}

export async function liberarEntrega(
  repos: Repositorios,
  entrega: Entrega,
  motivo: string,
  ahora: string,
): Promise<void> {
  if (entrega.bolsas > 0) {
    const plan = await repos.planes.obtener(entrega.planId);
    if (plan) {
      const producto = await repos.productos.obtener(plan.productoId);
      if (producto) {
        await repos.productos.actualizarStock(
          producto.id,
          producto.stockDisponible + entrega.bolsas,
        );
      }
    }
  }

  await repos.entregas.actualizar({
    ...entrega,
    estado: 'SALTADA',
    bolsas: 0,
    motivoSalto: motivo,
  });

  const cobro = await repos.cobros.obtenerPorCiclo(entrega.suscripcionId, entrega.ciclo);
  if (cobro && cobro.estado === 'PENDIENTE') {
    await repos.cobros.actualizar({ ...cobro, estado: 'CANCELADO', motivoFallo: motivo, fecha: cobro.fecha });
  }
  void ahora;
}
