const { Sequelize } = require('sequelize');
const config = require('./src/config/database.js');
const fs = require('fs');
const path = require('path');

// Obtener configuración de desarrollo
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Crear instancia de Sequelize
let sequelize;
if (dbConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable], {
    dialect: dbConfig.dialect,
    logging: console.log,
    dialectOptions: dbConfig.dialectOptions || {}
  });
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      dialect: dbConfig.dialect,
      logging: console.log,
      dialectOptions: dbConfig.dialectOptions || {}
    }
  );
}

async function ejecutarMigracion() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'add-asignatura-id-columns.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Ejecutando script SQL...\n');
    
    // Ejecutar el script
    await sequelize.query(sqlScript);

    console.log('\n✅ Script ejecutado exitosamente');
    console.log('📋 Columna asignatura_id agregada a:');
    console.log('   - syllabi');
    console.log('   - programas_analiticos');

  } catch (error) {
    console.error('❌ Error al ejecutar migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔒 Conexión cerrada');
  }
}

ejecutarMigracion();
