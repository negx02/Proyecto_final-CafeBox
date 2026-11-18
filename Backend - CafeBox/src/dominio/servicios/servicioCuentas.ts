import {
  ErrorDeRegla,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  MENSAJES_DE_REGLA,
} from '../errores.js';
import type {
  Contrasenas,
  Credenciales,
  GeneradorDeId,
  Reloj,
  UnidadDeTrabajo,
} from '../puertos.js';
import type { Cliente, Usuario } from '../tipos.js';

export interface DatosDeRegistro {
  correo: string;
  contrasena: string;
  nombre: string;
  ciudad: string;
  direccion?: string | null;
  telefono?: string | null;
}

export interface DatosDePerfil {
  direccion?: string | null;
  telefono?: string | null;
  ciudad?: string | null;
  pagoTitular?: string | null;
  pagoUltimos4?: string | null;
}

export function crearServicioCuentas(deps: {
  unidad: UnidadDeTrabajo;
  reloj: Reloj;
  ids: GeneradorDeId;
  contrasenas: Contrasenas;
  credenciales: Credenciales;
}) {
  const { unidad, reloj, ids, contrasenas, credenciales } = deps;

  return {

    async registrar(datos: DatosDeRegistro) {
      return unidad.enTransaccion(async (repos) => {
        const correo = datos.correo.trim().toLowerCase();
        if (await repos.usuarios.obtenerPorCorreo(correo)) {
          throw new ErrorDeRegla('CORREO_DUPLICADO', MENSAJES_DE_REGLA.CORREO_DUPLICADO);
        }

        const cliente: Cliente = {
          id: ids.nuevo(),
          nombre: datos.nombre.trim(),
          ciudad: datos.ciudad.trim(),
          direccion: datos.direccion?.trim() || null,
          telefono: datos.telefono?.trim() || null,
          pagoTitular: null,
          pagoUltimos4: null,
          creadoEn: reloj.ahora(),
        };
        await repos.clientes.crear(cliente);

        const usuario: Usuario = {
          id: ids.nuevo(),
          correo,
          contrasenaHash: await contrasenas.transformar(datos.contrasena),
          rol: 'CLIENTE',
          clienteId: cliente.id,
          creadoEn: reloj.ahora(),
        };
        await repos.usuarios.crear(usuario);

        return { usuario: sinContrasena(usuario), cliente };
      });
    },

    async iniciarSesion(correo: string, contrasena: string) {
      const usuario = await unidad.repos.usuarios.obtenerPorCorreo(correo.trim().toLowerCase());
      const hash = usuario?.contrasenaHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
      const correcta = await contrasenas.verificar(contrasena, hash);
      if (!usuario || !correcta) {
        throw new ErrorNoAutenticado('Correo o contraseña incorrectos');
      }

      const { credencial, expiraEn } = credenciales.emitir({
        usuarioId: usuario.id,
        rol: usuario.rol,
        clienteId: usuario.clienteId,
        correo: usuario.correo,
      });

      const cliente = usuario.clienteId
        ? await unidad.repos.clientes.obtener(usuario.clienteId)
        : null;

      return { credencial, expiraEn, usuario: sinContrasena(usuario), cliente };
    },

    async verPerfil(usuarioId: string) {
      const usuario = await unidad.repos.usuarios.obtener(usuarioId);
      if (!usuario) throw new ErrorNoEncontrado('usuario', usuarioId);
      const cliente = usuario.clienteId
        ? await unidad.repos.clientes.obtener(usuario.clienteId)
        : null;
      return { usuario: sinContrasena(usuario), cliente };
    },

    async actualizarPerfil(clienteId: string, datos: DatosDePerfil) {
      return unidad.enTransaccion(async (repos) => {
        const cliente = await repos.clientes.obtener(clienteId);
        if (!cliente) throw new ErrorNoEncontrado('cliente', clienteId);

        const actualizado: Cliente = {
          ...cliente,
          direccion: datos.direccion !== undefined ? datos.direccion : cliente.direccion,
          telefono: datos.telefono !== undefined ? datos.telefono : cliente.telefono,
          ciudad: datos.ciudad?.trim() || cliente.ciudad,
          pagoTitular: datos.pagoTitular !== undefined ? datos.pagoTitular : cliente.pagoTitular,
          pagoUltimos4: datos.pagoUltimos4 !== undefined ? datos.pagoUltimos4 : cliente.pagoUltimos4,
        };
        await repos.clientes.actualizar(actualizado);
        return actualizado;
      });
    },
  };
}

export type ServicioCuentas = ReturnType<typeof crearServicioCuentas>;

function sinContrasena(usuario: Usuario) {
  const { contrasenaHash: _omitido, ...resto } = usuario;
  return resto;
}
