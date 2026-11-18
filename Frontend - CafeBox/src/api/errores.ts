export class ErrorDeRed extends Error {
  readonly clase = 'RED' as const;
  constructor(
    mensaje = 'No se pudo contactar el servicio. Revisa que esté encendido e inténtalo otra vez.',
    readonly estado?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorDeRed';
  }
}

export class ErrorDelServicio extends Error {
  readonly clase = 'SERVICIO' as const;
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly campos?: { campo: string; mensaje: string }[],
    readonly detalle?: unknown,
  ) {
    super(mensaje);
    this.name = 'ErrorDelServicio';
  }

  get esReglaDeNegocio(): boolean {
    return this.estado === 409;
  }

  get esValidacion(): boolean {
    return this.estado === 400;
  }

  get esNoEncontrado(): boolean {
    return this.estado === 404;
  }

  get esSinPermiso(): boolean {
    return this.estado === 403;
  }

  get porCampo(): Record<string, string> {
    const mapa: Record<string, string> = {};
    for (const { campo, mensaje } of this.campos ?? []) {
      if (!mapa[campo]) mapa[campo] = mensaje;
    }
    return mapa;
  }
}

export type ErrorDelPortal = ErrorDeRed | ErrorDelServicio;

export function mensajeParaElUsuario(error: unknown): string {
  if (error instanceof ErrorDeRed) return error.message;
  if (error instanceof ErrorDelServicio) {
    if (error.estado >= 500) {
      return 'El servicio tuvo un problema interno. Inténtalo de nuevo en un momento.';
    }
    return error.message;
  }
  return 'Ocurrió algo inesperado. Vuelve a intentarlo.';
}

export function valeLaPenaReintentar(error: unknown): boolean {
  if (error instanceof ErrorDeRed) return true;
  if (error instanceof ErrorDelServicio) return error.estado >= 500;
  return false;
}
