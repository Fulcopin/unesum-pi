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
// HABILITAR FIRMA QR PARA DOCUMENTOS DE DOCENTES
// POST /api/comision-academica/habilitar-firma
// Body: { syllabus_ids: [1,2,3], programa_ids: [4,5], estado: 'enviado' }
// =========================================================================
exports.habilitarFirma = async (req, res) => {
  try {
    const { syllabus_ids = [], programa_ids = [], estado = 'enviado' } = req.body;

    const estadosValidos = ['enviado', 'aprobado', 'borrador'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido. Use: enviado, aprobado, borrador' });
    }

    let syllabusActualizados = 0;
    let programasActualizados = 0;

    if (syllabus_ids.length > 0) {
      const ids = syllabus_ids.map(Number).filter(n => !isNaN(n));
      if (ids.length > 0) {
        const [count] = await db.SyllabusDocente.update(
          { estado },
          { where: { id: { [Op.in]: ids } } }
        );
        syllabusActualizados = count;
      }
    }

    if (programa_ids.length > 0) {
      const ids = programa_ids.map(Number).filter(n => !isNaN(n));
      if (ids.length > 0) {
        const [count] = await db.ProgramaAnaliticoDocente.update(
          { estado },
          { where: { id: { [Op.in]: ids } } }
        );
        programasActualizados = count;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Firma habilitada: ${syllabusActualizados} syllabus y ${programasActualizados} programas actualizados a estado "${estado}"`,
      data: { syllabusActualizados, programasActualizados, estado }
    });
  } catch (error) {
    console.error('❌ Error en habilitarFirma:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

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

    // Desvincular registros de docentes que referencien este syllabus (FK constraint)
    if (db.SyllabusDocente) {
      await db.SyllabusDocente.update(
        { syllabus_comision_id: null },
        { where: { syllabus_comision_id: id } }
      );
    }

    await syllabus.destroy();
    return res.status(200).json({ success: true, message: 'Syllabus eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar syllabus comisión:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar syllabus: ' + error.message, error: error.message });
  }
};

// =========================================================================
// � VER SYLLABUS DE UN DOCENTE (comisión puede leer, no editar)
// GET /api/comision-academica/syllabus-docente/:id
// =========================================================================
exports.verSyllabusDocente = async (req, res) => {
  try {
    const { id } = req.params;
    const sd = await db.SyllabusDocente.findByPk(id, {
      include: [
        { model: db.Profesor, as: 'profesor', attributes: ['id', 'nombres', 'apellidos', 'email'] }
      ]
    });

    if (!sd) {
      const syllabus = await db.Syllabus.findByPk(id, {
        attributes: ['id', 'periodo', 'datos_syllabus', 'profesor_id', 'asignatura_id', 'createdAt', 'updatedAt']
      });

      if (!syllabus) {
        return res.status(404).json({ success: false, message: 'Syllabus de docente no encontrado' });
      }

      const result = syllabus.toJSON();
      result.estado = result.estado || 'subido';
      result.created_at = result.created_at || result.createdAt;
      result.updated_at = result.updated_at || result.updatedAt;

      if (typeof result.datos_syllabus === 'string') {
        try {
          result.datos_syllabus = JSON.parse(result.datos_syllabus);
        } catch (error) {
          console.warn('No se pudo parsear datos_syllabus de syllabi:', error.message);
        }
      }

      if (syllabus.profesor_id) {
        const profesor = await db.Profesor.findByPk(syllabus.profesor_id, {
          attributes: ['id', 'nombres', 'apellidos', 'email']
        });
        result.profesor = profesor ? profesor.toJSON() : null;
      } else {
        result.profesor = null;
      }

      if (syllabus.asignatura_id) {
        const asig = await db.Asignatura.findByPk(syllabus.asignatura_id, {
          attributes: ['id', 'nombre', 'codigo']
        });
        result.asignatura = asig ? asig.toJSON() : null;
      } else {
        result.asignatura = null;
      }

      return res.status(200).json({ success: true, data: result });
    }

    const result = sd.toJSON();
    try { result.datos_syllabus = typeof result.datos_syllabus === 'string' ? JSON.parse(result.datos_syllabus) : result.datos_syllabus; } catch (e) { /* keep raw */ }

    // Enriquecer con info de asignatura si hay asignatura_id
    if (sd.asignatura_id) {
      try {
        const asig = await db.Asignatura.findByPk(sd.asignatura_id, { attributes: ['id', 'nombre', 'codigo'] });
        if (asig) result.asignatura = asig.toJSON();
      } catch (e) { /* ignore */ }
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error al ver syllabus docente:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el syllabus', error: error.message });
  }
};

// =========================================================================
// 📄 VER PROGRAMA ANALÍTICO DE UN DOCENTE (comisión puede leer, no editar)
// GET /api/comision-academica/programa-docente/:id
// =========================================================================
exports.verProgramaDocente = async (req, res) => {
  try {
    const { id } = req.params;
    const pd = await db.ProgramaAnaliticoDocente.findByPk(id, {
      include: [
        { model: db.Profesor, as: 'profesor', attributes: ['id', 'nombres', 'apellidos', 'email'] }
      ]
    });
    if (!pd) return res.status(404).json({ success: false, message: 'Programa de docente no encontrado' });

    const result = pd.toJSON();
    try { result.datos_programa = typeof result.datos_programa === 'string' ? JSON.parse(result.datos_programa) : result.datos_programa; } catch (e) { /* keep raw */ }

    if (pd.asignatura_id) {
      try {
        const asig = await db.Asignatura.findByPk(pd.asignatura_id, { attributes: ['id', 'nombre', 'codigo'] });
        if (asig) result.asignatura = asig.toJSON();
      } catch (e) { /* ignore */ }
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error al ver programa docente:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el programa analítico', error: error.message });
  }
};

// =========================================================================
// �👨‍🏫 SEGUIMIENTO DE DOCENTES POR ASIGNATURA
// GET /api/comision-academica/docentes-por-asignatura?periodo=X
// Devuelve, para cada asignatura de la carrera del usuario,
// la lista de profesores asignados y si ya entregaron syllabus / programa analítico
// =========================================================================
exports.obtenerDocentesPorAsignatura = async (req, res) => {
  try {
    const user = req.user;
    const periodoId = req.query.periodo || null;

    // ── 1. Resolver carrera_id ────────────────────────────────────────────
    // Priority: query param > user token > user.carrera name
    let resolvedCarreraId = req.query.carrera_id ? parseInt(req.query.carrera_id) : null;

    if (!resolvedCarreraId && user.carrera_id) {
      resolvedCarreraId = parseInt(user.carrera_id);
    }

    if (!resolvedCarreraId && user.carrera) {
      const carreraNombre = (user.carrera || '').trim();
      let carreraByName = await db.Carrera.findOne({
        where: { nombre: { [Op.iLike]: carreraNombre } }
      });
      if (!carreraByName) {
        carreraByName = await db.Carrera.findOne({
          where: { nombre: { [Op.iLike]: `%${carreraNombre}%` } }
        });
      }
      if (carreraByName) resolvedCarreraId = carreraByName.id;
    }

    if (!resolvedCarreraId) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar una carrera (parámetro carrera_id)'
      });
    }

    // ── 2. Obtener carrera y sus asignaturas ──────────────────────────────
    const carrera = await db.Carrera.findByPk(resolvedCarreraId, {
      include: [
        { model: db.Facultad, as: 'facultad', attributes: ['id', 'nombre'] },
        {
          model: db.Asignatura,
          as: 'asignaturas',
          required: false,
          include: [{ model: db.Nivel, as: 'nivel', attributes: ['id', 'nombre'] }]
        }
      ]
    });
    if (!carrera) {
      return res.status(404).json({ success: false, message: 'Carrera no encontrada' });
    }

    const asignaturas = carrera.asignaturas || [];
    const asignaturaIds = asignaturas.map(a => parseInt(a.id));

    if (asignaturaIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { facultad: carrera.facultad, carrera: { id: carrera.id, nombre: carrera.nombre }, asignaturas: [] }
      });
    }

    // ── 3. Resolver periodo (ID y nombre como texto) ──────────────────────
    let periodoValues = [];
    let periodoInfo = null;
    if (periodoId) {
      periodoValues.push(periodoId.toString());
      try {
        periodoInfo = await db.Periodo.findByPk(parseInt(periodoId));
        if (periodoInfo && periodoInfo.nombre) periodoValues.push(periodoInfo.nombre);
      } catch (e) { /* ignore */ }
    }
    const periodoWhere = periodoValues.length > 0 ? { [Op.in]: periodoValues } : undefined;

    // ── 4. Obtener profesores asignados a esas asignaturas ────────────────
    // 4a) Vía M2M: profesor_asignaturas
    const { Sequelize } = db;
    const profsM2M = await db.sequelize.query(
      `SELECT pa.asignatura_id, p.id as profesor_id, p.nombres, p.apellidos, p.email
       FROM profesor_asignaturas pa
       JOIN profesores p ON p.id = pa.profesor_id AND p."deletedAt" IS NULL
       WHERE pa.asignatura_id IN (:ids)`,

      {
        replacements: { ids: asignaturaIds },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // 4b) Vía columna directa: profesores.asignatura_id (un solo asignatura por profesor)
    const profsDirect = await db.sequelize.query(
      `SELECT p.asignatura_id, p.id as profesor_id, p.nombres, p.apellidos, p.email
       FROM profesores p
       WHERE p.asignatura_id IN (:ids) AND p."deletedAt" IS NULL`,
      {
        replacements: { ids: asignaturaIds },
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    // Combinar y deduplicar por (asignatura_id, profesor_id)
    const allProfs = [...profsM2M, ...profsDirect];
    const profsByAsig = {}; // { asignatura_id: { profesor_id: {...} } }
    for (const p of allProfs) {
      const aid = parseInt(p.asignatura_id);
      if (!profsByAsig[aid]) profsByAsig[aid] = {};
      profsByAsig[aid][p.profesor_id] = {
        profesor_id: p.profesor_id,
        nombres: p.nombres,
        apellidos: p.apellidos,
        email: p.email
      };
    }

    // Collect all unique profesor_ids
    const allProfIds = [...new Set(allProfs.map(p => p.profesor_id))];

    // ── 5. Obtener registros de syllabus_docente ──────────────────────────
    const sdWhere = { profesor_id: { [Op.in]: allProfIds.length > 0 ? allProfIds : [0] }, asignatura_id: { [Op.in]: asignaturaIds } };
    if (periodoWhere) sdWhere.periodo = periodoWhere;

    // Query syllabus_docente WITH asignatura_id match
    const syllabusDocentes = await db.SyllabusDocente.findAll({
      where: sdWhere,
      attributes: ['id', 'profesor_id', 'asignatura_id', 'periodo', 'estado'],
      raw: true
    });
    // Also fetch syllabus_docente records with asignatura_id=null (fallback)
    const sdNullAsigWhere = { profesor_id: { [Op.in]: allProfIds.length > 0 ? allProfIds : [0] }, asignatura_id: null };
    if (periodoWhere) sdNullAsigWhere.periodo = periodoWhere;
    const syllabusDocentesNullAsig = await db.SyllabusDocente.findAll({
      where: sdNullAsigWhere,
      attributes: ['id', 'profesor_id', 'asignatura_id', 'periodo', 'estado'],
      raw: true
    });

    // Map: { "asignatura_id:profesor_id" → { id, estado } }
    const sdMap = {};
    for (const sd of syllabusDocentes) {
      sdMap[`${parseInt(sd.asignatura_id)}:${sd.profesor_id}`] = { id: sd.id, estado: sd.estado };
    }
    // Null-asignatura fallback: credit to every asignatura this professor is assigned to
    for (const sd of syllabusDocentesNullAsig) {
      const profId = sd.profesor_id;
      for (const [asigId, profs] of Object.entries(profsByAsig)) {
        if (profs[profId]) {
          const key = `${asigId}:${profId}`;
          if (!sdMap[key]) sdMap[key] = { id: sd.id, estado: sd.estado };
        }
      }
    }

    // Also check syllabi table for Word document uploads saved by professors
    if (allProfIds.length > 0) {
      const syllabisUploads = await db.sequelize.query(
        `SELECT id, profesor_id, asignatura_id, periodo FROM syllabi WHERE profesor_id IN (:profIds) AND "deletedAt" IS NULL`,
        { replacements: { profIds: allProfIds }, type: db.sequelize.QueryTypes.SELECT }
      );
      for (const s of syllabisUploads) {
        if (periodoValues.length > 0 && !periodoValues.some(pv => s.periodo && s.periodo.toString() === pv.toString())) continue;
        const profId = s.profesor_id;
        const aid = s.asignatura_id ? parseInt(s.asignatura_id) : null;
        if (aid && asignaturaIds.includes(aid)) {
          const key = `${aid}:${profId}`;
          if (!sdMap[key]) sdMap[key] = { id: s.id, estado: 'subido' };
        } else if (!aid) {
          // Template with no asignatura — credit to every asignatura this professor is assigned to
          for (const [asigId, profs] of Object.entries(profsByAsig)) {
            if (profs[profId]) {
              const key = `${asigId}:${profId}`;
              if (!sdMap[key]) sdMap[key] = { id: s.id, estado: 'subido' };
            }
          }
        }
      }
    }

    // ── 6. Obtener registros de programa_analitico_docente ────────────────
    const padWhere = { profesor_id: { [Op.in]: allProfIds.length > 0 ? allProfIds : [0] }, asignatura_id: { [Op.in]: asignaturaIds } };
    if (periodoWhere) padWhere.periodo = periodoWhere;

    const programaDocentes = await db.ProgramaAnaliticoDocente.findAll({
      where: padWhere,
      attributes: ['id', 'profesor_id', 'asignatura_id', 'periodo', 'estado'],
      raw: true
    });
    // Also fetch records with null asignatura_id
    const padNullWhere = { profesor_id: { [Op.in]: allProfIds.length > 0 ? allProfIds : [0] }, asignatura_id: null };
    if (periodoWhere) padNullWhere.periodo = periodoWhere;
    const programaDocentesNullAsig = await db.ProgramaAnaliticoDocente.findAll({
      where: padNullWhere,
      attributes: ['id', 'profesor_id', 'asignatura_id', 'periodo', 'estado'],
      raw: true
    });

    const padMap = {};
    for (const pd of programaDocentes) {
      padMap[`${parseInt(pd.asignatura_id)}:${pd.profesor_id}`] = { id: pd.id, estado: pd.estado };
    }
    // Null-asignatura fallback
    for (const pd of programaDocentesNullAsig) {
      const profId = pd.profesor_id;
      for (const [asigId, profs] of Object.entries(profsByAsig)) {
        if (profs[profId]) {
          const key = `${asigId}:${profId}`;
          if (!padMap[key]) padMap[key] = { id: pd.id, estado: pd.estado };
        }
      }
    }

    // Also check programas_analiticos filled by profesor role via programa_analitico_docente
    // (programa_analitico_docente already queried above in step 6 — no extra query needed)

    // ── 7. Construir respuesta ────────────────────────────────────────────
    const asignaturasConDocentes = asignaturas.map(asig => {
      const aid = parseInt(asig.id);
      const docentesMap = profsByAsig[aid] || {};
      const docentes = Object.values(docentesMap).map(prof => {
        const sdEntry = sdMap[`${aid}:${prof.profesor_id}`];
        const padEntry = padMap[`${aid}:${prof.profesor_id}`];
        return {
          ...prof,
          tiene_syllabus: !!sdEntry,
          syllabus_id: sdEntry ? sdEntry.id : null,
          estado_syllabus: sdEntry ? sdEntry.estado : null,
          tiene_programa: !!padEntry,
          programa_id: padEntry ? padEntry.id : null,
          estado_programa: padEntry ? padEntry.estado : null
        };
      });

      return {
        id: asig.id,
        nombre: asig.nombre,
        codigo: asig.codigo,
        nivel: asig.nivel ? asig.nivel.nombre : 'Sin nivel',
        docentes,
        stats: {
          total_docentes: docentes.length,
          con_syllabus: docentes.filter(d => d.tiene_syllabus).length,
          con_programa: docentes.filter(d => d.tiene_programa).length
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        facultad: { id: carrera.facultad.id, nombre: carrera.facultad.nombre },
        carrera: { id: carrera.id, nombre: carrera.nombre },
        periodo: periodoInfo ? { id: periodoInfo.id, nombre: periodoInfo.nombre } : { id: periodoId, nombre: periodoId },
        asignaturas: asignaturasConDocentes
      }
    });
  } catch (error) {
    console.error('❌ Error en obtenerDocentesPorAsignatura:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener docentes por asignatura',
      error: error.message
    });
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
      order: [['createdAt', 'DESC']]
    });

    // Parsear datos_syllabus para cada registro
    const listaConDatos = lista.map(s => {
      const item = s.toJSON();
      if (typeof item.datos_syllabus === 'string') {
        try { item.datos_syllabus = JSON.parse(item.datos_syllabus); } catch(e) {}
      }
      return item;
    });

    return res.status(200).json({ success: true, data: listaConDatos });
  } catch (error) {
    console.error('❌ Error al listar syllabus comisión:', error);
    return res.status(500).json({ success: false, message: 'Error al listar', error: error.message });
  }
};