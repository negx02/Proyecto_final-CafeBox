import { ErrorDeRegla, ErrorNoEncontrado, ErrorSinPermiso, MENSAJES_DE_REGLA } from '../errores.js';
import type { Reloj, UnidadDeTrabajo } from '../puertos.js';
import type { Cobro, EstadoCobro, FechaISO, Identidad } from '../tipos.js';

export function crearServicioCobros(deps: { unidad: UnidadDeTrabajo; reloj: Reloj }) {
  const { unidad, reloj } = deps;

  return {

    async listar(
      identidad: Identidad,
      filtro: { estado?: EstadoCobro; suscripcionId?: string; desde?: FechaISO; hasta?: FechaISO } = {},
    ) {
      const esAdmin = identidad.rol === 'ADMIN';
      const cobros = await unidad.repos.cobros.listar({
        ...filtro,
        clienteId: esAdmin ? undefined : (identidad.clienteId ?? '—'),
      });

      const planes = new Map((await unidad.repos.planes.listar()).map((p) => [p.id, p]));
      return Promise.all(
        cobros.map(async (cobro) => {
          const suscripcion = await unidad.repos.suscripciones.obtener(cobro.suscripcionId);
          const entrega = cobro.entregaId ? await unidad.repos.entregas.obtener(cobro.entregaId) : null;
          const plan = suscripcion ? planes.get(suscripcion.planId) : undefined;
          return {
            ...cobro,
            plan: plan ? { id: plan.id, nombre: plan.nombre } : null,
            entrega: entrega
              ? { id: entrega.id, fechaProgramada: entrega.fechaProgramada, estado: entrega.estado }
              : null,
          };
        }),
      );
    },

    async registrar(
      cobroId: string,
      resultado: 'COBRADO' | 'FALLIDO',
      motivoFallo?: string | null,
    ) {
      return unidad.enTransaccion(async (repos) => {
        const cobro = await repos.cobros.obtener(cobroId);
        if (!cobro) throw new ErrorNoEncontrado('cobro', cobroId);

        if (cobro.estado === 'COBRADO' || cobro.estado === 'CANCELADO') {
          throw new ErrorDeRegla('COBRO_YA_REGISTRADO', MENSAJES_DE_REGLA.COBRO_YA_REGISTRADO, {
            estadoActual: cobro.estado,
          });
        }

        const actualizado: Cobro = {
          ...cobro,
          estado: resultado,
          fecha: reloj.hoy(),
          motivoFallo: resultado === 'FALLIDO' ? (motivoFallo ?? 'Cobro rechazado') : null,
        };
        await repos.cobros.actualizar(actualizado);

        const suscripcion = await repos.suscripciones.obtener(cobro.suscripcionId);
        if (!suscripcion) throw new ErrorNoEncontrado('suscripción', cobro.suscripcionId);

        if (resultado === 'FALLIDO' && suscripcion.estado !== 'CANCELADA') {
          await repos.suscripciones.actualizar({ ...suscripcion, estado: 'SUSPENDIDA' });
          return { cobro: actualizado, suscripcionSuspendida: true };
        }

        return { cobro: actualizado, suscripcionSuspendida: false };
      });
    },

    async reintentar(identidad: Identidad, cobroId: string) {
      return unidad.enTransaccion(async (repos) => {
        const cobro = await repos.cobros.obtener(cobroId);
        if (!cobro) throw new ErrorNoEncontrado('cobro', cobroId);

        const suscripcion = await repos.suscripciones.obtener(cobro.suscripcionId);
        if (!suscripcion) throw new ErrorNoEncontrado('suscripción', cobro.suscripcionId);

        if (identidad.rol !== 'ADMIN' && suscripcion.clienteId !== identidad.clienteId) {
          throw new ErrorSinPermiso('Este cobro pertenece a otro cliente');
        }
        if (cobro.estado !== 'FALLIDO') {
          throw new ErrorDeRegla('COBRO_NO_FALLIDO', MENSAJES_DE_REGLA.COBRO_NO_FALLIDO, {
            estadoActual: cobro.estado,
          });
        }

        const cliente = await repos.clientes.obtener(suscripcion.clienteId);
        if (!cliente?.pagoUltimos4) {
          throw new ErrorDeRegla('SIN_DATOS_DE_PAGO', MENSAJES_DE_REGLA.SIN_DATOS_DE_PAGO);
        }

        const actualizado: Cobro = { ...cobro, estado: 'PENDIENTE', motivoFallo: null };
        await repos.cobros.actualizar(actualizado);

        if (suscripcion.estado === 'SUSPENDIDA') {
          await repos.suscripciones.actualizar({ ...suscripcion, estado: 'ACTIVA' });
        }

        return { cobro: actualizado, suscripcionReactivada: suscripcion.estado === 'SUSPENDIDA' };
      });
    },
  };
}

export type ServicioCobros = ReturnType<typeof crearServicioCobros>;
