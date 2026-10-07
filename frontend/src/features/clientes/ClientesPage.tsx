import { useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { ListToolbar, TableContainer } from '../../components/ListToolbar';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { Alert, EmptyState, Spinner } from '../../components/feedback';
import { StatusBadge } from '../../components/StatusBadge';
import { IconButton } from '../../components/IconButton';
import { IconEdit, IconPlus, IconTrash } from '../../components/icons';
import {
  useClientes,
  useCreateCliente,
  useDeleteCliente,
  useUpdateCliente,
} from './clientes.hooks';
import { ClienteForm } from './ClienteForm';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import type { Cliente, ClienteFormValues } from './clientes.types';

export default function ClientesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useClientes({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const createMut = useCreateCliente();
  const updateMut = useUpdateCliente();
  const deleteMut = useDeleteCliente();

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (c: Cliente) => {
    setEditing(c);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: ClienteFormValues) => {
    setFormError(null);
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, values });
      else await createMut.mutateAsync(values);
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const handleDelete = async (c: Cliente) => {
    if (!window.confirm(`Inativar o cliente "${c.nomeCompleto}"?`)) return;
    try {
      await deleteMut.mutateAsync(c.id);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  };

  const items = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Pessoas físicas e jurídicas atendidas."
        action={
          <Button onClick={openCreate}>
            <IconPlus width={18} height={18} />
            Novo cliente
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por nome, CPF/CNPJ ou e-mail…"
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado" />
      ) : (
        <>
          <TableContainer>
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">CPF / CNPJ</th>
                <th className="px-4 py-3">Cidade/UF</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 font-medium">{c.nomeCompleto}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">{c.tipo}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">{c.cpfCnpj}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {[c.cidade, c.estado].filter(Boolean).join('/') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge ativo={c.ativo} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Editar" onClick={() => openEdit(c)}>
                        <IconEdit width={16} height={16} />
                      </IconButton>
                      <IconButton
                        label="Inativar"
                        onClick={() => handleDelete(c)}
                      >
                        <IconTrash width={16} height={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableContainer>
          <Pagination
            page={page}
            limit={20}
            total={query.data?.total ?? 0}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Editar cliente' : 'Novo cliente'}
        onClose={() => setModalOpen(false)}
        footer={
          <ModalFormFooter
            formId="cliente-form"
            onCancel={() => setModalOpen(false)}
            submitting={createMut.isPending || updateMut.isPending}
          />
        }
      >
        <ClienteForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          error={formError}
        />
      </Modal>
    </>
  );
}
