import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

type Variante = 'primario' | 'secundario' | 'suave' | 'peligro';

const ESTILOS_BOTON: Record<Variante, string> = {
  primario: 'bg-cafe-800 text-crema-50 hover:bg-cafe-900 focus-visible:outline-cafe-800',
  secundario:
    'border border-cafe-300 bg-white text-cafe-800 hover:bg-crema-100 focus-visible:outline-cafe-400',
  suave: 'text-cafe-700 hover:bg-crema-100 focus-visible:outline-cafe-300',
  peligro: 'border border-rojo-300 bg-white text-rojo-700 hover:bg-rojo-50 focus-visible:outline-rojo-400',
};

export interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
  anchoCompleto?: boolean;
}

export const Boton = forwardRef<HTMLButtonElement, PropsBoton>(function Boton(
  { variante = 'primario', cargando = false, anchoCompleto = false, children, className = '', disabled, ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={resto.type ?? 'button'}
      disabled={disabled || cargando}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium',
        'transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        ESTILOS_BOTON[variante],
        anchoCompleto ? 'w-full' : '',
        className,
      ].join(' ')}
      {...resto}
    >
      {cargando ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});

interface PropsCampo extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
}

export const Campo = forwardRef<HTMLInputElement, PropsCampo>(function Campo(
  { etiqueta, error, ayuda, className = '', ...resto },
  ref,
) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-cafe-800">
        {etiqueta}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? idError : null, ayuda ? idAyuda : null]
          .filter(Boolean)
          .join(' ') || undefined}
        className={[
          'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-cafe-900 placeholder:text-cafe-400',
          'focus:outline focus:outline-2 focus:outline-offset-1',
          error
            ? 'border-rojo-400 focus:outline-rojo-400'
            : 'border-cafe-300 focus:outline-cafe-400',
          className,
        ].join(' ')}
        {...resto}
      />
      {ayuda && !error ? (
        <p id={idAyuda} className="mt-1.5 text-xs text-cafe-500">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={idError} className="mt-1.5 text-xs font-medium text-rojo-700">
          {error}
        </p>
      ) : null}
    </div>
  );
});

interface PropsSeleccion extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  opciones: { valor: string | number; nombre: string }[];
}

export const Seleccion = forwardRef<HTMLSelectElement, PropsSeleccion>(function Seleccion(
  { etiqueta, error, ayuda, opciones, className = '', ...resto },
  ref,
) {
  const id = useId();
  const idError = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-cafe-800">
        {etiqueta}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        className={[
          'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-cafe-900',
          'focus:outline focus:outline-2 focus:outline-offset-1',
          error ? 'border-rojo-400 focus:outline-rojo-400' : 'border-cafe-300 focus:outline-cafe-400',
          className,
        ].join(' ')}
        {...resto}
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.nombre}
          </option>
        ))}
      </select>
      {ayuda && !error ? <p className="mt-1.5 text-xs text-cafe-500">{ayuda}</p> : null}
      {error ? (
        <p id={idError} className="mt-1.5 text-xs font-medium text-rojo-700">
          {error}
        </p>
      ) : null}
    </div>
  );
});

type Tono = 'neutro' | 'verde' | 'ambar' | 'rojo' | 'azul';

const ESTILOS_INSIGNIA: Record<Tono, string> = {
  neutro: 'bg-cafe-100 text-cafe-700 ring-cafe-200',
  verde: 'bg-verde-50 text-verde-800 ring-verde-200',
  ambar: 'bg-ambar-50 text-ambar-800 ring-ambar-200',
  rojo: 'bg-rojo-50 text-rojo-800 ring-rojo-200',
  azul: 'bg-azul-50 text-azul-800 ring-azul-200',
};

export function Insignia({ children, tono = 'neutro' }: { children: ReactNode; tono?: Tono }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ESTILOS_INSIGNIA[tono]}`}
    >
      {children}
    </span>
  );
}

export function Tarjeta({
  children,
  className = '',
  comoEtiqueta: Etiqueta = 'div',
}: {
  children: ReactNode;
  className?: string;
  comoEtiqueta?: 'div' | 'article' | 'section' | 'li';
}) {
  return (
    <Etiqueta
      className={`rounded-2xl border border-cafe-200 bg-white shadow-[0_1px_2px_rgba(43,29,22,0.04)] ${className}`}
    >
      {children}
    </Etiqueta>
  );
}

export function Encabezado({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl text-cafe-900 sm:text-3xl">{titulo}</h1>
        {descripcion ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-cafe-600">{descripcion}</p>
        ) : null}
      </div>
      {acciones ? <div className="flex shrink-0 gap-2">{acciones}</div> : null}
    </header>
  );
}

export function Dialogo({
  abierto,
  titulo,
  children,
  alCerrar,
}: {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  alCerrar: () => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') alCerrar();
    };
    document.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';
    contenedor.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-cafe-900/40 backdrop-blur-sm"
        onClick={alCerrar}
        aria-hidden="true"
      />
      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <h2 id={idTitulo} className="font-serif text-xl text-cafe-900">
          {titulo}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-cafe-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-cafe-900">{children}</dd>
    </div>
  );
}

export function Separador() {
  return <hr className="border-cafe-200" />;
}
