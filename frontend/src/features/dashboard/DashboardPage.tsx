import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../lib/api';
import { formatBRL, formatQuantidade } from '../../lib/format';
import { PageHeader } from '../../components/PageHeader';
import { Alert, EmptyState, Spinner } from '../../components/feedback';
import { PROJETO_STATUS_LABEL } from '../projetos/projetos.types';
import type { ProjetoStatus } from '../projetos/projetos.types';
import { useDashboard } from './dashboard.hooks';
import type { ComponentType, SVGProps } from 'react';
import {
  IconBox,
  IconCart,
  IconClipboard,
  IconDollar,
  IconUsers,
} from '../../components/icons';

function StatCard({
  label,
  value,
  hint,
  Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  accent?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-[var(--shadow-soft)] transition-transform duration-200 ease-out hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0a0a0a]/50">
          {label}
        </p>
        {Icon && (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              accent
                ? 'neon-black'
                : 'bg-[#f0f0f0] text-[#0a0a0a]/60'
            }`}
          >
            <Icon width={16} height={16} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-[#0a0a0a]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#0a0a0a]/45">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const query = useDashboard();

  if (query.isPending) return <Spinner />;
  if (query.isError)
    return <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>;

  const data = query.data;
  if (!data) return <EmptyState title="Sem dados" />;

  const { contagens, projetosRecentes } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão operacional do ERP Atlas Stock."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes ativos" value={contagens.clientes} Icon={IconUsers} />
        <StatCard label="Produtos" value={contagens.produtos} Icon={IconBox} />
        <StatCard
          label="Projetos ativos"
          value={contagens.projetosAtivos}
          hint={`${contagens.projetosEmAndamento} em andamento`}
          Icon={IconClipboard}
        />
        <StatCard
          label="Compras a pagar"
          value={contagens.comprasAPagar}
          Icon={IconCart}
          accent
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Despesas a pagar"
          value={formatBRL(String(contagens.despesasAPagar.total))}
          hint={`${contagens.despesasAPagar.quantidade} pendente(s)`}
          Icon={IconDollar}
          accent
        />
        <StatCard
          label="Receitas a receber"
          value={formatBRL(String(contagens.receitasAReceber.total))}
          hint={`${contagens.receitasAReceber.quantidade} pendente(s)`}
          Icon={IconDollar}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-[#0a0a0a]">
            Projetos recentes
          </h2>
          {projetosRecentes.length === 0 ? (
            <EmptyState title="Nenhum projeto" />
          ) : (
            <ul className="divide-y divide-[#f0f0f0] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-[var(--shadow-soft)]">
              {projetosRecentes.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[#fafafa]"
                >
                  <div>
                    <p className="font-medium text-[#0a0a0a]">
                      #{p.id} — {p.cliente?.nomeCompleto ?? '—'}
                    </p>
                    <p className="text-sm text-[#0a0a0a]/55">
                      {p.veiculo?.placa ?? '—'} ·{' '}
                      {PROJETO_STATUS_LABEL[p.status as ProjetoStatus] ?? p.status}
                    </p>
                  </div>
                  <Link
                    to={`/projetos/${p.id}`}
                    className="text-sm font-semibold text-[#0a0a0a] underline-offset-2 hover:underline"
                  >
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-[#0a0a0a]">
            Estoque baixo
          </h2>
          {contagens.produtosEstoqueBaixo.length === 0 ? (
            <EmptyState title="Estoque OK" />
          ) : (
            <ul className="divide-y divide-[#f0f0f0] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-[var(--shadow-soft)]">
              {contagens.produtosEstoqueBaixo.map((p) => (
                <li
                  key={p.id}
                  className="px-4 py-3 text-sm transition-colors hover:bg-[#fafafa]"
                >
                  <span className="font-medium text-[#0a0a0a]">
                    {p.codigo} — {p.nome}
                  </span>
                  <span className="ml-2 text-[#0a0a0a]/55">
                    {formatQuantidade(p.quantidadeEstoque)} {p.unidadeMedida}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
