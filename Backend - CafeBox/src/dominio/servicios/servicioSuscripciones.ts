import { diasEntre, fechaAnterior, fechaDelCiclo } from '../calendario.js';
import {
  ErrorDeRegla,
  ErrorNoEncontrado,
  ErrorSinPermiso,
  MENSAJES_DE_REGLA,
} from '../errores.js';
import { generarCiclo, liberarEntrega } from '../generacion.js';
import type { GeneradorDeId, Reloj, UnidadDeTrabajo } from '../puertos.js';
import type {
  CambioDePlan,
  Entrega,
  EstadoSuscripcion,
  FechaISO,
  Identidad,
  Suscripcion,
} from '../tipos.js';

export const DIAS_ANTICIPACION_SALTO = 2;

export const MAXIMO_OMISIONES_CONSECUTIVAS = 2;

export interface DatosDeContratacion {
  planId: string;
  direccionEntrega: string;
  ciudad: string;
  diaEntregaPreferido: number;
  fechaInicio?: FechaISO;
}

export function crearServicioSuscripciones(deps: {
  unidad: UnidadDeTrabajo;
  reloj: Reloj;
  ids: GeneradorDeId;
}) {
  const { unidad, reloj, ids } = deps;

  function asegurarLectura(suscripcion: Suscripcion, identidad: Identidad) {
    if (identidad.rol === 'ADMIN') return;
    if (suscripcion.clienteId !== identidad.clienteId) {
      throw new ErrorSinPermiso('Esta suscripción pertenece a otro cliente');
    }
  }

  function asegurarDueno(suscripcion: Suscripcion, identidad: Identidad) {
    if (suscripcion.clienteId !== identidad.clienteId) {
      throw new ErrorSinPermiso('Sólo el dueño de la suscripción puede hacer esta operación');
    }
  }

  function asegurarIntervenible(suscripcion: Suscripcion) {
    if (suscripcion.estado === 'CANCELADA') {
      throw new ErrorDeRegla('SUSCRIPCION_CANCELADA', MENSAJES_DE_REGLA.SUSCRIPCION_CANCELADA);
    }
    if (suscripcion.estado === 'SUSPENDIDA') {
      throw new ErrorDeRegla('SUSCRIPCION_SUSPENDIDA', MENSAJES_DE_REGLA.SUSCRIPCION_SUSPENDIDA);
    }
  }

  return {

    async contratar(identidad: Identidad, datos: DatosDeContratacion) {
      if (!identidad.clienteId) {
        throw new ErrorSinPermiso('Sólo una cuenta de cliente puede contratar un plan');
      }
      const clienteId = identidad.clienteId;

      return unidad.enTransaccion(async (repos) => {
        const plan = await repos.planes.obtener(datos.planId);
        if (!plan) throw new ErrorNoEncontrado('plan', datos.planId);

        const ciudad = datos.ciudad.trim();
        if (!(await repos.zonas.tieneCobertura(ciudad))) {
          throw new ErrorDeRegla('FUERA_DE_COBERTURA', MENSAJES_DE_REGLA.FUERA_DE_COBERTURA, {
            ciudad,
            ciudadesConCobertura: await repos.zonas.listar(),
          });
        }

        if (!plan.activo) {
          throw new ErrorDeRegla('PLAN_RETIRADO', MENSAJES_DE_REGLA.PLAN_RETIRADO);
        }

        const vigente = await repos.suscripciones.obtenerVigentePorClienteYPlan(
          clienteId,
          plan.id,
        );
        if (vigente) {
          throw new ErrorDeRegla(
            'SUSCRIPCION_DUPLICADA',
            MENSAJES_DE_REGLA.SUSCRIPCION_DUPLICADA,
            { suscripcionId: vigente.id },
          );
        }

        const suscripcion: Suscripcion = {
          id: ids.nuevo(),
          clienteId,
          planId: plan.id,
          estado: 'ACTIVA',
          fechaInicio: datos.fechaInicio ?? reloj.hoy(),
          diaEntregaPreferido: datos.diaEntregaPreferido,
          direccionEntrega: datos.direccionEntrega.trim(),
          ciudad,
          ciclosGenerados: 0,
          pausadaDesde: null,
          pausadaHasta: null,
          canceladaEn: null,
          omisionesConsecutivas: 0,
          creadoEn: reloj.ahora(),
        };
        await repos.suscripciones.crear(suscripcion);

        const resultado = await generarCiclo(repos, { reloj, ids }, suscripcion, plan, 1);
        if (resultado.tipo === 'SIN_STOCK') {
          throw new ErrorDeRegla('STOCK_INSUFICIENTE', MENSAJES_DE_REGLA.STOCK_INSUFICIENTE, {
            faltan: resultado.faltan,
          });
        }

        const primeraEntrega = 'entrega' in resultado ? resultado.entrega : null;
        return {
          suscripcion: { ...suscripcion, ciclosGenerados: 1 },
          primeraEntrega,
          cobro: resultado.tipo === 'GENERADA' ? resultado.cobro : null,
        };
      });
    },

    async listar(
      identidad: Identidad,
      filtro: { planId?: string; estado?: EstadoSuscripcion; clienteId?: string } = {},
    ) {
      const esAdmin = identidad.rol === 'ADMIN';
      const suscripciones = await unidad.repos.suscripciones.listar({
        planId: filtro.planId,
        estado: filtro.estado,
        clienteId: esAdmin ? filtro.clienteId : (identidad.clienteId ?? '—'),
      });
      return Promise.all(suscripciones.map((s) => this.resumir(s)));
    },

    async resumir(suscripcion: Suscripcion) {
      const [plan, programada, cliente] = await Promise.all([
        unidad.repos.planes.obtener(suscripcion.planId),
        unidad.repos.entregas.obtenerProgramada(suscripcion.id),
        unidad.repos.clientes.obtener(suscripcion.clienteId),
      ]);
      return {
        ...suscripcion,
        plan: plan
          ? {
              id: plan.id,
              nombre: plan.nombre,
              precioCiclo: plan.precioCiclo,
              frecuencia: plan.frecuencia,
              bolsasPorEntrega: plan.bolsasPorEntrega,
            }
          : null,
        cliente: cliente ? { id: cliente.id, nombre: cliente.nombre, ciudad: cliente.ciudad } : null,
        proximaEntrega: programada
          ? { id: programada.id, ciclo: programada.ciclo, fechaProgramada: programada.fechaProgramada, estado: programada.estado }
          : null,
      };
    },

    async obtenerDetalle(identidad: Identidad, id: string) {
      const suscripcion = await unidad.repos.suscripciones.obtener(id);
      if (!suscripcion) throw new ErrorNoEncontrado('suscripción', id);
      asegurarLectura(suscripcion, identidad);

      const [resumen, entregas, cobros, cambios, pausas] = await Promise.all([
        this.resumir(suscripcion),
        unidad.repos.entregas.listar({ suscripcionId: id }),
        unidad.repos.cobros.listar({ suscripcionId: id }),
        unidad.repos.cambiosDePlan.listar({ suscripcionId: id }),
        unidad.repos.suscripciones.listarPausas(id),
      ]);

      return { ...resumen, entregas, cobros, cambiosDePlan: cambios, pausas };
    },

    async proximasEntregas(identidad: Identidad, id: string, cuantas = 6) {
      const suscripcion = await unidad.repos.suscripciones.obtener(id);
      if (!suscripcion) throw new ErrorNoEncontrado('suscripción', id);
      asegurarLectura(suscripcion, identidad);

      const plan = await unidad.repos.planes.obtener(suscripcion.planId);
      if (!plan) throw new ErrorNoEncontrado('plan', suscripcion.planId);

      const generadas = await unidad.repos.entregas.listar({ suscripcionId: id });
      const pausas = await unidad.repos.suscripciones.listarPausas(id);
      const hoy = reloj.hoy();

      const calendario: {
        ciclo: number;
        fechaProgramada: FechaISO;
        estado: Entrega['estado'] | 'PREVISTA';
        entregaId: string | null;
        motivoSalto: string | null;
      }[] = generadas
        .filter((e) => !fechaAnterior(e.fechaProgramada, hoy) || e.estado !== 'ENTREGADA')
        .map((e) => ({
          ciclo: e.ciclo,
          fechaProgramada: e.fechaProgramada,
          estado: e.estado,
          entregaId: e.id,
          motivoSalto: e.motivoSalto,
        }));

      if (suscripcion.estado !== 'CANCELADA') {
        let ciclo = suscripcion.ciclosGenerados + 1;
        while (calendario.length < cuantas) {
          const fecha = fechaDelCiclo(
            suscripcion.fechaInicio,
            suscripcion.diaEntregaPreferido,
            plan.frecuencia,
            ciclo,
          );
          const enPausa = pausas.some((p) => fecha >= p.desde && fecha <= p.hasta);
          calendario.push({
            ciclo,
            fechaProgramada: fecha,
            estado: enPausa ? 'SALTADA' : 'PREVISTA',
            entregaId: null,
            motivoSalto: enPausa ? 'PAUSA' : null,
          });
          ciclo += 1;
        }
      }

      calendario.sort((a, b) => a.ciclo - b.ciclo);
      return calendario.slice(0, cuantas);
    },

    async pausar(identidad: Identidad, id: string, desde: FechaISO, hasta: FechaISO) {
      return unidad.enTransaccion(async (repos) => {
        const suscripcion = await repos.suscripciones.obtener(id);
        if (!suscripcion) throw new ErrorNoEncontrado('suscripción', id);
        asegurarDueno(suscripcion, identidad);
        asegurarIntervenible(suscripcion);

        if (suscripcion.estado === 'PAUSADA') {
          throw new ErrorDeRegla('SUSCRIPCION_PAUSADA', MENSAJES_DE_REGLA.SUSCRIPCION_PAUSADA);
        }
        if (!fechaAnterior(desde, hasta) || fechaAnterior(hasta, reloj.hoy())) {
          throw new ErrorDeRegla('PAUSA_INVALIDA', MENSAJES_DE_REGLA.PAUSA_INVALIDA);
        }

        await repos.suscripciones.registrarPausa({
          id: ids.nuevo(),
          suscripcionId: id,
          desde,
          hasta,
          creadoEn: reloj.ahora(),
        });

        const actualizada: Suscripcion = {
          ...suscripcion,
          estado: 'PAUSADA',
          pausadaDesde: desde,
          pausadaHasta: hasta,
        };
        await repos.suscripciones.actualizar(actualizada);

        const programada = await repos.entregas.obtenerProgramada(id);
        let entregaLiberada: Entrega | null = null;
        if (programada && programada.fechaProgramada >= desde && programada.fechaProgramada <= hasta) {
          const cobro = await repos.cobros.obtenerPorCiclo(id, programada.ciclo);
          if (cobro?.estado === 'COBRADO') {} else {
            await liberarEntrega(repos, programada, 'PAUSA', reloj.ahora());
            entregaLiberada = programada;
          }
        }

        return { suscripcion: actualizada, entregaLiberada };
      });
    },

    async reanudar(identidad: Identidad, id: string) {
      return unidad.enTransaccion(async (repos) => {
        const suscripcion = await repos.suscripciones.obtener(id);
        if (!suscripcion) throw new ErrorNoEncontrado('suscripción', id);
        asegurarDueno(suscripcion, identidad);
        if (suscripcion.estado !== 'PAUSADA') {
          throw new ErrorDeRegla(
            'SUSCRIPCION_NO_PAUSADA',
            MENSAJES_DE_REGLA.SUSCRIPCION_NO_PAUSADA,
          );
        }
        const actualizada: Suscripcion = {
          ...suscripcion,
          estado: 'ACTIVA',
          pausadaDesde: null,
          pausadaHasta: null,
        };
        await repos.suscripciones.actualizar(actualizada);
        return actualizada;
      });
    },

    async saltarProximaEntrega(identidad: Identidad, id: string) {
      return unidad.enTransaccion(async (repos) => {
        const suscripcion = await repos.suscripciones.obtener(id);
        if (!suscripcion) throw new ErrorNoEncontrado('suscripción', id);
        asegurarDueno(suscripcion, identidad);
        asegurarIntervenible(suscripcion);

        if (suscripcion.omisionesConsecutivas >= MAXIMO_OMISIONES_CONSECUTIVAS) {
          throw new ErrorDeRegla('LIMITE_OMISIONES', MENSAJES_DE_REGLA.LIMITE_OMISIONES, {
            maximo: MAXIMO_OMISIONES_CONSECUTIVAS,
          });
        }

        const programada = await repos.entregas.obtenerProgramada(id);
        const ciclo = programada ? programada.ciclo : suscripcion.ciclosGenerados + 1;

        if (await repos.suscripciones.obtenerSalto(id, ciclo)) {
          throw new ErrorDeRegla('CICLO_YA_SALTADO', MENSAJES_DE_REGLA.CICLO_YA_SALTADO);
        }

        if (programada) {
          const faltan = diasEntre(reloj.hoy(), programada.fechaProgramada);
          if (faltan < DIAS_ANTICIPACION_SALTO) {
            throw new ErrorDeRegla(
              'OMISION_FUERA_DE_TIEMPO',
              MENSAJES_DE_REGLA.OMISION_FUERA_DE_TIEMPO,
              { fechaProgramada: programada.fechaProgramada, diasRequeridos: DIAS_ANTICIPACION_SALTO },
            );
          }
          const cobro = await repos.cobros.obtenerPorCiclo(id, ciclo);
          if (cobro?.estado === 'COBRADO') {
            throw new ErrorDeRegla('CICLO_YA_COBRADO', MENSAJES_DE_REGLA.CICLO_YA_COBRADO);
          }
          await liberarEntrega(repos, programada, 'SALTO_DEL_CLIENTE', reloj.ahora());
        }

        await repos.suscripciones.registrarSalto({
          id: ids.nuevo(),
          suscripcionId: id,
          ciclo,
          creadoEn: reloj.ahora(),
        });

        const actualizada: Suscripcion = {
          ...suscripcion,
          omisionesConsecutivas: suscripcion.omisionesConsecutivas + 1,
          ciclosGenerados: Math.max(suscripcion.ciclosGenerados, programada ? programada.ciclo : 0),
        };
        await repos.suscripciones.actualizar(actualizada);

        const plan = await repos.planes.obtener(suscripcion.planId);
        return {
          cicloSaltado: ciclo,
          siguienteFecha: plan
            ? fechaDelCiclo(
                suscripcion.fechaInicio,
                suscripcion.diaEntregaPreferido,
                plan.frecuencia,
                ciclo + 1,
              )
            : null,
          suscripcion: actualizada,
        };
      });
    },

    async solicitarCambioDePlan(identidad: Identidad, id: string, planNuevoId: string) {
      return unidad.enTransaccion(async (repos) => {
        const suscripcion = await repos.suscripciones.obtener(id);
        if (!suscripcion) throw new ErrorNoEncontrado('suscripción', id);
        asegurarDueno(suscripcion, identidad);
        asegurarIntervenible(suscripcion);

        const planNuevo = await repos.planes.obtener(planNuevoId);
        if (!planNuevo) throw new ErrorNoEncontrado('plan', planNuevoId);
        if (!planNuevo.activo) {
          throw new ErrorDeRegla('PLAN_RETIRADO', MENSAJES_DE_REGLA.PLAN_RETIRADO);
        }
        if (planNuevoId === suscripcion.planId) {
          throw new ErrorDeRegla('PLAN_IGUAL', MENSAJES_DE_REGLA.PLAN_IGUAL);
        }
        if (await repos.cambiosDePlan.obtenerPendiente(id)) {
          throw new ErrorDeRegla('CAMBIO_YA_SOLICITADO', MENSAJES_DE_REGLA.CAMBIO_YA_SOLICITADO);
        }

        const cicloAplica = suscripcion.ciclosGenerados + 1;
        const cambio: CambioDePlan = {
          id: ids.nuevo(),
          suscripcionId: id,
          planAnteriorId: suscripcion.planId,
          planNuevoId,
          cicloAplica,
          estado: 'SOLICITADO',
          solicitadoEn: reloj.ahora(),
          resueltoEn: null,
        };
        await repos.cambiosDePlan.crear(cambio);

        return {
          cambio,
          aplicaDesdeElCiclo: cicloAplica,
          fechaDeEseCiclo: fechaDelCiclo(
            suscripcion.fechaInicio,
            suscripcion.diaEntregaPreferido,
            planNuevo.frecuencia,
            cicloAplica,
          ),
          pagaraPorCiclo: planNuevo.precioCiclo,
        };
      });
    },

    async cancelar(identidad: Identidad, id: string) {
      return unidad.enTransaccion(async (repos) => {
        const suscripcion = await repos.suscripciones.obtener(id);
        if (!suscripcion) throw new ErrorNoEncontrado('suscripción', id);
        asegurarDueno(suscripcion, identidad);
        if (suscripcion.estado === 'CANCELADA') {
          throw new ErrorDeRegla('SUSCRIPCION_CANCELADA', MENSAJES_DE_REGLA.SUSCRIPCION_CANCELADA);
        }

        const programada = await repos.entregas.obtenerProgramada(id);
        let ultimaEntrega: Entrega | null = null;

        if (programada) {
          const cobro = await repos.cobros.obtenerPorCiclo(id, programada.ciclo);
          if (cobro?.estado === 'COBRADO') {
            ultimaEntrega = programada;
          } else {
            await liberarEntrega(repos, programada, 'CANCELACION', reloj.ahora());
          }
        }

        if (!ultimaEntrega) {
          const historial = await repos.entregas.listar({ suscripcionId: id });
          ultimaEntrega =
            historial
              .filter((e) => e.estado === 'ENVIADA' || e.estado === 'ENTREGADA' || e.estado === 'ARMADA')
              .sort((a, b) => b.ciclo - a.ciclo)[0] ?? null;
        }

        const actualizada: Suscripcion = {
          ...suscripcion,
          estado: 'CANCELADA',
          canceladaEn: reloj.ahora(),
          pausadaDesde: null,
          pausadaHasta: null,
        };
        await repos.suscripciones.actualizar(actualizada);

        return { suscripcion: actualizada, ultimaEntrega };
      });
    },
  };
}

export type ServicioSuscripciones = ReturnType<typeof crearServicioSuscripciones>;
