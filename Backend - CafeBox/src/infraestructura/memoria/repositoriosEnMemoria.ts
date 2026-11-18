import type {
  FiltroCobros,
  FiltroEntregas,
  FiltroPlanes,
  FiltroSuscripciones,
  Repositorios,
  UnidadDeTrabajo,
} from '../../dominio/puertos.js';
import type {
  CambioDePlan,
  Cliente,
  Cobro,
  Entrega,
  EstadoEntrega,
  FechaISO,
  Pausa,
  Plan,
  Producto,
  Salto,
  Suscripcion,
  Usuario,
} from '../../dominio/tipos.js';

export interface Almacen {
  zonas: string[];
  clientes: Cliente[];
  usuarios: Usuario[];
  productos: Producto[];
  planes: Plan[];
  suscripciones: Suscripcion[];
  entregas: Entrega[];
  cobros: Cobro[];
  pausas: Pausa[];
  saltos: Salto[];
  cambiosDePlan: CambioDePlan[];
}

export function almacenVacio(): Almacen {
  return {
    zonas: [],
    clientes: [],
    usuarios: [],
    productos: [],
    planes: [],
    suscripciones: [],
    entregas: [],
    cobros: [],
    pausas: [],
    saltos: [],
    cambiosDePlan: [],
  };
}

const copiar = <T>(valor: T): T => JSON.parse(JSON.stringify(valor)) as T;
const normalizar = (texto: string) => texto.trim().toLowerCase();

