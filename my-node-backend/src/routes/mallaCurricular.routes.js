// routes/mallaCurricular.routes.js

const express = require('express');
const router = express.Router();
const mallaCurricularController = require('../controllers/mallaCurricular.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// =========================================================================
// --- RUTAS PARA GESTIÓN DE MALLA CURRICULAR ---
// =========================================================================

/**
 * @route   GET /api/malla-curricular/carrera/:carreraId
 * @desc    Obtener la malla curricular completa de una carrera (todos los niveles)
 * @access  Private
 */
router.get(
    '/carrera/:carreraId',
    authenticate,
    mallaCurricularController.getMallaPorCarrera
);

/**
 * @route   GET /api/malla-curricular/nivel/:nivelId
 * @desc    Obtener las asignaturas de un nivel específico (con filtro opcional por carrera)
 * @access  Private
 * @query   carrera_id (opcional) - Filtrar por carrera específica
 */
router.get(
    '/nivel/:nivelId',
    authenticate,
    mallaCurricularController.getMallaPorNivel
);

/**
 * @route   GET /api/malla-curricular/carrera/:carreraId/estadisticas
 * @desc    Obtener estadísticas generales de la malla curricular (total de horas, créditos, etc.)
 * @access  Private
 */
router.get(
    '/carrera/:carreraId/estadisticas',
    authenticate,
    mallaCurricularController.getEstadisticasMalla
);

/**
 * @route   GET /api/malla-curricular/carrera/:carreraId/validar
 * @desc    Validar la integridad de la malla curricular (verificar requisitos válidos)
 * @access  Private
 */
router.get(
    '/carrera/:carreraId/validar',
    authenticate,
    mallaCurricularController.validarMalla
);

module.exports = router;
