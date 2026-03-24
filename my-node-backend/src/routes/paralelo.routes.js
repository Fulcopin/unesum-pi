const express = require('express');
const router = express.Router();
const paralelosController = require('../controllers/paralelo.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Rutas GET: autenticadas pero sin restricción de rol
router.get('/', authenticate, paralelosController.getAll);
router.get('/:id', authenticate, paralelosController.getById);

// Rutas POST, PUT, DELETE: solo administradores
router.post('/', authenticate, authorize(['administrador']), paralelosController.create);
router.put('/:id', authenticate, authorize(['administrador']), paralelosController.update);
router.patch('/:id/estado', authenticate, authorize(['administrador']), paralelosController.changeStatus);
router.delete('/:id', authenticate, authorize(['administrador']), paralelosController.delete);

module.exports = router;