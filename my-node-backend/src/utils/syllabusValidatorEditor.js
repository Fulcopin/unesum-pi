/**
 * 🎯 SISTEMA DE VALIDACIÓN DE SYLLABUS - BASADO EN EDITOR
 * ======================================================
 * 
 * Este módulo valida que los syllabus subidos por los profesores contengan
 * todos los campos requeridos según la configuración del editor del administrador.
 * 
 * DIFERENCIA CON EL ANTERIOR:
 * ❌ ANTES: Extraía títulos de documentos Word
 * ✅ AHORA: Usa la configuración del editor visual del admin
 * 
 * FLUJO DE VALIDACIÓN:
 * 1. Admin configura estructura en /dashboard/admin/editor-syllabus
 * 2. Se marca ese syllabus como "plantilla de referencia"
 * 3. Profesor sube syllabus Word → Se extraen títulos
 * 4. Se comparan contra los campos del editor → Acepta/Rechaza
 * 
 * VENTAJAS:
 * ✓ Una sola fuente de verdad (el editor)
 * ✓ No necesita subir Word aparte para plantilla
 * ✓ Configuración visual más fácil
 * ✓ Reutiliza estructura existente
 * 
 * @author Sistema UNESUM
 * @date 2025-01-11 (Refactorizado)
 */

const mammoth = require('mammoth');

/**
 * Extrae todos los campos requeridos de la configuración del editor
 * 
 * ESTRUCTURA DEL EDITOR:
 * datosSyllabus = {
 *   tabs: [
 *     {
 *       title: "DATOS GENERALES",
 *       rows: [
 *         {
 *           cells: [
 *             { content: "Código de Asignatura", isHeader: true },
 *             { content: "ENF-101", isHeader: false }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 * 
 * @param {Object} datosSyllabus - Objeto JSONB del campo datos_syllabus
 * @returns {string[]} Array de campos requeridos (contenido de celdas con isHeader=true)
 * 
 * @example
 * const campos = extraerCamposRequeridos(plantilla.datos_syllabus)
 * // ['Código de Asignatura', 'Nombre de la asignatura', 'Prerrequisito', ...]
 */
function extraerCamposRequeridos(datosSyllabus) {
  try {
    console.log(`📋 Extrayendo campos requeridos de configuración del editor`);
    
    // Validar estructura
    if (!datosSyllabus || typeof datosSyllabus !== 'object') {
      throw new Error('datosSyllabus debe ser un objeto');
    }
    
    if (!datosSyllabus.tabs || !Array.isArray(datosSyllabus.tabs)) {
      throw new Error('datosSyllabus.tabs debe ser un array');
    }
    
    const camposRequeridos = [];
    
    // Recorrer cada pestaña (sección)
    datosSyllabus.tabs.forEach((tab, tabIndex) => {
      console.log(`  📑 Tab ${tabIndex + 1}: "${tab.title || 'Sin título'}"`);
      
      if (!tab.rows || !Array.isArray(tab.rows)) {
        console.log(`    ⚠️  No tiene filas válidas`);
        return;
      }
      
      // Recorrer cada fila
      tab.rows.forEach((row, rowIndex) => {
        if (!row.cells || !Array.isArray(row.cells)) {
          return;
        }
        
        // Recorrer cada celda
        row.cells.forEach((cell, cellIndex) => {
          // ✅ CLAVE: Solo extraer celdas con isHeader = true
          if (cell.isHeader === true && cell.content) {
            const contenido = cell.content.trim();
            
            // Filtrar contenidos válidos (no vacíos, mínimo 3 caracteres)
            if (contenido.length >= 3) {
              camposRequeridos.push(contenido);
              console.log(`    ✓ Campo: "${contenido}"`);
            }
          }
        });
      });
    });
    
    console.log(`✅ Total de campos requeridos: ${camposRequeridos.length}`);
    
    if (camposRequeridos.length === 0) {
      throw new Error('No se encontraron campos con isHeader=true en la configuración');
    }
    
    return camposRequeridos;
    
  } catch (error) {
    console.error('❌ Error al extraer campos:', error.message);
    throw new Error(`No se pudieron extraer campos: ${error.message}`);
  }
}

