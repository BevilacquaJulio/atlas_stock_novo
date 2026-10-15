const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const mariadb = require('mariadb');

async function main() {
  if (
    process.env.ALLOW_TEST_DATABASE !== 'true' ||
    process.env.NODE_ENV !== 'test' ||
    process.env.MYSQL_HOST !== '127.0.0.1' ||
    process.env.MYSQL_PORT !== '13316' ||
    process.env.MYSQL_DATABASE !== 'atlas_upgrade_test'
  )
    throw new Error('Destino de upgrade recusado.');
  const connection = await mariadb.createConnection({
    host: '127.0.0.1',
    port: 13316,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    multipleStatements: true,
    bigIntAsNumber: true,
    decimalAsNumber: false,
    allowPublicKeyRetrieval: true,
  });
  const renames = {
    refresh_tokens: 'tokens_renovacao',
    compra_itens: 'itens_compras',
    projeto_checklist_itens: 'itens_verificacao_projetos',
    projeto_historico: 'historicos_projetos',
    projeto_consumos: 'consumos_projetos',
    categoria_despesa: 'categorias_despesas',
    config_sistema: 'configuracoes_sistema',
  };
  const columns = {
    criado_em: 'created_at',
    atualizado_em: 'updated_at',
    expira_em: 'expires_at',
    revogado_em: 'revoked_at',
    resumo_token: 'token_hash',
    situacao: 'status',
  };
  try {
    if (process.env.ALLOW_CREATE_TEST_DATABASE === 'true')
      await connection.query(
        'CREATE DATABASE IF NOT EXISTS atlas_upgrade_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      );
    await connection.query('USE atlas_upgrade_test');
    const tables = await connection.query('SHOW TABLES');
    if (tables.length)
      throw new Error(
        'O banco de upgrade precisa estar vazio; nenhuma limpeza automática é permitida.',
      );
    const migrations = fs
      .readdirSync(path.join(__dirname, '../prisma/migrations'))
      .filter((name) => /^\d/.test(name))
      .sort();
    for (const name of migrations.filter((name) => name < '20261015000100'))
      await connection.query(
        fs.readFileSync(
          path.join(__dirname, '../prisma/migrations', name, 'migration.sql'),
          'utf8',
        ),
      );
    const seeds = [
      [
        'usuarios',
        {
          nome: 'Sintético',
          email: 'upgrade@example.test',
          senha: 'synthetic-hash',
          cargo: 'ADMINISTRADOR',
        },
      ],
      ['categorias', { nome: 'Categoria' }],
      [
        'produtos',
        {
          codigo: 'UPGRADE',
          nome: 'Produto',
          unidade_medida: 'UN',
          quantidade_estoque: '10.125',
          custo_medio: '12.34',
        },
      ],
      [
        'fornecedores',
        { nome_razao_social: 'Fornecedor', cpf_cnpj: '11222333000181' },
      ],
      ['clientes', { nome_completo: 'Cliente', cpf_cnpj: '52998224725' }],
      [
        'veiculos',
        {
          cliente_id: 1,
          placa: 'SYN1234',
          marca: 'Sintética',
          modelo: 'Teste',
        },
      ],
      ['compras', { fornecedor_id: 1, usuario_id: 1, valor_total: '12.34' }],
      [
        'compra_itens',
        {
          compra_id: 1,
          produto_id: 1,
          quantidade: '1.125',
          valor_unitario: '12.34',
          valor_total: '13.88',
        },
      ],
      ['despesas', { descricao: 'Despesa', valor: '12.34', compra_id: 1 }],
      ['projetos', { cliente_id: 1, veiculo_id: 1, usuario_id: 1 }],
      [
        'projeto_checklist_itens',
        { projeto_id: 1, descricao: 'Checklist', ordem: 1 },
      ],
      [
        'projeto_historico',
        { projeto_id: 1, status_novo: 'AGUARDANDO', usuario_id: 1 },
      ],
      [
        'projeto_consumos',
        {
          projeto_id: 1,
          tipo: 'PRODUTO',
          produto_id: 1,
          quantidade: '0.125',
          valor_unitario: '12.34',
          valor_total: '1.54',
          usuario_id: 1,
        },
      ],
      ['categoria_despesa', { nome: 'Operacional' }],
      [
        'receitas',
        { descricao: 'Receita', valor: '99.99', cliente_id: 1, projeto_id: 1 },
      ],
      [
        'config_sistema',
        { id: 1, financeiro_senha_hash: 'legacy-synthetic-hash' },
      ],
      [
        'refresh_tokens',
        {
          usuario_id: 1,
          token_hash: 'a'.repeat(64),
          expires_at: '2027-01-01 00:00:00.000',
        },
      ],
      [
        'movimentacoes',
        {
          produto_id: 1,
          tipo: 'ENTRADA',
          quantidade: '10.125',
          custo_unitario: '12.34',
          valor_total: '124.94',
          motivo: 'Sintético',
          usuario_id: 1,
          compra_id: 1,
          projeto_id: 1,
        },
      ],
    ];
    for (const [table, values] of seeds) {
      const fields = await connection.query(`SHOW COLUMNS FROM \`${table}\``);
      if (fields.some((field) => field.Field === 'updated_at'))
        values.updated_at = '2026-10-01 12:34:56.789';
      const names = Object.keys(values);
      await connection.query(
        `INSERT INTO \`${table}\` (${names.map((name) => `\`${name}\``).join(',')}) VALUES (${names.map(() => '?').join(',')})`,
        Object.values(values),
      );
    }
    const before = new Map();
    for (const [table] of seeds)
      before.set(
        table,
        Array.from(
          await connection.query(`SELECT * FROM \`${table}\` ORDER BY id`),
        ),
      );
    for (const name of migrations.filter((name) => name >= '20261015000100'))
      await connection.query(
        fs.readFileSync(
          path.join(__dirname, '../prisma/migrations', name, 'migration.sql'),
          'utf8',
        ),
      );
    for (const [table, rows] of before) {
      const after = Array.from(
        await connection.query(
          `SELECT * FROM \`${renames[table] ?? table}\` ORDER BY id`,
        ),
      ).map((row) => {
        const result = {};
        for (const [name, value] of Object.entries(row)) {
          const old = columns[name] ?? name;
          if (Object.hasOwn(rows[0], old)) result[old] = value;
        }
        return result;
      });
      assert.deepEqual(after, rows, `Dados alterados: ${table}`);
    }
    console.log(
      `PASS: ${before.size} tabelas preservaram IDs, valores, hashes, datas e vínculos após upgrade.`,
    );
  } finally {
    await connection.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
