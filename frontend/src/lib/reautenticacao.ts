import { tokenStore } from './token-store';

/**
 * Confirmação de senha exigida pela API nas ações críticas (pagamentos,
 * estornos, cancelamentos e gestão de acessos). O token vive só em memória,
 * expira junto com a validade informada pela API e é descartado se a sessão
 * mudar (logout, troca de conta).
 */
interface Confirmacao {
  token: string;
  expiraEm: number;
  generation: number;
}

/** Margem para não enviar um token que expira no meio da requisição. */
const MARGEM_MS = 30_000;

let atual: Confirmacao | null = null;

export const reautenticacaoStore = {
  get(): string | null {
    if (
      !atual ||
      atual.generation !== tokenStore.getGeneration() ||
      Date.now() >= atual.expiraEm
    ) {
      return null;
    }
    return atual.token;
  },
  set(token: string, expiresInSegundos: number): void {
    atual = {
      token,
      expiraEm: Date.now() + expiresInSegundos * 1000 - MARGEM_MS,
      generation: tokenStore.getGeneration(),
    };
  },
  clear(): void {
    atual = null;
  },
};

/** Abre o pedido de senha; resolve `true` quando o usuário confirmou. */
type Solicitante = () => Promise<boolean>;

let solicitante: Solicitante | null = null;
let pendente: Promise<boolean> | null = null;

/** Registrado pela interface (ReautenticacaoProvider). */
export function registrarSolicitanteReautenticacao(fn: Solicitante): () => void {
  solicitante = fn;
  return () => {
    if (solicitante === fn) solicitante = null;
  };
}

/**
 * Pede a senha uma única vez mesmo com várias ações aguardando: todas usam a
 * mesma confirmação.
 */
export function solicitarReautenticacao(): Promise<boolean> {
  if (!solicitante) return Promise.resolve(false);
  pendente ??= solicitante().finally(() => {
    pendente = null;
  });
  return pendente;
}
