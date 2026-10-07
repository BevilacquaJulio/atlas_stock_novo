import { useState } from 'react';
import { getApiErrorMessage } from '../../lib/api';
import { formatBRL, formatDate, formatQuantidade } from '../../lib/format';
import { PageHeader } from '../../components/PageHeader';
import { TableContainer } from '../../components/ListToolbar';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { Alert, EmptyState, Spinner } from '../../components/feedback';
import { FilterTabs } from '../../components/FilterTabs';
import { IconPlus } from '../../components/icons';
import {
  useCreateMovimentacao,
  useMovimentacoes,
} from './movimentacoes.hooks';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import { MovimentacaoForm } from './MovimentacaoForm';
import type {
  MovimentacaoFormValues,
  MovimentacaoTipo,
} from './movimentacoes.types';

export default function MovimentacoesPage() {
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState<MovimentacaoTipo | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useMovimentacoes({
    page,
    limit: 20,
    tipo: tipo || undefined,
  });
  const createMut = useCreateMovimentacao();

  const handleSubmit = async (values: MovimentacaoFormValues) => {
    setFormError(null);
    try {
      await createMut.mutateAsync(values);
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const items = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Movimentações de estoque"
        subtitle="Entradas e saídas de produtos."
        action={
          <Button
            onClick={() => {
              setFormError(null);
              setModalOpen(true);
            }}
          >
            <IconPlus width={18} height={18} />
            Nova movimentação
          </Button>
        }
      />

      <FilterTabs
        scope="movimentacoes-tipo"
        value={tipo}
        onChange={(t) => {
          setTipo(t);
          setPage(1);
        }}
        options={[
          { value: '', label: 'Todas' },
          { value: 'ENTRADA', label: 'Entradas' },
          { value: 'SAIDA', label: 'Saídas' },
        ]}
        aria-label="Filtrar movimentações por tipo"
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma movimentação registrada" />
      ) : (
        <>
          <TableContainer>
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Qtd.</th>
                <th className="px-4 py-3 text-right">Valor total</th>
                <th className="px-4 py-3">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {formatDate(m.dataMovimentacao)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {m.produto ? `${m.produto.codigo} — ${m.produto.nome}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        m.tipo === 'ENTRADA' ? 'badge--solid' : 'badge--ghost'
                      }`}
                    >
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#0a0a0a]/70">
                    {formatQuantidade(m.quantidade)}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0a0a0a]/70">
                    {formatBRL(m.valorTotal)}
                  </td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {m.usuario?.nome ?? '—'}
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
        title="Nova movimentação"
        onClose={() => setModalOpen(false)}
        footer={
          <ModalFormFooter
            formId="movimentacao-form"
            onCancel={() => setModalOpen(false)}
            submitting={createMut.isPending}
            submitLabel="Registrar"
          />
        }
      >
        <MovimentacaoForm
          onSubmit={handleSubmit}
          error={formError}
        />
      </Modal>
    </>
  );
}
