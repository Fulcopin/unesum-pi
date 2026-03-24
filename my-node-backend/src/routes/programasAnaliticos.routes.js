const express = require('express');
const router = express.Router();
const multer = require('multer');
const programasController = require('../controllers/programasController');
const programaAnaliticoController = require('../controllers/programaAnaliticoController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  }
});

// Ruta pública para descargar plantilla (sin autenticación)
router.get('/plantilla', programaAnaliticoController.descargarPlantilla);

// Proteger todas las demás rutas con autenticación
router.use(authenticate);

// Rutas de carga de Excel (nuevas) con multer
router.post(
  '/upload', 
  authorize(['administrador', 'comision_academica', 'docente']), 
  upload.fields([
    { name: 'excel', maxCount: 1 },
    { name: 'escudo', maxCount: 1 }
  ]),
  programaAnaliticoController.uploadExcel
);

// Rutas CRUD para Programas Analíticos
// Administradores y comisión académica pueden gestionar programas
router.get('/', authorize(['administrador', 'comision_academica']), programasController.getAll);
router.get('/:id', authorize(['administrador', 'comision_academica']), programasController.getById);
router.post('/', authorize(['administrador', 'comision_academica']), programasController.create);
router.put('/:id', authorize(['administrador', 'comision_academica']), programasController.update);
router.delete('/:id', authorize(['administrador', 'comision_academica']), programasController.delete);

module.exports = router;