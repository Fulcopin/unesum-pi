/**
 * ChromaDB Vector Store Manager
 * 
 * Gestiona la conexión con ChromaDB, las colecciones, y las operaciones
 * de indexación y búsqueda vectorial para el sistema RAG.
 * Utiliza embeddings de Google Generative AI para generar vectores.
 */

const { ChromaClient } = require('chromadb');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

const COLLECTION_NAME = 'unesum_programas_estudio';

let chromaClient = null;
let embeddingsModel = null;

/**
 * Inicializa el cliente ChromaDB y el modelo de embeddings.
 */
function getChromaClient() {
  if (!chromaClient) {
    const host = process.env.CHROMA_HOST || 'localhost';
    const port = parseInt(process.env.CHROMA_PORT || '8000', 10);
    chromaClient = new ChromaClient({ path: `http://${host}:${port}` });
  }
  return chromaClient;
}

/**
 * Obtiene o crea el modelo de embeddings de Google.
 */
function getEmbeddingsModel() {
  if (!embeddingsModel) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY no está configurada');
    }
    embeddingsModel = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: 'gemini-embedding-001'
    });
  }
  return embeddingsModel;
}

/**
 * Genera embeddings para una lista de textos usando el modelo de Google.
 * @param {string[]} textos - Lista de textos
 * @returns {Promise<number[][]>} Embeddings generados
 */
async function generarEmbeddings(textos) {
  const model = getEmbeddingsModel();
  const embeddings = await model.embedDocuments(textos);
  return embeddings;
}

/**
 * Genera embedding para una consulta individual.
 * @param {string} texto - Texto de consulta
 * @returns {Promise<number[]>} Embedding de la consulta
 */
async function generarEmbeddingConsulta(texto) {
  const model = getEmbeddingsModel();
  const embedding = await model.embedQuery(texto);
  return embedding;
}

/**
 * Obtiene o crea la colección principal en ChromaDB.
 * @param {string} [nombreColeccion] - Nombre de la colección
 * @returns {Promise<Object>} Colección de ChromaDB
 */
async function obtenerColeccion(nombreColeccion = COLLECTION_NAME) {
  const client = getChromaClient();
  const coleccion = await client.getOrCreateCollection({
    name: nombreColeccion,
    metadata: {
      description: 'Programas de estudio UNESUM - Chunks con detección de tablas',
      'hnsw:space': 'cosine'
    }
  });
  return coleccion;
}

/**
 * Indexa chunks en ChromaDB con sus embeddings y metadatos.
 * Procesa en lotes para evitar sobrecargar la API de embeddings.
 * 
 * @param {import('./adaptiveChunker').Chunk[]} chunks - Chunks a indexar
 * @param {string} [nombreColeccion] - Colección destino
 * @param {number} [batchSize=20] - Tamaño del lote para procesamiento
 * @returns {Promise<{indexados: number, errores: number, tiempoMs: number}>}
 */
async function indexarChunks(chunks, nombreColeccion = COLLECTION_NAME, batchSize = 20) {
  const inicio = Date.now();
  const coleccion = await obtenerColeccion(nombreColeccion);
  let indexados = 0;
  let errores = 0;

  // Procesar en lotes
  for (let i = 0; i < chunks.length; i += batchSize) {
    const lote = chunks.slice(i, i + batchSize);

    try {
      const textos = lote.map(c => c.contenido);
      const embeddings = await generarEmbeddings(textos);

      const ids = lote.map(c => `${c.metadata.documentoId}_chunk_${c.metadata.indiceChunk}`);
      const metadatas = lote.map(c => ({
        tipo: c.metadata.tipo,
        indiceChunk: c.metadata.indiceChunk,
        indiceRegion: c.metadata.indiceRegion,
        lineaInicio: c.metadata.lineaInicio,
        lineaFin: c.metadata.lineaFin,
        headerTabla: c.metadata.headerTabla || '',
        documentoId: c.metadata.documentoId,
        documentoNombre: c.metadata.documentoNombre,
        tamano: c.metadata.tamano
      }));

      await coleccion.add({
        ids,
        embeddings,
        documents: textos,
        metadatas
      });

      indexados += lote.length;
      console.log(`📦 Lote ${Math.floor(i / batchSize) + 1}: ${lote.length} chunks indexados`);
    } catch (err) {
      console.error(`❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, err.message);
      errores += lote.length;
    }
  }

  return {
    indexados,
    errores,
    tiempoMs: Date.now() - inicio
  };
}

/**
 * Busca los chunks más similares a una consulta.
 * 
 * @param {string} consulta - Texto de la consulta del usuario
 * @param {Object} [opciones] - Opciones de búsqueda
 * @param {number} [opciones.topK=5] - Número de resultados
 * @param {Object} [opciones.filtro] - Filtro por metadatos (ej: {tipo: 'tabla'})
 * @param {string} [opciones.coleccion] - Nombre de la colección
 * @returns {Promise<{resultados: Array, tiempoMs: number}>}
 */
async function buscarSimilares(consulta, opciones = {}) {
  const { topK = 5, filtro = null, coleccion: nombreCol = COLLECTION_NAME } = opciones;
  const inicio = Date.now();

  const coleccion = await obtenerColeccion(nombreCol);
  const queryEmbedding = await generarEmbeddingConsulta(consulta);

  const queryParams = {
    queryEmbeddings: [queryEmbedding],
    nResults: topK
  };

  if (filtro) {
    queryParams.where = filtro;
  }

  const resultados = await coleccion.query(queryParams);

  const items = [];
  if (resultados.documents && resultados.documents[0]) {
    for (let i = 0; i < resultados.documents[0].length; i++) {
      items.push({
        contenido: resultados.documents[0][i],
        metadata: resultados.metadatas?.[0]?.[i] || {},
        distancia: resultados.distances?.[0]?.[i] || null,
        id: resultados.ids?.[0]?.[i] || null
      });
    }
  }

  return {
    resultados: items,
    tiempoMs: Date.now() - inicio
  };
}

/**
 * Elimina todos los documentos de un documento específico de la colección.
 * @param {string} documentoId - ID del documento a eliminar
 * @param {string} [nombreColeccion] - Colección
 */
async function eliminarDocumento(documentoId, nombreColeccion = COLLECTION_NAME) {
  const coleccion = await obtenerColeccion(nombreColeccion);
  await coleccion.delete({
    where: { documentoId }
  });
}

/**
 * Obtiene estadísticas de la colección.
 */
async function obtenerEstadisticas(nombreColeccion = COLLECTION_NAME) {
  const coleccion = await obtenerColeccion(nombreColeccion);
  const count = await coleccion.count();

  return {
    coleccion: nombreColeccion,
    totalDocumentos: count
  };
}

/**
 * Lista todos los documentos únicos indexados.
 */
async function listarDocumentosIndexados(nombreColeccion = COLLECTION_NAME) {
  const coleccion = await obtenerColeccion(nombreColeccion);
  const todos = await coleccion.get({
    limit: 10000
  });

  const documentos = new Map();
  if (todos.metadatas) {
    for (const meta of todos.metadatas) {
      if (meta.documentoId && !documentos.has(meta.documentoId)) {
        documentos.set(meta.documentoId, {
          id: meta.documentoId,
          nombre: meta.documentoNombre || 'Sin nombre'
        });
      }
    }
  }

  return Array.from(documentos.values());
}

module.exports = {
  getChromaClient,
  obtenerColeccion,
  indexarChunks,
  buscarSimilares,
  eliminarDocumento,
  obtenerEstadisticas,
  listarDocumentosIndexados,
  generarEmbeddings,
  generarEmbeddingConsulta
};
