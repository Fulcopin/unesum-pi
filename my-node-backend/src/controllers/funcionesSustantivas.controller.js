const { sequelize } = require('../models');
const FuncionesSustantivas = sequelize.models.funciones_sustantivas;

// Verificar si el modelo existe e imprimir información de diagnóstico
console.log('Modelos disponibles:', Object.keys(sequelize.models));
console.log('Modelo funciones_sustantivas existe:', !!FuncionesSustantivas);
exports.getAll = async (req, res) => {
  try {
    const funciones = await FuncionesSustantivas.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: funciones
    });
  } catch (error) {
    console.error('Error al obtener funciones sustantivas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las funciones sustantivas',
      error: error.message
    });
  }
};

// Obtener una función sustantiva por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const funcion = await FuncionesSustantivas.findByPk(id);
    
    if (!funcion) {
      return res.status(404).json({
        success: false,
        message: `Función sustantiva con ID ${id} no encontrada`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: funcion
    });
  } catch (error) {
    console.error('Error al obtener función sustantiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la función sustantiva',
      error: error.message
    });
  }
};

// Crear una nueva función sustantiva
exports.create = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, estado } = req.body;
    
    // Validaciones básicas
    if (!codigo || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'El código y nombre son campos obligatorios'
      });
    }
    
    // Verificar si ya existe una función con el mismo código
    const existenteCodigo = await FuncionesSustantivas.findOne({ where: { codigo } });
    if (existenteCodigo) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una función sustantiva con el código ${codigo}`
      });
    }
    
    // Verificar si ya existe una función con el mismo nombre
    const existenteNombre = await FuncionesSustantivas.findOne({ where: { nombre } });
    if (existenteNombre) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una función sustantiva con el nombre "${nombre}"`
      });
    }
    
    // Crear la nueva función
    const nuevaFuncion = await FuncionesSustantivas.create({
      codigo,
      nombre,
      descripcion: descripcion || null,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Función sustantiva creada exitosamente',
      data: nuevaFuncion
    });
  } catch (error) {
    console.error('Error al crear función sustantiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la función sustantiva',
      error: error.message
    });
  }
};

// Actualizar una función sustantiva
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, descripcion, estado } = req.body;
    
    // Buscar la función a actualizar
    const funcion = await FuncionesSustantivas.findByPk(id);
    
    if (!funcion) {
      return res.status(404).json({
        success: false,
        message: `Función sustantiva con ID ${id} no encontrada`
      });
    }
    
    // Si se cambia el código, verificar que no exista otro con ese código
    if (codigo && codigo !== funcion.codigo) {
      const existenteCodigo = await FuncionesSustantivas.findOne({ where: { codigo } });
      if (existenteCodigo) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otra función sustantiva con el código ${codigo}`
        });
      }
    }
    
    // Si se cambia el nombre, verificar que no exista otro con ese nombre
    if (nombre && nombre !== funcion.nombre) {
      const existenteNombre = await FuncionesSustantivas.findOne({ where: { nombre } });
      if (existenteNombre) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otra función sustantiva con el nombre "${nombre}"`
        });
      }
    }
    
    // Actualizar los campos
    await funcion.update({
      codigo: codigo || funcion.codigo,
      nombre: nombre || funcion.nombre,
      descripcion: descripcion !== undefined ? descripcion : funcion.descripcion,
      estado: estado || funcion.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Función sustantiva actualizada exitosamente',
      data: funcion
    });
  } catch (error) {
    console.error('Error al actualizar función sustantiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la función sustantiva',
      error: error.message
    });
  }
};

// Cambiar el estado de una función sustantiva
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
    
    const funcion = await FuncionesSustantivas.findByPk(id);
    
    if (!funcion) {
      return res.status(404).json({
        success: false,
        message: `Función sustantiva con ID ${id} no encontrada`
      });
    }
    
    await funcion.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado de la función sustantiva cambiado a ${estado}`,
      data: funcion
    });
  } catch (error) {
    console.error('Error al cambiar estado de función sustantiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado de la función sustantiva',
      error: error.message
    });
  }
};

// Eliminar una función sustantiva
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const funcion = await FuncionesSustantivas.findByPk(id);
    
    if (!funcion) {
      return res.status(404).json({
        success: false,
        message: `Función sustantiva con ID ${id} no encontrada`
      });
    }
    
    await funcion.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Función sustantiva eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar función sustantiva:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la función sustantiva',
      error: error.message
    });
  }
};