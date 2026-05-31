const { sequelize } = require('./src/models');
async function main() {
  const [rows] = await sequelize.query(`
    SELECT * FROM periodos
  `);
  console.log('PERIODOS:\n', JSON.stringify(rows, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
