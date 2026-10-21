# Plano de refinamento e segurança — Atlas Stock

Data: 11/10/2026. Base examinada: `c02a370`, branch `fix/cobertura-main`.
Estado original: planejamento em 11/10/2026. Implementação e evidências atualizadas em [refinamento de 15/10/2026](refinamento-2026-10-15.md). As correções de autorização financeira (PR #9) e estorno (PR #10) já foram integradas. As novas migrations foram testadas somente em MySQL descartável; nenhuma ação no banco real ou deploy foi executada.

## Objetivo e critérios gerais

Este documento preserva o plano original. A política posterior removeu MFA dos fluxos e da API; os itens de MFA abaixo foram retirados do escopo por essa decisão, conforme [ajustes posteriores](refinamento-2026-10-15.md#ajustes-posteriores-solicitados-pelo-usuário).

Tornar o sistema consistente, com acesso controlado, dados íntegros, execução reproduzível e uma rotina de verificação de segurança. O resultado será medido por regras e testes explícitos, sem promessa de ausência universal de vulnerabilidades.

O escopo inclui backend NestJS/Prisma/MySQL, frontend React, autenticação, autorização, cadastros, compras, estoque, projetos, financeiro, Docker/Nginx/Traefik, dependências, CI, documentação e recuperação de dados.

Cada etapa deve entregar mudança revisável, regressões pertinentes, documentação e efeitos de implantação. Não marcar um controle como aprovado se sua verificação não foi executada. Registrar achados como confirmado, suspeita, não verificado, corrigido ou retestado, com impacto e confiança separados.

## Situação inicial

### Controles que já existem

- JWT com algoritmo, emissor, audiência, finalidade e duração verificados.
- Consulta ao usuário ativo e cargo atual em requisições autenticadas.
- Senhas com bcrypt de custo 10 e respostas públicas de usuários sem hash.
- Rotação transacional e digest SHA-256 dos refresh tokens no banco.
- Guards globais, regras de cargo em algumas operações e desbloqueio financeiro.
- Schemas Zod, limites de entrada, logs com seleção de campos e erros centralizados.
- Transações e bloqueios para estoque e mudanças condicionadas de status.
- CI com tipos, lint, builds, testes, integração MySQL, E2E, auditoria e CodeQL/SonarCloud.

### Pontos que orientam o plano

| Tema                                 | Evidência local                                                                                   | Tratamento                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Autorização financeira inconsistente | Pagamento, estorno e cancelamento em compras não exigem a proteção aplicada em financeiro         | Prioridade alta; definir matriz e fechar todos os caminhos                |
| Estorno de custo médio               | Estorno usa saída comum e preserva custo médio; caso sem operações intermediárias foi reproduzido | Prioridade alta; correção contábil e regressão                            |
| Refresh no localStorage              | Credencial de renovação acessível a scripts da origem                                             | Evoluir sessão; não houve exploração XSS demonstrada                      |
| Renovação entre abas                 | Coordenação atual existe somente no contexto de uma aba                                           | Reproduzir e corrigir concorrência legítima preservando detecção de reuso |
| IP atrás do proxy                    | Não há trust proxy configurado e o limitador usa req.ip                                           | Testar pela topologia real e ajustar confiança restrita                   |
| Seletores com 100 opções             | Formulários não consultam páginas seguintes                                                       | Corrigir busca remota/paginação                                           |
| Banco parcialmente em inglês         | refresh_tokens, datas em inglês e nomes compostos inconsistentes                                  | Padronizar domínio em português por migrations                            |
| Documentação divergente              | README usa web, SQL ausente e Swagger em produção                                                 | Alinhar às configurações reais                                            |

O ambiente publicado, firewall, usuários MySQL, backups, imagens e estado atual dos checks no GitHub não foram examinados. Integração MySQL/E2E não foi executada nesta sessão. Os 111 testes locais de backend e 13 de frontend, tipos e builds passaram na análise anterior do mesmo commit; isso não valida os novos controles planejados.

## Decisões de produto a fechar na primeira etapa

1. Confirmar se permanece uma empresa por instalação. Essa é a premissa atual. Se houver múltiplas empresas, o isolamento por empresa deve preceder a liberação desse uso e cobrir tabelas, relacionamentos, índices, consultas, agregações e caches.
2. Confirmar ações de administrador, gerente e operador. Usar a matriz abaixo como proposta inicial, e registrar as exceções antes de alterar permissões reais.
3. Substituir a senha financeira compartilhada por acesso nominal e, nas ações críticas, reautenticação do próprio usuário. Compartilhar uma senha não concede uma permissão que o usuário não possui.
4. Definir regras de custo médio, estorno após consumo, arredondamento, datas e fechamento/reabertura de projetos.
5. Para implantação, determinar se há dados existentes e a tolerância a indisponibilidade. O plano assume preservação dos dados e não depende de banco vazio.

### Matriz inicial proposta

| Operação                                                 | Administrador                                         | Gerente                              | Operador                                |
| -------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| Gerenciar usuários, cargos, permissões e configurações   | Permitido com proteção de ações críticas              | Negado                               | Negado                                  |
| Consultar cadastros operacionais necessários ao trabalho | Permitido                                             | Permitido                            | Permitido no escopo definido            |
| Criar/editar cadastros                                   | Permitido                                             | Permitido                            | Somente ações explicitamente atribuídas |
| Inativar registros                                       | Permitido                                             | Permitido conforme domínio           | Negado por padrão                       |
| Exclusão física                                          | Exceção auditada, condicionada às relações e retenção | Negado                               | Negado                                  |
| Operar projetos, checklist e consumo                     | Permitido                                             | Permitido                            | Conforme permissão e escopo operacional |
| Registrar movimentações de estoque                       | Permitido                                             | Permitido                            | Somente se autorizado                   |
| Consultar valores financeiros e totais do dashboard      | Permitido                                             | Exige permissão financeira explícita | Negado por padrão                       |
| Pagar, receber, cancelar e estornar efeitos financeiros  | Exige permissão e proteção da ação                    | Exige permissão financeira explícita | Negado por padrão                       |

O compartilhamento de registros da mesma empresa pode ser legítimo. Não tratar toda consulta a registro criado por outro usuário como indevida: testar segundo a regra de escopo documentada.

## Etapa 1 — Auditoria completa e ambiente de validação

**Prioridade:** alta. **Dependência:** nenhuma.

- Inventariar cada endpoint, entrada, recurso, campo sensível, cargo e efeito no banco.
- Criar contas e dados sintéticos para anônimo, administrador, gerente e operadores com permissões diferentes.
- Usar MySQL isolado e validar os guardas existentes antes de migrations ou limpeza. Alinhar fixtures, CI e nomes quando o banco de testes for padronizado.
- Revisar arquivos atuais, histórico Git, exclusões de build, bundles, logs e imagens para exposição de segredos, sem imprimir valores.
- Atualizar a análise de dependências runtime/development e imagens; avaliar aplicabilidade dos alertas.
- Aplicar scanners adequados, quando disponíveis: Gitleaks, análise estática com CodeQL/Semgrep e análise de imagem com Trivy. Testes HTTP e navegador serão dirigidos ao ambiente sintético; ZAP só com alvos e limites explícitos.
- Registrar ferramenta, versão, base, escopo, falhas de execução e evidências mínimas mascaradas.
- Revisar uploads, webhooks e integrações externas apenas onde existirem caminhos aplicáveis.

**Entrega:** inventário, matriz de autorização final, relatório priorizado e cenários que reproduzem as falhas confirmadas.

**Aceite:** controles aplicáveis mapeados; cada achado possui efeito, evidência, ação e regressão. Scanner indisponível não significa aprovação.

## Etapa 2 — RBAC e proteção de consultas

**Prioridade:** alta. **Dependência:** matriz da etapa 1.

- Declarar permissão de cada operação; ausência de regra não pode liberar uma rota protegida. Manter exceções públicas explícitas e mínimas.
- Aplicar autorização no servidor em leitura, escrita, listas, detalhes, contagens, dashboard, exportações e operações em lote quando existirem.
- Definir permissões de domínio como `compras.pagar`, `compras.estornar`, `financeiro.visualizar`, `estoque.movimentar` e `usuarios.gerenciar`; implementar somente a flexibilidade necessária ao produto.
- Fechar o caminho alternativo por compras e proteger totais financeiros no dashboard segundo a mesma política.
- Derivar identidade, cargo, permissões e escopo do servidor, nunca de campos enviados pelo cliente.
- Limitar consultas e relacionamentos ao escopo aplicável. Verificar cadeia cliente/veículo/projeto, projeto/item e projeto/produto, inclusive nas alterações concorrentes.
- Definir projeções públicas explícitas; hashes, resumos de tokens e campos internos não saem da API.
- Proteger alteração de cargo/permissão e evitar desativar o último administrador habilitado.
- Registrar ator e motivo de pagamentos, estornos e ações administrativas. Não confiar em esconder botões como autorização.

**Aceite:** testes HTTP de acesso permitido/negado por perfil; tentativas de elevar cargo, trocar IDs e acessar ações por caminhos alternativos são recusadas antes de qualquer efeito persistido.

## Etapa 3 — Autenticação, senhas e ciclo de contas

**Prioridade:** alta. **Dependência:** política de contas da etapa 1.

- Centralizar hash/verificação; usar Argon2id para novas senhas com parâmetros medidos no servidor e salt gerado pela biblioteca.
- Preservar verificação bcrypt de contas existentes; atualizar para Argon2id após login bem-sucedido. Não é possível converter hashes sem conhecer a senha.
- Atualizar criação de usuários, seed, troca de senha e recuperação, sem impor a política nova retroativamente ao login legado.
- Preservar limites de bytes relevantes a bcrypt; limitar tamanho e custo de entradas Argon2id para evitar exaustão de recursos.
- Implementar troca da própria senha com autenticação recente, recuperação de uso único/expiração e invalidação de sessões conforme o evento.
- Definir entrega de recuperação: provedor de e-mail ainda não consta do projeto; testar com serviço sintético até a integração ser escolhida. Não registrar links de recuperação em logs públicos.
- Planejar MFA para administradores e usuários com operações financeiras, incluindo proteção de ativação, remoção e recuperação.
- Manter respostas de login/recuperação que não revelem existência de contas.
- Implementar gestão de usuários e sessões na interface, alinhada ao RBAC.

**Aceite:** login bcrypt legado, novo hash Argon2id, migração no login, alteração/recuperação, usuário inativo e proteção de MFA verificados. Senhas e hashes ausentes das respostas, logs e bundles.

Argon2id e compatibilidade bcrypt seguem as orientações de [armazenamento de senhas da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Etapa 4 — Sessões, cookies e segurança no navegador

**Prioridade:** alta. **Dependência:** política de sessões e transição de schema definida.

- Preservar access JWT curto em memória e suas verificações de assinatura, emissor, audiência, finalidade e usuário ativo.
- Migrar refresh para valor opaco aleatório, transmitido apenas em cookie HttpOnly, Secure em produção e com SameSite/path coerentes com as origens reais.
- Armazenar somente o resumo do token aleatório no banco. SHA-256 aqui é para token aleatório de alta entropia; senha humana usa Argon2id.
- Modelar sessão, família, validade, revogação e sucessores para limitar revogação de reuso à família afetada, conforme política definida.
- Incluir vínculo da sessão no access token e verificar sessão revogada para que logout, bloqueio e alteração de senha tenham o efeito definido sobre access tokens ainda não expirados.
- Retirar refresh tokens de JSON, localStorage, sessionStorage e canais de coordenação entre abas.
- Coordenar renovação e logout entre abas com espera limitada e tratamento de aba fechada/resposta perdida, sem desabilitar detecção de reuso.
- Proteger endpoints autenticados por cookie contra CSRF; validar origens, expiração e limpeza dos cookies. Login, refresh e logout entram nos testes pertinentes ao desenho escolhido.
- Preservar descarte de respostas antigas e limpeza de cache/dados privados ao sair ou trocar de conta.
- Aplicar CSP e demais headers ao HTML servido pelo frontend, com política baseada nos recursos efetivamente utilizados.
- Preferir `/api` na mesma origem para simplificar o contrato. Se for mantido subdomínio de API, testar CORS exato, credenciais e cookies nessa topologia.

**Aceite:** navegador real com recarga, expiração, duas abas, logout durante refresh, reuso, troca de conta, CSRF e HTTPS. Atributos de cookie conferidos no tráfego e armazenamento privado sem tokens de renovação.

Cookie HttpOnly reduz leitura do token por JavaScript; proteção contra XSS e CSRF continua necessária. Referência: [gestão de sessões da OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Etapa 5 — Entrada, rate limiting e consultas custosas

**Prioridade:** alta. **Dependência:** origens e proxy conhecidos.

- Revisar todos os schemas de body, params, query e variáveis; manter rejeição de campos extras e mapeamento explícito para persistência.
- Harmonizar formulários com contratos do backend para dinheiro, quantidades, documentos, datas, limites e erros.
- Manter consultas parametrizadas; revisar qualquer SQL bruto e proibir estrutura de consulta/ordenação/projeção arbitrária fornecida pelo usuário.
- Testar SQL injection, XSS e mass assignment nos caminhos aplicáveis, observando efeitos. Aceitar uma string como dado não significa que houve injeção.
- Configurar confiança apenas nos proxies reais; testar cabeçalhos forjados e identificação do cliente através do Traefik.
- Combinar limites por IP, conta normalizada e operação sensível. Usar bloqueio temporário progressivo, sem bloqueio permanente que facilite negar acesso a terceiros.
- Definir estado compartilhado do limitador somente se houver múltiplas instâncias; Redis será incluído apenas se esse desenho exigir.
- Paginar também usuários e consultas auxiliares; limitar resultados, concorrência, duração de buscas e tamanho/profundidade de coleções.
- Revisar índices pelos filtros reais e planos de execução em volume representativo.
- Preservar requestId, erros sem detalhes internos e logs mínimos.

**Aceite:** requisições excessivas recebem 429 segundo as chaves esperadas; usuários distintos não compartilham indevidamente o limite do proxy; entradas inválidas e tentativas de alterar campos privilegiados não produzem efeitos.

## Etapa 6 — Integridade operacional e financeira

**Prioridade:** alta para custo médio; média para melhorias restantes. **Dependência:** regras de produto e autorizações definidas.

- Distinguir estorno de recebimento de saída operacional; corrigir custo médio e valor do estoque.
- Definir como tratar estorno após consumo, outras entradas, custo zero e saldo insuficiente. Preservar lançamentos auditáveis e não apagar o histórico para corrigir saldo.
- Adotar cálculo decimal ou unidades monetárias inteiras com arredondamento documentado; revisar diferenças entre soma de itens e total da compra.
- Ler custos e estado necessários dentro da mesma transação/bloqueio quando a concorrência puder alterar o resultado.
- Revisar duplicidade em criação de compras, despesas, receitas e consumo; definir idempotência para operações cujo reenvio possa duplicar efeitos.
- Revisar vínculos ativos e invariantes em criar/editar clientes, veículos, categorias, produtos e projetos; revalidar relação quando ela puder mudar.
- Revisar exclusão física, referências e cascatas; preferir inativação e preservar registros contábeis/históricos.
- Testar checklist e encerramento de projeto concorrentes, além dos casos de estoque já cobertos.

**Aceite:** o caso 10 unidades a R$ 10 → receber 10 a R$ 20 → estornar sem operações intermediárias termina com 10 unidades e custo médio R$ 10. Cenários concorrentes e repetidos preservam quantidade, custo, totais, estados e histórico.

## Etapa 7 — Banco em português, minúsculo e consistente

**Prioridade:** requisito do refinamento. **Dependência:** inventário do banco real e desenho final de sessões/auditoria.

### Convenção

- Nome proposto do banco principal: `atlas_estoque`, substituindo o atual `g5`.
- Nome proposto do banco isolado de testes: `atlas_estoque_teste`; atualizar os guardas de fixtures, configuração E2E e CI em conjunto.
- Tabelas de domínio em português, plural e `snake_case`, todas inteiramente minúsculas e sem acentos/espaços.
- Colunas de domínio em português e `snake_case`; chaves como `usuario_id`, `cliente_id` e `projeto_id`.
- Datas uniformes: `criado_em`, `atualizado_em`, `expira_em`, `revogado_em`.
- Índices e constraints com nomes coerentes, revisados para os limites do MySQL.
- Models Prisma podem usar PascalCase em português e campos camelCase em português; `@@map`/`@map` controlam o nome físico. Convenção de banco não exige classes TypeScript minúsculas.
- A tabela técnica `_prisma_migrations` é administrada pelo Prisma e permanece com seu nome obrigatório; não é uma tabela de domínio a traduzir.

### Mapeamento inicial de tabelas

| Atual                   | Planejado                  |
| ----------------------- | -------------------------- |
| usuarios                | usuarios                   |
| refresh_tokens          | tokens_renovacao           |
| categorias              | categorias                 |
| produtos                | produtos                   |
| fornecedores            | fornecedores               |
| clientes                | clientes                   |
| veiculos                | veiculos                   |
| movimentacoes           | movimentacoes              |
| compras                 | compras                    |
| compra_itens            | itens_compras              |
| despesas                | despesas                   |
| projetos                | projetos                   |
| projeto_checklist_itens | itens_verificacao_projetos |
| projeto_historico       | historicos_projetos        |
| projeto_consumos        | consumos_projetos          |
| categoria_despesa       | categorias_despesas        |
| receitas                | receitas                   |
| config_sistema          | configuracoes_sistema      |

Novas entidades terão nomes como `sessoes`, `permissoes` e `eventos_auditoria`, apenas se forem necessárias à implementação final. Não confundir migração dos nomes existentes com criação antecipada de uma estrutura de permissões arbitrária.

| Coluna atual | Planejado     |
| ------------ | ------------- |
| created_at   | criado_em     |
| updated_at   | atualizado_em |
| expires_at   | expira_em     |
| revoked_at   | revogado_em   |
| token_hash   | resumo_token  |
| status       | situacao      |

### Migração e preservação

- Criar novas migrations revisadas; não editar as cinco migrations históricas já utilizadas.
- Renomear tabelas/colunas existentes preservando dados; revisar SQL gerado para evitar substituições por DROP/CREATE destrutivos.
- Atualizar consultas SQL brutas, Prisma, fixtures, seed/populate e nomes de índices/relacionamentos na mesma entrega.
- Manter contratos HTTP existentes através de mapeamento explícito, ou versionar alterações necessárias. Tradução física do banco não precisa quebrar a API.
- Se o nome do database mudar de `g5` para `atlas_estoque`, fazer exportação/restauração controlada, ajustar contas/grants e MYSQL_DATABASE. Não assumir que há um comando de renomeação de database MySQL.
- Testar a migração com cópia sintética representativa: IDs, contagens, relacionamentos, hashes, datas, saldos e totais preservados. Testar também instalação vazia com toda a sequência histórica.
- Escolher manutenção coordenada ou expand/contract conforme disponibilidade necessária. Renomeação direta não é compatível com a aplicação antiga em execução.
- Antes do ambiente real, verificar backup restaurável, versão anterior, passos de aplicação e recuperação. Rollback da aplicação não desfaz a migration.

**Aceite:** schema de domínio conforme a convenção, API funcionando e nenhum dado perdido nos testes de atualização; conta única da aplicação e migrations com acesso limitado ao banco correto.

## Etapa 8 — Frontend e experiência de uso

**Prioridade:** média. **Dependência:** contratos de autorização/sessão estabilizados.

- Corrigir seletores para busca remota paginada, mantendo opções selecionadas em edição e estados de carregamento/erro.
- Exibir ações de acordo com permissões, com feedback de 403 e sessão expirada, mantendo autorização no servidor.
- Adicionar gestão de usuários, permissões atribuídas, troca de senha, MFA e sessões conforme etapas anteriores.
- Revisar estados vazio, erro, timeout, offline e envio pendente; evitar duplicação de operações e preservar trabalho de formulário quando possível.
- Adicionar recuperação de erro de renderização e falha de carregamento de rota.
- Revisar teclado, foco, modais e componentes de formulário; resolver os dois avisos de hooks após análise comportamental.
- Testar formulários principais com mais de 100 cadastros e validar comportamento de conta/permissão trocada.

**Aceite:** jornadas reais de cada perfil, seleção do registro fora da primeira página, acessibilidade de interação e recuperação de falhas verificadas.

## Etapa 9 — Infraestrutura, entrega e manutenção

**Prioridade:** alta para exposição/segredos; média para padronização operacional. **Dependência:** topologia e acesso de ambiente definidos.

- Revisar redes externas, portas e acesso ao MySQL; frontend fora da rede do banco, ingressos públicos mínimos e sem Docker socket nos serviços.
- Usar a mesma conta MySQL para aplicação e migrations, conforme preferência do usuário; limitar permissões de dados e schema ao banco da aplicação.
- Executar API e Nginx sem root; avaliar capabilities, no-new-privileges, filesystem somente leitura e caminhos graváveis reais.
- Verificar HTTPS, certificados do banco, CSP/headers do HTML e armazenamento de segredos; revisar credenciais históricas com evidência e rotacionar se foram utilizadas/expostas.
- Fixar e revisar versões/imagens de release; analisar dependências runtime, development e camadas do sistema operacional.
- Usar readiness real com deadline e validar desligamento gracioso, pool de conexões e recuperação de indisponibilidade do banco.
- Criar configuração Docker local seguindo as regras do projeto, com `${PROJECT}.localhost`, rede interna e proxy `/api`, quando essa etapa for implementada; não alterar o Compose de produção para cumprir o ambiente local.
- Revisar workflows, permissões de CI, proteção efetiva da branch e critérios Sonar/CodeQL; impedir que falha de scanner ou teste ignorado obrigatório apareça como aprovação.
- Definir logs de auditoria com usuário, ação, recurso, resultado e requestId, sem segredos; controlar leitura, retenção e alteração desses registros.
- Definir backups protegidos, retenção, responsáveis, recuperação e teste de restauração.
- Alinhar README, `.env.example` e `readme-ignored.md` aos comandos reais de execução, atualização e deploy, incluindo carregamento de ambiente da CLI Prisma.

**Aceite:** containers de release iniciam com dependências de produção, os fluxos passam através do proxy real, headers e limites funcionam, CI obrigatória está verde e restauração foi demonstrada em ambiente isolado.

## Organização das entregas

1. Auditoria/inventário e matriz final.
2. Autorizações críticas e fechamento do acesso financeiro alternativo.
3. Correção de estorno/custo médio com regressão.
4. Migrações de banco em português e estruturas de sessão necessárias.
5. Hashes/ciclo de contas e sessão em cookies, com testes de transição.
6. Rate limiting/proxy, consultas e contratos.
7. Interface, paginação de seletores e administração de acesso.
8. Infraestrutura, validação de release e documentação.
9. Auditoria de regressão e aceite final.

A sequência de implementação pode reagir aos achados da auditoria: uma credencial real exposta ou falha de autorização comprovada tem prioridade sobre padronização de nomes. Entregar PRs pequenos por responsabilidade; mudanças acopladas de cookie/origem/API e migration/release precisam de sequência coordenada. Não criar branches, PRs, merges ou deploys como parte deste planejamento.

## Critérios de conclusão

- [ ] Matriz de acesso aprovada e aplicada em todos os endpoints e consultas pertinentes.
- [ ] Achados críticos/altos aplicáveis corrigidos e retestados; pendências de menor risco com responsável, justificativa e prazo.
- [ ] Sem credenciais de renovação em armazenamento acessível a JavaScript; sessões, reuso, revogação e duas abas verificados.
- [ ] Senhas novas com Argon2id e logins legados preservados, com recuperação/MFA conforme política definida.
- [ ] Requisições maliciosas/indevidas recusadas antes de alterar dados; projeções públicas sem campos secretos.
- [ ] Estoque, custo, valores, status e histórico consistentes sob concorrência e repetição.
- [ ] Tabelas/colunas de domínio em português e minúsculas, migrations testadas em banco vazio e atualização com dados.
- [ ] Unitários, HTTP/MySQL e Playwright críticos aprovados, incluindo testes negativos de permissão e estado persistido.
- [ ] Dependências/imagens e código examinados; alertas triados e nenhuma falha de ferramenta escondida.
- [ ] Execução limpa, proxy/HTTPS, cookies, CSRF, CSP, rate limiting e containers reais verificados.
- [ ] Backup restaurado em teste e procedimento de atualização/recuperação documentado.
- [ ] README público e consulta pessoal reproduzem os comandos realmente usados.
- [ ] Rotina de revisão de acessos, atualização de dependências, triagem de alertas e testes de restauração definida.

## Referências técnicas

O plano usa controles aplicáveis da OWASP como orientação; não declara certificação ASVS.

- [OWASP autorização](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): privilégio mínimo, negação por padrão e validação em cada requisição.
- [OWASP senhas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): hashes adaptativos e transição de algoritmos legados.
- [OWASP sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): cookies, validade e revogação.
- [Prisma Migrate — guia v6 de migrations personalizadas](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/customizing-migrations): referência conceitual para renomeação sem perda e expand/contract; confirmar comandos/SQL na CLI Prisma 7.10.0 instalada antes de implementação.
