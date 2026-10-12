import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from './Modal';
import { ModalFormFooter } from './ModalFormFooter';
import { Alert } from './feedback';
import { TextField } from './form/TextField';
import { getApiErrorMessage } from '../lib/api';
import {
  reautenticacaoStore,
  registrarSolicitanteReautenticacao,
} from '../lib/reautenticacao';
import { reautenticarRequest } from '../features/auth/auth.api';

const schema = z.object({ senha: z.string().min(1, 'Informe sua senha.') });
type FormValues = z.infer<typeof schema>;

/**
 * Pede a senha do próprio usuário quando a API exige confirmação de uma ação
 * crítica. A requisição original é repetida automaticamente após a confirmação.
 */
export function ReautenticacaoDialog() {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const resolver = useRef<((confirmou: boolean) => void) | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(
    () =>
      registrarSolicitanteReautenticacao(
        () =>
          new Promise<boolean>((resolve) => {
            resolver.current = resolve;
            setErro(null);
            reset({ senha: '' });
            setAberto(true);
          }),
      ),
    [reset],
  );

  const encerrar = useCallback((confirmou: boolean) => {
    setAberto(false);
    resolver.current?.(confirmou);
    resolver.current = null;
  }, []);

  // Se a tela sair do ar com o pedido aberto, a ação pendente é cancelada.
  useEffect(() => () => resolver.current?.(false), []);

  const confirmar = async ({ senha }: FormValues) => {
    setErro(null);
    try {
      const { token, expiresIn } = await reautenticarRequest(senha);
      reautenticacaoStore.set(token, expiresIn);
      encerrar(true);
    } catch (err) {
      setErro(getApiErrorMessage(err));
    }
  };

  return (
    <Modal
      open={aberto}
      title="Confirme sua senha"
      onClose={() => encerrar(false)}
      footer={
        <ModalFormFooter
          formId="reautenticacao-form"
          onCancel={() => encerrar(false)}
          submitting={isSubmitting}
          submitLabel="Confirmar"
        />
      }
    >
      <form
        id="reautenticacao-form"
        onSubmit={handleSubmit(confirmar)}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-[#0a0a0a]/70">
          Esta ação mexe em valores ou acessos. Confirme a senha da sua conta
          para continuar; a confirmação vale por alguns minutos.
        </p>
        {erro && <Alert kind="error">{erro}</Alert>}
        <TextField
          label="Sua senha"
          type="password"
          autoComplete="current-password"
          autoFocus
          error={errors.senha?.message}
          {...register('senha')}
        />
      </form>
    </Modal>
  );
}
