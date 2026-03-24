/**
 * RAG Module - Índice principal
 * 
 * Sistema de Retrieval-Augmented Generation para UNESUM
 * con chunking recursivo adaptativo y detección de tablas.
 * 
 * Módulos:
 * - pdfTableParser:   Extrae PDF y detecta regiones de tabla vs texto
 * - adaptiveChunker:  Chunking recursivo con overlap adaptativo por tipo de región
 * - vectorStore:      Gestión de ChromaDB (indexación, búsqueda, embeddings)
 * - ragPipeline:      Orquestación completa ingesta + consulta con LangChain
 */

const pdfTableParser = require('./pdfTableParser');
const adaptiveChunker = require('./adaptiveChunker');
const vectorStore = require('./vectorStore');
const ragPipeline = require('./ragPipeline');

module.exports = {
  // Parser de PDF con detección de tablas
  ...pdfTableParser,

  // Chunking adaptativo
  ...adaptiveChunker,

  // Vector Store (ChromaDB)
  ...vectorStore,

  // Pipeline RAG completo
  ...ragPipeline
};
