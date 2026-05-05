const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { Usuario, Profesor } = require('../models');

const validateRegistration = [
  body('nombres', 'El nombre es un campo obligatorio').trim().notEmpty(),
  body('apellidos', 'El apellido es un campo obligatorio').trim().notEmpty(),
  body('correo_electronico', 'Por favor, introduce un correo electrónico válido').isEmail().normalizeEmail(),
  body('contraseña', 'La contraseña debe tener un mínimo de 6 caracteres').isLength({ min: 6 }),
  body('cedula_identidad', 'La cédula es un campo obligatorio').trim().notEmpty(),
  body('rol', 'El rol es un campo obligatorio').trim().notEmpty(),


  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {

      return res.status(400).json({ errors: errors.array() });
    }
  
    next();
  }
];


const validateLogin = [
  body('correo_electronico', 'Por favor, introduce un correo electrónico válido').isEmail().normalizeEmail(),
  body('contraseña', 'La contraseña no puede estar vacía').notEmpty(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];


// Roles que viven en la tabla `usuarios`
const ADMIN_TABLE_ROLES = new Set([
  'administrador',
  'comision_academica',
  'comision',
  'coordinador',
  'direccion',
  'decano',
  'subdecano',
  'estudiante',
]);

// Roles que viven en la tabla `profesores`
const TEACHER_TABLE_ROLES = new Set(['profesor', 'docente']);

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token de acceso requerido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '0000');

    const rolActivo = decoded.rol;
    const rolesToken = Array.isArray(decoded.roles) && decoded.roles.length > 0
      ? decoded.roles
      : (rolActivo ? [rolActivo] : []);
    const tablaOrigen = decoded.tabla;

    let user = null;

    // 1) Usar la tabla origen si viene en el token (preferido)
    if (tablaOrigen === 'usuarios') {
      user = await Usuario.findByPk(decoded.id);
    } else if (tablaOrigen === 'profesores') {
      user = await Profesor.findByPk(decoded.id);
    } else {
      // 2) Compatibilidad: deducir por el rol activo
      if (ADMIN_TABLE_ROLES.has(rolActivo)) {
        user = await Usuario.findByPk(decoded.id);
      } else if (TEACHER_TABLE_ROLES.has(rolActivo)) {
        user = await Profesor.findByPk(decoded.id);
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no válido o no encontrado.' });
    }

    // Verificar estado si el modelo lo tiene
    if (user.estado === false) {
      return res.status(401).json({ success: false, message: 'La cuenta del usuario está inactiva.' });
    }

    req.user = user;
    req.user.rol = rolActivo;
    req.user.roles = rolesToken;
    req.user.tabla = tablaOrigen;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado. Por favor, inicia sesión nuevamente.', expired: true });
    }
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
  }
};

// authorize: pasa si el rol activo del usuario está en la lista,
// O si alguno de sus roles disponibles coincide.
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return (req, res, next) => {
    const rolActivo = req.user?.rol;
    const rolesUsuario = Array.isArray(req.user?.roles) && req.user.roles.length > 0
      ? req.user.roles
      : (rolActivo ? [rolActivo] : []);

    const ok =
      !!req.user &&
      roles.length > 0 &&
      (roles.includes(rolActivo) || rolesUsuario.some(r => roles.includes(r)));

    console.log('🔐 Autorización:', {
      rolActivo,
      rolesUsuario,
      requiredRoles: roles,
      hasUser: !!req.user,
      isAuthorized: ok,
    });

    if (ok) return next();
    return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  authenticate,
  authorize
};