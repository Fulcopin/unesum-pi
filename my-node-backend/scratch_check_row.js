const db = require('./src/models');

async function main() {
  const s = await db.SyllabusComisionAcademica.findByPk(25);
  const data = JSON.parse(s.datos_syllabus);
  const row = data.tabs[0].rows.find(r => r.cells.some(c => c.content.includes('Horas de docencia')));
  console.log(JSON.stringify(row, null, 2));
}
main().catch(console.error).finally(() => process.exit(0));
