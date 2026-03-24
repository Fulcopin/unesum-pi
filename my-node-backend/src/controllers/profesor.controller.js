// Ruta: controllers/profesor.controller.js

const db = require('../models');
const Profesor = db.Profesor;
const Carrera = db.Carrera;
const Facultad = db.Facultad;
const ProfesorCarrera = db.ProfesorCarrera;
const ProfesorAsignatura = db.ProfesorAsignatura;
const { Op } = require('sequelize'); // Importar Op para consultas complejas
const fs = require('fs');
const xlsx = require('xlsx');
// --- NUEVO: Importar dependencias para contraseñas y correos ---
const crypto = require('crypto'); // Módulo nativo de Node.js
const bcrypt = require('bcryptjs'); // Para hashear contraseñas
// --- CAMBIO #1: Importar Nodemailer directamente aquí ---
const nodemailer = require('nodemailer');
// Cargar variables de entorno (idealmente esto se hace una vez en server.js o app.js)
require('dotenv').config(); 

// --- CAMBIO #2: La función de envío de correo ahora vive DENTRO de este archivo ---
const sendEmailInternally = async (options) => {
  // 1. Crear el "transporter" con las variables de entorno
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true para puerto 465
    auth: {
      user: process.env.EMAIL_USER, // Tu usuario de Mailtrap o Gmail
      pass: process.env.EMAIL_PASS, // Tu contraseña de Mailtrap o de aplicación de Gmail
    },
    // Descomenta estas líneas si tienes problemas de conexión para obtener más detalles
    // logger: true, 
    // debug: true,
  });

  // 2. Definir las opciones del email
  const mailOptions = {
    from: '"Plataforma Académica" <no-reply@tuapp.com>',
    // --- IMPORTANTE: Usamos el email que viene en 'options' ---
    // Esto asegura que el correo se envía al profesor que se está creando.
    to: options.email, 
    subject: options.subject,
    html: options.message,
  };

  try {
    // 3. Enviar el email y mostrar un log de éxito
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado exitosamente a ${options.email}. Message ID: ${info.messageId}`);
  } catch (error) {
    // Si falla, mostrar el error detallado en la consola del servidor
    console.error(`❌ ERROR al enviar correo a ${options.email}:`, error);
    // Lanzamos el error para que la función que lo llamó pueda manejarlo si es necesario
    throw new Error('El servicio de correo falló al enviar el email.');
  }
};


exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, passwordConfirm } = req.body;

        if (!password || password !== passwordConfirm) {
            return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden o están vacías.' });
        }

        // Hashear el token recibido para buscarlo en la BD
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Buscar al profesor con el token válido y que no haya expirado
        const profesor = await Profesor.findOne({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { [Op.gt]: Date.now() } // El token no ha expirado
            }
        });

        if (!profesor) {
            return res.status(400).json({ success: false, message: 'El token es inválido o ha expirado.' });
        }

        // Si el token es válido, actualizar la contraseña y limpiar los campos de reseteo
        profesor.password = await bcrypt.hash(password, 12);
        profesor.passwordResetToken = null;
        profesor.passwordResetExpires = null;
        await profesor.save();

        res.status(200).json({ success: true, message: 'Contraseña actualizada exitosamente.' });

    } catch (error) {
        console.error('Error al resetear la contraseña:', error);
        res.status(500).json({ success: false, message: 'Error al procesar la solicitud.', error: error.message });
    }
};

// --- OBTENER SYLLABI ASIGNADOS AL PROFESOR ---
exports.getMySyllabi = async (req, res) => {
  try {
    const profesorId = req.user.id; // ID del profesor autenticado
    
    const profesor = await Profesor.findByPk(profesorId, {
      include: [
        {
          model: db.Asignatura,
          as: 'asignatura',
          attributes: ['id', 'nombre', 'codigo'],
          include: [{
            model: db.Carrera,
            as: 'carrera',
            attributes: ['id', 'nombre'],
            include: [{
              model: db.Facultad,
              as: 'facultad',
              attributes: ['id', 'nombre']
            }]
          }]
        },
        {
          model: db.Nivel,
          as: 'nivel',
          attributes: ['id', 'nombre']
        },
        {
          model: db.Paralelo,
          as: 'paralelo',
          attributes: ['id', 'nombre']
        }
      ]
    });

    if (!profesor) {
      return res.status(404).json({ success: false, message: 'Profesor no encontrado' });
    }

    // Obtener syllabi creados para la asignatura del profesor
    const Syllabus = db.Syllabus;
    const syllabi = await Syllabus.findAll({
      where: {
        [Op.or]: [
          { profesor_id: profesorId }, // Syllabi asignados directamente al profesor
          { profesor_id: null } // Syllabi sin asignar (plantillas generales)
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ 
      success: true, 
      data: {
        profesor: {
          id: profesor.id,
          nombres: profesor.nombres,
          apellidos: profesor.apellidos,
          email: profesor.email,
          asignatura: profesor.asignatura,
          nivel: profesor.nivel,
          paralelo: profesor.paralelo
        },
        syllabi: syllabi
      }
    });

  } catch (error) {
    console.error('Error al obtener syllabi del profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener syllabi', error: error.message });
  }
};
const createPasswordResetToken = () => {
  // 1. Generar un token simple y aleatorio
  const resetToken = crypto.randomBytes(32).toString('hex');

  // 2. Hashear el token antes de guardarlo en la BD (más seguro)
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3. Establecer la fecha de expiración (12 horas desde ahora)
  const expirationDate = Date.now() + 12 * 60 * 60 * 1000;

  // Se retorna el token original (para el email) y el hasheado (para la BD)
  return { resetToken, hashedToken, expirationDate };
};

// --- NUEVO: Función auxiliar para enviar el correo de bienvenida ---
const sendPasswordSetupEmail = async (profesor, resetToken) => {
  // Reemplaza 'http://localhost:3000' con la URL de tu frontend
  const setupURL = `http://localhost:3000/configurar-password/${resetToken}`;

  const message = `
    <h1>Bienvenido a la plataforma</h1>
    <p>Hola ${profesor.nombres},</p>
    <p>Has sido registrado en el sistema. Para completar tu registro y establecer una contraseña segura, por favor haz clic en el siguiente enlace.</p>
    <p>Este enlace es válido por las próximas 12 horas.</p>
    <a href="${setupURL}" target="_blank" style="padding: 10px 15px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
      Configurar mi Contraseña
    </a>
    <p>Si no esperabas este correo, puedes ignorarlo de forma segura.</p>
  `;

  try {
    await sendEmailInternally({
      email: profesor.email,
      subject: 'Configura tu cuenta de profesor',
      message,
    });
  } catch (error) {
    console.error(`FALLO AL ENVIAR EMAIL a ${profesor.email}:`, error);
    // Podrías añadir lógica aquí para reintentar o marcar al usuario
  }
};
// --- OBTENER TODOS LOS PROFESORES ---
exports.getAll = async (req, res) => {
  try {
    const profesores = await Profesor.findAll({
      order: [['apellidos', 'ASC'], ['nombres', 'ASC']],
      include: [
        {
          model: Carrera,
          as: 'carrera',
          attributes: ['id', 'nombre'],
          include: [
            {
              model: Facultad,
              as: 'facultad',
              attributes: ['id', 'nombre']
            },
            {
              model: db.Malla,
              as: 'mallas',
              attributes: ['id', 'codigo_malla']
            }
          ]
        },
        {
          model: Carrera,
          as: 'carreras',
          attributes: ['id', 'nombre'],
          through: { attributes: [] },
          include: [
            {
              model: Facultad,
              as: 'facultad',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: db.Asignatura,
          as: 'asignatura',
          attributes: ['id', 'nombre', 'codigo'],
          include: [
            {
              model: db.ProgramasAnaliticos,
              as: 'programasAnaliticos',
              attributes: ['id', 'nombre', 'periodo'],
              required: false
            },
            {
              model: db.Syllabus,
              as: 'syllabi',
              attributes: ['id', 'nombre', 'periodo'],
              required: false
            }
          ]
        },
        {
          model: db.Asignatura,
          as: 'asignaturas',
          attributes: ['id', 'nombre', 'codigo'],
          through: { attributes: [] },
          include: [
            {
              model: db.ProgramasAnaliticos,
              as: 'programasAnaliticos',
              attributes: ['id', 'nombre', 'periodo'],
              required: false
            },
            {
              model: db.Syllabus,
              as: 'syllabi',
              attributes: ['id', 'nombre', 'periodo'],
              required: false
            },
            {
              model: db.SyllabusComisionAcademica,
              as: 'syllabusComision',
              attributes: ['id', 'nombre', 'periodo', 'estado'],
              required: false
            }
          ]
        },
        {
          model: db.Nivel,
          as: 'nivel',
          attributes: ['id', 'nombre', 'codigo']
        },
        {
          model: db.Paralelo,
          as: 'paralelo',
          attributes: ['id', 'nombre', 'codigo']
        },
        {
          model: db.SyllabusDocente,
          as: 'syllabusDocente',
          attributes: ['id', 'nombre', 'periodo', 'estado', 'asignatura_id'],
          required: false
        },
        {
          model: db.ProgramaAnaliticoDocente,
          as: 'programasDocente',
          attributes: ['id', 'nombre', 'periodo', 'estado', 'asignatura_id'],
          required: false
        }
      ]
    });
    return res.status(200).json({ success: true, data: profesores });
  } catch (error) {
    console.error('Error al obtener profesores:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener los profesores', error: error.message });
  }
};

exports.bulkCreate = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo.' });
  }

  const errors = [];
  const filePath = req.file.path;
  const createdProfesores = [];

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    fs.unlinkSync(filePath);

    if (jsonData.length === 0) {
      return res.status(400).json({ success: false, message: 'El archivo está vacío.' });
    }

    // Mostrar las columnas detectadas para debug
    const columnas = Object.keys(jsonData[0] || {});
    console.log('📋 Columnas detectadas:', columnas);

    // Pre-cargar datos para lookups eficientes
    const Asignatura = db.Asignatura;
    const Nivel = db.Nivel;
    const Paralelo = db.Paralelo;

    const todasCarreras = await Carrera.findAll({ attributes: ['id', 'nombre'] });
    const todasAsignaturas = await Asignatura.findAll({ attributes: ['id', 'nombre', 'codigo'] });
    const todosNiveles = await Nivel.findAll({ attributes: ['id', 'nombre', 'codigo'] });
    const todosParalelos = await Paralelo.findAll({ attributes: ['id', 'nombre', 'codigo'] });

    // Crear mapas para búsqueda rápida (nombre en minúsculas -> objeto)
    const carreraMap = {};
    todasCarreras.forEach(c => { carreraMap[c.nombre.trim().toLowerCase()] = c; });
    
    const asignaturaMap = {};
    todasAsignaturas.forEach(a => { 
      asignaturaMap[a.nombre.trim().toLowerCase()] = a;
      if (a.codigo) asignaturaMap[a.codigo.trim().toLowerCase()] = a;
    });
    
    const nivelMap = {};
    todosNiveles.forEach(n => { 
      nivelMap[n.nombre.trim().toLowerCase()] = n;
      if (n.codigo) nivelMap[n.codigo.trim().toLowerCase()] = n;
    });
    
    const paraleloMap = {};
    todosParalelos.forEach(p => { 
      paraleloMap[p.nombre.trim().toLowerCase()] = p;
      if (p.codigo) paraleloMap[p.codigo.trim().toLowerCase()] = p;
    });

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // +2 porque fila 1 es header

      // Campos obligatorios
      const nombres = row.nombres ? String(row.nombres).trim() : '';
      const apellidos = row.apellidos ? String(row.apellidos).trim() : '';
      const email = row.email ? String(row.email).trim() : '';
      const carreraNombre = row.carrera_nombre ? String(row.carrera_nombre).trim() : '';

      if (!nombres || !apellidos || !email || !carreraNombre) {
        errors.push(`Fila ${rowNumber}: Faltan datos obligatorios (nombres, apellidos, email, carrera_nombre).`);
        continue;
      }

      // Buscar carrera principal
      const carrera = carreraMap[carreraNombre.toLowerCase()];
      if (!carrera) {
        errors.push(`Fila ${rowNumber}: La carrera "${carreraNombre}" no fue encontrada.`);
        continue;
      }

      // Verificar email duplicado
      const existente = await Profesor.findOne({ where: { email } });
      if (existente) {
        errors.push(`Fila ${rowNumber}: El email "${email}" ya está en uso.`);
        continue;
      }

      // Buscar carreras adicionales (campo opcional: carreras_adicionales, separadas por ;)
      const carrerasAdicionales = row.carreras_adicionales ? String(row.carreras_adicionales).trim() : '';
      const carreraIds = new Set([carrera.id]);
      if (carrerasAdicionales) {
        carrerasAdicionales.split(';').forEach(cn => {
          const c = carreraMap[cn.trim().toLowerCase()];
          if (c) {
            carreraIds.add(c.id);
          } else if (cn.trim()) {
            errors.push(`Fila ${rowNumber}: Carrera adicional "${cn.trim()}" no encontrada (se omite).`);
          }
        });
      }

      // Buscar asignaturas (campo opcional: asignaturas, separadas por ;)
      const asignaturasStr = row.asignaturas ? String(row.asignaturas).trim() : (row.asignatura_nombre ? String(row.asignatura_nombre).trim() : '');
      const asignaturaIds = [];
      if (asignaturasStr) {
        asignaturasStr.split(';').forEach(an => {
          const a = asignaturaMap[an.trim().toLowerCase()];
          if (a) {
            asignaturaIds.push(a.id);
          } else if (an.trim()) {
            errors.push(`Fila ${rowNumber}: Asignatura "${an.trim()}" no encontrada (se omite).`);
          }
        });
      }

      // Buscar nivel (campo opcional)
      let nivelId = null;
      const nivelStr = row.nivel_nombre || row.nivel || '';
      if (nivelStr) {
        const nivel = nivelMap[String(nivelStr).trim().toLowerCase()];
        if (nivel) {
          nivelId = nivel.id;
        } else {
          errors.push(`Fila ${rowNumber}: Nivel "${nivelStr}" no encontrado (se omite).`);
        }
      }

      // Buscar paralelo (campo opcional)
      let paraleloId = null;
      const paraleloStr = row.paralelo_nombre || row.paralelo || '';
      if (paraleloStr) {
        const paralelo = paraleloMap[String(paraleloStr).trim().toLowerCase()];
        if (paralelo) {
          paraleloId = paralelo.id;
        } else {
          errors.push(`Fila ${rowNumber}: Paralelo "${paraleloStr}" no encontrado (se omite).`);
        }
      }

      // Estado activo (campo opcional, default: true)
      let activo = true;
      if (row.activo !== undefined && row.activo !== null) {
        const activoStr = String(row.activo).trim().toLowerCase();
        activo = !['false', '0', 'no', 'inactivo'].includes(activoStr);
      }

      try {
        // Generar contraseña temporal y token
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        const { resetToken, hashedToken, expirationDate } = createPasswordResetToken();

        const nuevoProfesor = await Profesor.create({
          nombres,
          apellidos,
          email,
          carrera_id: carrera.id,
          activo,
          asignatura_id: asignaturaIds.length > 0 ? asignaturaIds[0] : null,
          nivel_id: nivelId,
          paralelo_id: paraleloId,
          password: hashedPassword,
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(expirationDate)
        });

        // Asignar carreras (muchos a muchos)
        if (carreraIds.size > 0) {
          await nuevoProfesor.setCarreras([...carreraIds]);
        }

        // Asignar asignaturas (muchos a muchos)
        if (asignaturaIds.length > 0) {
          await nuevoProfesor.setAsignaturas(asignaturaIds);
        }

        createdProfesores.push({
          id: nuevoProfesor.id,
          nombres,
          apellidos,
          email,
          resetToken
        });

      } catch (dbError) {
        errors.push(`Fila ${rowNumber}: Error al crear profesor. ${dbError.message}`);
      }
    }

    // Enviar correos de bienvenida (sin bloquear la respuesta)
    if (createdProfesores.length > 0) {
      for (const prof of createdProfesores) {
        try {
          await sendPasswordSetupEmail(prof, prof.resetToken);
        } catch (emailErr) {
          console.error(`⚠️ Error enviando email a ${prof.email}:`, emailErr.message);
        }
      }
    }

    const totalFilas = jsonData.length;
    const totalCreados = createdProfesores.length;
    const totalErrores = errors.length;

    if (totalCreados === 0 && totalErrores > 0) {
      return res.status(422).json({
        success: false,
        message: `No se pudo crear ningún docente. ${totalErrores} errores encontrados.`,
        errors,
        summary: { total: totalFilas, creados: 0, errores: totalErrores }
      });
    }

    if (totalErrores > 0) {
      return res.status(207).json({
        success: true,
        message: `Proceso completado: ${totalCreados} de ${totalFilas} docentes creados. ${totalErrores} errores.`,
        errors,
        summary: { total: totalFilas, creados: totalCreados, errores: totalErrores }
      });
    }

    return res.status(201).json({
      success: true,
      message: `¡Éxito! ${totalCreados} docentes creados correctamente.`,
      summary: { total: totalFilas, creados: totalCreados, errores: 0 }
    });

  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Error al procesar el archivo:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar el archivo.', error: error.message });
  }
};

