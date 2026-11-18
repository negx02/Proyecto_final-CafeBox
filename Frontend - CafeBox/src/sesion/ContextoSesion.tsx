import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { alPerderLaSesion, api, credencialGuardada, guardarCredencial } from '../api/cliente';
import type { Cliente, Usuario } from '../api/tipos';

type EstadoSesion = 'comprobando' | 'dentro' | 'fuera';

interface ValorSesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  cliente: Cliente | null;
  aviso: string | null;
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => void;

  recargarPerfil: () => Promise<void>;
  descartarAviso: () => void;
}

const Contexto = createContext<ValorSesion | null>(null);

export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>(
    credencialGuardada() ? 'comprobando' : 'fuera',
  );
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cerrarSesion = useCallback(() => {
    guardarCredencial(null);
    setUsuario(null);
    setCliente(null);
    setEstado('fuera');
  }, []);

  useEffect(() => {
    alPerderLaSesion(() => {
      setUsuario(null);
      setCliente(null);
      setEstado('fuera');
      setAviso('Tu sesión terminó. Vuelve a entrar para seguir donde estabas.');
    });
  }, []);

  useEffect(() => {
    if (!credencialGuardada()) return;
    let cancelado = false;
    void (async () => {
      try {
        const perfil = await api.perfil();
        if (cancelado) return;
        setUsuario(perfil.usuario);
        setCliente(perfil.cliente);
        setEstado('dentro');
      } catch {
        if (cancelado) return;

        guardarCredencial(null);
        setEstado('fuera');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    const sesion = await api.iniciarSesion(correo, contrasena);
    guardarCredencial(sesion.credencial);
    setUsuario(sesion.usuario);
    setCliente(sesion.cliente);
    setAviso(null);
    setEstado('dentro');
  }, []);

  const recargarPerfil = useCallback(async () => {
    const perfil = await api.perfil();
    setUsuario(perfil.usuario);
    setCliente(perfil.cliente);
  }, []);

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      usuario,
      cliente,
      aviso,
      iniciarSesion,
      cerrarSesion,
      recargarPerfil,
      descartarAviso: () => setAviso(null),
    }),
    [estado, usuario, cliente, aviso, iniciarSesion, cerrarSesion, recargarPerfil],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useSesion se usó fuera del ProveedorDeSesion');
  return valor;
}
