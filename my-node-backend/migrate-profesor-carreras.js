// Script para crear la tabla profesor_carreras y migrar datos existentes
const db = require('./src/models');

async function migrate() {
  try {
    // Crear la tabla
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.profesor_carreras (
        id SERIAL PRIMARY KEY,
        profesor_id INTEGER NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
        carrera_id INTEGER NOT NULL REFERENCES carreras(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(profesor_id, carrera_id)
      );
    `);
    console.log('✅ Tabla profesor_carreras creada correctamente');

    // Crear índices
    await db.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_profesor_carreras_profesor ON public.profesor_carreras(profesor_id);`);
    await db.sequelize.query(`CREATE INDEX IF NOT EXISTS idx_profesor_carreras_carrera ON public.profesor_carreras(carrera_id);`);
    console.log('✅ Índices creados');

    // Migrar datos existentes
    await db.sequelize.query(`
      INSERT INTO profesor_carreras (profesor_id, carrera_id, "createdAt", "updatedAt")
      SELECT id, carrera_id, NOW(), NOW() FROM profesores
      WHERE carrera_id IS NOT NULL AND "deletedAt" IS NULL
      ON CONFLICT (profesor_id, carrera_id) DO NOTHING;
    `);
    console.log('✅ Datos migrados: carreras existentes copiadas a profesor_carreras');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

migrate();
