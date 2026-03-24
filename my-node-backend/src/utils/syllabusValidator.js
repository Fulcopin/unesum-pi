// ============================================
// SISTEMA DE VALIDACIÓN DE TÍTULOS EN SYLLABUS
// ============================================
// Este módulo compara los títulos en negrita de un syllabus subido por un profesor
// contra un syllabus de referencia (plantilla) subido por el admin para ese periodo

const mammoth = require('mammoth');
const fs = require('fs');

/**
 * Extrae títulos en negrita de un documento Word
 * @param {string} filePath - Ruta del archivo Word
 * @returns {Promise<Array<string>>} - Array de títulos normalizados
 */
async function extraerTitulosNegrita(filePath) {
  try {
    // Convertir a HTML para detectar estilos
    const result = await mammoth.convertToHtml({
      path: filePath,
      styleMap: [
        "b => b",
        "strong => strong",
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2",
        "p[style-name='Heading 3'] => h3"
      ]
    });
    
    const html = result.value;
    
    // Expresiones regulares para detectar textos en negrita
    const patronesNegrita = [
      /<strong>(.*?)<\/strong>/gi,
      /<b>(.*?)<\/b>/gi,
      /<h[1-3]>(.*?)<\/h[1-3]>/gi
    ];
    
    const titulos = new Set();
    
    // Extraer todos los textos en negrita
    patronesNegrita.forEach(patron => {
      let match;
      while ((match = patron.exec(html)) !== null) {
        const texto = limpiarTexto(match[1]);
        
        // Filtrar títulos válidos (no vacíos, no muy cortos, no muy largos)
        if (essTituloValido(texto)) {
          titulos.add(normalizarTitulo(texto));
        }
      }
    });
    
    // También buscar patrones comunes de títulos (texto en mayúsculas)
    const lines = html.split(/<\/?[^>]+>/gi);
    lines.forEach(line => {
      const texto = limpiarTexto(line);
      if (esTituloMayusculas(texto)) {
        titulos.add(normalizarTitulo(texto));
      }
    });
    
    console.log(`📋 Títulos extraídos: ${Array.from(titulos).length}`);
    return Array.from(titulos).sort();
    
  } catch (error) {
    console.error('❌ Error al extraer títulos:', error);
    throw new Error(`Error al procesar el documento: ${error.message}`);
  }
}

/**
 * Limpia el texto HTML de etiquetas y espacios extras
 */
function limpiarTexto(texto) {
  return texto
    .replace(/<[^>]*>/g, '')  // Remover etiquetas HTML
    .replace(/&nbsp;/g, ' ')  // Remover espacios HTML
    .replace(/&[a-z]+;/g, '') // Remover entidades HTML
    .replace(/\s+/g, ' ')     // Normalizar espacios
    .trim();
}

/**
 * Normaliza un título para comparación
 */
function normalizarTitulo(titulo) {
  return titulo
    .toUpperCase()                    // Convertir a mayúsculas
    .replace(/[:\-\.]/g, '')         // Remover puntuación
    .replace(/\s+/g, ' ')            // Normalizar espacios
    .replace(/[ÁÀÄ]/g, 'A')          // Normalizar acentos
    .replace(/[ÉÈË]/g, 'E')
    .replace(/[ÍÌÏ]/g, 'I')
    .replace(/[ÓÒÖ]/g, 'O')
    .replace(/[ÚÙÜ]/g, 'U')
    .replace(/Ñ/g, 'N')
    .trim();
}

/**
 * Verifica si un texto es un título válido
 */
function esTituloValido(texto) {
  if (!texto || texto.length < 3) return false;
  if (texto.length > 200) return false;
  
  // Excluir textos que son solo números o símbolos
  if (/^[\d\s\-\.,:;]+$/.test(texto)) return false;
  
  // Excluir textos comunes que no son títulos
  const excluidos = ['si', 'no', 'página', 'page', 'continúa', 'nombre', 'fecha', 'firma'];
  const textoLower = texto.toLowerCase();
  if (excluidos.some(ex => textoLower === ex)) return false;
  
  return true;
}

