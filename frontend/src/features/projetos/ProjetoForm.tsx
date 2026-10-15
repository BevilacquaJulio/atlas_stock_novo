import { RemoteSelectField } from '../../components/form/RemoteSelectField';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField } from '../../components/form/TextField';
import { TextareaField } from '../../components/form/TextareaField';
import { Alert } from '../../components/feedback';
import type { ProjetoFormValues } from './projetos.types';

const schema = z.object({
  clienteId: z.coerce.number().int().positive('Selecione o cliente.'),
  veiculoId: z.coerce.number().int().positive('Selecione o veículo.'),
  descricao: z.string().trim().optional(),
  valorOrcado: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

export function ProjetoForm({
  onSubmit,
  error,
}: {
  onSubmit: (values: ProjetoFormValues) => void;
  error?: string | null;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { valorOrcado: 0 },
  });

  const clienteIdRaw = watch('clienteId');
  const clienteId = Number(clienteIdRaw) || 0;

  useEffect(() => {
    setValue('veiculoId', '' as unknown as number);
  }, [clienteId, setValue]);

  return (
    <form
      id="projeto-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {error && <Alert kind="error">{error}</Alert>}

      <RemoteSelectField
        label="Cliente"
        placeholder="Selecione"
        error={errors.clienteId?.message}
        source="clientes"
        {...register('clienteId')}
      />

      <RemoteSelectField
        key={clienteId || 'no-client'}
        label="Veículo"
        placeholder="Selecione"
        error={errors.veiculoId?.message}
        source="veiculos"
        clienteId={clienteId}
        disabled={clienteId <= 0}
        {...register('veiculoId')}
      />

      <TextField
        label="Valor orçado (R$)"
        type="number"
        step="0.01"
        min="0"
        error={errors.valorOrcado?.message}
        {...register('valorOrcado')}
      />

      <TextareaField
        label="Descrição / observações"
        rows={3}
        error={errors.descricao?.message}
        {...register('descricao')}
      />
    </form>
  );
}
