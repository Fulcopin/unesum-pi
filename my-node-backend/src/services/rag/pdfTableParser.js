/**
 * PDF Table-Aware Parser
 * Detecta y preserva la estructura de tablas en PDFs de programas de estudio.
 * Identifica regiones tabulares (horarios, créditos, prerequisitos) para
 * aplicar chunking adaptativo que no rompa las relaciones de datos.
 */

const pdfParse = require('pdf-parse');

/**
 * Patrones heurísticos para detectar regiones tabulares en texto extraído de PDFs.
 * Las tablas en PDFs convertidos a texto suelen tener:
 * - Líneas con múltiples separadores (|, tabs, espacios repetidos)
 * - Filas con columnas alineadas por espacios
 * - Headers con palabras clave comunes de programas académicos
 */
const TABLE_HEADER_KEYWORDS = [
  'código', 'asignatura', 'créditos', 'horas', 'prerequisito',
  'nivel', 'semestre', 'período', 'docente', 'horario',
  'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
  'unidad', 'tema', 'subtema', 'contenido', 'semana',
  'resultado', 'aprendizaje', 'competencia', 'evaluación',
  'bibliografía', 'recurso', 'actividad', 'metodología',
  'parcial', 'examen', 'nota', 'calificación', 'ponderación',
  'total', 'subtotal', 'porcentaje'
];

/**
 * Detecta si una línea de texto parece ser parte de una tabla.
 * Analiza la densidad de separadores y patrones de alineación.
 */
function esLineaTabular(linea) {
  if (!linea || linea.trim().length === 0) return false;

  const trimmed = linea.trim();

  // Líneas con pipe explícito (tablas markdown o extraídas)
  if ((trimmed.match(/\|/g) || []).length >= 2) return true;

  // Líneas con tabulaciones múltiples
  if ((trimmed.match(/\t/g) || []).length >= 2) return true;

  // Líneas con 3+ grupos de espacios consecutivos (≥3 espacios) separando valores
  const gruposEspacios = trimmed.split(/\s{3,}/).filter(s => s.trim().length > 0);
  if (gruposEspacios.length >= 3) return true;

  // Líneas que son separadores de tabla (---, ===, etc.)
  if (/^[\-=+|_\s]+$/.test(trimmed) && trimmed.length > 5) return true;

  return false;
}

/**
 * Detecta si una línea contiene encabezados de tabla académica.
 */
function esHeaderTabla(linea) {
  if (!linea) return false;
  const lower = linea.toLowerCase();
  let coincidencias = 0;
  for (const keyword of TABLE_HEADER_KEYWORDS) {
    if (lower.includes(keyword)) coincidencias++;
  }
  // Al menos 2 keywords en la misma línea sugieren un header de tabla
  return coincidencias >= 2;
}

/**
 * Estructura que representa una región detectada en el documento.
 * @typedef {Object} RegionDocumento
 * @property {'tabla'|'texto'} tipo - Tipo de región
 * @property {string} contenido - Texto completo de la región
 * @property {string[]} filas - Filas individuales (solo para tablas)
 * @property {number} inicio - Índice de línea de inicio
 * @property {number} fin - Índice de línea de fin
 * @property {number} filaMaxLarga - Longitud de la fila más larga (solo para tablas)
 * @property {string|null} headerDetectado - Header de la tabla si se detectó
 */

/**
 * Analiza un texto extraído de PDF y detecta regiones de tabla vs texto normal.
 * Usa un enfoque de ventana deslizante: si encuentra N líneas consecutivas
 * que parecen tabulares, las agrupa como una región de tabla.
 * 
 * @param {string} textoCompleto - Texto crudo extraído del PDF
 * @param {Object} opciones - Opciones de detección
 * @param {number} opciones.minLineasTabla - Mínimo de líneas consecutivas para considerar tabla (default: 2)
 * @param {number} opciones.toleranciaGap - Líneas vacías permitidas dentro de una tabla (default: 1)
 * @returns {RegionDocumento[]} Regiones detectadas en orden
 */
