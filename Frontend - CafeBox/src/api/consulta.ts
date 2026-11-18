import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoConsulta = 'cargando' | 'listo' | 'vacio' | 'error';

export interface Consulta<T> {
  estado: EstadoConsulta;
  datos: T | null;
  error: unknown;

  recargar: () => void;

  refrescarEnSilencio: () => Promise<void>;
}

export interface OpcionesConsulta<T> {

  estaVacio?: (datos: T) => boolean;

  activa?: boolean;
}

function vacioPorOmision(datos: unknown): boolean {
  if (datos === null || datos === undefined) return true;
  if (Array.isArray(datos)) return datos.length === 0;
  return false;
}

export function useConsulta<T>(
  pedir: () => Promise<T>,
  dependencias: unknown[] = [],
  opciones: OpcionesConsulta<T> = {},
): Consulta<T> {
  const { estaVacio = vacioPorOmision, activa = true } = opciones;

  const [estado, setEstado] = useState<EstadoConsulta>(activa ? 'cargando' : 'listo');
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [intento, setIntento] = useState(0);

  const vigente = useRef(0);
  const pedirRef = useRef(pedir);
  pedirRef.current = pedir;

  const ejecutar = useCallback(
    async (mostrarCarga: boolean) => {
      if (!activa) return;
      const miTurno = ++vigente.current;
      if (mostrarCarga) setEstado('cargando');
      try {
        const resultado = await pedirRef.current();
        if (miTurno !== vigente.current) return;
        setDatos(resultado);
        setError(null);
        setEstado(estaVacio(resultado) ? 'vacio' : 'listo');
      } catch (falla) {
        if (miTurno !== vigente.current) return;
        setError(falla);
        setEstado('error');
      }
    },

    [activa],
  );

  useEffect(() => {
    void ejecutar(true);
    return () => {
      vigente.current += 1;
    };

  }, [...dependencias, intento, activa]);

  return {
    estado,
    datos,
    error,
    recargar: () => setIntento((n) => n + 1),
    refrescarEnSilencio: () => ejecutar(false),
  };
}

export interface Operacion<A extends unknown[], R> {
  ejecutar: (...argumentos: A) => Promise<R | undefined>;
  enCurso: boolean;
  error: unknown;
  limpiarError: () => void;
}

export function useOperacion<A extends unknown[], R>(
  operacion: (...argumentos: A) => Promise<R>,
): Operacion<A, R> {
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const operacionRef = useRef(operacion);
  operacionRef.current = operacion;

  const ejecutar = useCallback(async (...argumentos: A) => {
    setEnCurso(true);
    setError(null);
    try {
      return await operacionRef.current(...argumentos);
    } catch (falla) {
      setError(falla);
      return undefined;
    } finally {
      setEnCurso(false);
    }
  }, []);

  return { ejecutar, enCurso, error, limpiarError: () => setError(null) };
}
