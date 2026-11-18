import { Link, useParams } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useConsulta } from '../../api/consulta';
import { ErrorDelServicio } from '../../api/errores';
import { Cargando, ErrorDePantalla } from '../../componentes/Estados';
import {
  cuandoFalta,
  dinero,
  fechaLarga,
  marcaDeTiempo,
  TEXTO_ESTADO_COBRO,
  TEXTO_ESTADO_ENTREGA,
  textoMotivoSalto,
} from '../../componentes/formato';
import { Dato, Encabezado, Insignia, Tarjeta } from '../../componentes/ui';
import { NoEncontrado } from '../../PantallaNoEncontrada';
import { TONO_ENTREGA } from './PantallaEntregas';
import type { EstadoEntrega } from '../../api/tipos';

const PASOS: { estado: EstadoEntrega; titulo: string; descripcion: string }[] = [
  { estado: 'PROGRAMADA', titulo: 'Programada', descripcion: 'Ya tiene fecha asignada.' },
  { estado: 'ARMADA', titulo: 'Armada', descripcion: 'Tu caja ya está lista en el taller.' },
  { estado: 'ENVIADA', titulo: 'En camino', descripcion: 'Salió hacia tu dirección.' },
  { estado: 'ENTREGADA', titulo: 'Entregada', descripcion: 'Llegó a su destino.' },
];

export function PantallaEntrega() {
  const { id = '' } = useParams();
  const entrega = useConsulta(() => api.entrega(id), [id]);

  if (entrega.estado === 'cargando') return <Cargando mensaje="Cargando la entrega…" />;

  if (entrega.estado === 'error') {
    const error = entrega.error;
    if (error instanceof ErrorDelServicio && (error.esNoEncontrado || error.esSinPermiso)) {
      return (
        <NoEncontrado
          icono={error.esSinPermiso ? '🔒' : '🔎'}
          titulo={error.esSinPermiso ? 'Esta entrega no es tuya' : 'Esa entrega no existe'}
          motivo={
            error.esSinPermiso
              ? 'Sólo puedes ver las entregas de tus propias suscripciones.'
              : 'Puede que el enlace esté mal escrito.'
          }
          enlace={{ a: '/entregas', texto: 'Ver mis entregas' }}
        />
      );
    }
    return <ErrorDePantalla error={entrega.error} reintentar={entrega.recargar} />;
  }

  const datos = entrega.datos!;
  const pasoActual = PASOS.findIndex((paso) => paso.estado === datos.estado);
  const saltada = datos.estado === 'SALTADA';

  return (
    <>
      <Link to="/entregas" className="mb-4 inline-block text-sm text-cafe-600 hover:text-cafe-900">
        ← Mis entregas
      </Link>

      <Encabezado
        titulo={fechaLarga(datos.fechaProgramada)}
        descripcion={`${datos.plan?.nombre ?? 'Plan'} · ciclo ${datos.ciclo} · ${cuandoFalta(datos.fechaProgramada)}`}
        acciones={
          <Insignia tono={TONO_ENTREGA[datos.estado]}>{TEXTO_ESTADO_ENTREGA[datos.estado]}</Insignia>
        }
      />

      <div className="grid gap-5 md:grid-cols-[1fr,18rem]">
        <Tarjeta className="p-6">
          <h2 className="font-serif text-lg text-cafe-900">En qué va</h2>

          {saltada ? (
            <div className="mt-4 rounded-xl bg-crema-100 px-4 py-4">
              <p className="text-sm text-cafe-700">
                Esta entrega no se armó. {textoMotivoSalto(datos.motivoSalto)}, así que tampoco se
                te cobró este ciclo.
              </p>
            </div>
          ) : (
            <ol className="mt-5 space-y-5">
              {PASOS.map((paso, indice) => {
                const hecho = indice <= pasoActual;
                const marca =
                  paso.estado === 'ARMADA'
                    ? datos.armadaEn
                    : paso.estado === 'ENVIADA'
                      ? datos.enviadaEn
                      : paso.estado === 'ENTREGADA'
                        ? datos.entregadaEn
                        : datos.creadoEn;

                return (
                  <li key={paso.estado} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden="true"
                        className={[
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
                          hecho ? 'bg-cafe-800 text-crema-50' : 'bg-cafe-100 text-cafe-400',
                        ].join(' ')}
                      >
                        {hecho ? '✓' : indice + 1}
                      </span>
                      {indice < PASOS.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className={`mt-1 w-px flex-1 ${hecho ? 'bg-cafe-300' : 'bg-cafe-200'}`}
                        />
                      ) : null}
                    </div>
                    <div className="pb-1">
                      <p className={hecho ? 'font-medium text-cafe-900' : 'text-cafe-500'}>
                        {paso.titulo}
                      </p>
                      <p className="mt-0.5 text-sm text-cafe-500">{paso.descripcion}</p>
                      {hecho && marca ? (
                        <p className="mt-1 text-xs text-cafe-400">{marcaDeTiempo(marca)}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Tarjeta>

        <Tarjeta className="h-fit p-6">
          <h2 className="font-serif text-lg text-cafe-900">Datos</h2>
          <dl className="mt-4 space-y-4">
            <Dato etiqueta="Entregamos en">
              {datos.direccionEntrega}
              <br />
              <span className="text-cafe-500">{datos.ciudad}</span>
            </Dato>
            <Dato etiqueta="Contenido">
              {datos.bolsas > 0 ? `${datos.bolsas} ${datos.bolsas === 1 ? 'bolsa' : 'bolsas'}` : '—'}
            </Dato>
            <Dato etiqueta="Cobro">
              {datos.cobro ? (
                <>
                  {dinero(datos.cobro.monto)} ·{' '}
                  <span className="text-cafe-600">{TEXTO_ESTADO_COBRO[datos.cobro.estado]}</span>
                </>
              ) : (
                'Sin cobro asociado'
              )}
            </Dato>
          </dl>

          <Link
            to={`/suscripciones/${datos.suscripcionId}`}
            className="mt-5 inline-block text-sm text-cafe-700 underline underline-offset-2"
          >
            Ver la suscripción
          </Link>
        </Tarjeta>
      </div>
    </>
  );
}
