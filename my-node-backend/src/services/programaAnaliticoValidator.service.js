const mammoth = require('mammoth');
const cheerio = require('cheerio');
const db = require('../models');

const ProgramaAnalitico = db.ProgramasAnaliticos;
const Asignatura = db.Asignatura;
const Nivel = db.Nivel;

// ========================================
// 🔧 UTILIDADES DE NORMALIZACIÓN
// ========================================

/**
 * Normaliza texto: quita tildes, convierte a minúsculas, elimina espacios extra
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes
    .replace(/\s+/g, ' ') // Reduce espacios múltiples
    .trim();
}

/**
 * Extrae palabras clave de un texto (primeras 5 palabras significativas)
 */
function extractKeywords(text) {
  const normalized = normalizeText(text);
  return normalized
    .split(' ')
    .filter(w => w.length > 3) // Solo palabras de más de 3 caracteres
    .slice(0, 5)
    .join(' ');
}

/**
 * Calcula similitud entre dos textos (0-100%)
 */
function calculateSimilarity(text1, text2) {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  if (norm1 === norm2) return 100;
  
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  const commonWords = words1.filter(w => words2.includes(w));
  const similarity = (commonWords.length / Math.max(words1.length, words2.length)) * 100;
  
  return Math.round(similarity);
}

// ========================================
// 📤 EXTRACCIÓN AGNÓSTICA DEL WORD
// ========================================

async function extractSeccionesWord(buffer) {
  console.log('📄 Iniciando extracción agnóstica del Word...');
  
  const { value: html } = await mammoth.convertToHtml({ buffer }, {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1:fresh",
      "b => strong"
    ]
  });

  const $ = cheerio.load(html);
  const secciones = [];
  let currentSection = null;
  let posicion = 0;

  // Analizar cada elemento del documento
  $('body').children().each((idx, element) => {
    const $element = $(element);
    const tagName = element.name;
    const text = $element.text().trim();
    const textUpper = text.toUpperCase();
    
    // 🔍 DETECTAR TÍTULO DE SECCIÓN
    const esEncabezado = 
      tagName === 'h1' || 
      tagName === 'h2' ||
      tagName === 'h3' ||
      /^\d+[\.\)]/.test(text) || // Empieza con número (1., 2.3, 1)
      (text === textUpper && text.length > 10 && text.length < 150) || // Texto en mayúsculas
      $element.find('strong').length > 0 && text.length < 100; // Texto en negrita

    if (esEncabezado && text.length > 3) {
      // Guardar sección anterior
      if (currentSection && (currentSection.contenido || currentSection.tabla)) {
        secciones.push(currentSection);
      }
      
      // Crear nueva sección
      currentSection = {
        titulo: text,
        contenido: '',
        tabla: null,
        posicion: posicion++,
        tipo: null
      };
      
      console.log(`✅ Sección detectada: "${text}"`);
    } 
    // 📊 DETECTAR TABLA
    else if (tagName === 'table' && currentSection) {
      const rows = [];
      $element.find('tr').each((rIdx, tr) => {
        const cells = [];
        $(tr).find('td, th').each((cIdx, cell) => {
          cells.push($(cell).text().trim());
        });
        if (cells.some(c => c.length > 0)) {
          rows.push(cells);
        }
      });
      
      if (rows.length > 0) {
        currentSection.tabla = rows;
        currentSection.tipo = 'tabla';
        console.log(`📊 Tabla detectada con ${rows.length} filas`);
      }
    }
    // 📝 CONTENIDO DE TEXTO
    else if (currentSection && text.length > 0) {
      if (!currentSection.tipo) {
        currentSection.tipo = 'texto';
      }
      currentSection.contenido += (currentSection.contenido ? '\n' : '') + text;
    }
  });

  // Agregar última sección
  if (currentSection && (currentSection.contenido || currentSection.tabla)) {
    secciones.push(currentSection);
  }

  console.log(`✅ Total secciones extraídas: ${secciones.length}`);
  return secciones;
}

// ========================================
// 🔍 BÚSQUEDA FLEXIBLE DE SECCIONES
// ========================================

