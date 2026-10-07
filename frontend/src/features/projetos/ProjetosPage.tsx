import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useCreateProjeto, useProjetos } from './projetos.hooks';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import { ProjetoForm } from './ProjetoForm';
import {
  PROJETO_STATUS_LABEL,
  type ProjetoFormValues,
  type ProjetoStatus,
} from './projetos.types';

function StatusBadge({ status }: { status: ProjetoStatus }) {
  const styles: Record<ProjetoStatus, string> = {
    AGUARDANDO: 'badge--muted',
    EM_ANDAMENTO: 'badge--outline',
    CONCLUIDO: 'badge--solid',
    CANCELADO: 'badge--ghost',
  };
  return (
    <span className={`badge ${styles[status]}`}>{PROJETO_STATUS_LABEL[status]}</span>
  );
}

export default function ProjetosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<ProjetoStatus | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useProjetos({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
    ativo: true,
  });
  const createMut = useCreateProjeto();

  const handleSubmit = async (values: ProjetoFormValues) => {
    setFormError(null);
    try {
      await createMut.mutateAsync(values);
      setModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const items = query.data?.data ?? [];

  const statusTabs = [
    { value: '' as const, label: 'Todos' },
    ...(['AGUARDANDO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'] as const).map(
      (s) => ({ value: s, label: PROJETO_STATUS_LABEL[s] }),
    ),
  ];

  return (
    <>
      <PageHeader
        title="Projetos de blindagem"
        subtitle="Acompanhamento de obras por cliente e veículo."
        action={
          <Button
            onClick={() => {
              setFormError(null);
              setModalOpen(true);
            }}
          >
            <IconPlus width={18} height={18} />
            Novo projeto
          </Button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Buscar por cliente, placa…"
      />

      <FilterTabs
        scope="projetos-status"
        value={status}
        onChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        options={statusTabs}
        aria-label="Filtrar projetos por status"
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhum projeto encontrado" />
      ) : (
        <>
          <TableContainer>
            <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Orçado</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.cliente?.nomeCompleto ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {p.veiculo
                      ? `${p.veiculo.placa} — ${p.veiculo.marca} ${p.veiculo.modelo}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-[#0a0a0a]/70">
                    {formatBRL(p.valorOrcado)}
                  </td>
                  <td className="px-4 py-3 text-[#0a0a0a]/70">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/projetos/${p.id}`}
                      className="text-sm font-medium text-[#0a0a0a] underline-offset-2 hover:underline"
                    >
                      Abrir
                    </Link>
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
        title="Novo projeto"
        onClose={() => setModalOpen(false)}
        footer={
          <ModalFormFooter
            formId="projeto-form"
            onCancel={() => setModalOpen(false)}
            submitting={createMut.isPending}
            submitLabel="Criar projeto"
          />
        }
      >
        <ProjetoForm
          onSubmit={handleSubmit}
          error={formError}
        />
      </Modal>
    </>
  );
}
