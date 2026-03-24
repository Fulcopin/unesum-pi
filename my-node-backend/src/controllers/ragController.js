/**
 * RAG Controller
 * Endpoints para el sistema de Retrieval-Augmented Generation.
 * 
 * Endpoints:
 * - POST /ingestar      → Subir PDF y procesarlo (parse + chunking + indexación)
 * - POST /consultar      → Hacer pregunta al sistema RAG
 * - GET  /estadisticas   → Ver estadísticas del vector store
 * - GET  /documentos     → Listar documentos indexados
 * - DELETE /documento/:id → Eliminar documento del índice
 */

const { ingestarPDF, ingestarTexto, consultar, eliminarDocumentoRAG, estadisticasRAG } = require('../services/rag/ragPipeline');
const { parsearPDFConTablas } = require('../services/rag/pdfTableParser');
const { generarChunksAdaptativos } = require('../services/rag/adaptiveChunker');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const db = require('../models');

/**
 * POST /api/rag/ingestar
 * Sube un documento (PDF, Word, Excel) y lo procesa para indexación.
 */
exports.ingestar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo. Envíe un PDF, Word o Excel.'
      });
    }

    const { originalname, buffer, mimetype } = req.file;
    const coleccion = req.body.coleccion || undefined;
    let resultado;

    console.log(`📄 Archivo recibido: ${originalname} (${mimetype})`);

    if (mimetype === 'application/pdf' || originalname.match(/\.pdf$/i)) {
      // Ingesta de PDF con detección de tablas
      resultado = await ingestarPDF(buffer, originalname, { coleccion });
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword' ||
      originalname.match(/\.docx?$/i)
    ) {
      // Ingesta de Word
      const { value: texto } = await mammoth.extractRawText({ buffer });
      resultado = await ingestarTexto(texto, originalname, { coleccion });
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-excel' ||
      originalname.match(/\.xlsx?$/i)
    ) {
      // Ingesta de Excel
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let textoCompleto = '';
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        textoCompleto += `\n=== Hoja: ${sheetName} ===\n`;
        for (const fila of jsonData) {
          const filaTexto = fila.map(c => (c ? c.toString().trim() : '')).filter(c => c).join(' | ');
          if (filaTexto) textoCompleto += filaTexto + '\n';
        }
      }
      resultado = await ingestarTexto(textoCompleto, originalname, { coleccion });
    } else {
      return res.status(400).json({
        success: false,
        message: `Formato no soportado: ${mimetype}. Use PDF, Word (.docx) o Excel (.xlsx).`
      });
    }

    res.json({
      success: true,
      message: `Documento "${originalname}" procesado e indexado exitosamente.`,
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error en ingesta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el documento.',
      error: error.message
    });
  }
};

/**
 * POST /api/rag/consultar
 * Realiza una pregunta al sistema RAG.
 * Body: { pregunta, topK?, soloTablas?, coleccion? }
 */
exports.consultar = async (req, res) => {
  try {
    const { pregunta, topK, soloTablas, coleccion } = req.body;

    if (!pregunta || typeof pregunta !== 'string' || pregunta.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una pregunta válida.'
      });
    }

    if (pregunta.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'La pregunta no debe exceder 2000 caracteres.'
      });
    }

    const resultado = await consultar(pregunta.trim(), {
      topK: topK ? parseInt(topK, 10) : 5,
      soloTablas: soloTablas === true,
      coleccion
    });

    res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error en consulta RAG:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la consulta.',
      error: error.message
    });
  }
};

/**
 * GET /api/rag/estadisticas
 * Retorna estadísticas del vector store.
 */
exports.estadisticas = async (req, res) => {
  try {
    const coleccion = req.query.coleccion || undefined;
    const stats = await estadisticasRAG(coleccion);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del sistema RAG.',
      error: error.message
    });
  }
};

/**
 * GET /api/rag/documentos
 * Lista los documentos indexados.
 */
exports.documentos = async (req, res) => {
  try {
    const stats = await estadisticasRAG(req.query.coleccion || undefined);

    res.json({
      success: true,
      data: {
        total: stats.documentosIndexados,
        documentos: stats.listaDocumentos
      }
    });
  } catch (error) {
    console.error('❌ Error al listar documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar documentos indexados.',
      error: error.message
    });
  }
};

/**
 * DELETE /api/rag/documento/:id
 * Elimina un documento del índice vectorial.
 */
exports.eliminarDocumento = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un ID de documento válido.'
      });
    }

    const resultado = await eliminarDocumentoRAG(id, req.query.coleccion || undefined);

    res.json({
      success: true,
      message: `Documento ${id} eliminado del índice.`,
      data: resultado
    });
  } catch (error) {
    console.error('❌ Error al eliminar documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar documento.',
      error: error.message
    });
  }
};

/**
 * POST /api/rag/analizar-pdf
 * Analiza un PDF sin indexarlo — muestra las regiones detectadas y chunks generados.
 * Útil para debug y validar la detección de tablas.
 */
