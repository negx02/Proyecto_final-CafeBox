import { componer } from '../src/composicion.js';
import { leerConfiguracion } from '../src/configuracion.js';
import { sumarDias } from '../src/dominio/calendario.js';
import type { Identidad } from '../src/dominio/tipos.js';

const ID = {
  admin: '00000000-0000-4000-8000-000000000001',
  clienteAna: '00000000-0000-4000-8000-000000000011',
  clienteLuis: '00000000-0000-4000-8000-000000000012',
  clienteMario: '00000000-0000-4000-8000-000000000013',
  clienteSofia: '00000000-0000-4000-8000-000000000014',
  usuarioAna: '00000000-0000-4000-8000-000000000021',
  usuarioLuis: '00000000-0000-4000-8000-000000000022',
  usuarioMario: '00000000-0000-4000-8000-000000000023',
  usuarioSofia: '00000000-0000-4000-8000-000000000024',
  productoChiapas: '00000000-0000-4000-8000-000000000031',
  productoOaxaca: '00000000-0000-4000-8000-000000000032',
  productoVeracruz: '00000000-0000-4000-8000-000000000033',
  planSemanal: '00000000-0000-4000-8000-000000000041',
  planQuincenal: '00000000-0000-4000-8000-000000000042',
  planMensual: '00000000-0000-4000-8000-000000000043',
  planOaxaca: '00000000-0000-4000-8000-000000000044',
  planRetirado: '00000000-0000-4000-8000-000000000045',
} as const;

