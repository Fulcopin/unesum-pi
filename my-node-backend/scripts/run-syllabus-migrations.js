// Script para ejecutar las migraciones de Syllabus
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL (Neon)');

    // Leer y ejecutar migración de titulos_extraidos_syllabus
    const sql1 = fs.readFileSync(
      path.join(__dirname, '../migrations/create-titulos-extraidos-syllabus.sql'),
      'utf8'
    );
    await client.query(sql1);
    console.log('✅ Tabla titulos_extraidos_syllabus creada exitosamente');

    // Leer y ejecutar migración de agrupaciones_titulos_syllabus
    const sql2 = fs.readFileSync(
      path.join(__dirname, '../migrations/create-agrupaciones-titulos-syllabus.sql'),
      'utf8'
    );
    await client.query(sql2);
    console.log('✅ Tabla agrupaciones_titulos_syllabus creada exitosamente');

    console.log('\n🎉 ¡Todas las migraciones de Syllabus ejecutadas correctamente!');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
