import type { Locator, Page } from '@playwright/test';
import { test, expect, login, type Scenario } from './fixtures';

async function choose(
  scope: Page | Locator,
  label: string,
  option: string | RegExp,
): Promise<void> {
  await scope.getByRole('combobox', { name: label, exact: true }).click();
  await scope
    .getByRole('option', { name: option, exact: typeof option === 'string' })
    .click();
}

async function stock(scenario: Scenario): Promise<number> {
  const product = await scenario.api<{ quantidadeEstoque: string }>(
    'GET',
    `/produtos/${scenario.productId}`,
  );
  return Number(product.quantidadeEstoque);
}

test('login, renovação, logout e troca de conta preservam o bloqueio financeiro', async ({
  page,
  scenario,
}) => {
  await page.goto('/financeiro');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-mail', { exact: true }).fill(scenario.adminEmail);
  await page
    .getByLabel('Senha', { exact: true })
    .fill('wrong-synthetic-password');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Credenciais inválidas.')).toBeVisible();
  await login(page, scenario.adminEmail, scenario.password);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Sair da conta' }).first(),
  ).toBeVisible();
  await page.goto('/financeiro');
  await expect(
    page.getByRole('button', { name: 'Nova despesa', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sair da conta' }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, scenario.operatorEmail, scenario.password);
  await page.goto('/financeiro');
  await expect(page.getByLabel('Senha financeira')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Nova despesa', exact: true }),
  ).toHaveCount(0);
});

test('cadastro de cliente permite criar, editar e inativar pela interface', async ({
  page,
  scenario,
}) => {
  await login(page, scenario.adminEmail, scenario.password);
  await page.goto('/clientes');
  await page.getByRole('button', { name: 'Novo cliente', exact: true }).click();
  let modal = page.getByRole('dialog', { name: 'Novo cliente' });
  await modal
    .getByLabel('Nome completo / Razão social')
    .fill(`${scenario.prefix} cadastrado`);
  await modal.getByLabel('CPF / CNPJ').fill('11144477735');
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/clientes') &&
      response.request().method() === 'POST',
  );
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const client = (await response.json()) as { id: number };
  await expect(modal).not.toBeVisible();
  const row = page
    .getByRole('row')
    .filter({ hasText: `${scenario.prefix} cadastrado` });
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  modal = page.getByRole('dialog', { name: 'Editar cliente' });
  await modal
    .getByLabel('Nome completo / Razão social')
    .fill(`${scenario.prefix} atualizado`);
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('row')
    .filter({ hasText: `${scenario.prefix} atualizado` })
    .getByRole('button', { name: 'Inativar', exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await scenario.api<{ ativo: boolean }>(
            'GET',
            `/clientes/${client.id}`,
          )
        ).ativo,
    )
    .toBe(false);
});

test('entrada, saída e insuficiência de estoque mantêm o saldo correto', async ({
  page,
  scenario,
}) => {
  await login(page, scenario.adminEmail, scenario.password);
  await page.goto('/movimentacoes');
  for (const [kind, quantity, balance] of [
    ['Entrada', '2', 12],
    ['Saída', '3', 9],
  ] as const) {
    await page
      .getByRole('button', { name: 'Nova movimentação', exact: true })
      .click();
    const modal = page.getByRole('dialog', { name: 'Nova movimentação' });
    await choose(modal, 'Produto', new RegExp(scenario.productCode));
    await choose(modal, 'Tipo', kind);
    await modal.getByLabel('Quantidade', { exact: true }).fill(quantity);
    await modal.getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect(modal).not.toBeVisible();
    await expect.poll(() => stock(scenario)).toBe(balance);
  }
  await page
    .getByRole('button', { name: 'Nova movimentação', exact: true })
    .click();
  const modal = page.getByRole('dialog', { name: 'Nova movimentação' });
  await choose(modal, 'Produto', new RegExp(scenario.productCode));
  await choose(modal, 'Tipo', 'Saída');
  await modal.getByLabel('Quantidade', { exact: true }).fill('10');
  await modal.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(
    modal.getByText('Estoque insuficiente para esta saída.'),
  ).toBeVisible();
  expect(await stock(scenario)).toBe(9);
});

test('compra passa por pagamento, recebimento, estornos e cancelamento com despesa sincronizada', async ({
  page,
  scenario,
}) => {
  await login(page, scenario.adminEmail, scenario.password);
  await page.goto('/compras');
  await page.getByRole('button', { name: 'Nova compra', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Nova compra' });
  await choose(modal, 'Fornecedor', scenario.supplierName);
  await modal.getByLabel('Data da compra').fill('2026-10-08');
  await choose(modal, 'Produto', new RegExp(scenario.productCode));
  await modal.getByLabel('Quantidade', { exact: true }).fill('2');
  await modal.getByLabel('Valor unitário (R$)').fill('20');
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/compras') &&
      response.request().method() === 'POST',
  );
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const purchase = (await response.json()) as { id: number };
  await expect(modal).not.toBeVisible();
  const row = page.getByRole('row').filter({ hasText: scenario.supplierName });
  for (const [action, status, expenseStatus, balance] of [
    ['Pagar', 'PAGO', 'PAGO', 10],
    ['Confirmar', 'CONFIRMADA', 'PAGO', 12],
    ['Desconfirmar', 'PAGO', 'PAGO', 10],
    ['Estornar', 'A_PAGAR', 'A_PAGAR', 10],
    ['Cancelar', 'CANCELADA', 'CANCELADA', 10],
  ] as const) {
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: action, exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await scenario.api<{ status: string }>(
              'GET',
              `/compras/${purchase.id}`,
            )
          ).status,
      )
      .toBe(status);
    const current = await scenario.api<{ despesa: { status: string } }>(
      'GET',
      `/compras/${purchase.id}`,
    );
    expect(current.despesa.status).toBe(expenseStatus);
    expect(await stock(scenario)).toBe(balance);
  }
});

