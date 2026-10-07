import type { ReactNode } from 'react';
import { Button } from './Button';

/** Rodapé padrão de modais com formulário (Cancelar + Salvar). */
export function ModalFormFooter({
  formId,
  onCancel,
  submitting,
  submitLabel = 'Salvar',
}: {
  formId: string;
  onCancel: () => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" form={formId} loading={submitting}>
        {submitLabel}
      </Button>
    </div>
  );
}

/** Rodapé genérico alinhado à direita. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}
