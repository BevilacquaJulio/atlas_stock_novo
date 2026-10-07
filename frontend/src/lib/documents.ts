/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function allSameDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

function calcCheckDigit(digits: string, weights: number[]): number {
  const sum = weights.reduce(
    (acc, weight, i) => acc + Number(digits[i]) * weight,
    0,
  );
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

/** Valida CPF pelos dígitos verificadores (Receita Federal). */
export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || allSameDigits(digits)) return false;

  const d1 = calcCheckDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (d1 !== Number(digits[9])) return false;

  const d2 = calcCheckDigit(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d2 === Number(digits[10]);
}

/** Valida CNPJ pelos dígitos verificadores (Receita Federal). */
export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || allSameDigits(digits)) return false;

  const d1 = calcCheckDigit(
    digits,
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  if (d1 !== Number(digits[12])) return false;

  const d2 = calcCheckDigit(
    digits,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return d2 === Number(digits[13]);
}

/** Aceita CPF válido (11) ou CNPJ válido (14). */
export function isValidCpfCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

/**
 * Mensagem de validação em tempo real.
 * Só aponta erro quando o documento já está completo (11 ou 14 dígitos).
 */
export function getCpfCnpjLiveError(value: string): string | undefined {
  const digits = onlyDigits(value);
  if (digits.length === 11 && !isValidCpf(digits)) return 'CPF inválido.';
  if (digits.length === 14 && !isValidCnpj(digits)) return 'CNPJ inválido.';
  return undefined;
}

/** Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00). */
export function formatCpfCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}
