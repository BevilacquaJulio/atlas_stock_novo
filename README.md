# Atlas Stock

Sistema de gestão de blindagem automotiva: cadastros, compras, estoque, projetos e financeiro. Uma empresa por instalação.

Backend NestJS 11/Prisma 7/MySQL e frontend React 19/Vite 6/Tailwind 4. Node 24 nas imagens; Node 22.16 também foi usado nas verificações locais. Instalação reproduzível com os lockfiles npm de cada aplicação.

## Como executar o projeto

Pré-requisitos: Node.js 22.16+ ou 24, npm e MySQL 8.4 acessível. Para Docker, use Docker Engine com Compose e as redes/serviços externos descritos em [operação](docs/operacao.md).

```bash
git clone https://github.com/BevilacquaJulio/atlas_stock_novo.git
cd atlas_stock_novo
cd backend
npm ci
cp .env.example .env
```

Configure `backend/.env`: banco/usuário já provisionados, `JWT_ACCESS_SECRET` exclusivo de pelo menos 32 caracteres e `MFA_ENCRYPTION_KEY` com 64 dígitos hexadecimais para habilitar MFA. Não use os placeholders. A CLI Prisma carrega `.env` explicitamente via dotenv.

Para **banco novo ou ambiente autorizado**, depois de revisar as migrations:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run start:dev
```

O seed exige `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` com pelo menos 12 caracteres; não altera a senha de administrador existente. MySQL precisa existir antes de `prisma:deploy`; não há criação automática de banco pela aplicação.

Em outro terminal, na raiz:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173`. O frontend usa `/api` e o proxy Vite encaminha para `http://localhost:3000`; `API_PROXY_TARGET` permite ajustar o destino. `VITE_API_URL` vazio usa `/api`; uma URL absoluta é uma opção explícita para API em outra origem. Valores `VITE_*` são públicos e incorporados no build.

## Contas e acesso

- Administradores gerenciam usuários e acessam o financeiro. Gerentes precisam de permissão financeira explícita. Operadores não acessam o financeiro nem inativam registros.
- Pagamentos, recebimentos e gestão de acessos exigem confirmação da própria senha; com MFA ativo também exigem um código. A confirmação é vinculada à sessão.
- `Segurança da conta` permite trocar senha, configurar MFA TOTP, guardar oito códigos de recuperação de uso único e encerrar sessões próprias.
- O administrador gera um link de recuperação em `Usuários` e o entrega ao titular. Expira em 15 minutos e funciona uma vez. MFA ativo continua exigindo código na recuperação de senha.
- Novas senhas usam Argon2id. O login de conta bcrypt existente atualiza o hash após validar a senha, sem exigir troca imediata.
- Refresh opaco em cookie HttpOnly; access JWT em memória. Web Locks coordena as abas. Use HTTPS em produção; HTTP somente em localhost/`.localhost` para desenvolvimento.
- Após cadastrar MFA nas contas privilegiadas, configure `REQUIRE_PRIVILEGED_MFA=true` para exigi-lo em ações críticas de administradores e usuários financeiros.

## Verificação

```bash
cd backend
npm test
npm run typecheck:ci
npm run lint:ci
npm run build
cd ../frontend
npm test
npm run typecheck:ci
npm run lint:ci
npm run build
```

Cobertura backend inclui integração MySQL e exige as variáveis de ambiente isolado descritas em [validação](docs/validacao.md). Não aponte testes para o banco compartilhado ou de produção.

## Deploy e atualização

Consulte [operação e recuperação](docs/operacao.md) antes de atualizar. Esta versão renomeia tabelas/colunas: exige manutenção coordenada, backup restaurável e atualização da API e frontend juntos. Sessões anteriores exigem novo login. As seis migrations históricas foram preservadas.

O Compose de produção mantém `api`, `app` e o serviço manual `migrate`. Frontend em `https://${DOMAIN}`; API em `https://api.${DOMAIN}/api`. Ambos os runtimes usam usuário sem root. O migrator tem credenciais MySQL próprias; a API não recebe essas credenciais.

O Compose local pessoal `docker-compose.local.yml` e `readme-ignored.md` ficam ignorados no Git, conforme a regra do projeto. O local abre em `http://${PROJECT}.localhost`, usa proxy `/api` no nginx e não publica portas dos serviços.

Documentação: [inventário de endpoints](docs/inventario-endpoints.md), [revisão e evidências](docs/refinamento-2026-10-15.md), [CI](docs/ci.md).
