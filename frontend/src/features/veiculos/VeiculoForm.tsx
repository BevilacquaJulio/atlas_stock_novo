import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { TextField } from '../../components/form/TextField';
import { SelectField } from '../../components/form/SelectField';
import { TextareaField } from '../../components/form/TextareaField';
import { SwitchField } from '../../components/form/SwitchField';
import { Alert } from '../../components/feedback';
import { listClientes } from '../clientes/clientes.api';
import type { Veiculo, VeiculoFormValues } from './veiculos.types';

const schema = z.object({
  clienteId: z.coerce.number().int().positive('Selecione o cliente.'),
  placa: z.string().trim().min(5, 'Placa inválida.').max(10),
  marca: z.string().trim().min(1, 'Informe a marca.'),
  modelo: z.string().trim().min(1, 'Informe o modelo.'),
  ano: z.string().trim().optional(),
  cor: z.string().trim().optional(),
  observacoesTecnicas: z.string().trim().optional(),
  ativo: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function VeiculoForm({
  initial,
  onSubmit,
  error,
}: {
  initial?: Veiculo;
  onSubmit: (values: VeiculoFormValues) => void;
  error?: string | null;
}) {
  const clientesQuery = useQuery({
    queryKey: ['clientes', 'options'],
    queryFn: () => listClientes({ limit: 100, ativo: true }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clienteId: initial?.clienteId ?? 0,
      placa: initial?.placa ?? '',
      marca: initial?.marca ?? '',
      modelo: initial?.modelo ?? '',
      ano: initial?.ano ?? '',
      cor: initial?.cor ?? '',
      observacoesTecnicas: initial?.observacoesTecnicas ?? '',
      ativo: initial?.ativo ?? true,
    },
  });

  const clienteOptions =
    clientesQuery.data?.data.map((c) => ({
      value: c.id,
      label: c.nomeCompleto,
    })) ?? [];

  return (
    <form
      id="veiculo-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {error && <Alert kind="error">{error}</Alert>}
      <SelectField
        label="Cliente"
        placeholder={
          clientesQuery.isLoading ? 'Carregando…' : 'Selecione o cliente'
        }
        error={errors.clienteId?.message}
        options={clienteOptions}
        {...register('clienteId')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Placa"
          error={errors.placa?.message}
          {...register('placa')}
        />
        <TextField label="Ano" {...register('ano')} />
        <TextField
          label="Marca"
          error={errors.marca?.message}
          {...register('marca')}
        />
        <TextField
          label="Modelo"
          error={errors.modelo?.message}
          {...register('modelo')}
        />
        <TextField label="Cor" {...register('cor')} />
      </div>
      <TextareaField
        label="Observações técnicas"
        {...register('observacoesTecnicas')}
      />
      <SwitchField
        label="Ativo"
        description="Veículos inativos não podem ser usados em novos projetos."
        {...register('ativo')}
      />
    </form>
  );
}
