import 'dotenv/config';

export type Persistencia = 'prisma' | 'memoria';

export interface Configuracion {
  puerto: number;
  entorno: 'desarrollo' | 'produccion' | 'prueba';
  persistencia: Persistencia;
  urlBaseDeDatos: string;
  llaveFirma: string;
  duracionCredencial: string;
  origenesPermitidos: string[];
  zonaHoraria: string;
  costoBcrypt: number;
  contrasenaAdminInicial: string;
  contrasenaDemo: string;
}

function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === '') {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copia .env.example a .env y complétala.`,
    );
  }
  return valor.trim();
}

function opcional(nombre: string, porDefecto: string): string {
  const valor = process.env[nombre];
  return valor && valor.trim() !== '' ? valor.trim() : porDefecto;
}

function esZonaHorariaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

export function leerConfiguracion(): Configuracion {
  const persistencia = opcional('PERSISTENCIA', 'prisma') as Persistencia;
  if (persistencia !== 'prisma' && persistencia !== 'memoria') {
    throw new Error("PERSISTENCIA sólo acepta 'prisma' o 'memoria'.");
  }

  const zonaHoraria = opcional('TZ_NEGOCIO', 'America/Hermosillo');
  if (!esZonaHorariaValida(zonaHoraria)) {
    throw new Error(
      `TZ_NEGOCIO="${zonaHoraria}" no es una zona horaria valida. Tiene que ser un identificador IANA, ` +
        'no el nombre de la ciudad: para Sonora, incluidas Guaymas y Empalme, el valor es America/Hermosillo.',
    );
  }

  const llaveFirma = requerido('JWT_SECRET');
  if (llaveFirma.length < 32) {
    throw new Error(
      'JWT_SECRET debe tener al menos 32 caracteres: una llave corta es una llave adivinable.',
    );
  }

  return {
    puerto: Number(opcional('PORT', '3000')),
    entorno: opcional('NODE_ENV', 'desarrollo') as Configuracion['entorno'],
    persistencia,

    urlBaseDeDatos: persistencia === 'prisma' ? requerido('DATABASE_URL') : '',
    llaveFirma,
    duracionCredencial: opcional('JWT_EXPIRES_IN', '2h'),

    origenesPermitidos: opcional('FRONTEND_ORIGIN', 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    zonaHoraria,
    costoBcrypt: Number(opcional('BCRYPT_COSTO', '10')),
    contrasenaAdminInicial: opcional('SEED_ADMIN_PASSWORD', 'cambia-esta-contrasena'),
    contrasenaDemo: opcional('SEED_DEMO_PASSWORD', 'cambia-esta-contrasena-demo'),
  };
}
