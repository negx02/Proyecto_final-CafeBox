import { Link } from 'react-router-dom';

import { Boton, Tarjeta } from '../../componentes/ui';
import { useSesion } from '../../sesion/ContextoSesion';

const PROMESAS = [
  {
    icono: '📦',
    titulo: 'Llega sola',
    texto: 'Te inscribes una vez y tu café llega cada semana, cada quince días o cada mes.',
  },
  {
    icono: '⏸️',
    titulo: 'Pausas cuando quieras',
    texto: '¿Te vas de viaje? Pausas y no te llega ni se te cobra. ¿Esta semana no? Te la saltas.',
  },
  {
    icono: '🔁',
    titulo: 'Cambias de plan',
    texto: 'Si tomas más café del que pensabas, cambias de plan y te decimos desde cuándo aplica.',
  },
  {
    icono: '🧾',
    titulo: 'Pagas lo que recibes',
    texto: 'Sólo se cobran los ciclos que sí se entregan. Sin plazo forzoso.',
  },
];

export function PantallaInicio() {
  const { estado, cliente } = useSesion();
  const dentro = estado === 'dentro';

  return (
    <>
      <section className="py-6 text-center sm:py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-cafe-500">
          Café de especialidad · Guaymas
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl font-serif text-3xl leading-tight text-cafe-900 sm:text-5xl">
          Tu café recién tostado, en tu puerta, sin volver a pedirlo
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-cafe-600">
          {dentro
            ? `Qué gusto verte otra vez${cliente?.nombre ? `, ${cliente.nombre.split(' ')[0]}` : ''}. Aquí administras tus entregas.`
            : 'Elige cada cuánto lo quieres, y nosotros nos encargamos del resto. Pausa, salta una entrega o cambia de plan cuando quieras.'}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {dentro ? (
            <>
              <Link to="/suscripciones">
                <Boton>Mis suscripciones</Boton>
              </Link>
              <Link to="/entregas">
                <Boton variante="secundario">Ver mis entregas</Boton>
              </Link>
            </>
          ) : (
            <>
              <Link to="/planes">
                <Boton>Ver los planes</Boton>
              </Link>
              <Link to="/registrarse">
                <Boton variante="secundario">Crear mi cuenta</Boton>
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROMESAS.map((promesa) => (
          <Tarjeta key={promesa.titulo} className="p-5">
            <span aria-hidden="true" className="text-2xl">
              {promesa.icono}
            </span>
            <h2 className="mt-3 font-serif text-lg text-cafe-900">{promesa.titulo}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-cafe-600">{promesa.texto}</p>
          </Tarjeta>
        ))}
      </section>
    </>
  );
}
