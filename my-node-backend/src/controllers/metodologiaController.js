// controllers/metodologiaController.js
// CRUD del catálogo de metodologías de enseñanza-aprendizaje.

const db = require('../models');
const Metodologia = db.Metodologia;

// --- OBTENER TODAS LAS METODOLOGÍAS ---
// GET /api/metodologias   (opcional ?estado=activo)
exports.getAll = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    const metodologias = await Metodologia.findAll({
      where,
      order: [['id', 'ASC']]
    });
    return res.status(200).json({ success: true, data: metodologias });
  } catch (error) {
    console.error('Error al obtener metodologías:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener metodologías', error: error.message });
  }
};

// --- OBTENER UNA METODOLOGÍA POR ID ---
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const metodologia = await Metodologia.findByPk(id);
    if (!metodologia) {
      return res.status(404).json({ success: false, message: 'Metodología no encontrada' });
    }
    return res.status(200).json({ success: true, data: metodologia });
  } catch (error) {
    console.error('Error al obtener la metodología:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la metodología', error: error.message });
  }
};

// --- CREAR UNA METODOLOGÍA (id automático) ---
exports.create = async (req, res) => {
  try {
    const { descripcion, estado } = req.body;
    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ success: false, message: 'La descripción es obligatoria' });
    }
    const metodologia = await Metodologia.create({
      descripcion: descripcion.trim(),
      estado: estado || 'activo'
    });
    return res.status(201).json({ success: true, message: 'Metodología creada correctamente', data: metodologia });
  } catch (error) {
    console.error('Error al crear la metodología:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la metodología', error: error.message });
  }
};

// --- ACTUALIZAR UNA METODOLOGÍA ---
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, estado } = req.body;
    const metodologia = await Metodologia.findByPk(id);
    if (!metodologia) {
      return res.status(404).json({ success: false, message: 'Metodología no encontrada' });
    }
    if (descripcion !== undefined) {
      if (!descripcion.trim()) {
        return res.status(400).json({ success: false, message: 'La descripción no puede estar vacía' });
      }
      metodologia.descripcion = descripcion.trim();
    }
    if (estado !== undefined) metodologia.estado = estado;
    await metodologia.save();
    return res.status(200).json({ success: true, message: 'Metodología actualizada correctamente', data: metodologia });
  } catch (error) {
    console.error('Error al actualizar la metodología:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar la metodología', error: error.message });
  }
};

// --- ELIMINAR UNA METODOLOGÍA ---
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const metodologia = await Metodologia.findByPk(id);
    if (!metodologia) {
      return res.status(404).json({ success: false, message: 'Metodología no encontrada' });
    }
    await metodologia.destroy();
    return res.status(200).json({ success: true, message: 'Metodología eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar la metodología:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la metodología', error: error.message });
  }
};
