// Menú unificado de bloqueos de celdas (syllabus + programa analítico de comisión).
// Administración y comisión usan los mismos endpoints: la diferencia es de
// alcance en la pantalla, no de permisos sobre los datos.
const express = require('express');
const router = express.Router();
const controller = require('../controllers/bloqueos.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const PERMITIDOS = ['administrador', 'comision_academica', 'comision'];

router.use(authenticate, authorize(PERMITIDOS));

router.get('/documentos', controller.listarDocumentos);
router.get('/documento/:tipo/:id', controller.getDocumento);
router.put('/documento/:tipo/:id', controller.guardarBloqueos);

module.exports = router;
