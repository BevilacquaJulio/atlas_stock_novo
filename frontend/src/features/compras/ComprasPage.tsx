import { useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../lib/api';
import { formatBRL, formatDate } from '../../lib/format';
import { PageHeader } from '../../components/PageHeader';
import { ListToolbar, TableContainer } from '../../components/ListToolbar';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { Alert, EmptyState, Spinner } from '../../components/feedback';
import { FilterTabs } from '../../components/FilterTabs';
import { IconPlus } from '../../components/icons';
import {
  useCancelarCompra,
  useCompra,
  useCompras,
  useConfirmarCompra,
  useCreateCompra,
  useDesconfirmarCompra,
  useEstornarPagamentoCompra,
  usePagarCompra,
} from './compras.hooks';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import { CompraForm } from './CompraForm';
import {
  COMPRA_STATUS_LABEL,
  type Compra,
  type CompraFormValues,
  type CompraStatus,
} from './compras.types';

function StatusBadge({ status }: { status: CompraStatus }) {
  const styles: Record<CompraStatus, string> = {
    A_PAGAR: 'badge--outline',
    PAGO: 'badge--solid',
    CONFIRMADA: 'badge--muted',
    CANCELADA: 'badge--ghost',
  };
  return (
    <span className={`badge ${styles[status]}`}>
      {COMPRA_STATUS_LABEL[status]}
    </span>
  );
}

const STATUS_TABS = [
  { value: '' as const, label: 'Todas' },
  ...(['A_PAGAR', 'PAGO', 'CONFIRMADA', 'CANCELADA'] as const).map((s) => ({
    value: s,
    label: COMPRA_STATUS_LABEL[s],
  })),
];

function CompraActions({
  compra,
  loading,
  compact = false,
  onDetail,
  onPagar,
  onConfirmar,
  onDesconfirmar,
  onEstornarPagamento,
  onCancelar,
}: {
  compra: Compra;
  loading: boolean;
  compact?: boolean;
  onDetail?: () => void;
  onPagar: (c: Compra) => void;
  onConfirmar: (c: Compra) => void;
  onDesconfirmar: (c: Compra) => void;
  onEstornarPagamento: (c: Compra) => void;
  onCancelar: (c: Compra) => void;
}) {
  const size = compact ? 'sm' : 'md';
  const wrap = compact
    ? 'flex flex-wrap items-center justify-end gap-1'
    : 'flex flex-wrap justify-end gap-2';

  return (
    <div className={wrap}>
      {onDetail && (
        <Button variant="ghost" size={size} onClick={onDetail}>
          Detalhes
        </Button>
      )}
      {compra.status === 'A_PAGAR' && (
        <>
          <Button size={size} loading={loading} onClick={() => onPagar(compra)}>
            Pagar
          </Button>
          <Button
            variant="ghost"
            size={size}
            loading={loading}
            onClick={() => onCancelar(compra)}
          >
            Cancelar
          </Button>
        </>
      )}
      {compra.status === 'PAGO' && (
        <>
          <Button size={size} loading={loading} onClick={() => onConfirmar(compra)}>
            {compact ? 'Confirmar' : 'Confirmar recebimento'}
          </Button>
          <Button
            variant="ghost"
            size={size}
            loading={loading}
            onClick={() => onEstornarPagamento(compra)}
          >
            {compact ? 'Estornar' : 'Estornar pagamento'}
          </Button>
          <Button
            variant="ghost"
            size={size}
            loading={loading}
            onClick={() => onCancelar(compra)}
          >
            Cancelar
          </Button>
        </>
      )}
      {compra.status === 'CONFIRMADA' && (
        <Button
          variant="ghost"
          size={size}
          loading={loading}
          onClick={() => onDesconfirmar(compra)}
        >
          {compact ? 'Desconfirmar' : 'Desconfirmar recebimento'}
        </Button>
      )}
    </div>
  );
}

export default function ComprasPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<CompraStatus | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useCompras({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });
  const detailQuery = useCompra(detailId);
  const createMut = useCreateCompra();
  const pagarMut = usePagarCompra();
  const confirmarMut = useConfirmarCompra();
  const desconfirmarMut = useDesconfirmarCompra();
  const estornarMut = useEstornarPagamentoCompra();
  const cancelarMut = useCancelarCompra();

  const actionLoading =
    pagarMut.isPending ||
    confirmarMut.isPending ||
    desconfirmarMut.isPending ||
    estornarMut.isPending ||
    cancelarMut.isPending;

  const runAction = async (
    fn: () => Promise<unknown>,
    closeDetail = false,
  ) => {
    try {
      await fn();
      if (closeDetail) setDetailId(null);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    }
  };

  const handleSubmit = async (values: CompraFormValues) => {
    setFormError(null);
    try {
      await createMut.mutateAsync(values);
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const handlePagar = (compra: Compra) => {
    if (
      !window.confirm(
        `Registrar pagamento da compra #${compra.id}? O estoque só será atualizado após confirmar o recebimento.`,
      )
    ) {
      return;
    }
    void runAction(() => pagarMut.mutateAsync({ id: compra.id }), true);
  };

  const handleConfirmar = (compra: Compra) => {
    if (
      !window.confirm(
        `Confirmar recebimento da compra #${compra.id}? Isso dará entrada no estoque.`,
      )
    ) {
      return;
    }
    void runAction(() => confirmarMut.mutateAsync(compra.id), true);
  };

  const handleDesconfirmar = (compra: Compra) => {
    if (
      !window.confirm(
        `Desconfirmar recebimento da compra #${compra.id}? A entrada no estoque será estornada.`,
      )
    ) {
      return;
    }
    void runAction(() => desconfirmarMut.mutateAsync(compra.id), true);
  };

  const handleEstornarPagamento = (compra: Compra) => {
    if (
      !window.confirm(
        `Estornar pagamento da compra #${compra.id}? Ela voltará para "A pagar".`,
      )
    ) {
      return;
    }
    void runAction(() => estornarMut.mutateAsync(compra.id), true);
  };

  const handleCancelar = (compra: Compra) => {
    if (
      !window.confirm(
        `Cancelar compra #${compra.id}? A despesa vinculada também será cancelada.`,
      )
    ) {
      return;
    }
    void runAction(() => cancelarMut.mutateAsync(compra.id), true);
  };

  const items = query.data?.data ?? [];
  const detail = detailQuery.data;

  const emptyTitle =
    status === ''
      ? 'Nenhuma compra registrada'
      : `Nenhuma compra ${COMPRA_STATUS_LABEL[status].toLowerCase()}`;

  const actionProps = {
    loading: actionLoading,
    onPagar: handlePagar,
    onConfirmar: handleConfirmar,
    onDesconfirmar: handleDesconfirmar,
    onEstornarPagamento: handleEstornarPagamento,
    onCancelar: handleCancelar,
  };

  return (
    <>
      <PageHeader
        title="Compras"
        subtitle="Nota → pagamento → recebimento confirmado."
        action={
          <Button
            onClick={() => {
              setFormError(null);
              setModalOpen(true);
            }}
          >
            <IconPlus width={18} height={18} />
            Nova compra
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por fornecedor…"
      />

      <FilterTabs
        scope="compras-status"
        value={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        options={STATUS_TABS}
        aria-label="Filtrar compras por status"
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <>
          <TableContainer>
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3 text-right">Itens</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {formatDate(c.dataCompra)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {c.fornecedor?.nomeRazaoSocial ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0a0a0a]/70">
                    {c._count?.itens ?? c.itens?.length ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0a0a0a]/70">
                    {formatBRL(c.valorTotal)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CompraActions
                      compra={c}
                      compact
                      onDetail={() => setDetailId(c.id)}
                      {...actionProps}
                    />
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
        title="Nova compra"
        onClose={() => setModalOpen(false)}
        footer={
          <ModalFormFooter
            formId="compra-form"
            onCancel={() => setModalOpen(false)}
            submitting={createMut.isPending}
            submitLabel="Registrar compra"
          />
        }
      >
        <CompraForm
          onSubmit={handleSubmit}
          error={formError}
        />
      </Modal>

      <Modal
        open={detailId != null}
        title={detail ? `Compra #${detail.id}` : 'Detalhes da compra'}
        onClose={() => setDetailId(null)}
      >
        {detailQuery.isLoading ? (
          <Spinner />
        ) : detailQuery.isError ? (
          <Alert kind="error">{getApiErrorMessage(detailQuery.error)}</Alert>
        ) : detail ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-[#0a0a0a]/45">Fornecedor:</span>{' '}
                {detail.fornecedor?.nomeRazaoSocial}
              </p>
              <p>
                <span className="text-[#0a0a0a]/45">Status:</span>{' '}
                <StatusBadge status={detail.status} />
              </p>
              <p>
                <span className="text-[#0a0a0a]/45">Data compra:</span>{' '}
                {formatDate(detail.dataCompra)}
              </p>
              <p>
                <span className="text-[#0a0a0a]/45">Total:</span>{' '}
                {formatBRL(detail.valorTotal)}
              </p>
              {detail.dataPagamento && (
                <p>
                  <span className="text-[#0a0a0a]/45">Data pagamento:</span>{' '}
                  {formatDate(detail.dataPagamento)}
                </p>
              )}
            </div>

            {detail.observacoes && (
              <p className="text-sm text-[#0a0a0a]/70">{detail.observacoes}</p>
            )}

            <TableContainer>
              <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
                <tr>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2 text-right">Qtd.</th>
                  <th className="px-3 py-2 text-right">Valor un.</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.itens?.map((item) => (
                  <tr key={item.id} className="border-b border-[#f0f0f0]">
                    <td className="px-3 py-2 text-sm">
                      {item.produto
                        ? `${item.produto.codigo} — ${item.produto.nome}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-[#0a0a0a]/70">
                      {item.quantidade}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-[#0a0a0a]/70">
                      {formatBRL(item.valorUnitario)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-[#0a0a0a]/70">
                      {formatBRL(item.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableContainer>

            <CompraActions compra={detail} {...actionProps} />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
