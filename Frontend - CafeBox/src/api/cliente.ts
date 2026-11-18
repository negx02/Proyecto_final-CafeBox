import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

import { ErrorDeRed, ErrorDelServicio } from './errores';
import type {
  CobroConDetalle,
  EntregaConDetalle,
  EstadoCobro,
  EstadoEntrega,
  FechaISO,
  Perfil,
  Plan,
  RenglonDeCalendario,
  ResultadoCambioDePlan,
  ResultadoCancelacion,
  ResultadoContratacion,
  ResultadoPausa,
  ResultadoSalto,
  Sesion,
  Suscripcion,
  SuscripcionConHistorial,
} from './tipos';

declare module 'axios' {

  export interface AxiosRequestConfig {
    sinSesion?: boolean;
  }
}

const DIRECCION_DEL_SERVICIO = (
  import.meta.env.VITE_DIRECCION_SERVICIO ?? 'http://localhost:3000'
).replace(/\/$/, '');

const LLAVE_GUARDADA = 'cafebox.credencial';

let credencialActual: string | null = leerCredencialGuardada();
let avisarCredencialInvalida: (() => void) | null = null;

function leerCredencialGuardada(): string | null {
  try {
    return window.localStorage.getItem(LLAVE_GUARDADA);
  } catch {

    return null;
  }
}

export function guardarCredencial(credencial: string | null): void {
  credencialActual = credencial;
  try {
    if (credencial) window.localStorage.setItem(LLAVE_GUARDADA, credencial);
    else window.localStorage.removeItem(LLAVE_GUARDADA);
  } catch {}
}

export function credencialGuardada(): string | null {
  return credencialActual;
}

export function alPerderLaSesion(accion: () => void): void {
  avisarCredencialInvalida = accion;
}

const http: AxiosInstance = axios.create({
  baseURL: DIRECCION_DEL_SERVICIO,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  if (credencialActual && !config.sinSesion) {
    config.headers.Authorization = `Bearer ${credencialActual}`;
  }
  return config;
});

http.interceptors.response.use(
  (respuesta) => {
    const sobre = respuesta.data as { ok?: boolean; datos?: unknown };
    if (sobre?.ok === true) {

      respuesta.data = sobre.datos;
      return respuesta;
    }
    return Promise.reject(
      new ErrorDelServicio(
        respuesta.status,
        'RESPUESTA_INESPERADA',
        'El servicio respondió de una forma que el portal no entiende.',
      ),
    );
  },
  (falla: AxiosError) => {

    if (!falla.response) {
      const porTiempo = falla.code === 'ECONNABORTED' || falla.code === 'ETIMEDOUT';
      return Promise.reject(
        new ErrorDeRed(
          porTiempo
            ? 'El servicio tardó demasiado en responder. Vuelve a intentarlo.'
            : undefined,
        ),
      );
    }

    const { status, data } = falla.response;
    const sobre = data as
      | {
          ok: false;
          error: {
            codigo: string;
            mensaje: string;
            detalle?: unknown;
            campos?: { campo: string; mensaje: string }[];
          };
        }
      | undefined;

    const error =
      sobre && sobre.ok === false
        ? new ErrorDelServicio(
            status,
            sobre.error.codigo,
            sobre.error.mensaje,
            sobre.error.campos,
            sobre.error.detalle,
          )
        : new ErrorDelServicio(
            status,
            'RESPUESTA_INESPERADA',
            'El servicio respondió de una forma que el portal no entiende.',
          );

    if (status === 401 && !falla.config?.sinSesion && credencialActual) {
      guardarCredencial(null);
      avisarCredencialInvalida?.();
    }

    return Promise.reject(error);
  },
);

async function pedir<T>(ruta: string, configuracion: AxiosRequestConfig = {}): Promise<T> {
  const respuesta = await http.request<T>({ url: ruta, method: 'GET', ...configuracion });
  return respuesta.data;
}

