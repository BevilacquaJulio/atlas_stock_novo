# CI de Pull Requests

Workflows: `.github/workflows/ci.yml` e `.github/workflows/codeql.yml`.
Executam em PR para `main` e em push de `main`, em Ubuntu 24.04 hospedado.
Node 24 acompanha os dois Dockerfiles. Actions fixadas em SHAs consultados
nos repositórios oficiais em 08/10/2026. Sem deploy, publicação de imagem,
atualização automática de dependências, criação de PR ou merge automático.

## Critérios e comandos

| Check | Comandos e condição |
| --- | --- |
| Backend validation | `npm ci`, `npm run prisma:generate`, `npm run lint:ci`, `npm run typecheck:ci`, `npm run test:cov`, `npm run build`, `npm run prisma:deploy`, `npm run test:integration` em backend |
| Frontend validation | `npm ci`, `npm run lint:ci`, `npm run typecheck:ci`, `npm run test:cov`, `npm run build` em frontend |
| Production dependency audit (backend/frontend) | `npm ci --ignore-scripts` e `npm audit --omit=dev --audit-level=high` no respectivo lockfile; falha de consulta também bloqueia |
| Critical flows E2E | Builds dos dois jobs anteriores, migrations em outro MySQL descartável, Chromium instalado; `npm run typecheck:e2e` e `npm run test:e2e` em frontend |
| SonarCloud Quality Gate | LCOV dos dois jobs transferido por artefatos, histórico Git completo, política de código novo verificada e scan aguardando o gate, com timeout de 300 segundos |
| CodeQL analysis | JavaScript/TypeScript, build mode `none`, queries `security-extended`, upload e processamento aguardados |
| CI Required | Sempre avalia os cinco jobs obrigatórios; só aprova se todos terminarem com `success` |

`lint:ci` não corrige fontes automaticamente. `typecheck:ci` é separado do
build e a API inclui tipos dos testes. O E2E checa tipos após receber os
declarations do build da API; o frontend unitário não precisa instalar a API.
Instalações são reproduzíveis pelos lockfiles; o cache contém o armazenamento
npm, nunca `node_modules`. Não há `continue-on-error` ou tolerância a ausência
de testes. Os jobs têm timeout, concurrency e artefatos com retenção limitada.

## Cobertura e SonarCloud

Projeto existente: `BevilacquaJulio_atlas_stock_novo`.
Organização existente: `bevilacquajulio`. Não há chave de projeto inventada.

`sonar-project.properties` analisa os fontes reais `backend/src` e
`frontend/src`. Testes e declarações de tipos são classificados separadamente;
nenhum serviço, componente, controller ou repository é excluído para inflar
cobertura. Vitest gera LCOV inclusive para arquivos não executados. O job
Sonar prefixa os caminhos `SF:` com cada aplicação para resolver o monorepo.
Os relatórios medem os testes unitários; HTTP/E2E são verificações separadas
e não são contabilizados artificialmente nessa cobertura.

Configuração externa necessária:

