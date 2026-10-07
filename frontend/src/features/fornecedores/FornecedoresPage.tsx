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
  useCreateFornecedor,
  useDeleteFornecedor,
  useFornecedores,
  useUpdateFornecedor,
} from './fornecedores.hooks';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import { FornecedorForm } from './FornecedorForm';
import type { Fornecedor, FornecedorFormValues } from './fornecedores.types';

export default function FornecedoresPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useFornecedores({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const createMut = useCreateFornecedor();
  const updateMut = useUpdateFornecedor();
  const deleteMut = useDeleteFornecedor();

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (f: Fornecedor) => {
    setEditing(f);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: FornecedorFormValues) => {
    setFormError(null);
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, values });
      else await createMut.mutateAsync(values);
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const handleDelete = async (f: Fornecedor) => {
    if (!window.confirm(`Inativar o fornecedor "${f.nomeRazaoSocial}"?`)) return;
    try {
      await deleteMut.mutateAsync(f.id);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  };

  const items = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Fornecedores"
        subtitle="Fornecedores de materiais e serviços."
        action={
          <Button onClick={openCreate}>
            <IconPlus width={18} height={18} />
            Novo fornecedor
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por nome ou CPF/CNPJ…"
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhum fornecedor encontrado" />
      ) : (
        <>
          <TableContainer>
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
              <tr>
                <th className="px-4 py-3">Nome / Razão Social</th>
                <th className="px-4 py-3">CPF / CNPJ</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 font-medium">{f.nomeRazaoSocial}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">{f.cpfCnpj}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {f.telefone || f.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge ativo={f.ativo} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Editar" onClick={() => openEdit(f)}>
                        <IconEdit width={16} height={16} />
                      </IconButton>
                      <IconButton
                        label="Inativar"
                        onClick={() => handleDelete(f)}
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
        title={editing ? 'Editar fornecedor' : 'Novo fornecedor'}
        onClose={() => setModalOpen(false)}
        footer={
          <ModalFormFooter
            formId="fornecedor-form"
            onCancel={() => setModalOpen(false)}
            submitting={createMut.isPending || updateMut.isPending}
          />
        }
      >
        <FornecedorForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          error={formError}
        />
      </Modal>
    </>
  );
}
