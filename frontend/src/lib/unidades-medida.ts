export interface UnidadeMedidaOption {
  value: string;
  label: string;
}

/** Unidades de medida padronizadas para produtos. */
export const UNIDADES_MEDIDA: readonly UnidadeMedidaOption[] = [
  { value: 'UN', label: 'UNIDADE' },
  { value: 'MT', label: 'METRO' },
  { value: 'KG', label: 'QUILOGRAMA' },
  { value: 'L', label: 'LITRO' },
  { value: 'M²', label: 'METRO QUADRADO' },
  { value: 'M³', label: 'METRO CÚBICO' },
] as const;

export const UNIDADE_MEDIDA_VALUES = UNIDADES_MEDIDA.map((u) => u.value);

/** Inclui valor legado no editar, se não estiver na lista padrão. */
export function resolveUnidadeMedidaOptions(
  current?: string | null,
): UnidadeMedidaOption[] {
  if (!current || UNIDADES_MEDIDA.some((u) => u.value === current)) {
    return [...UNIDADES_MEDIDA];
  }
  return [{ value: current, label: current }, ...UNIDADES_MEDIDA];
}