async function sembrar(): Promise<void> {
  const configuracion = leerConfiguracion();
  const app = componer(configuracion);
  const { unidad, servicios, contrasenas, reloj } = app;
  const repos = unidad.repos;
  const ahora = reloj.ahora();
  const hoy = reloj.hoy();

  try {

    for (const ciudad of ['Guaymas', 'Empalme']) {
      if (!(await repos.zonas.tieneCobertura(ciudad))) {
        await repos.zonas.agregar(ciudad);
      }
    }

    const productos = [
      {
        id: ID.productoChiapas,
        nombre: 'Café de Chiapas',
        origen: 'Chiapas, México',
        gramaje: 340,
        precioUnitario: 185,
        stockDisponible: 120,
        activo: true,
      },
      {

        id: ID.productoOaxaca,
        nombre: 'Café de Oaxaca',
        origen: 'Pluma Hidalgo, Oaxaca',
        gramaje: 340,
        precioUnitario: 210,
        stockDisponible: 2,
        activo: true,
      },
      {
        id: ID.productoVeracruz,
        nombre: 'Café de Veracruz',
        origen: 'Coatepec, Veracruz',
        gramaje: 340,
        precioUnitario: 170,
        stockDisponible: 60,
        activo: true,
      },
    ];
    for (const producto of productos) {
      if (!(await repos.productos.obtener(producto.id))) await repos.productos.crear(producto);
    }

    const planes = [
      {
        id: ID.planSemanal,
        nombre: 'Caja semanal',
        descripcion: 'Una bolsa de 340 g de Café de Chiapas, molido o en grano, cada semana.',
        productoId: ID.productoChiapas,
        bolsasPorEntrega: 1,
        precioCiclo: 199,
        frecuencia: 'SEMANAL' as const,
        activo: true,
        retiradoEn: null,
      },
      {
        id: ID.planQuincenal,
        nombre: 'Caja quincenal',
        descripcion: 'Dos bolsas de 340 g de Café de Chiapas cada dos semanas.',
        productoId: ID.productoChiapas,
        bolsasPorEntrega: 2,
        precioCiclo: 379,
        frecuencia: 'QUINCENAL' as const,
        activo: true,
        retiradoEn: null,
      },
      {
        id: ID.planMensual,
        nombre: 'Caja mensual',
        descripcion: 'Tres bolsas de 340 g de Café de Chiapas, una vez al mes.',
        productoId: ID.productoChiapas,
        bolsasPorEntrega: 3,
        precioCiclo: 529,
        frecuencia: 'MENSUAL' as const,
        activo: true,
        retiradoEn: null,
      },
      {
        id: ID.planOaxaca,
        nombre: 'Caja Oaxaca para cafetería',
        descripcion: 'Cinco bolsas de 340 g de Café de Oaxaca cada semana, para negocios.',
        productoId: ID.productoOaxaca,
        bolsasPorEntrega: 5,
        precioCiclo: 1090,
        frecuencia: 'SEMANAL' as const,
        activo: true,
        retiradoEn: null,
      },
      {

        id: ID.planRetirado,
        nombre: 'Caja de temporada (Veracruz)',
        descripcion: 'Edición de temporada. Ya no acepta nuevas suscripciones.',
        productoId: ID.productoVeracruz,
        bolsasPorEntrega: 2,
        precioCiclo: 349,
        frecuencia: 'QUINCENAL' as const,
        activo: false,
        retiradoEn: ahora,
      },
    ];
    for (const plan of planes) {
      if (!(await repos.planes.obtener(plan.id))) await repos.planes.crear(plan);
    }

    if (!(await repos.usuarios.obtener(ID.admin))) {
      await repos.usuarios.crear({
        id: ID.admin,
        correo: 'admin@cafebox.test',
        contrasenaHash: await contrasenas.transformar(configuracion.contrasenaAdminInicial),
        rol: 'ADMIN',
        clienteId: null,
        creadoEn: ahora,
      });
    }

    const clientes = [
      {
        cliente: {
          id: ID.clienteAna,
          nombre: 'Ana Torres',
          ciudad: 'Guaymas',
          direccion: 'Av. Serdán 455, Col. Centro',
          telefono: '6221234567',
          pagoTitular: 'Ana Torres',
          pagoUltimos4: '4242',
          creadoEn: ahora,
        },
        usuarioId: ID.usuarioAna,
        correo: 'ana@cafebox.test',
      },
      {

        cliente: {
          id: ID.clienteLuis,
          nombre: 'Luis Peña',
          ciudad: 'Nogales',
          direccion: 'Calle Juárez 120, Centro',
          telefono: '6311112222',
          pagoTitular: 'Luis Peña',
          pagoUltimos4: '1881',
          creadoEn: ahora,
        },
        usuarioId: ID.usuarioLuis,
        correo: 'luis@cafebox.test',
      },
      {
        cliente: {
          id: ID.clienteMario,
          nombre: 'Mario Sánchez',
          ciudad: 'Empalme',
          direccion: 'Calle Sinaloa 87, Centro',
          telefono: '6221112233',
          pagoTitular: 'Mario Sánchez',
          pagoUltimos4: '0005',
          creadoEn: ahora,
        },
        usuarioId: ID.usuarioMario,
        correo: 'mario@cafebox.test',
      },
      {
        cliente: {
          id: ID.clienteSofia,
          nombre: 'Sofía Ramírez',
          ciudad: 'Guaymas',
          direccion: 'Calle 20 #302, Col. Centro',
          telefono: '6229876543',
          pagoTitular: 'Sofía Ramírez',
          pagoUltimos4: '7777',
          creadoEn: ahora,
        },
        usuarioId: ID.usuarioSofia,
        correo: 'sofia@cafebox.test',
      },
    ];

    for (const { cliente, usuarioId, correo } of clientes) {
      if (!(await repos.clientes.obtener(cliente.id))) await repos.clientes.crear(cliente);
      if (!(await repos.usuarios.obtener(usuarioId))) {
        await repos.usuarios.crear({
          id: usuarioId,
          correo,
          contrasenaHash: await contrasenas.transformar(configuracion.contrasenaDemo),
          rol: 'CLIENTE',
          clienteId: cliente.id,
          creadoEn: ahora,
        });
      }
    }

    const identidad = (clienteId: string, usuarioId: string, correo: string): Identidad => ({
      usuarioId,
      rol: 'CLIENTE',
      clienteId,
      correo,
    });

    const anaYa = await repos.suscripciones.listar({ clienteId: ID.clienteAna });
    if (anaYa.length > 0) {
      console.log('Los datos de arranque ya estaban cargados. Nada que hacer.');
      return;
    }

    const { suscripcion: suscripcionAna } = await servicios.suscripciones.contratar(
      identidad(ID.clienteAna, ID.usuarioAna, 'ana@cafebox.test'),
      {
        planId: ID.planSemanal,
        direccionEntrega: 'Av. Serdán 455, Col. Centro',
        ciudad: 'Guaymas',
        diaEntregaPreferido: 3,
        fechaInicio: sumarDias(hoy, -35),
      },
    );

    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
      const entrega = await repos.entregas.obtenerProgramada(suscripcionAna.id);
      if (!entrega) break;
      const cobro = await repos.cobros.obtenerPorCiclo(suscripcionAna.id, entrega.ciclo);
      if (cobro) await servicios.cobros.registrar(cobro.id, 'COBRADO');
      await servicios.ciclos.avanzarEstado(entrega.id, 'ARMADA');
      await servicios.ciclos.avanzarEstado(entrega.id, 'ENVIADA');
      await servicios.ciclos.avanzarEstado(entrega.id, 'ENTREGADA');
      await servicios.ciclos.generarSiguienteCiclo();
    }

    await servicios.suscripciones.solicitarCambioDePlan(
      identidad(ID.clienteAna, ID.usuarioAna, 'ana@cafebox.test'),
      suscripcionAna.id,
      ID.planQuincenal,
    );

    const { suscripcion: suscripcionMario } = await servicios.suscripciones.contratar(
      identidad(ID.clienteMario, ID.usuarioMario, 'mario@cafebox.test'),
      {
        planId: ID.planMensual,
        direccionEntrega: 'Calle Sinaloa 87, Centro',
        ciudad: 'Empalme',
        diaEntregaPreferido: 5,
        fechaInicio: sumarDias(hoy, -40),
      },
    );
    const cobroMario = await repos.cobros.obtenerPorCiclo(suscripcionMario.id, 1);
    if (cobroMario) {
      await servicios.cobros.registrar(cobroMario.id, 'FALLIDO', 'Tarjeta rechazada por el banco');
    }

    const { suscripcion: suscripcionSofia } = await servicios.suscripciones.contratar(
      identidad(ID.clienteSofia, ID.usuarioSofia, 'sofia@cafebox.test'),
      {
        planId: ID.planQuincenal,
        direccionEntrega: 'Calle 20 #302, Col. Centro',
        ciudad: 'Guaymas',
        diaEntregaPreferido: 2,
        fechaInicio: sumarDias(hoy, -14),
      },
    );
    await servicios.suscripciones.pausar(
      identidad(ID.clienteSofia, ID.usuarioSofia, 'sofia@cafebox.test'),
      suscripcionSofia.id,
      sumarDias(hoy, 1),
      sumarDias(hoy, 25),
    );

    console.log('Datos de arranque cargados.');
    console.log('');
    console.log('  Administrador  admin@cafebox.test   (SEED_ADMIN_PASSWORD)');
    console.log('  Ana Torres     ana@cafebox.test     (SEED_DEMO_PASSWORD)  suscripción con historial');
    console.log('  Luis Peña      luis@cafebox.test    (SEED_DEMO_PASSWORD)  en Nogales, sin cobertura');
    console.log('  Mario Sánchez  mario@cafebox.test   (SEED_DEMO_PASSWORD)  suspendido por cobro fallido');
    console.log('  Sofía Ramírez  sofia@cafebox.test   (SEED_DEMO_PASSWORD)  pausada por viaje');
  } finally {
    await app.cerrar();
  }
}

sembrar().catch((error) => {
  console.error('No se pudieron cargar los datos de arranque:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
