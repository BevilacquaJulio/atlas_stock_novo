/** Credenciais demo para portfolio — só ativas quando ambas variáveis VITE_* existem. */
export const demoAdminEmail = import.meta.env.VITE_DEMO_ADMIN_EMAIL?.trim() ?? '';
export const demoAdminPassword =
  import.meta.env.VITE_DEMO_ADMIN_PASSWORD?.trim() ?? '';

export const isDemoLoginEnabled =
  demoAdminEmail.length > 0 && demoAdminPassword.length > 0;
