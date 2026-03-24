// Ruta: routes/profesor.routes.js
const express = require('express');
const router = express.Router();
const profesorController = require('../controllers/profesor.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// Middleware para autenticar y autorizar solo a administradores
router.post('/reset-password/:token', profesorController.resetPassword);
router.use(authenticate);

// Ruta específica DEBE ir ANTES de las rutas genéricas
router.get('/my-syllabi', authorize(['profesor', 'docente']), profesorController.getMySyllabi);

// Ruta de carga masiva (CSV/Excel)
router.post('/upload', upload.single('file'), profesorController.bulkCreate);

// Rutas CRUD para profesores
router.get('/', profesorController.getAll);
router.get('/:id/documentos', profesorController.getDocumentos);
router.post('/', profesorController.create);
router.put('/:id', profesorController.update);
router.delete('/:id', profesorController.delete);

module.exports = router;