export function crearRepositoriosEnMemoria(almacen: Almacen): Repositorios {
  return {
    zonas: {
      async listar() {
        return [...almacen.zonas].sort();
      },
      async tieneCobertura(ciudad) {
        return almacen.zonas.some((c) => normalizar(c) === normalizar(ciudad));
      },
      async agregar(ciudad) {
        almacen.zonas.push(ciudad);
      },
      async quitar(ciudad) {
        const antes = almacen.zonas.length;
        almacen.zonas = almacen.zonas.filter((c) => normalizar(c) !== normalizar(ciudad));
        return almacen.zonas.length < antes;
      },
    },

    clientes: {
      async obtener(id) {
        return almacen.clientes.find((c) => c.id === id) ?? null;
      },
      async crear(cliente) {
        almacen.clientes.push(cliente);
      },
      async actualizar(cliente) {
        const i = almacen.clientes.findIndex((c) => c.id === cliente.id);
        if (i >= 0) almacen.clientes[i] = cliente;
      },
    },

    usuarios: {
      async obtener(id) {
        return almacen.usuarios.find((u) => u.id === id) ?? null;
      },
      async obtenerPorCorreo(correo) {
        return almacen.usuarios.find((u) => normalizar(u.correo) === normalizar(correo)) ?? null;
      },
      async crear(usuario) {
        almacen.usuarios.push(usuario);
      },
    },

    productos: {
      async listar() {
        return [...almacen.productos];
      },
      async obtener(id) {
        return almacen.productos.find((p) => p.id === id) ?? null;
      },
      async crear(producto) {
        almacen.productos.push(producto);
      },
      async actualizarStock(id, stockDisponible) {
        const producto = almacen.productos.find((p) => p.id === id);
        if (!producto) return;

        if (stockDisponible < 0) throw new Error('stock_disponible no puede ser negativo');
        producto.stockDisponible = stockDisponible;
      },
    },

    planes: {
      async listar(filtro: FiltroPlanes = {}) {
        return almacen.planes.filter((p) => (filtro.soloActivos ? p.activo : true));
      },
      async obtener(id) {
        return almacen.planes.find((p) => p.id === id) ?? null;
      },
      async crear(plan) {
        almacen.planes.push(plan);
      },
      async actualizar(plan) {
        const i = almacen.planes.findIndex((p) => p.id === plan.id);
        if (i >= 0) almacen.planes[i] = plan;
      },
    },

    suscripciones: {
      async listar(filtro: FiltroSuscripciones = {}) {
        return almacen.suscripciones.filter(
          (s) =>
            (!filtro.clienteId || s.clienteId === filtro.clienteId) &&
            (!filtro.planId || s.planId === filtro.planId) &&
            (!filtro.estado || s.estado === filtro.estado),
        );
      },
      async obtener(id) {
        return almacen.suscripciones.find((s) => s.id === id) ?? null;
      },
      async obtenerVigentePorClienteYPlan(clienteId, planId) {
        return (
          almacen.suscripciones.find(
            (s) => s.clienteId === clienteId && s.planId === planId && s.estado !== 'CANCELADA',
          ) ?? null
        );
      },
      async crear(suscripcion) {
        almacen.suscripciones.push(suscripcion);
      },
      async actualizar(suscripcion) {
        const i = almacen.suscripciones.findIndex((s) => s.id === suscripcion.id);
        if (i >= 0) almacen.suscripciones[i] = suscripcion;
      },
      async contarPorPlan(planId, soloVigentes) {
        return almacen.suscripciones.filter(
          (s) => s.planId === planId && (!soloVigentes || s.estado !== 'CANCELADA'),
        ).length;
      },
      async listarGenerables() {
        return almacen.suscripciones.filter((s) => s.estado !== 'CANCELADA');
      },
      async registrarPausa(pausa) {
        almacen.pausas.push(pausa);
      },
      async listarPausas(suscripcionId) {
        return almacen.pausas.filter((p) => p.suscripcionId === suscripcionId);
      },
      async registrarSalto(salto) {
        almacen.saltos.push(salto);
      },
      async obtenerSalto(suscripcionId, ciclo) {
        return (
          almacen.saltos.find((s) => s.suscripcionId === suscripcionId && s.ciclo === ciclo) ?? null
        );
      },
    },

    entregas: {
      async listar(filtro: FiltroEntregas = {}) {
        const deCliente = filtro.clienteId
          ? new Set(
              almacen.suscripciones
                .filter((s) => s.clienteId === filtro.clienteId)
                .map((s) => s.id),
            )
          : null;
        const porCiudad = filtro.ciudad
          ? new Set(
              almacen.suscripciones
                .filter((s) => normalizar(s.ciudad) === normalizar(filtro.ciudad!))
                .map((s) => s.id),
            )
          : null;

        return almacen.entregas
          .filter(
            (e) =>
              (!filtro.suscripcionId || e.suscripcionId === filtro.suscripcionId) &&
              (!deCliente || deCliente.has(e.suscripcionId)) &&
              (!porCiudad || porCiudad.has(e.suscripcionId)) &&
              (!filtro.fecha || e.fechaProgramada === filtro.fecha) &&
              (!filtro.desde || e.fechaProgramada >= filtro.desde) &&
              (!filtro.hasta || e.fechaProgramada <= filtro.hasta) &&
              (!filtro.planId || e.planId === filtro.planId) &&
              (!filtro.estado || e.estado === filtro.estado),
          )
          .sort((a, b) =>
            a.fechaProgramada === b.fechaProgramada
              ? a.ciclo - b.ciclo
              : a.fechaProgramada < b.fechaProgramada
                ? -1
                : 1,
          );
      },
      async obtener(id) {
        return almacen.entregas.find((e) => e.id === id) ?? null;
      },
      async obtenerPorCiclo(suscripcionId, ciclo) {
        return (
          almacen.entregas.find((e) => e.suscripcionId === suscripcionId && e.ciclo === ciclo) ??
          null
        );
      },
      async obtenerProgramada(suscripcionId) {
        return (
          almacen.entregas.find(
            (e) => e.suscripcionId === suscripcionId && e.estado === 'PROGRAMADA',
          ) ?? null
        );
      },
      async crear(entrega) {
        const duplicada = almacen.entregas.some(
          (e) => e.suscripcionId === entrega.suscripcionId && e.ciclo === entrega.ciclo,
        );
        if (duplicada) throw new Error('ya existe una entrega para ese ciclo');
        almacen.entregas.push(entrega);
      },
      async actualizar(entrega) {
        const i = almacen.entregas.findIndex((e) => e.id === entrega.id);
        if (i >= 0) almacen.entregas[i] = entrega;
      },
      async contarPorPlanEnFecha(fecha: FechaISO) {
        const agrupado = new Map<string, { cajas: number; bolsas: number }>();
        for (const entrega of almacen.entregas) {
          if (entrega.fechaProgramada !== fecha) continue;
          if (entrega.estado !== 'PROGRAMADA' && entrega.estado !== 'ARMADA') continue;
          const actual = agrupado.get(entrega.planId) ?? { cajas: 0, bolsas: 0 };
          actual.cajas += 1;
          actual.bolsas += entrega.bolsas;
          agrupado.set(entrega.planId, actual);
        }
        return [...agrupado.entries()].map(([planId, v]) => ({ planId, ...v }));
      },
      async contarPorEstado(estado: EstadoEntrega) {
        return almacen.entregas.filter((e) => e.estado === estado).length;
      },
    },

    cobros: {
      async listar(filtro: FiltroCobros = {}) {
        const deCliente = filtro.clienteId
          ? new Set(
              almacen.suscripciones
                .filter((s) => s.clienteId === filtro.clienteId)
                .map((s) => s.id),
            )
          : null;
        return almacen.cobros
          .filter(
            (c) =>
              (!filtro.suscripcionId || c.suscripcionId === filtro.suscripcionId) &&
              (!deCliente || deCliente.has(c.suscripcionId)) &&
              (!filtro.estado || c.estado === filtro.estado) &&
              (!filtro.desde || c.fecha >= filtro.desde) &&
              (!filtro.hasta || c.fecha <= filtro.hasta),
          )
          .sort((a, b) => (a.fecha === b.fecha ? b.ciclo - a.ciclo : a.fecha < b.fecha ? 1 : -1));
      },
      async obtener(id) {
        return almacen.cobros.find((c) => c.id === id) ?? null;
      },
      async obtenerPorCiclo(suscripcionId, ciclo) {
        return (
          almacen.cobros.find((c) => c.suscripcionId === suscripcionId && c.ciclo === ciclo) ?? null
        );
      },
      async crear(cobro) {
        almacen.cobros.push(cobro);
      },
      async actualizar(cobro) {
        const i = almacen.cobros.findIndex((c) => c.id === cobro.id);
        if (i >= 0) almacen.cobros[i] = cobro;
      },
      async sumarCobrado(desde, hasta) {
        return almacen.cobros
          .filter((c) => c.estado === 'COBRADO' && c.fecha >= desde && c.fecha <= hasta)
          .reduce((suma, c) => suma + c.monto, 0);
      },
    },

    cambiosDePlan: {
      async listar(filtro = {}) {
        return almacen.cambiosDePlan.filter(
          (c) =>
            (!filtro.suscripcionId || c.suscripcionId === filtro.suscripcionId) &&
            (!filtro.estado || c.estado === filtro.estado),
        );
      },
      async obtener(id) {
        return almacen.cambiosDePlan.find((c) => c.id === id) ?? null;
      },
      async obtenerPendiente(suscripcionId) {
        return (
          almacen.cambiosDePlan.find(
            (c) => c.suscripcionId === suscripcionId && c.estado === 'SOLICITADO',
          ) ?? null
        );
      },
      async crear(cambio) {
        almacen.cambiosDePlan.push(cambio);
      },
      async actualizar(cambio) {
        const i = almacen.cambiosDePlan.findIndex((c) => c.id === cambio.id);
        if (i >= 0) almacen.cambiosDePlan[i] = cambio;
      },
    },
  };
}

export function crearUnidadEnMemoria(almacen: Almacen = almacenVacio()): UnidadDeTrabajo & {
  almacen: Almacen;
} {
  const repos = crearRepositoriosEnMemoria(almacen);
  return {
    almacen,
    repos,
    async enTransaccion(trabajo) {
      const respaldo = copiar(almacen);
      try {
        return await trabajo(repos);
      } catch (error) {

        Object.assign(almacen, respaldo);
        throw error;
      }
    },
    async cerrar() {},
  };
}
