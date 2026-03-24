/**
 * Script para ejecutar la migración de plantilla_id
 * Ejecutar con: node my-node-backend/scripts/ejecutar-migracion-plantilla.js
 */

const { sequelize } = require('../src/config/db');

async function ejecutarMigracion() {
  try {
    console.log('🚀 Iniciando migración...\n');

    // 1. Verificar si la columna existe
    const [resultadoColumna] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'programas_analiticos' 
      AND column_name = 'plantilla_id'
    `);

    if (resultadoColumna.length > 0) {
      console.log('⚠️  La columna plantilla_id ya existe en programas_analiticos');
    } else {
      // 2. Agregar la columna
      await sequelize.query(`
        ALTER TABLE programas_analiticos 
        ADD COLUMN plantilla_id INTEGER
      `);
      console.log('✅ Columna plantilla_id agregada');

      // 3. Agregar la clave foránea
      await sequelize.query(`
        ALTER TABLE programas_analiticos
        ADD CONSTRAINT programas_analiticos_plantilla_id_fkey
        FOREIGN KEY (plantilla_id) 
        REFERENCES plantillas_programa(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
      `);
      console.log('✅ Clave foránea agregada');

      // 4. Crear índice
      await sequelize.query(`
        CREATE INDEX idx_programas_analiticos_plantilla_id 
        ON programas_analiticos(plantilla_id)
      `);
      console.log('✅ Índice creado');
    }

    // 5. Verificar la estructura
    console.log('\n📋 Estructura actualizada de programas_analiticos:');
    const [columnas] = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'programas_analiticos'
      ORDER BY ordinal_position
    `);
    console.table(columnas);

    // 6. Ver programas existentes
    console.log('\n📊 Programas analíticos existentes:');
    const [programas] = await sequelize.query(`
      SELECT 
        id,
        nombre,
        plantilla_id,
        usuario_id,
        "createdAt" as fecha_creacion
      FROM programas_analiticos
      ORDER BY id DESC
      LIMIT 10
    `);
    
    if (programas.length > 0) {
      console.table(programas);
    } else {
      console.log('⚠️  No hay programas analíticos en la base de datos');
    }

    // 7. Ver plantillas disponibles
    console.log('\n📚 Plantillas disponibles:');
    const [plantillas] = await sequelize.query(`
      SELECT 
        id,
        nombre,
        tipo,
        activa,
        "createdAt" as fecha_creacion
      FROM plantillas_programa
      ORDER BY id DESC
      LIMIT 10
    `);
    
    if (plantillas.length > 0) {
      console.table(plantillas);
    } else {
      console.log('⚠️  No hay plantillas en la base de datos');
    }

    console.log('\n✅ Migración completada exitosamente\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error en la migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

ejecutarMigracion();
