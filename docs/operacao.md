# Operação, atualização e recuperação

## Topologia e preparação

Produção usa `docker-compose.yml`: `api` (Nest na porta interna 3000), `app` (nginx sem root na porta interna 8080) e `migrate` no profile `tools`. Traefik e MySQL compartilhado são externos, nas redes `traefik` e `mysql_shared`. O frontend não entra na rede do banco. Não há portas de aplicação publicadas.

Em uma máquina limpa, instale Git, Docker Engine e o plugin Docker Compose. Provisione Traefik com HTTPS e DNS para `${DOMAIN}` e `api.${DOMAIN}`. Provisione MySQL 8.4 e suas redes; este projeto não cria esses serviços.

```bash
git clone https://github.com/BevilacquaJulio/atlas_stock_novo.git
cd atlas_stock_novo
cp .env.example .env
mkdir -p secrets backups
docker network ls
```

Preencha `.env`. `MYSQL_HOST=mysql_shared` resolve dentro do Docker; `MYSQL_DATABASE` deve ser o schema real. Instalações existentes podem continuar usando `g5`; o nome não é fixado no código. O exemplo para instalações novas usa `atlas_estoque`.

Gere **separadamente** o segredo JWT e a chave de criptografia MFA e salve-os no gerenciador de segredos do ambiente:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

A chave MFA precisa acompanhar backups e não pode ser trocada sem migrar os segredos criptografados. Nunca a copie para o frontend. Configure `CORS_ORIGIN` para a origem exata usada; o Compose de produção deriva essa origem de `DOMAIN` e força cookie Secure. Não há `JWT_REFRESH_SECRET` nesta versão.

Com TLS MySQL, copie a CA pública para `secrets/mysql-ca.pem`, configure `MYSQL_SSL=true` e prefira `MYSQL_SSL_REJECT_UNAUTHORIZED=true` com certificado que corresponda ao hostname. O antigo modo `false` continua configurável para transição, com perda de validação de identidade. Sem TLS, `MYSQL_SSL=false` dispensa a leitura da CA pela aplicação.

Provisione contas distintas: `MYSQL_USER`/`MYSQL_PASSWORD` para runtime; `MYSQL_MIGRATE_USER`/`MYSQL_MIGRATE_PASSWORD` para DDL. Use `ops/provisionar-banco.sql.example` e, após criar as tabelas, `ops/permissoes-runtime.sql`. São instruções para o DBA executar no ambiente autorizado; não foram aplicadas ao MySQL compartilhado nesta entrega.

`TRUST_PROXY` aceita apenas IPs/CIDRs dos proxies reais. Vazio ignora `X-Forwarded-For`. Verifique a origem dos pacotes no ambiente antes de configurá-lo; não use `true`, número de saltos ou uma rede inteira compartilhada como atalho. O login tem limites por IP e conta; mantenha uma instância de API com o limitador em memória. Escalar exige armazenamento compartilhado do limitador.

## Primeiro deploy

Após provisionar banco e conta de migration e preencher `.env`:

```bash
docker compose config --quiet
docker compose build api app migrate
docker compose run --rm migrate
```

Conceda as permissões runtime de `ops/permissoes-runtime.sql` após as migrations. Configure os dados do administrador inicial no `.env` e execute:

```bash
docker compose run --rm migrate npx ts-node prisma/seed.ts
docker compose up -d api app
docker compose ps
docker compose logs --tail=100 api app
```

O seed não substitui senha existente. Não execute `db:populate` em produção. Swagger fica desabilitado em produção. Confira `https://api.${DOMAIN}/api/health/ready` e login, recarga, logout, duas abas e uma jornada de cada cargo através do HTTPS real.

## Atualizar uma instalação existente

Esta versão tem renomeações físicas de tabelas/colunas e novo contrato de cookie. Não execute a migration enquanto a API antiga recebe tráfego. Não faça múltiplos releases/migrations em paralelo. Reserve uma janela de manutenção e teste o backup antes.

```bash
git pull --ff-only
docker compose config --quiet
docker compose build api app migrate
docker compose stop api app
docker compose run --rm migrate
docker compose up -d api app
docker compose ps
docker compose logs --tail=100 api app
```

Pare se a migration falhar. Preserve o estado e examine `docker compose run --rm migrate npx prisma migrate status`; não execute `migrate reset`, `migrate dev`, alterações nas migrations históricas ou `migrate resolve` sem diagnóstico. Atualize as permissões runtime para os nomes novos antes de liberar a API. Todos os usuários entram novamente; o frontend remove o refresh legado do localStorage.

## Comandos por tipo de alteração

