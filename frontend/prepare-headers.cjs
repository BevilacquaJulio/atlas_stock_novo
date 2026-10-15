const fs = require('node:fs');
const input = process.env.VITE_API_URL?.trim();
const origin = input ? new URL(input).origin : '';
if (origin && !/^https?:\/\/[a-zA-Z0-9.:[\]-]+$/.test(origin))
  throw new Error('Origem de API inválida.');
fs.writeFileSync(
  'security-headers.conf',
  fs
    .readFileSync('security-headers.conf', 'utf8')
    .replace('__API_ORIGIN__', origin),
);