// --- CREAR UN NUEVO PROFESOR (MODIFICADO) ---
exports.create = async (req, res) => {
  try {
    const { nombres, apellidos, email, carrera, activo, asignatura_id, nivel_id, paralelo_id } = req.body;

    if (!nombres || !apellidos || !email || !carrera) {
      return res.status(400).json({ success: false, message: 'Nombres, apellidos, email y carrera son obligatorios.' });
    }
    
    const existente = await Profesor.findOne({ where: { email } });
    if (existente) {
      return res.status(400).json({ success: false, message: `Ya existe un profesor con el email ${email}` });
    }
    
    // --- NUEVO: Generar contraseña temporal y token ---
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const { resetToken, hashedToken, expirationDate } = createPasswordResetToken();

    const nuevoProfesor = await Profesor.create({
      nombres,
      apellidos,
      email,
      carrera_id: carrera,
      activo: activo !== undefined ? activo : true,
      asignatura_id: asignatura_id || null,
      nivel_id: nivel_id || null,
      paralelo_id: paralelo_id || null,
      // --- NUEVO: Añadir los campos de seguridad al crear ---
      password: hashedPassword,
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(expirationDate)
    });

    // Guardar carreras adicionales en la tabla intermedia
    const { carreras_ids, asignaturas_ids } = req.body;
    const allCarreraIds = new Set();
    allCarreraIds.add(parseInt(carrera, 10));
    if (Array.isArray(carreras_ids)) {
      carreras_ids.forEach(cid => allCarreraIds.add(parseInt(cid, 10)));
    }
    if (allCarreraIds.size > 0) {
      await nuevoProfesor.setCarreras([...allCarreraIds]);
    }

    // Guardar asignaturas en la tabla intermedia
    const allAsignaturaIds = new Set();
    if (asignatura_id) {
      allAsignaturaIds.add(parseInt(asignatura_id, 10));
    }
    if (Array.isArray(asignaturas_ids)) {
      asignaturas_ids.forEach(aid => allAsignaturaIds.add(parseInt(aid, 10)));
    }
    if (allAsignaturaIds.size > 0) {
      await nuevoProfesor.setAsignaturas([...allAsignaturaIds]);
    }

    // --- NUEVO: Enviar el correo de bienvenida ---
    await sendPasswordSetupEmail(nuevoProfesor, resetToken);
    
    // La respuesta no debería incluir datos sensibles como el token.
    // El método toJSON del modelo de Sequelize (si lo configuraste) ayuda a ocultar estos campos.
    return res.status(201).json({ success: true, message: 'Profesor creado exitosamente. Se ha enviado un email para configurar la contraseña.', data: nuevoProfesor });

  } catch (error) {
    console.error('Error al crear profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al crear el profesor', error: error.message });
  }
};
// --- ACTUALIZAR UN PROFESOR ---
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, email, carrera, activo, asignatura_id, nivel_id, paralelo_id, carreras_ids, asignaturas_ids } = req.body;

    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({ success: false, message: `Profesor con ID ${id} no encontrado` });
    }

    // Si se cambia el email, verificar que no esté en uso por OTRO profesor
    if (email && email !== profesor.email) {
      const existente = await Profesor.findOne({ where: { email, id: { [Op.ne]: id } } });
      if (existente) {
        return res.status(400).json({ success: false, message: `El email ${email} ya está en uso por otro profesor` });
      }
    }

    await profesor.update({
      nombres: nombres || profesor.nombres,
      apellidos: apellidos || profesor.apellidos,
      email: email || profesor.email,
      carrera_id: carrera || profesor.carrera_id,
      activo: activo !== undefined ? activo : profesor.activo,
      asignatura_id: asignatura_id !== undefined ? asignatura_id : profesor.asignatura_id,
      nivel_id: nivel_id !== undefined ? nivel_id : profesor.nivel_id,
      paralelo_id: paralelo_id !== undefined ? paralelo_id : profesor.paralelo_id
    });

    // Actualizar carreras adicionales si se envían
    if (Array.isArray(carreras_ids)) {
      const allCarreraIds = new Set(carreras_ids.map(cid => parseInt(cid, 10)));
      // Siempre incluir la carrera principal
      allCarreraIds.add(carrera ? parseInt(carrera, 10) : profesor.carrera_id);
      await profesor.setCarreras([...allCarreraIds]);
    }

    // Actualizar asignaturas si se envían
    if (Array.isArray(asignaturas_ids)) {
      const allAsignaturaIds = new Set(asignaturas_ids.map(aid => parseInt(aid, 10)));
      // Incluir la asignatura principal si existe
      const mainAsigId = asignatura_id !== undefined ? asignatura_id : profesor.asignatura_id;
      if (mainAsigId) {
        allAsignaturaIds.add(parseInt(mainAsigId, 10));
      }
      await profesor.setAsignaturas([...allAsignaturaIds]);
    }

    return res.status(200).json({ success: true, message: 'Profesor actualizado exitosamente', data: profesor });
  } catch (error) {
    console.error('Error al actualizar profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el profesor', error: error.message });
  }
};