/**
 * Verifica si un texto está en mayúsculas y parece un título
 */
function esTituloMayusculas(texto) {
  if (!texto || texto.length < 10 || texto.length > 150) return false;
  
  // Debe tener al menos 70% de letras mayúsculas
  const mayusculas = (texto.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
  const letras = (texto.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]/g) || []).length;
  
  if (letras === 0) return false;
  const porcentajeMayusculas = mayusculas / letras;
  
  return porcentajeMayusculas >= 0.7;
}

/**
 * Compara dos conjuntos de títulos y verifica que todos los requeridos estén presentes
 * @param {Array<string>} titulosRequeridos - Títulos del syllabus de referencia (admin)
 * @param {Array<string>} titulosEncontrados - Títulos del syllabus subido (profesor)
 * @returns {Object} - Resultado de la comparación
 */
function compararTitulos(titulosRequeridos, titulosEncontrados) {
  const requeridosNormalizados = titulosRequeridos.map(normalizarTitulo);
  const encontradosNormalizados = titulosEncontrados.map(normalizarTitulo);
  
  // Buscar títulos faltantes
  const faltantes = requeridosNormalizados.filter(requerido => {
    // Buscar coincidencia exacta o parcial
    return !encontradosNormalizados.some(encontrado => 
      encontrado === requerido ||  // Coincidencia exacta
      encontrado.includes(requerido) ||  // El encontrado contiene el requerido
      requerido.includes(encontrado)  // El requerido contiene el encontrado
    );
  });
  
  // Buscar títulos extras (no requeridos pero presentes)
  const extras = encontradosNormalizados.filter(encontrado => {
    return !requeridosNormalizados.some(requerido => 
      encontrado === requerido ||
      encontrado.includes(requerido) ||
      requerido.includes(encontrado)
    );
  });
  
  const valido = faltantes.length === 0;
  const porcentajeCoincidencia = requeridosNormalizados.length > 0
    ? ((requeridosNormalizados.length - faltantes.length) / requeridosNormalizados.length * 100).toFixed(1)
    : 0;
  
  return {
    valido,
    porcentajeCoincidencia: parseFloat(porcentajeCoincidencia),
    totalRequeridos: titulosRequeridos.length,
    totalEncontrados: titulosEncontrados.length,
    totalFaltantes: faltantes.length,
    titulosFaltantes: faltantes.map(f => 
      titulosRequeridos[requeridosNormalizados.indexOf(f)] || f
    ),
    titulosExtras: extras.map(e =>
      titulosEncontrados[encontradosNormalizados.indexOf(e)] || e
    ).slice(0, 10)  // Limitar a 10 para no saturar la respuesta
  };
}

/**
 * Genera un mensaje de error detallado cuando faltan títulos
 */
function generarMensajeError(comparacion) {
  let mensaje = `❌ El syllabus no cumple con la estructura requerida.\n\n`;
  mensaje += `📊 Coincidencia: ${comparacion.porcentajeCoincidencia}%\n`;
  mensaje += `📋 Títulos requeridos: ${comparacion.totalRequeridos}\n`;
  mensaje += `✅ Títulos encontrados: ${comparacion.totalEncontrados - comparacion.totalFaltantes}\n`;
  mensaje += `❌ Títulos faltantes: ${comparacion.totalFaltantes}\n\n`;
  
  if (comparacion.titulosFaltantes.length > 0) {
    mensaje += `⚠️ Títulos que faltan en su documento:\n`;
    comparacion.titulosFaltantes.forEach((titulo, i) => {
      mensaje += `   ${i + 1}. ${titulo}\n`;
    });
  }
  
  mensaje += `\n💡 Por favor, asegúrese de incluir todos los títulos requeridos en su documento.`;
  
  return mensaje;
}

module.exports = {
  extraerTitulosNegrita,
  compararTitulos,
  generarMensajeError,
  normalizarTitulo,
  limpiarTexto
};
