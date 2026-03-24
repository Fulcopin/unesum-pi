const express = require('express');
const router = express.Router();
const periodoController = require('../controllers/periodo.Controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Rutas GET: autenticadas pero sin restricción de rol
router.get('/', authenticate, periodoController.getAll);
router.get('/:id', authenticate, periodoController.getById);

// Rutas POST, PUT, DELETE: administradores y comisión académica
router.post('/', authenticate, authorize(['administrador', 'comision_academica']), periodoController.create);
router.put('/:id', authenticate, authorize(['administrador', 'comision_academica']), periodoController.update);
router.patch('/:id/estado', authenticate, authorize(['administrador', 'comision_academica']), periodoController.changeStatus);
router.delete('/:id', authenticate, authorize(['administrador', 'comision_academica']), periodoController.delete);

module.exports = router;