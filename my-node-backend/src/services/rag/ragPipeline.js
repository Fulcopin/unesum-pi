/**
 * RAG Pipeline - Sistema de Retrieval-Augmented Generation
 * 
 * Orquesta el flujo completo:
 * 1. Ingesta: PDF → Parse tabla-aware → Chunking adaptativo → Indexación en ChromaDB
 * 2. Consulta: Pregunta → Embedding → Búsqueda vectorial → Contexto → LLM → Respuesta
 * 
 * Usa LangChain para la orquestación y Groq (Llama 3.3 70B) como modelo gratuito.
 */

const { ChatGroq } = require('@langchain/groq');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { StringOutputParser } = require('@langchain/core/output_parsers');

const { parsearPDFConTablas, extraerTextoPDF } = require('./pdfTableParser');
const { generarChunksAdaptativos, CONFIG_DEFAULT } = require('./adaptiveChunker');
const { indexarChunks, buscarSimilares, eliminarDocumento, obtenerEstadisticas, listarDocumentosIndexados } = require('./vectorStore');

const crypto = require('crypto');

/**
 * Obtiene el modelo LLM via Groq (Llama 3.3 70B - API gratuita).
 * Registrarse en https://console.groq.com para obtener API key gratis.
 */
function getLLM() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no configurada. Obtén una gratis en https://console.groq.com');
  }

  return new ChatGroq({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    apiKey,
    temperature: 0.2,
    maxTokens: 2048,
  });
}

/**
 * System prompt optimizado para consultas académicas con contexto tabular.
 */
const SYSTEM_PROMPT = `Eres un asistente académico de la Universidad Estatal del Sur de Manabí (UNESUM).
Tu rol es responder preguntas sobre programas de estudio, syllabi, mallas curriculares,
horarios, créditos, prerequisitos y contenidos académicos.

REGLAS IMPORTANTES:
1. Responde ÚNICAMENTE basándote en el contexto proporcionado.
2. Si el contexto incluye datos TABULARES (marcados con [TABLA:...]), presta especial atención
   a las relaciones entre columnas (ej: asignatura-créditos, horario-docente).
3. Si no encuentras la información en el contexto, indica claramente que no está disponible.
4. Responde en español.
5. Sé preciso con datos numéricos (créditos, horas, porcentajes).
6. Cuando cites datos de tablas, presenta la información de forma estructurada.`;

// ============================================================
// PIPELINE DE INGESTA
// ============================================================

/**
 * Ingesta completa de un PDF: parseo → chunking adaptativo → indexación.
 * 
 * @param {Buffer} pdfBuffer - Buffer del archivo PDF
 * @param {string} nombreDocumento - Nombre original del archivo
 * @param {Object} [opciones] - Opciones adicionales
 * @param {Object} [opciones.chunkConfig] - Configuración de chunking personalizada
 * @param {string} [opciones.coleccion] - Colección de ChromaDB
 * @returns {Promise<Object>} Resultado de la ingesta
 */
async function ingestarPDF(pdfBuffer, nombreDocumento, opciones = {}) {
  const inicio = Date.now();
  const documentoId = crypto.randomUUID();

  console.log(`📄 Iniciando ingesta: ${nombreDocumento} (ID: ${documentoId})`);

  // 1. Parsear PDF con detección de tablas
  console.log('🔍 Paso 1: Parseando PDF con detección de tablas...');
  const { regiones, metadata, estadisticas: statsParser } = await parsearPDFConTablas(pdfBuffer);

  console.log(`   → ${statsParser.totalRegiones} regiones detectadas ` +
    `(${statsParser.regionesTabla} tablas, ${statsParser.regionesTexto} texto)`);

  // 2. Generar chunks adaptativos
  console.log('✂️  Paso 2: Generando chunks adaptativos...');
  const { texto } = await extraerTextoPDF(pdfBuffer);
  const config = { ...CONFIG_DEFAULT, ...(opciones.chunkConfig || {}) };
  const chunks = generarChunksAdaptativos(texto, {
    id: documentoId,
    nombre: nombreDocumento
  }, config);

  const chunksTabla = chunks.filter(c => c.metadata.tipo === 'tabla');
  const chunksTexto = chunks.filter(c => c.metadata.tipo === 'texto');
  console.log(`   → ${chunks.length} chunks generados (${chunksTabla.length} tabla, ${chunksTexto.length} texto)`);

  // 3. Indexar en ChromaDB
  console.log('📦 Paso 3: Indexando en ChromaDB...');
  const resultadoIndex = await indexarChunks(chunks, opciones.coleccion);

  const tiempoTotal = Date.now() - inicio;
  console.log(`✅ Ingesta completada en ${tiempoTotal}ms`);

  return {
    documentoId,
    nombreDocumento,
    metadata,
    estadisticas: {
      ...statsParser,
      totalChunks: chunks.length,
      chunksTabla: chunksTabla.length,
      chunksTexto: chunksTexto.length,
      chunksIndexados: resultadoIndex.indexados,
      erroresIndexacion: resultadoIndex.errores,
      tiempoIngestaMs: tiempoTotal
    }
  };
}

/**
 * Ingesta de texto plano (para documentos ya extraídos como Word/Excel).
 */
