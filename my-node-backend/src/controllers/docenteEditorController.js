// docenteEditorController.js
// Controlador para endpoints del editor docente (syllabus y programa analítico)

const { SyllabusDocente, ProgramaAnaliticoDocente, SyllabusComisionAcademica, ProgramasAnaliticos, Profesor, Asignatura, Nivel, Paralelo, Carrera, Syllabus, Facultad, Periodo, sequelize: dbSequelize } = require('../models');
const { Op } = require('sequelize');

// =========================================================================
// PERFIL DEL DOCENTE (obtener info del profesor logueado)
// =========================================================================
exports.getProfesorInfo = async (req, res) => {
  try {
    const profesorId = req.user.id;
    const profesor = await Profesor.findByPk(profesorId, {
      include: [
        { model: Asignatura, as: 'asignatura', include: [
          { model: Carrera, as: 'carrera', include: [
            { model: Facultad, as: 'facultad' }
          ]}
        ]},
        // También incluir asignaturas por relación muchos-a-muchos (tabla profesor_asignaturas)
        { model: Asignatura, as: 'asignaturas', include: [
          { model: Carrera, as: 'carrera', include: [
            { model: Facultad, as: 'facultad' }
          ]}
        ]},
        { model: Nivel, as: 'nivel' },
        { model: Paralelo, as: 'paralelo' }
      ]
    });

    if (!profesor) {
      return res.status(404).json({ success: false, message: 'Profesor no encontrado' });
    }

    // Construir respuesta con asignatura efectiva
    const profesorData = profesor.toJSON();
    
    // Si no tiene asignatura directa pero sí tiene por M2M, usar la primera
    if (!profesorData.asignatura && profesorData.asignaturas && profesorData.asignaturas.length > 0) {
      profesorData.asignatura = profesorData.asignaturas[0];
      profesorData.asignatura_id = profesorData.asignaturas[0].id;
    }

    res.json({ success: true, data: profesorData });
  } catch (error) {
    console.error('Error getProfesorInfo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// OBTENER SYLLABUS DE LA COMISION PARA LA ASIGNATURA DEL DOCENTE
// =========================================================================
exports.getSyllabusComision = async (req, res) => {
  try {
    const { asignatura_id, periodo } = req.query;
    
    if (!asignatura_id) {
      return res.status(400).json({ success: false, message: 'asignatura_id es requerido' });
    }

    let syllabus = null;

    // Resolver periodo: obtener tanto el ID como el nombre para buscar
    let periodoValues = [];
    if (periodo) {
      periodoValues.push(String(periodo));
      try {
        const periodoRecord = await Periodo.findByPk(parseInt(periodo));
        if (periodoRecord && periodoRecord.nombre) {
          periodoValues.push(periodoRecord.nombre);
        }
      } catch (e) { /* ignore */ }
      // También buscar periodo por nombre (por si acaso enviaron el nombre)
      if (periodoValues.length === 1) {
        try {
          const periodoByName = await Periodo.findOne({ where: { nombre: periodo } });
          if (periodoByName) {
            periodoValues.push(String(periodoByName.id));
          }
        } catch (e) { /* ignore */ }
      }
    }

    // 1. Buscar en tabla syllabus_comision_academica por asignatura_id + periodo
    if (periodoValues.length > 0) {
      syllabus = await SyllabusComisionAcademica.findOne({
        where: {
          asignatura_id: asignatura_id,
          periodo: { [Op.in]: periodoValues }
        },
        order: [['created_at', 'DESC']]
      });
    }
    
    // 2. Buscar en syllabus_comision_academica solo por asignatura_id (sin filtrar periodo)
    if (!syllabus) {
      syllabus = await SyllabusComisionAcademica.findOne({
        where: { asignatura_id: asignatura_id },
        order: [['created_at', 'DESC']]
      });
    }

    // 3. Buscar en tabla general syllabi por asignatura_id + periodo
    if (!syllabus && periodoValues.length > 0) {
      syllabus = await Syllabus.findOne({
        where: {
          asignatura_id: asignatura_id,
          periodo: { [Op.in]: periodoValues }
        },
        order: [['createdAt', 'DESC']],
        paranoid: false
      });
    }

    // 4. Buscar en tabla general syllabi solo por asignatura_id
    if (!syllabus) {
      syllabus = await Syllabus.findOne({
        where: { asignatura_id: asignatura_id },
        order: [['createdAt', 'DESC']],
        paranoid: false
      });
    }

    if (!syllabus) {
      return res.status(404).json({ 
        success: false, 
        message: 'La comisión académica aún no ha subido un syllabus para tu asignatura. Contacta a la comisión académica.',
        debug: { asignatura_id, periodo, periodoValues }
      });
    }

    // Parse datos_syllabus si es string
    let datos = syllabus.datos_syllabus;
    if (typeof datos === 'string') {
      try { datos = JSON.parse(datos); } catch (e) { /* keep as is */ }
    }

    res.json({
      success: true,
      data: {
        id: syllabus.id,
        nombre: syllabus.nombre || syllabus.nombre_archivo || 'Syllabus',
        periodo: syllabus.periodo,
        asignatura_id: syllabus.asignatura_id,
        datos_syllabus: datos,
        source: syllabus.constructor.tableName || 'unknown'
      }
    });
  } catch (error) {
    console.error('Error getSyllabusComision:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// OBTENER PROGRAMA ANALÍTICO DE LA COMISION
// =========================================================================
exports.getProgramaComision = async (req, res) => {
  try {
    const { asignatura_id, periodo } = req.query;
    
    if (!asignatura_id) {
      return res.status(400).json({ success: false, message: 'asignatura_id es requerido' });
    }

    let programa = null;

    // Resolver periodo: obtener tanto el ID como el nombre para buscar
    let periodoValues = [];
    let periodoNombre = null;
    if (periodo) {
      periodoValues.push(String(periodo));
      try {
        const periodoRecord = await Periodo.findByPk(parseInt(periodo));
        if (periodoRecord && periodoRecord.nombre) {
          periodoNombre = periodoRecord.nombre;
          periodoValues.push(periodoRecord.nombre);
        }
      } catch (e) { /* ignore */ }
      // También buscar si enviaron el nombre en vez del ID
      if (periodoValues.length === 1) {
        try {
          const periodoByName = await Periodo.findOne({ where: { nombre: periodo } });
          if (periodoByName) {
            periodoNombre = periodo;
            periodoValues.push(String(periodoByName.id));
          }
        } catch (e) { /* ignore */ }
      }
    }

    // 1. Buscar en tabla programas_analiticos por asignatura_id + periodo (columna)
    if (periodoValues.length > 0) {
      programa = await ProgramasAnaliticos.findOne({
        where: {
          asignatura_id: asignatura_id,
          periodo: { [Op.in]: periodoValues }
        },
        order: [['createdAt', 'DESC']]
      });
    }

    // 2. Fallback: buscar por asignatura_id sin restringir periodo
    if (!programa) {
      programa = await ProgramasAnaliticos.findOne({
        where: { asignatura_id: asignatura_id },
        order: [['createdAt', 'DESC']]
      });
    }

    // 3. Fallback: buscar en JSON datos_tabla por nombre de asignatura + periodo_academico
    //    (cubre programas subidos por archivo que no tienen asignatura_id ni periodo en columnas)
    if (!programa) {
      try {
        const asignaturaRecord = await Asignatura.findByPk(asignatura_id, { attributes: ['id', 'nombre'] });
        if (asignaturaRecord && asignaturaRecord.nombre) {
          const nombreAsig = asignaturaRecord.nombre;
          const whereConditions = [
            dbSequelize.where(
              dbSequelize.cast(dbSequelize.json('datos_tabla.datos_generales.asignatura'), 'text'),
              { [Op.iLike]: `%${nombreAsig}%` }
            )
          ];
          if (periodoNombre) {
            whereConditions.push(
              dbSequelize.where(
                dbSequelize.cast(dbSequelize.json('datos_tabla.datos_generales.periodo_academico'), 'text'),
                { [Op.iLike]: `%${periodoNombre}%` }
              )
            );
          }
          programa = await ProgramasAnaliticos.findOne({
            where: { [Op.and]: whereConditions },
            order: [['createdAt', 'DESC']]
          });
        }
      } catch (e) { console.error('JSON fallback error:', e.message); }
    }

    if (!programa) {
      return res.status(404).json({ success: false, message: 'La comisión académica aún no ha subido un programa analítico para tu asignatura. Contacta a la comisión académica.' });
    }

    // El campo real en la tabla es datos_tabla (JSONB)
    let datos = programa.datos_tabla;
    if (typeof datos === 'string') {
      try { datos = JSON.parse(datos); } catch (e) { /* keep as is */ }
    }

    res.json({
      success: true,
      data: {
        id: programa.id,
        nombre: programa.nombre || 'Programa Analítico',
        periodo: programa.periodo,
        asignatura_id: programa.asignatura_id,
        datos_programa: datos,
        source: 'programas_analiticos'
      }
    });
  } catch (error) {
    console.error('Error getProgramaComision:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// GUARDAR SYLLABUS DEL DOCENTE
// =========================================================================
exports.guardarSyllabusDocente = async (req, res) => {
  try {
    const profesorId = req.user.id;
    const { asignatura_id, periodo, nombre, datos_syllabus, syllabus_comision_id } = req.body;

    if (!datos_syllabus) {
      return res.status(400).json({ success: false, message: 'datos_syllabus es requerido' });
    }

    // Buscar si ya existe uno para este profesor+asignatura+periodo
    let existing = await SyllabusDocente.findOne({
      where: {
        profesor_id: profesorId,
        asignatura_id: asignatura_id || null,
        periodo: periodo || null
      }
    });

    const datosStr = typeof datos_syllabus === 'string' ? datos_syllabus : JSON.stringify(datos_syllabus);

    if (existing) {
      existing.datos_syllabus = datosStr;
      existing.nombre = nombre || existing.nombre;
      existing.syllabus_comision_id = syllabus_comision_id || existing.syllabus_comision_id;
      await existing.save();
      
      res.json({ success: true, data: existing, isUpdate: true });
    } else {
      const nuevo = await SyllabusDocente.create({
        profesor_id: profesorId,
        syllabus_comision_id: syllabus_comision_id || null,
        asignatura_id: asignatura_id || null,
        periodo: periodo || null,
        nombre: nombre || 'Syllabus Docente',
        datos_syllabus: datosStr,
        estado: 'borrador'
      });

      res.status(201).json({ success: true, data: nuevo, isUpdate: false });
    }
  } catch (error) {
    console.error('Error guardarSyllabusDocente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// OBTENER SYLLABUS DEL DOCENTE (previamente guardado)
// =========================================================================
exports.getSyllabusDocente = async (req, res) => {
  try {
    const profesorId = req.user.id;
    const { asignatura_id, periodo } = req.query;

    const where = { profesor_id: profesorId };
    if (asignatura_id) where.asignatura_id = asignatura_id;
    if (periodo) where.periodo = { [Op.in]: [periodo, String(periodo)] };

    const syllabus = await SyllabusDocente.findOne({
      where,
      order: [['updated_at', 'DESC']]
    });

    if (!syllabus) {
      return res.status(404).json({ success: false, message: 'No se encontró syllabus del docente' });
    }

    let datos = syllabus.datos_syllabus;
    if (typeof datos === 'string') {
      try { datos = JSON.parse(datos); } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        ...syllabus.toJSON(),
        datos_syllabus: datos
      }
    });
  } catch (error) {
    console.error('Error getSyllabusDocente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// GUARDAR PROGRAMA ANALÍTICO DEL DOCENTE
// =========================================================================
exports.guardarProgramaDocente = async (req, res) => {
  try {
    const profesorId = req.user.id;
    const { asignatura_id, periodo, nombre, datos_programa, programa_comision_id } = req.body;

    if (!datos_programa) {
      return res.status(400).json({ success: false, message: 'datos_programa es requerido' });
    }

    let existing = await ProgramaAnaliticoDocente.findOne({
      where: {
        profesor_id: profesorId,
        asignatura_id: asignatura_id || null,
        periodo: periodo || null
      }
    });

    const datosStr = typeof datos_programa === 'string' ? datos_programa : JSON.stringify(datos_programa);

    if (existing) {
      existing.datos_programa = datosStr;
      existing.nombre = nombre || existing.nombre;
      existing.programa_comision_id = programa_comision_id || existing.programa_comision_id;
      await existing.save();
      
      res.json({ success: true, data: existing, isUpdate: true });
    } else {
      const nuevo = await ProgramaAnaliticoDocente.create({
        profesor_id: profesorId,
        programa_comision_id: programa_comision_id || null,
        asignatura_id: asignatura_id || null,
        periodo: periodo || null,
        nombre: nombre || 'Programa Analítico Docente',
        datos_programa: datosStr,
        estado: 'borrador'
      });

      res.status(201).json({ success: true, data: nuevo, isUpdate: false });
    }
  } catch (error) {
    console.error('Error guardarProgramaDocente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// OBTENER PROGRAMA ANALÍTICO DEL DOCENTE
// =========================================================================
exports.getProgramaDocente = async (req, res) => {
  try {
    const profesorId = req.user.id;
    const { asignatura_id, periodo } = req.query;

    const where = { profesor_id: profesorId };
    if (asignatura_id) where.asignatura_id = asignatura_id;
    if (periodo) where.periodo = { [Op.in]: [periodo, String(periodo)] };

    const programa = await ProgramaAnaliticoDocente.findOne({
      where,
      order: [['updated_at', 'DESC']]
    });

    if (!programa) {
      return res.status(404).json({ success: false, message: 'No se encontró programa del docente' });
    }

    let datos = programa.datos_programa;
    if (typeof datos === 'string') {
      try { datos = JSON.parse(datos); } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        ...programa.toJSON(),
        datos_programa: datos
      }
    });
  } catch (error) {
    console.error('Error getProgramaDocente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
