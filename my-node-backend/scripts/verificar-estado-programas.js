/**
 * Script simple para verificar el estado actual de programas y plantillas
 */

const { sequelize } = require('../src/config/db');

async function verificarEstado() {
  try {
    console.log('🔍 Verificando estado actual...\n');

    // 1. Programas analíticos
    console.log('📊 PROGRAMAS ANALÍTICOS:');
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
      console.log(`Total: ${programas.length} programas\n`);
      
      const conPlantilla = programas.filter(p => p.plantilla_id !== null).length;
      const sinPlantilla = programas.filter(p => p.plantilla_id === null).length;
      console.log(`✅ Con plantilla: ${conPlantilla}`);
      console.log(`⚠️  Sin plantilla: ${sinPlantilla}\n`);
    } else {
      console.log('⚠️  No hay programas analíticos\n');
    }

    // 2. Plantillas disponibles
    console.log('📚 PLANTILLAS DISPONIBLES:');
    const [plantillas] = await sequelize.query(`
      SELECT 
        id,
        nombre,
        tipo,
        activa,
        created_at as fecha_creacion
      FROM plantillas_programa
      ORDER BY id DESC
      LIMIT 10
    `);
    
    if (plantillas.length > 0) {
      console.table(plantillas);
      console.log(`Total: ${plantillas.length} plantillas\n`);
    } else {
      console.log('⚠️  No hay plantillas creadas\n');
    }

    // 3. Secciones de plantillas
    console.log('📋 SECCIONES DE PLANTILLAS:');
    const [secciones] = await sequelize.query(`
      SELECT 
        sp.id,
        pp.nombre as plantilla,
        sp.nombre as seccion,
        sp.tipo,
        sp.orden,
        (SELECT COUNT(*) FROM campos_seccion WHERE seccion_id = sp.id) as num_campos
      FROM secciones_plantilla sp
      JOIN plantillas_programa pp ON pp.id = sp.plantilla_id
      ORDER BY sp.plantilla_id, sp.orden
      LIMIT 20
    `);
    
    if (secciones.length > 0) {
      console.table(secciones);
    } else {
      console.log('⚠️  No hay secciones de plantillas\n');
    }

    // 4. Asignaciones a docentes
    console.log('👤 ASIGNACIONES A DOCENTES:');
    const [asignaciones] = await sequelize.query(`
      SELECT 
        apd.id,
        pa.nombre as programa,
        p.nombres || ' ' || p.apellidos as docente,
        apd.estado,
        apd.fecha_asignacion
      FROM asignaciones_programa_docente apd
      JOIN programas_analiticos pa ON pa.id = apd.programa_analitico_id
      JOIN profesores p ON p.id = apd.profesor_id
      ORDER BY apd.id DESC
      LIMIT 10
    `);
    
    if (asignaciones.length > 0) {
      console.table(asignaciones);
    } else {
      console.log('⚠️  No hay asignaciones a docentes\n');
    }

    console.log('✅ Verificación completada\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

verificarEstado();
