import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useOperacion } from '../../api/consulta';
import { ErrorDelServicio } from '../../api/errores';
import { AvisoDeError, AvisoDeExito } from '../../componentes/Estados';
import { marcaDeTiempo } from '../../componentes/formato';
import { Boton, Campo, Dato, Encabezado, Tarjeta } from '../../componentes/ui';
import { useSesion } from '../../sesion/ContextoSesion';

export function PantallaPerfil() {
  const { usuario, cliente, recargarPerfil, cerrarSesion } = useSesion();

  const [direccion, setDireccion] = useState(cliente?.direccion ?? '');
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '');
  const [ciudad, setCiudad] = useState(cliente?.ciudad ?? '');
  const [pagoTitular, setPagoTitular] = useState(cliente?.pagoTitular ?? '');
  const [pagoUltimos4, setPagoUltimos4] = useState(cliente?.pagoUltimos4 ?? '');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardado, setGuardado] = useState(false);

  const guardar = useOperacion(async () => {
    await api.actualizarPerfil({
      direccion: direccion.trim() || undefined,
      telefono: telefono.trim() || undefined,
      ciudad: ciudad.trim() || undefined,
      pagoTitular: pagoTitular.trim() || undefined,
      pagoUltimos4: pagoUltimos4.trim() || undefined,
    });
    await recargarPerfil();
  });

  const validar = (): boolean => {
    const encontrados: Record<string, string> = {};
    if (ciudad.trim().length < 2) encontrados.ciudad = 'La ciudad no puede quedar vacía.';
    if (telefono && !/^\d{7,15}$/.test(telefono.trim())) {
      encontrados.telefono = 'Escribe sólo números, de 7 a 15 dígitos.';
    }
    if (pagoUltimos4 && !/^\d{4}$/.test(pagoUltimos4.trim())) {
      encontrados.pagoUltimos4 = 'Son los últimos 4 dígitos de tu tarjeta.';
    }
    if (pagoUltimos4 && !pagoTitular.trim()) {
      encontrados.pagoTitular = 'Pon el nombre como aparece en la tarjeta.';
    }
    setErrores(encontrados);
    return Object.keys(encontrados).length === 0;
  };

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setGuardado(false);
    if (!validar()) return;
    const hecho = await guardar.ejecutar();
    if (hecho !== undefined) setGuardado(true);
  };

  const porCampo =
    guardar.error instanceof ErrorDelServicio && guardar.error.esValidacion
      ? guardar.error.porCampo
      : {};

  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado
        titulo="Mi cuenta"
        descripcion="Tu dirección, tu teléfono y la tarjeta con la que te cobramos."
      />

      <Tarjeta className="mb-5 p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Dato etiqueta="Nombre">{cliente?.nombre ?? '—'}</Dato>
          <Dato etiqueta="Correo">{usuario?.correo ?? '—'}</Dato>
          <Dato etiqueta="Cliente desde">
            {cliente ? marcaDeTiempo(cliente.creadoEn) : '—'}
          </Dato>
        </dl>
      </Tarjeta>

      <Tarjeta className="p-6">
        <form onSubmit={enviar} noValidate className="space-y-5">
          <h2 className="font-serif text-lg text-cafe-900">Entrega</h2>

          <Campo
            etiqueta="Dirección"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Blvd. Solidaridad 455, Col. Palmar del Sol"
            autoComplete="street-address"
            ayuda="Esta es tu dirección de referencia. Cada suscripción guarda la suya."
            error={errores.direccion ?? porCampo.direccion}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              etiqueta="Ciudad"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              autoComplete="address-level2"
              error={errores.ciudad ?? porCampo.ciudad}
            />
            <Campo
              etiqueta="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="6621234567"
              inputMode="numeric"
              autoComplete="tel"
              error={errores.telefono ?? porCampo.telefono}
            />
          </div>

          <hr className="border-cafe-200" />

          <div>
            <h2 className="font-serif text-lg text-cafe-900">Pago</h2>
            <p className="mt-1 text-sm text-cafe-500">
              Guardamos sólo el titular y los últimos cuatro dígitos. El número completo no se
              almacena.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr,10rem]">
            <Campo
              etiqueta="Titular de la tarjeta"
              value={pagoTitular}
              onChange={(e) => setPagoTitular(e.target.value)}
              placeholder="Como aparece en la tarjeta"
              autoComplete="cc-name"
              error={errores.pagoTitular ?? porCampo.pagoTitular}
            />
            <Campo
              etiqueta="Últimos 4 dígitos"
              value={pagoUltimos4}
              onChange={(e) => setPagoUltimos4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4242"
              inputMode="numeric"
              maxLength={4}
              error={errores.pagoUltimos4 ?? porCampo.pagoUltimos4}
            />
          </div>

          {guardado && !guardar.error ? (
            <AvisoDeExito>
              Guardado. Si tenías un cobro fallido, ya puedes{' '}
              <Link to="/cobros" className="font-medium underline underline-offset-2">
                reintentarlo desde tus cobros
              </Link>
              .
            </AvisoDeExito>
          ) : null}

          {guardar.error && !Object.keys(porCampo).length ? (
            <AvisoDeError error={guardar.error} />
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Boton type="submit" cargando={guardar.enCurso}>
              Guardar cambios
            </Boton>
            <Boton variante="suave" onClick={cerrarSesion}>
              Cerrar sesión
            </Boton>
          </div>
        </form>
      </Tarjeta>
    </div>
  );
}
