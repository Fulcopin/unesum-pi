const { sequelize } = require('../models');
const Actividades = sequelize.models.actividades;
const FuncionesSustantivas = sequelize.models.funciones_sustantivas;

// Verificar que los modelos existan
console.log('Modelo Actividades:', !!Actividades);
console.log('Modelo FuncionesSustantivas:', !!FuncionesSustantivas);
console.log('Modelos disponibles:', Object.keys(sequelize.models));

// Obtener todas las actividades
exports.getAll = async (req, res) => {
  try {
    console.log('Intentando obtener actividades...');
    console.log('Actividades model:', Actividades);
    
    if (!Actividades) {
      throw new Error('El modelo Actividades no está definido');
    }
    
    const actividades = await Actividades.findAll({
      order: [['id', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: actividades
    });
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las actividades',
      error: error.message
    });
  }
};

// Obtener una actividad por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const actividad = await Actividades.findByPk(id);
    
    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: `Actividad con ID ${id} no encontrada`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: actividad
    });
  } catch (error) {
    console.error('Error al obtener actividad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la actividad',
      error: error.message
    });
  }
};

// Crear una nueva actividad
exports.create = async (req, res) => {
  try {
    const { funcion_sustantiva_id, nombre, descripcion, estado } = req.body;
    
    // Validaciones básicas
    if (!funcion_sustantiva_id || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'La función sustantiva y nombre son campos obligatorios'
      });
    }
    
    // Verificar que la función sustantiva existe y obtener su código
    const funcionExiste = await FuncionesSustantivas.findByPk(funcion_sustantiva_id);
    if (!funcionExiste) {
      return res.status(404).json({
        success: false,
        message: `Función sustantiva con ID ${funcion_sustantiva_id} no encontrada`
      });
    }
    
    // Verificar si ya existe una actividad con el mismo nombre
    const existenteNombre = await Actividades.findOne({ where: { nombre } });
    if (existenteNombre) {
      return res.status(400).json({
        success: false,
        message: `Ya existe una actividad con el nombre "${nombre}"`
      });
    }
    
    // AUTOGENERAR EL CÓDIGO BASADO EN LA FUNCIÓN SUSTANTIVA
    // Extraer el prefijo del código de la función (primeras 3 letras)
    const prefijoFuncion = funcionExiste.codigo.substring(0, 3).toUpperCase();
    
    // Buscar la última actividad con ese prefijo
    const ultimaActividad = await Actividades.findOne({
      where: {
        codigo: {
          [require('sequelize').Op.like]: `${prefijoFuncion}-%`
        }
      },
      order: [['id', 'DESC']]
    });

    let nuevoCodigo = `${prefijoFuncion}-1`;
    if (ultimaActividad && ultimaActividad.codigo) {
      const partes = ultimaActividad.codigo.split('-');
      if (partes.length === 2) {
        const ultimoNumero = parseInt(partes[1]);
        const siguienteNumero = ultimoNumero + 1;
        nuevoCodigo = `${prefijoFuncion}-${String(siguienteNumero).padStart(3, '0')}`;
      }
    }
    
    // Crear la nueva actividad
    const nuevaActividad = await Actividades.create({
      funcion_sustantiva_id,
      codigo: nuevoCodigo,
      nombre,
      descripcion: descripcion || null,
      estado: estado || 'activo'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Actividad creada exitosamente',
      data: nuevaActividad
    });
  } catch (error) {
    console.error('Error al crear actividad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la actividad',
      error: error.message
    });
  }
};

// Actualizar una actividad
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { funcion_sustantiva_id, nombre, descripcion, estado } = req.body;
    
    // Buscar la actividad a actualizar
    const actividad = await Actividades.findByPk(id);
    
    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: `Actividad con ID ${id} no encontrada`
      });
    }
    
    // Si se cambia la función sustantiva, verificar que existe
    if (funcion_sustantiva_id && funcion_sustantiva_id !== actividad.funcion_sustantiva_id) {
      const funcionExiste = await FuncionesSustantivas.findByPk(funcion_sustantiva_id);
      if (!funcionExiste) {
        return res.status(404).json({
          success: false,
          message: `Función sustantiva con ID ${funcion_sustantiva_id} no encontrada`
        });
      }
    }
    
    // Si se cambia el nombre, verificar que no exista otro con ese nombre
    if (nombre && nombre !== actividad.nombre) {
      const existenteNombre = await Actividades.findOne({ where: { nombre } });
      if (existenteNombre) {
        return res.status(400).json({
          success: false,
          message: `Ya existe otra actividad con el nombre "${nombre}"`
        });
      }
    }
    
    // Actualizar los campos (el código NO se puede actualizar)
    await actividad.update({
      funcion_sustantiva_id: funcion_sustantiva_id || actividad.funcion_sustantiva_id,
      nombre: nombre || actividad.nombre,
      descripcion: descripcion !== undefined ? descripcion : actividad.descripcion,
      estado: estado || actividad.estado
    });
    
    return res.status(200).json({
      success: true,
      message: 'Actividad actualizada exitosamente',
      data: actividad
    });
  } catch (error) {
    console.error('Error al actualizar actividad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la actividad',
      error: error.message
    });
  }
};

// Cambiar el estado de una actividad
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
    
    const actividad = await Actividades.findByPk(id);
    
    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: `Actividad con ID ${id} no encontrada`
      });
    }
    
    await actividad.update({ estado });
    
    return res.status(200).json({
      success: true,
      message: `Estado de la actividad cambiado a ${estado}`,
      data: actividad
    });
  } catch (error) {
    console.error('Error al cambiar estado de actividad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado de la actividad',
      error: error.message
    });
  }
};

// Eliminar una actividad
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const actividad = await Actividades.findByPk(id);
    
    if (!actividad) {
      return res.status(404).json({
        success: false,
        message: `Actividad con ID ${id} no encontrada`
      });
    }
    
    await actividad.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Actividad eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar la actividad',
      error: error.message
    });
  }
};
