// comisionAcademicaController.js
// Controlador para la Comisión Académica

const db = require('../models');
const { Op } = require('sequelize');

// Helper: verificar documentos existentes para un listado de asignaturas en un periodo
async function verificarDocumentosPorPeriodo(asignaturas, periodoId) {
  if (!periodoId || !asignaturas.length) return asignaturas;
  
  const asignaturaIds = asignaturas.map(a => a.id);
  
  // Resolver nombre del periodo para buscar por AMBOS formatos (ID y nombre)
  // Algunos registros guardaron el nombre, otros el ID
  const periodoStr = periodoId.toString();
  let periodoValues = [periodoStr];
  try {
    const periodoRecord = await db.Periodo.findByPk(parseInt(periodoStr));
    if (periodoRecord && periodoRecord.nombre) {
      periodoValues.push(periodoRecord.nombre);
    }
  } catch(e) { /* si falla, solo busca por ID */ }
  
  console.log('🔍 verificarDocumentosPorPeriodo:', {
    periodoId,
    periodoValues,
    totalAsignaturas: asignaturaIds.length,
    primerosIds: asignaturaIds.slice(0, 5)
  });
  
  const periodoWhere = { [Op.in]: periodoValues };
  
  // Buscar syllabi en tabla general (Syllabus) — paranoid:true filtra deletedAt
  const syllabiExistentes = await db.Syllabus.findAll({
    where: {
      asignatura_id: { [Op.in]: asignaturaIds },
      periodo: periodoWhere
    },
    attributes: ['id', 'asignatura_id'],
    raw: true
  });
  
  // Buscar syllabi en tabla de comisión académica
  const syllabiComision = await db.SyllabusComisionAcademica.findAll({
    where: {
      asignatura_id: { [Op.in]: asignaturaIds },
      periodo: periodoWhere
    },
    attributes: ['id', 'asignatura_id'],
    raw: true
  });
  
  // Buscar programas analíticos — varias estrategias en orden de prioridad

  // 1) POR NOMBRE en columna 'nombre' (funciona para programas subidos por archivo)
  //    La columna nombre = nombre de la asignatura guardado al subir el archivo
  const nombresAsignaturas = asignaturas.map(a => a.nombre).filter(Boolean);
  let programasPorNombre = [];
  if (nombresAsignaturas.length > 0) {
    // Buscar todos los programas sin asignatura_id y comparar nombre en JS (case insensitive)
    const sinId = await db.ProgramasAnaliticos.findAll({
      where: { asignatura_id: null },
      attributes: ['id', 'nombre', 'datos_tabla'],
      raw: true
    });
    for (const prog of sinId) {
      // Comparar contra columna 'nombre'
      const progNombre = (prog.nombre || '').toLowerCase().trim();
      let matchedAsig = asignaturas.find(a =>
        a.nombre && progNombre && (
          progNombre.includes(a.nombre.toLowerCase().trim()) ||
          a.nombre.toLowerCase().trim().includes(progNombre)
        )
      );
      // Si no coincide por 'nombre', intentar por datos_tabla.datos_generales.asignatura
      if (!matchedAsig && prog.datos_tabla) {
        try {
          const datos = typeof prog.datos_tabla === 'string' ? JSON.parse(prog.datos_tabla) : prog.datos_tabla;
          const jsonAsig = (datos?.datos_generales?.asignatura || '').toLowerCase().trim();
          if (jsonAsig) {
            matchedAsig = asignaturas.find(a =>
              a.nombre && jsonAsig && (
                jsonAsig.includes(a.nombre.toLowerCase().trim()) ||
                a.nombre.toLowerCase().trim().includes(jsonAsig)
              )
            );
          }
        } catch (e) { /* ignore */ }
      }
      if (matchedAsig) {
        programasPorNombre.push({ id: prog.id, asignatura_id: matchedAsig.id });
      }
    }
  }

  // 2) Por asignatura_id (sin filtrar periodo) — cubre cualquier discrepancia de formato de periodo
  const programasPorAsignatura = await db.ProgramasAnaliticos.findAll({
    where: {
      asignatura_id: { [Op.in]: asignaturaIds }
    },
    attributes: ['id', 'asignatura_id', 'periodo'],
    raw: true
  });

  // 3) Por asignatura_id + periodo exacto (más específico, sobreescribe el anterior)
  const programasExistentes = await db.ProgramasAnaliticos.findAll({
    where: {
      asignatura_id: { [Op.in]: asignaturaIds },
      periodo: periodoWhere
    },
    attributes: ['id', 'asignatura_id'],
    raw: true
  });

  console.log('📊 Resultados verificación:', {
    syllabiGeneral: syllabiExistentes.length,
    syllabiComision: syllabiComision.length,
    programasPorNombre: programasPorNombre.length,
    programasPorAsignatura: programasPorAsignatura.length,
    programasExactos: programasExistentes.length
  });
  
  // Crear mapas de lookup — comisión tiene prioridad sobre la tabla general
  const syllabiMap = {};
  const syllabiSourceMap = {};
  syllabiExistentes.forEach(s => { syllabiMap[s.asignatura_id] = s.id; syllabiSourceMap[s.asignatura_id] = 'general'; });
  syllabiComision.forEach(s => { syllabiMap[s.asignatura_id] = s.id; syllabiSourceMap[s.asignatura_id] = 'comision'; }); // sobrescribe si hay en ambas
  
  const programasMap = {};
  // Por nombre tiene menor prioridad
  programasPorNombre.forEach(p => { programasMap[p.asignatura_id] = p.id; });
  // Por asignatura_id (sin periodo) tiene prioridad media
  programasPorAsignatura.forEach(p => { programasMap[p.asignatura_id] = p.id; });
  // Con asignatura_id + periodo exacto tiene mayor prioridad
  programasExistentes.forEach(p => { programasMap[p.asignatura_id] = p.id; });
  
  // Enriquecer asignaturas con estado real
  return asignaturas.map(asig => ({
    ...asig,
    tiene_syllabus: !!syllabiMap[asig.id],
    syllabus_id: syllabiMap[asig.id] || null,
    syllabus_source: syllabiSourceMap[asig.id] || null,
    tiene_programa: !!programasMap[asig.id],
    programa_id: programasMap[asig.id] || null
  }));
}

