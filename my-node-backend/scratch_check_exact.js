const db = require('./src/models');

async function main() {
  const syllabi = await db.SyllabusComisionAcademica.findAll({
    order: [['updatedAt', 'DESC']],
    limit: 5
  });

  for (const s of syllabi) {
    if (s.datos_syllabus.includes('ramas de fo')) {
      console.log('Found "ramas de fo" in SyllabusComision ID:', s.id);
    }
  }
}
main().catch(console.error).finally(() => process.exit(0));
