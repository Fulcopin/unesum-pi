// src/controllers/user.controller.js

const Usuario = require('../models/usuarios');

// Controlador para obtener el perfil del usuario logueado
exports.getProfile = async (req, res) => {
  try {
    // Gracias al middleware 'authenticate', ya tenemos 'req.user.id'
    const userId = req.user.id; 
    
    // Buscamos al usuario en la BD pero excluimos la contraseña de la respuesta
    const userProfile = await Usuario.findByPk(userId, {
      attributes: { exclude: ['contraseña'] }
    });

    if (!userProfile) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json(userProfile);

  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};