/**
 * Script de migración: pobla las tablas M2M profesor_niveles y profesor_paralelos
 * con los datos ya existentes en la columna nivel_id / paralelo_id de profesores.
 *
 * Uso:
 *   cd my-node-backend
 *   node migrations/run-migration.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize, DataTypes } = require('sequelize');
const env = require('../src/config/env');

const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

// ── Modelos mínimos ────────────────────────────────────────────────
const Profesor = sequelize.define('profesores', {
  id:         { type: DataTypes.INTEGER, primaryKey: true },
  nivel_id:   { type: DataTypes.BIGINT, allowNull: true },
  paralelo_id:{ type: DataTypes.BIGINT, allowNull: true },
}, { tableName: 'profesores', schema: 'public', timestamps: false, paranoid: true });

const ProfesorNivel = sequelize.define('profesor_niveles', {
  id:          { autoIncrement: true, type: DataTypes.INTEGER, primaryKey: true },
  profesor_id: { type: DataTypes.INTEGER, allowNull: false },
  nivel_id:    { type: DataTypes.BIGINT,  allowNull: false },
}, { tableName: 'profesor_niveles', schema: 'public', timestamps: true });

const ProfesorParalelo = sequelize.define('profesor_paralelos', {
  id:          { autoIncrement: true, type: DataTypes.INTEGER, primaryKey: true },
  profesor_id: { type: DataTypes.INTEGER, allowNull: false },
  paralelo_id: { type: DataTypes.BIGINT,  allowNull: false },
}, { tableName: 'profesor_paralelos', schema: 'public', timestamps: true });

// ── Migración ──────────────────────────────────────────────────────
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    // Crear tablas si no existen
    await ProfesorNivel.sync({ force: false });
    await ProfesorParalelo.sync({ force: false });
    console.log('✅ Tablas profesor_niveles y profesor_paralelos verificadas/creadas.');

    // Obtener todos los profesores con nivel_id o paralelo_id
    const profesores = await Profesor.findAll({
      where: {
        [Sequelize.Op.or]: [
          { nivel_id:   { [Sequelize.Op.ne]: null } },
          { paralelo_id:{ [Sequelize.Op.ne]: null } },
        ]
      },
      paranoid: false,
    });

    console.log(`📋 ${profesores.length} profesor(es) con nivel/paralelo encontrados.`);

    let nivelesInsertados  = 0;
    let paralelosInsertados = 0;
    let nivelesOmitidos    = 0;
    let paralelosOmitidos  = 0;

    for (const prof of profesores) {
      // Migrar nivel_id
      if (prof.nivel_id) {
        const [, created] = await ProfesorNivel.findOrCreate({
          where: { profesor_id: prof.id, nivel_id: prof.nivel_id },
          defaults: { profesor_id: prof.id, nivel_id: prof.nivel_id },
        });
        if (created) nivelesInsertados++;
        else nivelesOmitidos++;
      }

      // Migrar paralelo_id
      if (prof.paralelo_id) {
        const [, created] = await ProfesorParalelo.findOrCreate({
          where: { profesor_id: prof.id, paralelo_id: prof.paralelo_id },
          defaults: { profesor_id: prof.id, paralelo_id: prof.paralelo_id },
        });
        if (created) paralelosInsertados++;
        else paralelosOmitidos++;
      }
    }

    console.log('\n📊 Resultado de la migración:');
    console.log(`   profesor_niveles  → ${nivelesInsertados} insertados, ${nivelesOmitidos} ya existían`);
    console.log(`   profesor_paralelos→ ${paralelosInsertados} insertados, ${paralelosOmitidos} ya existían`);

    // Verificar totales
    const totalNiveles   = await ProfesorNivel.count();
    const totalParalelos = await ProfesorParalelo.count();
    console.log(`\n✅ Totales finales:`);
    console.log(`   profesor_niveles:   ${totalNiveles} registros`);
    console.log(`   profesor_paralelos: ${totalParalelos} registros`);

    console.log('\n🎉 Migración completada exitosamente.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    if (error.original) console.error('   Detalle:', error.original.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
