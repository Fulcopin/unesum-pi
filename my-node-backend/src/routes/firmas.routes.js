const express = require('express');
const router = express.Router();

const firmasController = require('../controllers/firmas.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// ── Endpoints públicos (sin login) ──────────────────────────────────────────
router.get('/verificar/:hash', firmasController.verificar);
router.get('/verificar-usuario/:hash', firmasController.verificarUsuarioQR);

// ── A partir de aquí requieren autenticación ────────────────────────────────
router.use(authenticate);

// QR personal del usuario logueado
router.get('/mi-qr', firmasController.miQR);

// QR de todos los usuarios (admin)
router.get(
  '/qr-todos-usuarios',
  authorize(['administrador']),
  firmasController.qrTodosUsuarios
);

// Pendientes del rol actual (todos los roles con firma)
router.get(
  '/pendientes',
  authorize(['docente', 'profesor', 'comision', 'comision_academica', 'coordinador', 'direccion', 'decano', 'subdecano', 'administrador']),
  firmasController.pendientes
);

// Listar todos los documentos con estado de firmas
router.get(
  '/listar',
  authorize(['docente', 'profesor', 'comision', 'comision_academica', 'coordinador', 'direccion', 'decano', 'subdecano', 'administrador']),
  firmasController.listar
);

// Reporte QR de documentos ya firmados
router.get(
  '/reporte-qr',
  authorize(['administrador', 'decano', 'coordinador', 'direccion']),
  firmasController.reporteQR
);

// Invitaciones QR (por etapa/rol)
router.get(
  '/invitaciones-qr',
  authorize(['administrador', 'decano', 'coordinador', 'direccion']),
  firmasController.invitacionesQR
);

// QR por documento (enlace directo de firma)
router.get(
  '/qr-por-documento',
  authorize(['administrador', 'decano', 'coordinador', 'direccion', 'comision', 'comision_academica']),
  firmasController.qrPorDocumento
);

// Firma masiva (decano o dirección firman todos los pendientes de su etapa)
router.post(
  '/firmar-masivo',
  authorize(['decano', 'coordinador', 'direccion', 'administrador']),
  firmasController.firmarMasivo
);

// Detalle de firmas de un documento
router.get(
  '/:tipo/:id',
  authorize(['docente', 'profesor', 'comision', 'comision_academica', 'coordinador', 'direccion', 'decano', 'subdecano', 'administrador', 'estudiante']),
  firmasController.obtenerFirmas
);

// Firmar un documento (todos los roles con etapa asignada)
router.post(
  '/:tipo/:id/firmar',
  authorize(['docente', 'profesor', 'comision', 'comision_academica', 'coordinador', 'direccion', 'decano', 'subdecano', 'administrador']),
  firmasController.firmar
);

module.exports = router;
