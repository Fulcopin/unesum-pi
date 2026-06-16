const db = require('./src/models');

async function main() {
  const s = await db.SyllabusComisionAcademica.findByPk(25);
  const data = JSON.parse(s.datos_syllabus);
  
  for (let r = 0; r < data.tabs[0].rows.length; r++) {
    const row = data.tabs[0].rows[r];
    for (let c = 0; c < row.cells.length; c++) {
      if (row.cells[c].rowSpan > 1) {
        console.log(`Row ${r}, Cell ${c}: content="${row.cells[c].content}", rowSpan=${row.cells[c].rowSpan}`);
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
