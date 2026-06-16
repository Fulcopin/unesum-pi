const db = require('./src/models');

async function main() {
  const syllabi = await db.SyllabusComisionAcademica.findAll({
    order: [['updatedAt', 'DESC']],
    limit: 5
  });

  for (const s of syllabi) {
    if (s.datos_syllabus.includes('Realiza programas')) {
      console.log('Found in SyllabusComision ID:', s.id, s.asignatura_id, s.periodo);
      const data = JSON.parse(s.datos_syllabus);
      const row = data.tabs[0].rows.find(r => r.cells.some(c => c.content.includes('Horas de docencia')));
      if (row) {
        console.log('Row:', JSON.stringify(row.cells.map(c => ({ content: c.content, colSpan: c.colSpan, rowSpan: c.rowSpan })), null, 2));
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
