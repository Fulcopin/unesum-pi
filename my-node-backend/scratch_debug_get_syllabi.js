const db = require('./src/models');
const Syllabus = db.Syllabus;

async function run() {
  try {
    const latest = await Syllabus.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'nombre', 'periodo', 'materias', 'usuario_id', 'profesor_id', 'createdAt']
    });
    console.log("Latest Syllabi in DB:");
    console.log(JSON.stringify(latest, null, 2));
  } catch (error) {
    console.error("Error fetching latest syllabi:", error);
  } finally {
    process.exit(0);
  }
}

run();
