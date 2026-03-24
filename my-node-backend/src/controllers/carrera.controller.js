// Ruta: controllers/carrera.controller.js

const db = require('../models');
const Carrera = db.Carrera;
const Facultad = db.Facultad;

// --- OBTENER TODAS LAS CARRERAS ---
exports.getAll = async (req, res) => {
  try {
    const user = req.user;
    let whereClause = {};
    
    // Si es comision_academica o comision, filtrar por su facultad
    if (user.rol === 'comision_academica' || user.rol === 'comision') {
      if (!user.facultad) {
        return res.status(400).json({
          success: false,
          message: 'El usuario no tiene una facultad asignada'
        });
      }
      
      // Buscar el ID de la facultad por nombre
      const facultad = await Facultad.findOne({
        where: { nombre: user.facultad }
      });
      
      if (!facultad) {
        return res.status(404).json({
          success: false,
          message: 'Facultad no encontrada'
        });
      }
      
      whereClause.facultad_id = facultad.id;
    }
    
    const carreras = await Carrera.findAll({
      where: whereClause,
      order: [['nombre', 'ASC']],
      // Incluir la información de la facultad a la que pertenece cada carrera
      include: {
        model: Facultad,
        as: 'facultad',
        attributes: ['id', 'nombre']
      }
    });
    
    return res.status(200).json({
      success: true,
      data: carreras
    });
  } catch (error) {
    console.error('Error al obtener carreras:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las carreras',
      error: error.message
    });
  }
};
exports.create = async (req, res) => {
  try {
    const { nombre, facultad_id } = req.body;
    const user = req.user;
    
    if (!nombre || !facultad_id) {
      return res.status(400).json({ success: false, message: 'Nombre y facultad son obligatorios.' });
    }
    
    // Si es comision_academica, validar que la facultad_id corresponda a su facultad
    if (user.rol === 'comision_academica' || user.rol === 'comision') {
      const facultad = await Facultad.findByPk(facultad_id);
      if (!facultad) {
        return res.status(404).json({ success: false, message: 'Facultad no encontrada.' });
      }
      
      if (facultad.nombre !== user.facultad) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para crear carreras en otra facultad.' 
        });
      }
    }
    
    const nuevaCarrera = await Carrera.create({ nombre, facultad_id });
    
    // Cargar la carrera con la facultad incluida
    const carreraCompleta = await Carrera.findByPk(nuevaCarrera.id, {
      include: {
        model: Facultad,
        as: 'facultad',
        attributes: ['id', 'nombre']
      }
    });
    
    res.status(201).json({ success: true, message: 'Carrera creada exitosamente', data: carreraCompleta });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear la carrera', error: error.message });
  }
};

// ACTUALIZAR
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, facultad_id } = req.body;
    const user = req.user;
    
    const carrera = await Carrera.findByPk(id, {
      include: {
        model: Facultad,
        as: 'facultad',
        attributes: ['id', 'nombre']
      }
    });
    
    if (!carrera) {
      return res.status(404).json({ success: false, message: 'Carrera no encontrada.' });
    }
    
    // Si es comision_academica, validar que la carrera pertenezca a su facultad
    if (user.rol === 'comision_academica' || user.rol === 'comision') {
      if (carrera.facultad.nombre !== user.facultad) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para actualizar carreras de otra facultad.' 
        });
      }
      
      // Si intenta cambiar de facultad, validar que sea la misma
      if (facultad_id && facultad_id !== carrera.facultad_id) {
        return res.status(403).json({ 
          success: false, 
          message: 'No puedes cambiar una carrera a otra facultad.' 
        });
      }
    }
    
    await carrera.update({ nombre, facultad_id });
    
    // Recargar con la facultad
    await carrera.reload({
      include: {
        model: Facultad,
        as: 'facultad',
        attributes: ['id', 'nombre']
      }
    });
    
    res.status(200).json({ success: true, message: 'Carrera actualizada exitosamente', data: carrera });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar la carrera', error: error.message });
  }
};

// ELIMINAR
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const carrera = await Carrera.findByPk(id, {
      include: {
        model: Facultad,
        as: 'facultad',
        attributes: ['id', 'nombre']
      }
    });
    
    if (!carrera) {
      return res.status(404).json({ success: false, message: 'Carrera no encontrada.' });
    }
    
    // Si es comision_academica, validar que la carrera pertenezca a su facultad
    if (user.rol === 'comision_academica' || user.rol === 'comision') {
      if (carrera.facultad.nombre !== user.facultad) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para eliminar carreras de otra facultad.' 
        });
      }
    }
    
    await carrera.destroy();
    res.status(200).json({ success: true, message: 'Carrera eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar la carrera', error: error.message });
  }
};