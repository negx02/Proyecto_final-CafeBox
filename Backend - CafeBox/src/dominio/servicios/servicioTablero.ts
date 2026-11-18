import type { Reloj, UnidadDeTrabajo } from '../puertos.js';
import type { FechaISO } from '../tipos.js';

export function crearServicioTablero(deps: { unidad: UnidadDeTrabajo; reloj: Reloj }) {
  const { unidad, reloj } = deps;

  return {
    async resumen(periodo: { desde?: FechaISO; hasta?: FechaISO } = {}) {
      const hoy = reloj.hoy();
      const desde = periodo.desde ?? `${hoy.slice(0, 7)}-01`;
      const hasta = periodo.hasta ?? hoy;

      const [suscripciones, planes, cobrado, pendientesDeArmar, armadas, enviadas] =
        await Promise.all([
          unidad.repos.suscripciones.listar(),
          unidad.repos.planes.listar(),
          unidad.repos.cobros.sumarCobrado(desde, hasta),
          unidad.repos.entregas.contarPorEstado('PROGRAMADA'),
          unidad.repos.entregas.contarPorEstado('ARMADA'),
          unidad.repos.entregas.contarPorEstado('ENVIADA'),
        ]);

      const porPlan = planes.map((plan) => {
        const suyas = suscripciones.filter((s) => s.planId === plan.id);
        return {
          planId: plan.id,
          plan: plan.nombre,
          precioCiclo: plan.precioCiclo,
          frecuencia: plan.frecuencia,
          activas: suyas.filter((s) => s.estado === 'ACTIVA').length,
          pausadas: suyas.filter((s) => s.estado === 'PAUSADA').length,
          suspendidas: suyas.filter((s) => s.estado === 'SUSPENDIDA').length,
          canceladas: suyas.filter((s) => s.estado === 'CANCELADA').length,
        };
      });

      const factorMensual = { SEMANAL: 52 / 12, QUINCENAL: 26 / 12, MENSUAL: 1 } as const;
      const ingresoRecurrenteMensual = planes.reduce((suma, plan) => {
        const activas = suscripciones.filter(
          (s) => s.planId === plan.id && s.estado === 'ACTIVA',
        ).length;
        return suma + activas * plan.precioCiclo * factorMensual[plan.frecuencia];
      }, 0);

      const canceladasEnPeriodo = suscripciones.filter(
        (s) => s.canceladaEn && s.canceladaEn.slice(0, 10) >= desde && s.canceladaEn.slice(0, 10) <= hasta,
      ).length;

      return {
        periodo: { desde, hasta },
        suscriptores: {
          activos: suscripciones.filter((s) => s.estado === 'ACTIVA').length,
          pausados: suscripciones.filter((s) => s.estado === 'PAUSADA').length,
          suspendidos: suscripciones.filter((s) => s.estado === 'SUSPENDIDA').length,
          cancelados: suscripciones.filter((s) => s.estado === 'CANCELADA').length,
          canceladosEnPeriodo: canceladasEnPeriodo,
        },
        porPlan,
        dinero: {
          cobradoEnPeriodo: Math.round(cobrado * 100) / 100,
          ingresoRecurrenteMensual: Math.round(ingresoRecurrenteMensual * 100) / 100,
        },
        entregas: {
          pendientesDeArmar: pendientesDeArmar,
          armadas,
          enviadas,
        },
      };
    },
  };
}

export type ServicioTablero = ReturnType<typeof crearServicioTablero>;
