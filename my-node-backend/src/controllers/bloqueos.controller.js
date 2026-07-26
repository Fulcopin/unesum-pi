// bloqueos.controller.js
//
// Menú unificado de bloqueos de la comisión académica: una sola pantalla para
// bloquear celdas tanto del SYLLABUS como del PROGRAMA ANALÍTICO, con la opción
// de aplicar esos mismos bloqueos a todos los documentos del periodo.
//
// Los dos tipos de documento comparten la estructura `tabs → rows → cells`, así
// que la única diferencia real es de qué tabla/columna sale el JSON:
//
//   syllabus  → SyllabusComisionAcademica.datos_syllabus
//   programa  → ProgramasAnaliticos.datos_tabla
//
// Estados que puede tener una celda (ver también docenteEditorController):
//   bloqueada → isLocked:true,  docenteEditable:false
//   liberada  → isLocked:false, docenteEditable:true   (gana sobre el admin)
//   sin opinión → no se tocan las banderas

const { Op } = require('sequelize');
const db = require('../models');
const { _extraerBloqueosFuente } = require('./comisionAcademicaController');

// Los documentos de comisión no guardan carrera ni facultad: cuelgan de la
// asignatura (asignaturas.carrera_id → carreras.facultad_id). Este include es el
// que las trae, para poder filtrar y para los alcances "toda la carrera" y
// "toda la facultad".
const INCLUDE_CARRERA = () => [
  {
    model: db.Asignatura,
    as: 'asignatura',
    required: false,
    attributes: ['id', 'nombre', 'carrera_id'],
    include: [
      {
        model: db.Carrera,
        as: 'carrera',
        required: false,
        attributes: ['id', 'nombre', 'facultad_id'],
        include: [{ model: db.Facultad, as: 'facultad', required: false, attributes: ['id', 'nombre'] }],
      },
    ],
  },
];

/** Ids de todas las asignaturas de una facultad (vía sus carreras). */
const asignaturasDeFacultad = async (facultadId) => {
  const carreras = await db.Carrera.findAll({ where: { facultad_id: facultadId }, attributes: ['id'] });
  if (carreras.length === 0) return [];
  const filas = await db.Asignatura.findAll({
    where: { carrera_id: { [Op.in]: carreras.map((c) => c.id) } },
    attributes: ['id'],
  });
  return filas.map((a) => a.id);
};

// Replica el índice de bloqueos de la fuente sobre un documento destino: match
// por posición con respaldo por contenido, sin tocar nunca el contenido del
// destino — solo las banderas de bloqueo y los colores.
function aplicarBloqueos(targetData, fuenteTabs) {
  let aplicados = 0;
  if (!Array.isArray(targetData?.tabs)) return { data: targetData, aplicados };

  const norm = (s) =>
    (s || '').toString().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

  const tabs = targetData.tabs.map((tab, tIdx) => {
    const fuente = fuenteTabs.find((f) => f.title && tab.title && f.title === tab.title) || fuenteTabs[tIdx];
    if (!fuente) return tab;
    // Solo confiamos en la posición si la pestaña tiene el mismo número de filas
    const alineada = (tab.rows || []).length === fuente.rowCount;

    return {
      ...tab,
      rows: (tab.rows || []).map((row, rIdx) => ({
        ...row,
        cells: (row.cells || []).map((cell, cIdx) => {
          let info = alineada ? fuente.byPosition[`${rIdx}:${cIdx}`] : null;
          if (!info) {
            const key = norm(cell.content);
            if (key) info = fuente.byContent.get(key) || null;
          }
          if (!info) return cell;
          aplicados++;
          return {
            ...cell,
            isLocked: info.isLocked,
            docenteEditable: info.docenteEditable,
            backgroundColor: info.backgroundColor || cell.backgroundColor,
            textColor: info.textColor || cell.textColor,
          };
        }),
      })),
    };
  });

  return { data: { ...targetData, tabs }, aplicados };
}

