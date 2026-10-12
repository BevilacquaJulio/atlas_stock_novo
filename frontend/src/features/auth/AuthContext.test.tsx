import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { tokenStore } from '../../lib/token-store';
import { reautenticacaoStore } from '../../lib/reautenticacao';
import { SESSION_EXPIRED_EVENT } from '../../lib/api';
import { loginRequest, logoutRequest, restoreSession } from './auth.api';

vi.mock('./auth.api', () => ({ loginRequest: vi.fn(), logoutRequest: vi.fn(), restoreSession: vi.fn() }));
const user = { id: 1, nome: 'Sintético', email: 'user@example.test', cargo: 'OPERADOR' as const, acessoFinanceiro: false };

function Consumer() {
  const auth = useAuth();
  return <>
    <span>{auth.status}</span>
    <button onClick={() => void auth.login('user@example.test', 'synthetic-password')}>Login</button>
    <button onClick={() => void auth.logout()}>Logout</button>
  </>;
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthProvider><Consumer /></AuthProvider></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.resetAllMocks();
  tokenStore.clear();
  reautenticacaoStore.clear();
  vi.mocked(loginRequest).mockResolvedValue({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', user });
  vi.mocked(restoreSession).mockResolvedValue(user);
  vi.mocked(logoutRequest).mockResolvedValue();
});

describe('isolamento de sessão', () => {
  it('logout limpa cache e confirmação de senha imediatamente mesmo com rede pendente', async () => {
    const client = mount();
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await screen.findByText('authenticated');
    client.setQueryData(['private'], { balance: 123 });
    reautenticacaoStore.set('synthetic-reauth-token', 600);
    let finish!: () => void;
    vi.mocked(logoutRequest).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(screen.getByText('unauthenticated')).toBeInTheDocument();
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(reautenticacaoStore.get()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
    expect(logoutRequest).toHaveBeenCalledWith('synthetic-refresh');
    await act(async () => finish());
  });

  it('expiração limpa dados privados em cache', async () => {
    const client = mount();
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await screen.findByText('authenticated');
    client.setQueryData(['private'], { owner: 'old-account' });
    reautenticacaoStore.set('synthetic-reauth-token', 600);
    act(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(reautenticacaoStore.get()).toBeNull();
    expect(screen.getByText('unauthenticated')).toBeInTheDocument();
  });

  it('novo login remove cache e confirmação de senha da identidade anterior', async () => {
    const client = mount();
    client.setQueryData(['private'], { owner: 'old-account' });
    reautenticacaoStore.set('synthetic-reauth-token', 600);
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(screen.getByText('authenticated')).toBeInTheDocument());
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(reautenticacaoStore.get()).toBeNull();
  });
});