/**
 * Extrae todos los títulos en negrita de un documento Word subido por profesor
 * 
 * IMPORTANTE: Esta función SÍ usa mammoth porque procesa el Word del PROFESOR,
 * no la plantilla del admin (que ya está en el editor)
 * 
 * @param {string} filePath - Ruta completa al archivo .docx del profesor
 * @returns {Promise<string[]>} Array de títulos encontrados en negrita
 * 
 * @example
 * const titulos = await extraerTitulosWord('/uploads/syllabus-profesor.docx')
 * // ['DATOS GENERALES', 'Código de Asignatura', 'Prerrequisito', ...]
 */
async function extraerTitulosWord(filePath) {
  try {
    console.log(`📄 Extrayendo títulos de documento del profesor: ${filePath}`);
    
    // Convertir Word a HTML preservando estilos
    const result = await mammoth.convertToHtml({
      path: filePath,
      styleMap: [
        "b => strong",
        "strong => strong",
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2",
        "p[style-name='Heading 3'] => h3"
      ]
    });
    
    const html = result.value;
    
    // Patrones para detectar textos importantes (negritas, headings)
    const patronesNegrita = [
      /<strong>(.*?)<\/strong>/gi,
      /<b>(.*?)<\/b>/gi,
      /<h[1-3]>(.*?)<\/h[1-3]>/gi
    ];
    
    const titulos = new Set();
    
    // Extraer todos los textos en negrita/headings
    patronesNegrita.forEach(patron => {
      let match;
      while ((match = patron.exec(html)) !== null) {
        const texto = limpiarTexto(match[1]);
        
        // Solo agregar si es un título válido
        if (esTituloValido(texto)) {
          titulos.add(texto);
          console.log(`    ✓ Título: "${texto}"`);
        }
      }
    });
    
    console.log(`✅ Total títulos extraídos del Word: ${titulos.size}`);
    
    return Array.from(titulos);
    
  } catch (error) {
    console.error('❌ Error al extraer títulos de Word:', error.message);
    throw new Error(`No se pudo procesar el documento: ${error.message}`);
  }
}

/**
 * Limpia texto HTML de etiquetas y espacios extras
 */
function limpiarTexto(texto) {
  return texto
    .replace(/<[^>]*>/g, '')    // Remover etiquetas HTML
    .replace(/&nbsp;/g, ' ')     // Remover espacios HTML
    .replace(/&[a-z]+;/gi, ' ')  // Remover entidades HTML
    .replace(/\s+/g, ' ')        // Normalizar espacios múltiples
    .trim();
}

/**
 * Valida si un texto es un título válido
 */
function esTituloValido(texto) {
  if (!texto || typeof texto !== 'string') return false;
  
  const limpio = texto.trim();
  
  // Mínimo 3 caracteres, máximo 200
  if (limpio.length < 3 || limpio.length > 200) return false;
  
  // No debe ser solo números
  if (/^\d+$/.test(limpio)) return false;
  
  // No debe ser solo símbolos
  if (/^[^a-záéíóúñA-ZÁÉÍÓÚÑ0-9]+$/.test(limpio)) return false;
  
  return true;
}

/**
 * Normaliza un texto para comparación (minúsculas, sin tildes, sin espacios extras)
 */
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover tildes
    .replace(/[^a-z0-9\s]/g, '')     // Solo letras, números, espacios
    .replace(/\s+/g, ' ')            // Normalizar espacios
    .trim();
}

/**
 * Compara los títulos del documento del profesor contra los campos requeridos del editor
 * 
 * ALGORITMO:
 * 1. Normaliza ambas listas (minúsculas, sin tildes)
 * 2. Para cada campo requerido, busca en títulos del Word
 * 3. Si encuentra todos → SUCCESS
 * 4. Si falta alguno → FAIL con lista de faltantes
 * 
 * @param {string[]} camposRequeridos - Campos del editor (isHeader=true)
 * @param {string[]} titulosWord - Títulos extraídos del Word del profesor
 * @returns {Object} { esValido: boolean, faltantes: string[], extras: string[], porcentaje: number }
 * 
 * @example
 * const resultado = compararTitulos(camposEditor, titulosProfesor)
 * if (resultado.esValido) {
 *   console.log('✅ Syllabus válido')
 * } else {
 *   console.log('❌ Faltan:', resultado.faltantes)
 * }
 */
