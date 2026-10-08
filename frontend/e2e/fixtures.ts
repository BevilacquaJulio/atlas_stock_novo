import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test as base, expect, type Page } from '@playwright/test';
import type { PrismaClient } from '../../backend/dist/generated/prisma/client';
import { assertTestEnvironment } from './environment';

const backendRequire = createRequire(
  new URL('../../backend/package.json', import.meta.url),
);
const { PrismaService } = backendRequire(
  './dist/src/prisma/prisma.service.js',
) as { PrismaService: new () => PrismaClient };
const { hash } = backendRequire('bcryptjs') as {
  hash: (value: string, rounds: number) => Promise<string>;
};
const { JwtService } = backendRequire('@nestjs/jwt') as {
  JwtService: new () => {
    signAsync: (payload: object, options: object) => Promise<string>;
  };
};

export interface Scenario {
  prefix: string;
  adminEmail: string;
  operatorEmail: string;
  password: string;
  financePassword: string;
  productId: number;
  productCode: string;
  supplierName: string;
  clientName: string;
  vehiclePlate: string;
  financeCategory: string;
  api: <T>(method: string, path: string, body?: object) => Promise<T>;
}

export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
}

export const test = base.extend<{ scenario: Scenario }>({
  scenario: async ({ request }, provide) => {
    assertTestEnvironment();
    const secret = process.env.JWT_ACCESS_SECRET;
    const prisma = new PrismaService();
    const prefix = `e2e-${randomUUID()}`;
    const password = 'synthetic-e2e-password-only';
    const financePassword = 'synthetic-e2e-financial-only';
    const users: number[] = [];
    let categoryId: number | undefined;
    let supplierId: number | undefined;
    let clientId: number | undefined;
    let productId: number | undefined;
    let financeCategoryId: number | undefined;
    let createdConfig = false;
    try {
      await prisma.$connect();
      const senha = await hash(password, 10);
      const admin = await prisma.usuario.create({
        data: {
          nome: `${prefix} admin`,
          email: `${prefix}-admin@example.test`,
          senha,
          cargo: 'ADMINISTRADOR',
        },
      });
      users.push(admin.id);
      const operator = await prisma.usuario.create({
        data: {
          nome: `${prefix} operator`,
          email: `${prefix}-operator@example.test`,
          senha,
          cargo: 'OPERADOR',
        },
      });
      users.push(operator.id);
      categoryId = (await prisma.categoria.create({ data: { nome: prefix } }))
        .id;
      financeCategoryId = (
        await prisma.categoriaDespesa.create({ data: { nome: prefix } })
      ).id;
      supplierId = (
        await prisma.fornecedor.create({
          data: {
            nomeRazaoSocial: `${prefix} fornecedor`,
            cpfCnpj: '11222333000181',
          },
        })
      ).id;
      clientId = (
        await prisma.cliente.create({
          data: { nomeCompleto: `${prefix} cliente`, cpfCnpj: '52998224725' },
        })
      ).id;
      const vehicle = await prisma.veiculo.create({
        data: {
          clienteId: clientId,
          placa: 'E2E1234',
          marca: 'Sintética',
          modelo: prefix,
        },
      });
      const product = await prisma.produto.create({
        data: {
          codigo: prefix,
          nome: 'Produto E2E',
          categoriaId: categoryId,
          unidadeMedida: 'un',
          quantidadeEstoque: 10,
          custoMedio: 10,
          valorUnitario: 10,
        },
      });
      productId = product.id;
      await prisma.configSistema.create({
        data: { id: 1, financeiroSenhaHash: await hash(financePassword, 10) },
      });
      createdConfig = true;
      const token = await new JwtService().signAsync(
        {
          purpose: 'access',
          sub: admin.id,
          email: admin.email,
          cargo: admin.cargo,
          nome: admin.nome,
        },
        {
          issuer: 'atlas-stock',
          audience: 'atlas-stock-api',
          algorithm: 'HS256',
          secret,
          expiresIn: '15m',
        },
      );
      await provide({
        prefix,
        adminEmail: admin.email,
        operatorEmail: operator.email,
        password,
        financePassword,
        productId,
        productCode: product.codigo,
        supplierName: `${prefix} fornecedor`,
        clientName: `${prefix} cliente`,
        vehiclePlate: vehicle.placa,
        financeCategory: prefix,
        api: async <T>(
          method: string,
          path: string,
          body?: object,
        ): Promise<T> => {
          const response = await request.fetch(
            `http://127.0.0.1:13317/api${path}`,
            {
              method,
              data: body,
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(
            true,
          );
          return response.status() === 204
            ? (undefined as T)
            : ((await response.json()) as T);
        },
      });
    } finally {
      if (users.length) {
        const projects = await prisma.projeto.findMany({
          where: { usuarioId: { in: users } },
          select: { id: true },
        });
        const ids = projects.map((project) => project.id);
        await prisma.receita.deleteMany({ where: { projetoId: { in: ids } } });
        await prisma.despesa.deleteMany({ where: { projetoId: { in: ids } } });
        await prisma.projeto.deleteMany({
          where: { usuarioId: { in: users } },
        });
        await prisma.movimentacao.deleteMany({
          where: { usuarioId: { in: users } },
        });
        await prisma.compra.deleteMany({ where: { usuarioId: { in: users } } });
      }
      await prisma.despesa.deleteMany({
        where: { descricao: { startsWith: prefix } },
      });
      await prisma.receita.deleteMany({
        where: { descricao: { startsWith: prefix } },
      });
      if (financeCategoryId)
        await prisma.categoriaDespesa.delete({
          where: { id: financeCategoryId },
        });
      if (productId) await prisma.produto.delete({ where: { id: productId } });
      if (categoryId)
        await prisma.categoria.delete({ where: { id: categoryId } });
      if (supplierId)
        await prisma.fornecedor.delete({ where: { id: supplierId } });
      await prisma.cliente.deleteMany({
        where: {
          OR: [
            { id: clientId ?? -1 },
            { nomeCompleto: { startsWith: prefix } },
          ],
        },
      });
      if (users.length)
        await prisma.usuario.deleteMany({ where: { id: { in: users } } });
      if (createdConfig)
        await prisma.configSistema.delete({ where: { id: 1 } });
      await prisma.$disconnect();
    }
  },
});

export { expect };
