/**
 * ============================================================================
 * FUNCIÓN MEJORADA: Extraer tablas directamente del XML interno del .docx
 * Esta es la forma más confiable de obtener TODAS las celdas de las tablas
 * ============================================================================
 */
async function extraerTablasDeWordXML(buffer) {
  try {
    console.log('🔍 ========== EXTRACCIÓN DIRECTA DEL XML DEL DOCX ==========');
    
    // El archivo .docx es un ZIP que contiene XML
    const zip = new AdmZip(buffer);
    const documentXml = zip.readAsText('word/document.xml');
    
    if (!documentXml) {
      throw new Error('No se encontró word/document.xml en el archivo');
    }
    
    console.log('📄 XML extraído:', documentXml.length, 'caracteres');
    
    // Parsear el XML
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const resultado = await parser.parseStringPromise(documentXml);
    
    // Navegar a las tablas: w:document > w:body > w:tbl
    const body = resultado['w:document']?.['w:body'];
    if (!body) {
      console.log('⚠️ No se encontró w:body en el documento');
      return { filas: [], secciones: [] };
    }
    
    // Obtener todas las tablas
    let tablas = body['w:tbl'];
    if (!tablas) {
      console.log('⚠️ No se encontraron tablas en el documento');
      return { filas: [], secciones: [] };
    }
    
    // Asegurar que sea array
    if (!Array.isArray(tablas)) {
      tablas = [tablas];
    }
    
    console.log(`📊 Tablas encontradas: ${tablas.length}`);
    
    // Función auxiliar para extraer texto de un elemento
    const extraerTexto = (elemento) => {
      if (!elemento) return '';
      
      // Si es string directo
      if (typeof elemento === 'string') return elemento;
      
      // Si tiene w:t (texto)
      if (elemento['w:t']) {
        const wt = elemento['w:t'];
        if (typeof wt === 'string') return wt;
        if (wt._) return wt._;
        if (Array.isArray(wt)) return wt.map(t => typeof t === 'string' ? t : (t._ || '')).join('');
        return '';
      }
      
      // Si tiene w:r (run de texto)
      if (elemento['w:r']) {
        const runs = Array.isArray(elemento['w:r']) ? elemento['w:r'] : [elemento['w:r']];
        return runs.map(r => extraerTexto(r)).join('');
      }
      
      // Si tiene w:p (párrafo)
      if (elemento['w:p']) {
        const parrafos = Array.isArray(elemento['w:p']) ? elemento['w:p'] : [elemento['w:p']];
        return parrafos.map(p => extraerTexto(p)).join('\n');
      }
      
      return '';
    };
    
    // Extraer todas las filas de todas las tablas
    const todasLasFilas = [];
    
    tablas.forEach((tabla, tablaIndex) => {
      let filas = tabla['w:tr'];
      if (!filas) return;
      if (!Array.isArray(filas)) filas = [filas];
      
      console.log(`  📋 Tabla ${tablaIndex + 1}: ${filas.length} filas`);
      
      filas.forEach((fila, filaIndex) => {
        let celdas = fila['w:tc'];
        if (!celdas) return;
        if (!Array.isArray(celdas)) celdas = [celdas];
        
        const contenidoCeldas = celdas.map(celda => {
          return extraerTexto(celda).trim();
        });
        
        // Solo agregar si tiene contenido
        if (contenidoCeldas.some(c => c)) {
          todasLasFilas.push(contenidoCeldas);
          
          // Log para debug (primeras 30 filas)
          if (todasLasFilas.length <= 30) {
            const preview = contenidoCeldas.map(c => c.substring(0, 25)).join(' | ');
            console.log(`    Fila ${todasLasFilas.length}: ${preview}`);
          }
        }
      });
    });
    
    console.log(`\n📋 Total filas extraídas: ${todasLasFilas.length}`);
    
    // DETECTAR SECCIONES basándose en las filas extraídas
    const secciones = detectarSeccionesDeFilasWord(todasLasFilas);
    
    return {
      filas: todasLasFilas,
      secciones: secciones
    };
    
  } catch (error) {
    console.error('❌ Error al extraer XML del Word:', error);
    throw error;
  }
}

/**
 * Detectar secciones a partir de las filas extraídas del Word
 * Busca patrones conocidos en la PRIMERA COLUMNA de cada fila
 */
