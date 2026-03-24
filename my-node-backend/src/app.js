// app.js

const express = require('express');
const cors = require('cors'); // Usar el middleware de cors
const routes = require('./routes');
const path = require('path'); // Módulo de Node para manejar rutas de archivos

// Dependencias para la ruta de upload
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const profesorController = require('./controllers/profesor.controller');
const { authenticate, authorize } = require('./middlewares/auth.middleware');

const app = express();

// =======================================================================
// --- CONFIGURACIÓN DE MIDDLEWARES ---
// =======================================================================

// 1. Habilitar CORS para todos los orígenes (ideal para desarrollo y debugging)
// Una vez que todo funcione, puedes volver a tu configuración restrictiva si lo deseas.
app.use(cors());

// 2. Middlewares nativos de Express para parsear JSON y cuerpos URL-encoded
// Reemplazan a bodyParser y deben ir ANTES de tus rutas.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Servir archivos estáticos (si tienes una carpeta 'public' o 'uploads')
// Es una buena práctica definirlo aquí.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =======================================================================
// --- RUTAS DE LA APLICACIÓN ---
// =======================================================================

// Ruta especial de UPLOAD (se mantiene igual)
app.post(
  '/api/profesores/upload',
  authenticate,
  authorize(['administrador']),
  upload.single('file'),
  profesorController.bulkCreate
);

// Registro de todas las demás rutas de la API
routes(app);

// =======================================================================
// --- MANEJO DE ERRORES (al final de todo) ---
// =======================================================================

// Middleware para manejar errores 404 (Ruta no encontrada)
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.originalUrl}` });
});

// Middleware general para manejar otros errores (500)
// Debe tener 4 argumentos para ser reconocido como un manejador de errores.
app.use((err, req, res, next) => {
  console.error("====== ERROR NO CAPTURADO ======");
  console.error(err.stack);
  console.error("==============================");
  
  // Evitar enviar el stack trace en producción por seguridad
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Ocurrió un error en el servidor.' : err.message;
  
  res.status(statusCode).json({ success: false, message });
});

module.exports = app;