const express = require('express');
const router = express.Router();
const cronogramaController = require('../controllers/cronograma.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET público: cualquiera puede ver el calendario (incluso sin sesión)
router.get('/publico', cronogramaController.getAll);

// GET autenticado
router.get('/', authenticate, cronogramaController.getAll);
router.get('/:id', authenticate, cronogramaController.getById);

// Solo administradores pueden crear, editar y eliminar
router.post('/', authenticate, authorize(['administrador']), cronogramaController.create);
router.put('/:id', authenticate, authorize(['administrador']), cronogramaController.update);
router.delete('/:id', authenticate, authorize(['administrador']), cronogramaController.remove);

module.exports = router;
