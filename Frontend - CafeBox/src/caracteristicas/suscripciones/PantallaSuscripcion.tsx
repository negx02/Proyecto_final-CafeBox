import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useConsulta, useOperacion } from '../../api/consulta';
import { ErrorDelServicio } from '../../api/errores';
import {
  AvisoDeError,
  Cargando,
  CargandoLista,
  ErrorDePantalla,
  Vacio,
} from '../../componentes/Estados';
import {
  cuandoFalta,
  dinero,
  fechaConAnio,
  fechaLarga,
  marcaDeTiempo,
  nombreDelDia,
  TEXTO_ESTADO_COBRO,
  TEXTO_ESTADO_ENTREGA,
  TEXTO_ESTADO_SUSCRIPCION,
  TEXTO_FRECUENCIA,
  textoMotivoSalto,
} from '../../componentes/formato';
import { Boton, Dato, Encabezado, Insignia, Tarjeta } from '../../componentes/ui';
import { NoEncontrado } from '../../PantallaNoEncontrada';
import { DialogoCambioDePlan, DialogoCancelar, DialogoPausa, DialogoSaltar } from './Dialogos';
import { TONO_SUSCRIPCION } from './PantallaMisSuscripciones';
import { TONO_ENTREGA } from '../entregas/PantallaEntregas';
import type { SuscripcionConHistorial } from '../../api/tipos';

type DialogoAbierto = 'pausa' | 'salto' | 'cambio' | 'cancelar' | null;

