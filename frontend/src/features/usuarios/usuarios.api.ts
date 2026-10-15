import { api } from '../../lib/api';
import type {
  AcessoUsuarioValues,
  NovoUsuarioValues,
  Usuario,
} from './usuarios.types';

export async function listUsuarios(
  params: { page?: number; limit?: number; search?: string } = {},
): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>('/usuarios', { params });
  return data;
}

export async function createUsuario(
  values: NovoUsuarioValues,
): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/usuarios', values);
  return data;
}

export async function updateAcessoUsuario(
  id: number,
  values: AcessoUsuarioValues,
): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}/acesso`, values);
  return data;
}
