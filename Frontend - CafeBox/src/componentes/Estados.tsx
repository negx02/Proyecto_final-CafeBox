import type { ReactNode } from 'react';

import { ErrorDeRed, ErrorDelServicio, mensajeParaElUsuario, valeLaPenaReintentar } from '../api/errores';
import { Boton } from './ui';

export function Cargando({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-cafe-300 border-t-cafe-700" />
      <p className="text-sm text-cafe-600">{mensaje}</p>
    </div>
  );
}

export function CargandoLista({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-cafe-200 bg-white p-5">
          <div className="h-4 w-1/3 rounded bg-cafe-100" />
          <div className="mt-3 h-3 w-2/3 rounded bg-cafe-100" />
          <div className="mt-2 h-3 w-1/4 rounded bg-cafe-100" />
        </div>
      ))}
    </div>
  );
}

export function Vacio({
  titulo,
  motivo,
  accion,
  icono = '☕',
}: {
  titulo: string;
  motivo: string;
  accion?: ReactNode;
  icono?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-cafe-300 bg-crema-50 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cafe-100 text-2xl">
        <span aria-hidden="true">{icono}</span>
      </div>
      <h2 className="font-serif text-lg text-cafe-900">{titulo}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-cafe-600">{motivo}</p>
      {accion ? <div className="mt-6 flex justify-center">{accion}</div> : null}
    </div>
  );
}

export function ErrorDePantalla({
  error,
  reintentar,
  titulo,
}: {
  error: unknown;
  reintentar?: () => void;
  titulo?: string;
}) {
  const esDeRed = error instanceof ErrorDeRed;
  const esDelServidor = error instanceof ErrorDelServicio && error.estado >= 500;

  const encabezado =
    titulo ??
    (esDeRed
      ? 'No se pudo contactar el servicio'
      : esDelServidor
        ? 'El servicio tuvo un problema'
        : 'No se pudo cargar esta pantalla');

  return (
    <div
      className="rounded-2xl border border-rojo-200 bg-rojo-50 px-6 py-12 text-center"
      role="alert"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rojo-100 text-2xl">
        <span aria-hidden="true">{esDeRed ? '🔌' : '⚠️'}</span>
      </div>
      <h2 className="font-serif text-lg text-rojo-900">{encabezado}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-rojo-800">
        {mensajeParaElUsuario(error)}
      </p>
      {esDeRed ? (
        <p className="mx-auto mt-3 max-w-md text-xs text-rojo-700">
          Si estás probando el portal, revisa que el servicio esté encendido.
        </p>
      ) : null}
      {reintentar && valeLaPenaReintentar(error) ? (
        <div className="mt-6 flex justify-center">
          <Boton onClick={reintentar} variante="secundario">
            Volver a intentar
          </Boton>
        </div>
      ) : null}
    </div>
  );
}

export function AvisoDeError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p
      className="rounded-xl border border-rojo-200 bg-rojo-50 px-4 py-3 text-sm leading-relaxed text-rojo-800"
      role="alert"
    >
      {mensajeParaElUsuario(error)}
    </p>
  );
}

export function AvisoDeExito({ children }: { children: ReactNode }) {
  return (
    <p
      className="rounded-xl border border-verde-200 bg-verde-50 px-4 py-3 text-sm leading-relaxed text-verde-900"
      role="status"
    >
      {children}
    </p>
  );
}