// 🏫 OBTENER ESTRUCTURA COMPLETA DE LA FACULTAD O CARRERA ESPECÍFICA
exports.obtenerEstructuraFacultad = async (req, res) => {
  try {
    const user = req.user;
    const periodoId = req.query.periodo || null; // Periodo para verificar documentos
    
    console.log('👤 Usuario:', {
      id: user.id,
      nombre: user.nombres,
      rol: user.rol,
      facultad: user.facultad,
      carrera: user.carrera,
      carrera_id: user.carrera_id
    });
    
    // CASO 1b: Si no tiene carrera_id pero sí tiene carrera (texto), buscar por nombre
    if (!user.carrera_id && user.carrera) {
      const carreraNombre = (user.carrera || '').trim();
      console.log(`🔍 CASO 1b: Buscando carrera por nombre: "${carreraNombre}"`);
      const { Op } = require('sequelize');
      // 1) Buscar coincidencia exacta insensible a mayúsculas
      let carreraByName = await db.Carrera.findOne({
        where: { nombre: { [Op.iLike]: carreraNombre } }
      });
      // 2) Si no encuentra, buscar por LIKE parcial (contiene el texto)
      if (!carreraByName) {
        carreraByName = await db.Carrera.findOne({
          where: { nombre: { [Op.iLike]: `%${carreraNombre}%` } }
        });
      }
      if (carreraByName) {
        user.carrera_id = carreraByName.id;
        console.log(`✅ Carrera encontrada por nombre: "${carreraByName.nombre}", id: ${user.carrera_id}`);
      } else {
        // Mostrar todas las carreras disponibles para diagnóstico
        const todasCarreras = await db.Carrera.findAll({ attributes: ['id', 'nombre'] });
        console.log(`⚠️ No se encontró carrera con nombre "${carreraNombre}". Disponibles:`, todasCarreras.map(c => c.nombre));
      }
    }

    // CASO 1: Si el usuario tiene carrera_id asignada, mostrar SOLO esa carrera
    if (user.carrera_id) {
      console.log(`🎓 ✅ CASO 1: Usuario tiene carrera_id asignada: ${user.carrera_id}`);
      
      const carrera = await db.Carrera.findByPk(user.carrera_id, {
        include: [
          {
            model: db.Facultad,
            as: 'facultad',
            attributes: ['id', 'nombre']
          },
          {
            model: db.Malla,
            as: 'mallas',
            required: false
          },
          {
            model: db.Asignatura,
            as: 'asignaturas',
            required: false,
            include: [
              {
                model: db.Nivel,
                as: 'nivel',
                attributes: ['id', 'nombre']
              }
            ]
          }
        ]
      });
      
      if (!carrera) {
        return res.status(404).json({
          success: false,
          message: 'Carrera no encontrada'
        });
      }
      
      const asignaturasBase = (carrera.asignaturas || []).map(asig => ({
        id: asig.id,
        nombre: asig.nombre,
        codigo: asig.codigo,
        nivel: asig.nivel ? asig.nivel.nombre : 'Sin nivel',
        estado: asig.estado,
        tiene_syllabus: false,
        syllabus_id: null,
        tiene_programa: false,
        programa_id: null
      }));
      
      // Verificar documentos reales si hay periodo
      const asignaturasConEstado = await verificarDocumentosPorPeriodo(asignaturasBase, periodoId);
      
      const estructura = {
        facultad: {
          id: carrera.facultad.id,
          nombre: carrera.facultad.nombre
        },
        carreras: [{
          id: carrera.id,
          nombre: carrera.nombre,
          mallas: carrera.mallas || [],
          asignaturas: asignaturasConEstado
        }]
      };
      
      console.log('📦 RESPUESTA (CASO 1 - Una sola carrera):', {
        facultad: estructura.facultad.nombre,
        total_carreras: estructura.carreras.length,
        carrera: estructura.carreras[0].nombre,
        total_asignaturas: estructura.carreras[0].asignaturas.length,
        conSyllabus: asignaturasConEstado.filter(a => a.tiene_syllabus).length,
        conPrograma: asignaturasConEstado.filter(a => a.tiene_programa).length
      });
      
      return res.status(200).json({
        success: true,
        data: estructura
      });
    }
    
    // CASO 2: Si no tiene carrera_id pero tiene facultad, mostrar todas las carreras
    if (!user.facultad) {
      return res.status(400).json({
        success: false,
        message: 'El usuario no tiene una facultad ni carrera asignada'
      });
    }
    
    console.log(`🏫 ⚠️ CASO 2: Usuario NO tiene carrera_id, usando facultad: ${user.facultad}`);
    
    // Buscar la facultad
    const facultad = await db.Facultad.findOne({
      where: { nombre: user.facultad }
    });
    
    if (!facultad) {
      return res.status(404).json({
        success: false,
        message: 'Facultad no encontrada'
      });
    }
    
    // Obtener todas las carreras de la facultad
    const carreras = await db.Carrera.findAll({
      where: { facultad_id: facultad.id },
      order: [['nombre', 'ASC']],
      include: [
        {
          model: db.Malla,
          as: 'mallas',
          required: false
        },
        {
          model: db.Asignatura,
          as: 'asignaturas',
          required: false,
          include: [
            {
              model: db.Nivel,
              as: 'nivel',
              attributes: ['id', 'nombre']
            }
          ]
        }
      ]
    });
    
    // Construir la estructura jerárquica con verificación real de documentos
    const carrerasConEstado = await Promise.all(carreras.map(async (carrera) => {
      const asignaturasBase = (carrera.asignaturas || []).map(asig => ({
        id: asig.id,
        nombre: asig.nombre,
        codigo: asig.codigo,
        nivel: asig.nivel ? asig.nivel.nombre : 'Sin nivel',
        estado: asig.estado,
        tiene_syllabus: false,
        syllabus_id: null,
        tiene_programa: false,
        programa_id: null
      }));
      
      const asignaturasConEstado = await verificarDocumentosPorPeriodo(asignaturasBase, periodoId);
      
      return {
        id: carrera.id,
        nombre: carrera.nombre,
        mallas: carrera.mallas || [],
        asignaturas: asignaturasConEstado
      };
    }));
    
    const estructura = {
      facultad: {
        id: facultad.id,
        nombre: facultad.nombre
      },
      carreras: carrerasConEstado
    };
    
    console.log('📦 RESPUESTA (CASO 2 - Todas las carreras):', {
      facultad: estructura.facultad.nombre,
      total_carreras: estructura.carreras.length,
      carreras: estructura.carreras.map(c => c.nombre)
    });
    
    return res.status(200).json({
      success: true,
      data: estructura
    });
    
  } catch (error) {
    console.error('❌ Error al obtener estructura de facultad:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la estructura de la facultad',
      error: error.message
    });
  }
};

