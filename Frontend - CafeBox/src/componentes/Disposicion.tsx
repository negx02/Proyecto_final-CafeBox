import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useSesion } from '../sesion/ContextoSesion';
import { Boton } from './ui';

const ENLACES_PUBLICOS = [{ a: '/planes', texto: 'Planes' }];

const ENLACES_DE_CLIENTE = [
  { a: '/planes', texto: 'Planes' },
  { a: '/suscripciones', texto: 'Mis suscripciones' },
  { a: '/entregas', texto: 'Mis entregas' },
  { a: '/cobros', texto: 'Mis cobros' },
];

export function Disposicion() {
  const { estado, cliente, usuario, cerrarSesion, aviso, descartarAviso } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const dentro = estado === 'dentro';
  const enlaces = dentro ? ENLACES_DE_CLIENTE : ENLACES_PUBLICOS;

  const salir = () => {
    cerrarSesion();
    setMenuAbierto(false);
    navegar('/planes');
  };

  return (
    <div className="flex min-h-screen flex-col bg-crema-50">
      <header className="sticky top-0 z-40 border-b border-cafe-200 bg-crema-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cafe-400"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-cafe-800 text-base text-crema-50"
            >
              ☕
            </span>
            <span className="font-serif text-lg leading-none text-cafe-900">
              CafeBox
              <span className="mt-0.5 block text-[11px] font-sans font-normal tracking-wide text-cafe-500">
                café de especialidad por suscripción
              </span>
            </span>
          </Link>

                    <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {enlaces.map((enlace) => (
              <NavLink
                key={enlace.a}
                to={enlace.a}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-cafe-100 font-medium text-cafe-900'
                      : 'text-cafe-700 hover:bg-crema-100',
                  ].join(' ')
                }
              >
                {enlace.texto}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {dentro ? (
              <>
                <Link
                  to="/perfil"
                  className="rounded-lg px-3 py-2 text-sm text-cafe-700 transition hover:bg-crema-100"
                >
                  {cliente?.nombre ?? usuario?.correo}
                </Link>
                <Boton variante="secundario" onClick={salir}>
                  Salir
                </Boton>
              </>
            ) : (
              <>
                <Link
                  to="/ingresar"
                  state={{ destino: ubicacion.pathname }}
                  className="rounded-lg px-3 py-2 text-sm text-cafe-700 transition hover:bg-crema-100"
                >
                  Entrar
                </Link>
                <Boton onClick={() => navegar('/registrarse')}>Crear cuenta</Boton>
              </>
            )}
          </div>

                    <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-expanded={menuAbierto}
            aria-label="Abrir menú"
            className="rounded-lg border border-cafe-300 px-3 py-2 text-sm text-cafe-800 md:hidden"
          >
            {menuAbierto ? '✕' : '☰'}
          </button>
        </div>

        {menuAbierto ? (
          <nav
            className="border-t border-cafe-200 bg-crema-50 px-4 py-3 md:hidden"
            aria-label="Principal"
          >
            <ul className="space-y-1">
              {enlaces.map((enlace) => (
                <li key={enlace.a}>
                  <NavLink
                    to={enlace.a}
                    onClick={() => setMenuAbierto(false)}
                    className={({ isActive }) =>
                      [
                        'block rounded-lg px-3 py-2.5 text-sm',
                        isActive ? 'bg-cafe-100 font-medium text-cafe-900' : 'text-cafe-700',
                      ].join(' ')
                    }
                  >
                    {enlace.texto}
                  </NavLink>
                </li>
              ))}
              <li className="pt-2">
                {dentro ? (
                  <div className="space-y-1">
                    <NavLink
                      to="/perfil"
                      onClick={() => setMenuAbierto(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm text-cafe-700"
                    >
                      Mi cuenta
                    </NavLink>
                    <Boton variante="secundario" anchoCompleto onClick={salir}>
                      Salir
                    </Boton>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Boton
                      variante="secundario"
                      anchoCompleto
                      onClick={() => {
                        setMenuAbierto(false);
                        navegar('/ingresar');
                      }}
                    >
                      Entrar
                    </Boton>
                    <Boton
                      anchoCompleto
                      onClick={() => {
                        setMenuAbierto(false);
                        navegar('/registrarse');
                      }}
                    >
                      Crear cuenta
                    </Boton>
                  </div>
                )}
              </li>
            </ul>
          </nav>
        ) : null}
      </header>

            {aviso ? (
        <div className="border-b border-ambar-200 bg-ambar-50" role="alert">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="text-sm text-ambar-900">{aviso}</p>
            <button
              type="button"
              onClick={descartarAviso}
              className="shrink-0 rounded-lg px-2 py-1 text-sm text-ambar-800 hover:bg-ambar-100"
              aria-label="Descartar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-cafe-200 bg-crema-100">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-cafe-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>CafeBox · Café de especialidad por suscripción · Guaymas, Sonora</p>
          <p>
            Proyecto escolar — Tópico de Aplicaciones Web, avance 3. Portal del cliente.
          </p>
        </div>
      </footer>
    </div>
  );
}