export function PantallaSuscripcion() {
  const { id = '' } = useParams();
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);

  const suscripcion = useConsulta(() => api.suscripcion(id), [id]);
  const calendario = useConsulta(() => api.proximasEntregas(id, 6), [id]);

  const reanudar = useOperacion(async () => {
    await api.reanudar(id);
    await Promise.all([suscripcion.refrescarEnSilencio(), calendario.refrescarEnSilencio()]);
  });

  const recargarTodo = () => {
    void suscripcion.refrescarEnSilencio();
    void calendario.refrescarEnSilencio();
  };

  if (suscripcion.estado === 'cargando') return <Cargando mensaje="Cargando tu suscripción…" />;

  if (suscripcion.estado === 'error') {
    const error = suscripcion.error;
    if (error instanceof ErrorDelServicio && error.esNoEncontrado) {
      return (
        <NoEncontrado
          titulo="Esa suscripción no existe"
          motivo="Puede que el enlace esté mal escrito o que la suscripción se haya eliminado."
          enlace={{ a: '/suscripciones', texto: 'Ver mis suscripciones' }}
        />
      );
    }
    if (error instanceof ErrorDelServicio && error.esSinPermiso) {
      return (
        <NoEncontrado
          icono="🔒"
          titulo="Esta suscripción no es tuya"
          motivo="Sólo el dueño de una suscripción puede verla."
          enlace={{ a: '/suscripciones', texto: 'Ver mis suscripciones' }}
        />
      );
    }
    return <ErrorDePantalla error={suscripcion.error} reintentar={suscripcion.recargar} />;
  }

  const datos = suscripcion.datos!;
  const intervenible = datos.estado === 'ACTIVA' || datos.estado === 'PAUSADA';
  const cambioPendiente = datos.cambiosDePlan.find((cambio) => cambio.estado === 'SOLICITADO');

  return (
    <>
      <Link
        to="/suscripciones"
        className="mb-4 inline-block text-sm text-cafe-600 hover:text-cafe-900"
      >
        ← Mis suscripciones
      </Link>

      <Encabezado
        titulo={datos.plan?.nombre ?? 'Mi suscripción'}
        descripcion={
          datos.plan
            ? `${dinero(datos.plan.precioCiclo)} ${TEXTO_FRECUENCIA[datos.plan.frecuencia]} · ${datos.plan.bolsasPorEntrega} ${datos.plan.bolsasPorEntrega === 1 ? 'bolsa' : 'bolsas'} por caja`
            : undefined
        }
        acciones={
          <Insignia tono={TONO_SUSCRIPCION[datos.estado]}>
            {TEXTO_ESTADO_SUSCRIPCION[datos.estado]}
          </Insignia>
        }
      />

      <EstadoDestacado suscripcion={datos} />

      {cambioPendiente ? (
        <p className="mb-6 rounded-xl border border-azul-200 bg-azul-50 px-4 py-3 text-sm text-azul-900">
          Tienes un cambio de plan en revisión, para aplicar a partir del ciclo{' '}
          {cambioPendiente.cicloAplica}. Te avisamos en cuanto lo confirmemos.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr,19rem]">
        <div className="space-y-5">
                    <Tarjeta className="p-6">
            <h2 className="font-serif text-lg text-cafe-900">Tus próximas entregas</h2>
            <p className="mt-1 text-sm text-cafe-500">
              La pregunta que más nos hacen: cuándo me llega.
            </p>

            <div className="mt-5">
              {(() => {
                switch (calendario.estado) {
                  case 'cargando':
                    return <CargandoLista filas={3} />;
                  case 'error':
                    return (
                      <ErrorDePantalla
                        error={calendario.error}
                        reintentar={calendario.recargar}
                        titulo="No se pudo cargar tu calendario"
                      />
                    );
                  case 'vacio':
                    return (
                      <Vacio
                        icono="🗓️"
                        titulo="No hay entregas por venir"
                        motivo={
                          datos.estado === 'CANCELADA'
                            ? 'Cancelaste esta suscripción, así que ya no se programan más entregas.'
                            : 'En cuanto se arme el siguiente ciclo aparecerá aquí con su fecha.'
                        }
                      />
                    );
                  case 'listo':
                    return (
                      <ol className="space-y-2.5">
                        {calendario.datos!.map((renglon) => (
                          <li
                            key={renglon.ciclo}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cafe-200 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-cafe-900">
                                {fechaLarga(renglon.fechaProgramada)}
                              </p>
                              <p className="mt-0.5 text-xs text-cafe-500">
                                Ciclo {renglon.ciclo} · {cuandoFalta(renglon.fechaProgramada)}
                                {renglon.estado === 'SALTADA' && renglon.motivoSalto
                                  ? ` · ${textoMotivoSalto(renglon.motivoSalto)}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Insignia tono={TONO_ENTREGA[renglon.estado]}>
                                {TEXTO_ESTADO_ENTREGA[renglon.estado]}
                              </Insignia>
                              {renglon.entregaId ? (
                                <Link
                                  to={`/entregas/${renglon.entregaId}`}
                                  className="text-xs text-cafe-600 underline underline-offset-2"
                                >
                                  Ver
                                </Link>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ol>
                    );
                }
              })()}
            </div>
          </Tarjeta>

                    <Tarjeta className="p-6">
            <h2 className="font-serif text-lg text-cafe-900">Historial de ciclos</h2>

            {datos.entregas.length === 0 ? (
              <p className="mt-4 text-sm text-cafe-500">
                Todavía no hay ciclos cerrados. Aquí irá quedando el registro de cada entrega.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-cafe-200">
                {[...datos.entregas]
                  .sort((a, b) => b.ciclo - a.ciclo)
                  .map((entrega) => {
                    const cobro = datos.cobros.find((c) => c.ciclo === entrega.ciclo);
                    return (
                      <li key={entrega.id} className="flex flex-wrap items-center gap-3 py-3">
                        <span className="w-16 shrink-0 text-xs text-cafe-500">
                          Ciclo {entrega.ciclo}
                        </span>
                        <span className="flex-1 text-sm text-cafe-800">
                          {fechaConAnio(entrega.fechaProgramada)}
                        </span>
                        <Insignia tono={TONO_ENTREGA[entrega.estado]}>
                          {TEXTO_ESTADO_ENTREGA[entrega.estado]}
                        </Insignia>
                        {cobro ? (
                          <span className="w-32 text-right text-xs text-cafe-500">
                            {TEXTO_ESTADO_COBRO[cobro.estado]} · {dinero(cobro.monto)}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            )}

            {datos.cambiosDePlan.length > 0 ? (
              <>
                <hr className="my-5 border-cafe-200" />
                <h3 className="text-sm font-medium text-cafe-800">Cambios de plan</h3>
                <ul className="mt-2.5 space-y-1.5 text-sm text-cafe-600">
                  {datos.cambiosDePlan.map((cambio) => (
                    <li key={cambio.id}>
                      {marcaDeTiempo(cambio.solicitadoEn)} · solicitado para el ciclo{' '}
                      {cambio.cicloAplica} ·{' '}
                      <span className="text-cafe-800">{cambio.estado.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Tarjeta>
        </div>

                <div className="space-y-5">
          <Tarjeta className="p-6">
            <h2 className="font-serif text-lg text-cafe-900">Detalles</h2>
            <dl className="mt-4 space-y-4">
              <Dato etiqueta="Entregamos en">
                {datos.direccionEntrega}
                <br />
                <span className="text-cafe-500">{datos.ciudad}</span>
              </Dato>
              <Dato etiqueta="Día preferido">{nombreDelDia(datos.diaEntregaPreferido)}</Dato>
              <Dato etiqueta="Desde">{fechaConAnio(datos.fechaInicio)}</Dato>
              <Dato etiqueta="Ciclos entregados">{datos.ciclosGenerados}</Dato>
            </dl>
          </Tarjeta>

          {intervenible ? (
            <Tarjeta className="p-6">
              <h2 className="font-serif text-lg text-cafe-900">Qué puedes hacer</h2>
              <div className="mt-4 space-y-2.5">
                {datos.estado === 'PAUSADA' ? (
                  <>
                    <Boton
                      anchoCompleto
                      cargando={reanudar.enCurso}
                      onClick={() => void reanudar.ejecutar()}
                    >
                      Reanudar ahora
                    </Boton>
                    <AvisoDeError error={reanudar.error} />
                  </>
                ) : (
                  <>
                    <Boton
                      variante="secundario"
                      anchoCompleto
                      onClick={() => setDialogo('salto')}
                      disabled={!datos.proximaEntrega}
                    >
                      Saltarme la próxima entrega
                    </Boton>
                    <Boton variante="secundario" anchoCompleto onClick={() => setDialogo('pausa')}>
                      Pausar por un tiempo
                    </Boton>
                  </>
                )}

                <Boton
                  variante="secundario"
                  anchoCompleto
                  onClick={() => setDialogo('cambio')}
                  disabled={!!cambioPendiente}
                >
                  Cambiar de plan
                </Boton>

                <Boton variante="peligro" anchoCompleto onClick={() => setDialogo('cancelar')}>
                  Cancelar suscripción
                </Boton>
              </div>

              {datos.omisionesConsecutivas > 0 ? (
                <p className="mt-4 text-xs leading-relaxed text-cafe-500">
                  Llevas {datos.omisionesConsecutivas}{' '}
                  {datos.omisionesConsecutivas === 1 ? 'entrega saltada' : 'entregas saltadas'}{' '}
                  seguidas. Después de dos, tendrás que dejar pasar una para volver a saltarte otra.
                </p>
              ) : null}
            </Tarjeta>
          ) : null}
        </div>
      </div>

      <DialogoPausa
        suscripcion={datos}
        abierto={dialogo === 'pausa'}
        alCerrar={() => setDialogo(null)}
        alTerminar={recargarTodo}
      />
      <DialogoSaltar
        suscripcion={datos}
        abierto={dialogo === 'salto'}
        alCerrar={() => setDialogo(null)}
        alTerminar={recargarTodo}
      />
      <DialogoCambioDePlan
        suscripcion={datos}
        abierto={dialogo === 'cambio'}
        alCerrar={() => setDialogo(null)}
        alTerminar={recargarTodo}
      />
      <DialogoCancelar
        suscripcion={datos}
        abierto={dialogo === 'cancelar'}
        alCerrar={() => setDialogo(null)}
        alTerminar={recargarTodo}
      />
    </>
  );
}

function EstadoDestacado({ suscripcion }: { suscripcion: SuscripcionConHistorial }) {
  if (suscripcion.estado === 'SUSPENDIDA') {
    return (
      <div className="mb-6 rounded-2xl border border-rojo-200 bg-rojo-50 p-5" role="alert">
        <p className="text-sm font-medium text-rojo-900">
          Tu suscripción está suspendida porque un cobro no se pudo realizar.
        </p>
        <p className="mt-1.5 text-sm text-rojo-800">
          Mientras tanto no se programan nuevas entregas. Actualiza tus datos de pago y pide
          reintentar el cobro.
        </p>
        <Link
          to="/cobros"
          className="mt-3 inline-block text-sm font-medium text-rojo-900 underline underline-offset-2"
        >
          Ir a mis cobros
        </Link>
      </div>
    );
  }

  if (suscripcion.estado === 'PAUSADA') {
    return (
      <div className="mb-6 rounded-2xl border border-ambar-200 bg-ambar-50 p-5">
        <p className="text-sm font-medium text-ambar-900">
          Tu suscripción está pausada
          {suscripcion.pausadaHasta ? ` hasta el ${fechaLarga(suscripcion.pausadaHasta)}` : ''}.
        </p>
        <p className="mt-1.5 text-sm text-ambar-800">
          No te llega ninguna caja ni se te cobra nada durante la pausa. Puedes reanudar antes si
          regresas de viaje.
        </p>
      </div>
    );
  }

  if (suscripcion.estado === 'CANCELADA') {
    return (
      <div className="mb-6 rounded-2xl border border-cafe-200 bg-crema-100 p-5">
        <p className="text-sm text-cafe-700">
          Cancelaste esta suscripción
          {suscripcion.canceladaEn ? ` el ${marcaDeTiempo(suscripcion.canceladaEn)}` : ''}. Puedes
          volver a suscribirte cuando quieras.
        </p>
        <Link
          to="/planes"
          className="mt-3 inline-block text-sm font-medium text-cafe-800 underline underline-offset-2"
        >
          Ver los planes
        </Link>
      </div>
    );
  }

  if (suscripcion.proximaEntrega) {
    return (
      <div className="mb-6 rounded-2xl border border-verde-200 bg-verde-50 p-5">
        <p className="text-sm text-verde-900">
          Tu próxima caja llega el{' '}
          <strong>{fechaLarga(suscripcion.proximaEntrega.fechaProgramada)}</strong> (
          {cuandoFalta(suscripcion.proximaEntrega.fechaProgramada)}).
        </p>
      </div>
    );
  }

  return null;
}
