import { ErrorDeRegla, ErrorNoEncontrado, MENSAJES_DE_REGLA } from '../errores.js';
import type { GeneradorDeId, Reloj, UnidadDeTrabajo } from '../puertos.js';
import type { Frecuencia, Plan, PlanConContenido, Producto } from '../tipos.js';

export interface DatosDePlan {
  nombre: string;
  descripcion: string;
  productoId: string;
  bolsasPorEntrega: number;
  precioCiclo: number;
  frecuencia: Frecuencia;
}

export function crearServicioCatalogo(deps: {
  unidad: UnidadDeTrabajo;
  reloj: Reloj;
  ids: GeneradorDeId;
}) {
  const { unidad, reloj, ids } = deps;

  async function conContenido(planes: Plan[], productos: Producto[]): Promise<PlanConContenido[]> {
    const porId = new Map(productos.map((p) => [p.id, p]));
    return planes.map((plan) => {
      const producto = porId.get(plan.productoId);
      return {
        ...plan,
        producto: {
          id: producto?.id ?? plan.productoId,
          nombre: producto?.nombre ?? 'Producto no disponible',
          origen: producto?.origen ?? '',
          gramaje: producto?.gramaje ?? 0,
          stockDisponible: producto?.stockDisponible ?? 0,
        },
      };
    });
  }

  return {

    async listarPlanesDisponibles(): Promise<PlanConContenido[]> {
      const [planes, productos] = await Promise.all([
        unidad.repos.planes.listar({ soloActivos: true }),
        unidad.repos.productos.listar(),
      ]);
      return conContenido(planes, productos);
    },

    async listarTodosLosPlanes(): Promise<PlanConContenido[]> {
      const [planes, productos] = await Promise.all([
        unidad.repos.planes.listar(),
        unidad.repos.productos.listar(),
      ]);
      return conContenido(planes, productos);
    },

    async obtenerPlan(id: string): Promise<PlanConContenido> {
      const plan = await unidad.repos.planes.obtener(id);
      if (!plan) throw new ErrorNoEncontrado('plan', id);
      const productos = await unidad.repos.productos.listar();
      const [conDatos] = await conContenido([plan], productos);
      return conDatos;
    },

    async crearPlan(datos: DatosDePlan): Promise<Plan> {
      return unidad.enTransaccion(async (repos) => {
        const producto = await repos.productos.obtener(datos.productoId);
        if (!producto) throw new ErrorNoEncontrado('producto', datos.productoId);

        const plan: Plan = {
          id: ids.nuevo(),
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion.trim(),
          productoId: datos.productoId,
          bolsasPorEntrega: datos.bolsasPorEntrega,
          precioCiclo: datos.precioCiclo,
          frecuencia: datos.frecuencia,
          activo: true,
          retiradoEn: null,
        };
        await repos.planes.crear(plan);
        return plan;
      });
    },

    async actualizarPlan(
      id: string,
      cambios: Partial<DatosDePlan> & { activo?: boolean },
    ): Promise<Plan> {
      return unidad.enTransaccion(async (repos) => {
        const plan = await repos.planes.obtener(id);
        if (!plan) throw new ErrorNoEncontrado('plan', id);

        if (cambios.productoId && cambios.productoId !== plan.productoId) {
          const producto = await repos.productos.obtener(cambios.productoId);
          if (!producto) throw new ErrorNoEncontrado('producto', cambios.productoId);
        }

        const seRetira = cambios.activo === false && plan.activo;
        const actualizado: Plan = {
          ...plan,
          nombre: cambios.nombre?.trim() ?? plan.nombre,
          descripcion: cambios.descripcion?.trim() ?? plan.descripcion,
          productoId: cambios.productoId ?? plan.productoId,
          bolsasPorEntrega: cambios.bolsasPorEntrega ?? plan.bolsasPorEntrega,
          precioCiclo: cambios.precioCiclo ?? plan.precioCiclo,
          frecuencia: cambios.frecuencia ?? plan.frecuencia,
          activo: cambios.activo ?? plan.activo,
          retiradoEn: seRetira ? reloj.ahora() : cambios.activo === true ? null : plan.retiradoEn,
        };
        await repos.planes.actualizar(actualizado);

        const suscripcionesVigentes = await repos.suscripciones.contarPorPlan(id, true);
        return { ...actualizado, suscripcionesVigentes } as Plan & {
          suscripcionesVigentes: number;
        };
      });
    },

    async listarProductos(): Promise<Producto[]> {
      return unidad.repos.productos.listar();
    },

    async ajustarStock(id: string, stockDisponible: number): Promise<Producto> {
      return unidad.enTransaccion(async (repos) => {
        const producto = await repos.productos.obtener(id);
        if (!producto) throw new ErrorNoEncontrado('producto', id);
        await repos.productos.actualizarStock(id, stockDisponible);
        return { ...producto, stockDisponible };
      });
    },

    async listarZonas(): Promise<string[]> {
      return unidad.repos.zonas.listar();
    },

    async agregarZona(ciudad: string): Promise<string[]> {
      return unidad.enTransaccion(async (repos) => {
        const limpia = ciudad.trim();
        if (await repos.zonas.tieneCobertura(limpia)) {
          throw new ErrorDeRegla('CIUDAD_DUPLICADA', MENSAJES_DE_REGLA.CIUDAD_DUPLICADA);
        }
        await repos.zonas.agregar(limpia);
        return repos.zonas.listar();
      });
    },

    async quitarZona(ciudad: string): Promise<string[]> {
      return unidad.enTransaccion(async (repos) => {
        const quitada = await repos.zonas.quitar(ciudad.trim());
        if (!quitada) throw new ErrorNoEncontrado('zona de cobertura', ciudad);
        return repos.zonas.listar();
      });
    },
  };
}

export type ServicioCatalogo = ReturnType<typeof crearServicioCatalogo>;
