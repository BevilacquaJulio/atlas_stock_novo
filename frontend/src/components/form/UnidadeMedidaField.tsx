import { forwardRef } from 'react';
import { SelectField } from './SelectField';
import type { UnidadeMedidaOption } from '../../lib/unidades-medida';

interface UnidadeMedidaFieldProps {
  label?: string;
  error?: string;
  options: UnidadeMedidaOption[];
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  onBlur?: React.FocusEventHandler<HTMLSelectElement>;
}

/** Dropdown de unidade de medida — reutiliza o SelectField Obsidian. */
export const UnidadeMedidaField = forwardRef<
  HTMLSelectElement,
  UnidadeMedidaFieldProps
>(function UnidadeMedidaField(
  {
    label = 'Unidade de medida',
    options,
    error,
    disabled,
    placeholder = 'Selecione a unidade',
    ...props
  },
  ref,
) {
  return (
    <SelectField
      ref={ref}
      label={label}
      error={error}
      disabled={disabled}
      placeholder={placeholder}
      options={options.map((option) => ({
        value: option.value,
        label: `${option.value} — ${option.label}`,
      }))}
      {...props}
    />
  );
});
