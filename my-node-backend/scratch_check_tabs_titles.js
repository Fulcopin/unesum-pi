const db = require('./src/models');

async function main() {
  const s = await db.SyllabusComisionAcademica.findByPk(25);
  const data = JSON.parse(s.datos_syllabus);
  
  for (let t = 0; t < data.tabs.length; t++) {
    console.log(`Tab ${t}: ${data.tabs[t].title}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));
