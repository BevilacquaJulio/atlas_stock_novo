import { useState } from 'react';
import { getApiErrorMessage } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { TableContainer } from '../../components/ListToolbar';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ModalFormFooter } from '../../components/ModalFormFooter';
import { Alert, EmptyState, Spinner } from '../../components/feedback';
import { StatusBadge } from '../../components/StatusBadge';
import { IconButton } from '../../components/IconButton';
import { IconEdit, IconPlus } from '../../components/icons';
import { usePermissoes } from '../auth/permissoes';
import {
  useCreateUsuario,
  useUpdateAcessoUsuario,
  useUsuarios,
} from './usuarios.hooks';
import { AcessoUsuarioForm, NovoUsuarioForm } from './UsuarioForms';
import {
  CARGO_LABEL,
  type AcessoUsuarioValues,
  type NovoUsuarioValues,
  type Usuario,
} from './usuarios.types';

function acessoFinanceiroLabel(u: Usuario): string {
  if (u.cargo === 'ADMINISTRADOR') return 'Sempre';
  if (u.cargo === 'GERENTE') return u.acessoFinanceiro ? 'Liberado' : 'Sem acesso';
  return 'Sem acesso';
}

export default function UsuariosPage() {
  const { administrador } = usePermissoes();
  const query = useUsuarios(administrador);
  const createMut = useCreateUsuario();
  const updateMut = useUpdateAcessoUsuario();
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  if (!administrador) {
    return (
      <>
        <PageHeader title="Usuários" />
        <EmptyState
          title="Sem acesso"
          description="Somente administradores gerenciam usuários e permissões."
        />
      </>
    );
  }

  const abrirCriacao = () => {
    setFormError(null);
    setCriando(true);
  };
  const abrirEdicao = (u: Usuario) => {
    setFormError(null);
    setEditando(u);
  };

  const criar = async (values: NovoUsuarioValues) => {
    setFormError(null);
    try {
      await createMut.mutateAsync(values);
      setCriando(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const salvarAcesso = async (values: AcessoUsuarioValues) => {
    if (!editando) return;
    setFormError(null);
    try {
      await updateMut.mutateAsync({ id: editando.id, values });
      setEditando(null);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const items = query.data ?? [];

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Contas, cargos e quem acessa o financeiro. Alterações pedem a confirmação da sua senha."
        action={
          <Button onClick={abrirCriacao}>
            <IconPlus width={18} height={18} />
            Novo usuário
          </Button>
        }
      />

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <Alert kind="error">{getApiErrorMessage(query.error)}</Alert>
      ) : items.length === 0 ? (
        <EmptyState title="Nenhum usuário encontrado" />
      ) : (
        <TableContainer>
          <thead className="border-b border-[#e5e5e5] bg-[#fafafa] text-xs uppercase text-[#0a0a0a]/55">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Financeiro</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-[#f0f0f0]">
                <td className="px-4 py-3 font-medium">{u.nome}</td>
                <td className="px-4 py-3 text-[#0a0a0a]/70">{u.email}</td>
                <td className="px-4 py-3">{CARGO_LABEL[u.cargo]}</td>
                <td className="px-4 py-3">{acessoFinanceiroLabel(u)}</td>
                <td className="px-4 py-3">
                  <StatusBadge ativo={u.ativo} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <IconButton
                      label={`Editar acesso de ${u.nome}`}
                      onClick={() => abrirEdicao(u)}
                    >
                      <IconEdit width={16} height={16} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableContainer>
      )}

      <Modal
        open={criando}
        title="Novo usuário"
        onClose={() => setCriando(false)}
        footer={
          <ModalFormFooter
            formId="novo-usuario-form"
            onCancel={() => setCriando(false)}
            submitting={createMut.isPending}
          />
        }
      >
        <NovoUsuarioForm onSubmit={criar} error={formError} />
      </Modal>

      <Modal
        open={editando !== null}
        title="Editar acesso"
        onClose={() => setEditando(null)}
        footer={
          <ModalFormFooter
            formId="acesso-usuario-form"
            onCancel={() => setEditando(null)}
            submitting={updateMut.isPending}
          />
        }
      >
        {editando && (
          <AcessoUsuarioForm
            key={editando.id}
            usuario={editando}
            onSubmit={salvarAcesso}
            error={formError}
          />
        )}
      </Modal>
    </>
  );
}
