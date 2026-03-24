// routes/asignaturaRoutes.js

const express = require('express');
const router = express.Router();
const asignaturaController = require('../controllers/asignaturaController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// =========================================================================
// --- RUTAS CRUD (Create, Read, Update, Delete) PARA ASIGNATURAS ---
// =========================================================================

// READ: Obtener todas las asignaturas (la ruta que te daba error 404)
// La petición del frontend es GET /api/asignaturas?nivel_id=X
router.get('/', authenticate, authorize(['administrador', 'comision_academica', 'comision', 'profesor', 'docente']), asignaturaController.getAllAsignaturas);

// READ: Obtener UNA asignatura por ID
// GET /api/asignatura/31
router.get('/:id', authenticate, authorize(['administrador', 'comision_academica', 'comision', 'profesor', 'docente']), asignaturaController.getAsignaturaById);

// CREATE: Crear la asignatura base (Secciones 1 y 2)
router.post('/', authenticate, authorize(['administrador', 'comision_academica']), asignaturaController.createAsignaturaBase);

// UPDATE: Actualizar la asignatura base (para el botón de Editar)
router.put('/:id', authenticate, authorize(['administrador', 'comision_academica']), asignaturaController.updateAsignaturaBase);

// DELETE: Eliminar una asignatura (para el botón de Eliminar)
router.delete('/:id', authenticate, authorize(['administrador', 'comision_academica']), asignaturaController.deleteAsignatura);


// =========================================================================
// --- RUTAS PARA LAS SECCIONES SECUNDARIAS (HORAS Y UNIDADES) ---
// =========================================================================

// Añadir/Actualizar la distribución de horas (Sección 3)
router.post('/:asignaturaId/horas', authenticate, authorize(['administrador', 'comision_academica']), asignaturaController.addHoras);

// Añadir/Actualizar las unidades temáticas (Sección 4)
router.post('/:asignaturaId/unidades', authenticate, authorize(['administrador', 'comision_academica']), asignaturaController.addUnidades);


module.exports = router;