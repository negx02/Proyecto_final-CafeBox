import type {
  EstadoCobro,
  EstadoEntrega,
  EstadoSuscripcion,
  FechaISO,
  Frecuencia,
} from '../api/tipos';

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function aFechaLocal(fecha: FechaISO): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function fechaLarga(fecha: FechaISO): string {
  return aFechaLocal(fecha).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function fechaCorta(fecha: FechaISO): string {
  return aFechaLocal(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function fechaConAnio(fecha: FechaISO): string {
  return aFechaLocal(fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function marcaDeTiempo(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function hoyISO(): FechaISO {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

export function sumarDiasISO(fecha: FechaISO, dias: number): FechaISO {
  const base = aFechaLocal(fecha);
  base.setDate(base.getDate() + dias);
  const mes = String(base.getMonth() + 1).padStart(2, '0');
  const dia = String(base.getDate()).padStart(2, '0');
  return `${base.getFullYear()}-${mes}-${dia}`;
}

export function cuandoFalta(fecha: FechaISO): string {
  const dias = Math.round(
    (aFechaLocal(fecha).getTime() - aFechaLocal(hoyISO()).getTime()) / 86_400_000,
  );
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  if (dias > 1) return `en ${dias} días`;
  return `hace ${Math.abs(dias)} días`;
}

export function dinero(monto: number): string {
  return monto.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function nombreDelDia(dia: number): string {
  return DIAS[dia - 1] ?? '—';
}

export const DIAS_DE_LA_SEMANA = DIAS.map((nombre, indice) => ({ valor: indice + 1, nombre }));

export const TEXTO_FRECUENCIA: Record<Frecuencia, string> = {
  SEMANAL: 'cada semana',
  QUINCENAL: 'cada dos semanas',
  MENSUAL: 'cada mes',
};

export const TEXTO_ESTADO_SUSCRIPCION: Record<EstadoSuscripcion, string> = {
  ACTIVA: 'Activa',
  PAUSADA: 'Pausada',
  SUSPENDIDA: 'Suspendida',
  CANCELADA: 'Cancelada',
};

export const TEXTO_ESTADO_ENTREGA: Record<EstadoEntrega | 'PREVISTA', string> = {
  PREVISTA: 'Prevista',
  PROGRAMADA: 'Programada',
  ARMADA: 'Armada',
  ENVIADA: 'En camino',
  ENTREGADA: 'Entregada',
  SALTADA: 'Saltada',
};

export const TEXTO_ESTADO_COBRO: Record<EstadoCobro, string> = {
  PENDIENTE: 'Pendiente',
  COBRADO: 'Pagado',
  FALLIDO: 'No se pudo cobrar',
  CANCELADO: 'No se cobró',
};

export function textoMotivoSalto(motivo: string | null): string {
  switch (motivo) {
    case 'PAUSA':
      return 'Tu suscripción estaba pausada';
    case 'SALTO_DEL_CLIENTE':
      return 'Pediste saltarte esta entrega';
    case 'CANCELACION':
      return 'Cancelaste la suscripción';
    default:
      return 'Esta entrega no se armó';
  }
}
