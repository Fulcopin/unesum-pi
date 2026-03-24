// src/controllers/clasificacion.controller.js

const db = require('../models');
// Esta desestructuración ahora funcionará porque el modelo se define y exporta correctamente.
const { ClasificacionAcademica, Carrera, Facultad } = db;
const { Op } = require('sequelize');

// --- OBTENER REGISTROS POR FACULTAD ---
exports.getRegistrosPorFacultad = async (req, res) => {
  const { facultad_id } = req.query;

  if (!facultad_id) {
    return res.status(400).json({
      success: false,
      message: 'El ID de la facultad es requerido.'
    });
  }

  try {
    // Esta línea ya no dará error.
    const registros = await ClasificacionAcademica.findAll({
      order: [['id', 'ASC']],
      include: [{
        model: Carrera,
        as: 'carrera',
        attributes: ['id', 'nombre', 'facultad_id'],
        where: {
          facultad_id: parseInt(facultad_id)
        },
        required: true,
        include: [{
          model: Facultad,
          as: 'facultad',
          attributes: ['nombre']
        }]
      }]
    });

    return res.status(200).json({
      success: true,
      data: registros
    });

  } catch (error) {
    // Es importante loguear el error para ver la traza completa.
    console.error('Error al obtener registros de clasificación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
      error: error.message
    });
  }
};


// --- CREAR UN NUEVO REGISTRO ---
exports.create = async (req, res) => {
  const { carrera_id, campo_amplio, campo_especifico, campo_detallado } = req.body;

  if (!carrera_id || !campo_amplio || !campo_especifico || !campo_detallado) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
  }

  try {
    const existente = await ClasificacionAcademica.findOne({ where: { carrera_id } });
    if (existente) {
      return res.status(409).json({ success: false, message: 'Ya existe una clasificación para la carrera seleccionada.' });
    }

    const nuevoRegistro = await ClasificacionAcademica.create({
      carrera_id,
      campo_amplio,
      campo_especifico,
      campo_detallado
    });
    
    res.status(201).json({
      success: true,
      message: 'Registro guardado correctamente.',
      data: nuevoRegistro
    });

  } catch (error) {
    console.error('Error al crear el registro:', error);
    res.status(500).json({ success: false, message: 'Error al crear el registro.', error: error.message });
  }
};

// --- ACTUALIZAR UN REGISTRO EXISTENTE ---
exports.update = async (req, res) => {
  const { id } = req.params;
  const { carrera_id, campo_amplio, campo_especifico, campo_detallado } = req.body;

  try {
    const registro = await ClasificacionAcademica.findByPk(id);
    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
    }

    if (carrera_id && carrera_id !== registro.carrera_id) {
       const existente = await ClasificacionAcademica.findOne({ where: { carrera_id, id: { [Op.ne]: id } } });
       if (existente) {
         return res.status(409).json({ success: false, message: 'La nueva carrera seleccionada ya tiene una clasificación.' });
       }
    }

    // Se actualizan solo los campos que vienen en el body
    registro.carrera_id = carrera_id ?? registro.carrera_id;
    registro.campo_amplio = campo_amplio ?? registro.campo_amplio;
    registro.campo_especifico = campo_especifico ?? registro.campo_especifico;
    registro.campo_detallado = campo_detallado ?? registro.campo_detallado;

    await registro.save();

    res.status(200).json({ success: true, message: 'Registro actualizado exitosamente', data: registro });

  } catch (error) {
    console.error('Error al actualizar el registro:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el registro.', error: error.message });
  }
};

// --- ELIMINAR UN REGISTRO ---
exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const registro = await ClasificacionAcademica.findByPk(id);
    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado.' });
    }

    await registro.destroy();
    res.status(200).json({ success: true, message: 'Registro eliminado correctamente.' });

  } catch (error)
 {
    console.error('Error al eliminar el registro:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar el registro.', error: error.message });
  }
};