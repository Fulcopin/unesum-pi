const db = require('./src/models');

async function main() {
  const syllabi = await db.SyllabusComisionAcademica.findAll();
  let foundCorrupt = false;
  for (const s of syllabi) {
    if (!s.datos_syllabus) continue;
    const data = typeof s.datos_syllabus === 'string' ? JSON.parse(s.datos_syllabus) : s.datos_syllabus;
    if (!data.tabs || !data.tabs[0]) continue;
    
    for (const row of data.tabs[0].rows) {
      if (row.cells && row.cells[0] && row.cells[0].content.includes('Horas de docencia')) {
        if (row.cells.length > 1 && row.cells[1].content.includes('Realiza')) {
          console.log(`FOUND CORRUPTED ROW IN DB! ID: ${s.id}`);
          console.log(JSON.stringify(row, null, 2));
          foundCorrupt = true;
          
          // Let's fix it right here!
          row.cells[1].content = ':';
          if (row.cells[2]) row.cells[2].content = '70'; // Or empty if we don't know
          
          s.datos_syllabus = JSON.stringify(data);
          await s.save();
          console.log('Fixed in DB!');
        }
      }
    }
  }
  if (!foundCorrupt) console.log('No corrupted rows found in DB.');
}
main().catch(console.error).finally(() => process.exit(0));
