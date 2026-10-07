# Auditoria e refinamentos — Atlas Stock

Data: 07/10/2026. Base: `7f3e8b2ccadc1dd37166f4c4116128a33307f47d` (`main`).

## Escopo e execução

Revisão do NestJS/Prisma/MySQL, React/Vite, autenticação, guardas, DTOs,
cadastros, compras, movimentações, projetos, financeiro, dependências,
Dockerfiles, Compose e Nginx. O sistema usa um banco global de uma empresa;
não há modelo de tenant. A ausência de tenant não foi classificada como IDOR
sem uma regra de produto que exija múltiplas empresas.

O usuário autorizou alterações, branches por implementação, commits e pushes.
As branches são encadeadas: cada uma parte da anterior; a última contém todo
o trabalho. Não há autorização de deploy ou alteração de dados de produção.
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
| 5 | Isolamento das sessões no frontend | Alta | `feat/isolar-sessoes-frontend` | Planejado |
| 6 | Limites de entrada, logs e configuração HTTP | Média/alta | `feat/validacao-http-segura` | Planejado |
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
`tsconfig.json` combina CommonJS e resolução bundler; o build existente passa,
mas a configuração deve ser mantida coerente com a execução Node e seus testes.

**Impacto:** operações caras/overflow, truncamento de senha Unicode, exposição
de segredo nos logs, superfície de documentação interna e build não confiável.

**Ação:** contratos Zod estritos/bounded, limites numéricos e coleções, política
nova de senha compatível com bcrypt em bytes sem bloquear logins legados,
throttle sensível, redaction de headers, Swagger só fora de produção,
bootstrap HTTP compartilhado com testes e configuração TypeScript coerente.

**Regressão:** pipeline HTTP real com fixtures/stubs, payloads grandes/campos
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
- Não existe workflow CI versionado. Adicionar lint sem --fix, typecheck,
  testes HTTP/MySQL, build, análise de dependências e proteção de branch.
- Cobertura inicial: 28 testes backend e 4 frontend; não há teste HTTP/MySQL.
  Os testes novos reduzem lacunas, mas não substituem jornadas de navegador,
  HTTPS/Traefik, acessibilidade, erros offline e smoke de produção.
- README principal contém `web`, mas serviço real se chama `app`, e cita SQL
  não presente no checkout. Documentação operacional pessoal será mantida em
  `readme-ignored.md`, ignorado por Git, com nomes/comandos reais.
- Definir e testar backups/restauração, rollback, retenção de logs e auditoria
  de ações financeiras/admin. Acesso ao host não foi verificado.

## Validação e entrega

Baseline: Node 22.16.0, npm 10.9.2; Prisma 7.8.0, Vitest 3.2.7.
Dependências instaladas pelos lockfiles com `npm ci --ignore-scripts`.
Testes baseline passam (28 backend/4 frontend) fora da restrição de realpath
do sandbox. Resultados finais, commits e limitações serão acrescentados aqui.

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

Tópico 1: 2 testes dos guardas de populate, 4 testes de login e builds de
backend/frontend aprovados. Nenhuma conexão de banco foi aberta pelo populate.

Referências primárias consultadas:
[bcrypt e limite de 72 bytes](https://github.com/dcodeIO/bcrypt.js#security-considerations),
[throttling NestJS](https://docs.nestjs.com/security/rate-limiting),
[transações Prisma](https://www.prisma.io/docs/orm/fundamentals/transactions).
