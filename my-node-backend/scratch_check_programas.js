const db = require('./src/models');

async function main() {
  const programas = await db.ProgramaAnalitico.findAll({
    order: [['updatedAt', 'DESC']],
    limit: 5
  });

  for (const s of programas) {
    if (s.datos_programa && s.datos_programa.includes('Realiza programas')) {
      console.log('Found in ProgramaAnalitico ID:', s.id, s.asignatura_id, s.periodo);
      const data = typeof s.datos_programa === 'string' ? JSON.parse(s.datos_programa) : s.datos_programa;
      const row = data.tabs[0].rows.find(r => r.cells.some(c => c.content.includes('Horas de docencia')));
      if (row) {
        console.log('Row:', JSON.stringify(row.cells.map(c => ({ content: c.content, colSpan: c.colSpan, textOrientation: c.textOrientation, styles: c.styles })), null, 2));
      }
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
