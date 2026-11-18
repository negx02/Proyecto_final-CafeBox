export type Frecuencia = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
export type EstadoSuscripcion = 'ACTIVA' | 'PAUSADA' | 'SUSPENDIDA' | 'CANCELADA';
export type EstadoEntrega = 'PROGRAMADA' | 'SALTADA' | 'ARMADA' | 'ENVIADA' | 'ENTREGADA';
export type EstadoCobro = 'PENDIENTE' | 'COBRADO' | 'FALLIDO' | 'CANCELADO';
export type EstadoCambioDePlan = 'SOLICITADO' | 'CONFIRMADO' | 'RECHAZADO';
export type Rol = 'ADMIN' | 'CLIENTE';

export type FechaISO = string;

export interface Producto {
  id: string;
  nombre: string;
  origen: string;
  gramaje: number;
  stockDisponible: number;
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
  producto: Producto;
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
  rol: Rol;
  clienteId: string | null;
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

export interface EntregaConDetalle extends Entrega {
  plan: { id: string; nombre: string; frecuencia: Frecuencia } | null;
  ciudad: string | null;
  direccionEntrega: string | null;
  cobro: { id: string; estado: EstadoCobro; monto: number } | null;
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

export interface CobroConDetalle extends Cobro {
  plan: { id: string; nombre: string } | null;
  entrega: { id: string; fechaProgramada: FechaISO; estado: EstadoEntrega } | null;
}

export interface Pausa {
  id: string;
  suscripcionId: string;
  desde: FechaISO;
  hasta: FechaISO;
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
  plan: {
    id: string;
    nombre: string;
    precioCiclo: number;
    frecuencia: Frecuencia;
    bolsasPorEntrega: number;
  } | null;
  cliente: { id: string; nombre: string; ciudad: string } | null;
  proximaEntrega: {
    id: string;
    ciclo: number;
    fechaProgramada: FechaISO;
    estado: EstadoEntrega;
  } | null;
}

export interface SuscripcionConHistorial extends Suscripcion {
  entregas: Entrega[];
  cobros: Cobro[];
  cambiosDePlan: CambioDePlan[];
  pausas: Pausa[];
}

export interface RenglonDeCalendario {
  ciclo: number;
  fechaProgramada: FechaISO;
  estado: EstadoEntrega | 'PREVISTA';
  entregaId: string | null;
  motivoSalto: string | null;
}

export interface Sesion {
  credencial: string;
  expiraEn: string;
  usuario: Usuario;
  cliente: Cliente | null;
}

export interface Perfil {
  usuario: Usuario;
  cliente: Cliente | null;
}

export interface ResultadoContratacion {
  suscripcion: Suscripcion;
  primeraEntrega: Entrega | null;
  cobro: Cobro | null;
}

export interface ResultadoSalto {
  cicloSaltado: number;
  siguienteFecha: FechaISO | null;
  suscripcion: Suscripcion;
}

export interface ResultadoPausa {
  suscripcion: Suscripcion;
  entregaLiberada: Entrega | null;
}

export interface ResultadoCambioDePlan {
  cambio: CambioDePlan;
  aplicaDesdeElCiclo: number;
  fechaDeEseCiclo: FechaISO;
  pagaraPorCiclo: number;
}

export interface ResultadoCancelacion {
  suscripcion: Suscripcion;
  ultimaEntrega: Entrega | null;
}