function buscarSeccionPorTitulo(seccionesWord, tituloPlantilla, umbralSimilitud = 75) {
  const tituloNormalizado = normalizeText(tituloPlantilla);
  
  // 1. Búsqueda exacta normalizada
  let match = seccionesWord.find(s => 
    normalizeText(s.titulo) === tituloNormalizado
  );
  
  if (match) {
    console.log(`✅ Match exacto: "${tituloPlantilla}" -> "${match.titulo}"`);
    return match;
  }
  
  // 2. Búsqueda por similitud de palabras clave
  const mejorMatch = {
    seccion: null,
    similitud: 0
  };
  
  for (const seccion of seccionesWord) {
    const similitud = calculateSimilarity(tituloPlantilla, seccion.titulo);
    if (similitud > mejorMatch.similitud) {
      mejorMatch.seccion = seccion;
      mejorMatch.similitud = similitud;
    }
  }
  
  if (mejorMatch.similitud >= umbralSimilitud) {
    console.log(`✅ Match por similitud (${mejorMatch.similitud}%): "${tituloPlantilla}" -> "${mejorMatch.seccion.titulo}"`);
    return mejorMatch.seccion;
  }
  
  console.log(`❌ No se encontró match para: "${tituloPlantilla}"`);
  return null;
}

// ========================================
// ✅ VALIDACIÓN CONTRA PLANTILLA
// ========================================

function validarContraPlantilla(seccionesWord, plantilla) {
  console.log(`🔍 Validando contra plantilla: ${plantilla.nombre || 'Sin nombre'}`);
  
  const seccionesValidas = [];
  const seccionesFaltantes = [];
  const seccionesExtra = [];
  
  let encontrados = 0;
  const secciones = plantilla.secciones || [];
  const totalRequeridos = secciones.filter(s => s.obligatoria).length;
  
  // 1️⃣ VERIFICAR SECCIONES REQUERIDAS
  for (const seccionPlantilla of secciones) {
    const seccionEncontrada = buscarSeccionPorTitulo(seccionesWord, seccionPlantilla.titulo);
    
    if (seccionEncontrada) {
      seccionesValidas.push({
        ...seccionEncontrada,
        plantillaTitulo: seccionPlantilla.titulo,
        tipo: seccionPlantilla.tipo
      });
      encontrados++;
      console.log(`✅ Sección encontrada: "${seccionPlantilla.titulo}"`);
    } else if (seccionPlantilla.obligatoria) {
      seccionesFaltantes.push(seccionPlantilla.titulo);
      console.log(`❌ Sección obligatoria faltante: "${seccionPlantilla.titulo}"`);
    }
  }
  
  // 2️⃣ DETECTAR SECCIONES EXTRA
  const titulosPlantilla = secciones.map(s => normalizeText(s.titulo));
  
  for (const seccionWord of seccionesWord) {
    const esConocida = titulosPlantilla.some(t => {
      const similitud = calculateSimilarity(t, seccionWord.titulo);
      return similitud >= 75;
    });
    
    if (!esConocida) {
      seccionesExtra.push(seccionWord.titulo);
      console.log(`⚠️ Sección extra detectada: "${seccionWord.titulo}"`);
    }
  }
  
  // 3️⃣ CALCULAR PORCENTAJE DE COINCIDENCIA
  const porcentaje = totalRequeridos > 0 ? Math.round((encontrados / totalRequeridos) * 100) : 0;
  const success = porcentaje >= 90; // Mínimo 90% de coincidencia
  
  console.log(`📊 Resultado: ${encontrados}/${totalRequeridos} (${porcentaje}%)`);
  
  return {
    success,
    porcentaje_coincidencia: porcentaje,
    total_requeridos: totalRequeridos,
    encontrados,
    faltantes: seccionesFaltantes,
    extras: seccionesExtra,
    detalles: {
      seccionesValidas,
      seccionesFaltantes,
      seccionesExtra
    }
  };
}

// ========================================
// 🏗️ CONSTRUCCIÓN DEL JSON FINAL
// ========================================

