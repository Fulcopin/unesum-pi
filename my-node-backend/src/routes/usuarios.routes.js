const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/usuarios.controller');

// Solo administradores pueden gestionar usuarios y sus roles.
const soloAdmin = [authenticate, authorize(['administrador'])];

router.get('/roles-disponibles', soloAdmin, ctrl.rolesDisponibles);
router.get('/', soloAdmin, ctrl.listar);
router.get('/:id', soloAdmin, ctrl.obtener);
router.post('/', soloAdmin, ctrl.crear);
router.put('/:id', soloAdmin, ctrl.actualizar);
router.patch('/:id/estado', soloAdmin, ctrl.cambiarEstado);
router.patch('/:id/roles', soloAdmin, ctrl.actualizarRoles);
router.delete('/:id', soloAdmin, ctrl.eliminar);

module.exports = router;
