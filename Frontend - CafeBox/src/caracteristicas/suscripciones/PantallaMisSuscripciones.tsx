import { Link } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useConsulta } from '../../api/consulta';
import { CargandoLista, ErrorDePantalla, Vacio } from '../../componentes/Estados';
import {
  cuandoFalta,
  dinero,
  fechaLarga,
  nombreDelDia,
  TEXTO_ESTADO_SUSCRIPCION,
  TEXTO_FRECUENCIA,
} from '../../componentes/formato';
import { Boton, Encabezado, Insignia, Tarjeta } from '../../componentes/ui';
import type { EstadoSuscripcion, Suscripcion } from '../../api/tipos';

export const TONO_SUSCRIPCION: Record<EstadoSuscripcion, 'verde' | 'ambar' | 'rojo' | 'neutro'> = {
  ACTIVA: 'verde',
  PAUSADA: 'ambar',
  SUSPENDIDA: 'rojo',
  CANCELADA: 'neutro',
};

export function PantallaMisSuscripciones() {
  const suscripciones = useConsulta(() => api.misSuscripciones(), []);

  return (
    <>
      <Encabezado
        titulo="Mis suscripciones"
        descripcion="Aquí administras lo que recibes: pausar, saltarte una entrega, cambiar de plan o cancelar."
        acciones={
          <Link to="/planes">
            <Boton variante="secundario">Ver planes</Boton>
          </Link>
        }
      />

      {(() => {
        switch (suscripciones.estado) {
          case 'cargando':
            return <CargandoLista filas={2} />;

          case 'error':
            return (
              <ErrorDePantalla error={suscripciones.error} reintentar={suscripciones.recargar} />
            );

          case 'vacio':
            return (
              <Vacio
                icono="📦"
                titulo="Todavía no tienes ninguna suscripción"
                motivo="Cuando te suscribas a un plan, aquí verás cuándo te llega tu próxima caja y podrás pausarla o cambiarla."
                accion={
                  <Link to="/planes">
                    <Boton>Ver los planes</Boton>
                  </Link>
                }
              />
            );

          case 'listo':
            return (
              <ul className="space-y-4">
                {suscripciones.datos!.map((suscripcion) => (
                  <RenglonDeSuscripcion key={suscripcion.id} suscripcion={suscripcion} />
                ))}
              </ul>
            );
        }
      })()}
    </>
  );
}

function RenglonDeSuscripcion({ suscripcion }: { suscripcion: Suscripcion }) {
  const { plan, proximaEntrega, estado } = suscripcion;

  return (
    <Tarjeta comoEtiqueta="li" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-serif text-xl text-cafe-900">{plan?.nombre ?? 'Plan'}</h2>
            <Insignia tono={TONO_SUSCRIPCION[estado]}>{TEXTO_ESTADO_SUSCRIPCION[estado]}</Insignia>
          </div>
          <p className="mt-1 text-sm text-cafe-600">
            {plan ? `${dinero(plan.precioCiclo)} ${TEXTO_FRECUENCIA[plan.frecuencia]}` : '—'} ·{' '}
            {nombreDelDia(suscripcion.diaEntregaPreferido)}
          </p>
        </div>

        <Link to={`/suscripciones/${suscripcion.id}`}>
          <Boton variante="secundario">Administrar</Boton>
        </Link>
      </div>

      <div className="mt-4 rounded-xl bg-crema-100 px-4 py-3">
        {estado === 'CANCELADA' ? (
          <p className="text-sm text-cafe-600">Esta suscripción está cancelada.</p>
        ) : estado === 'SUSPENDIDA' ? (
          <p className="text-sm text-rojo-800">
            Suspendida por un cobro que no se pudo realizar.{' '}
            <Link to="/cobros" className="font-medium underline underline-offset-2">
              Revisar mis cobros
            </Link>
          </p>
        ) : estado === 'PAUSADA' ? (
          <p className="text-sm text-ambar-900">
            Pausada
            {suscripcion.pausadaHasta ? ` hasta el ${fechaLarga(suscripcion.pausadaHasta)}` : ''}. No
            te llegará ni se te cobrará nada durante la pausa.
          </p>
        ) : proximaEntrega ? (
          <p className="text-sm text-cafe-700">
            Tu próxima caja llega el{' '}
            <strong className="text-cafe-900">{fechaLarga(proximaEntrega.fechaProgramada)}</strong>{' '}
            <span className="text-cafe-500">({cuandoFalta(proximaEntrega.fechaProgramada)})</span>
          </p>
        ) : (
          <p className="text-sm text-cafe-600">
            Todavía no hay una entrega programada. En cuanto se arme el siguiente ciclo la verás
            aquí.
          </p>
        )}
      </div>
    </Tarjeta>
  );
}
