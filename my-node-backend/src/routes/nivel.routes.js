const express = require('express');
const router = express.Router();
const nivelController = require('../controllers/nivel.Controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Rutas GET: autenticadas pero sin restricción de rol
router.get('/', authenticate, nivelController.getAll);
router.get('/:id', authenticate, nivelController.getById);

// Rutas POST, PUT, DELETE: solo administradores
router.post('/', authenticate, authorize(['administrador']), nivelController.create);
router.put('/:id', authenticate, authorize(['administrador']), nivelController.update);
router.patch('/:id/estado', authenticate, authorize(['administrador']), nivelController.changeStatus);
router.delete('/:id', authenticate, authorize(['administrador']), nivelController.delete);

module.exports = router;