// 📚 OBTENER ASIGNATURAS DE UNA CARRERA ESPECÍFICA
exports.obtenerAsignaturasCarrera = async (req, res) => {
  try {
    const { carrera_id } = req.params;
    const user = req.user;
    
    // Verificar que la carrera pertenezca a la facultad del usuario
    const carrera = await db.Carrera.findByPk(carrera_id, {
      include: [
        {
          model: db.Facultad,
          as: 'facultad',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    if (!carrera) {
      return res.status(404).json({
        success: false,
        message: 'Carrera no encontrada'
      });
    }
    
    // Si es comision_academica, validar que sea de su facultad o carrera
    if (user.rol === 'comision_academica' || user.rol === 'comision') {
      // Si tiene carrera_id, validar que sea su carrera
      if (user.carrera_id && carrera.id !== user.carrera_id) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a esta carrera'
        });
      }
      
      // Si no tiene carrera_id pero tiene facultad, validar facultad
      if (!user.carrera_id && carrera.facultad.nombre !== user.facultad) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a esta carrera'
        });
      }
    }
    
    // Obtener asignaturas
    const asignaturas = await db.Asignatura.findAll({
      where: { carrera_id: carrera_id },
      order: [['nombre', 'ASC']],
      include: [
        {
          model: db.Nivel,
          as: 'nivel',
          attributes: ['id', 'nombre']
        },
        {
          model: db.Organizacion,
          as: 'organizacion',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    // Mapear asignaturas
    const asignaturasConInfo = asignaturas.map(asig => ({
      id: asig.id,
      nombre: asig.nombre,
      codigo: asig.codigo,
      estado: asig.estado,
      nivel: asig.nivel ? asig.nivel.nombre : null,
      organizacion: asig.organizacion ? asig.organizacion.nombre : null,
      tiene_syllabus: false,
      syllabus_id: null,
      tiene_programa: false,
      programa_id: null
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        carrera: {
          id: carrera.id,
          nombre: carrera.nombre,
          facultad: carrera.facultad.nombre
        },
        asignaturas: asignaturasConInfo
      }
    });
    
  } catch (error) {
    console.error('❌ Error al obtener asignaturas de carrera:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las asignaturas',
      error: error.message
    });
  }
};

module.exports = exports;

// =========================================================================
// CRUD SYLLABUS COMISIÓN ACADÉMICA
// =========================================================================

// 📝 CREAR SYLLABUS COMISIÓN
exports.crearSyllabusComision = async (req, res) => {
  try {
    const { nombre, periodo, materias, datos_syllabus, asignatura_id } = req.body;
    const usuario_id = req.user?.id || null;

    if (!periodo) {
      return res.status(400).json({ success: false, message: 'El periodo es obligatorio' });
    }
    if (!asignatura_id) {
      return res.status(400).json({ success: false, message: 'La asignatura_id es obligatoria' });
    }

    // Verificar duplicado: mismo asignatura_id + periodo (buscar por ID o nombre)
    let periodoValues = [periodo.toString()];
    try {
      const periodoRecord = await db.Periodo.findByPk(parseInt(periodo.toString()));
      if (periodoRecord && periodoRecord.nombre) periodoValues.push(periodoRecord.nombre);
    } catch(e) {}
    
    const existente = await db.SyllabusComisionAcademica.findOne({
      where: { asignatura_id, periodo: { [Op.in]: periodoValues } }
    });
    if (existente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un syllabus para esta asignatura en este periodo',
        data: existente
      });
    }

    const nuevo = await db.SyllabusComisionAcademica.create({
      nombre: nombre || 'Syllabus',
      periodo: periodo.toString(),
      materias,
      datos_syllabus: typeof datos_syllabus === 'string' ? datos_syllabus : JSON.stringify(datos_syllabus),
      asignatura_id,
      usuario_id,
      estado: 'activo'
    });

    // Devolver con datos_syllabus parseado
    const result = nuevo.toJSON();
    try { result.datos_syllabus = JSON.parse(result.datos_syllabus); } catch(e) {}

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error al crear syllabus comisión:', error);
    return res.status(500).json({ success: false, message: 'Error al crear syllabus', error: error.message });
  }
};

