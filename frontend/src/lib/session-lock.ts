export const SESSION_CHANGED_EVENT = 'atlas:session-changed';
const key = 'atlas.session-change';

export function notifySessionChange(): void {
  localStorage.setItem(key, crypto.randomUUID());
}

window.addEventListener('storage', (event) => {
  if (event.key === key) window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
});

export async function withSessionLock<T>(run: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    throw new Error(
      'Abra o sistema em HTTPS ou em um domínio .localhost para manter a sessão segura.',
    );
  return navigator.locks.request(
    'atlas-auth',
    { signal: AbortSignal.timeout(20_000) },
    run,
  );
}
