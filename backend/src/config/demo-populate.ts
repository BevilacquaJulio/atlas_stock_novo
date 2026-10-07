export function validateDemoPopulate(env: NodeJS.ProcessEnv): void {
  if (!['development', 'test'].includes(env.NODE_ENV ?? '')) {
    throw new Error('Populate permitido somente com NODE_ENV=development ou test.');
  }
  if (env.ALLOW_DEMO_POPULATE !== 'true') {
    throw new Error('Defina ALLOW_DEMO_POPULATE=true em um banco exclusivo de demonstração.');
  }
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD.length < 12) {
    throw new Error('Informe SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD com ao menos 12 caracteres.');
  }
  if (Buffer.byteLength(env.SEED_ADMIN_PASSWORD, 'utf8') > 72) {
    throw new Error('SEED_ADMIN_PASSWORD deve ter no máximo 72 bytes UTF-8.');
  }
}
