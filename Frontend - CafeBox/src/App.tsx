import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { Disposicion } from './componentes/Disposicion';
import { PantallaCobros } from './caracteristicas/cobros/PantallaCobros';
import { PantallaEntrega } from './caracteristicas/entregas/PantallaEntrega';
import { PantallaEntregas } from './caracteristicas/entregas/PantallaEntregas';
import { PantallaInicio } from './caracteristicas/inicio/PantallaInicio';
import { PantallaContratar } from './caracteristicas/planes/PantallaContratar';
import { PantallaPlan } from './caracteristicas/planes/PantallaPlan';
import { PantallaPlanes } from './caracteristicas/planes/PantallaPlanes';
import { PantallaPerfil } from './caracteristicas/perfil/PantallaPerfil';
import { PantallaMisSuscripciones } from './caracteristicas/suscripciones/PantallaMisSuscripciones';
import { PantallaSuscripcion } from './caracteristicas/suscripciones/PantallaSuscripcion';
import { PantallaNoEncontrada } from './PantallaNoEncontrada';
import { ProveedorDeSesion } from './sesion/ContextoSesion';
import { PantallaIngreso } from './sesion/PantallaIngreso';
import { PantallaRegistro } from './sesion/PantallaRegistro';
import { RutaProtegida } from './sesion/RutaProtegida';

export function App() {
  return (
    <BrowserRouter>
      <ProveedorDeSesion>
        <Routes>
          <Route element={<Disposicion />}>
                        <Route index element={<PantallaInicio />} />
            <Route path="planes" element={<PantallaPlanes />} />
            <Route path="planes/:id" element={<PantallaPlan />} />
            <Route path="ingresar" element={<PantallaIngreso />} />
            <Route path="registrarse" element={<PantallaRegistro />} />

                        <Route element={<RutaProtegida />}>
              <Route path="planes/:id/suscribirse" element={<PantallaContratar />} />
              <Route path="suscripciones" element={<PantallaMisSuscripciones />} />
              <Route path="suscripciones/:id" element={<PantallaSuscripcion />} />
              <Route path="entregas" element={<PantallaEntregas />} />
              <Route path="entregas/:id" element={<PantallaEntrega />} />
              <Route path="cobros" element={<PantallaCobros />} />
              <Route path="perfil" element={<PantallaPerfil />} />
            </Route>

            <Route path="*" element={<PantallaNoEncontrada />} />
          </Route>
        </Routes>
      </ProveedorDeSesion>
    </BrowserRouter>
  );
}
