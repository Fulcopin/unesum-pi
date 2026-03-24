const { sequelize } = require('../models');

const Organizacion = sequelize.models.organizacion;


// Obtener todos los niveles
exports.getAll = async (req, res) => {
  try {
    const organizacion_curricular = await Organizacion.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data:organizacion_curricular  // Corregido
    });
  } catch (error) {
    console.error('Error al obtener las Unidades de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las Unidades de organización curricular',
      error: error.message
    });
  }
};

// Obtener una Unidad de organización curricular por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const organizacion_curricular = await Organizacion.findByPk(id); // Renombrado
    
    if (!organizacion_curricular) { // Renombrado
      return res.status(404).json({
        success: false,
        message: `Unidad organización curricular con ID ${id} no encontrado`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: organizacion_curricular // Renombrado
    });
  } catch (error) {
     console.error('Error al obtener las Unidades de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las Unidades de organización curricular',
      error: error.message
    });
  }
};


// Crear una nueva organización
exports.create = async (req, res) => {
  try {
    const { nombre, estado } = req.body;
    
    // Validaciones básicas
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es campo obligatorio'
      });
    }
    
    // Verificar si ya existe una organización con el mismo nombre
    const existente = await Organizacion.findOne({ where: { nombre } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una Unidad de Organización curricular con el nombre ${nombre}`
      });
    }
    
    // Generar código automático
    const ultimaOrganizacion = await Organizacion.findOne({
      order: [['id', 'DESC']]
    });
    
    let nuevoCodigo = 'ORG-001';
    if (ultimaOrganizacion && ultimaOrganizacion.codigo) {
      // Extraer el número del último código y sumar 1
      const ultimoNumero = parseInt(ultimaOrganizacion.codigo.split('-')[1]);
      const nuevoNumero = ultimoNumero + 1;
      nuevoCodigo = `ORG-${String(nuevoNumero).padStart(3, '0')}`;
    }
    
    // Crear la nueva organización
    const nuevoOrganizacion = await Organizacion.create({
      codigo: nuevoCodigo,
      nombre,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Unidad de Organización curricular creado exitosamente',
      data: nuevoOrganizacion
    });
  } catch (error) {
    console.error('Error al crear la Unidad de Organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la Unidad de organización curricular',
      error: error.message
    });
  }
};

// Actualizar una Organización
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, estado } = req.body;
    
    // Buscar la organización a actualizar
    const organizacion_curricular = await Organizacion.findByPk(id);
    
    if (!organizacion_curricular) {
      return res.status(404).json({
        success: false,
        message: `Unidad de organización curricular con ID ${id} no encontrada`
      });
    }
    
    // Verificar si el nombre ya existe en otra organización
    if (nombre && nombre !== organizacion_curricular.nombre) {
      const existente = await Organizacion.findOne({ where: { nombre } });
      if (existente && existente.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otra Unidad de organización curricular con el nombre ${nombre}`
        });
      }
    }
    
    // Actualizar los campos (el código no se puede cambiar)
    await organizacion_curricular.update({
      nombre: nombre || organizacion_curricular.nombre,
      estado: estado || organizacion_curricular.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Unidad de organización curricular actualizado exitosamente',
      data: organizacion_curricular
    });
  } catch (error) {
    console.error('Error al actualizar la Unidad de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la Unidad de organización curricular',
      error: error.message
    });
  }
};

// Cambiar el estado de la Unidad de Organización Curricular
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
    
    const organizacion_curricular = await Organizacion.findByPk(id);
    
    if (!organizacion_curricular) {
      return res.status(404).json({
        success: false,
        message: `Unidad de organización curricular con ID ${id} no encontrada`
      });
    }
    
    await organizacion_curricular.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado de la Unidad de organización curricular a cambiado a ${estado}`,
      data: organizacion_curricular
    });
  } catch (error) {
    console.error('Error al cambiar estado de la Unidad de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado de la Unidad de organización curricular',
      error: error.message
    });
  }
};

// Eliminar un Paralelo
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const organizacion_curricular = await Organizacion.findByPk(id);
    
    if (!organizacion_curricular) {
      return res.status(404).json({
        success: false,
        message: `Unidad de organización curricular con ID ${id} no encontrada`
      });
    }
    
    await organizacion_curricular.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Unidad de organización curricular eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar la unidad de organización curricular:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la unidad de organización curricular',
      error: error.message
    });
  }
};