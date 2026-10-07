const KEY = 'g5_financeiro_token';

export const financeiroUnlockStore = {
  get(): string | null {
    return sessionStorage.getItem(KEY);
  },
  set(token: string) {
    sessionStorage.setItem(KEY, token);
  },
  clear() {
    sessionStorage.removeItem(KEY);
  },
};
