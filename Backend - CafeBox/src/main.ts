import { componer } from './composicion.js';
import { leerConfiguracion } from './configuracion.js';
import { crearServidor } from './http/servidor.js';

async function arrancar(): Promise<void> {
  const configuracion = leerConfiguracion();
  const app = componer(configuracion);
  const servidor = crearServidor(app);

  const escuchando = servidor.listen(configuracion.puerto, () => {
    console.log(`CafeBox escuchando en http://localhost:${configuracion.puerto}`);
    console.log(`Documentación en   http://localhost:${configuracion.puerto}/documentacion`);
    console.log(`Persistencia:      ${configuracion.persistencia}`);
    console.log(`Orígenes CORS:     ${configuracion.origenesPermitidos.join(', ')}`);
  });

  const apagar = (senal: string) => async () => {
    console.log(`\nRecibida ${senal}: cerrando.`);
    escuchando.close(async () => {
      await app.cerrar();
      process.exit(0);
    });
  };
  process.on('SIGINT', apagar('SIGINT'));
  process.on('SIGTERM', apagar('SIGTERM'));
}

arrancar().catch((error) => {
  console.error('No se pudo arrancar el servicio:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
