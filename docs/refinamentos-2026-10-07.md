# Auditoria e refinamentos — Atlas Stock

Data: 07/10/2026. Base: `7f3e8b2ccadc1dd37166f4c4116128a33307f47d` (`main`).

## Escopo e execução

Revisão do NestJS/Prisma/MySQL, React/Vite, autenticação, guardas, DTOs,
cadastros, compras, movimentações, projetos, financeiro, dependências,
Dockerfiles, Compose e Nginx. O sistema usa um banco global de uma empresa;
não há modelo de tenant. A ausência de tenant não foi classificada como IDOR
sem uma regra de produto que exija múltiplas empresas.

Alterações, branches por implementação, commits, pushes, PRs e merges foram
autorizados. As branches são encadeadas e integradas sequencialmente em `main`
por merge commit. Não houve deploy ou alteração de dados de produção.
Os dois últimos tópicos ficam deliberadamente para discussão conjunta.

Os achados abaixo são confirmados por inspeção, salvo indicação explícita.
A gravidade expressa impacto e condições; confiança é alta para caminhos
diretos do código. Não foram inspecionados VPS, firewall, credenciais reais,
backups ou imagens de produção. Não há garantia de ausência de outras falhas.

## Plano de implementação

| Ordem | Tema | Gravidade | Branch | Estado |
| --- | --- | --- | --- | --- |
| 1 | Credenciais públicas e dados demo | Alta | `feat/remover-credenciais-demo` | Implementado; testes e builds aprovados |
| 2 | Validação de identidade e rotação de tokens | Alta | `feat/endurecer-autenticacao` | Implementado; MySQL, testes e build aprovados |
| 3 | Concorrência de estoque, compras e projetos | Alta | `feat/transacoes-estoque-compras` | Implementado; MySQL, testes e build aprovados |
| 4 | Consistência dos pagamentos financeiros | Alta | `feat/consistencia-financeiro` | Implementado; MySQL, testes e builds aprovados |
| 5 | Isolamento das sessões no frontend | Alta | `feat/isolar-sessoes-frontend` | Implementado; 13 testes, lint e build aprovados |
| 6 | Limites de entrada, logs e configuração HTTP | Média/alta | `feat/validacao-http-segura` | Implementado; HTTP/MySQL, tipos, lint e builds aprovados |
| 7 | Evolução de sessão, permissões e regras de produto | Alta | A definir juntos | **Reservado** |
| 8 | Dependências, infraestrutura e qualidade de entrega | Alta | A definir juntos | **Reservado** |

## 1. Credenciais públicas e dados demo

**Evidência:** `docker-compose.yml` fornece usuário e senha demo como build
args; `frontend/Dockerfile`, `src/lib/demo-auth.ts` e `LoginPage.tsx` incorporam
esses dados no JavaScript público. `.env.example` também sugere senhas fixas.
`backend/prisma/populate.ts:106` cria administrador com fallback previsível;
`main()` aceita executar/resetar dados demo sem distinguir produção.

**Impacto:** qualquer visitante lê a credencial embutida; se coincidir com uma
conta ativa, acessa o sistema. O populate pode criar contas previsíveis ou
alterar registros reais que coincidam com identificadores de demonstração.
Não foi testado se essas credenciais existem em produção.

**Ação:** remover a função demo e seus build args; exemplos sem senhas reais;
populate restrito a desenvolvimento/teste, opt-in explícito e credencial
administrativa obrigatória. Rotacionar manualmente contas caso a credencial
publicada tenha sido utilizada; a remoção não apaga bundles/histórico antigos.

**Regressão:** build do frontend sem identificadores demo; login comum continua
funcionando; guardas do populate rejeitam produção/configuração incompleta
antes de abrir conexão. Rebuild de `app`; API apenas se scripts forem usados.

## 2. Validação de identidade e rotação de tokens

