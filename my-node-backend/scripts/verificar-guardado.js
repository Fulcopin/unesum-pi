/**
 * Script para verificar qué contenido está guardado en la base de datos
 * 
 * Uso:
 *   node scripts/verificar-guardado.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Configurar conexión a la base de datos
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  logging: false
});

async function verificarContenido() {
  try {
    console.log('🔍 Verificando contenido guardado en la base de datos...\n');

    // 1. Contar registros por tabla
    console.log('📊 CONTEO DE REGISTROS:');
    console.log('─'.repeat(50));
    
    const [conteos] = await sequelize.query(`
      SELECT 
        'programas_analiticos' as tabla,
        COUNT(*) as total
      FROM programas_analiticos
      UNION ALL
      SELECT 
        'plantillas_programa' as tabla,
        COUNT(*) as total
      FROM plantillas_programa
      UNION ALL
      SELECT 
        'contenido_programa' as tabla,
        COUNT(*) as total
      FROM contenido_programa
      UNION ALL
      SELECT 
        'filas_tabla_programa' as tabla,
        COUNT(*) as total
      FROM filas_tabla_programa
      UNION ALL
      SELECT 
        'valores_campo_programa' as tabla,
        COUNT(*) as total
      FROM valores_campo_programa
    `);

    conteos.forEach(row => {
      console.log(`  ${row.tabla.padEnd(30)} → ${row.total} registros`);
    });

    // 2. Ver programas con plantilla
    console.log('\n\n📋 PROGRAMAS ANALÍTICOS:');
    console.log('─'.repeat(50));
    
    const [programas] = await sequelize.query(`
      SELECT 
        pa.id,
        pa.nombre,
        pl.nombre as plantilla,
        pa.plantilla_id,
        pa.created_at
      FROM programas_analiticos pa
      LEFT JOIN plantillas_programa pl ON pa.plantilla_id = pl.id
      ORDER BY pa.id
    `);

    if (programas.length === 0) {
      console.log('  ⚠️  No hay programas analíticos creados');
    } else {
      programas.forEach(p => {
        console.log(`  ID ${p.id}: ${p.nombre}`);
        console.log(`         Plantilla: ${p.plantilla || '❌ Sin plantilla'}`);
        console.log(`         Creado: ${new Date(p.created_at).toLocaleString('es-ES')}`);
        console.log('');
      });
    }

    // 3. Ver contenido guardado
    console.log('\n💾 CONTENIDO GUARDADO POR DOCENTES:');
    console.log('─'.repeat(50));
    
    const [contenidos] = await sequelize.query(`
      SELECT 
        cp.id,
        cp.programa_id,
        pa.nombre as programa_nombre,
        sp.nombre as seccion_nombre,
        sp.tipo as seccion_tipo,
        cp.profesor_id,
        CASE 
          WHEN sp.tipo = 'texto_largo' THEN LEFT(cp.contenido_texto, 50)
          ELSE '(ver filas)'
        END as contenido_preview,
        cp.updated_at
      FROM contenido_programa cp
      INNER JOIN programas_analiticos pa ON cp.programa_id = pa.id
      INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
      ORDER BY cp.updated_at DESC
      LIMIT 10
    `);

    if (contenidos.length === 0) {
      console.log('  ⚠️  No hay contenido guardado por docentes todavía');
    } else {
      contenidos.forEach(c => {
        console.log(`  📄 Programa "${c.programa_nombre}" (ID: ${c.programa_id})`);
        console.log(`     Sección: ${c.seccion_nombre} (${c.seccion_tipo})`);
        console.log(`     Profesor ID: ${c.profesor_id}`);
        if (c.contenido_preview !== '(ver filas)') {
          console.log(`     Contenido: ${c.contenido_preview}...`);
        }
        console.log(`     Actualizado: ${new Date(c.updated_at).toLocaleString('es-ES')}`);
        console.log('');
      });
    }

    // 4. Ver valores de campos guardados (últimos 20)
    console.log('\n🔢 VALORES DE CAMPOS GUARDADOS (últimos 20):');
    console.log('─'.repeat(50));
    
    const [valores] = await sequelize.query(`
      SELECT 
        vcp.id,
        pa.nombre as programa,
        sp.nombre as seccion,
        cs.etiqueta as campo,
        vcp.valor,
        ftp.orden as fila
      FROM valores_campo_programa vcp
      INNER JOIN filas_tabla_programa ftp ON vcp.fila_id = ftp.id
      INNER JOIN contenido_programa cp ON ftp.contenido_id = cp.id
      INNER JOIN programas_analiticos pa ON cp.programa_id = pa.id
      INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
      INNER JOIN campos_seccion cs ON vcp.campo_id = cs.id
      ORDER BY vcp.id DESC
      LIMIT 20
    `);

    if (valores.length === 0) {
      console.log('  ⚠️  No hay valores guardados todavía');
    } else {
      valores.forEach(v => {
        console.log(`  📝 ${v.programa} → ${v.seccion} → ${v.campo}`);
        console.log(`     Fila ${v.fila}: "${v.valor}"`);
        console.log('');
      });
    }

    // 5. Resumen por programa
    console.log('\n📊 RESUMEN POR PROGRAMA:');
    console.log('─'.repeat(50));
    
    const [resumen] = await sequelize.query(`
      SELECT 
        pa.id,
        pa.nombre as programa,
        pl.nombre as plantilla,
        COUNT(DISTINCT cp.id) as secciones_llenadas,
        COUNT(DISTINCT sp.id) as total_secciones,
        COUNT(DISTINCT ftp.id) as filas_guardadas,
        COUNT(DISTINCT vcp.id) as valores_guardados,
        MAX(cp.updated_at) as ultima_modificacion
      FROM programas_analiticos pa
      LEFT JOIN plantillas_programa pl ON pa.plantilla_id = pl.id
      LEFT JOIN secciones_plantilla sp ON pl.id = sp.plantilla_id
      LEFT JOIN contenido_programa cp ON pa.id = cp.programa_id
      LEFT JOIN filas_tabla_programa ftp ON cp.id = ftp.contenido_id
      LEFT JOIN valores_campo_programa vcp ON ftp.id = vcp.fila_id
      GROUP BY pa.id, pa.nombre, pl.nombre
      ORDER BY pa.id
    `);

    resumen.forEach(r => {
      const progreso = r.total_secciones > 0 
        ? `${r.secciones_llenadas}/${r.total_secciones} secciones`
        : 'Sin plantilla';
      
      console.log(`  📋 ${r.programa} (ID: ${r.id})`);
      console.log(`     Plantilla: ${r.plantilla || 'Sin plantilla'}`);
      console.log(`     Progreso: ${progreso}`);
      console.log(`     Filas guardadas: ${r.filas_guardadas || 0}`);
      console.log(`     Valores guardados: ${r.valores_guardados || 0}`);
      if (r.ultima_modificacion) {
        console.log(`     Última modificación: ${new Date(r.ultima_modificacion).toLocaleString('es-ES')}`);
      }
      console.log('');
    });

    console.log('\n✅ Verificación completa\n');

  } catch (error) {
    console.error('❌ Error al verificar contenido:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar
verificarContenido();
