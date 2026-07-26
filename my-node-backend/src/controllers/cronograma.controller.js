// cronograma.controller.js
// Gestión del cronograma/calendario de actividades institucionales

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const { habilitacionesVigentesDe } = require('./habilitaciones.controller');

// Crear tabla si no existe (primera ejecución)
const initTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.cronograma_eventos (
      id BIGSERIAL PRIMARY KEY,
      titulo VARCHAR(200) NOT NULL,
      descripcion TEXT,
      fecha_inicio TIMESTAMP NOT NULL,
      fecha_fin TIMESTAMP NOT NULL,
      color VARCHAR(20) DEFAULT '#2563eb',
      tipo VARCHAR(50) DEFAULT 'general',
      para_roles TEXT DEFAULT 'todos',
      creado_por INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Columna `modulo`: si el evento gobierna una opción de menú, guarda su href.
  // La opción solo estará visible para el rol dentro de [fecha_inicio, fecha_fin].
  await sequelize.query(
    `ALTER TABLE public.cronograma_eventos ADD COLUMN IF NOT EXISTS modulo VARCHAR(200)`
  );
  // Estado manual de cada opción de menú, controlado por el administrador.
  //   'auto'      → manda el cronograma (visible solo dentro del rango del evento)
  //   'bloqueado' → oculto siempre, aunque esté dentro del rango
  //   'siempre'   → visible siempre, aunque esté fuera del rango
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.cronograma_modulos_estado (
      modulo VARCHAR(200) PRIMARY KEY,
      estado VARCHAR(20) NOT NULL DEFAULT 'auto',
      actualizado_por INTEGER,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
};

const ESTADOS_VALIDOS = ['auto', 'bloqueado', 'siempre'];

// Lee la tabla de estados manuales como un Map modulo → estado
const leerEstados = async () => {
  const filas = await sequelize.query(
    `SELECT modulo, estado FROM public.cronograma_modulos_estado`,
    { type: QueryTypes.SELECT }
  );
  return new Map(filas.map((f) => [f.modulo, f.estado]));
};

// Normaliza el rol del usuario a los valores que usa el cronograma
const normalizarRol = (rol) => {
  const r = String(rol || '').toLowerCase();
  if (r.includes('admin')) return 'administrador';
  if (r.includes('comision')) return 'comision';
  if (r === 'profesor' || r.includes('docente')) return 'docente';
  if (r.includes('coordinador')) return 'coordinador';
  if (r.includes('decano')) return 'decano';
  return r;
};

// Valida el rango de fechas de un evento.
// Devuelve un string con el error, o null si el rango es válido.
const validarRango = (fecha_inicio, fecha_fin) => {
  const inicio = new Date(fecha_inicio);
  const fin = new Date(fecha_fin);
  if (Number.isNaN(inicio.getTime())) return 'La fecha de inicio no es una fecha válida';
  if (Number.isNaN(fin.getTime())) return 'La fecha de fin no es una fecha válida';
  if (fin <= inicio) return 'La fecha de fin debe ser posterior a la fecha de inicio';
  return null;
};

// GET /api/cronograma
exports.getAll = async (req, res) => {
  try {
    await initTable();
    const eventos = await sequelize.query(
      `SELECT * FROM public.cronograma_eventos ORDER BY fecha_inicio ASC`,
      { type: QueryTypes.SELECT }
    );
    return res.json({ success: true, data: eventos });
  } catch (error) {
    console.error('Error getAll cronograma:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/cronograma/:id
exports.getById = async (req, res) => {
  try {
    await initTable();
    const [evento] = await sequelize.query(
      `SELECT * FROM public.cronograma_eventos WHERE id = :id`,
      { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
    );
    if (!evento) return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    return res.json({ success: true, data: evento });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/cronograma
exports.create = async (req, res) => {
  try {
    await initTable();
    const { titulo, descripcion, fecha_inicio, fecha_fin, color, tipo, para_roles, modulo } = req.body;
    if (!titulo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ success: false, message: 'titulo, fecha_inicio y fecha_fin son obligatorios' });
    }
    const errorRango = validarRango(fecha_inicio, fecha_fin);
    if (errorRango) {
      return res.status(400).json({ success: false, message: errorRango });
    }
    const [result] = await sequelize.query(
      `INSERT INTO public.cronograma_eventos (titulo, descripcion, fecha_inicio, fecha_fin, color, tipo, para_roles, modulo, creado_por)
       VALUES (:titulo, :descripcion, :fecha_inicio, :fecha_fin, :color, :tipo, :para_roles, :modulo, :creado_por)
       RETURNING *`,
      {
        replacements: {
          titulo: titulo.trim(),
          descripcion: descripcion || null,
          fecha_inicio,
          fecha_fin,
          color: color || '#2563eb',
          tipo: tipo || 'general',
          para_roles: para_roles || 'todos',
          modulo: modulo || null,
          creado_por: req.user?.id || null,
        },
        type: QueryTypes.INSERT,
      }
    );
    return res.status(201).json({ success: true, data: result[0] || result });
  } catch (error) {
    console.error('Error create cronograma:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/cronograma/:id
exports.update = async (req, res) => {
  try {
    await initTable();
    const { titulo, descripcion, fecha_inicio, fecha_fin, color, tipo, para_roles, modulo } = req.body;
    if (!titulo || !titulo.trim() || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ success: false, message: 'titulo, fecha_inicio y fecha_fin son obligatorios' });
    }
    const errorRango = validarRango(fecha_inicio, fecha_fin);
    if (errorRango) {
      return res.status(400).json({ success: false, message: errorRango });
    }
    const [result] = await sequelize.query(
      `UPDATE public.cronograma_eventos
       SET titulo = :titulo, descripcion = :descripcion, fecha_inicio = :fecha_inicio,
           fecha_fin = :fecha_fin, color = :color, tipo = :tipo, para_roles = :para_roles,
           modulo = :modulo, updated_at = NOW()
       WHERE id = :id
       RETURNING *`,
      {
        replacements: {
          id: req.params.id,
          titulo: titulo?.trim(),
          descripcion: descripcion || null,
          fecha_inicio,
          fecha_fin,
          color: color || '#2563eb',
          tipo: tipo || 'general',
          para_roles: para_roles || 'todos',
          modulo: modulo || null,
        },
        type: QueryTypes.UPDATE,
      }
    );
    return res.json({ success: true, data: result[0] || result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/cronograma/modulos-ocultos
// Devuelve las opciones de menú que AHORA deben ocultarse para el rol del usuario.
// Regla: si una opción tiene eventos que la gobiernan, solo está visible mientras
// la fecha actual esté dentro de [fecha_inicio, fecha_fin] de alguno de ellos.
// Si una opción no tiene ningún evento, no se oculta nunca.
exports.getModulosOcultos = async (req, res) => {
  try {
    await initTable();

    const rolActivo = normalizarRol(req.user?.rol);
    let rolesUsuario = [];
    if (Array.isArray(req.user?.roles) && req.user.roles.length > 0) {
      rolesUsuario = req.user.roles.map(normalizarRol);
    } else if (rolActivo) {
      rolesUsuario = [rolActivo];
    }

    const eventos = await sequelize.query(
      `SELECT titulo, modulo, para_roles, fecha_inicio, fecha_fin
         FROM public.cronograma_eventos
        WHERE modulo IS NOT NULL AND modulo <> ''`,
      { type: QueryTypes.SELECT }
    );

    // Solo los eventos que aplican al rol del usuario
    const aplicables = eventos.filter((ev) => {
      const destino = normalizarRol(ev.para_roles);
      return destino === 'todos' || rolesUsuario.includes(destino);
    });

    const ahora = new Date();
    // modulo → { visible, titulo, fecha_inicio, fecha_fin }
    // Si hay varios eventos para el mismo módulo, gana el que lo hace visible;
    // si ninguno lo hace visible, conservamos el que termine más tarde (el más
    // relevante para explicarle al usuario cuándo estuvo/estará disponible).
    const gobernados = new Map();
    for (const ev of aplicables) {
      const inicio = new Date(ev.fecha_inicio);
      const fin = new Date(ev.fecha_fin);
      // Un rango invertido nunca habilita (dato corrupto anterior a la validación)
      const dentro = inicio <= fin && inicio <= ahora && ahora <= fin;
      const previo = gobernados.get(ev.modulo);
      const gana =
        !previo ||
        (dentro && !previo.visible) ||
        (dentro === previo.visible && fin > new Date(previo.fecha_fin));
      if (gana) {
        gobernados.set(ev.modulo, {
          visible: dentro || (previo?.visible ?? false),
          titulo: ev.titulo,
          fecha_inicio: ev.fecha_inicio,
          fecha_fin: ev.fecha_fin,
        });
      } else if (dentro) {
        previo.visible = true;
      }
    }

    // El estado manual del administrador tiene prioridad sobre las fechas
    const estados = await leerEstados();
    for (const [modulo, estado] of estados.entries()) {
      if (estado !== 'bloqueado' && estado !== 'siempre') continue;
      const previo = gobernados.get(modulo);
      gobernados.set(modulo, {
        ...(previo || { titulo: null, fecha_inicio: null, fecha_fin: null }),
        visible: estado === 'siempre',
        motivo: estado === 'siempre' ? 'siempre' : 'bloqueado',
      });
    }

    // Habilitación excepcional: si el coordinador pidió reabrirle un módulo a
    // este docente y el decano o el director académico lo autorizaron, esa
    // excepción manda sobre las fechas y sobre el bloqueo manual del admin —
    // es justamente para eso que existe.
    if (rolActivo === 'docente') {
      try {
        const excepciones = await habilitacionesVigentesDe(req.user?.id);
        for (const exc of excepciones) {
          const previo = gobernados.get(exc.modulo);
          gobernados.set(exc.modulo, {
            ...(previo || { titulo: null, fecha_inicio: null }),
            visible: true,
            motivo: 'habilitacion',
            fecha_fin: exc.fecha_fin,
            titulo: `Habilitación autorizada por ${exc.autorizado_por_nombre || 'la autoridad'}`,
          });
        }
      } catch (e) {
        // Si la consulta falla no dejamos al docente sin menú: seguimos con las
        // reglas normales del cronograma.
        console.error('No se pudieron leer las habilitaciones del docente:', e.message);
      }
    }

    const ocultos = [];
    const ventanas = {};
    for (const [modulo, info] of gobernados.entries()) {
      ventanas[modulo] = { ...info, motivo: info.motivo || 'fechas' };
      if (!info.visible) ocultos.push(modulo);
    }

    return res.json({ success: true, data: { ocultos, ventanas, rol: rolActivo } });
  } catch (error) {
    console.error('Error getModulosOcultos:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/cronograma/modulos-estado   (solo administrador)
// Panel de gestión de menús: para cada opción gobernada devuelve su estado
// manual, el evento que la controla y si está visible en este momento.
exports.getModulosEstado = async (req, res) => {
  try {
    await initTable();

    const eventos = await sequelize.query(
      `SELECT titulo, modulo, para_roles, fecha_inicio, fecha_fin
         FROM public.cronograma_eventos
        WHERE modulo IS NOT NULL AND modulo <> ''
        ORDER BY fecha_inicio ASC`,
      { type: QueryTypes.SELECT }
    );
    const estados = await leerEstados();
    const ahora = new Date();

    // Un módulo puede tener varios eventos: nos quedamos con el vigente, y si
    // no hay ninguno vigente, con el que termine más tarde.
    const porModulo = new Map();
    for (const ev of eventos) {
      const inicio = new Date(ev.fecha_inicio);
      const fin = new Date(ev.fecha_fin);
      const vigente = inicio <= fin && inicio <= ahora && ahora <= fin;
      const previo = porModulo.get(ev.modulo);
      if (!previo || (vigente && !previo.vigente) || (vigente === previo.vigente && fin > new Date(previo.fecha_fin))) {
        porModulo.set(ev.modulo, { ...ev, vigente });
      }
    }

    // También listamos módulos que solo tienen estado manual (sin evento)
    for (const modulo of estados.keys()) {
      if (!porModulo.has(modulo)) porModulo.set(modulo, { modulo, vigente: false, sinEvento: true });
    }

    const data = [...porModulo.values()].map((m) => {
      const estado = estados.get(m.modulo) || 'auto';
      // Sin evento y en automático, la opción no está gobernada → visible
      const porFechas = m.sinEvento ? true : m.vigente;
      const visible = estado === 'siempre' ? true : estado === 'bloqueado' ? false : porFechas;
      return {
        modulo: m.modulo,
        estado,
        visible,
        titulo: m.titulo || null,
        para_roles: m.para_roles || null,
        fecha_inicio: m.fecha_inicio || null,
        fecha_fin: m.fecha_fin || null,
        tiene_evento: !m.sinEvento,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error getModulosEstado:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/cronograma/modulos-estado   (solo administrador)
// Body: { modulo, estado }  con estado ∈ auto | bloqueado | siempre
exports.setModuloEstado = async (req, res) => {
  try {
    await initTable();
    const { modulo, estado } = req.body;
    if (!modulo || !String(modulo).trim()) {
      return res.status(400).json({ success: false, message: 'El módulo es obligatorio' });
    }
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
      });
    }

    await sequelize.query(
      `INSERT INTO public.cronograma_modulos_estado (modulo, estado, actualizado_por, updated_at)
       VALUES (:modulo, :estado, :usuario, NOW())
       ON CONFLICT (modulo)
       DO UPDATE SET estado = :estado, actualizado_por = :usuario, updated_at = NOW()`,
      {
        replacements: { modulo: String(modulo).trim(), estado, usuario: req.user?.id || null },
        type: QueryTypes.INSERT,
      }
    );

    return res.json({ success: true, data: { modulo, estado } });
  } catch (error) {
    console.error('Error setModuloEstado:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/cronograma/:id
exports.remove = async (req, res) => {
  try {
    await initTable();
    await sequelize.query(
      `DELETE FROM public.cronograma_eventos WHERE id = :id`,
      { replacements: { id: req.params.id }, type: QueryTypes.DELETE }
    );
    return res.json({ success: true, message: 'Evento eliminado' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
