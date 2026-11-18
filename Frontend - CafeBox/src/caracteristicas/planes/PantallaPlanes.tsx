import { Link } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useConsulta } from '../../api/consulta';
import { CargandoLista, ErrorDePantalla, Vacio } from '../../componentes/Estados';
import { dinero, TEXTO_FRECUENCIA } from '../../componentes/formato';
import { Boton, Encabezado, Insignia, Tarjeta } from '../../componentes/ui';
import type { Plan } from '../../api/tipos';

export function PantallaPlanes() {
  const planes = useConsulta(() => api.planes(), []);
  const zonas = useConsulta(() => api.zonasDeCobertura(), []);

  return (
    <>
      <Encabezado
        titulo="Nuestros planes"
        descripcion="Elige cada cuánto quieres recibir tu café. Puedes pausar, saltarte una entrega o cambiar de plan cuando quieras, desde tu cuenta."
      />

            {zonas.estado === 'listo' && zonas.datos ? (
        <p className="mb-6 rounded-xl border border-cafe-200 bg-white px-4 py-3 text-sm text-cafe-600">
          Hoy entregamos en <strong className="text-cafe-800">{zonas.datos.join(' y ')}</strong>.
          Puedes crear tu cuenta desde cualquier ciudad, pero sólo podrás suscribirte si entregamos
          en la tuya.
        </p>
      ) : null}

      {(() => {
        switch (planes.estado) {
          case 'cargando':
            return <CargandoLista filas={3} />;

          case 'error':
            return <ErrorDePantalla error={planes.error} reintentar={planes.recargar} />;

          case 'vacio':
            return (
              <Vacio
                titulo="Todavía no hay planes publicados"
                motivo="Estamos preparando el catálogo. Vuelve en un rato o déjanos tu correo creando una cuenta para avisarte."
                accion={
                  <Link to="/registrarse">
                    <Boton>Crear cuenta</Boton>
                  </Link>
                }
              />
            );

          case 'listo':
            return (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {planes.datos!.map((plan) => (
                  <TarjetaDePlan key={plan.id} plan={plan} />
                ))}
              </ul>
            );
        }
      })()}
    </>
  );
}

function TarjetaDePlan({ plan }: { plan: Plan }) {
  const sinStock = plan.producto.stockDisponible < plan.bolsasPorEntrega;

  return (
    <Tarjeta comoEtiqueta="li" className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-xl text-cafe-900">{plan.nombre}</h2>
        <Insignia tono="azul">{TEXTO_FRECUENCIA[plan.frecuencia]}</Insignia>
      </div>

      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-cafe-600">{plan.descripcion}</p>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-cafe-500">Café</dt>
          <dd className="text-right text-cafe-800">{plan.producto.nombre}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-cafe-500">Origen</dt>
          <dd className="text-right text-cafe-800">{plan.producto.origen || '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-cafe-500">Cada entrega</dt>
          <dd className="text-right text-cafe-800">
            {plan.bolsasPorEntrega} {plan.bolsasPorEntrega === 1 ? 'bolsa' : 'bolsas'} de{' '}
            {plan.producto.gramaje} g
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-serif text-2xl text-cafe-900">{dinero(plan.precioCiclo)}</span>
        <span className="text-sm text-cafe-500">/ entrega</span>
      </div>

      {sinStock ? (
        <p className="mt-3 text-xs text-ambar-800">
          Este plan está momentáneamente agotado: no alcanza el café para armar la caja.
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <Link to={`/planes/${plan.id}`} className="flex-1">
          <Boton variante="secundario" anchoCompleto>
            Ver detalle
          </Boton>
        </Link>
        <Link to={`/planes/${plan.id}/suscribirse`} className="flex-1">
          <Boton anchoCompleto disabled={sinStock}>
            Suscribirme
          </Boton>
        </Link>
      </div>
    </Tarjeta>
  );
}
