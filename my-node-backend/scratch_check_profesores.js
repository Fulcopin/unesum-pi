
const { sequelize } = require('./src/models');
async function test() {
  try {
    const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profesores'");
    console.log('Columns in profesores table:', results.map(r => r.column_name));
  } catch (err) {
    console.error('Error checking columns:', err);
  }
  process.exit(0);
}
test();
