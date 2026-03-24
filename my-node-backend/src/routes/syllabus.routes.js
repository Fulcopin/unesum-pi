const express = require('express');
const router = express.Router();
const syllabusController = require('../controllers/syllabusController');
const multer = require('multer');

// Importamos los middlewares que vamos a usar
const { authenticate, authorize } = require('../middlewares/auth.middleware'); // Asegúrate que la ruta sea correcta

// Configuración de multer para la carga de archivos
const upload = multer({ dest: 'uploads/' });

// -------------------------------------------------------------------
// PASO 1: APLICAMOS LA AUTENTICACIÓN (authenticate) A TODAS LAS RUTAS
// Cualquier petición a /api/syllabi/* primero deberá verificar que el token es válido.
router.use(authenticate);
// -------------------------------------------------------------------

// -------------------------------------------------------------------
// PASO 2: APLICAMOS LA AUTORIZACIÓN (authorize) RUTA POR RUTA
// -------------------------------------------------------------------

// POST /api/syllabi/upload -> Subir documento Word y crear syllabus automáticamente
// PERMITIDO PARA: profesores, comisión académica y administradores.
// IMPORTANTE: Esta ruta debe ir ANTES de las rutas genéricas para evitar conflictos
router.post('/upload', authorize(['profesor', 'administrador', 'comision_academica']), upload.single('file'), syllabusController.uploadDocument);

// POST /api/syllabi/upload-excel -> Subir archivo Excel y crear syllabus automáticamente
// PERMITIDO PARA: profesores, comisión académica y administradores.
router.post('/upload-excel', authorize(['profesor', 'administrador', 'comision_academica']), upload.single('file'), syllabusController.uploadExcel);

// POST /api/syllabi/extract-word-tables -> Extraer tablas crudas de un .docx (mammoth+cheerio)
// PERMITIDO PARA: profesores, comisión académica y administradores.
router.post('/extract-word-tables', authorize(['profesor', 'administrador', 'comision_academica']), upload.single('file'), syllabusController.extractWordTables);

// GET /api/syllabi/verificar-existencia -> Verificar si ya existe syllabus para materia/periodo
// PERMITIDO PARA: 'profesor', 'comision_academica', 'administrador'
// Query params: periodo, materia
router.get('/verificar-existencia', authorize(['profesor', 'administrador', 'comision_academica']), syllabusController.verificarExistencia);

// GET /api/syllabi/mine -> Obtener los syllabi del profesor logueado.
// PERMITIDO PARA: 'profesor' y 'administrador'.
// Es crucial que esta ruta esté ANTES de /:id para que "mine" no se confunda con un ID.
router.get('/mine', authorize(['profesor', 'administrador']), syllabusController.getMine);

// GET /api/syllabi -> Obtener TODOS los syllabi.
// Esta es una función de administrador y comisión académica.
// PERMITIDO PARA: 'administrador' y 'comision_academica'.
router.get('/', authorize(['administrador', 'comision_academica', 'comision']), syllabusController.getAll);

// POST /api/syllabi -> Crear un nuevo syllabus.
// PERMITIDO PARA: Ambos roles, profesores, comisión académica y administradores.
router.post('/', authorize(['profesor', 'administrador', 'comision_academica', 'comision']), syllabusController.create);

// GET /api/syllabi/:id -> Obtener un syllabus específico por su ID.
// PERMITIDO PARA: Todos los roles (un profesor o comisión podría necesitar ver un syllabus específico).
router.get('/:id', authorize(['profesor', 'administrador', 'comision_academica', 'comision']), syllabusController.getById);

// PUT /api/syllabi/:id -> Actualizar un syllabus existente.
// PERMITIDO PARA: Todos los roles. La lógica de "quién es el dueño" está dentro del controlador.
router.put('/:id', authorize(['profesor', 'administrador', 'comision_academica']), syllabusController.update);

// DELETE /api/syllabi/:id -> Eliminar (soft delete) un syllabus.
// PERMITIDO PARA: Todos los roles. La lógica de "quién es el dueño" está dentro del controlador.
router.delete('/:id', authorize(['profesor', 'administrador', 'comision_academica']), syllabusController.delete);

// -------------------------------------------------------------------
// NUEVAS RUTAS PARA VALIDACIÓN DE TÍTULOS
// -------------------------------------------------------------------

// POST /api/syllabi/plantilla/upload -> Admin sube plantilla de referencia con títulos
// PERMITIDO PARA: Solo 'administrador'
router.post('/plantilla/upload', authorize(['administrador']), upload.single('file'), syllabusController.subirPlantillaAdmin);

// POST /api/syllabi/:id/marcar-plantilla -> Marcar syllabus existente como plantilla
// PERMITIDO PARA: Solo 'administrador'
router.post('/:id/marcar-plantilla', authorize(['administrador']), syllabusController.marcarComoPlantilla);

// GET /api/syllabi/plantilla/:periodo -> Obtener plantilla de referencia de un periodo
// PERMITIDO PARA: Todos los roles autenticados
router.get('/plantilla/:periodo', syllabusController.obtenerPlantillaPeriodo);

// POST /api/syllabi/upload-validado -> Profesor/comisión sube syllabus con validación de títulos
// PERMITIDO PARA: 'profesor', 'comision', 'comision_academica'
router.post('/upload-validado', authorize(['profesor', 'comision', 'comision_academica']), upload.single('file'), syllabusController.subirSyllabusConValidacion);

module.exports = router;