const express = require('express');
const router = express.Router();
const funcionesController = require('../controllers/funcionesSustantivas.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Middleware para autenticar todas las rutas y autorizar solo a administradores
router.use(authenticate);
router.use(authorize(['administrador']));

// Rutas para funciones sustantivas
router.get('/', funcionesController.getAll);
router.get('/:id', funcionesController.getById);
router.post('/', funcionesController.create);
router.put('/:id', funcionesController.update);
router.patch('/:id/estado', funcionesController.changeStatus);
router.delete('/:id', funcionesController.delete);

module.exports = router;