async function construirProgramaAnalitico(seccionesWord, plantilla, asignaturaId, periodoNombre) {
  console.log('🏗️ Construyendo programa analítico estructurado...');
  
  // Cargar datos oficiales de la asignatura
  const asignatura = await Asignatura.findByPk(asignaturaId, {
    include: [{ model: Nivel, as: 'nivel' }]
  });
  
  if (!asignatura) {
    throw new Error('Asignatura no encontrada');
  }
  
  const tabs = [];
  const secciones = plantilla.secciones || [];
  
  for (const seccionPlantilla of secciones) {
    const seccionWord = buscarSeccionPorTitulo(seccionesWord, seccionPlantilla.titulo);
    
    if (!seccionWord && !seccionPlantilla.obligatoria) {
      continue; // Saltar secciones opcionales no encontradas
    }
    
    const rows = [];
    
    // ========================================
    // 🎯 LÓGICA DE LLENADO QUIRÚRGICO
    // ========================================
    
    if (seccionPlantilla.tipo === 'cabecera') {
      // ✅ CABECERA: Inyectar datos oficiales (IGNORAR contenido del Word)
      const datosCabecera = {
        'ASIGNATURA': `${asignatura.codigo} - ${asignatura.nombre}`,
        'PERIODO': periodoNombre,
        'NIVEL': asignatura.nivel?.nombre || '',
        'CARRERA': asignatura.carrera?.nombre || ''
      };
      
      const campos = seccionPlantilla.campos || ['ASIGNATURA', 'PERIODO', 'NIVEL'];
      
      campos.forEach((campo, idx) => {
        rows.push({
          id: `row-${Date.now()}-${idx}`,
          cells: [
            {
              id: `cell-${Date.now()}-${idx}-0`,
              content: campo,
              isHeader: true,
              rowSpan: 1,
              colSpan: 1,
              isEditable: false,
              fontWeight: 'bold',
              backgroundColor: '#f0f0f0'
            },
            {
              id: `cell-${Date.now()}-${idx}-1`,
              content: datosCabecera[campo] || '',
              isHeader: false,
              rowSpan: 1,
              colSpan: 1,
              isEditable: false // 🔒 Bloqueado - datos oficiales
            }
          ]
        });
      });
      
      console.log(`✅ Cabecera "${seccionPlantilla.titulo}" llenada con datos oficiales`);
    } 
    else if (seccionPlantilla.tipo === 'exclusion' && seccionWord) {
      // 🚫 EXCLUSIÓN: Extraer del Word PRESERVANDO planificación del docente
      if (seccionWord.tabla && seccionWord.tabla.length > 0) {
        seccionWord.tabla.forEach((fila, rIdx) => {
          const cells = fila.map((celda, cIdx) => ({
            id: `cell-${Date.now()}-${rIdx}-${cIdx}`,
            content: celda || '',
            isHeader: rIdx === 0,
            rowSpan: 1,
            colSpan: 1,
            isEditable: true, // ✅ Editable por el docente
            fontWeight: rIdx === 0 ? 'bold' : 'normal',
            backgroundColor: rIdx === 0 ? '#e8f4f8' : 'white'
          }));
          
          rows.push({
            id: `row-${Date.now()}-${rIdx}`,
            cells
          });
        });
      } else if (seccionWord.contenido) {
        // Contenido de texto plano
        rows.push({
          id: `row-${Date.now()}-0`,
          cells: [{
            id: `cell-${Date.now()}-0-0`,
            content: seccionWord.contenido,
            isHeader: false,
            rowSpan: 1,
            colSpan: 1,
            isEditable: true
          }]
        });
      }
      
      console.log(`✅ Sección de exclusión "${seccionPlantilla.titulo}" preservada del Word`);
    }
    else if (seccionPlantilla.tipo === 'contenido' && seccionWord) {
      // 📝 CONTENIDO DINÁMICO: Extraer del Word tal cual
      if (seccionWord.tabla && seccionWord.tabla.length > 0) {
        seccionWord.tabla.forEach((fila, rIdx) => {
          const cells = fila.map((celda, cIdx) => ({
            id: `cell-${Date.now()}-${rIdx}-${cIdx}`,
            content: celda || '',
            isHeader: rIdx === 0,
            rowSpan: 1,
            colSpan: 1,
            isEditable: true,
            fontWeight: rIdx === 0 ? 'bold' : 'normal'
          }));
          
          rows.push({
            id: `row-${Date.now()}-${rIdx}`,
            cells
          });
        });
      } else if (seccionWord.contenido) {
        rows.push({
          id: `row-${Date.now()}-0`,
          cells: [{
            id: `cell-${Date.now()}-0-0`,
            content: seccionWord.contenido,
            isHeader: false,
            rowSpan: 1,
            colSpan: 1,
            isEditable: true
          }]
        });
      }
      
      console.log(`✅ Contenido "${seccionPlantilla.titulo}" extraído del Word`);
    }
    else if (!seccionWord && seccionPlantilla.obligatoria) {
      // Sección obligatoria faltante - agregar vacía
      rows.push({
        id: `row-${Date.now()}-0`,
        cells: [{
          id: `cell-${Date.now()}-0-0`,
          content: `[PENDIENTE: ${seccionPlantilla.titulo}]`,
          isHeader: false,
          rowSpan: 1,
          colSpan: 1,
          isEditable: true,
          textColor: '#999'
        }]
      });
      
      console.log(`⚠️ Sección obligatoria "${seccionPlantilla.titulo}" no encontrada - agregada vacía`);
    }
    
    if (rows.length > 0) {
      tabs.push({
        id: `tab-${Date.now()}-${tabs.length}`,
        title: seccionPlantilla.titulo,
        rows
      });
    }
  }
  
  return {
    id: Date.now(),
    name: `Programa Analítico - ${asignatura.nombre}`,
    description: `Periodo: ${periodoNombre}`,
    metadata: {
      subject: asignatura.nombre,
      period: periodoNombre,
      level: asignatura.nivel?.nombre || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    tabs
  };
}

// ========================================
// 🎯 FUNCIÓN PRINCIPAL EXPORTADA
// ========================================

async function validarYProcesarProgramaAnalitico(buffer, periodoNombre, asignaturaId) {
  try {
    console.log('🚀 Iniciando validación de programa analítico...');
    console.log(`📋 Periodo: ${periodoNombre}, Asignatura ID: ${asignaturaId}`);
    
    // 1️⃣ BUSCAR PLANTILLA MAESTRA
    const plantillaRecord = await ProgramaAnalitico.findOne({
      where: {
        periodo: periodoNombre,
        asignatura_id: null // Plantilla general del admin
      }
    });
    
    if (!plantillaRecord) {
      return {
        success: false,
        error: `No existe una plantilla maestra para el periodo "${periodoNombre}". Contacte al administrador.`
      };
    }
    
    const plantilla = {
      id: plantillaRecord.id,
      nombre: plantillaRecord.nombre,
      periodo: plantillaRecord.periodo,
      secciones: plantillaRecord.datos_tabla?.secciones || []
    };
    
    console.log(`✅ Plantilla encontrada: "${plantilla.nombre}" con ${plantilla.secciones.length} secciones`);
    
    // 2️⃣ EXTRAER SECCIONES DEL WORD
    const seccionesWord = await extractSeccionesWord(buffer);
    
    if (seccionesWord.length === 0) {
      return {
        success: false,
        error: 'No se pudo extraer contenido del archivo Word. Verifique que el archivo no esté corrupto.'
      };
    }
    
    // 3️⃣ VALIDAR ESTRUCTURA
    const validacion = validarContraPlantilla(seccionesWord, plantilla);
    
    if (!validacion.success) {
      return {
        success: false,
        validacion,
        error: `El documento no cumple con la estructura requerida (${validacion.porcentaje_coincidencia}% de coincidencia, mínimo 90%)`
      };
    }
    
    // 4️⃣ CONSTRUIR JSON FINAL
    const programaAnalitico = await construirProgramaAnalitico(
      seccionesWord,
      plantilla,
      asignaturaId,
      periodoNombre
    );
    
    console.log('✅ Programa analítico procesado exitosamente');
    
    return {
      success: true,
      data: programaAnalitico,
      validacion
    };
    
  } catch (error) {
    console.error('❌ Error en validación:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al procesar el documento'
    };
  }
}

module.exports = {
  validarYProcesarProgramaAnalitico,
  extractSeccionesWord,
  validarContraPlantilla,
  construirProgramaAnalitico,
  normalizeText,
  calculateSimilarity
};
