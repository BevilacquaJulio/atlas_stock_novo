export const demoAccount = {
  email: 'demo@atlas.com',
  get password() {
    return import.meta.env.VITE_DEMO_PASSWORD ?? '';
  },
} as const;

export function isDemoEnabled() {
  return (
    import.meta.env.VITE_DEMO_MODE === 'true' &&
    demoAccount.password.length >= 12
  );
}