// 📖 OBTENER SYLLABUS COMISIÓN POR ID
exports.obtenerSyllabusComision = async (req, res) => {
  try {
    const { id } = req.params;
    const syllabus = await db.SyllabusComisionAcademica.findByPk(id);
    if (!syllabus) {
      return res.status(404).json({ success: false, message: 'Syllabus no encontrado' });
    }
    const result = syllabus.toJSON();
    try { result.datos_syllabus = JSON.parse(result.datos_syllabus); } catch(e) {}
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error al obtener syllabus comisión:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener syllabus', error: error.message });
  }
};

// 📖 OBTENER SYLLABUS COMISIÓN POR ASIGNATURA + PERIODO
exports.obtenerSyllabusPorAsignaturaPeriodo = async (req, res) => {
  try {
    const { asignatura_id, periodo } = req.query;
    if (!asignatura_id || !periodo) {
      return res.status(400).json({ success: false, message: 'asignatura_id y periodo son obligatorios' });
    }
    
    // Buscar por periodo ID o nombre (registros viejos guardaron nombre, nuevos guardan ID)
    const periodoStr = periodo.toString();
    let periodoValues = [periodoStr];
    try {
      const periodoRecord = await db.Periodo.findByPk(parseInt(periodoStr));
      if (periodoRecord && periodoRecord.nombre) periodoValues.push(periodoRecord.nombre);
    } catch(e) {}
    
    const syllabus = await db.SyllabusComisionAcademica.findOne({
      where: { asignatura_id, periodo: { [Op.in]: periodoValues } }
    });
    if (!syllabus) {
      return res.status(404).json({ success: false, message: 'Syllabus no encontrado para esa asignatura/periodo' });
    }
    const result = syllabus.toJSON();
    try { result.datos_syllabus = JSON.parse(result.datos_syllabus); } catch(e) {}
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error al buscar syllabus comisión:', error);
    return res.status(500).json({ success: false, message: 'Error al buscar syllabus', error: error.message });
  }
};

