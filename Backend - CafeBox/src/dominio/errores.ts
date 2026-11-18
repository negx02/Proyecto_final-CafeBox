export type CodigoRegla =

  | 'SUSCRIPCION_DUPLICADA'
  | 'FUERA_DE_COBERTURA'
  | 'STOCK_INSUFICIENTE'
  | 'PLAN_RETIRADO'

  | 'SUSCRIPCION_CANCELADA'
  | 'SUSCRIPCION_SUSPENDIDA'
  | 'SUSCRIPCION_PAUSADA'
  | 'SUSCRIPCION_NO_PAUSADA'

  | 'OMISION_FUERA_DE_TIEMPO'
  | 'LIMITE_OMISIONES'
  | 'CICLO_YA_SALTADO'
  | 'CICLO_YA_COBRADO'
  | 'PAUSA_INVALIDA'
  | 'SIN_ENTREGA_PROGRAMADA'

  | 'CICLO_YA_GENERADO'
  | 'TRANSICION_INVALIDA'
  | 'ENTREGA_SIN_COBRO'

  | 'COBRO_YA_REGISTRADO'
  | 'COBRO_NO_FALLIDO'
  | 'SIN_DATOS_DE_PAGO'

  | 'PLAN_IGUAL'
  | 'CAMBIO_YA_SOLICITADO'
  | 'CAMBIO_YA_RESUELTO'
  | 'CICLO_YA_PASADO'

  | 'PLAN_CON_SUSCRIPCIONES'
  | 'CIUDAD_DUPLICADA'
  | 'CORREO_DUPLICADO';

export class ErrorDeRegla extends Error {
  readonly categoria = 'REGLA' as const;
  constructor(
    readonly codigo: CodigoRegla,
    mensaje: string,
    readonly detalle?: Record<string, unknown>,
  ) {
    super(mensaje);
    this.name = 'ErrorDeRegla';
  }
}

export class ErrorNoEncontrado extends Error {
  readonly categoria = 'NO_ENCONTRADO' as const;
  readonly codigo = 'ENTIDAD_NO_ENCONTRADA' as const;
  constructor(
    readonly entidad: string,
    readonly id: string,
  ) {
    super(`No existe ${entidad} con identificador ${id}`);
    this.name = 'ErrorNoEncontrado';
  }
}

export class ErrorNoAutenticado extends Error {
  readonly categoria = 'NO_AUTENTICADO' as const;
  readonly codigo = 'NO_AUTENTICADO' as const;
  constructor(mensaje = 'Se requiere iniciar sesión') {
    super(mensaje);
    this.name = 'ErrorNoAutenticado';
  }
}

export class ErrorSinPermiso extends Error {
  readonly categoria = 'SIN_PERMISO' as const;
  readonly codigo = 'SIN_PERMISO' as const;
  constructor(mensaje = 'Tu cuenta no tiene permiso para esta operación') {
    super(mensaje);
    this.name = 'ErrorSinPermiso';
  }
}

export class ErrorDeValidacion extends Error {
  readonly categoria = 'VALIDACION' as const;
  readonly codigo = 'VALIDACION' as const;
  constructor(
    readonly campos: { campo: string; mensaje: string }[],
    mensaje = 'Hay datos inválidos en la petición',
  ) {
    super(mensaje);
    this.name = 'ErrorDeValidacion';
  }
}

export type ErrorDelDominio =
  | ErrorDeRegla
  | ErrorNoEncontrado
  | ErrorNoAutenticado
  | ErrorSinPermiso
  | ErrorDeValidacion;

export const MENSAJES_DE_REGLA: Record<CodigoRegla, string> = {
  SUSCRIPCION_DUPLICADA: 'Ya tienes una suscripción vigente a este plan.',
  FUERA_DE_COBERTURA: 'Todavía no entregamos en tu ciudad.',
  STOCK_INSUFICIENTE: 'No hay café suficiente para armar esta caja en este momento.',
  PLAN_RETIRADO: 'Este plan ya no está disponible para nuevas suscripciones.',
  SUSCRIPCION_CANCELADA: 'Esta suscripción está cancelada.',
  SUSCRIPCION_SUSPENDIDA:
    'Tu suscripción está suspendida por un cobro que no se pudo realizar. Actualiza tus datos de pago para reactivarla.',
  SUSCRIPCION_PAUSADA: 'Tu suscripción ya está pausada.',
  SUSCRIPCION_NO_PAUSADA: 'Tu suscripción no está pausada.',
  OMISION_FUERA_DE_TIEMPO:
    'Ya es muy tarde para saltarte esta entrega: se arma con dos días de anticipación.',
  LIMITE_OMISIONES: 'No puedes saltarte más de dos entregas seguidas.',
  CICLO_YA_SALTADO: 'Ya habías pedido saltarte esta entrega.',
  CICLO_YA_COBRADO:
    'Esta entrega ya está pagada, así que te llega de todos modos. Puedes saltarte la siguiente.',
  PAUSA_INVALIDA: 'Las fechas de la pausa no son válidas: revisa que la fecha final sea posterior.',
  SIN_ENTREGA_PROGRAMADA: 'Esta suscripción no tiene una entrega programada en este momento.',
  CICLO_YA_GENERADO: 'Las entregas de este ciclo ya se habían generado.',
  TRANSICION_INVALIDA: 'La entrega no está en un estado que permita este cambio.',
  ENTREGA_SIN_COBRO: 'No se puede enviar una entrega cuyo ciclo no está cobrado.',
  COBRO_YA_REGISTRADO: 'El cobro de este ciclo ya estaba registrado.',
  COBRO_NO_FALLIDO: 'Sólo se puede reintentar un cobro que falló.',
  SIN_DATOS_DE_PAGO: 'Primero registra un método de pago.',
  PLAN_IGUAL: 'Ya estás suscrito a ese plan.',
  CAMBIO_YA_SOLICITADO: 'Ya tienes una solicitud de cambio de plan en revisión.',
  CAMBIO_YA_RESUELTO: 'Esta solicitud de cambio ya fue atendida.',
  CICLO_YA_PASADO: 'Ese ciclo ya pasó: el cambio sólo puede aplicar a un ciclo futuro.',
  PLAN_CON_SUSCRIPCIONES:
    'Este plan tiene suscripciones vigentes: se puede retirar, pero no eliminar.',
  CIUDAD_DUPLICADA: 'Esa ciudad ya está en la lista de cobertura.',
  CORREO_DUPLICADO: 'Ya existe una cuenta con ese correo.',
};
