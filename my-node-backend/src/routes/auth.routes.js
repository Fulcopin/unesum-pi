const express = require('express');
const { login, register } = require('../controllers/auth.controller');
const { validateLogin, validateRegistration,authenticate } = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const router = express.Router();

// Login route
router.post('/login', authController.login);

// Registration route
router.post('/register', validateRegistration, register);
router.get('/me', authenticate, authController.getMe);
module.exports = router;