import type {
  CambioDePlan,
  Cliente,
  Cobro,
  Entrega,
  EstadoCobro,
  EstadoEntrega,
  EstadoSuscripcion,
  FechaISO,
  Pausa,
  Plan,
  Producto,
  Salto,
  Suscripcion,
  Usuario,
} from './tipos.js';

export interface RepositorioZonas {
  listar(): Promise<string[]>;
  tieneCobertura(ciudad: string): Promise<boolean>;
  agregar(ciudad: string): Promise<void>;
  quitar(ciudad: string): Promise<boolean>;
}

export interface RepositorioClientes {
  obtener(id: string): Promise<Cliente | null>;
  crear(cliente: Cliente): Promise<void>;
  actualizar(cliente: Cliente): Promise<void>;
}

export interface RepositorioUsuarios {
  obtener(id: string): Promise<Usuario | null>;
  obtenerPorCorreo(correo: string): Promise<Usuario | null>;
  crear(usuario: Usuario): Promise<void>;
}

export interface RepositorioProductos {
  listar(): Promise<Producto[]>;
  obtener(id: string): Promise<Producto | null>;
  crear(producto: Producto): Promise<void>;
  actualizarStock(id: string, stockDisponible: number): Promise<void>;
}

export interface FiltroPlanes {
  soloActivos?: boolean;
}

export interface RepositorioPlanes {
  listar(filtro?: FiltroPlanes): Promise<Plan[]>;
  obtener(id: string): Promise<Plan | null>;
  crear(plan: Plan): Promise<void>;
  actualizar(plan: Plan): Promise<void>;
}

export interface FiltroSuscripciones {
  clienteId?: string;
  planId?: string;
  estado?: EstadoSuscripcion;
}

export interface RepositorioSuscripciones {
  listar(filtro?: FiltroSuscripciones): Promise<Suscripcion[]>;
  obtener(id: string): Promise<Suscripcion | null>;

  obtenerVigentePorClienteYPlan(clienteId: string, planId: string): Promise<Suscripcion | null>;
  crear(suscripcion: Suscripcion): Promise<void>;
  actualizar(suscripcion: Suscripcion): Promise<void>;
  contarPorPlan(planId: string, soloVigentes: boolean): Promise<number>;

  listarGenerables(): Promise<Suscripcion[]>;

  registrarPausa(pausa: Pausa): Promise<void>;
  listarPausas(suscripcionId: string): Promise<Pausa[]>;
  registrarSalto(salto: Salto): Promise<void>;
  obtenerSalto(suscripcionId: string, ciclo: number): Promise<Salto | null>;
}

export interface FiltroEntregas {
  suscripcionId?: string;
  clienteId?: string;
  fecha?: FechaISO;
  desde?: FechaISO;
  hasta?: FechaISO;
  ciudad?: string;
  planId?: string;
  estado?: EstadoEntrega;
}

export interface RepositorioEntregas {
  listar(filtro?: FiltroEntregas): Promise<Entrega[]>;
  obtener(id: string): Promise<Entrega | null>;
  obtenerPorCiclo(suscripcionId: string, ciclo: number): Promise<Entrega | null>;
  obtenerProgramada(suscripcionId: string): Promise<Entrega | null>;
  crear(entrega: Entrega): Promise<void>;
  actualizar(entrega: Entrega): Promise<void>;

  contarPorPlanEnFecha(
    fecha: FechaISO,
  ): Promise<{ planId: string; cajas: number; bolsas: number }[]>;
  contarPorEstado(estado: EstadoEntrega): Promise<number>;
}

export interface FiltroCobros {
  suscripcionId?: string;
  clienteId?: string;
  estado?: EstadoCobro;
  desde?: FechaISO;
  hasta?: FechaISO;
}

export interface RepositorioCobros {
  listar(filtro?: FiltroCobros): Promise<Cobro[]>;
  obtener(id: string): Promise<Cobro | null>;
  obtenerPorCiclo(suscripcionId: string, ciclo: number): Promise<Cobro | null>;
  crear(cobro: Cobro): Promise<void>;
  actualizar(cobro: Cobro): Promise<void>;
  sumarCobrado(desde: FechaISO, hasta: FechaISO): Promise<number>;
}

export interface RepositorioCambiosDePlan {
  listar(filtro?: { suscripcionId?: string; estado?: CambioDePlan['estado'] }): Promise<CambioDePlan[]>;
  obtener(id: string): Promise<CambioDePlan | null>;
  obtenerPendiente(suscripcionId: string): Promise<CambioDePlan | null>;
  crear(cambio: CambioDePlan): Promise<void>;
  actualizar(cambio: CambioDePlan): Promise<void>;
}

export interface Repositorios {
  zonas: RepositorioZonas;
  clientes: RepositorioClientes;
  usuarios: RepositorioUsuarios;
  productos: RepositorioProductos;
  planes: RepositorioPlanes;
  suscripciones: RepositorioSuscripciones;
  entregas: RepositorioEntregas;
  cobros: RepositorioCobros;
  cambiosDePlan: RepositorioCambiosDePlan;
}

export interface UnidadDeTrabajo {

  readonly repos: Repositorios;

  enTransaccion<T>(trabajo: (repos: Repositorios) => Promise<T>): Promise<T>;
  cerrar(): Promise<void>;
}

export interface Reloj {
  hoy(): FechaISO;
  ahora(): string;
}

export interface GeneradorDeId {
  nuevo(): string;
}

export interface Contrasenas {
  transformar(contrasena: string): Promise<string>;
  verificar(contrasena: string, hash: string): Promise<boolean>;
}

export interface Credenciales {
  emitir(identidad: {
    usuarioId: string;
    rol: string;
    clienteId: string | null;
    correo: string;
  }): { credencial: string; expiraEn: string };
  leer(credencial: string): {
    usuarioId: string;
    rol: string;
    clienteId: string | null;
    correo: string;
  };
}
