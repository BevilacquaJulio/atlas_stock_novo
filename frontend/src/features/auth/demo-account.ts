export const demoAccount = {
  email: 'demo@atlas.com',
  password: 'AtlasDemo2026!',
} as const;

export function isDemoEnabled() {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}
