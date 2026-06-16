const db = require('./src/models');

async function main() {
  const s = await db.SyllabusComisionAcademica.findByPk(25);
  const data = JSON.parse(s.datos_syllabus);
  
  for (let t = 0; t < data.tabs.length; t++) {
    for (let r = 0; r < data.tabs[t].rows.length; r++) {
      const row = data.tabs[t].rows[r];
      for (let c = 0; c < row.cells.length; c++) {
        if (row.cells[c].content.includes('ramas de fo')) {
          console.log(`Tab ${t}, Row ${r}, Cell ${c}`);
          console.log(JSON.stringify(row.cells[c], null, 2));
        }
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
