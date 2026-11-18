import { useState } from 'react';

import { api } from '../../api/cliente';
import { useConsulta, useOperacion } from '../../api/consulta';
import { ErrorDelServicio } from '../../api/errores';
import { AvisoDeError, Cargando } from '../../componentes/Estados';
import {
  dinero,
  fechaLarga,
  hoyISO,
  sumarDiasISO,
  TEXTO_FRECUENCIA,
} from '../../componentes/formato';
import { Boton, Campo, Dialogo, Seleccion } from '../../componentes/ui';
import type { SuscripcionConHistorial } from '../../api/tipos';

interface PropsComunes {
  suscripcion: SuscripcionConHistorial;
  abierto: boolean;
  alCerrar: () => void;
  alTerminar: () => void;
}

export function DialogoPausa({ suscripcion, abierto, alCerrar, alTerminar }: PropsComunes) {
  const [desde, setDesde] = useState(sumarDiasISO(hoyISO(), 1));
  const [hasta, setHasta] = useState(sumarDiasISO(hoyISO(), 21));
  const [errores, setErrores] = useState<{ desde?: string; hasta?: string }>({});

  const pausar = useOperacion(() => api.pausar(suscripcion.id, desde, hasta));

  const validar = (): boolean => {
    const encontrados: typeof errores = {};
    if (desde < hoyISO()) encontrados.desde = 'La pausa no puede empezar antes de hoy.';
    if (hasta <= desde) encontrados.hasta = 'La fecha final tiene que ser posterior a la inicial.';
    setErrores(encontrados);
    return Object.keys(encontrados).length === 0;
  };

  const confirmar = async () => {
    if (!validar()) return;
    const resultado = await pausar.ejecutar();
    if (resultado) {
      alTerminar();
      alCerrar();
    }
  };

  return (
    <Dialogo abierto={abierto} titulo="Pausar mi suscripción" alCerrar={alCerrar}>
      <p className="text-sm leading-relaxed text-cafe-600">
        No te llegará ninguna caja entre esas fechas, y tampoco te cobraremos esos ciclos. Al
        terminar la pausa, todo sigue igual.
      </p>

      <div className="mt-5 space-y-4">
        <Campo
          etiqueta="Desde"
          type="date"
          value={desde}
          min={hoyISO()}
          onChange={(e) => setDesde(e.target.value)}
          error={errores.desde}
        />
        <Campo
          etiqueta="Hasta"
          type="date"
          value={hasta}
          min={sumarDiasISO(desde, 1)}
          onChange={(e) => setHasta(e.target.value)}
          error={errores.hasta}
        />
        <AvisoDeError error={pausar.error} />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Boton variante="secundario" onClick={alCerrar}>
          Mejor no
        </Boton>
        <Boton onClick={confirmar} cargando={pausar.enCurso}>
          Pausar
        </Boton>
      </div>
    </Dialogo>
  );
}

export function DialogoSaltar({ suscripcion, abierto, alCerrar, alTerminar }: PropsComunes) {
  const [resultado, setResultado] = useState<{ siguienteFecha: string | null } | null>(null);
  const saltar = useOperacion(() => api.saltarProximaEntrega(suscripcion.id));

  const confirmar = async () => {
    const hecho = await saltar.ejecutar();
    if (hecho) {
      setResultado({ siguienteFecha: hecho.siguienteFecha });
      alTerminar();
    }
  };

  const cerrar = () => {
    setResultado(null);
    saltar.limpiarError();
    alCerrar();
  };

  return (
    <Dialogo abierto={abierto} titulo="Saltarme esta entrega" alCerrar={cerrar}>
      {resultado ? (
        <>
          <p className="text-sm leading-relaxed text-cafe-700">
            Listo, esta entrega no se arma y no se te cobra.
            {resultado.siguienteFecha
              ? ` Tu siguiente caja llegaría el ${fechaLarga(resultado.siguienteFecha)}.`
              : ''}
          </p>
          <div className="mt-6 flex justify-end">
            <Boton onClick={cerrar}>Entendido</Boton>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-cafe-600">
            Te saltas sólo la próxima entrega: la suscripción sigue activa y la siguiente caja te
            llega normal. No se te cobra el ciclo que te saltas.
          </p>
          {suscripcion.proximaEntrega ? (
            <p className="mt-3 rounded-xl bg-crema-100 px-4 py-3 text-sm text-cafe-700">
              Te saltarías la del{' '}
              <strong className="text-cafe-900">
                {fechaLarga(suscripcion.proximaEntrega.fechaProgramada)}
              </strong>
              .
            </p>
          ) : null}

          <div className="mt-4">
            <AvisoDeError error={saltar.error} />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Boton variante="secundario" onClick={cerrar}>
              Mejor no
            </Boton>
            <Boton
              onClick={confirmar}
              cargando={saltar.enCurso}
              disabled={saltar.error instanceof ErrorDelServicio && saltar.error.esReglaDeNegocio}
            >
              Sí, saltarme esta
            </Boton>
          </div>
        </>
      )}
    </Dialogo>
  );
}

