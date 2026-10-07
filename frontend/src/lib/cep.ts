import { onlyDigits } from './documents';

export interface CepAddress {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}

export class CepLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CepLookupError';
  }
}

/** Formata CEP como 00000-000. */
export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Consulta ViaCEP e devolve o endereço.
 * Lança `CepLookupError` se o CEP for inválido ou não encontrado.
 */
export async function lookupCep(cep: string): Promise<CepAddress> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) {
    throw new CepLookupError('Informe um CEP com 8 dígitos.');
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) {
    throw new CepLookupError('Não foi possível consultar o CEP. Tente novamente.');
  }

  const data = (await response.json()) as {
    erro?: boolean;
    cep?: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    complemento?: string;
  };

  if (data.erro || !data.localidade) {
    throw new CepLookupError('CEP não encontrado.');
  }

  return {
    cep: formatCep(digits),
    rua: data.logradouro ?? '',
    bairro: data.bairro ?? '',
    cidade: data.localidade ?? '',
    estado: (data.uf ?? '').toUpperCase(),
    complemento: data.complemento || undefined,
  };
}