function detectarSeccionesDeFilasWord(filas) {
  console.log('\n🔍 ========== DETECTANDO SECCIONES ==========');
  
  // Patrones de sección ordenados por especificidad (más específico primero)
  const PATRONES = [
    { regex: /PROGRAMA\s*ANAL[IÍ]TICO\s*(DE\s*ASIGNATURA)?/i, nombre: 'PROGRAMA ANALÍTICO DE ASIGNATURA', tipo: 'cabecera' },
    { regex: /OBJETIVOS\s*(DE\s*LA)?\s*ASIGNATURA/i, nombre: 'OBJETIVOS DE LA ASIGNATURA', tipo: 'texto_largo' },
    { regex: /RESULTADOS?\s*D?\s*E?\s*APRENDIZAJE/i, nombre: 'RESULTADOS DE APRENDIZAJE', tipo: 'texto_largo' },
    { regex: /CONTENIDOS?\s*(DE\s*LA)?\s*ASIGNATURA/i, nombre: 'CONTENIDOS DE LA ASIGNATURA', tipo: 'tabla' },
    { regex: /UNIDADES?\s*TEM[AÁ]TICAS?/i, nombre: 'UNIDADES TEMÁTICAS', tipo: 'tabla' },
    { regex: /PERIODO\s*ACAD[EÉ]MICO/i, nombre: 'PERIODO ACADÉMICO', tipo: 'datos_generales' },
    { regex: /^ASIGNATURA$/i, nombre: 'ASIGNATURA', tipo: 'datos_generales' },
    { regex: /^NIVEL$/i, nombre: 'NIVEL', tipo: 'datos_generales' },
    { regex: /CARACTERIZACI[OÓ]N/i, nombre: 'CARACTERIZACIÓN', tipo: 'texto_largo' },
    { regex: /^COMPETENCIAS$/i, nombre: 'COMPETENCIAS', tipo: 'texto_largo' },
    { regex: /METODOLOG[IÍ]A/i, nombre: 'METODOLOGÍA', tipo: 'texto_largo' },
    { regex: /PROCEDIMIENTOS?\s*(DE)?\s*EVALUACI[OÓ]N/i, nombre: 'PROCEDIMIENTOS DE EVALUACIÓN', tipo: 'texto_largo' },
    { regex: /BIBLIOGRAF[IÍ]A\s*[-–]?\s*FUENTES/i, nombre: 'BIBLIOGRAFÍA - FUENTES DE CONSULTA', tipo: 'tabla' },
    { regex: /BIBLIOGRAF[IÍ]A\s*B[AÁ]SICA/i, nombre: 'BIBLIOGRAFÍA BÁSICA', tipo: 'texto_largo' },
    { regex: /BIBLIOGRAF[IÍ]A\s*COMPLEMENTARIA/i, nombre: 'BIBLIOGRAFÍA COMPLEMENTARIA', tipo: 'texto_largo' },
    { regex: /^VISADO:?$/i, nombre: 'VISADO', tipo: 'tabla' },
    { regex: /DECANO.*FACULTAD|DIRECTOR.*ACAD[EÉ]MICO|COORDINADOR.*CARRERA/i, nombre: 'VISADO', tipo: 'tabla' }
  ];
  
  // Función para detectar si una celda es un título de sección
  const detectarPatron = (texto) => {
    if (!texto || texto.length < 3) return null;
    const textoLimpio = texto.replace(/[\r\n]+/g, ' ').trim().toUpperCase();
    
    for (const patron of PATRONES) {
      if (patron.regex.test(textoLimpio)) {
        return patron;
      }
    }
    return null;
  };
  
  const secciones = [];
  let seccionActual = null;
  let datosSeccion = [];
  
  filas.forEach((fila, idx) => {
    // Buscar patrón en la primera columna (títulos de sección)
    const primeraColumna = fila[0] || '';
    const patronEncontrado = detectarPatron(primeraColumna);
    
    if (patronEncontrado) {
      // Guardar sección anterior
      if (seccionActual && datosSeccion.length > 0) {
        secciones.push({
          titulo: seccionActual.nombre,
          tipo: seccionActual.tipo,
          encabezados: [],
          datos: datosSeccion
        });
        console.log(`  ✅ Sección guardada: ${seccionActual.nombre} (${datosSeccion.length} filas)`);
      }
      
      // Nueva sección
      seccionActual = patronEncontrado;
      datosSeccion = [];
      
      // Si la fila tiene más columnas, agregarlas como contenido
      if (fila.length > 1 && fila.slice(1).some(c => c && c.trim())) {
        datosSeccion.push(fila);
      }
      
      console.log(`  📌 Nueva sección: ${patronEncontrado.nombre} (fila ${idx + 1})`);
    } else if (seccionActual) {
      // Agregar fila a la sección actual
      datosSeccion.push(fila);
    }
  });
  
  // Guardar última sección
  if (seccionActual && datosSeccion.length > 0) {
    secciones.push({
      titulo: seccionActual.nombre,
      tipo: seccionActual.tipo,
      encabezados: [],
      datos: datosSeccion
    });
    console.log(`  ✅ Última sección: ${seccionActual.nombre} (${datosSeccion.length} filas)`);
  }
  
  console.log(`\n📊 Total secciones detectadas: ${secciones.length}`);
  secciones.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.titulo} (${s.tipo}) - ${s.datos.length} filas`);
  });
  
  return secciones;
}

/**
 * Función legacy para mammoth (fallback si XML falla)
 */
async function procesarWordMammoth(buffer) {
  try {
    console.log('🔍 Procesando con Mammoth (fallback)...');
    
    const resultadoHtml = await mammoth.convertToHtml({ buffer });
    const $ = cheerio.load(resultadoHtml.value);
    
    const filas = [];
    $('table tr').each((i, row) => {
      const celdas = [];
      $(row).find('td, th').each((j, cell) => {
        celdas.push($(cell).text().trim());
      });
      if (celdas.some(c => c)) {
        filas.push(celdas);
      }
    });
    
    return { filas, secciones: detectarSeccionesDeFilasWord(filas) };
  } catch (error) {
    console.error('❌ Error en Mammoth fallback:', error);
    throw error;
  }
}

/**
 * FUNCIÓN PRINCIPAL para procesar Word
 * Intenta XML primero, luego Mammoth como fallback
 */
async function procesarWord(buffer) {
  try {
    // Intentar extracción por XML (más confiable)
    let resultado = await extraerTablasDeWordXML(buffer);
    
    // Si no hay filas, intentar con Mammoth
    if (!resultado.filas || resultado.filas.length === 0) {
      console.log('⚠️ XML no extrajo filas, intentando con Mammoth...');
      resultado = await procesarWordMammoth(buffer);
    }
    
    // Retornar las filas para compatibilidad con el flujo existente
    // Pero también pasar las secciones pre-detectadas
    resultado.filas._seccionesPreDetectadas = resultado.secciones;
    
    return resultado.filas;
    
  } catch (error) {
    console.error('❌ Error procesando Word:', error);
    throw error;
  }
}