function compararTitulos(camposRequeridos, titulosWord) {
  console.log(`\n🔍 Comparando títulos...`);
  console.log(`   Campos requeridos: ${camposRequeridos.length}`);
  console.log(`   Títulos en Word: ${titulosWord.length}`);
  
  // Normalizar ambas listas para comparación insensible a mayúsculas/tildes
  const camposNormalizados = camposRequeridos.map(normalizarTexto);
  const titulosNormalizados = titulosWord.map(normalizarTexto);
  
  // Encontrar faltantes (campos requeridos que NO están en el Word)
  const faltantes = [];
  camposRequeridos.forEach((campo, index) => {
    const campoNormalizado = camposNormalizados[index];
    
    // Buscar coincidencia exacta o parcial
    const encontrado = titulosNormalizados.some(titulo => 
      titulo.includes(campoNormalizado) || campoNormalizado.includes(titulo)
    );
    
    if (!encontrado) {
      faltantes.push(campo);
      console.log(`   ❌ Falta: "${campo}"`);
    } else {
      console.log(`   ✓ Encontrado: "${campo}"`);
    }
  });
  
  // Encontrar extras (títulos en Word que NO están en requeridos)
  const extras = [];
  titulosWord.forEach((titulo, index) => {
    const tituloNormalizado = titulosNormalizados[index];
    
    const esRequerido = camposNormalizados.some(campo => 
      campo.includes(tituloNormalizado) || tituloNormalizado.includes(campo)
    );
    
    if (!esRequerido) {
      extras.push(titulo);
    }
  });
  
  // Calcular porcentaje de coincidencia
  const encontrados = camposRequeridos.length - faltantes.length;
  const porcentaje = Math.round((encontrados / camposRequeridos.length) * 100);
  
  // ✅ NUEVO: Aceptar si cumple 95% o más (antes era 100%)
  const UMBRAL_MINIMO = 95; // Porcentaje mínimo requerido
  const esValido = porcentaje >= UMBRAL_MINIMO;
  
  console.log(`\n📊 Resultado:`);
  console.log(`   Coincidencia: ${porcentaje}% (mínimo requerido: ${UMBRAL_MINIMO}%)`);
  console.log(`   Encontrados: ${encontrados}/${camposRequeridos.length}`);
  console.log(`   Faltantes: ${faltantes.length}`);
  console.log(`   Extras: ${extras.length}`);
  console.log(`   ${esValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
  
  return {
    esValido,
    faltantes,
    extras,
    porcentaje,
    encontrados: camposRequeridos.length - faltantes.length,
    total: camposRequeridos.length
  };
}

/**
 * Función principal de validación - Combina todo el proceso
 * 
 * USO TÍPICO:
 * 1. Obtener plantilla de BD: SELECT datos_syllabus WHERE es_plantilla_referencia=true AND periodo=X
 * 2. Llamar: validarSyllabusContraPlantilla(plantilla.datos_syllabus, '/uploads/profesor.docx')
 * 3. Si esValido=true → Guardar syllabus
 * 4. Si esValido=false → Rechazar con mensaje de faltantes
 * 
 * @param {Object} datosSyllabusPlantilla - datos_syllabus de la plantilla (del editor)
 * @param {string} archivoWordProfesor - Ruta al archivo .docx del profesor
 * @returns {Promise<Object>} Resultado de validación
 */
async function validarSyllabusContraPlantilla(datosSyllabusPlantilla, archivoWordProfesor) {
  try {
    console.log(`\n🎯 INICIANDO VALIDACIÓN DE SYLLABUS`);
    console.log(`=====================================`);
    
    // 1. Extraer campos requeridos de la configuración del editor
    console.log(`\n1️⃣ Extrayendo campos de plantilla del editor...`);
    const camposRequeridos = extraerCamposRequeridos(datosSyllabusPlantilla);
    
    // 2. Extraer títulos del Word del profesor
    console.log(`\n2️⃣ Extrayendo títulos del documento del profesor...`);
    const titulosWord = await extraerTitulosWord(archivoWordProfesor);
    
    // 3. Comparar
    console.log(`\n3️⃣ Comparando títulos...`);
    const resultado = compararTitulos(camposRequeridos, titulosWord);
    
    console.log(`\n${'='.repeat(40)}`);
    console.log(`VALIDACIÓN ${resultado.esValido ? 'EXITOSA ✅' : 'FALLIDA ❌'}`);
    console.log(`${'='.repeat(40)}\n`);
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
    throw new Error(`Error en validación: ${error.message}`);
  }
}

module.exports = {
  extraerCamposRequeridos,
  extraerTitulosWord,
  compararTitulos,
  validarSyllabusContraPlantilla
};
