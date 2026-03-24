const express = require('express');
const router = express.Router();
const mallaController = require('../controllers/mallaController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de mallas
router.get('/', authorize(['administrador', 'comision_academica', 'comision']), mallaController.getAllMallas);
router.get('/codigo/:codigo', authorize(['administrador', 'comision_academica', 'comision']), mallaController.getMallaByCodigo);
router.post('/', authorize(['administrador', 'comision_academica']), mallaController.createMalla);
router.put('/:id', authorize(['administrador', 'comision_academica']), mallaController.updateMalla);
router.delete('/:id', authorize(['administrador', 'comision_academica']), mallaController.deleteMalla);

module.exports = router;
