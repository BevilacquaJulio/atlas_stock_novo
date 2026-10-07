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
  useCategorias,
  useCreateCategoria,
  useDeleteCategoria,
  useUpdateCategoria,
} from './categorias.hooks';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import { CategoriaForm } from './CategoriaForm';
import type { Categoria, CategoriaFormValues } from './categorias.types';

export default function CategoriasPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useCategorias({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const createMut = useCreateCategoria();
  const updateMut = useUpdateCategoria();
  const deleteMut = useDeleteCategoria();

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (c: Categoria) => {
    setEditing(c);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: CategoriaFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, values });
      } else {
        await createMut.mutateAsync(values);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const handleDelete = async (c: Categoria) => {
    if (!window.confirm(`Excluir a categoria "${c.nome}"?`)) return;
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
        title="Categorias"
        subtitle="Categorias de produtos e materiais."
        action={
          <Button onClick={openCreate}>
            <IconPlus width={18} height={18} />
            Nova categoria
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por nome…"
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria encontrada"
          description="Crie a primeira categoria para organizar seus produtos."
        />
      ) : (
        <>
          <TableContainer>
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {c.descricao || '—'}
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
                        label="Excluir"
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
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        onClose={() => setModalOpen(false)}
        footer={
          <ModalFormFooter
            formId="categoria-form"
            onCancel={() => setModalOpen(false)}
            submitting={createMut.isPending || updateMut.isPending}
          />
        }
      >
        <CategoriaForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          error={formError}
        />
      </Modal>
    </>
  );
}