/** Ids de todas las asignaturas de una carrera: base del alcance por carrera. */
const asignaturasDeCarrera = async (carreraId) => {
  const filas = await db.Asignatura.findAll({
    where: { carrera_id: carreraId },
    attributes: ['id'],
  });
  return filas.map((a) => a.id);
};

// Se trabaja siempre sobre los documentos DE COMISIÓN: son los que el docente
// realmente abre. La plantilla en blanco del admin (`syllabi` sin asignatura_id)
// no se toca desde aquí — bloquear ahí no le llega a nadie por sí solo.
//
// Banderas por celda (ver también docenteEditorController):
//   bloqueada → isLocked:true,  docenteEditable:false
//   liberada  → isLocked:false, docenteEditable:true   (gana sobre el admin)
//   libre     → sin opinión; manda lo que haya definido administración
const TIPOS = {
  syllabus: {
    label: 'Syllabus de comisión',
    model: () => db.SyllabusComisionAcademica,
    campo: 'datos_syllabus',
  },
  programa: {
    label: 'Programa Analítico de comisión',
    model: () => db.ProgramasAnaliticos,
    campo: 'datos_tabla',
  },
};

const configDe = (tipo) => TIPOS[String(tipo || '').toLowerCase()] || null;

/** Estado visible de una celda. */
const estadoDeCelda = (cell) => {
  if (cell?.docenteEditable === true) return 'liberada';
  if (cell?.docenteEditable === false || cell?.isLocked === true) return 'bloqueada';
  return 'libre';
};

const escribirEstado = (cell, estado) => {
  if (estado === 'bloqueada') return { ...cell, isLocked: true, docenteEditable: false };
  if (estado === 'liberada') return { ...cell, isLocked: false, docenteEditable: true };
  // 'libre' = se retira la opinión sobre esta celda
  const { docenteEditable, ...resto } = cell;
  return { ...resto, isLocked: false };
};

const parseDatos = (valor) => {
  if (!valor) return null;
  if (typeof valor === 'string') {
    try { return JSON.parse(valor); } catch { return null; }
  }
  return valor;
};

/** Cuenta cuántas celdas tienen bloqueo/liberación explícita, para el listado. */
const contarBloqueos = (datos) => {
  let bloqueadas = 0;
  let liberadas = 0;
  for (const tab of datos?.tabs || []) {
    for (const row of tab.rows || []) {
      for (const cell of row.cells || []) {
        const estado = estadoDeCelda(cell);
        if (estado === 'liberada') liberadas++;
        else if (estado === 'bloqueada') bloqueadas++;
      }
    }
  }
  return { bloqueadas, liberadas };
};