export function DialogoCambioDePlan({ suscripcion, abierto, alCerrar, alTerminar }: PropsComunes) {
  const planes = useConsulta(() => api.planes(), [], { activa: abierto });
  const [planNuevoId, setPlanNuevoId] = useState('');
  const [resultado, setResultado] = useState<{
    aplicaDesdeElCiclo: number;
    fechaDeEseCiclo: string;
    pagaraPorCiclo: number;
  } | null>(null);

  const pedir = useOperacion(() => api.pedirCambioDePlan(suscripcion.id, planNuevoId));

  const disponibles = (planes.datos ?? []).filter((plan) => plan.id !== suscripcion.planId);

  const confirmar = async () => {
    if (!planNuevoId) return;
    const hecho = await pedir.ejecutar();
    if (hecho) {
      setResultado(hecho);
      alTerminar();
    }
  };

  const cerrar = () => {
    setResultado(null);
    pedir.limpiarError();
    alCerrar();
  };

  return (
    <Dialogo abierto={abierto} titulo="Cambiar de plan" alCerrar={cerrar}>
      {resultado ? (
        <>
          <p className="text-sm leading-relaxed text-cafe-700">
            Pedimos el cambio. Aplicaría a partir de tu entrega del{' '}
            <strong className="text-cafe-900">{fechaLarga(resultado.fechaDeEseCiclo)}</strong> (ciclo{' '}
            {resultado.aplicaDesdeElCiclo}), y de ahí en adelante pagarías{' '}
            <strong className="text-cafe-900">{dinero(resultado.pagaraPorCiclo)}</strong> por
            entrega.
          </p>
          <p className="mt-3 text-sm text-cafe-500">
            Queda en revisión: te avisamos cuando lo confirmemos. Mientras tanto, tu plan actual
            sigue igual.
          </p>
          <div className="mt-6 flex justify-end">
            <Boton onClick={cerrar}>Entendido</Boton>
          </div>
        </>
      ) : planes.estado === 'cargando' ? (
        <Cargando mensaje="Cargando los planes…" />
      ) : planes.estado === 'error' ? (
        <>
          <AvisoDeError error={planes.error} />
          <div className="mt-6 flex justify-end gap-2">
            <Boton variante="secundario" onClick={cerrar}>
              Cerrar
            </Boton>
            <Boton onClick={planes.recargar}>Volver a intentar</Boton>
          </div>
        </>
      ) : disponibles.length === 0 ? (
        <>
          <p className="text-sm leading-relaxed text-cafe-600">
            Por ahora no hay otro plan al que puedas cambiarte: el que tienes es el único
            disponible.
          </p>
          <div className="mt-6 flex justify-end">
            <Boton onClick={cerrar}>Entendido</Boton>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-cafe-600">
            Elige a qué plan quieres cambiarte. Te diremos desde qué entrega aplicaría y cuánto
            pagarías a partir de ahí.
          </p>

          <div className="mt-5 space-y-4">
            <Seleccion
              etiqueta="Nuevo plan"
              value={planNuevoId}
              onChange={(e) => setPlanNuevoId(e.target.value)}
              opciones={[
                { valor: '', nombre: 'Elige un plan…' },
                ...disponibles.map((plan) => ({
                  valor: plan.id,
                  nombre: `${plan.nombre} — ${dinero(plan.precioCiclo)} ${TEXTO_FRECUENCIA[plan.frecuencia]}`,
                })),
              ]}
            />
            <AvisoDeError error={pedir.error} />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Boton variante="secundario" onClick={cerrar}>
              Mejor no
            </Boton>
            <Boton onClick={confirmar} cargando={pedir.enCurso} disabled={!planNuevoId}>
              Pedir el cambio
            </Boton>
          </div>
        </>
      )}
    </Dialogo>
  );
}

export function DialogoCancelar({ suscripcion, abierto, alCerrar, alTerminar }: PropsComunes) {
  const [resultado, setResultado] = useState<{ ultimaEntrega: { fechaProgramada: string } | null } | null>(
    null,
  );
  const cancelar = useOperacion(() => api.cancelar(suscripcion.id));

  const confirmar = async () => {
    const hecho = await cancelar.ejecutar();
    if (hecho) {
      setResultado({ ultimaEntrega: hecho.ultimaEntrega });
      alTerminar();
    }
  };

  const cerrar = () => {
    setResultado(null);
    cancelar.limpiarError();
    alCerrar();
  };

  return (
    <Dialogo abierto={abierto} titulo="Cancelar mi suscripción" alCerrar={cerrar}>
      {resultado ? (
        <>
          <p className="text-sm leading-relaxed text-cafe-700">
            Tu suscripción quedó cancelada.
            {resultado.ultimaEntrega
              ? ` Como ya pagaste ese ciclo, tu última caja te llega el ${fechaLarga(resultado.ultimaEntrega.fechaProgramada)}.`
              : ' No hay ninguna caja pendiente por entregarte.'}
          </p>
          <p className="mt-3 text-sm text-cafe-500">
            Si cambias de opinión, puedes volver a suscribirte cuando quieras.
          </p>
          <div className="mt-6 flex justify-end">
            <Boton onClick={cerrar}>Entendido</Boton>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-cafe-600">
            Dejarás de recibir cajas. Si ya pagaste el ciclo que está programado, esa entrega se
            respeta y te la mandamos de todos modos.
          </p>
          <p className="mt-3 text-sm text-cafe-500">
            ¿Sólo te vas de viaje? Puedes <strong>pausar</strong> en lugar de cancelar.
          </p>

          <div className="mt-4">
            <AvisoDeError error={cancelar.error} />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Boton variante="secundario" onClick={cerrar}>
              Mejor no
            </Boton>
            <Boton variante="peligro" onClick={confirmar} cargando={cancelar.enCurso}>
              Sí, cancelar
            </Boton>
          </div>
        </>
      )}
    </Dialogo>
  );
}
