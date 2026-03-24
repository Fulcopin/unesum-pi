/**
 * Script de verificación del flujo completo
 * Ejecutar desde: my-node-backend
 * Comando: node scripts/verificar-flujo-completo.js
 */

const { sequelize } = require('../src/config/db');
const { 
  PlantillaPrograma, 
  SeccionPlantilla, 
  CampoSeccion,
  ProgramasAnaliticos
} = require('../src/models');

async function verificarFlujo() {
  console.log('🔍 VERIFICACIÓN DEL FLUJO COMPLETO\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Verificar conexión a BD
    console.log('\n1️⃣  VERIFICANDO CONEXIÓN A BASE DE DATOS...');
    await sequelize.authenticate();
    console.log('   ✅ Conexión exitosa');

    // 2. Verificar tablas
    console.log('\n2️⃣  VERIFICANDO EXISTENCIA DE TABLAS...');
    const tablas = [
      'plantillas_programa',
      'secciones_plantilla',
      'campos_seccion',
      'programas_analiticos',
      'contenido_programa',
      'filas_tabla_programa',
      'valores_campo_programa'
    ];

    for (const tabla of tablas) {
      const [results] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${tabla}'
        );
      `);
      const existe = results[0].exists;
      console.log(`   ${existe ? '✅' : '❌'} ${tabla}`);
    }

    // 3. Contar plantillas
    console.log('\n3️⃣  VERIFICANDO PLANTILLAS...');
    const totalPlantillas = await PlantillaPrograma.count();
    console.log(`   📋 Total de plantillas: ${totalPlantillas}`);
    
    if (totalPlantillas > 0) {
      const plantillas = await PlantillaPrograma.findAll({
        attributes: ['id', 'nombre', 'created_at'],
        limit: 5
      });
      
      console.log('\n   Plantillas disponibles:');
      plantillas.forEach(p => {
        console.log(`   - ID: ${p.id}, Nombre: ${p.nombre}`);
      });
    } else {
      console.log('   ⚠️  No hay plantillas. Sube un Excel primero.');
    }

    // 4. Verificar secciones
    console.log('\n4️⃣  VERIFICANDO SECCIONES...');
    const totalSecciones = await SeccionPlantilla.count();
    console.log(`   📑 Total de secciones: ${totalSecciones}`);

    if (totalSecciones > 0) {
      const secciones = await SeccionPlantilla.findAll({
        attributes: ['id', 'nombre', 'tipo', 'plantilla_id'],
        limit: 10,
        order: [['plantilla_id', 'ASC'], ['orden', 'ASC']]
      });
      
      console.log('\n   Secciones por plantilla:');
      let currentPlantilla = null;
      for (const s of secciones) {
        if (s.plantilla_id !== currentPlantilla) {
          currentPlantilla = s.plantilla_id;
          console.log(`\n   Plantilla ID ${s.plantilla_id}:`);
        }
        console.log(`     - ${s.nombre} (${s.tipo})`);
      }
    }

    // 5. Verificar campos
    console.log('\n5️⃣  VERIFICANDO CAMPOS...');
    const totalCampos = await CampoSeccion.count();
    console.log(`   🏷️  Total de campos: ${totalCampos}`);

    if (totalCampos > 0) {
      const campos = await CampoSeccion.findAll({
        attributes: ['id', 'etiqueta', 'tipo_campo', 'seccion_id'],
        limit: 15,
        order: [['seccion_id', 'ASC'], ['orden', 'ASC']]
      });
      
      console.log('\n   Campos por sección:');
      let currentSeccion = null;
      for (const c of campos) {
        if (c.seccion_id !== currentSeccion) {
          currentSeccion = c.seccion_id;
          console.log(`\n   Sección ID ${c.seccion_id}:`);
        }
        console.log(`     - ${c.etiqueta} (${c.tipo_campo})`);
      }
    }

    // 6. Verificar programas con plantillas
    console.log('\n6️⃣  VERIFICANDO PROGRAMAS CON PLANTILLAS...');
    const programasConPlantilla = await ProgramasAnaliticos.count({
      where: {
        plantilla_id: {
          [require('sequelize').Op.ne]: null
        }
      }
    });
    
    console.log(`   📚 Programas con plantilla: ${programasConPlantilla}`);

    if (programasConPlantilla > 0) {
      const programas = await ProgramasAnaliticos.findAll({
        where: {
          plantilla_id: {
            [require('sequelize').Op.ne]: null
          }
        },
        attributes: ['id', 'nombre', 'plantilla_id', 'created_at'],
        limit: 5,
        order: [['created_at', 'DESC']]
      });

      console.log('\n   Programas disponibles para docentes:');
      programas.forEach(p => {
        console.log(`   - ID: ${p.id}, Nombre: ${p.nombre}, Plantilla ID: ${p.plantilla_id}`);
      });
    } else {
      console.log('   ⚠️  No hay programas con plantilla asignada.');
      console.log('   💡 Los programas deben tener plantilla_id para que los docentes los vean.');
    }

    // 7. Verificar contenido guardado
    console.log('\n7️⃣  VERIFICANDO CONTENIDO GUARDADO POR DOCENTES...');
    const [contenidoResults] = await sequelize.query(`
      SELECT COUNT(*) as total FROM contenido_programa
    `);
    const totalContenido = contenidoResults[0].total;
    console.log(`   💾 Total de contenidos guardados: ${totalContenido}`);

    if (totalContenido > 0) {
      const [ultimos] = await sequelize.query(`
        SELECT 
          cp.id,
          cp.programa_id,
          cp.seccion_id,
          cp.profesor_id,
          CASE 
            WHEN cp.contenido_texto IS NOT NULL THEN 'texto'
            ELSE 'tabla'
          END as tipo_contenido,
          cp.created_at
        FROM contenido_programa cp
        ORDER BY cp.created_at DESC
        LIMIT 5
      `);

      console.log('\n   Últimos contenidos guardados:');
      ultimos.forEach(c => {
        console.log(`   - Programa ${c.programa_id}, Sección ${c.seccion_id}, Profesor ${c.profesor_id} (${c.tipo_contenido})`);
      });
    }

    // 8. Verificar filas de tablas
    console.log('\n8️⃣  VERIFICANDO FILAS DE TABLAS...');
    const [filasResults] = await sequelize.query(`
      SELECT COUNT(*) as total FROM filas_tabla_programa
    `);
    const totalFilas = filasResults[0].total;
    console.log(`   📊 Total de filas: ${totalFilas}`);

    // 9. Verificar valores de campos
    console.log('\n9️⃣  VERIFICANDO VALORES DE CAMPOS...');
    const [valoresResults] = await sequelize.query(`
      SELECT COUNT(*) as total FROM valores_campo_programa
    `);
    const totalValores = valoresResults[0].total;
    console.log(`   🔢 Total de valores guardados: ${totalValores}`);

    // RESUMEN
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DEL SISTEMA\n');
    console.log(`   Plantillas creadas:          ${totalPlantillas}`);
    console.log(`   Secciones definidas:         ${totalSecciones}`);
    console.log(`   Campos configurados:         ${totalCampos}`);
    console.log(`   Programas con plantilla:     ${programasConPlantilla}`);
    console.log(`   Contenidos guardados:        ${totalContenido}`);
    console.log(`   Filas de tablas:             ${totalFilas}`);
    console.log(`   Valores en campos:           ${totalValores}`);

    // DIAGNÓSTICO
    console.log('\n' + '='.repeat(60));
    console.log('🔧 DIAGNÓSTICO\n');

    if (totalPlantillas === 0) {
      console.log('   ❌ NO HAY PLANTILLAS');
      console.log('   💡 Acción: Sube un Excel como administrador en /admin/editor-tablas');
      console.log('   📍 Endpoint: POST /api/programa-analitico/upload');
    } else if (programasConPlantilla === 0) {
      console.log('   ⚠️  HAY PLANTILLAS PERO NO HAY PROGRAMAS VINCULADOS');
      console.log('   💡 Acción: Los programas deben tener plantilla_id no nulo');
      console.log('   📍 Verifica que uploadExcel() esté asignando plantilla_id');
    } else if (totalContenido === 0) {
      console.log('   ⚠️  HAY PROGRAMAS PERO LOS DOCENTES NO HAN LLENADO CONTENIDO');
      console.log('   💡 Acción: Los docentes deben acceder a /docente/programa-analitico');
      console.log('   📍 Endpoint: POST /api/programa-analitico/:id/guardar-contenido');
    } else {
      console.log('   ✅ SISTEMA FUNCIONANDO CORRECTAMENTE');
      console.log('   🎉 El flujo completo está operativo');
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n👋 Conexión cerrada\n');
  }
}

// Ejecutar
verificarFlujo();
