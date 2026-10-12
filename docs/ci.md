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

1. Em SonarCloud, avatar → My account → Access Tokens → Personal Tokens, gerar um token da conta com Execute Analysis nesse projeto (Administration → Permissions). A conta que configura o projeto precisa de Administer para alterar suas configurações. Em [Secrets de Actions](https://github.com/BevilacquaJulio/atlas_stock_novo/settings/secrets/actions), cadastrar o valor como `SONAR_TOKEN`. Não versionar nem enviar o valor pelo chat.
2. No [projeto SonarCloud](https://sonarcloud.io/dashboard?id=BevilacquaJulio_atlas_stock_novo), em Administration → Analysis Method, desativar Automatic Analysis antes do primeiro scan de CI. Análise automática não consome o LCOV enviado pelo workflow.
3. Na seção Quality Gate do projeto, desativar “Ignore duplication and coverage on small changes”. O workflow resolve `legacyId` pela API v2 `/projects/projects` e exige `ignoreSmallChanges=false` em `/quality-gates/settings`, com `resourceType=PROJECT`. Esse endpoint de configurações usa o ID legado também usado pela interface, e não o UUID v4 do campo `id`. A chave legada `sonar.qualitygate.ignoreSmallChanges` não representa essa configuração do Cloud.
4. Manter uma condição `new_coverage < 80` (ou mais rigorosa). O gate atual “Sonar way” tem 80%, confirmado pela API. O workflow também confere a condição antes de analisar.
5. Confirmar análise de PR e comparação com `main`. O gate não calculado não significa aprovação; o scanner aguarda o resultado.

Nenhuma variable GitHub é exigida; projeto e organização estão versionados.
O workflow valida a autenticação antes de consultar configurações. Token
rejeitado exige conferir valor, expiração e região; HTTP 403 na consulta
`/quality-gates/settings` exige conferir o ID legado e as permissões da conta
que emitiu o token. A consulta ao projeto público sozinha não comprova essas permissões.
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

Um worker, com retries desativados, mantém as falhas visíveis. Cada teste cria fixtures próprias,
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
outras proteções. YAML sozinho não ativa proteção. Em 08/10/2026, o ruleset
foi aplicado e confirmado como ativo, ID `24695879`, sem bypass. O PR passou
de `UNSTABLE` para `BLOCKED` após essa configuração.

## Validação inicial e pendências

Local: actionlint 1.7.12 validou os dois workflows; o ZIP oficial foi verificado
por SHA-256 antes de executar. API: lint, tipos e 44 testes aprovados, LCOV
real com **17,98%** de linhas. Frontend: 13 testes, tipos e build aprovados;
LCOV com **5,49%** de linhas. Lint frontend tem dois avisos anteriores, zero
erros. O coverage provider tem a mesma versão do Vitest existente (3.2.7).

Auditoria de produção inicial em 08/10/2026: backend tinha 17 entradas
(1 crítica, 10 altas e 6 moderadas); frontend tinha 3 altas. Incluíam dependências
transitivas/metavulnerabilidades. O check falha enquanto houver High ou
Critical. Naquela etapa, as dependências de produção ainda não haviam sido
atualizadas. O pacote `prisma`, embora declarado dev, aparece
no grafo auditado devido a relações de dependências; não será ignorado.

### Correção das auditorias de produção

Os lockfiles foram atualizados e `npm audit --omit=dev --audit-level=high`
passou com zero vulnerabilidades nas duas aplicações. Axios está em 1.20.0,
React Router em 7.18.4 e Prisma CLI/Client/adapter em 7.10.0. O limiar da CI
permanece inalterado; `CI Required` continua exigindo sucesso das auditorias.

Os overrides em `backend/package.json` corrigem versões transitivas fixadas
pelos pacotes de origem: `mariadb` 3.5.4 no adapter, `mysql2` 3.24.5 na CLI,
`deepmerge-ts` 8.0.2 no config e `js-yaml` 5.4.1 no Swagger. Reavaliar esses
overrides quando os respectivos pacotes adotarem versões corrigidas.
O [deepmerge-ts 8](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0)
altera a mesclagem de Maps; a configuração Prisma deste projeto usa objetos
simples, e o carregamento da configuração e a geração do cliente foram testados.

Validação local após `npm ci`: lint, tipos, build e testes com cobertura nas
duas aplicações. Integração MySQL e E2E devem rodar novamente na CI após o
envio das alterações; o Docker local está indisponível. A auditoria citada
cobre produção, não significa ausência de alertas em dependências de desenvolvimento.

Na inspeção inicial não havia `SONAR_TOKEN`, proteção de main ou default
setup CodeQL. Sonar automático existia. Integração Sonar via Actions e a
configuração de mudanças pequenas precisam de acesso externo. Docker local
está desligado; os testes de banco e navegador usam os runners hospedados.
CI não será considerada totalmente validada nem o PR mesclado se seus
critérios obrigatórios continuarem pendentes.

O [PR #7](https://github.com/BevilacquaJulio/atlas_stock_novo/pull/7) executou
os workflows no GitHub. Na [primeira execução](https://github.com/BevilacquaJulio/atlas_stock_novo/actions/runs/37723042803),
backend e frontend aprovaram lint, tipos, builds, 44 testes unitários de API,
24 testes HTTP/MySQL e 13 testes de frontend. As cinco migrations foram
aplicadas no banco vazio. Os quatro artefatos de build/LCOV foram produzidos
e os builds foram consumidos pelo E2E.

O [CodeQL](https://github.com/BevilacquaJulio/atlas_stock_novo/actions/runs/37723043025)
concluiu sem erro ou warning de processamento; a API de code scanning
confirmou zero alertas abertos em `refs/pull/7/merge`. A auditoria reproduziu
as 17 entradas de backend e 3 altas de frontend. Sonar via CI falhou por
`SONAR_TOKEN` ausente. O agregador `CI Required` reprovou corretamente.
A primeira execução E2E expôs seletores incorretos dos novos testes; foram
ajustados às rotas, botões, listboxes e abas existentes. A
[execução da revisão 7081088](https://github.com/BevilacquaJulio/atlas_stock_novo/actions/runs/37727264481)
aprovou os 87 testes, incluindo as seis jornadas E2E sem retries ou casos
ignorados. Após cadastrar o token, a consulta das configurações do Quality
Gate retornou HTTP 403. A consulta enviava o UUID v4 a um endpoint que exige
o ID legado; foi corrigida para usar `legacyId`. Essa falha não foi convertida
em aprovação nem o check removido.

### Cobertura após o merge do PR #7

A execução `37731226803` na main reprovou somente o Quality Gate: cobertura
de código novo em 47,9%, contra 80% exigidos. O período `previous_version`
começa em 07/10/2026 às 18h08 (America/Sao_Paulo). No PR não havia linhas
novas sujeitas à cobertura; na main eram 779 linhas e 85 condições.

Foram acrescentados 67 testes de backend para contratos de entrada, respostas
de erro sem dados sensíveis, pipeline HTTP, logs, renovação/revogação de sessão,
transições de compras e alterações financeiras condicionadas ao estado atual.
Os testes HTTP usam Nest/Express e Supertest com a função real `configureApp`.
Os testes unitários de repositório verificam os predicados das alterações;
os testes MySQL existentes continuam responsáveis por concorrência e rollback reais.

Validação local: 111 testes aprovados com cobertura, lint e tipos aprovados.
O LCOV local, cruzado com as linhas novas retornadas pela API do SonarCloud,
estima 83,2% (765/919 linhas e condições cobertas). O mesmo cálculo aplicado
à análise anterior reproduz 47,9% (414/864). O denominador pode mudar porque
o V8 passa a reportar mais condições quando os arquivos são exercitados.
A confirmação oficial depende da próxima análise da main pelo SonarCloud.
O limiar, o período de código novo e as exclusões de cobertura não foram alterados.

Para validar os novos testes, em `backend`:

```bash
npm run typecheck:ci
npm run lint:ci
npm run test:cov
```

Mudanças exclusivamente em testes não exigem migrations ou deploy.

Fontes oficiais consultadas:
[GitHub merge protection](https://docs.github.com/en/code-security/concepts/code-scanning/merge-protection),
[SonarCloud com Actions](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/github-actions-for-sonarcloud),
[API do SonarCloud](https://docs.sonarsource.com/sonarqube-cloud/appendices/web-api),
[permissões de projeto](https://docs.sonarsource.com/sonarqube-cloud/managing-your-projects/administering-your-projects/setting-permissions),
[Vitest coverage](https://vitest.dev/guide/coverage.html),
[Playwright web server](https://playwright.dev/docs/test-webserver).
