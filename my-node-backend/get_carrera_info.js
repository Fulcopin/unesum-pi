require('dotenv').config();
const db = require('./src/models');
async function run() {
  try {
    const carrera = await db.Carrera.findByPk(28, { include: ['facultad'] });
    console.log("CARRERA 28:", carrera ? carrera.nombre : null, "FACULTAD:", carrera?.facultad?.nombre);

    const orgs = await db.Organizacion.findAll();
    console.log("ORGANIZACIONES:", orgs.map(o => o.get({plain:true})));

    const niveles = await db.Nivel.findAll({ order: [['codigo', 'ASC']] });
    console.log("NIVELES:", niveles.map(n => ({ id: n.id, nombre: n.nombre, codigo: n.codigo })));

    const asigs = await db.Asignatura.findAll({
      where: { carrera_id: 28 },
      include: [
        { model: db.Nivel, as: 'nivel' },
        { model: db.Organizacion, as: 'organizacion' },
        { model: db.DistribucionHoras, as: 'horas' },
        {
          model: db.AsignaturaRequisito,
          as: 'asignatura_requisitos',
          include: [{ model: db.Asignatura, as: 'requisito', attributes: ['codigo'] }]
        }
      ],
      order: [['codigo', 'ASC']]
    });
    console.log(`TOTAL ASIGS FOR CARRERA 28: ${asigs.length}`);
    for (const a of asigs.slice(0, 5)) {
      console.log(`${a.codigo} - ${a.nombre} (Nivel: ${a.nivel?.nombre}, Org: ${a.organizacion?.nombre})`);
    }
  } catch(e) {
    console.error("ERROR:", e);
  }
  process.exit(0);
}
run();
