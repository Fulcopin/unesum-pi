const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rol.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Lectura: cualquier usuario autenticado
router.get('/', authenticate, rolController.listar);
router.get('/:id', authenticate, rolController.obtener);

// Escritura: solo administradores
router.post('/', authenticate, authorize(['administrador']), rolController.crear);
router.put('/:id', authenticate, authorize(['administrador']), rolController.actualizar);
router.patch('/:id/estado', authenticate, authorize(['administrador']), rolController.cambiarEstado);
router.delete('/:id', authenticate, authorize(['administrador']), rolController.eliminar);

module.exports = router;
