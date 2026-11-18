import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api } from '../../api/cliente';
import { useConsulta, useOperacion } from '../../api/consulta';
import { ErrorDelServicio } from '../../api/errores';
import { AvisoDeError, Cargando, ErrorDePantalla } from '../../componentes/Estados';
import {
  dinero,
  DIAS_DE_LA_SEMANA,
  fechaLarga,
  TEXTO_FRECUENCIA,
} from '../../componentes/formato';
import { Boton, Campo, Encabezado, Seleccion, Tarjeta } from '../../componentes/ui';
import { useSesion } from '../../sesion/ContextoSesion';
import { NoEncontrado } from '../../PantallaNoEncontrada';
import type { ResultadoContratacion } from '../../api/tipos';

interface ErroresDelFormulario {
  direccionEntrega?: string;
  ciudad?: string;
  diaEntregaPreferido?: string;
}

export function PantallaContratar() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const { cliente } = useSesion();

  const plan = useConsulta(() => api.plan(id), [id]);
  const zonas = useConsulta(() => api.zonasDeCobertura(), []);

  const [direccionEntrega, setDireccion] = useState(cliente?.direccion ?? '');
  const [ciudad, setCiudad] = useState(cliente?.ciudad ?? '');
  const [diaEntregaPreferido, setDia] = useState(3);
  const [errores, setErrores] = useState<ErroresDelFormulario>({});
  const [resultado, setResultado] = useState<ResultadoContratacion | null>(null);

  const contratar = useOperacion(async () =>
    api.contratar({ planId: id, direccionEntrega, ciudad, diaEntregaPreferido }),
  );

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

  if (resultado) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-verde-50 text-3xl">
          <span aria-hidden="true">📦</span>
        </div>
        <h1 className="font-serif text-2xl text-cafe-900">¡Listo, ya estás suscrito!</h1>
        <p className="mt-2 text-sm leading-relaxed text-cafe-600">
          Te quedaste en el plan <strong className="text-cafe-800">{datos.nombre}</strong>.
        </p>

        {resultado.primeraEntrega ? (
          <Tarjeta className="mt-6 p-6 text-left">
            <p className="text-xs uppercase tracking-wide text-cafe-500">Tu primera entrega</p>
            <p className="mt-1 font-serif text-xl text-cafe-900">
              {fechaLarga(resultado.primeraEntrega.fechaProgramada)}
            </p>
            <p className="mt-2 text-sm text-cafe-600">
              Después te llegará {TEXTO_FRECUENCIA[datos.frecuencia]}, sin que tengas que volver a
              pedirla.
            </p>
          </Tarjeta>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Boton onClick={() => navegar(`/suscripciones/${resultado.suscripcion.id}`)}>
            Ver mi suscripción
          </Boton>
          <Link to="/entregas">
            <Boton variante="secundario">Ver mis entregas</Boton>
          </Link>
        </div>
      </div>
    );
  }

  const validar = (): boolean => {
    const encontrados: ErroresDelFormulario = {};
    if (direccionEntrega.trim().length < 6) {
      encontrados.direccionEntrega = 'Escribe la dirección completa: calle, número y colonia.';
    }
    if (ciudad.trim().length < 2) {
      encontrados.ciudad = 'Dinos en qué ciudad te entregamos.';
    }
    if (diaEntregaPreferido < 1 || diaEntregaPreferido > 7) {
      encontrados.diaEntregaPreferido = 'Elige un día de la semana.';
    }
    setErrores(encontrados);
    return Object.keys(encontrados).length === 0;
  };

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();

    if (!validar()) return;
    const creada = await contratar.ejecutar();
    if (creada) setResultado(creada);
  };

  const delServicio =
    contratar.error instanceof ErrorDelServicio && contratar.error.esValidacion
      ? contratar.error.porCampo
      : {};

  const errorDeRegla =
    contratar.error instanceof ErrorDelServicio && contratar.error.esReglaDeNegocio
      ? contratar.error
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={`/planes/${datos.id}`}
        className="mb-4 inline-block text-sm text-cafe-600 hover:text-cafe-900"
      >
        ← Volver al plan
      </Link>

      <Encabezado
        titulo="Confirma tu suscripción"
        descripcion={`${datos.nombre} · ${dinero(datos.precioCiclo)} ${TEXTO_FRECUENCIA[datos.frecuencia]}`}
      />

      {errorDeRegla ? <ExplicacionDeRegla error={errorDeRegla} /> : null}

      <Tarjeta className="p-6">
        <form onSubmit={enviar} noValidate className="space-y-5">
          <Campo
            etiqueta="Dirección de entrega"
            value={direccionEntrega}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Av. Serdán 455, Col. Centro"
            autoComplete="street-address"
            error={errores.direccionEntrega ?? delServicio.direccionEntrega}
          />

          <Campo
            etiqueta="Ciudad"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            placeholder="Guaymas"
            autoComplete="address-level2"
            error={errores.ciudad ?? delServicio.ciudad}
            ayuda={
              zonas.estado === 'listo' && zonas.datos
                ? `Entregamos en ${zonas.datos.join(' y ')}.`
                : undefined
            }
          />

          <Seleccion
            etiqueta="¿Qué día de la semana te conviene?"
            value={diaEntregaPreferido}
            onChange={(e) => setDia(Number(e.target.value))}
            opciones={DIAS_DE_LA_SEMANA.map((dia) => ({ valor: dia.valor, nombre: dia.nombre }))}
            error={errores.diaEntregaPreferido ?? delServicio.diaEntregaPreferido}
            ayuda="Tus entregas caerán siempre en ese día."
          />

          {contratar.error && !errorDeRegla && !Object.keys(delServicio).length ? (
            <AvisoDeError error={contratar.error} />
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Boton type="submit" cargando={contratar.enCurso} anchoCompleto>
              {contratar.enCurso ? 'Creando tu suscripción…' : 'Confirmar suscripción'}
            </Boton>
            <Link to={`/planes/${datos.id}`} className="sm:w-40">
              <Boton variante="secundario" anchoCompleto>
                Cancelar
              </Boton>
            </Link>
          </div>

          <p className="text-xs leading-relaxed text-cafe-500">
            Al confirmar, programamos tu primera entrega. Puedes pausar, saltarte una entrega o
            cancelar desde tu cuenta cuando quieras.
          </p>
        </form>
      </Tarjeta>
    </div>
  );
}

