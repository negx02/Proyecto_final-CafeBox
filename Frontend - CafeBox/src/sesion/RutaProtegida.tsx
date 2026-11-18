import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Cargando } from '../componentes/Estados';
import { useSesion } from './ContextoSesion';

export function RutaProtegida() {
  const { estado } = useSesion();
  const ubicacion = useLocation();

  if (estado === 'comprobando') {
    return <Cargando mensaje="Comprobando tu sesión…" />;
  }

  if (estado === 'fuera') {
    return (
      <Navigate
        to="/ingresar"
        replace
        state={{ destino: ubicacion.pathname + ubicacion.search }}
      />
    );
  }

  return <Outlet />;
}
