const db = require('./src/models');

async function main() {
  const s = await db.SyllabusComisionAcademica.findByPk(25);
  const data = JSON.parse(s.datos_syllabus);
  
  let found = false;
  for (let i = 0; i < data.tabs[0].rows.length; i++) {
    const row = data.tabs[0].rows[i];
    if (row.cells.some(c => c.content.includes('Horas de docencia'))) {
      found = true;
      console.log('--- TARGET ROW ---');
      console.log(JSON.stringify(row, null, 2));
      if (data.tabs[0].rows[i+1]) {
        console.log('--- NEXT ROW ---');
        console.log(JSON.stringify(data.tabs[0].rows[i+1], null, 2));
      }
      break;
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
