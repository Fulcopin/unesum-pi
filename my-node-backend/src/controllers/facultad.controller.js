// Ruta: controllers/facultad.controller.js

const db = require('../models'); // Importa el objeto db centralizado
const Facultad = db.Facultad;
const Carrera = db.Carrera;

// --- OBTENER TODAS LAS FACULTADES ---
exports.getAll = async (req, res) => {
  try {
    const facultades = await Facultad.findAll({
      order: [['nombre', 'ASC']],
      // Opcional: Incluir las carreras asociadas a cada facultad
      include: {
        model: Carrera,
        as: 'carreras',
        attributes: ['id', 'nombre'] // Solo traer los campos necesarios
      }
    });
    
    return res.status(200).json({
      success: true,
      data: facultades
    });
  } catch (error) {
    console.error('Error al obtener facultades:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las facultades',
      error: error.message
    });
  }
};
exports.create = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }
    const nuevaFacultad = await Facultad.create({ nombre });
    res.status(201).json({ success: true, message: 'Facultad creada exitosamente', data: nuevaFacultad });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear la facultad', error: error.message });
  }
};

// ACTUALIZAR
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    const facultad = await Facultad.findByPk(id);
    if (!facultad) {
      return res.status(404).json({ success: false, message: 'Facultad no encontrada.' });
    }
    await facultad.update({ nombre });
    res.status(200).json({ success: true, message: 'Facultad actualizada exitosamente', data: facultad });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar la facultad', error: error.message });
  }
};

// ELIMINAR
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const facultad = await Facultad.findByPk(id);
    if (!facultad) {
      return res.status(404).json({ success: false, message: 'Facultad no encontrada.' });
    }
    // Elimina la facultad y sequelize se encargará de las carreras si está configurado en cascada
    await facultad.destroy();
    res.status(200).json({ success: true, message: 'Facultad eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar la facultad', error: error.message });
  }
};