const express = require('express');
const { register } = require('../controllers/auth.controller');
const { validateRegistration, authenticate } = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const router = express.Router();

router.post('/login', authController.login);
router.post('/register', validateRegistration, register);
router.get('/me', authenticate, authController.getMe);
router.post('/cambiar-rol', authenticate, authController.cambiarRol);

module.exports = router;
