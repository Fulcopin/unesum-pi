// comisionAcademica.routes.js
// Rutas para la Comisión Académica

const express = require('express');
const router = express.Router();
const comisionAcademicaController = require('../controllers/comisionAcademicaController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * Rutas para Comisión Académica
 * Base path: /api/comision-academica
 */

// 🏫 OBTENER ESTRUCTURA COMPLETA DE LA FACULTAD (carreras, mallas, asignaturas)
router.get('/estructura-facultad', 
  authenticate, 
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.obtenerEstructuraFacultad
);

// 📚 OBTENER ASIGNATURAS DE UNA CARRERA ESPECÍFICA
router.get('/carreras/:carrera_id/asignaturas', 
  authenticate, 
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.obtenerAsignaturasCarrera
);

// =========================================================================
// CRUD SYLLABUS COMISIÓN ACADÉMICA
// =========================================================================

// 📋 LISTAR todos los syllabus comisión (GET /api/comision-academica/syllabus)
router.get('/syllabus',
  authenticate,
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.listarSyllabusComision
);

// 📖 BUSCAR por asignatura+periodo (GET /api/comision-academica/syllabus/buscar?asignatura_id=X&periodo=Y)
router.get('/syllabus/buscar',
  authenticate,
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.obtenerSyllabusPorAsignaturaPeriodo
);

// 📖 OBTENER por ID (GET /api/comision-academica/syllabus/:id)
router.get('/syllabus/:id',
  authenticate,
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.obtenerSyllabusComision
);

// 📝 CREAR nuevo (POST /api/comision-academica/syllabus)
router.post('/syllabus',
  authenticate,
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.crearSyllabusComision
);

// ✏️ ACTUALIZAR (PUT /api/comision-academica/syllabus/:id)
router.put('/syllabus/:id',
  authenticate,
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.actualizarSyllabusComision
);

// 🗑️ ELIMINAR (DELETE /api/comision-academica/syllabus/:id)
router.delete('/syllabus/:id',
  authenticate,
  authorize(['administrador', 'comision_academica', 'comision']),
  comisionAcademicaController.eliminarSyllabusComision
);

module.exports = router;

