require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DATABASE_URL);
async function run() {
  const asig = await s.query("SELECT * FROM asignaturas WHERE id=595");
  console.log("ASIG 595:", asig[0]);
  process.exit(0);
}
run().catch(console.error);
