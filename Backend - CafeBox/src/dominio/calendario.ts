import type { FechaISO, Frecuencia } from './tipos.js';

const MS_POR_DIA = 86_400_000;

export function esFechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const fecha = new Date(Date.UTC(a, m - 1, d));
  return (
    fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
  );
}

function aUtc(fecha: FechaISO): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

function aIso(ms: number): FechaISO {
  return new Date(ms).toISOString().slice(0, 10);
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  return aIso(aUtc(fecha) + dias * MS_POR_DIA);
}

export function sumarMeses(fecha: FechaISO, meses: number): FechaISO {
  const [a, m, d] = fecha.split('-').map(Number);
  const total = m - 1 + meses;
  const anio = a + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;

  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return aIso(Date.UTC(anio, mes, Math.min(d, ultimoDia)));
}

export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / MS_POR_DIA);
}

export function diaDeLaSemana(fecha: FechaISO): number {
  const dia = new Date(aUtc(fecha)).getUTCDay();
  return dia === 0 ? 7 : dia;
}

export function proximoDiaDeLaSemana(desde: FechaISO, diaPreferido: number): FechaISO {
  const actual = diaDeLaSemana(desde);
  const avance = (diaPreferido - actual + 7) % 7;
  return sumarDias(desde, avance);
}

export function diaDeLaSemanaMasCercano(fecha: FechaISO, diaPreferido: number): FechaISO {
  const actual = diaDeLaSemana(fecha);
  const haciaAdelante = (diaPreferido - actual + 7) % 7;
  if (haciaAdelante === 0) return fecha;
  return haciaAdelante <= 3 ? sumarDias(fecha, haciaAdelante) : sumarDias(fecha, haciaAdelante - 7);
}

export function fechaAnterior(a: FechaISO, b: FechaISO): boolean {
  return aUtc(a) < aUtc(b);
}

export function fechaEnRango(fecha: FechaISO, desde: FechaISO, hasta: FechaISO): boolean {
  const f = aUtc(fecha);
  return f >= aUtc(desde) && f <= aUtc(hasta);
}

export function fechaDelCiclo(
  fechaInicio: FechaISO,
  diaEntregaPreferido: number,
  frecuencia: Frecuencia,
  ciclo: number,
): FechaISO {
  const primera = proximoDiaDeLaSemana(fechaInicio, diaEntregaPreferido);
  if (ciclo <= 1) return primera;

  switch (frecuencia) {
    case 'SEMANAL':
      return sumarDias(primera, 7 * (ciclo - 1));
    case 'QUINCENAL':
      return sumarDias(primera, 14 * (ciclo - 1));
    case 'MENSUAL': {
      const mismoDiaDelMes = sumarMeses(primera, ciclo - 1);
      return diaDeLaSemanaMasCercano(mismoDiaDelMes, diaEntregaPreferido);
    }
  }
}

export const DIAS_SEMANA = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const;

export function nombreDelDia(dia: number): string {
  return DIAS_SEMANA[dia - 1] ?? 'desconocido';
}

export const DESCRIPCION_FRECUENCIA: Record<Frecuencia, string> = {
  SEMANAL: 'cada semana',
  QUINCENAL: 'cada dos semanas',
  MENSUAL: 'cada mes',
};
