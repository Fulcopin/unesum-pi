const { Rol } = require('../models');

const slugify = (str = '') =>
  String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Listar todos los roles
exports.listar = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado === 'true') where.estado = true;
    if (estado === 'false') where.estado = false;

    const roles = await Rol.findAll({
      where,
      order: [['id', 'ASC']],
    });
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    console.error('Error al listar roles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al listar los roles',
      error: error.message,
    });
  }
};

// Obtener un rol por ID
exports.obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await Rol.findByPk(id);
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: `Rol con ID ${id} no encontrado`,
      });
    }
    return res.status(200).json({ success: true, data: rol });
  } catch (error) {
    console.error('Error al obtener rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el rol',
      error: error.message,
    });
  }
};

// Crear un nuevo rol
exports.crear = async (req, res) => {
  try {
    const { nombre, codigo, descripcion, estado } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del rol es obligatorio',
      });
    }

    const codigoFinal = (codigo && String(codigo).trim())
      ? slugify(codigo)
      : slugify(nombre);

    if (!codigoFinal) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo generar un código válido para el rol',
      });
    }

    const existente = await Rol.findOne({ where: { codigo: codigoFinal } });
    if (existente) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un rol con el código "${codigoFinal}"`,
      });
    }

    const nuevo = await Rol.create({
      nombre: String(nombre).trim(),
      codigo: codigoFinal,
      descripcion: descripcion ? String(descripcion).trim() : null,
      estado: estado === undefined ? true : Boolean(estado),
    });

    return res.status(201).json({
      success: true,
      message: 'Rol creado correctamente',
      data: nuevo,
    });
  } catch (error) {
    console.error('Error al crear rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el rol',
      error: error.message,
    });
  }
};

// Actualizar un rol
exports.actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, descripcion, estado } = req.body;

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: `Rol con ID ${id} no encontrado`,
      });
    }

    if (codigo !== undefined && codigo !== null && String(codigo).trim() !== '') {
      const nuevoCodigo = slugify(codigo);
      if (nuevoCodigo !== rol.codigo) {
        const dup = await Rol.findOne({ where: { codigo: nuevoCodigo } });
        if (dup && dup.id !== rol.id) {
          return res.status(400).json({
            success: false,
            message: `Ya existe un rol con el código "${nuevoCodigo}"`,
          });
        }
        rol.codigo = nuevoCodigo;
      }
    }

    if (nombre !== undefined) rol.nombre = String(nombre).trim();
    if (descripcion !== undefined) {
      rol.descripcion = descripcion ? String(descripcion).trim() : null;
    }
    if (estado !== undefined) rol.estado = Boolean(estado);

    await rol.save();

    return res.status(200).json({
      success: true,
      message: 'Rol actualizado correctamente',
      data: rol,
    });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el rol',
      error: error.message,
    });
  }
};

// Cambiar estado (activar/desactivar)
exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: `Rol con ID ${id} no encontrado`,
      });
    }

    rol.estado = estado === undefined ? !rol.estado : Boolean(estado);
    await rol.save();

    return res.status(200).json({
      success: true,
      message: `Rol ${rol.estado ? 'activado' : 'desactivado'} correctamente`,
      data: rol,
    });
  } catch (error) {
    console.error('Error al cambiar estado del rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar el estado del rol',
      error: error.message,
    });
  }
};

// Eliminar un rol
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await Rol.findByPk(id);
    if (!rol) {
      return res.status(404).json({
        success: false,
        message: `Rol con ID ${id} no encontrado`,
      });
    }

    await rol.destroy();
    return res.status(200).json({
      success: true,
      message: 'Rol eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el rol',
      error: error.message,
    });
  }
};
