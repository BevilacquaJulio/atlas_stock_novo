import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';

export const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} satisfies argon2.HashOptions;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, passwordOptions);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  if (Buffer.byteLength(password, 'utf8') > 1024) return false;
  try {
    if (hash.startsWith('$argon2id$'))
      return await argon2.verify(hash, password);
    // Não aceitar os sufixos que o bcrypt legado descartaria silenciosamente.
    if (/^\$2[aby]\$/.test(hash) && Buffer.byteLength(password, 'utf8') <= 72) {
      return await bcrypt.compare(password, hash);
    }
  } catch {
    return false;
  }
  return false;
}
