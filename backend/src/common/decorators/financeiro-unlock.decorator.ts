import { SetMetadata } from '@nestjs/common';

export const FINANCEIRO_UNLOCK_KEY = 'financeiroUnlock';

/** Rotas sensíveis do financeiro exigem desbloqueio (exceto ADMINISTRADOR). */
export const FinanceiroUnlock = () => SetMetadata(FINANCEIRO_UNLOCK_KEY, true);
