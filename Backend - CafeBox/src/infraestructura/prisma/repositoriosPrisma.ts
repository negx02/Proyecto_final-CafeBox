import type { Prisma, PrismaClient } from '@prisma/client';

import type { Repositorios } from '../../dominio/puertos.js';
import type {
  CambioDePlan,
  Cliente,
  Cobro,
  Entrega,
  Pausa,
  Plan,
  Producto,
  Salto,
  Suscripcion,
  Usuario,
} from '../../dominio/tipos.js';

export type ClientePrisma = PrismaClient | Prisma.TransactionClient;

const aFecha = (valor: Date): string => valor.toISOString().slice(0, 10);

const deFecha = (valor: string): Date => new Date(`${valor}T00:00:00.000Z`);

const aMarca = (valor: Date): string => valor.toISOString();
const deMarca = (valor: string): Date => new Date(valor);

const aNumero = (valor: Prisma.Decimal | number): number => Number(valor);

type FilaCliente = Prisma.ClienteGetPayload<object>;
type FilaUsuario = Prisma.UsuarioGetPayload<object>;
type FilaProducto = Prisma.ProductoGetPayload<object>;
type FilaPlan = Prisma.PlanGetPayload<object>;
type FilaSuscripcion = Prisma.SuscripcionGetPayload<object>;
type FilaEntrega = Prisma.EntregaGetPayload<object>;
type FilaCobro = Prisma.CobroGetPayload<object>;
type FilaPausa = Prisma.PausaGetPayload<object>;
type FilaSalto = Prisma.SaltoGetPayload<object>;
type FilaCambio = Prisma.CambioDePlanGetPayload<object>;

const aCliente = (f: FilaCliente): Cliente => ({
  id: f.id,
  nombre: f.nombre,
  ciudad: f.ciudad,
  direccion: f.direccion,
  telefono: f.telefono,
  pagoTitular: f.pagoTitular,
  pagoUltimos4: f.pagoUltimos4,
  creadoEn: aMarca(f.creadoEn),
});

const aUsuario = (f: FilaUsuario): Usuario => ({
  id: f.id,
  correo: f.correo,
  contrasenaHash: f.contrasenaHash,
  rol: f.rol as Usuario['rol'],
  clienteId: f.clienteId,
  creadoEn: aMarca(f.creadoEn),
});

const aProducto = (f: FilaProducto): Producto => ({
  id: f.id,
  nombre: f.nombre,
  origen: f.origen,
  gramaje: f.gramaje,
  precioUnitario: aNumero(f.precioUnitario),
  stockDisponible: f.stockDisponible,
  activo: f.activo,
});

const aPlan = (f: FilaPlan): Plan => ({
  id: f.id,
  nombre: f.nombre,
  descripcion: f.descripcion,
  productoId: f.productoId,
  bolsasPorEntrega: f.bolsasPorEntrega,
  precioCiclo: aNumero(f.precioCiclo),
  frecuencia: f.frecuencia as Plan['frecuencia'],
  activo: f.activo,
  retiradoEn: f.retiradoEn ? aMarca(f.retiradoEn) : null,
});

const aSuscripcion = (f: FilaSuscripcion): Suscripcion => ({
  id: f.id,
  clienteId: f.clienteId,
  planId: f.planId,
  estado: f.estado as Suscripcion['estado'],
  fechaInicio: aFecha(f.fechaInicio),
  diaEntregaPreferido: f.diaEntregaPreferido,
  direccionEntrega: f.direccionEntrega,
  ciudad: f.ciudad,
  ciclosGenerados: f.ciclosGenerados,
  pausadaDesde: f.pausadaDesde ? aFecha(f.pausadaDesde) : null,
  pausadaHasta: f.pausadaHasta ? aFecha(f.pausadaHasta) : null,
  canceladaEn: f.canceladaEn ? aMarca(f.canceladaEn) : null,
  omisionesConsecutivas: f.omisionesConsecutivas,
  creadoEn: aMarca(f.creadoEn),
});

const aEntrega = (f: FilaEntrega): Entrega => ({
  id: f.id,
  suscripcionId: f.suscripcionId,
  planId: f.planId,
  ciclo: f.ciclo,
  fechaProgramada: aFecha(f.fechaProgramada),
  estado: f.estado as Entrega['estado'],
  bolsas: f.bolsas,
  motivoSalto: f.motivoSalto,
  armadaEn: f.armadaEn ? aMarca(f.armadaEn) : null,
  enviadaEn: f.enviadaEn ? aMarca(f.enviadaEn) : null,
  entregadaEn: f.entregadaEn ? aMarca(f.entregadaEn) : null,
  creadoEn: aMarca(f.creadoEn),
});

