/**
 * Access token vive apenas em memória (não em localStorage — reduz superfície
 * de XSS). O refresh token persiste em localStorage para manter a sessão entre
 * recarregamentos; ao carregar o app, ele é trocado por um novo access token.
 */
const REFRESH_KEY = 'g5.refreshToken';

let accessToken: string | null = null;

export const tokenStore = {
  getAccess: (): string | null => accessToken,
  setAccess: (token: string | null): void => {
    accessToken = token;
  },
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string | null): void => {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  },
  clear: (): void => {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};
