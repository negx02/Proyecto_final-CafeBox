import { fechaDelCiclo } from '../calendario.js';
import { ErrorDeRegla, ErrorNoEncontrado, MENSAJES_DE_REGLA } from '../errores.js';
import type { Reloj, UnidadDeTrabajo } from '../puertos.js';
import type { CambioDePlan, EstadoCambioDePlan } from '../tipos.js';

export function crearServicioCambiosDePlan(deps: { unidad: UnidadDeTrabajo; reloj: Reloj }) {
  const { unidad, reloj } = deps;

  return {
    async listar(filtro: { estado?: EstadoCambioDePlan } = {}) {
      const cambios = await unidad.repos.cambiosDePlan.listar(filtro);
      const planes = new Map((await unidad.repos.planes.listar()).map((p) => [p.id, p]));
      return Promise.all(
        cambios.map(async (cambio) => {
          const suscripcion = await unidad.repos.suscripciones.obtener(cambio.suscripcionId);
          const cliente = suscripcion
            ? await unidad.repos.clientes.obtener(suscripcion.clienteId)
            : null;
          return {
            ...cambio,
            planAnterior: planes.get(cambio.planAnteriorId)?.nombre ?? null,
            planNuevo: planes.get(cambio.planNuevoId)?.nombre ?? null,
            cliente: cliente ? { id: cliente.id, nombre: cliente.nombre } : null,
            cicloActual: suscripcion?.ciclosGenerados ?? null,
          };
        }),
      );
    },

    async resolver(
      id: string,
      decision: 'CONFIRMADO' | 'RECHAZADO',
      cicloAplica?: number,
    ) {
      return unidad.enTransaccion(async (repos) => {
        const cambio = await repos.cambiosDePlan.obtener(id);
        if (!cambio) throw new ErrorNoEncontrado('cambio de plan', id);
        if (cambio.estado !== 'SOLICITADO') {
          throw new ErrorDeRegla('CAMBIO_YA_RESUELTO', MENSAJES_DE_REGLA.CAMBIO_YA_RESUELTO, {
            estadoActual: cambio.estado,
          });
        }

        const suscripcion = await repos.suscripciones.obtener(cambio.suscripcionId);
        if (!suscripcion) throw new ErrorNoEncontrado('suscripción', cambio.suscripcionId);

        if (decision === 'RECHAZADO') {
          const rechazado: CambioDePlan = {
            ...cambio,
            estado: 'RECHAZADO',
            resueltoEn: reloj.ahora(),
          };
          await repos.cambiosDePlan.actualizar(rechazado);
          return { cambio: rechazado, suscripcion };
        }

        const ciclo = cicloAplica ?? cambio.cicloAplica;
        if (ciclo <= suscripcion.ciclosGenerados) {
          throw new ErrorDeRegla('CICLO_YA_PASADO', MENSAJES_DE_REGLA.CICLO_YA_PASADO, {
            cicloPedido: ciclo,
            ultimoCicloGenerado: suscripcion.ciclosGenerados,
          });
        }

        const planNuevo = await repos.planes.obtener(cambio.planNuevoId);
        if (!planNuevo) throw new ErrorNoEncontrado('plan', cambio.planNuevoId);

        const confirmado: CambioDePlan = {
          ...cambio,
          cicloAplica: ciclo,
          estado: 'CONFIRMADO',
          resueltoEn: reloj.ahora(),
        };
        await repos.cambiosDePlan.actualizar(confirmado);

        const actualizada = { ...suscripcion, planId: cambio.planNuevoId };
        await repos.suscripciones.actualizar(actualizada);

        return {
          cambio: confirmado,
          suscripcion: actualizada,
          aplicaDesde: fechaDelCiclo(
            suscripcion.fechaInicio,
            suscripcion.diaEntregaPreferido,
            planNuevo.frecuencia,
            ciclo,
          ),
        };
      });
    },
  };
}

export type ServicioCambiosDePlan = ReturnType<typeof crearServicioCambiosDePlan>;
