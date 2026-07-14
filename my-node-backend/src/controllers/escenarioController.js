// controllers/escenarioController.js
// CRUD del catálogo de escenarios de aprendizaje (Áulico, Virtual, Laboratorio, ...).

const db = require('../models');
const Escenario = db.Escenario;

// GET /api/escenarios   (opcional ?estado=activo)
exports.getAll = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    const escenarios = await Escenario.findAll({ where, order: [['id', 'ASC']] });
    return res.status(200).json({ success: true, data: escenarios });
  } catch (error) {
    console.error('Error al obtener escenarios:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener escenarios', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const escenario = await Escenario.findByPk(req.params.id);
    if (!escenario) {
      return res.status(404).json({ success: false, message: 'Escenario no encontrado' });
    }
    return res.status(200).json({ success: true, data: escenario });
  } catch (error) {
    console.error('Error al obtener el escenario:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el escenario', error: error.message });
  }
};

// POST /api/escenarios  (id automático)
exports.create = async (req, res) => {
  try {
    const { nombre, descripcion, estado } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre del escenario es obligatorio' });
    }
    const escenario = await Escenario.create({
      nombre: nombre.trim(),
      descripcion: descripcion ? descripcion.trim() : null,
      estado: estado || 'activo'
    });
    return res.status(201).json({ success: true, message: 'Escenario creado correctamente', data: escenario });
  } catch (error) {
    console.error('Error al crear el escenario:', error);
    return res.status(500).json({ success: false, message: 'Error al crear el escenario', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { nombre, descripcion, estado } = req.body;
    const escenario = await Escenario.findByPk(req.params.id);
    if (!escenario) {
      return res.status(404).json({ success: false, message: 'Escenario no encontrado' });
    }
    if (nombre !== undefined) {
      if (!nombre.trim()) {
        return res.status(400).json({ success: false, message: 'El nombre no puede estar vacío' });
      }
      escenario.nombre = nombre.trim();
    }
    if (descripcion !== undefined) escenario.descripcion = descripcion ? descripcion.trim() : null;
    if (estado !== undefined) escenario.estado = estado;
    await escenario.save();
    return res.status(200).json({ success: true, message: 'Escenario actualizado correctamente', data: escenario });
  } catch (error) {
    console.error('Error al actualizar el escenario:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el escenario', error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const escenario = await Escenario.findByPk(req.params.id);
    if (!escenario) {
      return res.status(404).json({ success: false, message: 'Escenario no encontrado' });
    }
    await escenario.destroy();
    return res.status(200).json({ success: true, message: 'Escenario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el escenario:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar el escenario', error: error.message });
  }
};
