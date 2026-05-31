const db = require('./src/models');
const { Syllabus, SyllabusComisionAcademica, SyllabusDocente } = db;

async function run() {
  try {
    console.log("=== Checking Syllabus records ===");
    const syllabi = await Syllabus.findAll({ limit: 5 });
    for (const s of syllabi) {
      console.log(`Syllabus ID: ${s.id}, Name: ${s.nombre}`);
      let datos = s.datos_syllabus;
      if (typeof datos === 'string') datos = JSON.parse(datos);
      if (datos && datos.tabs) {
        for (const tab of datos.tabs) {
          const matchedRows = tab.rows.filter(r => r.cells.some(c => c.content.includes("Total horas de la asignatura")));
          if (matchedRows.length > 0) {
            console.log(`  Tab: ${tab.title} has ${matchedRows.length} rows containing "Total horas de la asignatura"`);
            matchedRows.forEach(mr => {
              console.log(`    Row ID ${mr.id}:`, mr.cells.map(c => `[${c.content}]`).join(', '));
            });
          }
        }
      }
    }

    console.log("\n=== Checking SyllabusComisionAcademica records ===");
    const comisionSyllabi = await SyllabusComisionAcademica.findAll({ limit: 5 });
    for (const s of comisionSyllabi) {
      console.log(`Comision Syllabus ID: ${s.id}, Name: ${s.nombre}, Asignatura: ${s.asignatura_id}`);
      let datos = s.datos_syllabus;
      if (typeof datos === 'string') datos = JSON.parse(datos);
      if (datos && datos.tabs) {
        for (const tab of datos.tabs) {
          const matchedRows = tab.rows.filter(r => r.cells.some(c => c.content.includes("Total horas de la asignatura")));
          if (matchedRows.length > 0) {
            console.log(`  Tab: ${tab.title} has ${matchedRows.length} rows containing "Total horas de la asignatura"`);
            matchedRows.forEach(mr => {
              console.log(`    Row ID ${mr.id}:`, mr.cells.map(c => `[${c.content}]`).join(', '));
            });
          }
        }
      }
    }

    console.log("\n=== Checking SyllabusDocente records ===");
    const docenteSyllabi = await SyllabusDocente.findAll({ limit: 5 });
    for (const s of docenteSyllabi) {
      console.log(`Docente Syllabus ID: ${s.id}, Name: ${s.nombre}, Profesor: ${s.profesor_id}`);
      let datos = s.datos_syllabus;
      if (typeof datos === 'string') datos = JSON.parse(datos);
      if (datos && datos.tabs) {
        for (const tab of datos.tabs) {
          const matchedRows = tab.rows.filter(r => r.cells.some(c => c.content.includes("Total horas de la asignatura")));
          if (matchedRows.length > 0) {
            console.log(`  Tab: ${tab.title} has ${matchedRows.length} rows containing "Total horas de la asignatura"`);
            matchedRows.forEach(mr => {
              console.log(`    Row ID ${mr.id}:`, mr.cells.map(c => `[${c.content}]`).join(', '));
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