function ExplicacionDeRegla({ error }: { error: ErrorDelServicio }) {
  const detalle = error.detalle as { ciudadesConCobertura?: string[]; suscripcionId?: string } | undefined;

  return (
    <div className="mb-6 rounded-2xl border border-ambar-200 bg-ambar-50 p-5" role="alert">
      <p className="text-sm font-medium leading-relaxed text-ambar-900">{error.message}</p>

      {error.codigo === 'FUERA_DE_COBERTURA' && detalle?.ciudadesConCobertura ? (
        <p className="mt-2 text-sm text-ambar-800">
          Por ahora entregamos en {detalle.ciudadesConCobertura.join(' y ')}. Si cambias de ciudad,
          corrige el campo y vuelve a intentarlo.
        </p>
      ) : null}

      {error.codigo === 'SUSCRIPCION_DUPLICADA' && detalle?.suscripcionId ? (
        <Link
          to={`/suscripciones/${detalle.suscripcionId}`}
          className="mt-3 inline-block text-sm font-medium text-ambar-900 underline underline-offset-2"
        >
          Ver la suscripción que ya tienes
        </Link>
      ) : null}

      {error.codigo === 'STOCK_INSUFICIENTE' ? (
        <Link
          to="/planes"
          className="mt-3 inline-block text-sm font-medium text-ambar-900 underline underline-offset-2"
        >
          Ver otros planes disponibles
        </Link>
      ) : null}
    </div>
  );
}