exports.analizarPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó un archivo PDF.'
      });
    }

    const { buffer, originalname } = req.file;

    const { regiones, metadata, estadisticas } = await parsearPDFConTablas(buffer);

    const chunks = generarChunksAdaptativos(
      regiones.map(r => r.contenido).join('\n'),
      { id: 'preview', nombre: originalname }
    );

    res.json({
      success: true,
      data: {
        archivo: originalname,
        metadata,
        estadisticas,
        regiones: regiones.map(r => ({
          tipo: r.tipo,
          inicio: r.inicio,
          fin: r.fin,
          headerDetectado: r.headerDetectado,
          filaMaxLarga: r.filaMaxLarga,
          preview: r.contenido.substring(0, 300) + (r.contenido.length > 300 ? '...' : '')
        })),
        chunks: {
          total: chunks.length,
          porTipo: {
            tabla: chunks.filter(c => c.metadata.tipo === 'tabla').length,
            texto: chunks.filter(c => c.metadata.tipo === 'texto').length
          },
          preview: chunks.slice(0, 5).map(c => ({
            tipo: c.metadata.tipo,
            tamano: c.metadata.tamano,
            contenido: c.contenido.substring(0, 200) + (c.contenido.length > 200 ? '...' : '')
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al analizar PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error al analizar el PDF.',
      error: error.message
    });
  }
};

// ============================================================
// SINCRONIZACIÓN DESDE BASE DE DATOS
// ============================================================

/**
 * Convierte un objeto JSON (datos_tabla / datos_syllabus) a texto legible
 * para que el LLM pueda procesar el contenido correctamente.
 */
function jsonATexto(obj, nivel = 0) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

  const indent = '  '.repeat(nivel);

  if (Array.isArray(obj)) {
    return obj
      .map((item, i) => {
        if (typeof item === 'object' && item !== null) {
          return `${indent}${i + 1}. ${jsonATexto(item, nivel + 1)}`;
        }
        return `${indent}- ${item}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (typeof v === 'object') {
        return `${indent}${label}:\n${jsonATexto(v, nivel + 1)}`;
      }
      return `${indent}${label}: ${v}`;
    })
    .join('\n');
}

/**
 * POST /api/rag/sincronizar-bd
 * Lee todos los programas analíticos y syllabi de la base de datos
 * y los indexa automáticamente en ChromaDB.
 * Solo administrador y comision_academica pueden ejecutarlo.
 */
exports.sincronizarDesdeDB = async (req, res) => {
  const resultados = {
    programasAnaliticos: { total: 0, indexados: 0, errores: [] },
    syllabi: { total: 0, indexados: 0, errores: [] }
  };

  try {
    console.log('🔄 Iniciando sincronización BD → ChromaDB...');

    // ── 1. PROGRAMAS ANALÍTICOS ──────────────────────────────────
    const programas = await db.ProgramasAnaliticos.findAll();

    resultados.programasAnaliticos.total = programas.length;
    console.log(`📚 Encontrados ${programas.length} programas analíticos`);

    for (const prog of programas) {
      try {
        const nombre = `PA - ${prog.nombre} - ${prog.periodo || 'Sin periodo'}`;

        const texto = [
          `=== PROGRAMA ANALÍTICO ===`,
          `Nombre: ${prog.nombre}`,
          `Periodo: ${prog.periodo || 'No especificado'}`,
          ``,
          jsonATexto(prog.datos_tabla)
        ].filter(Boolean).join('\n');

        await ingestarTexto(texto, nombre);
        resultados.programasAnaliticos.indexados++;
        console.log(`  ✅ Indexado: ${nombre}`);
      } catch (err) {
        const msg = `PA ID ${prog.id}: ${err.message}`;
        resultados.programasAnaliticos.errores.push(msg);
        console.error(`  ❌ ${msg}`);
      }
    }

    // ── 2. SYLLABI ───────────────────────────────────────────────
    const syllabi = await db.Syllabus.findAll({
      include: [
        {
          model: db.Asignatura,
          as: 'asignatura',
          required: false,
          attributes: ['id', 'nombre', 'codigo']
        }
      ]
    });

    resultados.syllabi.total = syllabi.length;
    console.log(`📖 Encontrados ${syllabi.length} syllabi`);

    for (const syl of syllabi) {
      try {
        const asignaturaNombre = syl.asignatura?.nombre || syl.materias || syl.nombre;
        const asignaturaCodigo = syl.asignatura?.codigo || '';
        const nombre = `SYL - ${asignaturaNombre}${asignaturaCodigo ? ` (${asignaturaCodigo})` : ''} - ${syl.periodo || 'Sin periodo'}`;

        const texto = [
          `=== SYLLABUS ===`,
          `Materia: ${asignaturaNombre}`,
          asignaturaCodigo ? `Código: ${asignaturaCodigo}` : '',
          `Periodo: ${syl.periodo || 'No especificado'}`,
          ``,
          jsonATexto(syl.datos_syllabus)
        ].filter(Boolean).join('\n');

        await ingestarTexto(texto, nombre);
        resultados.syllabi.indexados++;
        console.log(`  ✅ Indexado: ${nombre}`);
      } catch (err) {
        const msg = `Syllabus ID ${syl.id}: ${err.message}`;
        resultados.syllabi.errores.push(msg);
        console.error(`  ❌ ${msg}`);
      }
    }

    const totalIndexados = resultados.programasAnaliticos.indexados + resultados.syllabi.indexados;
    const totalErrores = resultados.programasAnaliticos.errores.length + resultados.syllabi.errores.length;
    console.log(`✅ Sincronización completada: ${totalIndexados} documentos indexados, ${totalErrores} errores`);

    res.json({
      success: true,
      message: `Sincronización completada: ${totalIndexados} documentos indexados.`,
      data: resultados
    });

  } catch (error) {
    console.error('❌ Error en sincronización BD:', error);
    res.status(500).json({
      success: false,
      message: 'Error al sincronizar con la base de datos.',
      error: error.message,
      data: resultados
    });
  }
};
