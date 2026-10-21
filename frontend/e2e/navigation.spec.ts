import { test, expect, login } from './fixtures';

test('navega entre rotas e mantém sidebar e conteúdo dentro da janela', async ({
  page,
  scenario,
}) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  await login(page, scenario.adminEmail, scenario.password);
  const sidebar = page.getByRole('complementary');
  await expect(sidebar).toBeVisible();
  const box = await sidebar.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.y + box!.height)).toBe(560);
  const nav = sidebar.getByRole('navigation');
  for (const [link, heading] of [
    ['Financeiro', 'Financeiro'],
    ['Movimentações', 'Movimentações de estoque'],
    ['Categorias', 'Categorias'],
    ['Produtos', 'Produtos'],
    ['Clientes', 'Clientes'],
    ['Financeiro', 'Financeiro'],
    ['Movimentações', 'Movimentações de estoque'],
    ['Categorias', 'Categorias'],
  ]) {
    await nav.getByRole('link', { name: link, exact: true }).click();
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible();
  }
  await nav
    .getByRole('link', { name: 'Usuários', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    nav.getByRole('link', { name: 'Usuários', exact: true }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    560,
  );
});

test('menu móvel mantém a navegação e fecha ao escolher uma página', async ({
  page,
  scenario,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await login(page, scenario.operatorEmail, scenario.password);
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeVisible();
  await page.getByRole('link', { name: 'Categorias', exact: true }).click();
  await expect(
    page
      .getByRole('main')
      .getByRole('heading', { name: 'Categorias', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Fechar menu' }),
  ).not.toBeVisible();
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    available: document.documentElement.clientWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.available);
});