**Evidência:** `jwt-auth.guard.ts:51` confia em cargo/estado do JWT sem buscar
usuário ativo; aceita qualquer payload assinado com a chave access, inclusive
o JWT de desbloqueio financeiro. Não valida propósito, issuer/audience ou
algoritmo explícito. `auth.service.ts:49` lê/revoga refresh em operações
separadas, permitindo duas rotações. Bcrypt recebe JWT completo, apesar do
limite de 72 bytes; um token já revogado retorna antes de detectar reuso.
`env.validation.ts` aceita segredos iguais e durações arbitrárias.

**Impacto:** conta desativada/permissão removida mantém acesso até expiração;
JWT de outra finalidade cruza o limite de autenticação; requisições
concorrentes podem gerar dois sucessores; hash não representa o token inteiro.
Não há prova de falsificação de assinatura ou quebra criptográfica.

**Ação:** HS256/issuer/audience/propósito explícitos, identidade atual do banco,
segredos fortes/distintos, expiração bounded; digest SHA-256 do refresh;
consumo e emissão dentro de transação; reuso revoga sessões desse usuário.
Tokens anteriores exigirão novo login, sem alterar schema.

**Regressão:** tokens financeiros/refresh não autenticarão como access;
usuário inativo é recusado; cargo atual prevalece; só uma rotação concorrente;
reuso e falha de emissão não deixam sucessores indevidos. Rebuild da API.

## 3. Concorrência de estoque, compras e projetos

**Evidência:** `movimentacoes.repository.ts:76` lê saldo e depois grava valor
absoluto sem lock, perdendo updates simultâneos. `compras.service.ts` verifica
status fora da transação; duas confirmações fazem duas entradas. Pagamento,
cancelamento e estornos também podem sobrescrever decisões concorrentes.
`projetos.repository.ts` grava status/histórico sem condicionar ao status
anterior; consumo permite projeto concluído e escopo de produto incompatível.

**Impacto:** estoque divergente do histórico, saldo insuficiente aceito,
recebimento duplicado, status inválido ou histórico enganoso.

**Ação:** serializar movimentações por produto na mesma transação; transições
atômicas de compra com status esperado antes dos efeitos; ordem estável de
locks em compras; status de projeto condicionado; consumo apenas em projeto
ativo e aberto, respeitando produto vinculado. Manter erros de negócio claros.

**Regressão:** duas saídas sobre saldo limitado; duas entradas e custo médio;
dupla confirmação/estorno; rollback em insuficiência; projeto encerrado e
produto de outro projeto recusados sem escrita. Rebuild da API; sem migration.

## 4. Consistência dos pagamentos financeiros

**Evidência:** `financeiro.service.ts:115` paga despesa de compra sem sincronizar
compra; uma despesa CANCELADA passa pelo teste que só verifica PAGO.
Updates de despesas/receitas verificam estado antes de update incondicional.

**Impacto:** compra e despesa mostram estados incompatíveis; despesa cancelada
ressurge como paga; edição concorrente altera valor após quitação.

**Ação:** despesas vinculadas são pagas exclusivamente pelo fluxo de compras;
pagamentos/recebimentos/edições usam predicado de estado esperado no banco.
Evitar oferecer pagamento avulso de despesa de compra na interface.

**Regressão:** CANCELADA e vinculada recusadas; edição depois de quitação
recusada; concorrência permite no máximo uma mudança. Rebuild de API e `app`.

## 5. Isolamento das sessões no frontend

**Evidência:** `AuthContext.tsx` não limpa TanStack Query nem desbloqueio
financeiro no logout/expiração. `api.ts` pode persistir refresh atrasado após
logout/troca de conta; bootstrap chama refresh fora do single-flight e roda
novamente no StrictMode. URLs absolutas recebem Bearer sem validar destino.

**Impacto:** outra sessão pode visualizar dados em cache; resposta atrasada
restaura credenciais antigas; token financeiro persiste na troca de usuário;
futura chamada a destino externo pode receber credencial da API.

**Ação:** cancelar/limpar consultas e desbloqueio em transições; geração de
sessão impede commits de respostas antigas; refresh deduplicado inclusive no
bootstrap; timeout e bloqueio de destino fora da API configurada.

