import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { api } from '../api/cliente';
import { useConsulta, useOperacion } from '../api/consulta';
import { ErrorDelServicio } from '../api/errores';
import { AvisoDeError } from '../componentes/Estados';
import { Boton, Campo, Tarjeta } from '../componentes/ui';
import { useSesion } from './ContextoSesion';

export function PantallaRegistro() {
  const { estado, iniciarSesion } = useSesion();
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const destino = (ubicacion.state as { destino?: string } | null)?.destino ?? '/suscripciones';

  const zonas = useConsulta(() => api.zonasDeCobertura(), []);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});

  const registrar = useOperacion(async () => {
    await api.registrar({
      nombre,
      correo,
      contrasena,
      ciudad,
      direccion: direccion.trim() || undefined,
    });

    await iniciarSesion(correo, contrasena);
  });

  if (estado === 'dentro') return <Navigate to={destino} replace />;

  const validar = (): boolean => {
    const encontrados: Record<string, string> = {};
    if (nombre.trim().length < 3) encontrados.nombre = 'Escribe tu nombre completo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      encontrados.correo = 'Escribe un correo válido, como tu@correo.com.';
    }
    if (contrasena.length < 8) {
      encontrados.contrasena = 'La contraseña necesita al menos 8 caracteres.';
    }
    if (ciudad.trim().length < 2) encontrados.ciudad = 'Dinos en qué ciudad vives.';
    setErrores(encontrados);
    return Object.keys(encontrados).length === 0;
  };

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!validar()) return;
    await registrar.ejecutar();
  };

  const porCampo =
    registrar.error instanceof ErrorDelServicio && registrar.error.esValidacion
      ? registrar.error.porCampo
      : {};
  const correoRepetido =
    registrar.error instanceof ErrorDelServicio && registrar.error.codigo === 'CORREO_DUPLICADO';

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="font-serif text-2xl text-cafe-900">Crea tu cuenta</h1>
        <p className="mt-1.5 text-sm text-cafe-600">
          Tu suscripción, tus entregas y tus cobros quedan guardados aquí.
        </p>
      </div>

      <Tarjeta className="p-6">
        <form onSubmit={enviar} noValidate className="space-y-5">
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ana Torres"
            autoComplete="name"
            error={errores.nombre ?? porCampo.nombre}
          />

          <Campo
            etiqueta="Correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            autoComplete="email"
            error={
              errores.correo ??
              porCampo.correo ??
              (correoRepetido ? 'Ya existe una cuenta con ese correo.' : undefined)
            }
          />

          <Campo
            etiqueta="Contraseña"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="new-password"
            ayuda="Mínimo 8 caracteres."
            error={errores.contrasena ?? porCampo.contrasena}
          />

          <Campo
            etiqueta="Ciudad"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Guaymas"
            autoComplete="address-level2"
            error={errores.ciudad ?? porCampo.ciudad}
            ayuda={
              zonas.estado === 'listo' && zonas.datos
                ? `Puedes crear tu cuenta desde donde sea; hoy entregamos en ${zonas.datos.join(' y ')}.`
                : undefined
            }
          />

          <Campo
            etiqueta="Dirección (opcional)"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Av. Serdán 455, Col. Centro"
            autoComplete="street-address"
            ayuda="La puedes poner después, al suscribirte."
            error={porCampo.direccion}
          />

          {registrar.error && !Object.keys(porCampo).length && !correoRepetido ? (
            <AvisoDeError error={registrar.error} />
          ) : null}

          <Boton type="submit" anchoCompleto cargando={registrar.enCurso}>
            {registrar.enCurso ? 'Creando tu cuenta…' : 'Crear cuenta'}
          </Boton>
        </form>
      </Tarjeta>

      <p className="mt-5 text-center text-sm text-cafe-600">
        ¿Ya tienes cuenta?{' '}
        <button
          type="button"
          onClick={() => navegar('/ingresar', { state: { destino } })}
          className="font-medium text-cafe-800 underline underline-offset-2"
        >
          Entrar
        </button>
      </p>

      <p className="mt-2 text-center text-sm">
        <Link to="/planes" className="text-cafe-500 underline underline-offset-2 hover:text-cafe-700">
          Sólo quiero ver los planes
        </Link>
      </p>
    </div>
  );
}
