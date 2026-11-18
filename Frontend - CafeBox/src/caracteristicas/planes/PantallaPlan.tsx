import { Link, useParams } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useConsulta } from '../../api/consulta';
import { ErrorDelServicio } from '../../api/errores';
import { Cargando, ErrorDePantalla } from '../../componentes/Estados';
import { dinero, TEXTO_FRECUENCIA } from '../../componentes/formato';
import { Boton, Dato, Encabezado, Insignia, Tarjeta } from '../../componentes/ui';
import { NoEncontrado } from '../../PantallaNoEncontrada';

export function PantallaPlan() {
  const { id = '' } = useParams();
  const plan = useConsulta(() => api.plan(id), [id]);

  if (plan.estado === 'cargando') return <Cargando mensaje="Cargando el plan…" />;

  if (plan.estado === 'error') {
    if (plan.error instanceof ErrorDelServicio && plan.error.esNoEncontrado) {
      return (
        <NoEncontrado
          titulo="Ese plan no existe"
          motivo="Puede que lo hayamos retirado o que el enlace esté mal escrito."
          enlace={{ a: '/planes', texto: 'Ver los planes disponibles' }}
        />
      );
    }
    return <ErrorDePantalla error={plan.error} reintentar={plan.recargar} />;
  }

  const datos = plan.datos!;
  const sinStock = datos.producto.stockDisponible < datos.bolsasPorEntrega;

  return (
    <>
      <Link to="/planes" className="mb-4 inline-block text-sm text-cafe-600 hover:text-cafe-900">
        ← Todos los planes
      </Link>

      <Encabezado
        titulo={datos.nombre}
        descripcion={datos.descripcion}
        acciones={
          datos.activo ? (
            <Link to={`/planes/${datos.id}/suscribirse`}>
              <Boton disabled={sinStock}>Suscribirme</Boton>
            </Link>
          ) : undefined
        }
      />

      {!datos.activo ? (
        <p className="mb-6 rounded-xl border border-ambar-200 bg-ambar-50 px-4 py-3 text-sm text-ambar-900">
          Este plan ya no acepta nuevas suscripciones. Quienes ya estaban suscritos conservan sus
          condiciones.
        </p>
      ) : null}

      {sinStock && datos.activo ? (
        <p className="mb-6 rounded-xl border border-ambar-200 bg-ambar-50 px-4 py-3 text-sm text-ambar-900">
          Ahora mismo no hay café suficiente para armar esta caja. Puedes intentarlo en unos días.
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-[1fr,18rem]">
        <Tarjeta className="p-6">
          <h2 className="font-serif text-lg text-cafe-900">Qué incluye</h2>
          <dl className="mt-4 grid gap-5 sm:grid-cols-2">
            <Dato etiqueta="Café">{datos.producto.nombre}</Dato>
            <Dato etiqueta="Origen">{datos.producto.origen || '—'}</Dato>
            <Dato etiqueta="Cada entrega">
              {datos.bolsasPorEntrega} {datos.bolsasPorEntrega === 1 ? 'bolsa' : 'bolsas'} de{' '}
              {datos.producto.gramaje} g
            </Dato>
            <Dato etiqueta="Cada cuánto llega">
              <Insignia tono="azul">{TEXTO_FRECUENCIA[datos.frecuencia]}</Insignia>
            </Dato>
          </dl>

          <hr className="my-6 border-cafe-200" />

          <h2 className="font-serif text-lg text-cafe-900">Cómo funciona</h2>
          <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-cafe-600">
            <li>
              <strong className="text-cafe-800">1.</strong> Eliges el día de la semana que te
              conviene y tu dirección de entrega.
            </li>
            <li>
              <strong className="text-cafe-800">2.</strong> Te llega una caja{' '}
              {TEXTO_FRECUENCIA[datos.frecuencia]}, sin tener que volver a pedirla.
            </li>
            <li>
              <strong className="text-cafe-800">3.</strong> Si sales de viaje, pausas. Si esta
              semana no la necesitas, te la saltas. Sólo pagas los ciclos que sí se entregan.
            </li>
            <li>
              <strong className="text-cafe-800">4.</strong> Puedes cambiar de plan o cancelar cuando
              quieras: la entrega que ya pagaste te llega de todos modos.
            </li>
          </ol>
        </Tarjeta>

        <Tarjeta className="h-fit p-6">
          <p className="text-xs uppercase tracking-wide text-cafe-500">Precio por entrega</p>
          <p className="mt-1 font-serif text-3xl text-cafe-900">{dinero(datos.precioCiclo)}</p>
          <p className="mt-1 text-sm text-cafe-500">{TEXTO_FRECUENCIA[datos.frecuencia]}</p>

          <div className="mt-5">
            {datos.activo ? (
              <Link to={`/planes/${datos.id}/suscribirse`}>
                <Boton anchoCompleto disabled={sinStock}>
                  Suscribirme
                </Boton>
              </Link>
            ) : (
              <Link to="/planes">
                <Boton variante="secundario" anchoCompleto>
                  Ver otros planes
                </Boton>
              </Link>
            )}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-cafe-500">
            Sin plazo forzoso. Cancelas desde tu cuenta en cualquier momento.
          </p>
        </Tarjeta>
      </div>
    </>
  );
}
