require('dotenv').config();
const db = require('./src/models');
async function run() {
  try {
    const asig = await db.Asignatura.findOne({
      where: { id: 595 },
      include: [
        {
          model: db.DistribucionHoras,
          as: 'horas',
          attributes: [
            ['horas_docencia', 'horasDocencia'],
            ['horas_practica', 'horasPractica'],
            ['horas_autonoma', 'horasAutonoma'],
            ['horas_vinculacion', 'horasVinculacion'],
            ['horas_practica_preprofesional', 'horasPracticaPreprofesional']
          ]
        }
      ]
    });
    const plain = asig.get({ plain: true });
    console.log("PLAIN ASIG 595:", plain);
  } catch(e) {
    console.error("ERROR:", e);
  }
  process.exit(0);
}
run();
