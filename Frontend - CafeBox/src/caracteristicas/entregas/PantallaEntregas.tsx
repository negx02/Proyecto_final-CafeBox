import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useConsulta } from '../../api/consulta';
import { CargandoLista, ErrorDePantalla, Vacio } from '../../componentes/Estados';
import {
  cuandoFalta,
  dinero,
  fechaLarga,
  hoyISO,
  TEXTO_ESTADO_ENTREGA,
  textoMotivoSalto,
} from '../../componentes/formato';
import { Boton, Encabezado, Insignia, Tarjeta } from '../../componentes/ui';
import type { EntregaConDetalle, EstadoEntrega } from '../../api/tipos';

export const TONO_ENTREGA: Record<
  EstadoEntrega | 'PREVISTA',
  'verde' | 'ambar' | 'azul' | 'neutro'
> = {
  PREVISTA: 'neutro',
  PROGRAMADA: 'azul',
  ARMADA: 'azul',
  ENVIADA: 'ambar',
  ENTREGADA: 'verde',
  SALTADA: 'neutro',
};

type Pestana = 'proximas' | 'pasadas';

export function PantallaEntregas() {
  const [pestana, setPestana] = useState<Pestana>('proximas');
  const entregas = useConsulta(() => api.misEntregas(), []);

  const hoy = hoyISO();
  const todas = entregas.datos ?? [];
  const proximas = todas
    .filter((e) => e.fechaProgramada >= hoy && e.estado !== 'ENTREGADA')
    .sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada));
  const pasadas = todas
    .filter((e) => e.fechaProgramada < hoy || e.estado === 'ENTREGADA')
    .sort((a, b) => b.fechaProgramada.localeCompare(a.fechaProgramada));

  const visibles = pestana === 'proximas' ? proximas : pasadas;

  return (
    <>
      <Encabezado
        titulo="Mis entregas"
        descripcion="Cuándo te llega tu café y en qué va cada caja."
      />

      {(() => {
        switch (entregas.estado) {
          case 'cargando':
            return <CargandoLista filas={3} />;

          case 'error':
            return <ErrorDePantalla error={entregas.error} reintentar={entregas.recargar} />;

          case 'vacio':
            return (
              <Vacio
                icono="🗓️"
                titulo="Todavía no tienes entregas"
                motivo="Cuando te suscribas a un plan, aquí aparecerá el calendario de tus cajas con su fecha y su estado."
                accion={
                  <Link to="/planes">
                    <Boton>Ver los planes</Boton>
                  </Link>
                }
              />
            );

          case 'listo':
            return (
              <>
                <div
                  className="mb-5 inline-flex rounded-xl border border-cafe-200 bg-white p-1"
                  role="tablist"
                >
                  <Pestania
                    activa={pestana === 'proximas'}
                    onClick={() => setPestana('proximas')}
                    cuantas={proximas.length}
                  >
                    Próximas
                  </Pestania>
                  <Pestania
                    activa={pestana === 'pasadas'}
                    onClick={() => setPestana('pasadas')}
                    cuantas={pasadas.length}
                  >
                    Anteriores
                  </Pestania>
                </div>

                {visibles.length === 0 ? (
                  <Vacio
                    icono={pestana === 'proximas' ? '🗓️' : '📭'}
                    titulo={
                      pestana === 'proximas'
                        ? 'No tienes entregas por venir'
                        : 'Todavía no hay entregas anteriores'
                    }
                    motivo={
                      pestana === 'proximas'
                        ? 'Puede ser que tu suscripción esté pausada, o que el siguiente ciclo aún no se haya armado. En tu suscripción puedes ver la fecha prevista.'
                        : 'Aquí irán quedando las cajas que ya te entregamos.'
                    }
                    accion={
                      <Link to="/suscripciones">
                        <Boton variante="secundario">Ver mis suscripciones</Boton>
                      </Link>
                    }
                  />
                ) : (
                  <ul className="space-y-3">
                    {visibles.map((entrega) => (
                      <RenglonDeEntrega key={entrega.id} entrega={entrega} />
                    ))}
                  </ul>
                )}
              </>
            );
        }
      })()}
    </>
  );
}

function Pestania({
  activa,
  onClick,
  cuantas,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  cuantas: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      className={[
        'rounded-lg px-4 py-2 text-sm transition',
        activa ? 'bg-cafe-800 text-crema-50' : 'text-cafe-700 hover:bg-crema-100',
      ].join(' ')}
    >
      {children}
      <span className={activa ? 'ml-1.5 text-crema-200' : 'ml-1.5 text-cafe-400'}>{cuantas}</span>
    </button>
  );
}

function RenglonDeEntrega({ entrega }: { entrega: EntregaConDetalle }) {
  return (
    <Tarjeta comoEtiqueta="li" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-cafe-900">{fechaLarga(entrega.fechaProgramada)}</p>
          <p className="mt-0.5 text-sm text-cafe-500">
            {entrega.plan?.nombre ?? 'Plan'} · ciclo {entrega.ciclo} ·{' '}
            {cuandoFalta(entrega.fechaProgramada)}
          </p>
          {entrega.estado === 'SALTADA' ? (
            <p className="mt-2 text-sm text-cafe-600">{textoMotivoSalto(entrega.motivoSalto)}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Insignia tono={TONO_ENTREGA[entrega.estado]}>
            {TEXTO_ESTADO_ENTREGA[entrega.estado]}
          </Insignia>
          {entrega.cobro ? (
            <span className="text-xs text-cafe-500">{dinero(entrega.cobro.monto)}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="truncate text-xs text-cafe-500">{entrega.direccionEntrega}</p>
        <Link
          to={`/entregas/${entrega.id}`}
          className="shrink-0 text-sm text-cafe-700 underline underline-offset-2"
        >
          Ver detalle
        </Link>
      </div>
    </Tarjeta>
  );
}
