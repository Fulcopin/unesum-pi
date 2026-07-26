// docenteEditorController.js
// Controlador para endpoints del editor docente (syllabus y programa analítico)

const { SyllabusDocente, ProgramaAnaliticoDocente, SyllabusComisionAcademica, ProgramasAnaliticos, Profesor, Asignatura, Nivel, Paralelo, Carrera, Syllabus, Facultad, Periodo, sequelize: dbSequelize } = require('../models');
const { Op } = require('sequelize');

const getCellPositionKey = (tabIndex, rowIndex, cellIndex) => `${tabIndex}:${rowIndex}:${cellIndex}`;

// Traduce una celda de la fuente de bloqueos (plantilla admin o syllabus de
// comisión) a un estado de 3 valores:
//   true      = bloqueada  (admin isLocked:true  o  comisión docenteEditable:false)
//   false     = desbloqueada EXPLÍCITAMENTE por la comisión (docenteEditable:true) → gana sobre el admin
//   undefined = la fuente no opina → se conserva lo que traiga la celda del docente
const cellLockDecision = (cell) => {
  if (cell?.docenteEditable === true) return false;   // comisión desbloqueó (rojo → verde)
  if (cell?.docenteEditable === false) return true;   // comisión bloqueó (rojo)
  if (cell?.isLocked === true) return true;            // admin bloqueó (amarillo)
  return undefined;                                     // sin opinión
};

// Etiqueta normalizada de una fila = texto de su primera celda. Es la forma
// estable de reconocer una fila: el índice se desfasa en cuanto la plantilla
// tiene una fila de más o de menos que el documento del docente.
const normEtiquetaFila = (row) =>
  ((row && row.cells && row.cells[0] && row.cells[0].content) || '')
    .toString()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/:+$/, '')
    .trim();

const getCellLabelKey = (etiqueta, cellIndex) => `${etiqueta}::${cellIndex}`;

const buildComisionLockState = (datos) => {
  const lockById = {};
  const lockByLabel = {};
  const lockByPosition = {};
  const tabs = Array.isArray(datos?.tabs)
    ? datos.tabs
    : Array.isArray(datos?.rows)
      ? [{ rows: datos.rows }]
      : [];

  tabs.forEach((tab, tabIndex) => {
    (tab.rows || []).forEach((row, rowIndex) => {
      const etiqueta = normEtiquetaFila(row);
      (row.cells || []).forEach((cell, cellIndex) => {
        const decision = cellLockDecision(cell);
        // Solo registramos las celdas donde la fuente SÍ opina (bloquear o desbloquear).
        if (decision === undefined) return;
        if (cell?.id) lockById[cell.id] = decision;
        if (etiqueta) {
          const clave = getCellLabelKey(etiqueta, cellIndex);
          // La primera fila con esa etiqueta manda: si hay repetidas, no adivinamos
          if (!Object.prototype.hasOwnProperty.call(lockByLabel, clave)) {
            lockByLabel[clave] = decision;
          }
        }
        lockByPosition[getCellPositionKey(tabIndex, rowIndex, cellIndex)] = decision;
      });
    });
  });

  return { lockById, lockByLabel, lockByPosition };
};

/**
 * Aplica los bloqueos al documento.
 *
 * `confiarEnDocenteEditableDeLaCelda`: si la bandera `docenteEditable` que trae
 * la celda es una decisión REAL de la comisión y por tanto gana sobre el
 * bloqueo del admin.
 *
 *   false → `datos` es la copia del DOCENTE recién leída de su tabla. Ahí esa
 *           bandera es basura: quedó guardada en `true` en todas las celdas y el
 *           docente se auto-desbloqueaba al guardar. Se ignora y, además, se
 *           limpia, para que no confunda a una pasada posterior.
 *   true  → `datos` ya viene normalizado: o es el propio syllabus de la comisión,
 *           o es la copia del docente después de aplicarle los bloqueos de la
 *           comisión. En los dos casos `docenteEditable: true` significa
 *           "la comisión liberó esta celda" y debe sobrevivir al bloqueo del admin.
 */
