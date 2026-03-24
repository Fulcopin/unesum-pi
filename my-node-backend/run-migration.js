const { sequelize } = require('./src/models');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración: add_periodo_to_programas_analiticos...');
    
    const migrationPath = path.join(__dirname, 'migrations', '20260204_add_periodo_to_programas_analiticos.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    await sequelize.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente');
    console.log('   - Columna "periodo" agregada a programas_analiticos');
    console.log('   - Índices creados');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al ejecutar migración:', error);
    process.exit(1);
  }
}

runMigration();
