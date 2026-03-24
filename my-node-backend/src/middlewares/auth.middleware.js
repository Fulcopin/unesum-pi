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


const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token de acceso requerido' });
    }

    const token = authHeader.substring(7);
    
    // Decodifica el token para obtener el payload { id, rol }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '0000');
    
    let user = null;

    // Decide en qué tabla buscar basándose en el rol del token
    if (decoded.rol === 'administrador' || decoded.rol === 'comision_academica' || decoded.rol === 'comision') {
      // Administradores y comisión académica están en la tabla usuarios
      user = await Usuario.findByPk(decoded.id);
      // Verificamos el estado
      if (user && !user.estado) {
        return res.status(401).json({ success: false, message: 'La cuenta del usuario está inactiva.' });
      }
    } else if (decoded.rol === 'profesor' || decoded.rol === 'docente') {
      // Profesores y docentes están en la tabla profesores
      user = await Profesor.findByPk(decoded.id);
      // Aquí podrías añadir una comprobación de estado si la tabla 'profesores' la tuviera
    }

    // Si no se encontró ningún usuario en ninguna de las tablas
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no válido o no encontrado.' });
    }

    // Adjunta el usuario encontrado y el rol del token a la petición
    req.user = user;
    req.user.rol = decoded.rol; // MUY IMPORTANTE para que `authorize` funcione bien

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado. Por favor, inicia sesión nuevamente.', expired: true });
    }
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
  }
};

// --- SIN CAMBIOS AQUÍ ---
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return (req, res, next) => {
    // Esta función ahora funcionará correctamente porque `req.user.rol` es fiable
    console.log('🔐 Autorización:', {
      userRole: req.user?.rol,
      requiredRoles: roles,
      hasUser: !!req.user,
      isAuthorized: req.user && roles.length && roles.includes(req.user.rol)
    });
    
    if (req.user && roles.length && roles.includes(req.user.rol)) {
      next();
    } else {
      return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
    }
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  authenticate,
  authorize
};