const applyComisionLocksToDocente = (datos, lockState, confiarEnDocenteEditableDeLaCelda = false) => {
  // Devuelve la decisión de la fuente de bloqueos para esta celda: true/false/undefined.
  // Orden de preferencia, de más fiable a menos:
  //   1) id de celda      → identidad exacta
  //   2) etiqueta de fila → estable aunque la plantilla tenga filas de más/menos
  //   3) posición         → último recurso; se desfasa si las estructuras difieren
  const resolveDecision = (cell, tabIndex, rowIndex, cellIndex, etiqueta) => {
    if (cell?.id && Object.prototype.hasOwnProperty.call(lockState.lockById, cell.id)) {
      return lockState.lockById[cell.id];
    }
    if (etiqueta && lockState.lockByLabel) {
      const labelKey = getCellLabelKey(etiqueta, cellIndex);
      if (Object.prototype.hasOwnProperty.call(lockState.lockByLabel, labelKey)) {
        return lockState.lockByLabel[labelKey];
      }
    }
    const positionKey = getCellPositionKey(tabIndex, rowIndex, cellIndex);
    if (Object.prototype.hasOwnProperty.call(lockState.lockByPosition, positionKey)) {
      return lockState.lockByPosition[positionKey];
    }
    return undefined;
  };

  const mapCell = (cell, tabIndex, rowIndex, cellIndex, etiqueta) => {
    const decision = resolveDecision(cell, tabIndex, rowIndex, cellIndex, etiqueta);
    // El desbloqueo explícito de la comisión gana SIEMPRE sobre el bloqueo del
    // admin. Es la única forma de soltar una celda que el admin bloqueó.
    const liberadaEnLaPropiaCelda = confiarEnDocenteEditableDeLaCelda && cell?.docenteEditable === true;
    if (liberadaEnLaPropiaCelda || decision === false) {
      return { ...cell, isLocked: false, docenteEditable: true };
    }
    // Bloqueo (admin o comisión): la celda queda no editable para el docente.
    if (decision === true) {
      return { ...cell, isLocked: true, docenteEditable: false };
    }
    // La fuente no opina.
    if (confiarEnDocenteEditableDeLaCelda) {
      // El documento ya está normalizado: su propio isLocked es la verdad.
      return { ...cell, isLocked: !!cell.isLocked };
    }
    // Copia cruda del docente: su `isLocked` es un residuo de cuando SÍ estaba
    // bloqueada. Si la comisión quitó el bloqueo, la fuente deja de opinar y
    // conservarlo dejaba la celda bloqueada para siempre. Se limpian las dos
    // banderas para que ninguna pasada posterior las confunda con una decisión.
    const { docenteEditable, ...resto } = cell;
    return { ...resto, isLocked: false };
  };

  if (Array.isArray(datos?.tabs)) {
    return {
      ...datos,
      tabs: datos.tabs.map((tab, tabIndex) => ({
        ...tab,
        rows: (tab.rows || []).map((row, rowIndex) => {
          const etiqueta = normEtiquetaFila(row);
          return {
            ...row,
            cells: (row.cells || []).map((cell, cellIndex) =>
              mapCell(cell, tabIndex, rowIndex, cellIndex, etiqueta))
          };
        })
      }))
    };
  }

  if (Array.isArray(datos?.rows)) {
    return {
      ...datos,
      rows: (datos.rows || []).map((row, rowIndex) => {
        const etiqueta = normEtiquetaFila(row);
        return {
          ...row,
          cells: (row.cells || []).map((cell, cellIndex) =>
            mapCell(cell, 0, rowIndex, cellIndex, etiqueta))
        };
      })
    };
  }

  return datos;
};

const resolvePeriodoValues = async (periodo) => {
  const values = [];
  if (!periodo) return values;

  values.push(String(periodo));
  try {
    const periodoRecord = await Periodo.findByPk(parseInt(periodo, 10));
    if (periodoRecord?.nombre) values.push(periodoRecord.nombre);
  } catch (e) {}

  if (values.length === 1) {
    try {
      const periodoByName = await Periodo.findOne({ where: { nombre: periodo } });
      if (periodoByName) values.push(String(periodoByName.id));
    } catch (e) {}
  }

  return Array.from(new Set(values));
};

