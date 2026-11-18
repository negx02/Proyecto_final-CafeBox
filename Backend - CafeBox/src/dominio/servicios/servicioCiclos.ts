import { fechaDelCiclo } from '../calendario.js';
import { ErrorDeRegla, ErrorNoEncontrado, ErrorSinPermiso, MENSAJES_DE_REGLA } from '../errores.js';
import { generarCiclo, type ResultadoGeneracion } from '../generacion.js';
import type { GeneradorDeId, Reloj, UnidadDeTrabajo } from '../puertos.js';
import type { Entrega, EstadoEntrega, FechaISO, Identidad } from '../tipos.js';

const TRANSICIONES: Record<EstadoEntrega, EstadoEntrega[]> = {
  PROGRAMADA: ['ARMADA', 'SALTADA'],
  ARMADA: ['ENVIADA'],
  ENVIADA: ['ENTREGADA'],
  ENTREGADA: [],
  SALTADA: [],
};

export interface ResumenGeneracion {
  cicloGenerado: number | null;
  generadas: number;
  saltadasPorPausa: number;
  saltadasPorPeticion: number;
  yaExistian: number;
  sinStock: { suscripcionId: string; faltan: number }[];
  omitidas: { suscripcionId: string; motivo: string }[];
  detalle: { suscripcionId: string; resultado: ResultadoGeneracion['tipo'] }[];
}