const aCobro = (f: FilaCobro): Cobro => ({
  id: f.id,
  suscripcionId: f.suscripcionId,
  entregaId: f.entregaId,
  ciclo: f.ciclo,
  monto: aNumero(f.monto),
  estado: f.estado as Cobro['estado'],
  fecha: aFecha(f.fecha),
  motivoFallo: f.motivoFallo,
  creadoEn: aMarca(f.creadoEn),
});

const aPausa = (f: FilaPausa): Pausa => ({
  id: f.id,
  suscripcionId: f.suscripcionId,
  desde: aFecha(f.desde),
  hasta: aFecha(f.hasta),
  creadoEn: aMarca(f.creadoEn),
});

const aSalto = (f: FilaSalto): Salto => ({
  id: f.id,
  suscripcionId: f.suscripcionId,
  ciclo: f.ciclo,
  creadoEn: aMarca(f.creadoEn),
});

const aCambio = (f: FilaCambio): CambioDePlan => ({
  id: f.id,
  suscripcionId: f.suscripcionId,
  planAnteriorId: f.planAnteriorId,
  planNuevoId: f.planNuevoId,
  cicloAplica: f.cicloAplica,
  estado: f.estado as CambioDePlan['estado'],
  solicitadoEn: aMarca(f.solicitadoEn),
  resueltoEn: f.resueltoEn ? aMarca(f.resueltoEn) : null,
});