// ✏️ ACTUALIZAR SYLLABUS COMISIÓN
exports.actualizarSyllabusComision = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, periodo, materias, datos_syllabus } = req.body;

    const syllabus = await db.SyllabusComisionAcademica.findByPk(id);
    if (!syllabus) {
      return res.status(404).json({ success: false, message: 'Syllabus no encontrado' });
    }

    await syllabus.update({
      nombre: nombre || syllabus.nombre,
      periodo: periodo ? periodo.toString() : syllabus.periodo,
      materias: materias || syllabus.materias,
      datos_syllabus: datos_syllabus 
        ? (typeof datos_syllabus === 'string' ? datos_syllabus : JSON.stringify(datos_syllabus))
        : syllabus.datos_syllabus,
      usuario_id: req.user?.id || syllabus.usuario_id
    });

    const result = syllabus.toJSON();
    try { result.datos_syllabus = JSON.parse(result.datos_syllabus); } catch(e) {}
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error al actualizar syllabus comisión:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar syllabus', error: error.message });
  }
};

// 🗑️ ELIMINAR SYLLABUS COMISIÓN
exports.eliminarSyllabusComision = async (req, res) => {
  try {
    const { id } = req.params;
    const syllabus = await db.SyllabusComisionAcademica.findByPk(id);
    if (!syllabus) {
      return res.status(404).json({ success: false, message: 'Syllabus no encontrado' });
    }
    await syllabus.destroy();
    return res.status(200).json({ success: true, message: 'Syllabus eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar syllabus comisión:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar syllabus', error: error.message });
  }
};

// 📋 LISTAR TODOS LOS SYLLABUS COMISIÓN (con filtro periodo opcional)
exports.listarSyllabusComision = async (req, res) => {
  try {
    const { periodo } = req.query;
    const where = {};
    if (periodo) where.periodo = periodo.toString();

    const lista = await db.SyllabusComisionAcademica.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'nombre', 'materias', 'periodo', 'asignatura_id', 'usuario_id', 'estado', 'createdAt', 'updatedAt']
    });

    return res.status(200).json({ success: true, data: lista });
  } catch (error) {
    console.error('❌ Error al listar syllabus comisión:', error);
    return res.status(500).json({ success: false, message: 'Error al listar', error: error.message });
  }
};