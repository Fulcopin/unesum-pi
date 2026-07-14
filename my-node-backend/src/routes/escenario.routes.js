const express = require('express');
const router = express.Router();
const escenarioController = require('../controllers/escenarioController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET: autenticadas sin restricción de rol (para poblar el combo del syllabus)
router.get('/', authenticate, escenarioController.getAll);
router.get('/:id', authenticate, escenarioController.getById);

// POST, PUT, DELETE: administradores y comisión académica
router.post('/', authenticate, authorize(['administrador', 'comision_academica']), escenarioController.create);
router.put('/:id', authenticate, authorize(['administrador', 'comision_academica']), escenarioController.update);
router.delete('/:id', authenticate, authorize(['administrador', 'comision_academica']), escenarioController.delete);

module.exports = router;
