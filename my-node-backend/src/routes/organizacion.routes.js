const express = require('express');
const router = express.Router();
const organizacionController = require('../controllers/organizacionController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Rutas GET: autenticadas pero sin restricción de rol
router.get('/', authenticate, organizacionController.getAll);
router.get('/:id', authenticate, organizacionController.getById);

// Rutas POST, PUT, DELETE: solo administradores
router.post('/', authenticate, authorize(['administrador']), organizacionController.create);
router.put('/:id', authenticate, authorize(['administrador']), organizacionController.update);
router.patch('/:id/estado', authenticate, authorize(['administrador']), organizacionController.changeStatus);
router.delete('/:id', authenticate, authorize(['administrador']), organizacionController.delete);

module.exports = router;