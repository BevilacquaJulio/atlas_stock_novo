import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField } from '../../components/form/TextField';
import { SelectField } from '../../components/form/SelectField';
import { SwitchField } from '../../components/form/SwitchField';
import { Alert } from '../../components/feedback';
import {
  CARGO_LABEL,
  type AcessoUsuarioValues,
  type NovoUsuarioValues,
  type Usuario,
} from './usuarios.types';

const cargoSchema = z.enum(['ADMINISTRADOR', 'GERENTE', 'OPERADOR']);
const cargoOptions = cargoSchema.options.map((value) => ({
  value,
  label: CARGO_LABEL[value],
}));

const DESCRICAO_FINANCEIRO =
  'Libera o financeiro e os totais do dashboard para este gerente. Administradores já têm acesso; operadores não têm.';

/** A permissão financeira só se aplica a gerentes (mesma regra da API). */
function acessoEfetivo<T extends { cargo: string; acessoFinanceiro: boolean }>(
  values: T,
): T {
  return values.cargo === 'GERENTE' ? values : { ...values, acessoFinanceiro: false };
}

const novoSchema = z.object({
  nome: z.string().trim().min(2, 'Mínimo de 2 caracteres.').max(150),
  email: z.string().trim().email('E-mail inválido.').max(180),
  senha: z
    .string()
    .min(12, 'Mínimo de 12 caracteres.')
    .max(72, 'Máximo de 72 caracteres.'),
  cargo: cargoSchema,
  acessoFinanceiro: z.boolean(),
});

export function NovoUsuarioForm({
  onSubmit,
  error,
}: {
  onSubmit: (values: NovoUsuarioValues) => void;
  error?: string | null;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<NovoUsuarioValues>({
    resolver: zodResolver(novoSchema),
    defaultValues: { cargo: 'OPERADOR', acessoFinanceiro: false },
  });
  const cargo = useWatch({ control, name: 'cargo' });

  return (
    <form
      id="novo-usuario-form"
      onSubmit={handleSubmit((values) => onSubmit(acessoEfetivo(values)))}
      className="flex flex-col gap-4"
    >
      {error && <Alert kind="error">{error}</Alert>}
      <TextField label="Nome" error={errors.nome?.message} {...register('nome')} />
      <TextField
        label="E-mail"
        type="email"
        autoComplete="off"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Senha inicial"
        type="password"
        autoComplete="new-password"
        error={errors.senha?.message}
        {...register('senha')}
      />
      <SelectField
        label="Cargo"
        options={cargoOptions}
        error={errors.cargo?.message}
        {...register('cargo')}
      />
      {cargo === 'GERENTE' && (
        <SwitchField
          label="Acesso ao financeiro"
          description={DESCRICAO_FINANCEIRO}
          {...register('acessoFinanceiro')}
        />
      )}
    </form>
  );
}

const acessoSchema = z.object({
  cargo: cargoSchema,
  ativo: z.boolean(),
  acessoFinanceiro: z.boolean(),
});

export function AcessoUsuarioForm({
  usuario,
  onSubmit,
  error,
}: {
  usuario: Usuario;
  onSubmit: (values: AcessoUsuarioValues) => void;
  error?: string | null;
}) {
  const { register, handleSubmit, control } = useForm<AcessoUsuarioValues>({
    resolver: zodResolver(acessoSchema),
    defaultValues: {
      cargo: usuario.cargo,
      ativo: usuario.ativo,
      acessoFinanceiro: usuario.acessoFinanceiro,
    },
  });
  const cargo = useWatch({ control, name: 'cargo' });

  return (
    <form
      id="acesso-usuario-form"
      onSubmit={handleSubmit((values) => onSubmit(acessoEfetivo(values)))}
      className="flex flex-col gap-4"
    >
      {error && <Alert kind="error">{error}</Alert>}
      <p className="text-sm text-[#0a0a0a]/70">
        {usuario.nome} — {usuario.email}
      </p>
      <SelectField label="Cargo" options={cargoOptions} {...register('cargo')} />
      {cargo === 'GERENTE' && (
        <SwitchField
          label="Acesso ao financeiro"
          description={DESCRICAO_FINANCEIRO}
          {...register('acessoFinanceiro')}
        />
      )}
      <SwitchField
        label="Ativo"
        description="Usuários inativos perdem o acesso na próxima ação."
        {...register('ativo')}
      />
    </form>
  );
}
