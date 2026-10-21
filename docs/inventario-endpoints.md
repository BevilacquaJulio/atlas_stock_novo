# Inventário de endpoints

Gerado do build Nest em 15/10/2026. A instalação atende uma empresa. Os registros operacionais são compartilhados conforme a matriz de cargos; sessões e recuperação pertencem ao próprio usuário.

| Método | Endpoint | Acesso | Financeiro | Reautenticação |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | Público | — | — |
| POST | `/api/auth/logout` | Público | — | — |
| GET | `/api/auth/me` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/auth/reautenticar` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/auth/recuperacao/:id` | ADMINISTRADOR | — | Sim |
| POST | `/api/auth/recuperar` | Público | — | — |
| POST | `/api/auth/refresh` | Público | — | — |
| POST | `/api/auth/senha` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/auth/sessoes` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/auth/sessoes/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/categorias` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/categorias` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/categorias/:id` | ADMINISTRADOR, GERENTE | — | — |
| GET | `/api/categorias/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/categorias/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/clientes` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/clientes` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/clientes/:id` | ADMINISTRADOR, GERENTE | — | — |
| GET | `/api/clientes/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/clientes/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/compras` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/compras` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/compras/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/compras/:id/cancelar` | ADMINISTRADOR, GERENTE, OPERADOR | Sim | Sim |
| PATCH | `/api/compras/:id/confirmar` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/compras/:id/desconfirmar` | ADMINISTRADOR, GERENTE | — | — |
| PATCH | `/api/compras/:id/estornar-pagamento` | ADMINISTRADOR, GERENTE, OPERADOR | Sim | Sim |
| PATCH | `/api/compras/:id/pagar` | ADMINISTRADOR, GERENTE, OPERADOR | Sim | Sim |
| GET | `/api/dashboard` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/financeiro/categorias-despesa` | Permissão financeira | Sim | — |
| POST | `/api/financeiro/categorias-despesa` | Permissão financeira | Sim | — |
| GET | `/api/financeiro/despesas` | Permissão financeira | Sim | — |
| POST | `/api/financeiro/despesas` | Permissão financeira | Sim | — |
| GET | `/api/financeiro/despesas/:id` | Permissão financeira | Sim | — |
| PATCH | `/api/financeiro/despesas/:id` | Permissão financeira | Sim | — |
| PATCH | `/api/financeiro/despesas/:id/pagar` | Permissão financeira | Sim | Sim |
| GET | `/api/financeiro/receitas` | Permissão financeira | Sim | — |
| POST | `/api/financeiro/receitas` | Permissão financeira | Sim | — |
| GET | `/api/financeiro/receitas/:id` | Permissão financeira | Sim | — |
| PATCH | `/api/financeiro/receitas/:id` | Permissão financeira | Sim | — |
| PATCH | `/api/financeiro/receitas/:id/receber` | Permissão financeira | Sim | Sim |
| GET | `/api/financeiro/resumo` | Permissão financeira | Sim | — |
| GET | `/api/fornecedores` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/fornecedores` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/fornecedores/:id` | ADMINISTRADOR, GERENTE | — | — |
| GET | `/api/fornecedores/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/fornecedores/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/health` | Público | — | — |
| GET | `/api/health/ready` | Público | — | — |
| GET | `/api/movimentacoes` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/movimentacoes` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/produtos` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/produtos` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/produtos/:id` | ADMINISTRADOR, GERENTE | — | — |
| GET | `/api/produtos/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/produtos/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/produtos/:id/permanente` | ADMINISTRADOR | — | — |
| GET | `/api/projetos` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/projetos` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/projetos/:id` | ADMINISTRADOR, GERENTE | — | — |
| GET | `/api/projetos/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/projetos/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/projetos/:id/checklist` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/projetos/:id/checklist/:itemId` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/projetos/:id/checklist/:itemId` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/projetos/:id/consumos` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/projetos/:id/status` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| GET | `/api/usuarios` | ADMINISTRADOR | — | — |
| POST | `/api/usuarios` | ADMINISTRADOR | — | Sim |
| PATCH | `/api/usuarios/:id/acesso` | ADMINISTRADOR | — | Sim |
| GET | `/api/veiculos` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| POST | `/api/veiculos` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| DELETE | `/api/veiculos/:id` | ADMINISTRADOR, GERENTE | — | — |
| GET | `/api/veiculos/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |
| PATCH | `/api/veiculos/:id` | ADMINISTRADOR, GERENTE, OPERADOR | — | — |

Total: 75 rotas. Corpos e consultas são definidos nos DTOs Zod em backend/src/modules/*/dto; OpenAPI é exposto somente fora de produção.