async function ingestarTexto(texto, nombreDocumento, opciones = {}) {
  const inicio = Date.now();
  const documentoId = crypto.randomUUID();

  const config = { ...CONFIG_DEFAULT, ...(opciones.chunkConfig || {}) };
  const chunks = generarChunksAdaptativos(texto, {
    id: documentoId,
    nombre: nombreDocumento
  }, config);

  const resultadoIndex = await indexarChunks(chunks, opciones.coleccion);

  return {
    documentoId,
    nombreDocumento,
    estadisticas: {
      totalChunks: chunks.length,
      chunksIndexados: resultadoIndex.indexados,
      erroresIndexacion: resultadoIndex.errores,
      tiempoIngestaMs: Date.now() - inicio
    }
  };
}

// ============================================================
// PIPELINE DE CONSULTA
// ============================================================

/**
 * Consulta completa al sistema RAG.
 * Busca contexto relevante en ChromaDB y genera respuesta con el LLM.
 * 
 * @param {string} pregunta - Pregunta del usuario
 * @param {Object} [opciones] - Opciones de consulta
 * @param {number} [opciones.topK=5] - Chunks de contexto a recuperar
 * @param {Object} [opciones.filtro] - Filtro por metadatos
 * @param {string} [opciones.coleccion] - Colección de ChromaDB
 * @param {boolean} [opciones.soloTablas=false] - Buscar solo en chunks de tabla
 * @param {boolean} [opciones.incluirFuentes=true] - Incluir fuentes en la respuesta
 * @returns {Promise<Object>} Respuesta generada con fuentes
 */
async function consultar(pregunta, opciones = {}) {
  const inicio = Date.now();
  const { topK = 5, filtro, coleccion, soloTablas = false, incluirFuentes = true } = opciones;

  // 1. Construir filtro
  let filtroFinal = filtro || {};
  if (soloTablas) {
    filtroFinal = { ...filtroFinal, tipo: 'tabla' };
  }

  // 2. Buscar chunks relevantes en ChromaDB
  console.log(`🔎 Buscando contexto para: "${pregunta.substring(0, 80)}..."`);
  const { resultados, tiempoMs: tiempoBusqueda } = await buscarSimilares(pregunta, {
    topK,
    filtro: Object.keys(filtroFinal).length > 0 ? filtroFinal : null,
    coleccion
  });

  if (resultados.length === 0) {
    return {
      respuesta: 'No se encontró información relevante en los documentos indexados para responder esta pregunta.',
      fuentes: [],
      tiempoMs: Date.now() - inicio,
      contextoUsado: 0
    };
  }

  console.log(`   → ${resultados.length} chunks relevantes encontrados (${tiempoBusqueda}ms)`);

  // 3. Construir contexto para el LLM
  const contexto = resultados.map((r, i) => {
    const tipoLabel = r.metadata.tipo === 'tabla' ? '📊 TABLA' : '📝 TEXTO';
    const header = r.metadata.headerTabla ? ` (${r.metadata.headerTabla})` : '';
    const fuente = r.metadata.documentoNombre || 'Desconocido';
    return `--- Fragmento ${i + 1} [${tipoLabel}${header}] (Fuente: ${fuente}) ---\n${r.contenido}`;
  }).join('\n\n');

  // 4. Generar respuesta con el LLM
  console.log('🤖 Generando respuesta con LLM...');
  const llm = getLLM();
  const parser = new StringOutputParser();

  const mensajes = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(
      `CONTEXTO RECUPERADO:\n${contexto}\n\n---\n\nPREGUNTA: ${pregunta}\n\nResponde basándote únicamente en el contexto proporcionado.`
    )
  ];

  const respuestaLLM = await llm.invoke(mensajes);
  const respuestaTexto = await parser.invoke(respuestaLLM);

  // 5. Preparar fuentes
  const fuentes = incluirFuentes ? resultados.map(r => ({
    documento: r.metadata.documentoNombre,
    tipo: r.metadata.tipo,
    headerTabla: r.metadata.headerTabla || null,
    relevancia: r.distancia ? (1 - r.distancia).toFixed(4) : null,
    fragmento: r.contenido.substring(0, 200) + (r.contenido.length > 200 ? '...' : '')
  })) : [];

  const tiempoTotal = Date.now() - inicio;
  console.log(`✅ Respuesta generada en ${tiempoTotal}ms`);

  return {
    respuesta: respuestaTexto,
    fuentes,
    tiempoMs: tiempoTotal,
    contextoUsado: resultados.length,
    metricas: {
      tiempoBusquedaMs: tiempoBusqueda,
      tiempoGeneracionMs: tiempoTotal - tiempoBusqueda,
      chunksRecuperados: resultados.length,
      chunksTabla: resultados.filter(r => r.metadata.tipo === 'tabla').length,
      chunksTexto: resultados.filter(r => r.metadata.tipo === 'texto').length
    }
  };
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Elimina un documento del índice vectorial.
 */
async function eliminarDocumentoRAG(documentoId, coleccion) {
  await eliminarDocumento(documentoId, coleccion);
  return { eliminado: true, documentoId };
}

/**
 * Estadísticas del sistema RAG.
 */
async function estadisticasRAG(coleccion) {
  const stats = await obtenerEstadisticas(coleccion);
  const docs = await listarDocumentosIndexados(coleccion);
  return {
    ...stats,
    documentosIndexados: docs.length,
    listaDocumentos: docs
  };
}

module.exports = {
  ingestarPDF,
  ingestarTexto,
  consultar,
  eliminarDocumentoRAG,
  estadisticasRAG,
  SYSTEM_PROMPT,
  getLLM
};
