// Rutas de habilitaciones excepcionales de docentes.
// El coordinador solicita; el decano o el director académico autorizan.

const express = require('express');
const router = express.Router();
const controller = require('../controllers/habilitaciones.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const COORDINADOR = [...controller.ROLES_COORDINADOR, 'administrador'];
const AUTORIZADORES = controller.ROLES_AUTORIZADORES;
const DOCENTE = controller.ROLES_DOCENTE;
const TODOS = [...new Set([...COORDINADOR, ...AUTORIZADORES])];

router.use(authenticate);

// Catálogo de módulos habilitables (lo usan el docente y el coordinador)
router.get('/modulos', authorize([...TODOS, ...DOCENTE]), controller.getModulosHabilitables);

// --- Paso 1 (opcional): el propio docente pide la habilitación ---
router.post('/solicitar', authorize(DOCENTE), controller.solicitarComoDocente);
router.get('/mias', authorize(DOCENTE), controller.misSolicitudes);

// --- Paso 2: el coordinador eleva (o descarta) lo que pidió el docente ---
router.put('/:id/tramitar', authorize(COORDINADOR), controller.tramitar);

// Docentes de la carrera del coordinador, con su estado de habilitación
router.get('/docentes', authorize(TODOS), controller.getDocentes);

// Bandeja de solicitudes (el alcance lo aplica el controlador según el rol)
router.get('/', authorize(TODOS), controller.listar);

// El coordinador solicita la habilitación de un docente
router.post('/', authorize(COORDINADOR), controller.crearSolicitud);

// Decano o dirección aprueban / rechazan
router.put('/:id/resolver', authorize(AUTORIZADORES), controller.resolver);

// Cerrar antes de tiempo una habilitación vigente
router.put('/:id/revocar', authorize(TODOS), controller.revocar);

module.exports = router;
