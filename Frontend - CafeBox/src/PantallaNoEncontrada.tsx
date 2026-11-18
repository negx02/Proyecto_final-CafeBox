import { Link } from 'react-router-dom';

import { Boton } from './componentes/ui';

export function NoEncontrado({
  titulo,
  motivo,
  enlace,
  icono = '🔎',
}: {
  titulo: string;
  motivo: string;
  enlace: { a: string; texto: string };
  icono?: string;
}) {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-cafe-100 text-3xl">
        <span aria-hidden="true">{icono}</span>
      </div>
      <h1 className="font-serif text-2xl text-cafe-900">{titulo}</h1>
      <p className="mt-2 text-sm leading-relaxed text-cafe-600">{motivo}</p>
      <div className="mt-6 flex justify-center">
        <Link to={enlace.a}>
          <Boton>{enlace.texto}</Boton>
        </Link>
      </div>
    </div>
  );
}

export function PantallaNoEncontrada() {
  return (
    <NoEncontrado
      titulo="Esta página no existe"
      motivo="Puede que el enlace esté mal escrito o que la página se haya movido."
      enlace={{ a: '/planes', texto: 'Ir a los planes' }}
    />
  );
}
