import { test, expect, login } from './fixtures';

test('aguarda a limpeza do cookie antes de permitir login de outra conta', async ({
  page,
  scenario,
}) => {
  await login(page, scenario.managerEmail, scenario.password);
  let releaseLogout!: () => void;
  const pendingLogout = new Promise<void>((resolve) => {
    releaseLogout = resolve;
  });
  await page.route('**/api/auth/logout', async (route) => {
    await pendingLogout;
    await route.continue();
  });
  const logoutResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/logout'),
  );
  await page.getByRole('button', { name: 'Sair da conta' }).first().click();
  try {
    await expect(page.getByRole('status')).toHaveText('Verificando sessão…');
    await expect(page.getByLabel('E-mail', { exact: true })).not.toBeVisible();
  } finally {
    releaseLogout();
  }
  expect((await logoutResponse).ok()).toBe(true);
  await expect(page).toHaveURL(/\/login$/);
  await login(page, scenario.operatorEmail, scenario.password);
  await page.goto('/financeiro');
  await expect(page.getByText('Sem acesso ao financeiro')).toBeVisible();
});

test('seletor encontra cliente fora dos primeiros 100 e preserva na edição', async ({
  page,
  scenario,
}) => {
  const name = await scenario.seedClients();
  await login(page, scenario.adminEmail, scenario.password);
  await page.goto('/cadastros/veiculos');
  await page.getByRole('button', { name: 'Novo veículo', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Novo veículo' });
  await modal.getByRole('searchbox', { name: 'Buscar cliente' }).fill(name);
  await modal.getByRole('combobox', { name: 'Cliente', exact: true }).click();
  await modal.getByRole('option', { name, exact: true }).click();
  await modal.getByLabel('Placa', { exact: true }).fill('SYN5678');
  await modal.getByLabel('Marca', { exact: true }).fill('Sintética');
  await modal.getByLabel('Modelo', { exact: true }).fill('Modelo de teste');
  await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: 'SYN5678' })
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog', { name: 'Editar veículo' })
      .getByRole('combobox', { name: 'Cliente', exact: true }),
  ).toContainText(name);
});

test('duas abas renovam em sequência e logout limpa a outra aba', async ({
  page,
  context,
  scenario,
}) => {
  await login(page, scenario.adminEmail, scenario.password);
  const second = await context.newPage();
  await second.goto('/');
  await expect(
    second.getByRole('button', { name: 'Sair da conta' }).first(),
  ).toBeVisible();
  await Promise.all([page.reload(), second.reload()]);
  for (const tab of [page, second]) {
    await expect(
      tab.getByRole('button', { name: 'Sair da conta' }).first(),
    ).toBeVisible();
    expect(
      await tab.evaluate(() => localStorage.getItem('g5.refreshToken')),
    ).toBeNull();
    expect(await tab.evaluate(() => document.cookie)).not.toContain(
      'atlas_refresh',
    );
  }
  const cookie = (await context.cookies()).find(
    (item) => item.name === 'atlas_refresh',
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Strict');
  await page.getByRole('button', { name: 'Sair da conta' }).first().click();
  await expect(second).toHaveURL(/\/login$/);
});

test('administrador entrega link de recuperação que troca a senha do usuário', async ({
  page,
  browser,
  scenario,
}) => {
  await login(page, scenario.adminEmail, scenario.password);
  await page.goto('/usuarios');
  const row = page.getByRole('row').filter({ hasText: scenario.operatorEmail });
  await row.getByRole('button', { name: 'Gerar recuperação' }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirme sua senha' });
  await confirm
    .getByLabel('Sua senha', { exact: true })
    .fill(scenario.password);
  await confirm.getByRole('button', { name: 'Confirmar', exact: true }).click();
  const link = await page
    .getByRole('textbox', { name: 'Link de recuperação' })
    .inputValue();
  const isolated = await browser.newContext({
    extraHTTPHeaders: { 'X-Forwarded-For': '198.51.100.12' },
  });
  try {
    const receiver = await isolated.newPage();
    await receiver.goto(link);
    await receiver
      .getByLabel('Nova senha', { exact: true })
      .fill('nova-senha-sintetica-123');
    await receiver
      .getByLabel('Confirme a nova senha')
      .fill('nova-senha-sintetica-123');
    await receiver.getByRole('button', { name: 'Atualizar senha' }).click();
    await expect(
      receiver.getByText(
        'Senha atualizada. As sessões anteriores foram encerradas.',
      ),
    ).toBeVisible();
    await login(receiver, scenario.operatorEmail, 'nova-senha-sintetica-123');
  } finally {
    await isolated.close();
  }
});
