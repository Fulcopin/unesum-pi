const db = require('./src/models');
const sequelize = db.sequelize;

async function run() {
  try {
    const [triggers] = await sequelize.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'syllabi';
    `);
    console.log("Triggers on 'syllabi' table:");
    console.log(JSON.stringify(triggers, null, 2));
  } catch (error) {
    console.error("Error querying triggers:", error);
  } finally {
    process.exit(0);
  }
}

run();
