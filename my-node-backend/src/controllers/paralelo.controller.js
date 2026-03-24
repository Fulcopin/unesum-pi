const { sequelize } = require('../models');
const Paralelo = sequelize.models.paralelo;


// Obtener todos los paralelos
exports.getAll = async (req, res) => {
  try {
    const paralelos = await Paralelo.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: paralelos // Corregido
    });
  } catch (error) {
    console.error('Error al obtener paralelos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los paralelos',
      error: error.message
    });
  }
};

// Obtener un Paralelo por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const paralelo = await Paralelo.findByPk(id); // Renombrado
    
    if (!paralelo) { // Renombrado
      return res.status(404).json({
        success: false,
        message: `Paralelo con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: paralelo // Renombrado
    });
  } catch (error) {
     console.error('Error al obtener paralelos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los paralelos',
      error: error.message
    });
  }
};


// Crear una nuevo paralelo
exports.create = async (req, res) => {
  try {
    const { nombre, estado } = req.body;
    
    // Validaciones básicas
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del paralelo es obligatorio'
      });
    }
    
    // Verificar si ya existe un paralelo con el mismo nombre
    const existente = await Paralelo.findOne({ where: { nombre } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un paralelo con el nombre ${nombre}`
      });
    }
    
    // Generar código automático
    const ultimoParalelo = await Paralelo.findOne({
      order: [['id', 'DESC']]
    });
    
    let nuevoCodigo = 'PAR-001';
    if (ultimoParalelo && ultimoParalelo.codigo) {
      // Extraer el número del último código y sumar 1
      const ultimoNumero = parseInt(ultimoParalelo.codigo.split('-')[1]);
      const nuevoNumero = ultimoNumero + 1;
      nuevoCodigo = `PAR-${String(nuevoNumero).padStart(3, '0')}`;
    }
    
    // Crear el nuevo paralelo
    const nuevoParalelo = await Paralelo.create({
      codigo: nuevoCodigo,
      nombre,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Paralelo creado exitosamente',
      data: nuevoParalelo
    });
  } catch (error) {
    console.error('Error al crear el paralelo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el paralelo',
      error: error.message
    });
  }
};

// Actualizar un Paralelo
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, estado } = req.body;
    
    // Buscar el paralelo a actualizar
    const paralelo = await Paralelo.findByPk(id);
    
    if (!paralelo) {
      return res.status(404).json({
        success: false,
        message: `Paralelo con ID ${id} no encontrado`
      });
    }
    
    // Verificar si el nombre ya existe en otro paralelo
    if (nombre && nombre !== paralelo.nombre) {
      const existente = await Paralelo.findOne({ where: { nombre } });
      if (existente && existente.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otro paralelo con el nombre ${nombre}`
        });
      }
    }
    
    // Actualizar los campos (el código no se puede cambiar)
    await paralelo.update({
      nombre: nombre || paralelo.nombre,
      estado: estado || paralelo.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Paralelo actualizado exitosamente',
      data: paralelo
    });
  } catch (error) {
    console.error('Error al actualizar el paralelo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el paralelo',
      error: error.message
    });
  }
};

// Cambiar el estado del Paralelo
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
    
    const paralelo = await Paralelo.findByPk(id);
    
    if (!paralelo) {
      return res.status(404).json({
        success: false,
        message: `Paralelo con ID ${id} no encontrada`
      });
    }
    
    await paralelo.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado del Paralelo cambiado a ${estado}`,
      data: paralelo
    });
  } catch (error) {
    console.error('Error al cambiar estado del Paralelo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del Paralelo',
      error: error.message
    });
  }
};

// Eliminar un Paralelo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const paralelo = await Paralelo.findByPk(id);
    
    if (!paralelo) {
      return res.status(404).json({
        success: false,
        message: `Paralelo con ID ${id} no encontrada`
      });
    }
    
    await paralelo.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Paralelo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar el paralelo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el paralelo',
      error: error.message
    });
  }
};