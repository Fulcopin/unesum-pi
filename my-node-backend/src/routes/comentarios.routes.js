// comentarios.routes.js
// Rutas para comentarios/retroalimentación sobre documentos del docente

const express = require('express');
const router = express.Router();
const comentariosController = require('../controllers/comentariosController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const todosLosRoles = ['administrador', 'comision_academica', 'comision', 'docente', 'profesor'];

// 📋 LISTAR comentarios de un documento
// GET /api/comentarios-documento?tipo=syllabus&id=X
router.get('/',
  authenticate,
  authorize(todosLosRoles),
  comentariosController.listar
);

// 📋 MIS DOCUMENTOS con su conteo de comentarios (vista docente)
// GET /api/comentarios-documento/mis-documentos?periodo=X
router.get('/mis-documentos',
  authenticate,
  authorize(todosLosRoles),
  comentariosController.misDocumentos
);

// 💬 CREAR un comentario
// POST /api/comentarios-documento
router.post('/',
  authenticate,
  authorize(todosLosRoles),
  comentariosController.crear
);

// ✅ MARCAR comentarios como leídos
// PUT /api/comentarios-documento/marcar-leido
router.put('/marcar-leido',
  authenticate,
  authorize(todosLosRoles),
  comentariosController.marcarLeido
);

// 🗑️ ELIMINAR un comentario (solo el autor o admin)
// DELETE /api/comentarios-documento/:id
router.delete('/:id',
  authenticate,
  authorize(todosLosRoles),
  comentariosController.eliminar
);

module.exports = router;
