const express = require('express');
const router = express.Router();
const programaAnaliticoController = require('../controllers/programaAnaliticoController');
const iaExtractorController = require('../controllers/iaExtractorController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const multer = require('multer');

// Configurar multer para archivos generales (upload de programas analíticos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(xlsx|xls|docx|doc)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Use Excel o Word.'));
    }
  }
});

// Configurar multer para la extracción con IA (mismo config pero por claridad)
const uploadIA = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(xlsx|xls|docx|doc)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Use Excel o Word.'));
    }
  }
});

/**
 * Rutas para gestión de programas analíticos
 * Base path: /api/programa-analitico
 */

// Descargar plantilla de Excel (sin autenticación para facilitar el acceso)
router.get('/plantilla', programaAnaliticoController.descargarPlantilla);

// Obtener estructura del formulario desde BD
router.get('/estructura-formulario', authenticate, programaAnaliticoController.getEstructuraFormulario);

// Subir programa analítico desde Excel (con autenticación)
router.post('/upload', authenticate, programaAnaliticoController.uploadExcel);

// Subir programa analítico con validación (Word/Excel con asignatura_id y periodo)
router.post('/upload-validado',
  authenticate,
  authorize(['administrador', 'comision_academica', 'comision']),
  upload.single('file'),
  programaAnaliticoController.uploadValidado
);

// Obtener todos los programas analíticos
router.get('/', authenticate, programaAnaliticoController.getAll);

// Crear un nuevo programa analítico (compatible con editor)
router.post('/', authenticate, authorize(['profesor', 'administrador', 'comision_academica', 'comision']), programaAnaliticoController.create);

// Obtener programas disponibles con plantillas (para docentes)
router.get('/disponibles', authenticate, programaAnaliticoController.getProgramasDisponibles);

// Obtener programas asignados a un docente (debe ir antes de /:id)
router.get('/mis-programas', authenticate, programaAnaliticoController.getProgramasAsignados);

// Obtener programas asignados a un docente específico (para admin)
router.get('/docente/:profesorId', authenticate, programaAnaliticoController.getProgramasAsignados);

// Asignar programa analítico a un docente
router.post('/asignar', authenticate, programaAnaliticoController.asignarADocente);

// =========================================================================
// RUTAS CON PARÁMETROS ESPECÍFICOS (DEBEN IR ANTES DE /:id)
// =========================================================================

// Obtener programa con estructura completa de plantilla
router.get('/:id/plantilla', authenticate, programaAnaliticoController.getProgramaConPlantilla);

// Guardar contenido llenado por el docente
router.post('/:id/guardar-contenido', authenticate, programaAnaliticoController.guardarContenidoDocente);

// Obtener contenido guardado del docente
router.get('/:id/contenido-docente', authenticate, programaAnaliticoController.getContenidoDocente);

// Actualizar contenido del programa (por el docente) - método antiguo
router.put('/:id/contenido', authenticate, programaAnaliticoController.actualizarContenidoDocente);

// Re-limpiar datos de un programa analitico existente (eliminar duplicados)
router.put('/:id/relimpiar', authenticate, programaAnaliticoController.relimpiarDatos);

// 📋 EXTRAER SOLO TÍTULOS de un archivo Excel o Word (para validación)
router.post('/extraer-titulos', authenticate, upload.fields([
  { name: 'archivo', maxCount: 1 }
]), programaAnaliticoController.extraerTitulos);

// 📊 OBTENER TÍTULOS GUARDADOS POR SESSION_ID
router.get('/titulos/session/:sessionId', authenticate, programaAnaliticoController.getTitulosPorSession);

// 📝 OBTENER TODAS LAS SESIONES DE EXTRACCIÓN
router.get('/sesiones-extraccion', authenticate, programaAnaliticoController.getSesionesExtraccion);

// 💾 GUARDAR FORMULARIO DINÁMICO COMPLETADO
router.post('/formulario-dinamico/guardar', authenticate, programaAnaliticoController.guardarFormularioDinamico);

// 📋 OBTENER FORMULARIOS DINÁMICOS DEL DOCENTE
router.get('/formulario-dinamico/mis-formularios', authenticate, programaAnaliticoController.obtenerFormulariosDinamicosDocente);

// 📄 OBTENER SESIÓN DE EXTRACCIÓN ESPECÍFICA POR ID
router.get('/sesion-extraccion/:sessionId', authenticate, programaAnaliticoController.obtenerSesionPorId);

// 🗂️ AGRUPACIONES DE TÍTULOS EN PESTAÑAS
router.get('/sesion-extraccion/:sessionId/agrupaciones', authenticate, programaAnaliticoController.obtenerAgrupaciones);
router.post('/sesion-extraccion/:sessionId/agrupaciones', authenticate, authorize(['administrador', 'comision_academica']), programaAnaliticoController.guardarAgrupaciones);
router.delete('/sesion-extraccion/:sessionId/agrupaciones', authenticate, authorize(['administrador', 'comision_academica']), programaAnaliticoController.eliminarAgrupaciones);


// =========================================================================
// RUTAS GENÉRICAS (DEBEN IR AL FINAL)
// =========================================================================

// Obtener un programa analítico por ID
router.get('/:id', authenticate, programaAnaliticoController.getById);

// Actualizar un programa analítico (compatible con editor)
router.put('/:id', authenticate, authorize(['profesor', 'administrador', 'comision_academica', 'comision']), programaAnaliticoController.update);

// Eliminar un programa analítico
router.delete('/:id', authenticate, programaAnaliticoController.delete);

// =========================================================================
// RUTAS DE EXTRACCIÓN CON IA (Google Generative AI)
// =========================================================================

// Verificar estado de configuración de IA
router.get('/ia/status', authenticate, iaExtractorController.verificarConfiguracionIA);

// Extraer datos de archivo con IA
router.post('/ia/extraer', authenticate, uploadIA.single('archivo'), iaExtractorController.extraerConIA);
router.post('/extract-sync', upload.fields([{ name: 'archivo', maxCount: 1 }]), programaAnaliticoController.extractForSync);
module.exports = router;

