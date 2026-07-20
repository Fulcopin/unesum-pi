const express = require('express');
const router = express.Router();
const cronogramaController = require('../controllers/cronograma.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET público: cualquiera puede ver el calendario (incluso sin sesión)
router.get('/publico', cronogramaController.getAll);

// GET autenticado
router.get('/', authenticate, cronogramaController.getAll);

// Opciones de menú que deben ocultarse ahora para el rol del usuario
// (debe ir ANTES de /:id para que no la capture la ruta genérica)
router.get('/modulos-ocultos', authenticate, cronogramaController.getModulosOcultos);

// Panel de gestión de menús: solo el administrador consulta y cambia estados
// (ambas van ANTES de /:id y de /:id genéricas)
router.get('/modulos-estado', authenticate, authorize(['administrador']), cronogramaController.getModulosEstado);
router.put('/modulos-estado', authenticate, authorize(['administrador']), cronogramaController.setModuloEstado);

router.get('/:id', authenticate, cronogramaController.getById);

// Solo administradores pueden crear, editar y eliminar
router.post('/', authenticate, authorize(['administrador']), cronogramaController.create);
router.put('/:id', authenticate, authorize(['administrador']), cronogramaController.update);
router.delete('/:id', authenticate, authorize(['administrador']), cronogramaController.remove);

module.exports = router;