| Alteração                        | Ação no servidor após validar o código                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Somente frontend                 | `docker compose up -d --build app`                                                                                           |
| Somente API, sem migration       | `docker compose up -d --build api`                                                                                           |
| Dependências ou Dockerfile       | Reconstruir o serviço alterado; revalidar runtime e auditoria                                                                |
| Schema/migration                 | Backup, manutenção coordenada, build de `api app migrate`, `docker compose run --rm migrate`, subir API/frontend compatíveis |
| Variável runtime da API          | `docker compose up -d --force-recreate api`                                                                                  |
| `DOMAIN`/URL pública do frontend | `docker compose up -d --build app api` — URL e CSP são geradas no build                                                      |
| Senhas/chave MFA                 | Rotação coordenada com consumidores; preservar capacidade de ler MFA/backups                                                 |

## Backup, restauração e troca opcional de database

Defina responsável, retenção e RPO/RTO antes de operar produção. Ponto inicial: backup diário criptografado, retenção de 30 dias e cópia fora do servidor; o responsável deve aprovar os objetivos e testar restauração mensalmente. Preserve `.env` e a chave MFA em armazenamento protegido separado. Não copie dumps para Git/imagens.

Crie `secrets/backup.cnf` a partir de `ops/mysql-backup.cnf.example`, com conta de backup e o hostname `mysql_shared`. Os comandos seguintes são para shell Bash no servidor, com redes e autorização correspondentes:

```bash
chmod 600 secrets/backup.cnf
mkdir -p backups
docker run --rm --network mysql_shared -v "$PWD/secrets/backup.cnf:/run/secrets/backup.cnf:ro" -v "$PWD/secrets/mysql-ca.pem:/run/secrets/mysql-ca.pem:ro" -v "$PWD/secrets/mysql-ca.pem:/run/secrets/mysql-ca.pem:ro" mysql:8.4 mysqldump --defaults-extra-file=/run/secrets/backup.cnf --single-transaction --no-tablespaces --set-gtid-purged=OFF g5 > backups/g5.sql
test -s backups/g5.sql
```

O comando acima usa explicitamente o banco antigo `g5`. Se a instalação já usa `atlas_estoque`, substitua o argumento e o nome do arquivo por esse nome. Revise o inventário do ambiente antes de executar.

Para **preparar** a troca `g5` → `atlas_estoque`, o DBA cria o destino e grants, exporta `g5` com a aplicação parada e restaura no destino. Não existe renomeação direta de database MySQL. Com uma conta de restauração configurada em `secrets/restore.cnf`:

```bash
docker run --rm -i --network mysql_shared -v "$PWD/secrets/restore.cnf:/run/secrets/restore.cnf:ro" -v "$PWD/secrets/mysql-ca.pem:/run/secrets/mysql-ca.pem:ro" -v "$PWD/secrets/mysql-ca.pem:/run/secrets/mysql-ca.pem:ro" mysql:8.4 mysql --defaults-extra-file=/run/secrets/restore.cnf atlas_estoque < backups/g5.sql
```

Confirme tabelas, IDs, contagens, vínculos, hashes, datas e totais; preserve `_prisma_migrations`. Só então altere `MYSQL_DATABASE` no `.env` e aplique as novas migrations na janela autorizada. Mantenha a cópia antiga intacta até o aceite. A troca real não foi executada nesta entrega.

Rollback de imagem não desfaz renomeações. Se precisar voltar à versão anterior, pare API/frontend, restaure um backup anterior em destino autorizado, restaure a configuração/versão compatíveis e valide antes de abrir tráfego. Não reconecte a API antiga ao schema renomeado. Reconcilie operações ocorridas após o backup segundo o RPO aprovado.

## Auditoria e idempotência

`eventos_auditoria` registra ator, método, recurso, requestId e status HTTP sem corpos, senhas ou tokens. Eventos `*:COMMIT`, resultado `0`, são persistidos na mesma transação de contas, compras, estoque, consumo e financeiro; o evento HTTP posterior registra o resultado externo. Se a auditoria transacional falhar, o efeito reverte. Falha ao persistir o evento HTTP gera erro operacional no log. Runtime tem somente SELECT/INSERT nessa tabela; retenção é tarefa de DBA, separada da conta da aplicação.

O cliente envia `Idempotency-Key` em criações. Compras, movimentações, receitas/despesas e consumo de projeto reservam a chave por usuário e verificam o resumo da entrada. Repetição concluída devolve a resposta original. Chave em andamento, com entrada diferente ou resultado incerto devolve 409; consulte os registros antes de repetir. Reservas não expiram automaticamente para evitar duplicação tardia. O DBA define retenção após reconciliação. Clientes antigos sem o cabeçalho continuam compatíveis e não recebem essa deduplicação.
