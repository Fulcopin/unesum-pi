const { sequelize } = require('../models');
const Periodo = sequelize.models.periodos;


// Obtener todos los periodos
exports.getAll = async (req, res) => {
  try {
    const periodos = await Periodo.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: periodos // Corregido
    });
  } catch (error) {
    console.error('Error al obtener periodos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los periodos',
      error: error.message
    });
  }
};

// Obtener un Periodo por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const periodos = await Periodo.findByPk(id); // Renombrado
    
    if (!periodos) { // Renombrado
      return res.status(404).json({
        success: false,
        message: `Periodo con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: periodos // Renombrado
    });
  } catch (error) {
     console.error('Error al obtener los periodos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los periodos',
      error: error.message
    });
  }
};


// Crear una nuevo periodo
exports.create = async (req, res) => {
  try {
    const { nombre, estado } = req.body;
    
    // Validaciones básicas
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del periodo es obligatorio'
      });
    }
    
    // Verificar si ya existe un periodo con el mismo nombre
    const existente = await Periodo.findOne({ where: { nombre } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un periodo con el nombre ${nombre}`
      });
    }
    
    // Generar código automático
    const ultimoPeriodo = await Periodo.findOne({
      order: [['id', 'DESC']]
    });
    
    let nuevoCodigo = 'P-001';
    if (ultimoPeriodo && ultimoPeriodo.codigo) {
      // Extraer el número del último código y sumar 1
      const ultimoNumero = parseInt(ultimoPeriodo.codigo.split('-')[1]);
      const nuevoNumero = ultimoNumero + 1;
      nuevoCodigo = `P-${String(nuevoNumero).padStart(3, '0')}`;
    }
    
    // Crear el nuevo periodo
    const nuevoPeriodo = await Periodo.create({
      codigo: nuevoCodigo,
      nombre,
      estado: estado || 'proximo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Periodo creado exitosamente',
      data: nuevoPeriodo
    });
  } catch (error) {
    console.error('Error al crear el periodo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el periodo',
      error: error.message
    });
  }
};

// Actualizar un Periodo
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, estado } = req.body;
    
    // Buscar el periodo a actualizar
    const periodo = await Periodo.findByPk(id);
    
    if (!periodo) {
      return res.status(404).json({
        success: false,
        message: `Periodo con ID ${id} no encontrado`
      });
    }
    
    // Si se cambia el nombre, verificar que no exista otro con ese nombre
    if (nombre && nombre !== periodo.nombre) {
      const existente = await Periodo.findOne({ where: { nombre } });
      if (existente) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otro periodo con el nombre ${nombre}`
        });
      }
    }
    
    // Actualizar los campos (el código no se modifica)
    await periodo.update({
      nombre: nombre || periodo.nombre,
      estado: estado || periodo.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Periodo actualizado exitosamente',
      data: periodo
    });
  } catch (error) {
    console.error('Error al actualizar el periodo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el periodo',
      error: error.message
    });
  }
};

// Cambiar el estado del Periodo
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
    
    const periodo = await Periodo.findByPk(id);
    
    if (!periodo) {
      return res.status(404).json({
        success: false,
        message: `Periodo con ID ${id} no encontrada`
      });
    }
    
    await periodo.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado del Periodo cambiado a ${estado}`,
      data: periodo
    });
  } catch (error) {
    console.error('Error al cambiar estado del Periodo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del Periodo',
      error: error.message
    });
  }
};

// Eliminar un Periodo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const periodo = await Periodo.findByPk(id);
    
    if (!periodo) {
      return res.status(404).json({
        success: false,
        message: `Periodo con ID ${id} no encontrada`
      });
    }
    
    await periodo.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Periodo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar el periodo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el periodo',
      error: error.message
    });
  }
};