export function crearServicioCiclos(deps: {
  unidad: UnidadDeTrabajo;
  reloj: Reloj;
  ids: GeneradorDeId;
}) {
  const { unidad, reloj, ids } = deps;

  return {

    async generarSiguienteCiclo(opciones: { hasta?: FechaISO } = {}): Promise<ResumenGeneracion> {
      return unidad.enTransaccion(async (repos) => {
        const suscripciones = await repos.suscripciones.listarGenerables();
        const resumen: ResumenGeneracion = {
          cicloGenerado: null,
          generadas: 0,
          saltadasPorPausa: 0,
          saltadasPorPeticion: 0,
          yaExistian: 0,
          sinStock: [],
          omitidas: [],
          detalle: [],
        };

        for (const suscripcion of suscripciones) {
          const plan = await repos.planes.obtener(suscripcion.planId);
          if (!plan) {
            resumen.omitidas.push({ suscripcionId: suscripcion.id, motivo: 'PLAN_INEXISTENTE' });
            continue;
          }

          const ciclo = suscripcion.ciclosGenerados + 1;

          if (opciones.hasta) {
            const fecha = fechaDelCiclo(
              suscripcion.fechaInicio,
              suscripcion.diaEntregaPreferido,
              plan.frecuencia,
              ciclo,
            );
            if (fecha > opciones.hasta) {
              resumen.omitidas.push({ suscripcionId: suscripcion.id, motivo: 'FUERA_DEL_PERIODO' });
              continue;
            }
          }

          const resultado = await generarCiclo(repos, { reloj, ids }, suscripcion, plan, ciclo);
          resumen.detalle.push({ suscripcionId: suscripcion.id, resultado: resultado.tipo });

          switch (resultado.tipo) {
            case 'GENERADA':
              resumen.generadas += 1;
              break;
            case 'SALTADA':
              if (resultado.motivo === 'PAUSA') resumen.saltadasPorPausa += 1;
              else resumen.saltadasPorPeticion += 1;
              break;
            case 'YA_EXISTIA':
              resumen.yaExistian += 1;
              break;
            case 'SIN_STOCK':
              resumen.sinStock.push({ suscripcionId: suscripcion.id, faltan: resultado.faltan });
              break;
            case 'OMITIDA':
              resumen.omitidas.push({ suscripcionId: suscripcion.id, motivo: resultado.motivo });
              break;
          }
        }

        return resumen;
      });
    },

    async listar(
      identidad: Identidad,
      filtro: {
        fecha?: FechaISO;
        desde?: FechaISO;
        hasta?: FechaISO;
        ciudad?: string;
        planId?: string;
        estado?: EstadoEntrega;
        suscripcionId?: string;
      } = {},
    ) {
      const esAdmin = identidad.rol === 'ADMIN';
      const entregas = await unidad.repos.entregas.listar({
        ...filtro,
        clienteId: esAdmin ? undefined : (identidad.clienteId ?? '—'),
      });
      return this.enriquecer(entregas);
    },

    async enriquecer(entregas: Entrega[]) {
      const planes = new Map((await unidad.repos.planes.listar()).map((p) => [p.id, p]));
      return Promise.all(
        entregas.map(async (entrega) => {
          const suscripcion = await unidad.repos.suscripciones.obtener(entrega.suscripcionId);
          const plan = planes.get(entrega.planId);
          const cobro = await unidad.repos.cobros.obtenerPorCiclo(entrega.suscripcionId, entrega.ciclo);
          return {
            ...entrega,
            plan: plan ? { id: plan.id, nombre: plan.nombre, frecuencia: plan.frecuencia } : null,
            ciudad: suscripcion?.ciudad ?? null,
            direccionEntrega: suscripcion?.direccionEntrega ?? null,
            cobro: cobro ? { id: cobro.id, estado: cobro.estado, monto: cobro.monto } : null,
          };
        }),
      );
    },

    async obtener(identidad: Identidad, id: string) {
      const entrega = await unidad.repos.entregas.obtener(id);
      if (!entrega) throw new ErrorNoEncontrado('entrega', id);
      if (identidad.rol !== 'ADMIN') {
        const suscripcion = await unidad.repos.suscripciones.obtener(entrega.suscripcionId);
        if (suscripcion?.clienteId !== identidad.clienteId) {
          throw new ErrorSinPermiso('Esta entrega pertenece a otro cliente');
        }
      }
      const [enriquecida] = await this.enriquecer([entrega]);
      return enriquecida;
    },

    async avanzarEstado(id: string, nuevoEstado: EstadoEntrega) {
      return unidad.enTransaccion(async (repos) => {
        const entrega = await repos.entregas.obtener(id);
        if (!entrega) throw new ErrorNoEncontrado('entrega', id);

        if (!TRANSICIONES[entrega.estado].includes(nuevoEstado)) {
          throw new ErrorDeRegla('TRANSICION_INVALIDA', MENSAJES_DE_REGLA.TRANSICION_INVALIDA, {
            estadoActual: entrega.estado,
            estadoPedido: nuevoEstado,
            permitidos: TRANSICIONES[entrega.estado],
          });
        }

        if (nuevoEstado === 'ENVIADA') {
          const cobro = await repos.cobros.obtenerPorCiclo(entrega.suscripcionId, entrega.ciclo);
          if (!cobro || cobro.estado !== 'COBRADO') {
            throw new ErrorDeRegla('ENTREGA_SIN_COBRO', MENSAJES_DE_REGLA.ENTREGA_SIN_COBRO, {
              estadoDelCobro: cobro?.estado ?? 'SIN_COBRO',
            });
          }
        }

        const ahora = reloj.ahora();
        const actualizada: Entrega = {
          ...entrega,
          estado: nuevoEstado,
          armadaEn: nuevoEstado === 'ARMADA' ? ahora : entrega.armadaEn,
          enviadaEn: nuevoEstado === 'ENVIADA' ? ahora : entrega.enviadaEn,
          entregadaEn: nuevoEstado === 'ENTREGADA' ? ahora : entrega.entregadaEn,
        };
        await repos.entregas.actualizar(actualizada);

        if (nuevoEstado === 'ENVIADA') {
          const suscripcion = await repos.suscripciones.obtener(entrega.suscripcionId);
          if (suscripcion && suscripcion.omisionesConsecutivas > 0) {
            await repos.suscripciones.actualizar({ ...suscripcion, omisionesConsecutivas: 0 });
          }
        }

        return actualizada;
      });
    },

    async avanzarPorFecha(fecha: FechaISO, nuevoEstado: EstadoEntrega) {
      const estadoPrevio: EstadoEntrega = nuevoEstado === 'ARMADA' ? 'PROGRAMADA' : nuevoEstado === 'ENVIADA' ? 'ARMADA' : 'ENVIADA';
      const entregas = await unidad.repos.entregas.listar({ fecha, estado: estadoPrevio });

      const avanzadas: string[] = [];
      const rechazadas: { entregaId: string; codigo: string; mensaje: string }[] = [];
      for (const entrega of entregas) {
        try {
          await this.avanzarEstado(entrega.id, nuevoEstado);
          avanzadas.push(entrega.id);
        } catch (error) {
          if (error instanceof ErrorDeRegla) {
            rechazadas.push({ entregaId: entrega.id, codigo: error.codigo, mensaje: error.message });
          } else {
            throw error;
          }
        }
      }
      return { fecha, nuevoEstado, avanzadas: avanzadas.length, rechazadas };
    },

    async cajasPorArmar(fecha: FechaISO) {
      const conteo = await unidad.repos.entregas.contarPorPlanEnFecha(fecha);
      const planes = new Map((await unidad.repos.planes.listar()).map((p) => [p.id, p]));
      const productos = new Map((await unidad.repos.productos.listar()).map((p) => [p.id, p]));

      const renglones = conteo.map((fila) => {
        const plan = planes.get(fila.planId);
        const producto = plan ? productos.get(plan.productoId) : undefined;
        return {
          planId: fila.planId,
          plan: plan?.nombre ?? 'Plan desconocido',
          producto: producto?.nombre ?? null,
          cajas: fila.cajas,
          bolsas: fila.bolsas,
          stockDisponible: producto?.stockDisponible ?? null,
          alcanzaElStock: producto ? producto.stockDisponible >= 0 : null,
        };
      });

      return {
        fecha,
        renglones: renglones.sort((a, b) => b.cajas - a.cajas),
        totalCajas: renglones.reduce((suma, r) => suma + r.cajas, 0),
        totalBolsas: renglones.reduce((suma, r) => suma + r.bolsas, 0),
      };
    },
  };
}

export type ServicioCiclos = ReturnType<typeof crearServicioCiclos>;
