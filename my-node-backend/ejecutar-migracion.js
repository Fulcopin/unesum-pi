require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: console.log
});

async function migrar() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    console.log('\n📝 Agregando columnas faltantes...');

    // Agregar es_eliminado
    await sequelize.query(`
      ALTER TABLE programas_analiticos 
      ADD COLUMN IF NOT EXISTS es_eliminado BOOLEAN DEFAULT false;
    `);
    console.log('✅ Columna es_eliminado agregada');

    // Agregar nombre_programa
    await sequelize.query(`
      ALTER TABLE programas_analiticos 
      ADD COLUMN IF NOT EXISTS nombre_programa VARCHAR(255);
    `);
    console.log('✅ Columna nombre_programa verificada');

    // Agregar periodo
    await sequelize.query(`
      ALTER TABLE programas_analiticos 
      ADD COLUMN IF NOT EXISTS periodo VARCHAR(50);
    `);
    console.log('✅ Columna periodo verificada');

    // Crear índices
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_programas_analiticos_es_eliminado 
      ON programas_analiticos(es_eliminado);
    `);
    console.log('✅ Índice es_eliminado creado');

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_programas_analiticos_asignatura_periodo 
      ON programas_analiticos(asignatura_id, periodo) 
      WHERE es_eliminado = false;
    `);
    console.log('✅ Índice asignatura_periodo creado');

    // Verificar estructura
    console.log('\n📊 Estructura de la tabla programas_analiticos:');
    const [columns] = await sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'programas_analiticos'
      ORDER BY ordinal_position;
    `);

    console.table(columns);

    // Contar registros
    const [count] = await sequelize.query(`
      SELECT COUNT(*) as total FROM programas_analiticos;
    `);
    console.log(`\n📈 Total de registros: ${count[0].total}`);

    console.log('\n✅ ¡Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

migrar();
