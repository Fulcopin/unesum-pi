// src/routes/user.routes.js

const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/user.controller');

const { authenticate } = require('../middlewares/auth.middleware');


router.get('/profile', authenticate, getProfile);

module.exports = router;