// Importa todos tus modelos desde el archivo central 'models/index.js'
const db = require('../models');
// Asigna el modelo a una variable para un uso más fácil
const ProgramaAnalitico = db.ProgramasAnaliticos;
const Usuario = db.Usuario; // También importamos Usuario para las relaciones

// --- OBTENER TODOS LOS PROGRAMAS ANALÍTICOS ---
exports.getAll = async (req, res) => {
  try {
    const programas = await ProgramaAnalitico.findAll({
      order: [['id', 'ASC']],
      // Incluimos información del usuario que lo creó
      include: {
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos'] // Solo traemos los campos necesarios
      }
    });
    
    return res.status(200).json({
      success: true,
      data: programas
    });
  } catch (error) {
    console.error('Error al obtener programas analíticos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los programas analíticos',
      error: error.message
    });
  }
};

// --- OBTENER UN PROGRAMA ANALÍTICO POR ID ---
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const programa = await ProgramaAnalitico.findByPk(id, {
      include: {
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos']
      }
    });
    
    if (!programa) {
      return res.status(404).json({
        success: false,
        message: `Programa analítico con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: programa
    });
  } catch (error) {
    console.error('Error al obtener programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el programa analítico',
      error: error.message
    });
  }
};

// --- CREAR UN NUEVO PROGRAMA ANALÍTICO ---
exports.create = async (req, res) => {
  try {
    // Los datos de la tabla vienen en 'datos_tabla'
    const { nombre, datos_tabla, periodo, materias, asignatura_id } = req.body;
    
    // El ID del usuario viene del token de autenticación (middleware)
    // Solo guardar usuario_id si el usuario viene de la tabla 'usuarios' (admin/comision).
    const usuario_id = (req.user.tabla === 'usuarios') ? req.user.id : null;

    if (!nombre || !datos_tabla) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y los datos_tabla son campos obligatorios'
      });
    }
    
    const nuevoPrograma = await ProgramaAnalitico.create({
      nombre,
      datos_tabla, // Aquí se guarda el objeto JSONB completo
      periodo: periodo || null,
      materias: materias || nombre,
      asignatura_id: asignatura_id || null,
      usuario_id
    });
    
    return res.status(201).json({
      success: true,
      message: 'Programa analítico creado exitosamente',
      data: nuevoPrograma
    });
  } catch (error) {
    console.error('Error al crear programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el programa analítico',
      error: error.message
    });
  }
};

// --- ACTUALIZAR UN PROGRAMA ANALÍTICO ---
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, datos_tabla, periodo, materias } = req.body;
    const userId = req.user.id; // ID del usuario que hace la petición
    
    const programa = await ProgramaAnalitico.findByPk(id);
    
    if (!programa) {
      return res.status(404).json({
        success: false,
        message: `Programa analítico con ID ${id} no encontrado`
      });
    }

    // ¡VERIFICACIÓN DE PERMISOS!
    // Admin y comisión pueden editar cualquier programa; otros solo el suyo.
    const rolesPermitidos = ['administrador', 'comision_academica', 'comision'];
    if (Number(programa.usuario_id) !== Number(userId) && !rolesPermitidos.includes(req.user.rol)) {
        return res.status(403).json({ success: false, message: 'No tienes permiso para editar este programa.' });
    }
    
    // Actualizar los campos
    const { asignatura_id } = req.body;
    await programa.update({
      nombre: nombre || programa.nombre,
      datos_tabla: datos_tabla || programa.datos_tabla,
      periodo: periodo || programa.periodo,
      materias: materias || programa.materias,
      ...(asignatura_id ? { asignatura_id } : {})
    });
    
    return res.status(200).json({
      success: true,
      message: 'Programa analítico actualizado exitosamente',
      data: programa
    });
  } catch (error) {
    console.error('Error al actualizar programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el programa analítico',
      error: error.message
    });
  }
};

// --- ELIMINAR UN PROGRAMA ANALÍTICO ---
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const programa = await ProgramaAnalitico.findByPk(id);
    
    if (!programa) {
      return res.status(404).json({
        success: false,
        message: `Programa analítico con ID ${id} no encontrado`
      });
    }

    // ¡VERIFICACIÓN DE PERMISOS!
    // Admin y comisión pueden eliminar cualquier programa.
    const rolesPermitidos = ['administrador', 'comision_academica', 'comision'];
    if (Number(programa.usuario_id) !== Number(userId) && !rolesPermitidos.includes(req.user.rol)) {
        return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este programa.' });
    }
    
    await programa.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Programa analítico eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el programa analítico',
      error: error.message
    });
  }
};