// --- OBTENER DOCUMENTOS DE UN PROFESOR (Malla, PA, Syllabus) ---
exports.getDocumentos = async (req, res) => {
  try {
    const { id } = req.params;
    
    const profesor = await Profesor.findByPk(id, {
      include: [
        {
          model: Carrera,
          as: 'carrera',
          attributes: ['id', 'nombre'],
          include: [
            {
              model: Facultad,
              as: 'facultad',
              attributes: ['id', 'nombre']
            },
            {
              model: db.Malla,
              as: 'mallas',
              attributes: ['id', 'codigo_malla']
            }
          ]
        },
        {
          model: db.Asignatura,
          as: 'asignatura',
          attributes: ['id', 'nombre', 'codigo'],
          include: [
            {
              model: db.ProgramasAnaliticos,
              as: 'programasAnaliticos',
              attributes: ['id', 'nombre', 'periodo', 'createdAt']
            },
            {
              model: db.Syllabus,
              as: 'syllabi',
              attributes: ['id', 'nombre', 'periodo', 'createdAt']
            },
            {
              model: db.SyllabusComisionAcademica,
              as: 'syllabusComision',
              attributes: ['id', 'nombre', 'periodo', 'estado']
            }
          ]
        },
        {
          model: db.Nivel,
          as: 'nivel',
          attributes: ['id', 'nombre']
        },
        {
          model: db.Paralelo,
          as: 'paralelo',
          attributes: ['id', 'nombre']
        },
        {
          model: db.SyllabusDocente,
          as: 'syllabusDocente',
          attributes: ['id', 'nombre', 'periodo', 'estado', 'asignatura_id', 'createdAt']
        },
        {
          model: db.ProgramaAnaliticoDocente,
          as: 'programasDocente',
          attributes: ['id', 'nombre', 'periodo', 'estado', 'asignatura_id', 'createdAt']
        }
      ]
    });

    if (!profesor) {
      return res.status(404).json({ success: false, message: 'Profesor no encontrado' });
    }

    return res.status(200).json({ success: true, data: profesor });
  } catch (error) {
    console.error('Error al obtener documentos del profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener documentos', error: error.message });
  }
};

// --- ELIMINAR UN PROFESOR ---
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({ success: false, message: `Profesor con ID ${id} no encontrado` });
    }

    await profesor.destroy(); // Usará borrado lógico (soft delete) si está configurado en el modelo
    
    return res.status(200).json({ success: true, message: 'Profesor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar profesor:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar el profesor', error: error.message });
  }
};