let accessToken: string | null = null;
let generation = 0;

// Remove a credencial legada durante a transição para cookie HttpOnly.
localStorage.removeItem('g5.refreshToken');

export const tokenStore = {
  getGeneration: (): number => generation,
  getAccess: (): string | null => accessToken,
  setAccess: (token: string | null): void => {
    accessToken = token;
  },
  clear: (): void => {
    generation += 1;
    accessToken = null;
  },
};
