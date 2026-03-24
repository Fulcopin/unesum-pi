const express = require('express');
const router = express.Router();
const facultadController = require('../controllers/facultad.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todas las facultades (todos los roles autenticados)
router.get('/', facultadController.getAll);

// Crear facultad (solo administrador)
router.post('/', authorize(['administrador']), facultadController.create);

// Actualizar facultad (solo administrador)
router.put('/:id', authorize(['administrador']), facultadController.update);

// Eliminar facultad (solo administrador)
router.delete('/:id', authorize(['administrador']), facultadController.delete);

module.exports = router;
