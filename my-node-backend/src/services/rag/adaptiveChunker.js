/**
 * Adaptive Recursive Chunking Strategy
 * 
 * Implementa chunking recursivo con ventana de superposición adaptativa:
 * - Para regiones de TABLA: usa separador de fila (\n) y overlap = longitud de fila más larga
 * - Para regiones de TEXTO: usa separadores por párrafo con overlap estándar
 * 
 * Este enfoque previene que el chunking estándar rompa tablas, causando
 * alucinaciones en las relaciones de datos (horarios, créditos, prerequisitos).
 */

const { detectarRegiones } = require('./pdfTableParser');

/**
 * @typedef {Object} Chunk
 * @property {string} contenido - Texto del chunk
 * @property {Object} metadata - Metadatos del chunk
 * @property {string} metadata.tipo - 'tabla' | 'texto'
 * @property {number} metadata.indiceChunk - Índice del chunk dentro de la región
 * @property {number} metadata.indiceRegion - Índice de la región en el documento
 * @property {number} metadata.lineaInicio - Línea de inicio en el documento original
 * @property {number} metadata.lineaFin - Línea de fin en el documento original
 * @property {string|null} metadata.headerTabla - Encabezado de tabla detectado
 * @property {string} metadata.documentoId - ID del documento fuente
 * @property {string} metadata.documentoNombre - Nombre del documento fuente
 */

/**
 * Configuración por defecto del chunking.
 */
const CONFIG_DEFAULT = {
  // Texto normal
  textoChunkSize: 1000,       // Tamaño máximo de chunk para texto (caracteres)
  textoOverlap: 200,          // Overlap estándar para texto
  textoSeparadores: ['\n\n', '\n', '. ', ' '],  // Separadores jerárquicos para texto

  // Tablas
  tablaChunkSize: 2000,       // Tamaño máximo de chunk para tablas (más grande para no fragmentar)
  tablaOverlapMultiplier: 1.5, // Multiplicador del overlap respecto a la fila más larga
  tablaMinOverlap: 100,       // Overlap mínimo para tablas
  tablaMaxOverlap: 500,       // Overlap máximo para tablas
  
  // Contexto
  incluirHeaderEnChunks: true, // Incluir el header de tabla en cada chunk de esa tabla
  prefijoCotexto: true         // Agregar prefijo indicando tipo de contenido
};

/**
 * Divide texto recursivamente usando una lista jerárquica de separadores.
 * Cuando un chunk excede el tamaño máximo, intenta el siguiente separador.
 * 
 * @param {string} texto - Texto a dividir
 * @param {number} chunkSize - Tamaño máximo por chunk
 * @param {number} overlap - Caracteres de superposición entre chunks
 * @param {string[]} separadores - Lista jerárquica de separadores
 * @returns {string[]} Lista de chunks
 */
function chunkingRecursivo(texto, chunkSize, overlap, separadores) {
  if (texto.length <= chunkSize) {
    return [texto];
  }

  if (separadores.length === 0) {
    // Sin más separadores, cortar por tamaño duro
    return cortarPorTamano(texto, chunkSize, overlap);
  }

  const separador = separadores[0];
  const partes = texto.split(separador);

  if (partes.length === 1) {
    // Este separador no divide el texto, intentar el siguiente
    return chunkingRecursivo(texto, chunkSize, overlap, separadores.slice(1));
  }

  const chunks = [];
  let chunkActual = '';

  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i];
    const textoTentativo = chunkActual
      ? chunkActual + separador + parte
      : parte;

    if (textoTentativo.length <= chunkSize) {
      chunkActual = textoTentativo;
    } else {
      // El chunk actual está lleno
      if (chunkActual) {
        chunks.push(chunkActual);
      }

      // Si la parte sola excede el tamaño, dividir recursivamente
      if (parte.length > chunkSize) {
        const subChunks = chunkingRecursivo(parte, chunkSize, overlap, separadores.slice(1));
        chunks.push(...subChunks);
        chunkActual = '';
      } else {
        chunkActual = parte;
      }
    }
  }

  if (chunkActual.trim()) {
    chunks.push(chunkActual);
  }

  // Aplicar overlap entre chunks consecutivos
  return aplicarOverlap(chunks, overlap, separador);
}

/**
 * Corta texto por tamaño fijo cuando no hay separadores disponibles.
 */
