import { describe, expect, it } from 'vitest';
import { validateDemoPopulate } from './demo-populate';

const env = {
  NODE_ENV: 'development', ALLOW_DEMO_POPULATE: 'true',
  SEED_ADMIN_EMAIL: 'admin@example.test', SEED_ADMIN_PASSWORD: 'synthetic-password',
};

describe('validateDemoPopulate', () => {
  it('bloqueia produção e ambiente indefinido mesmo com opt-in', () => {
    for (const NODE_ENV of ['production', undefined]) {
      expect(() => validateDemoPopulate({ ...env, NODE_ENV })).toThrow();
    }
  });
  it('exige opt-in e senha administrativa válida', () => {
    expect(() => validateDemoPopulate({ ...env, ALLOW_DEMO_POPULATE: undefined })).toThrow();
    expect(() => validateDemoPopulate({ ...env, SEED_ADMIN_PASSWORD: undefined })).toThrow();
    expect(() => validateDemoPopulate({ ...env, SEED_ADMIN_PASSWORD: 'é'.repeat(40) })).toThrow();
    expect(() => validateDemoPopulate(env)).not.toThrow();
  });
});
