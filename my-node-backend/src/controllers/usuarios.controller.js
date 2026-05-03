const bcrypt = require('bcrypt');
const db = require('../models');
const { Usuario } = db;

const ROLES_VALIDOS = [
  'administrador',
  'comision_academica',
  'comision',
  'direccion',
  'decano',
  'subdecano',
  'docente',
  'profesor',
  'estudiante',
];

function normalizarRoles(rolesInput) {
  if (!rolesInput) return [];
  if (typeof rolesInput === 'string') rolesInput = [rolesInput];
  if (!Array.isArray(rolesInput)) return [];
  const limpios = rolesInput
    .map(r => (r == null ? '' : String(r).trim()))
    .filter(Boolean)
    .filter(r => ROLES_VALIDOS.includes(r));
  return [...new Set(limpios)];
}

function sanitizar(user) {
  if (!user) return null;
  const data = user.toJSON ? user.toJSON() : { ...user };
  delete data.contraseña;
  delete data.password;
  if (!Array.isArray(data.roles) || data.roles.length === 0) {
    data.roles = data.rol ? [data.rol] : [];
  }
  return data;
}

exports.listar = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      order: [['id', 'ASC']],
    });
    res.json({ success: true, data: usuarios.map(sanitizar) });
  } catch (error) {
    console.error('listar usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al listar usuarios.' });
  }
};

exports.obtener = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    res.json({ success: true, data: sanitizar(usuario) });
  } catch (error) {
    console.error('obtener usuario:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuario.' });
  }
};

exports.crear = async (req, res) => {
  try {
    const {
      nombres, apellidos, cedula_identidad, telefono, correo_electronico,
      fecha_nacimiento, direccion, facultad, carrera, carrera_id,
      contraseña, estado, rol, roles,
    } = req.body;

    if (!nombres || !apellidos || !correo_electronico || !contraseña || !cedula_identidad) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    }

    const rolesNorm = normalizarRoles(roles && roles.length ? roles : (rol ? [rol] : []));
    if (rolesNorm.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe asignar al menos un rol válido.' });
    }

    const hashed = await bcrypt.hash(contraseña, 10);
    const nuevo = await Usuario.create({
      nombres, apellidos, cedula_identidad, telefono, correo_electronico,
      fecha_nacimiento, direccion, facultad, carrera, carrera_id,
      contraseña: hashed,
      estado: estado !== undefined ? !!estado : true,
      rol: rolesNorm[0],
      roles: rolesNorm,
    });

    res.status(201).json({ success: true, message: 'Usuario creado.', data: sanitizar(nuevo) });
  } catch (error) {
    console.error('crear usuario:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'El correo o la cédula ya están registrados.' });
    }
    res.status(500).json({ success: false, message: 'Error al crear usuario.' });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    const {
      nombres, apellidos, cedula_identidad, telefono, correo_electronico,
      fecha_nacimiento, direccion, facultad, carrera, carrera_id,
      contraseña, estado, rol, roles,
    } = req.body;

    const update = {
      ...(nombres !== undefined && { nombres }),
      ...(apellidos !== undefined && { apellidos }),
      ...(cedula_identidad !== undefined && { cedula_identidad }),
      ...(telefono !== undefined && { telefono }),
      ...(correo_electronico !== undefined && { correo_electronico }),
      ...(fecha_nacimiento !== undefined && { fecha_nacimiento }),
      ...(direccion !== undefined && { direccion }),
      ...(facultad !== undefined && { facultad }),
      ...(carrera !== undefined && { carrera }),
      ...(carrera_id !== undefined && { carrera_id }),
      ...(estado !== undefined && { estado: !!estado }),
    };

    if (contraseña) {
      update.contraseña = await bcrypt.hash(contraseña, 10);
    }

    if (roles !== undefined || rol !== undefined) {
      const rolesNorm = normalizarRoles(
        roles && roles.length ? roles : (rol ? [rol] : [])
      );
      if (rolesNorm.length === 0) {
        return res.status(400).json({ success: false, message: 'Debe quedar al menos un rol válido.' });
      }
      update.roles = rolesNorm;
      update.rol = rolesNorm[0];
    }

    await usuario.update(update);
    res.json({ success: true, message: 'Usuario actualizado.', data: sanitizar(usuario) });
  } catch (error) {
    console.error('actualizar usuario:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'El correo o la cédula ya están registrados.' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar usuario.' });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    await usuario.destroy();
    res.json({ success: true, message: 'Usuario eliminado.' });
  } catch (error) {
    console.error('eliminar usuario:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar usuario.' });
  }
};

exports.cambiarEstado = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    await usuario.update({ estado: !usuario.estado });
    res.json({ success: true, message: 'Estado actualizado.', data: sanitizar(usuario) });
  } catch (error) {
    console.error('cambiar estado usuario:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar estado.' });
  }
};

exports.actualizarRoles = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    const rolesNorm = normalizarRoles(req.body.roles);
    if (rolesNorm.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe asignar al menos un rol válido.' });
    }

    await usuario.update({ roles: rolesNorm, rol: rolesNorm[0] });
    res.json({ success: true, message: 'Roles actualizados.', data: sanitizar(usuario) });
  } catch (error) {
    console.error('actualizar roles:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar roles.' });
  }
};

exports.rolesDisponibles = (req, res) => {
  res.json({ success: true, data: ROLES_VALIDOS });
};
