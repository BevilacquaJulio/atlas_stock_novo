import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage } from '../../lib/api';
import { TextField } from '../../components/form/TextField';
import { Button } from '../../components/Button';
import { withSessionLock, notifySessionChange } from '../../lib/session-lock';

const schema = z
  .object({
    novaSenha: z.string().min(12).max(72),
    confirmacao: z.string(),
  })
  .refine((data) => data.novaSenha === data.confirmacao, {
    path: ['confirmacao'],
    message: 'As senhas devem ser iguais.',
  });

export default function RecoveryPage() {
  const [token] = useState(() => window.location.hash.slice(1));
  useEffect(() => {
    history.replaceState(null, '', window.location.pathname);
  }, []);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Recuperar senha</h1>
      {done ? (
        <>
          <p>Senha atualizada. As sessões anteriores foram encerradas.</p>
          <Link to="/login">Entrar</Link>
        </>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(async ({ novaSenha }) => {
            setError('');
            try {
              await withSessionLock(() =>
                api.post('/auth/recuperar', {
                  token,
                  novaSenha,
                }),
              );
              notifySessionChange();
              setDone(true);
            } catch (err) {
              setError(getApiErrorMessage(err));
            }
          })}
        >
          {error && <p role="alert">{error}</p>}
          <TextField
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            error={errors.novaSenha?.message}
            {...register('novaSenha')}
          />
          <TextField
            label="Confirme a nova senha"
            type="password"
            autoComplete="new-password"
            error={errors.confirmacao?.message}
            {...register('confirmacao')}
          />
          <Button type="submit" loading={isSubmitting}>
            Atualizar senha
          </Button>
        </form>
      )}
    </main>
  );
}
