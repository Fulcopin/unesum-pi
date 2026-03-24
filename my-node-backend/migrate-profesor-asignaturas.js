// migrate-profesor-asignaturas.js
// Crea la tabla profesor_asignaturas y migra los datos existentes de asignatura_id

const { sequelize, Profesor, ProfesorAsignatura } = require('./src/models');

async function migrate() {
  try {
    // 1. Crear la tabla si no existe
    await ProfesorAsignatura.sync({ force: false });
    console.log('✅ Tabla profesor_asignaturas creada/verificada.');

    // 2. Obtener todos los profesores con asignatura_id asignada
    const profesores = await Profesor.findAll({
      where: {
        asignatura_id: {
          [require('sequelize').Op.ne]: null
        }
      },
      attributes: ['id', 'asignatura_id'],
      paranoid: false
    });

    console.log(`📋 Encontrados ${profesores.length} profesores con asignatura_id.`);

    let migrados = 0;
    let yaExistentes = 0;

    for (const prof of profesores) {
      try {
        const [record, created] = await ProfesorAsignatura.findOrCreate({
          where: {
            profesor_id: prof.id,
            asignatura_id: prof.asignatura_id
          }
        });
        if (created) {
          migrados++;
        } else {
          yaExistentes++;
        }
      } catch (err) {
        console.error(`❌ Error migrando profesor ${prof.id}:`, err.message);
      }
    }

    console.log(`✅ Migración completada: ${migrados} registros nuevos, ${yaExistentes} ya existían.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migrate();
