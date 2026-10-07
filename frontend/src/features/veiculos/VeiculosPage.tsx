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
  useCreateVeiculo,
  useDeleteVeiculo,
  useUpdateVeiculo,
  useVeiculos,
} from './veiculos.hooks';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import { VeiculoForm } from './VeiculoForm';
import type { Veiculo, VeiculoFormValues } from './veiculos.types';

export default function VeiculosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Veiculo | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useVeiculos({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const createMut = useCreateVeiculo();
  const updateMut = useUpdateVeiculo();
  const deleteMut = useDeleteVeiculo();

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (v: Veiculo) => {
    setEditing(v);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: VeiculoFormValues) => {
    setFormError(null);
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, values });
      else await createMut.mutateAsync(values);
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const handleDelete = async (v: Veiculo) => {
    if (!window.confirm(`Inativar o veículo "${v.placa}"?`)) return;
    try {
      await deleteMut.mutateAsync(v.id);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  };

  const items = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Veículos"
        subtitle="Veículos vinculados aos clientes."
        action={
          <Button onClick={openCreate}>
            <IconPlus width={18} height={18} />
            Novo veículo
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por placa, marca, modelo ou cliente…"
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhum veículo encontrado" />
      ) : (
        <>
          <TableContainer>
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
              <tr>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Marca/Modelo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 font-medium">{v.placa}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {v.marca} {v.modelo}
                    {v.ano ? ` (${v.ano})` : ''}
                  </td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {v.cliente?.nomeCompleto ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge ativo={v.ativo} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Editar" onClick={() => openEdit(v)}>
                        <IconEdit width={16} height={16} />
                      </IconButton>
                      <IconButton
                        label="Inativar"
                        onClick={() => handleDelete(v)}
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
        title={editing ? 'Editar veículo' : 'Novo veículo'}
        onClose={() => setModalOpen(false)}
        footer={
          <ModalFormFooter
            formId="veiculo-form"
            onCancel={() => setModalOpen(false)}
            submitting={createMut.isPending || updateMut.isPending}
          />
        }
      >
        <VeiculoForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          error={formError}
        />
      </Modal>
    </>
  );
}