export function crearRepositoriosPrisma(bd: ClientePrisma): Repositorios {
  return {
    zonas: {
      async listar() {
        const encontradas = await bd.zonaCobertura.findMany({ orderBy: { ciudad: 'asc' } });
        return encontradas.map((z) => z.ciudad);
      },
      async tieneCobertura(ciudad) {

        const encontrada = await bd.zonaCobertura.findFirst({
          where: { ciudad: ciudad.trim() },
        });
        return encontrada !== null;
      },
      async agregar(ciudad) {
        await bd.zonaCobertura.create({ data: { ciudad: ciudad.trim() } });
      },
      async quitar(ciudad) {
        const borradas = await bd.zonaCobertura.deleteMany({ where: { ciudad: ciudad.trim() } });
        return borradas.count > 0;
      },
    },

    clientes: {
      async obtener(id) {
        const fila = await bd.cliente.findUnique({ where: { id } });
        return fila ? aCliente(fila) : null;
      },
      async crear(c) {
        await bd.cliente.create({
          data: {
            id: c.id,
            nombre: c.nombre,
            ciudad: c.ciudad,
            direccion: c.direccion,
            telefono: c.telefono,
            pagoTitular: c.pagoTitular,
            pagoUltimos4: c.pagoUltimos4,
            creadoEn: deMarca(c.creadoEn),
          },
        });
      },
      async actualizar(c) {
        await bd.cliente.update({
          where: { id: c.id },
          data: {
            nombre: c.nombre,
            ciudad: c.ciudad,
            direccion: c.direccion,
            telefono: c.telefono,
            pagoTitular: c.pagoTitular,
            pagoUltimos4: c.pagoUltimos4,
          },
        });
      },
    },

    usuarios: {
      async obtener(id) {
        const fila = await bd.usuario.findUnique({ where: { id } });
        return fila ? aUsuario(fila) : null;
      },
      async obtenerPorCorreo(correo) {
        const fila = await bd.usuario.findUnique({
          where: { correo: correo.trim().toLowerCase() },
        });
        return fila ? aUsuario(fila) : null;
      },
      async crear(u) {
        await bd.usuario.create({
          data: {
            id: u.id,
            correo: u.correo.trim().toLowerCase(),
            contrasenaHash: u.contrasenaHash,
            rol: u.rol,
            clienteId: u.clienteId,
            creadoEn: deMarca(u.creadoEn),
          },
        });
      },
    },

    productos: {
      async listar() {
        return (await bd.producto.findMany({ orderBy: { nombre: 'asc' } })).map(aProducto);
      },
      async obtener(id) {
        const fila = await bd.producto.findUnique({ where: { id } });
        return fila ? aProducto(fila) : null;
      },
      async crear(p) {
        await bd.producto.create({
          data: {
            id: p.id,
            nombre: p.nombre,
            origen: p.origen,
            gramaje: p.gramaje,
            precioUnitario: p.precioUnitario,
            stockDisponible: p.stockDisponible,
            activo: p.activo,
          },
        });
      },
      async actualizarStock(id, stockDisponible) {

        await bd.producto.update({ where: { id }, data: { stockDisponible } });
      },
    },

    planes: {
      async listar(filtro = {}) {
        const encontrados = await bd.plan.findMany({
          where: filtro.soloActivos ? { activo: true } : undefined,
          orderBy: { precioCiclo: 'asc' },
        });
        return encontrados.map(aPlan);
      },
      async obtener(id) {
        const fila = await bd.plan.findUnique({ where: { id } });
        return fila ? aPlan(fila) : null;
      },
      async crear(p) {
        await bd.plan.create({
          data: {
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion,
            productoId: p.productoId,
            bolsasPorEntrega: p.bolsasPorEntrega,
            precioCiclo: p.precioCiclo,
            frecuencia: p.frecuencia,
            activo: p.activo,
            retiradoEn: p.retiradoEn ? deMarca(p.retiradoEn) : null,
          },
        });
      },
      async actualizar(p) {
        await bd.plan.update({
          where: { id: p.id },
          data: {
            nombre: p.nombre,
            descripcion: p.descripcion,
            productoId: p.productoId,
            bolsasPorEntrega: p.bolsasPorEntrega,
            precioCiclo: p.precioCiclo,
            frecuencia: p.frecuencia,
            activo: p.activo,
            retiradoEn: p.retiradoEn ? deMarca(p.retiradoEn) : null,
          },
        });
      },
    },

    suscripciones: {
      async listar(filtro = {}) {
        const encontradas = await bd.suscripcion.findMany({
          where: {
            clienteId: filtro.clienteId,
            planId: filtro.planId,
            estado: filtro.estado,
          },
          orderBy: { creadoEn: 'desc' },
        });
        return encontradas.map(aSuscripcion);
      },
      async obtener(id) {
        const fila = await bd.suscripcion.findUnique({ where: { id } });
        return fila ? aSuscripcion(fila) : null;
      },
      async obtenerVigentePorClienteYPlan(clienteId, planId) {
        const fila = await bd.suscripcion.findFirst({
          where: { clienteId, planId, estado: { not: 'CANCELADA' } },
        });
        return fila ? aSuscripcion(fila) : null;
      },
      async crear(s) {
        await bd.suscripcion.create({
          data: {
            id: s.id,
            clienteId: s.clienteId,
            planId: s.planId,
            estado: s.estado,
            fechaInicio: deFecha(s.fechaInicio),
            diaEntregaPreferido: s.diaEntregaPreferido,
            direccionEntrega: s.direccionEntrega,
            ciudad: s.ciudad,
            ciclosGenerados: s.ciclosGenerados,
            pausadaDesde: s.pausadaDesde ? deFecha(s.pausadaDesde) : null,
            pausadaHasta: s.pausadaHasta ? deFecha(s.pausadaHasta) : null,
            canceladaEn: s.canceladaEn ? deMarca(s.canceladaEn) : null,
            omisionesConsecutivas: s.omisionesConsecutivas,
            creadoEn: deMarca(s.creadoEn),
          },
        });
      },
      async actualizar(s) {
        await bd.suscripcion.update({
          where: { id: s.id },
          data: {
            planId: s.planId,
            estado: s.estado,
            fechaInicio: deFecha(s.fechaInicio),
            diaEntregaPreferido: s.diaEntregaPreferido,
            direccionEntrega: s.direccionEntrega,
            ciudad: s.ciudad,
            ciclosGenerados: s.ciclosGenerados,
            pausadaDesde: s.pausadaDesde ? deFecha(s.pausadaDesde) : null,
            pausadaHasta: s.pausadaHasta ? deFecha(s.pausadaHasta) : null,
            canceladaEn: s.canceladaEn ? deMarca(s.canceladaEn) : null,
            omisionesConsecutivas: s.omisionesConsecutivas,
          },
        });
      },
      async contarPorPlan(planId, soloVigentes) {
        return bd.suscripcion.count({
          where: { planId, ...(soloVigentes ? { estado: { not: 'CANCELADA' } } : {}) },
        });
      },
      async listarGenerables() {
        const encontradas = await bd.suscripcion.findMany({
          where: { estado: { not: 'CANCELADA' } },
          orderBy: { creadoEn: 'asc' },
        });
        return encontradas.map(aSuscripcion);
      },
      async registrarPausa(p) {
        await bd.pausa.create({
          data: {
            id: p.id,
            suscripcionId: p.suscripcionId,
            desde: deFecha(p.desde),
            hasta: deFecha(p.hasta),
            creadoEn: deMarca(p.creadoEn),
          },
        });
      },
      async listarPausas(suscripcionId) {
        const encontradas = await bd.pausa.findMany({
          where: { suscripcionId },
          orderBy: { desde: 'asc' },
        });
        return encontradas.map(aPausa);
      },
      async registrarSalto(s) {
        await bd.salto.create({
          data: {
            id: s.id,
            suscripcionId: s.suscripcionId,
            ciclo: s.ciclo,
            creadoEn: deMarca(s.creadoEn),
          },
        });
      },
      async obtenerSalto(suscripcionId, ciclo) {
        const fila = await bd.salto.findUnique({
          where: { suscripcionId_ciclo: { suscripcionId, ciclo } },
        });
        return fila ? aSalto(fila) : null;
      },
    },

    entregas: {
      async listar(filtro = {}) {
        const donde: Prisma.EntregaWhereInput = {
          suscripcionId: filtro.suscripcionId,
          planId: filtro.planId,
          estado: filtro.estado,
        };

        if (filtro.fecha) {
          donde.fechaProgramada = deFecha(filtro.fecha);
        } else if (filtro.desde || filtro.hasta) {
          donde.fechaProgramada = {
            ...(filtro.desde ? { gte: deFecha(filtro.desde) } : {}),
            ...(filtro.hasta ? { lte: deFecha(filtro.hasta) } : {}),
          };
        }

        if (filtro.clienteId || filtro.ciudad) {
          donde.suscripcion = {
            ...(filtro.clienteId ? { clienteId: filtro.clienteId } : {}),
            ...(filtro.ciudad ? { ciudad: filtro.ciudad } : {}),
          };
        }

        const encontradas = await bd.entrega.findMany({
          where: donde,
          orderBy: [{ fechaProgramada: 'asc' }, { ciclo: 'asc' }],
        });
        return encontradas.map(aEntrega);
      },
      async obtener(id) {
        const fila = await bd.entrega.findUnique({ where: { id } });
        return fila ? aEntrega(fila) : null;
      },
      async obtenerPorCiclo(suscripcionId, ciclo) {
        const fila = await bd.entrega.findUnique({
          where: { suscripcionId_ciclo: { suscripcionId, ciclo } },
        });
        return fila ? aEntrega(fila) : null;
      },
      async obtenerProgramada(suscripcionId) {
        const fila = await bd.entrega.findFirst({
          where: { suscripcionId, estado: 'PROGRAMADA' },
        });
        return fila ? aEntrega(fila) : null;
      },
      async crear(e) {
        await bd.entrega.create({
          data: {
            id: e.id,
            suscripcionId: e.suscripcionId,
            planId: e.planId,
            ciclo: e.ciclo,
            fechaProgramada: deFecha(e.fechaProgramada),
            estado: e.estado,
            bolsas: e.bolsas,
            motivoSalto: e.motivoSalto,
            armadaEn: e.armadaEn ? deMarca(e.armadaEn) : null,
            enviadaEn: e.enviadaEn ? deMarca(e.enviadaEn) : null,
            entregadaEn: e.entregadaEn ? deMarca(e.entregadaEn) : null,
            creadoEn: deMarca(e.creadoEn),
          },
        });
      },
      async actualizar(e) {
        await bd.entrega.update({
          where: { id: e.id },
          data: {
            estado: e.estado,
            bolsas: e.bolsas,
            motivoSalto: e.motivoSalto,
            fechaProgramada: deFecha(e.fechaProgramada),
            armadaEn: e.armadaEn ? deMarca(e.armadaEn) : null,
            enviadaEn: e.enviadaEn ? deMarca(e.enviadaEn) : null,
            entregadaEn: e.entregadaEn ? deMarca(e.entregadaEn) : null,
          },
        });
      },
      async contarPorPlanEnFecha(fechaPedida) {
        const agrupado = await bd.entrega.groupBy({
          by: ['planId'],
          where: {
            fechaProgramada: deFecha(fechaPedida),
            estado: { in: ['PROGRAMADA', 'ARMADA'] },
          },
          _count: { _all: true },
          _sum: { bolsas: true },
        });
        return agrupado.map((fila) => ({
          planId: fila.planId,
          cajas: fila._count._all,
          bolsas: fila._sum.bolsas ?? 0,
        }));
      },
      async contarPorEstado(estado) {
        return bd.entrega.count({ where: { estado } });
      },
    },

    cobros: {
      async listar(filtro = {}) {
        const encontrados = await bd.cobro.findMany({
          where: {
            suscripcionId: filtro.suscripcionId,
            estado: filtro.estado,
            ...(filtro.desde || filtro.hasta
              ? {
                  fecha: {
                    ...(filtro.desde ? { gte: deFecha(filtro.desde) } : {}),
                    ...(filtro.hasta ? { lte: deFecha(filtro.hasta) } : {}),
                  },
                }
              : {}),
            ...(filtro.clienteId ? { suscripcion: { clienteId: filtro.clienteId } } : {}),
          },
          orderBy: [{ fecha: 'desc' }, { ciclo: 'desc' }],
        });
        return encontrados.map(aCobro);
      },
      async obtener(id) {
        const fila = await bd.cobro.findUnique({ where: { id } });
        return fila ? aCobro(fila) : null;
      },
      async obtenerPorCiclo(suscripcionId, ciclo) {
        const fila = await bd.cobro.findUnique({
          where: { suscripcionId_ciclo: { suscripcionId, ciclo } },
        });
        return fila ? aCobro(fila) : null;
      },
      async crear(c) {
        await bd.cobro.create({
          data: {
            id: c.id,
            suscripcionId: c.suscripcionId,
            entregaId: c.entregaId,
            ciclo: c.ciclo,
            monto: c.monto,
            estado: c.estado,
            fecha: deFecha(c.fecha),
            motivoFallo: c.motivoFallo,
            creadoEn: deMarca(c.creadoEn),
          },
        });
      },
      async actualizar(c) {
        await bd.cobro.update({
          where: { id: c.id },
          data: {
            estado: c.estado,
            fecha: deFecha(c.fecha),
            motivoFallo: c.motivoFallo,
            monto: c.monto,
          },
        });
      },
      async sumarCobrado(desde, hasta) {
        const suma = await bd.cobro.aggregate({
          _sum: { monto: true },
          where: {
            estado: 'COBRADO',
            fecha: { gte: deFecha(desde), lte: deFecha(hasta) },
          },
        });
        return suma._sum.monto ? aNumero(suma._sum.monto) : 0;
      },
    },

    cambiosDePlan: {
      async listar(filtro = {}) {
        const encontrados = await bd.cambioDePlan.findMany({
          where: { suscripcionId: filtro.suscripcionId, estado: filtro.estado },
          orderBy: { solicitadoEn: 'desc' },
        });
        return encontrados.map(aCambio);
      },
      async obtener(id) {
        const fila = await bd.cambioDePlan.findUnique({ where: { id } });
        return fila ? aCambio(fila) : null;
      },
      async obtenerPendiente(suscripcionId) {
        const fila = await bd.cambioDePlan.findFirst({
          where: { suscripcionId, estado: 'SOLICITADO' },
        });
        return fila ? aCambio(fila) : null;
      },
      async crear(c) {
        await bd.cambioDePlan.create({
          data: {
            id: c.id,
            suscripcionId: c.suscripcionId,
            planAnteriorId: c.planAnteriorId,
            planNuevoId: c.planNuevoId,
            cicloAplica: c.cicloAplica,
            estado: c.estado,
            solicitadoEn: deMarca(c.solicitadoEn),
            resueltoEn: c.resueltoEn ? deMarca(c.resueltoEn) : null,
          },
        });
      },
      async actualizar(c) {
        await bd.cambioDePlan.update({
          where: { id: c.id },
          data: {
            cicloAplica: c.cicloAplica,
            estado: c.estado,
            resueltoEn: c.resueltoEn ? deMarca(c.resueltoEn) : null,
          },
        });
      },
    },
  };
}
