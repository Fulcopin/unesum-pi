/**
 * Rutas del sistema RAG (Retrieval-Augmented Generation)
 * Base path: /api/rag
 */

const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const multer = require('multer');

// Configurar multer para archivos (PDF, Word, Excel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max para PDFs grandes
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.match(/\.(pdf|xlsx|xls|docx|doc)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Use PDF, Excel (.xlsx) o Word (.docx).'));
    }
  }
});

// ============================================================
// INGESTA DE DOCUMENTOS
// ============================================================

// Subir y procesar documento (PDF/Word/Excel → chunks → ChromaDB)
router.post('/ingestar',
  authenticate,
  authorize(['administrador', 'comision_academica']),
  upload.single('archivo'),
  ragController.ingestar
);

// Analizar PDF sin indexar (debug/preview de detección de tablas)
router.post('/analizar-pdf',
  authenticate,
  authorize(['administrador', 'comision_academica']),
  upload.single('archivo'),
  ragController.analizarPDF
);

// ============================================================
// CONSULTAS
// ============================================================

// Hacer pregunta al sistema RAG
router.post('/consultar',
  authenticate,
  authorize(['administrador', 'comision_academica', 'profesor', 'docente']),
  ragController.consultar
);

// ============================================================
// GESTIÓN
// ============================================================

// Ver estadísticas del vector store
router.get('/estadisticas',
  authenticate,
  authorize(['administrador', 'comision_academica']),
  ragController.estadisticas
);

// Listar documentos indexados
router.get('/documentos',
  authenticate,
  authorize(['administrador', 'comision_academica']),
  ragController.documentos
);

// Eliminar documento del índice
router.delete('/documento/:id',
  authenticate,
  authorize(['administrador']),
  ragController.eliminarDocumento
);

// Sincronizar toda la BD (programas analíticos + syllabi) → ChromaDB
router.post('/sincronizar-bd',
  authenticate,
  authorize(['administrador', 'comision_academica']),
  ragController.sincronizarDesdeDB
);

module.exports = router;
