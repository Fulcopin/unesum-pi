const db = require('./src/models');

async function main() {
  const adminSyllabi = await db.Syllabus.findAll({
    order: [['updatedAt', 'DESC']],
    limit: 5
  });

  for (const template of adminSyllabi) {
    if (!template.asignatura_id) { // Master template
      console.log('Found Master Syllabus ID:', template.id);
      const data = typeof template.datos_syllabus === 'string' ? JSON.parse(template.datos_syllabus) : template.datos_syllabus;
      
      for (const row of data.tabs[0].rows) {
        if (row.cells[0] && row.cells[0].content.includes('Horas de trabajo')) {
          console.log(`Row: ${row.cells[0].content}`);
          for (let i=0; i<row.cells.length; i++) {
            console.log(` Cell ${i}: content="${row.cells[i].content}", isLocked=${row.cells[i].isLocked}`);
          }
        }
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
