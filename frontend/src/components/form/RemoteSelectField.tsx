import { forwardRef, useEffect, useState, type ComponentProps } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../lib/api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { Paginated } from '../../lib/types';
import { SelectField } from './SelectField';

type Source =
  'clientes' | 'veiculos' | 'produtos' | 'fornecedores' | 'categorias';
interface RecordOption {
  id: number;
  nome?: string;
  nomeCompleto?: string;
  nomeRazaoSocial?: string;
  codigo?: string;
  placa?: string;
  marca?: string;
  modelo?: string;
}
type Props = Omit<ComponentProps<typeof SelectField>, 'options'> & {
  source: Source;
  initialValue?: number | null;
  clienteId?: number;
};

function option(row: RecordOption) {
  return {
    value: row.id,
    label:
      row.nomeCompleto ??
      row.nomeRazaoSocial ??
      (row.placa
        ? `${row.placa} — ${row.marca} ${row.modelo}`
        : row.codigo
          ? `${row.codigo} — ${row.nome}`
          : (row.nome ?? String(row.id))),
  };
}

export const RemoteSelectField = forwardRef<HTMLSelectElement, Props>(
  function RemoteSelectField(
    { source, initialValue, clienteId, onChange, disabled, ...props },
    ref,
  ) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<{
      value: number;
      label: string;
    } | null>(null);
    const debounced = useDebouncedValue(search);
    const query = useInfiniteQuery({
      queryKey: [source, 'remote-options', debounced, clienteId],
      initialPageParam: 1,
      queryFn: async ({ pageParam, signal }) =>
        (
          await api.get<Paginated<RecordOption>>(`/${source}`, {
            signal,
            params: {
              page: pageParam,
              limit: 25,
              search: debounced || undefined,
              ativo: true,
              ...(clienteId ? { clienteId } : {}),
            },
          })
        ).data,
      getNextPageParam: (last) =>
        last.page * last.limit < last.total ? last.page + 1 : undefined,
      enabled: !disabled,
    });
    const initial = useQuery({
      queryKey: [source, 'remote-selected', initialValue],
      queryFn: async ({ signal }) =>
        (await api.get<RecordOption>(`/${source}/${initialValue}`, { signal }))
          .data,
      enabled: !!initialValue,
    });
    useEffect(() => {
      setSelected(null);
      setSearch('');
    }, [source, clienteId]);
    const choices = new Map<number, { value: number; label: string }>();
    if (initial.data) choices.set(initial.data.id, option(initial.data));
    if (selected) choices.set(selected.value, selected);
    for (const page of query.data?.pages ?? [])
      for (const row of page.data) choices.set(row.id, option(row));
    if (initialValue && initial.isPending)
      return (
        <p role="status">Carregando {props.label.toLowerCase()} selecionado…</p>
      );
    return (
      <div className="flex flex-col gap-2">
        <input
          aria-label={`Buscar ${props.label.toLowerCase()}`}
          type="search"
          maxLength={150}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
          placeholder="Buscar opções…"
          className="rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
        />
        <SelectField
          {...props}
          ref={ref}
          disabled={disabled || query.isPending}
          options={[...choices.values()]}
          onChange={(event) => {
            setSelected(choices.get(Number(event.target.value)) ?? null);
            void onChange?.(event);
          }}
        />
        {(query.isError || initial.isError) && (
          <p role="alert" className="text-sm">
            {getApiErrorMessage(query.error ?? initial.error)}{' '}
            <button
              type="button"
              onClick={() => {
                void query.refetch();
                void initial.refetch();
              }}
            >
              Tentar novamente
            </button>
          </p>
        )}
        {query.isFetching && (
          <span role="status" className="text-xs">
            Carregando opções…
          </span>
        )}
        {query.hasNextPage && (
          <button
            type="button"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
            className="text-left text-sm underline"
          >
            Carregar mais opções
          </button>
        )}
      </div>
    );
  },
);
