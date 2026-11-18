import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useConsulta, useOperacion } from '../../api/consulta';
import { ErrorDelServicio } from '../../api/errores';
import {
  AvisoDeError,
  AvisoDeExito,
  CargandoLista,
  ErrorDePantalla,
  Vacio,
} from '../../componentes/Estados';
import {
  dinero,
  fechaConAnio,
  TEXTO_ESTADO_COBRO,
} from '../../componentes/formato';
import { Boton, Encabezado, Insignia, Tarjeta } from '../../componentes/ui';
import { useSesion } from '../../sesion/ContextoSesion';
import type { CobroConDetalle, EstadoCobro } from '../../api/tipos';

const TONO_COBRO: Record<EstadoCobro, 'verde' | 'ambar' | 'rojo' | 'neutro'> = {
  COBRADO: 'verde',
  PENDIENTE: 'ambar',
  FALLIDO: 'rojo',
  CANCELADO: 'neutro',
};

export function PantallaCobros() {
  const { cliente } = useSesion();
  const cobros = useConsulta(() => api.misCobros(), []);

  const fallidos = (cobros.datos ?? []).filter((cobro) => cobro.estado === 'FALLIDO');

  return (
    <>
      <Encabezado
        titulo="Mis cobros"
        descripcion="Un renglón por ciclo. Sólo se cobran los ciclos que sí se entregan: los que pausaste o te saltaste no se cobran."
      />

      {fallidos.length > 0 ? (
        <AvisoDeCobroFallido cobros={fallidos} alResolver={() => void cobros.refrescarEnSilencio()} />
      ) : null}

      <Tarjeta className="mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-cafe-500">Método de pago</p>
            <p className="mt-1 text-sm text-cafe-900">
              {cliente?.pagoUltimos4
                ? `${cliente.pagoTitular ?? 'Tarjeta'} ···· ${cliente.pagoUltimos4}`
                : 'Todavía no has registrado una tarjeta.'}
            </p>
          </div>
          <Link to="/perfil">
            <Boton variante="secundario">
              {cliente?.pagoUltimos4 ? 'Cambiar' : 'Registrar tarjeta'}
            </Boton>
          </Link>
        </div>
      </Tarjeta>

      {(() => {
        switch (cobros.estado) {
          case 'cargando':
            return <CargandoLista filas={4} />;

          case 'error':
            return <ErrorDePantalla error={cobros.error} reintentar={cobros.recargar} />;

          case 'vacio':
            return (
              <Vacio
                icono="🧾"
                titulo="Todavía no tienes cobros"
                motivo="Cuando se arme tu primera caja aparecerá aquí su cobro, con su fecha y su monto."
                accion={
                  <Link to="/planes">
                    <Boton>Ver los planes</Boton>
                  </Link>
                }
              />
            );

          case 'listo':
            return (
              <Tarjeta className="overflow-hidden">
                <ul className="divide-y divide-cafe-200">
                  {cobros.datos!.map((cobro) => (
                    <RenglonDeCobro key={cobro.id} cobro={cobro} />
                  ))}
                </ul>
              </Tarjeta>
            );
        }
      })()}
    </>
  );
}

function RenglonDeCobro({ cobro }: { cobro: CobroConDetalle }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-cafe-900">
          {cobro.plan?.nombre ?? 'Suscripción'} · ciclo {cobro.ciclo}
        </p>
        <p className="mt-0.5 text-xs text-cafe-500">
          {fechaConAnio(cobro.fecha)}
          {cobro.motivoFallo ? ` · ${cobro.motivoFallo}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Insignia tono={TONO_COBRO[cobro.estado]}>{TEXTO_ESTADO_COBRO[cobro.estado]}</Insignia>
        <span
          className={[
            'w-24 text-right text-sm tabular-nums',
            cobro.estado === 'CANCELADO' ? 'text-cafe-400 line-through' : 'text-cafe-900',
          ].join(' ')}
        >
          {dinero(cobro.monto)}
        </span>
      </div>
    </li>
  );
}

function AvisoDeCobroFallido({
  cobros,
  alResolver,
}: {
  cobros: CobroConDetalle[];
  alResolver: () => void;
}) {
  const { cliente } = useSesion();
  const [reactivada, setReactivada] = useState(false);
  const primero = cobros[0];
  const reintentar = useOperacion(async () => {
    const hecho = await api.reintentarCobro(primero.id);
    setReactivada(hecho.suscripcionReactivada);
    alResolver();
    return hecho;
  });

  const sinDatosDePago =
    reintentar.error instanceof ErrorDelServicio &&
    reintentar.error.codigo === 'SIN_DATOS_DE_PAGO';

  return (
    <div className="mb-6 rounded-2xl border border-rojo-200 bg-rojo-50 p-5" role="alert">
      <h2 className="font-serif text-lg text-rojo-900">
        {cobros.length === 1
          ? 'Un cobro no se pudo realizar'
          : `${cobros.length} cobros no se pudieron realizar`}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-rojo-800">
        Mientras no se resuelva, tu suscripción queda suspendida y no se programan nuevas entregas.
        {cliente?.pagoUltimos4
          ? ` Revisa que la tarjeta ···· ${cliente.pagoUltimos4} siga vigente y pide reintentar.`
          : ' Registra una tarjeta para poder reintentar el cobro.'}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link to="/perfil">
          <Boton variante="secundario">Corregir mis datos de pago</Boton>
        </Link>
        {cliente?.pagoUltimos4 ? (
          <Boton
            onClick={() => void reintentar.ejecutar()}
            cargando={reintentar.enCurso}
          >
            Reintentar el cobro
          </Boton>
        ) : null}
      </div>

      {sinDatosDePago ? (
        <p className="mt-4 text-sm text-rojo-800">
          Primero registra un método de pago en tu cuenta y vuelve aquí.
        </p>
      ) : reintentar.error ? (
        <div className="mt-4">
          <AvisoDeError error={reintentar.error} />
        </div>
      ) : null}

      {reactivada && !reintentar.error ? (
        <div className="mt-4">
          <AvisoDeExito>
            Listo: tu suscripción volvió a quedar activa y el cobro se intentará de nuevo.
          </AvisoDeExito>
        </div>
      ) : null}
    </div>
  );
}
