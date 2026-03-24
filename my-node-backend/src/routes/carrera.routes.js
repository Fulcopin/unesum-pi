const express = require('express');
const router = express.Router();
const carreraController = require('../controllers/carrera.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Obtener todas las carreras (o filtradas por facultad del usuario)
router.get('/', authorize(['administrador', 'comision_academica', 'comision']), carreraController.getAll);

// Crear carrera (solo admin y comision_academica)
router.post('/', authorize(['administrador', 'comision_academica']), carreraController.create);

// Actualizar carrera
router.put('/:id', authorize(['administrador', 'comision_academica']), carreraController.update);

// Eliminar carrera
router.delete('/:id', authorize(['administrador', 'comision_academica']), carreraController.delete);

module.exports = router;
