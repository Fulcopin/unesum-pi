const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { Usuario } = require('../models');

const ROLE_LABELS = {
  administrador: 'Administrador',
  comision_academica: 'Comisión Académica',
  comision: 'Comisión Académica',
  coordinador: 'Coordinador/a de Carrera',
  direccion: 'Dirección',
  decano: 'Decano',
  subdecano: 'Subdecano',
  docente: 'Docente',
  profesor: 'Docente',
  estudiante: 'Estudiante',
};

function describeRole(rol) {
  return `Acceso como ${ROLE_LABELS[rol] || rol}`;
}

// Devuelve la lista de roles de un usuario (compatibilidad con sistemas viejos)
function getRolesArray(user) {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.filter(Boolean);
  }
  if (user.rol) return [user.rol];
  return [];
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || '0000', { expiresIn: '8h' });
}

exports.login = async (req, res) => {
  try {
    const { correo_electronico, contraseña, rol_seleccionado } = req.body;
    if (!correo_electronico || !contraseña) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos.' });
    }

    let adminUser = null;
    let profesorUser = null;
    const availableRoles = [];

    // 1) Buscar en tabla usuarios (puede tener varios roles en `roles`)
    const admin = await db.Usuario.findOne({ where: { correo_electronico } });
    if (admin) {
      const ok = await bcrypt.compare(contraseña, admin.contraseña);
      if (ok) {
        adminUser = admin;
        const rolesAdmin = getRolesArray(admin);
        rolesAdmin.forEach(rol => {
          availableRoles.push({
            rol,
            tabla: 'usuarios',
            id: admin.id,
            nombre: `${admin.nombres} ${admin.apellidos}`,
            descripcion: describeRole(rol),
          });
        });
      }
    }

    // 2) Buscar en tabla profesores (con sus roles M2M reales)
    const profesor = db.Profesor
      ? await db.Profesor.findOne({
          where: { email: correo_electronico },
          include: [
            {
              model: db.Rol,
              as: 'roles',
              attributes: ['id', 'codigo', 'nombre'],
              through: { attributes: [] },
              required: false,
            },
          ],
        })
      : null;

    if (profesor) {
      const ok = await bcrypt.compare(contraseña, profesor.password || '');
      if (ok) {
        profesorUser = profesor;
        const nombreCompleto = `${profesor.nombres} ${profesor.apellidos}`;

        // Obtener roles reales desde profesor_roles; si no tiene, usar 'docente' por defecto
        const rolesProfesor =
          profesor.roles && profesor.roles.length > 0
            ? profesor.roles.map(r => ({ codigo: r.codigo || 'docente', nombre: r.nombre }))
            : [{ codigo: 'docente', nombre: 'Docente' }];

        for (const rp of rolesProfesor) {
          const codigo = rp.codigo;
          // Evitar duplicar si ya existe en la lista (ej. admin que también es docente)
          if (!availableRoles.some(r => r.rol === codigo)) {
            availableRoles.push({
              rol: codigo,
              tabla: 'profesores',
              id: profesor.id,
              nombre: nombreCompleto,
              descripcion: describeRole(codigo),
              rolNombre: rp.nombre,
            });
          }
        }
      }
    }

    if (availableRoles.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    // 3) Siempre pedir selección de rol (incluso si hay solo uno)
    //    para que el usuario confirme conscientemente con qué rol ingresa.
    if (!rol_seleccionado) {
      return res.json({
        success: true,
        multipleRoles: true,
        roles: availableRoles.map(r => ({
          rol: r.rol,
          nombre: r.nombre,
          descripcion: r.descripcion,
          rolNombre: r.rolNombre || ROLE_LABELS[r.rol] || r.rol,
        })),
      });
    }

    // 4) Resolver el rol activo
    let user = null;
    let rolActivo = null;
    let tablaOrigen = null;

    if (rol_seleccionado) {
      const selected = availableRoles.find(r => r.rol === rol_seleccionado);
      if (!selected) {
        return res.status(400).json({ success: false, message: 'Rol seleccionado no válido.' });
      }
      tablaOrigen = selected.tabla;
      user = selected.tabla === 'usuarios' ? adminUser : profesorUser;
      rolActivo = selected.rol;
    } else {
      const single = availableRoles[0];
      tablaOrigen = single.tabla;
      user = single.tabla === 'usuarios' ? adminUser : profesorUser;
      rolActivo = single.rol;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Error al seleccionar rol.' });
    }

    // 5) Construir lista TOTAL de roles disponibles (admin.roles ∪ docente)
    const todosLosRoles = availableRoles.map(r => r.rol);

    // 6) Generar JWT
    const payload = {
      id: user.id,
      rol: rolActivo,
      roles: todosLosRoles,
      tabla: tablaOrigen,
    };
    const token = signToken(payload);

    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.contraseña;
    userResponse.rol = rolActivo;
    userResponse.roles = todosLosRoles;
    userResponse.availableRoles = todosLosRoles;

    res.json({ success: true, token, user: userResponse });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
};

// Permite cambiar el rol activo sin volver a iniciar sesión.
exports.cambiarRol = async (req, res) => {
  try {
    const { rol } = req.body;
    if (!rol) return res.status(400).json({ success: false, message: 'Rol requerido.' });

    const tokenPayload = req.user; // ya validado por authenticate
    const rolesUsuario = Array.isArray(tokenPayload.roles) ? tokenPayload.roles : [];

    if (!rolesUsuario.includes(rol)) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a ese rol.' });
    }

    const newPayload = {
      id: tokenPayload.id,
      rol,
      roles: rolesUsuario,
      tabla: tokenPayload.tabla,
    };
    const token = signToken(newPayload);

    const userResponse = tokenPayload.toJSON ? tokenPayload.toJSON() : { ...tokenPayload };
    delete userResponse.password;
    delete userResponse.contraseña;
    userResponse.rol = rol;
    userResponse.roles = rolesUsuario;
    userResponse.availableRoles = rolesUsuario;

    res.json({ success: true, token, user: userResponse });
  } catch (error) {
    console.error('cambiarRol error:', error);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
};

exports.register = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.contraseña, 10);
    const incomingRol = req.body.rol;
    const incomingRoles = Array.isArray(req.body.roles) && req.body.roles.length > 0
      ? req.body.roles
      : (incomingRol ? [incomingRol] : []);

    const userData = {
      ...req.body,
      contraseña: hashedPassword,
      estado: true,
      rol: incomingRol || incomingRoles[0],
      roles: incomingRoles,
    };

    const user = await Usuario.create(userData);

    const userResponse = user.toJSON();
    delete userResponse.contraseña;

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: userResponse,
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ success: false, message: 'El correo o cédula ya existe' });
    } else {
      res.status(500).json({ success: false, message: 'Error del servidor' });
    }
  }
};

exports.getMe = async (req, res) => {
  try {
    let user = await db.Usuario.findByPk(req.user.id);
    if (!user && db.Profesor) {
      user = await db.Profesor.findByPk(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.contraseña;
    userResponse.rol = req.user.rol;
    userResponse.roles = Array.isArray(req.user.roles) && req.user.roles.length > 0
      ? req.user.roles
      : getRolesArray(user);
    userResponse.availableRoles = userResponse.roles;

    res.json({ success: true, user: userResponse });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
};