test('projeto registra checklist, consumo e conclusão sem perder saldo', async ({
  page,
  scenario,
}) => {
  await login(page, scenario.adminEmail, scenario.password);
  await page.goto('/projetos');
  await page.getByRole('button', { name: 'Novo projeto', exact: true }).click();
  let modal = page.getByRole('dialog', { name: 'Novo projeto' });
  await choose(modal, 'Cliente', scenario.clientName);
  await choose(modal, 'Veículo', new RegExp(scenario.vehiclePlate));
  await modal.getByLabel('Valor orçado (R$)').fill('300');
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/projetos') &&
      response.request().method() === 'POST',
  );
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const project = (await response.json()) as { id: number };
  await page.goto(`/projetos/${project.id}`);
  await page
    .getByRole('button', { name: 'Alterar status', exact: true })
    .click();
  modal = page.getByRole('dialog', { name: 'Alterar status' });
  await choose(modal, 'Novo status', 'Em andamento');
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page
    .getByRole('button', { name: 'Adicionar item', exact: true })
    .click();
  modal = page.getByRole('dialog', { name: 'Novo item de checklist' });
  await modal
    .getByLabel('Descrição', { exact: true })
    .fill('Verificar montagem');
  await modal.getByRole('button', { name: 'Adicionar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page
    .getByRole('checkbox', { name: 'Marcar Verificar montagem' })
    .check();
  await expect(
    page.getByRole('checkbox', { name: 'Marcar Verificar montagem' }),
  ).toBeChecked();
  await page
    .getByRole('button', { name: 'Registrar consumo', exact: true })
    .click();
  modal = page.getByRole('dialog', { name: 'Registrar consumo' });
  await choose(modal, 'Produto', new RegExp(scenario.productCode));
  await modal.getByLabel('Quantidade', { exact: true }).fill('2');
  await modal.getByLabel('Valor unitário (R$)').fill('10');
  await modal.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect.poll(() => stock(scenario)).toBe(8);
  await page
    .getByRole('button', { name: 'Alterar status', exact: true })
    .click();
  modal = page.getByRole('dialog', { name: 'Alterar status' });
  await choose(modal, 'Novo status', 'Concluído');
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(
    (await scenario.api<{ status: string }>('GET', `/projetos/${project.id}`))
      .status,
  ).toBe('CONCLUIDO');
  expect(await stock(scenario)).toBe(8);
});

test('financeiro exige desbloqueio, paga despesas, recebe receitas e limpa acesso no logout', async ({
  page,
  scenario,
}) => {
  await login(page, scenario.operatorEmail, scenario.password);
  await page.goto('/financeiro');
  await page.getByLabel('Senha financeira').fill('wrong-synthetic-password');
  await page.getByRole('button', { name: 'Desbloquear', exact: true }).click();
  await expect(page.getByText('Senha financeira incorreta.')).toBeVisible();
  await page.getByLabel('Senha financeira').fill(scenario.financePassword);
  await page.getByRole('button', { name: 'Desbloquear', exact: true }).click();
  await page.getByRole('button', { name: 'Nova despesa', exact: true }).click();
  let modal = page.getByRole('dialog', { name: 'Nova despesa' });
  await modal
    .getByLabel('Descrição', { exact: true })
    .fill(`${scenario.prefix} despesa`);
  await modal.getByLabel('Valor (R$)').fill('10');
  await modal.getByLabel('Vencimento', { exact: true }).fill('2026-10-08');
  await choose(modal, 'Categoria', scenario.financeCategory);
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  const expenseRow = page
    .getByRole('row')
    .filter({ hasText: `${scenario.prefix} despesa` });
  await expenseRow.getByRole('button', { name: 'Pagar', exact: true }).click();
  await expect(expenseRow.getByText('Pago', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nova receita', exact: true }).click();
  modal = page.getByRole('dialog', { name: 'Nova receita' });
  await modal
    .getByLabel('Descrição', { exact: true })
    .fill(`${scenario.prefix} receita`);
  await modal.getByLabel('Valor (R$)').fill('20');
  await modal.getByLabel('Vencimento', { exact: true }).fill('2026-10-08');
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page.getByRole('tab', { name: 'Receitas', exact: true }).click();
  const revenueRow = page
    .getByRole('row')
    .filter({ hasText: `${scenario.prefix} receita` });
  await revenueRow
    .getByRole('button', { name: 'Receber', exact: true })
    .click();
  await expect(revenueRow.getByText('Recebido', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sair da conta' }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, scenario.operatorEmail, scenario.password);
  await page.goto('/financeiro');
  await expect(page.getByLabel('Senha financeira')).toBeVisible();
});
