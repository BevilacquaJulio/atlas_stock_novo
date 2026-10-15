require('reflect-metadata');
const fs = require('node:fs');
const path = require('node:path');
const { PATH_METADATA, METHOD_METADATA } = require('@nestjs/common/constants');
const { RequestMethod } = require('@nestjs/common');

const root = path.join(__dirname, '../dist/src/modules');
function walk(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : entry.name.endsWith('.controller.js')
          ? [path.join(directory, entry.name)]
          : [],
    );
}
const rows = [];
for (const file of walk(root)) {
  for (const controller of Object.values(require(file))) {
    if (typeof controller !== 'function') continue;
    const base = Reflect.getMetadata(PATH_METADATA, controller);
    if (typeof base !== 'string') continue;
    for (const name of Object.getOwnPropertyNames(controller.prototype)) {
      if (name === 'constructor') continue;
      const handler = controller.prototype[name];
      if (typeof handler !== 'function') continue;
      const suffix = Reflect.getMetadata(PATH_METADATA, handler);
      if (suffix === undefined) continue;
      const meta = (key) =>
        Reflect.getMetadata(key, handler) ??
        Reflect.getMetadata(key, controller);
      const publicRoute = meta('isPublic');
      const roles = meta('roles');
      const route = `/api/${base}/${suffix}`
        .replace(/\/+/g, '/')
        .replace(/\/$/, '');
      rows.push({
        route,
        method: RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)],
        public: publicRoute,
        roles,
        finance: meta('acessoFinanceiro'),
        reauth: meta('reautenticacao'),
      });
    }
  }
}
console.log(
  '# Inventário de endpoints\n\nGerado do build Nest em 15/10/2026. A instalação atende uma empresa. Os registros operacionais são compartilhados conforme a matriz de cargos; sessões e recuperação pertencem ao próprio usuário.\n',
);
console.log(
  '| Método | Endpoint | Acesso | Financeiro | Reautenticação |\n| --- | --- | --- | --- | --- |',
);
for (const row of rows.sort(
  (a, b) => a.route.localeCompare(b.route) || a.method.localeCompare(b.method),
))
  console.log(
    `| ${row.method} | \`${row.route}\` | ${row.public ? 'Público' : (row.roles?.join(', ') ?? (row.finance ? 'Permissão financeira' : '**SEM REGRA**'))} | ${row.finance ? 'Sim' : '—'} | ${row.reauth ? 'Sim' : '—'} |`,
  );
console.log(
  `\nTotal: ${rows.length} rotas. Corpos e consultas são definidos nos DTOs Zod em backend/src/modules/*/dto; OpenAPI é exposto somente fora de produção.\n`,
);