export const api = {

  async salud() {
    return pedir<{ servicio: string; persistencia: string; hoy: FechaISO }>('/salud', {
      sinSesion: true,
    });
  },

  async registrar(datos: {
    correo: string;
    contrasena: string;
    nombre: string;
    ciudad: string;
    direccion?: string;
    telefono?: string;
  }) {
    return pedir<{ usuario: unknown; cliente: unknown }>('/usuarios', {
      method: 'POST',
      data: datos,
      sinSesion: true,
    });
  },

  async iniciarSesion(correo: string, contrasena: string) {
    return pedir<Sesion>('/sesiones', {
      method: 'POST',
      data: { correo, contrasena },
      sinSesion: true,
    });
  },

  async perfil() {
    return pedir<Perfil>('/perfil');
  },

  async actualizarPerfil(datos: {
    direccion?: string;
    telefono?: string;
    ciudad?: string;
    pagoTitular?: string;
    pagoUltimos4?: string;
  }) {
    return pedir<Perfil['cliente']>('/perfil', { method: 'PATCH', data: datos });
  },

  async planes() {
    return pedir<Plan[]>('/planes', { sinSesion: true });
  },

  async plan(id: string) {
    return pedir<Plan>(`/planes/${id}`, { sinSesion: true });
  },

  async zonasDeCobertura() {
    return pedir<string[]>('/zonas-cobertura', { sinSesion: true });
  },

  async contratar(datos: {
    planId: string;
    direccionEntrega: string;
    ciudad: string;
    diaEntregaPreferido: number;
  }) {
    return pedir<ResultadoContratacion>('/suscripciones', { method: 'POST', data: datos });
  },

  async misSuscripciones() {
    return pedir<Suscripcion[]>('/suscripciones');
  },

  async suscripcion(id: string) {
    return pedir<SuscripcionConHistorial>(`/suscripciones/${id}`);
  },

  async proximasEntregas(id: string, cuantas = 6) {
    return pedir<RenglonDeCalendario[]>(`/suscripciones/${id}/proximas-entregas`, {
      params: { cuantas },
    });
  },

  async pausar(id: string, desde: FechaISO, hasta: FechaISO) {
    return pedir<ResultadoPausa>(`/suscripciones/${id}/pausas`, {
      method: 'POST',
      data: { desde, hasta },
    });
  },

  async reanudar(id: string) {
    return pedir<Suscripcion>(`/suscripciones/${id}/pausas`, { method: 'DELETE' });
  },

  async saltarProximaEntrega(id: string) {
    return pedir<ResultadoSalto>(`/suscripciones/${id}/omisiones`, { method: 'POST' });
  },

  async pedirCambioDePlan(id: string, planNuevoId: string) {
    return pedir<ResultadoCambioDePlan>(`/suscripciones/${id}/cambios-de-plan`, {
      method: 'POST',
      data: { planNuevoId },
    });
  },

  async cancelar(id: string) {
    return pedir<ResultadoCancelacion>(`/suscripciones/${id}`, {
      method: 'PATCH',
      data: { estado: 'CANCELADA' },
    });
  },

  async misEntregas(filtro: { estado?: EstadoEntrega; desde?: FechaISO; hasta?: FechaISO } = {}) {
    return pedir<EntregaConDetalle[]>('/entregas', { params: filtro });
  },

  async entrega(id: string) {
    return pedir<EntregaConDetalle>(`/entregas/${id}`);
  },

  async misCobros(filtro: { estado?: EstadoCobro; suscripcionId?: string } = {}) {
    return pedir<CobroConDetalle[]>('/cobros', { params: filtro });
  },

  async reintentarCobro(id: string) {
    return pedir<{ cobro: CobroConDetalle; suscripcionReactivada: boolean }>(
      `/cobros/${id}/reintentos`,
      { method: 'POST' },
    );
  },
};

export { DIRECCION_DEL_SERVICIO };
