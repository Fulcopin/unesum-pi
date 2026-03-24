const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function verificarProgramas() {
  try {
    console.log('🔍 Conectando a la base de datos...\n');
    
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

    // 1. Verificar programas analíticos
    console.log('📋 PROGRAMAS ANALÍTICOS:');
    console.log('='.repeat(60));
    const [programas] = await sequelize.query(`
      SELECT 
        id,
        nombre,
        plantilla_id,
        usuario_id,
        "createdAt"::date as fecha_creacion
      FROM programas_analiticos
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    
    if (programas.length === 0) {
      console.log('❌ No hay programas analíticos en la BD\n');
    } else {
      console.table(programas);
      console.log(`Total: ${programas.length} programa(s)\n`);
    }

    // 2. Verificar plantillas
    console.log('📐 PLANTILLAS DE PROGRAMA:');
    console.log('='.repeat(60));
    const [plantillas] = await sequelize.query(`
      SELECT 
        id,
        nombre,
        tipo,
        activa,
        created_at::date as fecha_creacion
      FROM plantillas_programa
      ORDER BY created_at DESC
    `);
    
    if (plantillas.length === 0) {
      console.log('❌ No hay plantillas en la BD\n');
    } else {
      console.table(plantillas);
      console.log(`Total: ${plantillas.length} plantilla(s)\n`);
    }

    // 3. Verificar secciones de plantillas
    console.log('📝 SECCIONES DE PLANTILLAS:');
    console.log('='.repeat(60));
    const [secciones] = await sequelize.query(`
      SELECT 
        pp.nombre as plantilla,
        sp.nombre as seccion,
        sp.tipo,
        sp.orden
      FROM secciones_plantilla sp
      JOIN plantillas_programa pp ON sp.plantilla_id = pp.id
      ORDER BY pp.id, sp.orden
    `);
    
    if (secciones.length === 0) {
      console.log('❌ No hay secciones en las plantillas\n');
    } else {
      console.table(secciones);
      console.log(`Total: ${secciones.length} sección(es)\n`);
    }

    // 4. Verificar campos
    console.log('🔹 CAMPOS DE SECCIONES:');
    console.log('='.repeat(60));
    const [campos] = await sequelize.query(`
      SELECT 
        pp.nombre as plantilla,
        sp.nombre as seccion,
        cs.etiqueta,
        cs.tipo_campo,
        cs.orden
      FROM campos_seccion cs
      JOIN secciones_plantilla sp ON cs.seccion_id = sp.id
      JOIN plantillas_programa pp ON sp.plantilla_id = pp.id
      ORDER BY pp.id, sp.orden, cs.orden
      LIMIT 20
    `);
    
    if (campos.length === 0) {
      console.log('❌ No hay campos definidos\n');
    } else {
      console.table(campos);
      console.log(`Total: ${campos.length} campo(s) (mostrando primeros 20)\n`);
    }

    // 5. Programas CON plantilla
    console.log('✅ PROGRAMAS CON PLANTILLA ASIGNADA:');
    console.log('='.repeat(60));
    const [programasConPlantilla] = await sequelize.query(`
      SELECT 
        pa.id,
        pa.nombre as programa,
        pp.nombre as plantilla,
        pa."createdAt"::date as fecha
      FROM programas_analiticos pa
      INNER JOIN plantillas_programa pp ON pa.plantilla_id = pp.id
      ORDER BY pa."createdAt" DESC
    `);
    
    if (programasConPlantilla.length === 0) {
      console.log('⚠️ No hay programas con plantilla asignada\n');
      console.log('💡 Esto significa que los programas existen pero no tienen plantilla_id');
    } else {
      console.table(programasConPlantilla);
      console.log(`Total: ${programasConPlantilla.length} programa(s) con plantilla\n`);
    }

    // 6. Resumen
    console.log('📊 RESUMEN:');
    console.log('='.repeat(60));
    const [resumen] = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM programas_analiticos) as total_programas,
        (SELECT COUNT(*) FROM programas_analiticos WHERE plantilla_id IS NOT NULL) as programas_con_plantilla,
        (SELECT COUNT(*) FROM plantillas_programa) as total_plantillas,
        (SELECT COUNT(*) FROM secciones_plantilla) as total_secciones,
        (SELECT COUNT(*) FROM campos_seccion) as total_campos
    `);
    
    console.table(resumen);

    await sequelize.close();
    console.log('\n✅ Conexión cerrada');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verificarProgramas();
