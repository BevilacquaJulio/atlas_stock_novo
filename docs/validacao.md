# Validação em ambiente descartável

Os testes MySQL e E2E recusam qualquer destino diferente de `NODE_ENV=test`, `ALLOW_TEST_DATABASE=true`, host `127.0.0.1`, porta `13316`, database `atlas_estoque_teste`, usuário `atlas_audit` e `MYSQL_SSL=false`. Nunca altere esses guardas para apontar ao banco real.

Crie um container exclusivo, sem volumes persistentes. Os valores abaixo são sintéticos e não devem ser reutilizados em ambientes reais:

```bash
docker run -d --name atlas-refinamento-test --label atlas.purpose=disposable-test -p 127.0.0.1:13316:3306 -e MYSQL_DATABASE=atlas_estoque_teste -e MYSQL_USER=atlas_audit -e MYSQL_PASSWORD=synthetic-local-test-only -e MYSQL_ROOT_PASSWORD=synthetic-local-root-only mysql:8.4
docker exec atlas-refinamento-test mysqladmin ping -h 127.0.0.1 --silent
```

No PowerShell, a partir de `backend`:

```powershell
$env:NODE_ENV='test'
$env:ALLOW_TEST_DATABASE='true'
$env:MYSQL_HOST='127.0.0.1'
$env:MYSQL_PORT='13316'
$env:MYSQL_USER='atlas_audit'
$env:MYSQL_PASSWORD='synthetic-local-test-only'
$env:MYSQL_DATABASE='atlas_estoque_teste'
$env:MYSQL_SSL='false'
npm ci
npm run build
npm run prisma:deploy
npm run test:cov
```

`npm test` executa somente unitários; `npm run test:integration` somente MySQL/HTTP; `npm run test:cov` reúne ambos e gera `coverage/lcov.info`. O processo HTTP compilado dos testes usa a porta 13317 e é encerrado pela fixture. Não execute integração e E2E simultaneamente, pois compartilham essa porta.

Para Playwright, preserve as variáveis anteriores e, em `frontend`:

```powershell
npm ci
npx playwright install chromium
$env:VITE_API_URL='http://127.0.0.1:13317/api'
$env:NODE_ENV='production'
npm run build
$env:NODE_ENV='test'
$env:JWT_ACCESS_SECRET='synthetic-e2e-access-secret-atlas-only'
npm run typecheck:e2e
npm run test:e2e
```

Cada cenário de navegador usa um IP sintético de documentação com proxy loopback explicitamente confiável no servidor de teste. Isso isola os limitadores entre cenários; os limites reais permanecem nos testes HTTP de abuso. Relatórios, screenshots e traces ficam ignorados.

`backend/scripts/verify-upgrade.cjs` exige outro schema vazio, `atlas_upgrade_test`, na mesma porta descartável. Aplica as seis migrations anteriores, insere dados em 18 tabelas, aplica as novas e compara cada campo preservado. O script não apaga nem limpa bancos automaticamente. `npm run test:upgrade` executa esse verificador.

Após terminar os testes e conferir o rótulo do container:

```bash
docker inspect --format '{{index .Config.Labels "atlas.purpose"}}' atlas-refinamento-test
docker rm -f atlas-refinamento-test
```

Esse comando remove exclusivamente o container descartável nomeado; não usa volumes do MySQL compartilhado.