// =========================================================================
// GET /api/bloqueos/documentos?tipo=syllabus|programa&periodo=X
// Lista ligera para el selector: no devuelve el JSON completo.
// =========================================================================
exports.listarDocumentos = async (req, res) => {
  try {
    const config = configDe(req.query.tipo);
    if (!config) {
      return res.status(400).json({ success: false, message: "tipo debe ser 'syllabus' o 'programa'" });
    }

    const where = {};
    if (req.query.periodo) where.periodo = String(req.query.periodo);
    // Sin asignaturas en esa carrera/facultad no hay nada que listar: el IN con
    // un id imposible devuelve cero filas, que es justo lo correcto.
    if (req.query.carrera_id) {
      const ids = await asignaturasDeCarrera(req.query.carrera_id);
      where.asignatura_id = { [Op.in]: ids.length > 0 ? ids : [-1] };
    } else if (req.query.facultad_id) {
      const ids = await asignaturasDeFacultad(req.query.facultad_id);
      where.asignatura_id = { [Op.in]: ids.length > 0 ? ids : [-1] };
    }

    const filas = await config.model().findAll({
      where,
      include: INCLUDE_CARRERA(),
      order: [['id', 'DESC']],
      limit: 300,
    });

    return res.json({
      success: true,
      data: filas.map((f) => {
        const datos = parseDatos(f[config.campo]);
        const { bloqueadas, liberadas } = contarBloqueos(datos);
        return {
          id: f.id,
          nombre: f.nombre || `${config.label} ${f.id}`,
          periodo: f.periodo || null,
          asignatura_id: f.asignatura_id || null,
          asignatura_nombre: f.asignatura?.nombre || null,
          carrera_id: f.asignatura?.carrera_id || null,
          carrera_nombre: f.asignatura?.carrera?.nombre || null,
          facultad_id: f.asignatura?.carrera?.facultad_id || null,
          facultad_nombre: f.asignatura?.carrera?.facultad?.nombre || null,
          pestanas: Array.isArray(datos?.tabs) ? datos.tabs.length : 0,
          bloqueadas,
          liberadas,
        };
      }),
    });
  } catch (error) {
    console.error('Error listarDocumentos bloqueos:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// GET /api/bloqueos/documento/:tipo/:id
// Devuelve las pestañas con el contenido y el estado de bloqueo de cada celda.
// =========================================================================
exports.getDocumento = async (req, res) => {
  try {
    const config = configDe(req.params.tipo);
    if (!config) {
      return res.status(400).json({ success: false, message: "tipo debe ser 'syllabus' o 'programa'" });
    }

    const doc = await config.model().findByPk(req.params.id, { include: INCLUDE_CARRERA() });
    if (!doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

    const datos = parseDatos(doc[config.campo]);
    if (!Array.isArray(datos?.tabs)) {
      return res.status(400).json({
        success: false,
        message: 'Este documento no tiene una estructura de pestañas válida',
      });
    }

    // Solo mandamos lo que la pantalla necesita: contenido + estado de bloqueo.
    const tabs = datos.tabs.map((tab, tIdx) => ({
      indice: tIdx,
      titulo: tab.title || `Pestaña ${tIdx + 1}`,
      filas: (tab.rows || []).map((row, rIdx) => ({
        indice: rIdx,
        celdas: (row.cells || []).map((cell, cIdx) => ({
          indice: cIdx,
          contenido: cell?.content || '',
          esEncabezado: !!cell?.isHeader,
          estado: estadoDeCelda(cell),
        })),
      })),
    }));

    return res.json({
      success: true,
      data: {
        id: doc.id,
        tipo: req.params.tipo,
        nombre: doc.nombre || `${config.label} ${doc.id}`,
        periodo: doc.periodo || null,
        carrera_id: doc.asignatura?.carrera_id || null,
        carrera_nombre: doc.asignatura?.carrera?.nombre || null,
        facultad_id: doc.asignatura?.carrera?.facultad_id || null,
        facultad_nombre: doc.asignatura?.carrera?.facultad?.nombre || null,
        tabs,
      },
    });
  } catch (error) {
    console.error('Error getDocumento bloqueos:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// PUT /api/bloqueos/documento/:tipo/:id
// Body: { cambios: { "tabIdx:rowIdx:cellIdx": "bloqueada"|"liberada"|"libre" },
//         aplicarATodos?: boolean,
//         scope?: 'periodo' | 'carrera' | 'facultad' | 'todos' | 'seleccion',
//         targetIds?: number[] }   ← con scope 'seleccion', los documentos elegidos a mano
//
// Guarda SOLO las banderas de bloqueo: nunca toca el contenido de las celdas.
// =========================================================================
exports.guardarBloqueos = async (req, res) => {
  try {
    const config = configDe(req.params.tipo);
    if (!config) {
      return res.status(400).json({ success: false, message: "tipo debe ser 'syllabus' o 'programa'" });
    }

    const { cambios = {}, aplicarATodos = false, scope = 'periodo', targetIds } = req.body || {};
    const Modelo = config.model();

    const doc = await Modelo.findByPk(req.params.id, { include: INCLUDE_CARRERA() });
    if (!doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

    const datos = parseDatos(doc[config.campo]);
    if (!Array.isArray(datos?.tabs)) {
      return res.status(400).json({ success: false, message: 'El documento no tiene una estructura válida' });
    }

    let aplicados = 0;
    const nuevoTabs = datos.tabs.map((tab, tIdx) => ({
      ...tab,
      rows: (tab.rows || []).map((row, rIdx) => ({
        ...row,
        cells: (row.cells || []).map((cell, cIdx) => {
          const estado = cambios[`${tIdx}:${rIdx}:${cIdx}`];
          if (!estado) return cell;
          aplicados++;
          return escribirEstado(cell, estado);
        }),
      })),
    }));

    const datosFinales = { ...datos, tabs: nuevoTabs };
    await doc.update({ [config.campo]: JSON.stringify(datosFinales) });

    const respuesta = { celdasActualizadas: aplicados, replicado: null };

    // "Bloquear para todos": replica estas mismas banderas al resto de
    // documentos del mismo tipo. Reutiliza el motor de aplicar-bloqueos que ya
    // se usaba para los syllabus, que hace match por posición con respaldo por
    // contenido y nunca pisa el contenido del destino.
    if (aplicarATodos) {
      const fuenteTabs = _extraerBloqueosFuente(datosFinales);
      const totalFuente = fuenteTabs.reduce((n, t) => n + Object.keys(t.byPosition).length, 0);

      if (totalFuente === 0) {
        respuesta.replicado = { destinos: 0, afectados: 0, motivo: 'el documento no tiene bloqueos que replicar' };
      } else {
        const where = {};

        if (scope === 'seleccion') {
          // La comisión eligió a mano a qué documentos aplicar los bloqueos.
          const ids = (Array.isArray(targetIds) ? targetIds : [])
            .map(Number)
            .filter((n) => Number.isInteger(n) && String(n) !== String(doc.id));
          if (ids.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Selecciona al menos un documento destino.',
            });
          }
          where.id = { [Op.in]: ids };
        } else if (scope === 'carrera' || scope === 'facultad') {
          // Todas las comisiones de la carrera / facultad, sin importar el periodo.
          const carreraId = doc.asignatura?.carrera_id;
          const facultadId = doc.asignatura?.carrera?.facultad_id;
          const referencia = scope === 'carrera' ? carreraId : facultadId;
          if (!referencia) {
            return res.status(400).json({
              success: false,
              message: `Este documento no está vinculado a una asignatura con ${scope}, así que no se puede aplicar a toda la ${scope}. Usa el alcance por periodo.`,
            });
          }
          const ids =
            scope === 'carrera' ? await asignaturasDeCarrera(referencia) : await asignaturasDeFacultad(referencia);
          where.asignatura_id = { [Op.in]: ids.length > 0 ? ids : [-1] };
        } else if (scope === 'periodo' && doc.periodo) {
          where.periodo = doc.periodo;
        }
        // scope === 'todos' → sin filtro

        const posibles = await Modelo.findAll({ where });
        const destinos = posibles.filter((d) => String(d.id) !== String(doc.id));

        let afectados = 0;
        let celdas = 0;
        for (const destino of destinos) {
          const targetData = parseDatos(destino[config.campo]);
          if (!Array.isArray(targetData?.tabs)) continue;
          const { data, aplicados: n } = aplicarBloqueos(targetData, fuenteTabs);
          if (n > 0) {
            await destino.update({ [config.campo]: JSON.stringify(data) });
            afectados++;
            celdas += n;
          }
        }
        respuesta.replicado = { destinos: destinos.length, afectados, celdas, scope };
      }
    }

    return res.json({
      success: true,
      message: aplicarATodos
        ? `Bloqueos guardados y replicados a ${respuesta.replicado?.afectados ?? 0} de ${respuesta.replicado?.destinos ?? 0} documentos.`
        : `${aplicados} celda(s) actualizada(s).`,
      data: respuesta,
    });
  } catch (error) {
    console.error('Error guardarBloqueos:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