const findSyllabusComisionForDocente = async ({ syllabusComisionId, asignaturaId, periodo }) => {
  if (syllabusComisionId) {
    const byId = await SyllabusComisionAcademica.findByPk(syllabusComisionId);
    if (byId) return byId;
  }

  if (!asignaturaId) return null;

  const periodoValues = await resolvePeriodoValues(periodo);
  if (periodoValues.length > 0) {
    const byPeriodo = await SyllabusComisionAcademica.findOne({
      where: {
        asignatura_id: asignaturaId,
        periodo: { [Op.in]: periodoValues }
      },
      order: [['updated_at', 'DESC']]
    });
    if (byPeriodo) return byPeriodo;
  }

  const byLatestComision = await SyllabusComisionAcademica.findOne({
    where: { asignatura_id: asignaturaId },
    order: [['updated_at', 'DESC']]
  });
  if (byLatestComision) return byLatestComision;

  // Fallback: buscar en tabla general syllabi (admin puede bloquear el template general)
  if (periodoValues.length > 0) {
    const byGeneralPeriodo = await Syllabus.findOne({
      where: { asignatura_id: asignaturaId, periodo: { [Op.in]: periodoValues } },
      order: [['updatedAt', 'DESC']]
    });
    if (byGeneralPeriodo) return byGeneralPeriodo;
  }

  const byGeneralAsignatura = await Syllabus.findOne({
    where: { asignatura_id: asignaturaId },
    order: [['updatedAt', 'DESC']]
  });
  if (byGeneralAsignatura) return byGeneralAsignatura;

  // Último fallback: plantilla de referencia global
  return Syllabus.findOne({
    where: { es_plantilla_referencia: true },
    order: [['updatedAt', 'DESC']]
  });
};

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

    // === MERGE LOCKS FROM GENERAL TEMPLATE ===
    // The main syllabus may be a commission record (no locks).
    // Look for the admin's general locked template and apply its locks positionally.
    try {
      let lockTemplate = null;

      // 1. Try matching period + asignatura_id IS NULL (the admin "blank" template)
      const allPeriodoValues = [...periodoValues];
      // Also try resolving the period of the found syllabus (may differ from request)
      if (syllabus.periodo && !allPeriodoValues.includes(String(syllabus.periodo))) {
        allPeriodoValues.push(String(syllabus.periodo));
        // Try to resolve by name too
        try {
          const pRec = await Periodo.findOne({ where: { nombre: syllabus.periodo } });
          if (pRec) allPeriodoValues.push(String(pRec.id));
          const pById = await Periodo.findByPk(parseInt(syllabus.periodo));
          if (pById?.nombre) allPeriodoValues.push(pById.nombre);
        } catch(e) { /* ignore */ }
      }

      if (allPeriodoValues.length > 0) {
        lockTemplate = await Syllabus.findOne({
          where: { asignatura_id: null, periodo: { [Op.in]: allPeriodoValues } },
          order: [['updatedAt', 'DESC']]
        });
      }

      // 2. Fallback: any general template (asignatura_id IS NULL, most recent)
      if (!lockTemplate) {
        lockTemplate = await Syllabus.findOne({
          where: { asignatura_id: null },
          order: [['updatedAt', 'DESC']]
        });
      }

      // 3. Fallback: es_plantilla_referencia
      if (!lockTemplate) {
        lockTemplate = await Syllabus.findOne({
          where: { es_plantilla_referencia: true },
          order: [['updatedAt', 'DESC']]
        });
      }

      // Apply locks if we found a DIFFERENT template with locked cells
      if (lockTemplate && String(lockTemplate.id) !== String(syllabus.id)) {
        let lockDatos = lockTemplate.datos_syllabus;
        if (typeof lockDatos === 'string') { try { lockDatos = JSON.parse(lockDatos); } catch(e) {} }
        const lockState = buildComisionLockState(lockDatos);
        // Only merge if template actually has some locks
        const hasLocks = Object.values(lockState.lockById).some(v => v) ||
                         Object.values(lockState.lockByPosition).some(v => v);
        if (hasLocks) {
          // `datos` aquí ES el syllabus de la comisión: su `docenteEditable` sí manda
          datos = applyComisionLocksToDocente(datos, lockState, true);
          console.log(`✅ Applied ${Object.values(lockState.lockById).filter(Boolean).length} locks from general template ID ${lockTemplate.id} to commission/docente data`);
        }
      }
    } catch (lockErr) {
      console.warn('Could not merge template locks:', lockErr.message);
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

    // Resolver los 3 estados de bloqueo antes de entregárselo al docente. Sin
    // esto, una celda que la comisión liberó explícitamente (docenteEditable:true)
    // pero que el admin había bloqueado (isLocked:true) llegaba bloqueada, y el
    // docente no podía escribirla. Es el mismo arreglo que ya tiene el syllabus.
    // `datos` es el programa de la comisión: su `docenteEditable` sí manda
    datos = applyComisionLocksToDocente(datos, buildComisionLockState(datos), true);

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

    let resolvedSyllabusComisionId = syllabus.syllabus_comision_id;
    const syllabusComision = await findSyllabusComisionForDocente({
      syllabusComisionId: syllabus.syllabus_comision_id,
      asignaturaId: syllabus.asignatura_id || asignatura_id,
      periodo: syllabus.periodo || periodo
    });

    if (syllabusComision) {
      let datosComision = syllabusComision.datos_syllabus;
      if (typeof datosComision === 'string') {
        try { datosComision = JSON.parse(datosComision); } catch (e) {}
      }

      const lockState = buildComisionLockState(datosComision);
      datos = applyComisionLocksToDocente(datos, lockState);
      resolvedSyllabusComisionId = syllabusComision.id;
    }

    // === ALSO MERGE LOCKS FROM GENERAL TEMPLATE ===
    try {
      const periodoValuesForLock = await resolvePeriodoValues(syllabus.periodo || periodo);
      let lockTemplate = null;

      if (periodoValuesForLock.length > 0) {
        lockTemplate = await Syllabus.findOne({
          where: { asignatura_id: null, periodo: { [Op.in]: periodoValuesForLock } },
          order: [['updatedAt', 'DESC']]
        });
      }
      if (!lockTemplate) {
        lockTemplate = await Syllabus.findOne({
          where: { asignatura_id: null },
          order: [['updatedAt', 'DESC']]
        });
      }
      if (!lockTemplate) {
        lockTemplate = await Syllabus.findOne({
          where: { es_plantilla_referencia: true },
          order: [['updatedAt', 'DESC']]
        });
      }

      // Only apply if different from the commission record already applied
      if (lockTemplate && String(lockTemplate.id) !== String(syllabusComision?.id)) {
        let lockDatos = lockTemplate.datos_syllabus;
        if (typeof lockDatos === 'string') { try { lockDatos = JSON.parse(lockDatos); } catch(e) {} }
        const lockState = buildComisionLockState(lockDatos);
        const hasLocks = Object.values(lockState.lockById).some(v => v) ||
                         Object.values(lockState.lockByPosition).some(v => v);
        if (hasLocks) {
          // Segunda pasada, con los bloqueos del ADMIN. `datos` ya pasó por los de
          // la comisión, así que su `docenteEditable: true` es una liberación real
          // de la comisión y tiene que sobrevivir a este bloqueo del admin.
          datos = applyComisionLocksToDocente(datos, lockState, true);
        }
      }
    } catch (lockErr) {
      console.warn('Could not merge template locks in getSyllabusDocente:', lockErr.message);
    }

    res.json({
      success: true,
      data: {
        ...syllabus.toJSON(),
        syllabus_comision_id: resolvedSyllabusComisionId,
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

    // Los bloqueos se inyectan en LECTURA, nunca se guardan con el documento del
    // docente: si no volviéramos a leerlos del programa de la comisión, el
    // docente se quedaría con las banderas congeladas del día que guardó y los
    // bloqueos posteriores de la comisión nunca le llegarían.
    try {
      const periodoValues = await resolvePeriodoValues(programa.periodo || periodo);
      const whereComision = { asignatura_id: programa.asignatura_id || asignatura_id };
      if (periodoValues.length > 0) whereComision.periodo = { [Op.in]: periodoValues };

      let programaComision = await ProgramasAnaliticos.findOne({
        where: whereComision,
        order: [['createdAt', 'DESC']]
      });
      // Sin coincidencia de periodo, al menos tomamos el de la asignatura
      if (!programaComision && whereComision.periodo) {
        programaComision = await ProgramasAnaliticos.findOne({
          where: { asignatura_id: whereComision.asignatura_id },
          order: [['createdAt', 'DESC']]
        });
      }

      if (programaComision) {
        let datosComision = programaComision.datos_tabla;
        if (typeof datosComision === 'string') {
          try { datosComision = JSON.parse(datosComision); } catch (e) {}
        }
        datos = applyComisionLocksToDocente(datos, buildComisionLockState(datosComision));
      } else {
        // Sin programa de comisión, al menos resolvemos los 3 estados de lo que ya trae
        datos = applyComisionLocksToDocente(datos, buildComisionLockState(datos));
      }
    } catch (lockErr) {
      console.warn('No se pudieron aplicar los bloqueos en getProgramaDocente:', lockErr.message);
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

// Expuestas para poder probar los bloqueos aislados, sin levantar el servidor
exports._buildComisionLockState = buildComisionLockState;
exports._applyComisionLocksToDocente = applyComisionLocksToDocente;
