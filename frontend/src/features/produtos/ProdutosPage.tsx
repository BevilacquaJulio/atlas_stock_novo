import { useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../lib/api';
import { formatBRL, formatQuantidade } from '../../lib/format';
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
  useCreateProduto,
  useDeleteProduto,
  useProdutos,
  useUpdateProduto,
} from './produtos.hooks';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import { ProdutoForm } from './ProdutoForm';
import type { Produto, ProdutoFormValues } from './produtos.types';

export default function ProdutosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useProdutos({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });
  const createMut = useCreateProduto();
  const updateMut = useUpdateProduto();
  const deleteMut = useDeleteProduto();

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };
  const openEdit = (p: Produto) => {
    setEditing(p);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: ProdutoFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        const { estoqueInicial: _ignore, ...updateValues } = values;
        void _ignore;
        await updateMut.mutateAsync({ id: editing.id, values: updateValues });
      } else {
        await createMut.mutateAsync(values);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const handleDelete = async (p: Produto) => {
    if (!window.confirm(`Inativar o produto "${p.nome}"?`)) return;
    try {
      await deleteMut.mutateAsync(p.id);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  };

  const items = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle="Materiais e itens de estoque."
        action={
          <Button onClick={openCreate}>
            <IconPlus width={18} height={18} />
            Novo produto
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por nome ou código…"
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhum produto encontrado" />
      ) : (
        <>
          <TableContainer>
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Valor un.</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {p.categoria?.nome ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0a0a0a]/70">
                    {formatQuantidade(p.quantidadeEstoque)} {p.unidadeMedida}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0a0a0a]/70">
                    {formatBRL(p.valorUnitario)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge ativo={p.ativo} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Editar" onClick={() => openEdit(p)}>
                        <IconEdit width={16} height={16} />
                      </IconButton>
                      <IconButton
                        label="Inativar"
                        onClick={() => handleDelete(p)}
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
        title={editing ? 'Editar produto' : 'Novo produto'}
        onClose={() => setModalOpen(false)}
        footer={
          <ModalFormFooter
            formId="produto-form"
            onCancel={() => setModalOpen(false)}
            submitting={createMut.isPending || updateMut.isPending}
          />
        }
      >
        <ProdutoForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          error={formError}
        />
      </Modal>
    </>
  );
}
