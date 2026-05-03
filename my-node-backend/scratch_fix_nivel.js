
const { sequelize } = require('./src/models');
async function run() {
  try {
    console.log('Adding columns to nivel table...');
    await sequelize.query('ALTER TABLE nivel ADD COLUMN IF NOT EXISTS "ordinal" VARCHAR(30)');
    await sequelize.query('ALTER TABLE nivel ADD COLUMN IF NOT EXISTS "romano" VARCHAR(20)');
    console.log('Columns added successfully.');
  } catch (err) {
    console.error('Error adding columns:', err);
  }
  process.exit(0);
}
run();
