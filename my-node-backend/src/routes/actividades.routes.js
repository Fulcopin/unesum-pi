const express = require('express');
const router = express.Router();
const actividadesController = require('../controllers/actividades.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Middleware para autenticar todas las rutas y autorizar solo a administradores
router.use(authenticate);
router.use(authorize(['administrador']));

// Rutas para actividades
router.get('/', actividadesController.getAll);
router.get('/:id', actividadesController.getById);
router.post('/', actividadesController.create);
router.put('/:id', actividadesController.update);
router.patch('/:id/estado', actividadesController.changeStatus);
router.delete('/:id', actividadesController.delete);

module.exports = router;
