import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  return bits
    .match(/.{5}/g)!
    .map((group) => alphabet[parseInt(group, 2)])
    .join('');
}

export function totp(secret: string, step: number): string {
  const bits = [...secret]
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0'))
    .join('');
  const key = Buffer.from(
    bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hash = createHmac('sha1', key).update(counter).digest();
  const offset = hash[19] & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, '0');
}

export function verifyTotp(
  secret: string,
  code: string,
  lastStep: number,
  now = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 30_000);
  for (const step of [current, current - 1, current + 1]) {
    if (
      step > lastStep &&
      timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(code))
    )
      return step;
  }
  return null;
}

export function encryptSecret(secret: string, key: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), nonce);
  return Buffer.concat([
    nonce,
    cipher.update(secret, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('base64');
}

export function decryptSecret(value: string, key: string): string {
  const data = Buffer.from(value, 'base64');
  const cipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    data.subarray(0, 12),
  );
  cipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([
    cipher.update(data.subarray(12, -16)),
    cipher.final(),
  ]).toString('utf8');
}
