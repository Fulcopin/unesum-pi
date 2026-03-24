const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { Usuario } = require('../models');
const Administrador = db.Usuario; // Modelo para administradores
const Profesor = db.Profesor; 
exports.login = async (req, res) => {
  try {
    const { correo_electronico, contraseña, rol_seleccionado } = req.body;
    if (!correo_electronico || !contraseña) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos.' });
    }

    // Buscar en AMBAS tablas para detectar roles múltiples
    const availableRoles = [];
    let adminUser = null;
    let profesorUser = null;

    // 1. Buscar en tabla usuarios
    const admin = await db.Usuario.findOne({ where: { correo_electronico: correo_electronico } });
    if (admin) {
      const isPasswordCorrect = await bcrypt.compare(contraseña, admin.contraseña);
      if (isPasswordCorrect) {
        adminUser = admin;
        availableRoles.push({
          rol: admin.rol || 'administrador',
          tabla: 'usuarios',
          id: admin.id,
          nombre: `${admin.nombres} ${admin.apellidos}`
        });
      }
    }

    // 2. Buscar en tabla profesores
    const profesor = await db.Profesor.findOne({ where: { email: correo_electronico } });
    if (profesor) {
      const isPasswordCorrect = await bcrypt.compare(contraseña, profesor.password);
      if (isPasswordCorrect) {
        profesorUser = profesor;
        availableRoles.push({
          rol: 'profesor',
          tabla: 'profesores',
          id: profesor.id,
          nombre: `${profesor.nombres} ${profesor.apellidos}`
        });
      }
    }

    // 3. Si no se encontró a nadie, rechazar
    if (availableRoles.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    // 4. Si hay múltiples roles y no se ha seleccionado uno, pedir selección
    if (availableRoles.length > 1 && !rol_seleccionado) {
      return res.json({
        success: true,
        multipleRoles: true,
        roles: availableRoles.map(r => ({
          rol: r.rol,
          nombre: r.nombre,
          descripcion: r.rol === 'profesor' ? 'Acceso como Docente' :
                       r.rol === 'comision_academica' ? 'Acceso como Comisión Académica' :
                       r.rol === 'administrador' ? 'Acceso como Administrador' :
                       `Acceso como ${r.rol}`
        }))
      });
    }

    // 5. Seleccionar el rol correcto
    let user = null;
    let rol = null;

    if (rol_seleccionado) {
      // El usuario eligió un rol específico
      const selectedRole = availableRoles.find(r => r.rol === rol_seleccionado);
      if (!selectedRole) {
        return res.status(400).json({ success: false, message: 'Rol seleccionado no válido.' });
      }
      if (selectedRole.tabla === 'usuarios') {
        user = adminUser;
        rol = selectedRole.rol;
      } else {
        user = profesorUser;
        rol = 'profesor';
      }
    } else {
      // Solo un rol disponible
      const singleRole = availableRoles[0];
      if (singleRole.tabla === 'usuarios') {
        user = adminUser;
        rol = singleRole.rol;
      } else {
        user = profesorUser;
        rol = 'profesor';
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Error al seleccionar rol.' });
    }

    // 6. Generar token y responder
    const payload = { id: user.id, rol: rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    const userResponse = user.toJSON();
    delete userResponse.password; 
    delete userResponse.contraseña; 
    userResponse.rol = rol;
    userResponse.availableRoles = availableRoles.map(r => r.rol);

    res.json({ success: true, token, user: userResponse });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
};
exports.register = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.contraseña, 10);
    const userData = {
      ...req.body,
      contraseña: hashedPassword,
      estado: true
    };

    const user = await Usuario.create(userData);
    
    // Excluir la contraseña de la respuesta
    const userResponse = user.toJSON();
    delete userResponse.contraseña;
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: userResponse
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ 
        success: false,
        message: 'El correo o cédula ya existe' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: 'Error del servidor' 
      });
    }
  }
};
exports.getMe = async (req, res) => {
    // Si llegamos aquí, el middleware de autenticación ya ha hecho su trabajo.
    // El ID del usuario está en req.user.id (o como lo hayas configurado).
    try {
        // Busca al usuario en AMBAS tablas para estar seguros.
        // CORRECCIÓN: Usar db.Usuario en lugar de db.Administrador
        let user = await db.Usuario.findByPk(req.user.id);
        if (!user && db.Profesor) {
            user = await db.Profesor.findByPk(req.user.id);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado." });
        }

        const userResponse = user.toJSON();
        delete userResponse.password;
        userResponse.rol = req.user.rol; // Añade el rol desde el token

        res.json({ success: true, user: userResponse });

    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ success: false, message: "Error del servidor." });
    }
};