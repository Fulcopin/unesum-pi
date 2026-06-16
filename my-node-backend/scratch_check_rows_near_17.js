const db = require('./src/models');

async function main() {
  const s = await db.SyllabusComisionAcademica.findByPk(25);
  const data = JSON.parse(s.datos_syllabus);
  
  for (let r = 15; r < 25; r++) {
    if (data.tabs[0].rows[r]) {
      const row = data.tabs[0].rows[r];
      console.log(`Row ${r}:`);
      for (let c = 0; c < row.cells.length; c++) {
        console.log(`  [${c}] ${row.cells[c].content.substring(0, 50)}`);
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
