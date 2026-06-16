const db = require('./src/models');

async function main() {
  const s = await db.SyllabusComisionAcademica.findByPk(25);
  const data = JSON.parse(s.datos_syllabus);
  
  const ids = new Set();
  const duplicateIds = new Set();
  for (let t = 0; t < data.tabs.length; t++) {
    for (let r = 0; r < data.tabs[t].rows.length; r++) {
      const row = data.tabs[t].rows[r];
      if (ids.has(row.id)) duplicateIds.add(row.id);
      ids.add(row.id);
      for (let c = 0; c < row.cells.length; c++) {
        if (ids.has(row.cells[c].id)) duplicateIds.add(row.cells[c].id);
        ids.add(row.cells[c].id);
      }
    }
  }
  console.log('Duplicates:', Array.from(duplicateIds));
}
main().catch(console.error).finally(() => process.exit(0));
