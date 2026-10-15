import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../lib/api';
import { withSessionLock, notifySessionChange } from '../../lib/session-lock';
import { tokenStore } from '../../lib/token-store';
import { useAuth } from './useAuth';
import { TextField } from '../../components/form/TextField';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';

const passwordSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(12).max(72),
  codigo: z.string().optional(),
});
type Session = { id: string; criadoEm: string; expiraEm: string };

export default function SecurityPage() {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(
    null,
  );
  const [codigo, setCodigo] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const sessions = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => (await api.get<Session[]>('/auth/sessoes')).data,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await run();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Segurança da conta"
        subtitle="Senha, autenticação em duas etapas e sessões."
      />
      <div className="flex max-w-2xl flex-col gap-8">
        {error && <p role="alert">{error}</p>}
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 text-lg font-semibold">Alterar senha</h2>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(async (values) =>
              action(async () => {
                await withSessionLock(() =>
                  api.post('/auth/senha', {
                    ...values,
                    codigo: values.codigo || undefined,
                  }),
                );
                notifySessionChange();
                await logout();
              }),
            )}
          >
            <TextField
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              error={errors.senhaAtual?.message}
              {...register('senhaAtual')}
            />
            <TextField
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              error={errors.novaSenha?.message}
              {...register('novaSenha')}
            />
            <TextField
              label="Código MFA (se ativado)"
              autoComplete="one-time-code"
              {...register('codigo')}
            />
            <Button type="submit" loading={isSubmitting}>
              Alterar senha e encerrar sessões
            </Button>
          </form>
        </section>
        <section className="flex flex-col gap-4 rounded-xl border p-5">
          <h2 className="text-lg font-semibold">Autenticação em duas etapas</h2>
          {recoveryCodes.length ? (
            <>
              <p>
                Guarde estes códigos em local seguro. Cada código funciona uma
                única vez. Eles não serão mostrados novamente.
              </p>
              <pre className="whitespace-pre-wrap break-all">
                {recoveryCodes.join('\n')}
              </pre>
              <Button
                onClick={() => {
                  tokenStore.clear();
                  notifySessionChange();
                  void logout();
                }}
              >
                Guardei os códigos; entrar novamente
              </Button>
            </>
          ) : (
            <>
              <p>
                {user?.mfaAtivo
                  ? 'MFA está ativo.'
                  : 'Use um aplicativo autenticador para proteger sua conta.'}
              </p>
              {!user?.mfaAtivo && !setup && (
                <Button
                  loading={busy}
                  onClick={() =>
                    void action(async () => {
                      setSetup(
                        (
                          await api.post<{ secret: string; uri: string }>(
                            '/auth/mfa/configurar',
                          )
                        ).data,
                      );
                    })
                  }
                >
                  Configurar MFA
                </Button>
              )}
              {setup && (
                <>
                  <p>
                    Adicione a chave ao aplicativo autenticador como conta TOTP
                    de 6 dígitos, período de 30 segundos.
                  </p>
                  <code className="break-all">{setup.secret}</code>
                </>
              )}
              {(setup || user?.mfaAtivo) && (
                <>
                  <TextField
                    label="Código do autenticador ou de recuperação"
                    autoComplete="one-time-code"
                    value={codigo}
                    onChange={(event) => setCodigo(event.target.value)}
                  />
                  <Button
                    loading={busy}
                    onClick={() =>
                      void action(async () => {
                        if (user?.mfaAtivo) {
                          await api.post('/auth/mfa/desativar', { codigo });
                          notifySessionChange();
                          await logout();
                        } else {
                          const { data } = await api.post<{
                            recoveryCodes: string[];
                          }>('/auth/mfa/ativar', { codigo });
                          setRecoveryCodes(data.recoveryCodes);
                          setSetup(null);
                        }
                      })
                    }
                  >
                    {user?.mfaAtivo
                      ? 'Desativar MFA e encerrar sessões'
                      : 'Ativar MFA'}
                  </Button>
                </>
              )}
            </>
          )}
        </section>
        <section className="flex flex-col gap-4 rounded-xl border p-5">
          <h2 className="text-lg font-semibold">Sessões ativas</h2>
          {sessions.isError && (
            <p role="alert">{getApiErrorMessage(sessions.error)}</p>
          )}
          {sessions.isPending && <p role="status">Carregando sessões…</p>}
          {sessions.data?.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-3"
            >
              <span>
                {new Date(session.criadoEm).toLocaleString('pt-BR')}
                {session.id === user?.sessaoId ? ' — sessão atual' : ''}
              </span>
              <Button
                variant="secondary"
                disabled={busy || recoveryCodes.length > 0}
                onClick={() =>
                  void action(async () => {
                    await api.delete(`/auth/sessoes/${session.id}`);
                    if (session.id === user?.sessaoId) await logout();
                    else await sessions.refetch();
                  })
                }
              >
                Encerrar sessão
              </Button>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
