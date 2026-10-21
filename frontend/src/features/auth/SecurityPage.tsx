import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '../../lib/api';
import { withSessionLock, notifySessionChange } from '../../lib/session-lock';
import { useAuth } from './useAuth';
import { TextField } from '../../components/form/TextField';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';

const passwordSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(12).max(72),
});
type Session = { id: string; criadoEm: string; expiraEm: string };

export default function SecurityPage() {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
        subtitle="Senha e sessões da sua conta."
      />
      <div className="flex max-w-2xl flex-col gap-8">
        {error && <p role="alert">{error}</p>}
        <section className="rounded-xl border p-5">
          <h2 className="mb-4 text-lg font-semibold">Alterar senha</h2>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(async (values) =>
              action(async () => {
                await withSessionLock(() => api.post('/auth/senha', values));
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
            <Button type="submit" loading={isSubmitting}>
              Alterar senha e encerrar sessões
            </Button>
          </form>
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
                disabled={busy}
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
