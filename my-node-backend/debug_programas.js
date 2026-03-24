const { sequelize } = require('./src/models');
async function main() {
  const [rows] = await sequelize.query(`
    SELECT id, nombre, asignatura_id, periodo
    FROM programas_analiticos 
    ORDER BY id DESC LIMIT 15
  `);
  console.log('PROGRAMAS:\n', JSON.stringify(rows, null, 2));
  
  const [asigs] = await sequelize.query(`SELECT id, nombre, codigo FROM asignaturas LIMIT 15`);
  console.log('ASIGNATURAS:\n', JSON.stringify(asigs, null, 2));
  
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