1. Em [Secrets de Actions](https://github.com/BevilacquaJulio/atlas_stock_novo/settings/secrets/actions), cadastrar `SONAR_TOKEN` com permissão de análise nesse projeto. Não versionar nem enviar o valor pelo chat.
2. No [projeto SonarCloud](https://sonarcloud.io/dashboard?id=BevilacquaJulio_atlas_stock_novo), em Administration → Analysis Method, desativar Automatic Analysis antes do primeiro scan de CI. Análise automática não consome o LCOV enviado pelo workflow.
3. Em Administration → Quality Gate, desativar “Ignore duplication and coverage on small changes”. O workflow exige a configuração efetiva `sonar.qualitygate.ignoreSmallChanges=false`.
4. Manter uma condição `new_coverage < 80` (ou mais rigorosa). O gate atual “Sonar way” tem 80%, confirmado pela API. O workflow também confere a condição antes de analisar.
5. Confirmar análise de PR e comparação com `main`. O gate não calculado não significa aprovação; o scanner aguarda o resultado.

Nenhuma variable GitHub é exigida; projeto e organização estão versionados.
Forks sem `SONAR_TOKEN` falham explicitamente nesse check. Não se usa
`pull_request_target` para expor o secret ao código do fork. A análise de
Actions só deve começar depois de desligar a análise automática, evitando
duplicação e conflitos entre métodos.

O mínimo é **80% de cobertura no código novo do PR**, e não 80% global no
legado. Este PR adiciona configuração e testes, sem modificar código de
aplicação; cobertura de código novo de aplicação é não aplicável, não 100%.
É responsabilidade do Quality Gate calcular isso para os próximos PRs.

## E2E das funcionalidades críticas

Playwright usa o build da API e o bundle real do frontend, sem mock de rede:

- Login inválido/válido, renovação após reload, logout e troca de perfil.
- Cadastro de cliente: criação, edição e inativação.
- Estoque: entrada, saída e recusa de saída sem saldo.
- Compra: criação, pagamento, recebimento, estorno do recebimento, estorno do pagamento e cancelamento; saldo e despesa conferidos pela API real.
- Projeto: criação com cliente/veículo, status, checklist, consumo de produto e conclusão; saldo conferido.
- Financeiro: senha incorreta/correta, despesa/pagamento, receita/recebimento e limpeza do desbloqueio no logout.

Um worker e nenhum retry mascaram falhas. Cada teste cria fixtures próprias,
remove somente seus registros e usa credenciais sintéticas. O guard recusa
outro banco antes de iniciar os servidores. Não há reset ou acesso à base
de produção. HTML/trace de falha contém apenas dados do ambiente sintético.

Ambiente exato para HTTP e E2E: MySQL 8.4 em `127.0.0.1:13316`, banco
`atlas_audit_test`, usuário `atlas_audit`, `MYSQL_SSL=false`, `NODE_ENV=test`
e `ALLOW_TEST_DATABASE=true`. O CI aplica as migrations versionadas e não
usa `db push`. O segundo job possui seu próprio MySQL e reaplica migrations;
nenhum banco ou `node_modules` é compartilhado entre runners.

E2E exige ainda `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` distintos,
começando por `synthetic-e2e-`, com pelo menos 32 caracteres. API em
`127.0.0.1:13317`; frontend em `127.0.0.1:4173`, com
`VITE_API_URL=http://127.0.0.1:13317/api` no build e CORS exato desse frontend.
Ambas as portas precisam estar livres. O Playwright gerencia e encerra os
processos que criou e não reutiliza servidores existentes.

Para reproduzir, configure esse banco exclusivo e as variáveis acima; então:

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build
cd ../frontend
npm ci
VITE_API_URL=http://127.0.0.1:13317/api npm run build
npx playwright install chromium
npm run typecheck:e2e
npm run test:e2e
```

No PowerShell, definir `$env:VITE_API_URL='http://127.0.0.1:13317/api'` antes
de `npm run build`, em vez do prefixo de variável Bash. Estas instruções não
iniciam um banco: use somente o banco descartável descrito acima.

## Proteção de main e CodeQL

O repositório é público e tem permissão administrativa na conta autenticada.
CodeQL default setup estava `not-configured`; foi escolhido advanced setup,
sem duas análises concorrentes configuradas para a mesma linguagem.

O ruleset revisável `.github/main-ruleset.json` exige PR, resolução de
conversas, base atualizada, `CI Required` e `CodeQL analysis` da GitHub Actions
(app ID 15368, consultado). Bloqueia force push e exclusão de main, sem bypass.
Não exige aprovação pelo próprio autor: o projeto é solo.

A regra `code_scanning` exige CodeQL com limiar de segurança High/Critical.
Job CodeQL verde sozinho não garante ausência de alertas. Não há merge queue
configurada. A proteção nativa do GitHub só cobre alertas cujas linhas estejam
no diff e não cobre merge groups; antes de adotar merge queue será necessário
incluir `merge_group` e bloqueio equivalente para essa fila. Alertas existentes
fora do diff precisam de triagem separada na aba Security.

Aplicação exata, com conta administrativa, depois de revisar o JSON:

```bash
gh api --method POST repos/BevilacquaJulio/atlas_stock_novo/rulesets --input .github/main-ruleset.json
```

Se já houver um ruleset com esse nome, obter seu ID e usar `PUT` no endpoint
`repos/BevilacquaJulio/atlas_stock_novo/rulesets/ID`; não duplicar nem apagar
outras proteções. YAML sozinho não ativa proteção. O estado de aplicação e os
resultados remotos serão registrados na entrega do PR.

## Validação inicial e pendências

Local: actionlint 1.7.12 validou os dois workflows; o ZIP oficial foi verificado
por SHA-256 antes de executar. API: lint, tipos e 44 testes aprovados, LCOV
real com **17,98%** de linhas. Frontend: 13 testes, tipos e build aprovados;
LCOV com **5,49%** de linhas. Lint frontend tem dois avisos anteriores, zero
erros. O coverage provider tem a mesma versão do Vitest existente (3.2.7).

Auditoria de produção consultada em 08/10/2026: backend tem 17 entradas
(1 crítica, 10 altas e 6 moderadas); frontend tem 3 altas. Incluem dependências
transitivas/metavulnerabilidades. O check vai falhar enquanto houver High ou
Critical. Não foram atualizadas dependências de produção nem rebaixado Prisma
para 6 para contornar o audit. O pacote `prisma`, embora declarado dev, aparece
no grafo auditado devido a relações de dependências; não será ignorado.

Na inspeção inicial não havia `SONAR_TOKEN`, proteção de main ou default
setup CodeQL. Sonar automático existia. Integração Sonar via Actions e a
configuração de mudanças pequenas precisam de acesso externo. Docker local
está desligado; testes MySQL e E2E serão validados nos runners, antes de
declarar os checks aprovados. CI não será considerada totalmente validada nem
o PR mesclado se seus critérios obrigatórios continuarem pendentes.

Fontes oficiais consultadas:
[GitHub merge protection](https://docs.github.com/en/code-security/concepts/code-scanning/merge-protection),
[SonarCloud com Actions](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/github-actions-for-sonarcloud),
[Vitest coverage](https://vitest.dev/guide/coverage.html),
[Playwright web server](https://playwright.dev/docs/test-webserver).
