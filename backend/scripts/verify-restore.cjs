const mariadb = require('mariadb');
const assert = require('node:assert/strict');

async function main() {
  if (
    process.env.NODE_ENV !== 'test' ||
    process.env.ALLOW_TEST_DATABASE !== 'true' ||
    process.env.MYSQL_HOST !== '127.0.0.1' ||
    process.env.MYSQL_PORT !== '13316' ||
    process.env.MYSQL_DATABASE !== 'atlas_upgrade_test'
  )
    throw new Error('Destino de restauração recusado.');
  const db = await mariadb.createConnection({
    host: '127.0.0.1',
    port: 13316,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    bigIntAsNumber: true,
    allowPublicKeyRetrieval: true,
  });
  try {
    const tables = await db.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'atlas_upgrade_test'",
    );
    for (const { name } of tables) {
      const identifier = `\`${name.replaceAll('`', '``')}\``;
      const before = Array.from(
        await db.query(
          `SELECT * FROM atlas_upgrade_test.${identifier} ORDER BY id`,
        ),
      );
      const after = Array.from(
        await db.query(
          `SELECT * FROM atlas_restore_test.${identifier} ORDER BY id`,
        ),
      );
      assert.deepEqual(after, before, `Restauração divergente: ${name}`);
    }
    console.log(
      `PASS: restauração preservou as ${tables.length} tabelas do schema sintético.`,
    );
  } finally {
    await db.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
