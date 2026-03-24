// docenteEditor.routes.js
// Rutas para el editor del docente (syllabus y programa analítico)

const express = require('express');
const router = express.Router();
const docenteEditorController = require('../controllers/docenteEditorController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación como profesor/docente
router.use(authenticate);
router.use(authorize(['profesor', 'docente']));

// INFO DEL PROFESOR
router.get('/mi-info', docenteEditorController.getProfesorInfo);

// SYLLABUS
// Obtener syllabus de la comisión (template)
router.get('/syllabus/comision', docenteEditorController.getSyllabusComision);
// Obtener syllabus propio del docente (previamente guardado)
router.get('/syllabus/mio', docenteEditorController.getSyllabusDocente);
// Guardar syllabus del docente
router.post('/syllabus/guardar', docenteEditorController.guardarSyllabusDocente);

// PROGRAMA ANALÍTICO
// Obtener programa de la comisión (template)
router.get('/programa/comision', docenteEditorController.getProgramaComision);
// Obtener programa propio del docente
router.get('/programa/mio', docenteEditorController.getProgramaDocente);
// Guardar programa del docente
router.post('/programa/guardar', docenteEditorController.guardarProgramaDocente);

module.exports = router;
