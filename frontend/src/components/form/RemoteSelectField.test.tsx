import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AxiosHeaders } from 'axios';
import { api } from '../../lib/api';
import { RemoteSelectField } from './RemoteSelectField';

const original = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = original;
});
function Form({
  initial = 0,
  save,
}: {
  initial?: number;
  save: (values: { clienteId: number }) => void;
}) {
  const { register, handleSubmit } = useForm<{ clienteId: number }>({
    defaultValues: { clienteId: initial },
  });
  return (
    <form onSubmit={handleSubmit(save)}>
      <RemoteSelectField
        label="Cliente"
        source="clientes"
        initialValue={initial}
        placeholder="Selecione"
        {...register('clienteId', { valueAsNumber: true })}
      />
      <button type="submit">Salvar</button>
    </form>
  );
}
function mount(initial = 0) {
  let value: number | undefined;
  const requested: { page?: number; search?: string }[] = [];
  api.defaults.adapter = async (config) => {
    let data: unknown;
    if (config.url?.endsWith('/126'))
      data = { id: 126, nomeCompleto: 'Cliente 126' };
    else {
      const { page = 1, search = '' } = config.params as {
        page?: number;
        search?: string;
      };
      requested.push({ page, search });
      const rows = Array.from({ length: 126 }, (_, i) => ({
        id: i + 1,
        nomeCompleto: `Cliente ${i + 1}`,
      })).filter((row) => row.nomeCompleto.includes(search));
      data = {
        data: rows.slice((page - 1) * 25, page * 25),
        page,
        limit: 25,
        total: rows.length,
      };
    }
    return {
      config,
      data,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
    };
  };
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Form
        initial={initial}
        save={(values) => {
          value = values.clienteId;
        }}
      />
    </QueryClientProvider>,
  );
  return { requested, getValue: () => value };
}

describe('seletores remotos', () => {
  it('pagina e busca um registro depois dos primeiros 100 sem perder a seleção', async () => {
    const f = mount();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Carregar mais opções' }),
    );
    await waitFor(() =>
      expect(f.requested.some((request) => request.page === 2)).toBe(true),
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar cliente' }),
      'Cliente 126',
    );
    await waitFor(() =>
      expect(
        f.requested.some((request) => request.search === 'Cliente 126'),
      ).toBe(true),
    );
    await user.click(screen.getByRole('combobox', { name: 'Cliente' }));
    await user.click(
      await screen.findByRole('option', { name: 'Cliente 126' }),
    );
    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(f.getValue()).toBe(126));
    expect(screen.getByRole('combobox')).toHaveTextContent('Cliente 126');
  });
  it('preserva o registro selecionado na edição mesmo fora da primeira página', async () => {
    const f = mount(126);
    await screen.findByRole('combobox', { name: 'Cliente' });
    await waitFor(() =>
      expect(screen.getByRole('combobox')).toHaveTextContent('Cliente 126'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(f.getValue()).toBe(126));
  });
});
