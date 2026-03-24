const { Sequelize } = require('sequelize');

const db = new Sequelize(process.env.DATABASE_URL || 'postgresql://neondb_owner:kzLgI4A3v3q7@ep-little-tree-a5dxwmfq.us-east-2.aws.neon.tech/neondb?sslmode=require', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function verificar() {
  try {
    await db.authenticate();
    console.log('✅ Conexión establecida');
    
    const [results] = await db.query(`
      SELECT 
        id, 
        nombre_programa, 
        asignatura_id, 
        periodo,
        LENGTH(datos_tabla::text) as json_size,
        (datos_tabla::jsonb)->'secciones' as secciones_preview
      FROM programas_analiticos 
      WHERE asignatura_id = 31 
        AND es_eliminado = false 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    console.log('\n📊 PROGRAMA EN BASE DE DATOS:');
    console.log(JSON.stringify(results, null, 2));
    
    if (results.length > 0) {
      console.log('\n✅ Hay un programa guardado para asignatura_id = 31');
      console.log(`   - ID: ${results[0].id}`);
      console.log(`   - Nombre: ${results[0].nombre_programa}`);
      console.log(`   - Periodo: ${results[0].periodo}`);
      console.log(`   - Tamaño JSON: ${results[0].json_size} caracteres`);
      
      if (results[0].secciones_preview) {
        const secciones = JSON.parse(results[0].secciones_preview);
        console.log(`   - Número de secciones: ${secciones.length}`);
        console.log('\n📋 Primeras 3 secciones:');
        secciones.slice(0, 3).forEach((sec, i) => {
          console.log(`   ${i + 1}. ${sec.nombre} - ${sec.campos?.length || 0} campos`);
        });
      }
    } else {
      console.log('\n⚠️ NO hay programa guardado para asignatura_id = 31');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

verificar();
