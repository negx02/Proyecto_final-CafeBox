import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useOperacion } from '../api/consulta';
import { ErrorDelServicio } from '../api/errores';
import { AvisoDeError } from '../componentes/Estados';
import { Boton, Campo, Tarjeta } from '../componentes/ui';
import { useSesion } from './ContextoSesion';

export function PantallaIngreso() {
  const { estado, iniciarSesion } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const destino = (ubicacion.state as { destino?: string } | null)?.destino ?? '/suscripciones';

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<{ correo?: string; contrasena?: string }>({});

  const entrar = useOperacion(async () => {
    await iniciarSesion(correo, contrasena);
  });

  if (estado === 'dentro') return <Navigate to={destino} replace />;

  const validar = (): boolean => {
    const encontrados: typeof errores = {};
    if (!correo.includes('@')) encontrados.correo = 'Escribe tu correo completo.';
    if (contrasena.length === 0) encontrados.contrasena = 'Escribe tu contraseña.';
    setErrores(encontrados);
    return Object.keys(encontrados).length === 0;
  };

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!validar()) return;
    await entrar.ejecutar();

  };

  const credencialRechazada =
    entrar.error instanceof ErrorDelServicio && entrar.error.estado === 401;
  const porCampo =
    entrar.error instanceof ErrorDelServicio && entrar.error.esValidacion
      ? entrar.error.porCampo
      : {};

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="font-serif text-2xl text-cafe-900">Entra a tu cuenta</h1>
        <p className="mt-1.5 text-sm text-cafe-600">
          Aquí ves tus entregas, pausas tu suscripción y revisas tus cobros.
        </p>
      </div>

      <Tarjeta className="p-6">
        <form onSubmit={enviar} noValidate className="space-y-5">
          <Campo
            etiqueta="Correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            autoComplete="email"
            error={errores.correo ?? porCampo.correo}
          />

          <Campo
            etiqueta="Contraseña"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="current-password"
            error={errores.contrasena ?? porCampo.contrasena}
          />

          {credencialRechazada ? (
            <p
              className="rounded-xl border border-rojo-200 bg-rojo-50 px-4 py-3 text-sm text-rojo-800"
              role="alert"
            >
              El correo o la contraseña no coinciden. Revísalos e inténtalo otra vez.
            </p>
          ) : entrar.error && !Object.keys(porCampo).length ? (
            <AvisoDeError error={entrar.error} />
          ) : null}

          <Boton type="submit" anchoCompleto cargando={entrar.enCurso}>
            {entrar.enCurso ? 'Entrando…' : 'Entrar'}
          </Boton>
        </form>
      </Tarjeta>

      <p className="mt-5 text-center text-sm text-cafe-600">
        ¿Todavía no tienes cuenta?{' '}
        <Link
          to="/registrarse"
          state={{ destino }}
          className="font-medium text-cafe-800 underline underline-offset-2"
        >
          Crear una
        </Link>
      </p>

      <p className="mt-2 text-center text-sm">
        <button
          type="button"
          onClick={() => navegar('/planes')}
          className="text-cafe-500 underline underline-offset-2 hover:text-cafe-700"
        >
          Sólo quiero ver los planes
        </button>
      </p>
    </div>
  );
}