**Regressão:** logout com refresh pendente, troca de usuário, expiração,
StrictMode e destino externo. Rebuild do `app`; contrato refresh preservado.

## 6. Limites de entrada, logs e configuração HTTP

**Evidência:** senha/login/desbloqueio sem máximo, compras/checklist sem limite,
buscas/página sem teto e valores sem faixa/precisão compatível com DECIMAL.
Só há throttle global de 120/min; logs redigem apenas Authorization e podem
registrar o token financeiro. Swagger é público também em produção.
`health/ready` retorna HTTP 200 mesmo com banco indisponível. O runner transpila
testes sem checar tipos; testes unitários não exercitam o bootstrap real.

**Impacto:** operações caras/overflow, truncamento de senha Unicode, exposição
de segredo nos logs, superfície de documentação interna e falsa prontidão.

**Ação:** contratos Zod estritos/bounded, limites numéricos e coleções, política
nova de senha compatível com bcrypt em bytes sem bloquear logins legados,
throttle sensível, logs por allowlist, Swagger só fora de produção,
bootstrap HTTP comum, erros seguros com request ID e readiness 503.
Typecheck explícito inclui os testes; integração executa o build real de
produção, com metadados de DI. A configuração de build existente foi preservada
e validada, sem classificar CommonJS/bundler como falha de compilação confirmada.

**Regressão:** pipeline HTTP real com fixtures sintéticas, payloads grandes/campos
extras, 429, headers e Swagger; schemas e builds. Rebuild da API.

## 7. Reservado: sessão, permissões e regras de produto

Decidir juntos e implementar de forma coordenada:

- Refresh opaco em cookie HttpOnly/Secure com CSRF, migração frontend/API,
  família de sessão e coordenação entre abas. Hoje refresh fica em localStorage;
  exposição por XSS continua mesmo depois das correções do tópico 2.
- MFA/reauth para administrador, recuperação de conta, gestão/revogação de
  sessões, alteração de senha e Argon2id para hashes novos.
- Matriz explícita de roles em compras/projetos/movimentações; hoje muitas
  escritas só exigem login. Definir se senha financeira compartilhada é adequada.
- Dashboard revela totais financeiros sem desbloqueio; definir quais indicadores
  são públicos para cada perfil, incluindo compras e custos de projeto/produto.
- Confirmar uma empresa versus multiempresa, política de acesso horizontal,
  escopo GERAL/PROJETO, cancelamento/estorno de projetos e vínculo veículo/cliente.
- Contrato de dinheiro/quantidade com Decimal em toda operação, arredondamento
  por item/total, custos médios e estornos, timezone, transições permitidas e
  idempotência das criações. Limites de entrada não resolvem arredondamento.
- Constraints/índices/uniqueness para documentos, placas, relações e consultas;
  paginação de históricos e consumos; tratar colisões P2002 com 409.

## 8. Reservado: dependências, infraestrutura e qualidade

Consulta npm audit realizada em 07/10/2026 nos lockfiles, com npm 10.9.2:
backend **27 entradas** (3 críticas, 14 altas, 10 moderadas); frontend
**13 entradas** (2 críticas, 8 altas, 3 moderadas). As contagens incluem
metavulnerabilidades e ferramentas de desenvolvimento; não são 40 exploits
confirmados do aplicativo. O primeiro scan falhou por restrição de rede e foi
reexecutado com acesso permitido. Relatórios brutos ficaram fora do Git.

Triagem e próximos passos:

