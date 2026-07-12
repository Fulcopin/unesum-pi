const express = require('express');
const router = express.Router();
const metodologiaController = require('../controllers/metodologiaController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET: autenticadas sin restricción de rol (para poblar el combo del syllabus)
router.get('/', authenticate, metodologiaController.getAll);
router.get('/:id', authenticate, metodologiaController.getById);

// POST, PUT, DELETE: administradores y comisión académica
router.post('/', authenticate, authorize(['administrador', 'comision_academica']), metodologiaController.create);
router.put('/:id', authenticate, authorize(['administrador', 'comision_academica']), metodologiaController.update);
router.delete('/:id', authenticate, authorize(['administrador', 'comision_academica']), metodologiaController.delete);

module.exports = router;
