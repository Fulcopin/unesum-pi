const db = require('./src/models');

async function main() {
  const template = await db.Syllabus.findByPk(35);
  const data = typeof template.datos_syllabus === 'string' ? JSON.parse(template.datos_syllabus) : template.datos_syllabus;
  
  for (let r = 0; r < 5; r++) {
    const row = data.tabs[0].rows[r];
    if (row) {
      console.log(`Row ${r}:`);
      for (let c = 0; c < row.cells.length; c++) {
        const cell = row.cells[c];
        console.log(`  [${c}] content="${cell.content}", isLocked=${cell.isLocked}, bg="${cell.backgroundColor || cell.styles?.backgroundColor}"`);
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
