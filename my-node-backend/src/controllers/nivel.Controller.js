const { sequelize } = require('../models');
const Nivel = sequelize.models.nivel;


// Obtener todos los niveles
exports.getAll = async (req, res) => {
  try {
    const niveles = await Nivel.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: niveles // Corregido
    });
  } catch (error) {
    console.error('Error al obtener niveles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los niveles',
      error: error.message
    });
  }
};

// Obtener un Nivel por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const niveles = await Nivel.findByPk(id); // Renombrado
    
    if (!niveles) { // Renombrado
      return res.status(404).json({
        success: false,
        message: `Nivel con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: niveles // Renombrado
    });
  } catch (error) {
     console.error('Error al obtener los niveles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los niveles',
      error: error.message
    });
  }
};


// Crear una nuevo nivel
exports.create = async (req, res) => {
  try {
    const { codigo, nombre, estado } = req.body;
    
    // Validaciones básicas
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es un campo obligatorio'
      });
    }
    
    // Generar código automáticamente si no se proporciona
    let codigoFinal = codigo;
    if (!codigoFinal) {
      // Obtener el último nivel para generar el siguiente código
      const ultimoNivel = await Nivel.findOne({
        order: [['id', 'DESC']]
      });
      const siguienteNumero = ultimoNivel ? ultimoNivel.id + 1 : 1;
      codigoFinal = siguienteNumero.toString();
    }
    
    // Verificar si ya existe un nivel con el mismo código
    const existente = await Nivel.findOne({ where: { codigo: codigoFinal } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un nivel con el código ${codigoFinal}`
      });
    }
    
    // Crear la nueva función
    const nuevoNivel = await Nivel.create({
      codigo: codigoFinal,
      nombre,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Nivel creado exitosamente',
      data: nuevoNivel
    });
  } catch (error) {
    console.error('Error al crear el nivel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el nivel',
      error: error.message
    });
  }
};

// Actualizar un Nivel
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, estado } = req.body;
    
    // Validación básica
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es un campo obligatorio'
      });
    }
    
    // Buscar la función a actualizar
    const nivel = await Nivel.findByPk(id);
    
    if (!nivel) {
      return res.status(404).json({
        success: false,
        message: `Nivel con ID ${id} no encontrada`
      });
    }
    
    // Actualizar los campos (el código no se modifica)
    await nivel.update({
      nombre: nombre || nivel.nombre,
      estado: estado || nivel.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Nivel actualizado exitosamente',
      data: nivel
    });
  } catch (error) {
    console.error('Error al actualizar el nivel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el nivel',
      error: error.message
    });
  }
};

// Cambiar el estado del Nivel
exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!estado || !['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'El estado debe ser "activo" o "inactivo"'
      });
    }
    
    const nivel = await Nivel.findByPk(id);
    
    if (!nivel) {
      return res.status(404).json({
        success: false,
        message: `Nivel con ID ${id} no encontrada`
      });
    }
    
    await nivel.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado del Nivel cambiado a ${estado}`,
      data: nivel
    });
  } catch (error) {
    console.error('Error al cambiar estado del Nivel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del Nivel',
      error: error.message
    });
  }
};

// Eliminar un Paralelo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const nivel = await Nivel.findByPk(id);
    
    if (!nivel) {
      return res.status(404).json({
        success: false,
        message: `Nivel con ID ${id} no encontrada`
      });
    }
    
    await nivel.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Nivel eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar el nivel:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el nivel',
      error: error.message
    });
  }
};