function cortarPorTamano(texto, chunkSize, overlap) {
  const chunks = [];
  let inicio = 0;

  while (inicio < texto.length) {
    const fin = Math.min(inicio + chunkSize, texto.length);
    chunks.push(texto.slice(inicio, fin));
    inicio += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Aplica superposición entre chunks consecutivos.
 * Toma las últimas N caracteres del chunk anterior y las prepende al siguiente.
 */
function aplicarOverlap(chunks, overlap, separador) {
  if (overlap <= 0 || chunks.length <= 1) return chunks;

  const resultado = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const chunkAnterior = chunks[i - 1];
    // Tomar el final del chunk anterior como overlap
    const partesAnterior = chunkAnterior.split(separador);
    
    let overlapTexto = '';
    let longAcumulada = 0;

    // Tomar las últimas partes hasta llenar el overlap
    for (let j = partesAnterior.length - 1; j >= 0; j--) {
      const candidato = partesAnterior[j] + (overlapTexto ? separador + overlapTexto : '');
      if (candidato.length > overlap) break;
      overlapTexto = candidato;
      longAcumulada = candidato.length;
    }

    if (overlapTexto) {
      resultado.push(overlapTexto + separador + chunks[i]);
    } else {
      resultado.push(chunks[i]);
    }
  }

  return resultado;
}

/**
 * Chunking adaptativo para regiones de tabla.
 * El overlap se adapta al tamaño de la fila más larga para nunca cortar una fila a la mitad.
 * 
 * @param {Object} regionTabla - Región de tipo 'tabla' del parser
 * @param {Object} config - Configuración de chunking
 * @returns {string[]} Chunks de tabla
 */
function chunkingTabla(regionTabla, config = CONFIG_DEFAULT) {
  const { filas, filaMaxLarga, headerDetectado } = regionTabla;

  // Overlap adaptativo: basado en la fila más larga
  let overlapAdaptativo = Math.ceil(filaMaxLarga * config.tablaOverlapMultiplier);
  overlapAdaptativo = Math.max(overlapAdaptativo, config.tablaMinOverlap);
  overlapAdaptativo = Math.min(overlapAdaptativo, config.tablaMaxOverlap);

  // Prefijo de contexto para cada chunk
  const prefijo = config.prefijoCotexto
    ? `[TABLA${headerDetectado ? ': ' + headerDetectado : ''}]\n`
    : '';

  // Usar \n como separador único para tablas (separar por filas)
  const chunks = [];
  let chunkActual = prefijo;
  let filasEnChunk = 0;

  // Si se debe incluir el header, guardarlo para repetirlo
  let headerFila = null;
  if (config.incluirHeaderEnChunks && filas.length > 0) {
    // La primera fila no-vacía suele ser el header
    const primeraFila = filas.find(f => f.trim().length > 0);
    if (primeraFila) {
      headerFila = primeraFila;
    }
  }

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const tentativo = chunkActual + fila + '\n';

    if (tentativo.length > config.tablaChunkSize && filasEnChunk > 0) {
      // Guardar chunk actual
      chunks.push(chunkActual.trim());

      // Iniciar nuevo chunk con overlap: incluir las últimas filas del anterior
      chunkActual = prefijo;
      if (headerFila && i > 1) {
        chunkActual += headerFila + '\n';
      }

      // Overlap: retroceder filas para incluir contexto
      const filasOverlap = Math.ceil(overlapAdaptativo / (filaMaxLarga || 50));
      const inicioOverlap = Math.max(0, i - filasOverlap);
      for (let j = inicioOverlap; j < i; j++) {
        chunkActual += filas[j] + '\n';
      }

      chunkActual += fila + '\n';
      filasEnChunk = filasOverlap + 1;
    } else {
      chunkActual = tentativo;
      filasEnChunk++;
    }
  }

  if (chunkActual.trim() && chunkActual.trim() !== prefijo.trim()) {
    chunks.push(chunkActual.trim());
  }

  return chunks;
}

/**
 * Chunking para regiones de texto normal.
 * Usa separadores jerárquicos (párrafo > línea > oración > espacio).
 */
function chunkingTexto(regionTexto, config = CONFIG_DEFAULT) {
  return chunkingRecursivo(
    regionTexto.contenido,
    config.textoChunkSize,
    config.textoOverlap,
    config.textoSeparadores
  ).filter(c => c.trim().length > 0);
}

/**
 * Pipeline principal: toma el texto completo de un documento y produce chunks
 * con metadatos enriquecidos, aplicando estrategia adaptativa por tipo de región.
 * 
 * @param {string} textoCompleto - Texto crudo del documento
 * @param {Object} metadataDocumento - Metadatos del documento fuente
 * @param {string} metadataDocumento.id - ID del documento
 * @param {string} metadataDocumento.nombre - Nombre del documento
 * @param {Object} [config] - Configuración personalizada de chunking
 * @returns {Chunk[]} Lista de chunks con metadatos
 */
function generarChunksAdaptativos(textoCompleto, metadataDocumento, config = CONFIG_DEFAULT) {
  const regiones = detectarRegiones(textoCompleto);
  const todosLosChunks = [];
  let indiceGlobal = 0;

  for (let r = 0; r < regiones.length; r++) {
    const region = regiones[r];
    let chunksTexto;

    if (region.tipo === 'tabla') {
      chunksTexto = chunkingTabla(region, config);
    } else {
      chunksTexto = chunkingTexto(region, config);
    }

    for (let c = 0; c < chunksTexto.length; c++) {
      todosLosChunks.push({
        contenido: chunksTexto[c],
        metadata: {
          tipo: region.tipo,
          indiceChunk: indiceGlobal,
          indiceRegion: r,
          lineaInicio: region.inicio,
          lineaFin: region.fin,
          headerTabla: region.headerDetectado,
          documentoId: metadataDocumento.id,
          documentoNombre: metadataDocumento.nombre,
          tamano: chunksTexto[c].length
        }
      });
      indiceGlobal++;
    }
  }

  return todosLosChunks;
}

module.exports = {
  chunkingRecursivo,
  chunkingTabla,
  chunkingTexto,
  generarChunksAdaptativos,
  CONFIG_DEFAULT
};
