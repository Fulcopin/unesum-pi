const express = require('express');
const router = express.Router();
const clasificacionController = require('../controllers/clasificacion.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// ----- COMENTARIOS CORREGIDOS -----

// Obtiene los registros. La ruta real es GET /api/clasifica?facultad_id=X
router.get('/', [authenticate], clasificacionController.getRegistrosPorFacultad);

// Crea un nuevo registro. La ruta real es POST /api/clasifica
router.post('/', [authenticate, authorize(['administrador'])], clasificacionController.create);

// Actualiza un registro. La ruta real es PUT /api/clasifica/:id
router.put('/:id', [authenticate, authorize(['administrador'])], clasificacionController.update);

// Elimina un registro. La ruta real es DELETE /api/clasifica/:id
router.delete('/:id', [authenticate, authorize(['administrador'])], clasificacionController.delete);


module.exports = router;