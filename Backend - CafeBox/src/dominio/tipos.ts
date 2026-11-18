export type Frecuencia = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

export type EstadoSuscripcion = 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA' | 'CANCELADA';

export type EstadoEntrega = 'PROGRAMADA' | 'SALTADA' | 'ARMADA' | 'ENVIADA' | 'ENTREGADA';

export type EstadoCobro = 'PENDIENTE' | 'COBRADO' | 'FALLIDO' | 'CANCELADO';

export type EstadoCambioDePlan = 'SOLICITADO' | 'CONFIRMADO' | 'RECHAZADO';

export type Rol = 'ADMIN' | 'CLIENTE';

export type FechaISO = string;

export interface ZonaCobertura {
  ciudad: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string | null;
  telefono: string | null;

  pagoTitular: string | null;
  pagoUltimos4: string | null;
  creadoEn: string;
}

export interface Usuario {
  id: string;
  correo: string;
  contrasenaHash: string;
  rol: Rol;
  clienteId: string | null;
  creadoEn: string;
}

export interface Producto {
  id: string;
  nombre: string;
  origen: string;
  gramaje: number;
  precioUnitario: number;
  stockDisponible: number;
  activo: boolean;
}

export interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  productoId: string;
  bolsasPorEntrega: number;
  precioCiclo: number;
  frecuencia: Frecuencia;
  activo: boolean;
  retiradoEn: string | null;
}

export interface PlanConContenido extends Plan {
  producto: Pick<Producto, 'id' | 'nombre' | 'origen' | 'gramaje' | 'stockDisponible'>;
}

export interface Suscripcion {
  id: string;
  clienteId: string;
  planId: string;
  estado: EstadoSuscripcion;
  fechaInicio: FechaISO;

  diaEntregaPreferido: number;
  direccionEntrega: string;
  ciudad: string;

  ciclosGenerados: number;
  pausadaDesde: FechaISO | null;
  pausadaHasta: FechaISO | null;
  canceladaEn: string | null;
  omisionesConsecutivas: number;
  creadoEn: string;
}

export interface Entrega {
  id: string;
  suscripcionId: string;

  planId: string;
  ciclo: number;
  fechaProgramada: FechaISO;
  estado: EstadoEntrega;
  bolsas: number;
  motivoSalto: string | null;
  armadaEn: string | null;
  enviadaEn: string | null;
  entregadaEn: string | null;
  creadoEn: string;
}

export interface Cobro {
  id: string;
  suscripcionId: string;
  entregaId: string | null;
  ciclo: number;
  monto: number;
  estado: EstadoCobro;
  fecha: FechaISO;
  motivoFallo: string | null;
  creadoEn: string;
}

export interface Pausa {
  id: string;
  suscripcionId: string;
  desde: FechaISO;
  hasta: FechaISO;
  creadoEn: string;
}

export interface Salto {
  id: string;
  suscripcionId: string;
  ciclo: number;
  creadoEn: string;
}

export interface CambioDePlan {
  id: string;
  suscripcionId: string;
  planAnteriorId: string;
  planNuevoId: string;
  cicloAplica: number;
  estado: EstadoCambioDePlan;
  solicitadoEn: string;
  resueltoEn: string | null;
}

export interface Identidad {
  usuarioId: string;
  rol: Rol;
  clienteId: string | null;
  correo: string;
}
