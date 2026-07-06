require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DATABASE_URL);
async function run() {
  const cols = await s.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND (data_type LIKE '%int%' OR data_type LIKE '%num%')");
  
  for (const row of cols[0]) {
    const tbl = row.table_name;
    const col = row.column_name;
    if (col === 'id' || col.endsWith('_id') || col === 'port' || col === 'creditos' || col === 'semestre') continue;
    try {
      const cnt = await s.query(`SELECT count(*) FROM "${tbl}" WHERE "${col}" > 0`);
      if (parseInt(cnt[0][0].count) > 0) {
        console.log(`TABLE "${tbl}" col "${col}" has ${cnt[0][0].count} rows > 0`);
      }
    } catch(e) {}
  }
  process.exit(0);
}
run().catch(console.error);
