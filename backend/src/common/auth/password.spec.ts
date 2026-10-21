import { describe, expect, it } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword } from './password';
import { itemTotal, sumMoney } from '../money';

describe('senhas e cálculo decimal', () => {
  it('hash novo tem Argon2id e salt individual', async () => {
    const first = await hashPassword('senha-sintetica-forte');
    const second = await hashPassword('senha-sintetica-forte');
    expect(first).toMatch(/^\$argon2id\$/);
    expect(first).not.toBe(second);
    expect(await verifyPassword(first, 'senha-sintetica-forte')).toBe(true);
    expect(await verifyPassword(first, 'errada')).toBe(false);
    expect(await verifyPassword('malformado', 'senha')).toBe(false);
  });
  it('recusa o truncamento silencioso de senhas bcrypt legadas', async () => {
    const password = 'a'.repeat(72);
    expect(
      await verifyPassword(await bcrypt.hash(password, 4), `${password}suffix`),
    ).toBe(false);
  });
  it('arredonda cada item antes de somar o total da compra', () => {
    expect(itemTotal(0.5, 0.01)).toBe(0.01);
    expect(sumMoney([itemTotal(0.5, 0.01), itemTotal(0.5, 0.01)])).toBe(0.02);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(() => itemTotal(999999999, 999999999)).toThrow();
  });
});