- Runtime: MariaDB transitivo do adapter afeta autenticação/TLS
  ([advisory](https://github.com/advisories/GHSA-cqhc-2h57-wpxf)); Axios tem
  advisories de adapters/prototype pollution e Router de RSC (RSC não usado).
  Atualizar versões específicas e validar compatibilidade, sem audit fix force
  ou downgrade automático de Prisma para 6 sugerido pelo npm.
- Ferramentas: Vitest/Tinypool recebem classificação crítica/moderada;
  CLI Prisma carrega Hono/mysql2/deepmerge. Não expor servidores de teste/dev.
  Planejar patches/overrides revisados e eventual migração do runner backend.
- Nginx roda root, não aplica CSP/headers no HTML; tags de imagens são mutáveis.
  Definir imagem unprivileged, porta, paths graváveis, cap_drop, limites PID,
  read-only, TLS e fixação/atualização de imagens.
- API/migrate recebem o mesmo `.env`; separar contas DML/DDL e secrets por
  serviço. Exemplo desabilita validação de certificado MySQL; confirmar CA e
  hostname antes de exigir verificação. Isolar redes compartilhadas.
- Habilitar shutdown hooks/stop_grace_period, readiness bounded, orçamento de
  conexões e alertas. Testar imagens finais, não apenas compilação.
- Definir proxies/redes confiáveis antes de usar IP encaminhado pelo Traefik.
  Sem trust proxy, o throttle agrupa clientes pelo IP do proxy; os novos limites
  sensíveis são 10/min no login/desbloqueio e 30/min no refresh. Nunca confiar
  indiscriminadamente em X-Forwarded-For. O teste HTTP usa acesso direto.
- CI começou a ser implementada em 08/10/2026 na branch
  `feat/ci-validacao-prs`, por solicitação posterior. Configuração, E2E,
  critérios e integrações externas estão em [ci.md](ci.md). O restante de
  dependências/infraestrutura continua reservado; nenhum bloqueio de audit
  será omitido para permitir merge.
- Cobertura inicial: 28 testes backend e 4 frontend; não há teste HTTP/MySQL.
  Os testes novos reduzem lacunas, mas não substituem jornadas de navegador,
  HTTPS/Traefik, acessibilidade, erros offline e smoke de produção.
- Lint completo do frontend encerra com zero erros e dois avisos preexistentes
  de dependencies em useEffect de `SelectField.tsx:72` e `SwitchField.tsx:53`.
  Revisar sincronização com React Hook Form e reset; aviso não comprova loop.
- README principal contém `web`, mas serviço real se chama `app`, e cita SQL
  não presente no checkout. Documentação operacional pessoal será mantida em
  `readme-ignored.md`, ignorado por Git, com nomes/comandos reais.
- Definir e testar backups/restauração, rollback, retenção de logs e auditoria
  de ações financeiras/admin. Acesso ao host não foi verificado.

## Validação e entrega

Baseline: Node 22.16.0, npm 10.9.2; Prisma 7.8.0, Vitest 3.2.7.
Dependências instaladas pelos lockfiles com `npm ci --ignore-scripts`.
Testes baseline passam (28 backend/4 frontend) fora da restrição de realpath
do sandbox. Resultado final: **44 testes unitários backend + 24 HTTP/MySQL +
13 frontend = 81 testes aprovados**. Builds backend/frontend, typecheck dos
testes e lint da API aprovados; lint frontend sem erros, com os dois avisos
registrados acima. `git diff --check` aprovado. Sem migrations novas.
Compose validado com `docker compose --env-file .env.example config
--no-env-resolution --quiet`, sem ler arquivos locais de segredos ou subir
serviços. A validação não confirma TLS, redes externas ou deploy.

Tópico 2: 32 testes unitários, 4 cenários reais em MySQL 8.4 descartável
(`127.0.0.1:13316/atlas_audit_test`), lint dos arquivos de autenticação e build
aprovados. Migrations existentes aplicadas somente nesse banco sintético.
Os testes cobrem concorrência refresh/logout, reuso, rollback, propósito JWT,
desativação e cargo atual. Login antigo exige reautenticação após deploy.
Sem famílias de sessão, reuso revoga todas as sessões do usuário; logout de
token já rotacionado também revoga todas para encerrar uma renovação concorrente.
Coordenação entre abas e revogação por família continuam no tópico 7.

Tópico 3: 34 testes unitários e 10 testes MySQL (6 de estoque/compras/projetos,
4 de autenticação), lint das alterações e build aprovados. Predicados de
status são avaliados no update dentro da transação; SELECT FOR UPDATE
parametrizado lê o saldo corrente. As compras adquirem locks de produto na
ordem de ID. Sem migrations novas. Retry de deadlock, idempotência de criação
e contabilidade Decimal completa permanecem nos tópicos reservados.

Tópico 4: 6 testes unitários financeiros e 4 cenários MySQL aprovados; lint
dos arquivos alterados e builds backend/frontend aprovados. Pagamento e
recebimento usam updateMany condicionado em transação, com leitura do resultado
na mesma transação. Cancelamento/vínculo com compra e valores quitados são
protegidos também no banco; nenhuma migration nova.

Tópico 5: 13 testes frontend, lint dos arquivos alterados e build aprovados.
Testes do cliente exercitam Axios/interceptors com adapter sintético, sem
acesso a serviços externos. Cobrem single-flight, dois 401, refresh/resposta
atrasada, limpeza imediata no logout/expiração e bloqueio de URLs externas.
Testes do provider comprovam remoção de cache/desbloqueio na troca de conta.
O refresh segue em localStorage até a evolução conjunta do tópico 7.

Tópico 1: 2 testes dos guardas de populate, 4 testes de login e builds de
backend/frontend aprovados. Nenhuma conexão de banco foi aberta pelo populate.

Tópico 6: schemas estritos recusam campos extras; compras e checklist aceitam
até 100 itens, busca até 200 caracteres e página até 100.000. IDs positivos
cabem em INT; valores/quantidades respeitam DECIMAL(12,2)/(12,3), incluindo
totais e overflow de saldo dentro da transação. Senhas novas/seed exigem
12 caracteres e no máximo 72 bytes UTF-8; login legado continua aceito.
Os corpos têm teto explícito de 100 KB. CORS exige origens exatas;
documentação Swagger fica fora de produção. Logs omitem headers, cookies,
query, corpo e mensagens internas de erro, com correlação por UUID.

Os 9 testes HTTP executam `dist/src/main.js` em NODE_ENV=production contra
o MySQL descartável, incluindo guards, pipes, filtros, parsers, CORS, Helmet,
throttle e logs reais. Verificam também cadastro válido, rollback e ocultação
de Prisma/SQL em falha interna. Os 15 outros testes MySQL comprovam rotação,
concorrência e consistência financeira. Fixtures são removidas por seus IDs;
nunca executam reset. O banco e o processo de API usados são exclusivos da
validação. API real de produção, HTTPS e imagens finais não foram testados.

## Entregas por implementação

| Tópico | PR | Commit de implementação |
| --- | --- | --- |
| 1 | [Remove credenciais públicas](https://github.com/BevilacquaJulio/atlas_stock_novo/pull/1) | `6fe4c43` |
| 2 | [Corrige validação e rotação de tokens](https://github.com/BevilacquaJulio/atlas_stock_novo/pull/2) | `180016a` |
| 3 | [Preserva estoque e status](https://github.com/BevilacquaJulio/atlas_stock_novo/pull/3) | `7939b58` |
| 4 | [Corrige pagamentos e recebimentos](https://github.com/BevilacquaJulio/atlas_stock_novo/pull/4) | `d5e4ccb`, `2aba9bb` |
| 5 | [Isola sessões e cache](https://github.com/BevilacquaJulio/atlas_stock_novo/pull/5) | `0d6df08` |
| 6 | [Reforça validação, limites HTTP e logs](https://github.com/BevilacquaJulio/atlas_stock_novo/pull/6) | `ffaace5` |

PRs publicados pela conta autenticada `BevilacquaJulio`, com títulos e
descrições normais e commits atribuídos a Julio. Os tópicos 7 e 8 continuam
reservados; não há implementação parcial nem migrations desses tópicos.

Referências primárias consultadas:
[bcrypt e limite de 72 bytes](https://github.com/dcodeIO/bcrypt.js#security-considerations),
[throttling NestJS](https://docs.nestjs.com/security/rate-limiting),
[transações Prisma](https://www.prisma.io/docs/orm/fundamentals/transactions).