function detectarRegiones(textoCompleto, opciones = {}) {
  const { minLineasTabla = 2, toleranciaGap = 1 } = opciones;
  const lineas = textoCompleto.split('\n');
  const regiones = [];

  let i = 0;
  let textoAcumulado = [];

  while (i < lineas.length) {
    const linea = lineas[i];

    // Verificar si esta línea es tabular o es un header de tabla
    if (esLineaTabular(linea) || esHeaderTabla(linea)) {
      // Guardar el texto acumulado antes de la tabla
      if (textoAcumulado.length > 0) {
        regiones.push({
          tipo: 'texto',
          contenido: textoAcumulado.join('\n'),
          filas: [],
          inicio: i - textoAcumulado.length,
          fin: i - 1,
          filaMaxLarga: 0,
          headerDetectado: null
        });
        textoAcumulado = [];
      }

      // Recopilar la región tabular
      const filasTabla = [];
      let headerTabla = null;
      const inicioTabla = i;

      // Verificar si la línea anterior era un posible título de la tabla
      if (i > 0 && !esLineaTabular(lineas[i - 1]) && lineas[i - 1].trim().length > 0) {
        headerTabla = lineas[i - 1].trim();
      }

      let gapCount = 0;
      while (i < lineas.length) {
        const lineaActual = lineas[i];

        if (esLineaTabular(lineaActual) || esHeaderTabla(lineaActual)) {
          filasTabla.push(lineaActual);
          gapCount = 0;
          i++;
        } else if (lineaActual.trim().length === 0 && gapCount < toleranciaGap) {
          // Permitir líneas vacías dentro de la tabla (tolerancia)
          filasTabla.push(lineaActual);
          gapCount++;
          i++;
        } else {
          break;
        }
      }

      // Solo considerar como tabla si tiene suficientes líneas
      if (filasTabla.length >= minLineasTabla) {
        const filaMaxLarga = Math.max(...filasTabla.map(f => f.length));
        regiones.push({
          tipo: 'tabla',
          contenido: filasTabla.join('\n'),
          filas: filasTabla,
          inicio: inicioTabla,
          fin: i - 1,
          filaMaxLarga,
          headerDetectado: headerTabla
        });
      } else {
        // No suficientes líneas para tabla, tratar como texto
        textoAcumulado.push(...filasTabla);
      }
    } else {
      textoAcumulado.push(linea);
      i++;
    }
  }

  // Texto restante
  if (textoAcumulado.length > 0) {
    regiones.push({
      tipo: 'texto',
      contenido: textoAcumulado.join('\n'),
      filas: [],
      inicio: lineas.length - textoAcumulado.length,
      fin: lineas.length - 1,
      filaMaxLarga: 0,
      headerDetectado: null
    });
  }

  return regiones;
}

/**
 * Extrae texto de un buffer PDF preservando la estructura de página.
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @returns {Promise<{texto: string, paginas: string[], metadata: Object}>}
 */
async function extraerTextoPDF(pdfBuffer) {
  const opciones = {
    // Preservar saltos de página
    pagerender: function (pageData) {
      const textItems = pageData.getTextContent();
      return textItems.then(function (textContent) {
        let lastY = null;
        let textoPagina = '';

        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
            textoPagina += '\n';
          } else if (lastY !== null) {
            textoPagina += ' ';
          }
          textoPagina += item.str;
          lastY = item.transform[5];
        }

        return textoPagina;
      });
    }
  };

  const data = await pdfParse(pdfBuffer, opciones);

  // Separar por páginas usando el marcador de pdf-parse
  const paginas = data.text.split(/\f/).filter(p => p.trim().length > 0);

  return {
    texto: data.text,
    paginas,
    metadata: {
      numPaginas: data.numpages,
      titulo: data.info?.Title || null,
      autor: data.info?.Author || null,
      creacion: data.info?.CreationDate || null
    }
  };
}

/**
 * Pipeline completo: extrae PDF → detecta regiones → retorna estructura parseada.
 * @param {Buffer} pdfBuffer - Buffer del PDF
 * @returns {Promise<{regiones: RegionDocumento[], metadata: Object, estadisticas: Object}>}
 */
async function parsearPDFConTablas(pdfBuffer) {
  const { texto, paginas, metadata } = await extraerTextoPDF(pdfBuffer);

  const regiones = detectarRegiones(texto);

  const tablas = regiones.filter(r => r.tipo === 'tabla');
  const textos = regiones.filter(r => r.tipo === 'texto');

  return {
    regiones,
    metadata,
    estadisticas: {
      totalRegiones: regiones.length,
      regionesTabla: tablas.length,
      regionesTexto: textos.length,
      totalFilasTabla: tablas.reduce((sum, t) => sum + t.filas.length, 0),
      totalCaracteres: texto.length,
      totalPaginas: paginas.length
    }
  };
}

module.exports = {
  esLineaTabular,
  esHeaderTabla,
  detectarRegiones,
  extraerTextoPDF,
  parsearPDFConTablas,
  TABLE_HEADER_KEYWORDS
};
