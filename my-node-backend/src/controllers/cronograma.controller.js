// cronograma.controller.js
// Gestión del cronograma/calendario de actividades institucionales

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

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
      `SELECT modulo, para_roles, fecha_inicio, fecha_fin
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
    const gobernados = new Map(); // modulo → ¿visible ahora?
    for (const ev of aplicables) {
      const dentro = new Date(ev.fecha_inicio) <= ahora && ahora <= new Date(ev.fecha_fin);
      gobernados.set(ev.modulo, (gobernados.get(ev.modulo) || false) || dentro);
    }

    const ocultos = [...gobernados.entries()]
      .filter(([, visible]) => !visible)
      .map(([modulo]) => modulo);

    return res.json({ success: true, data: { ocultos, rol: rolActivo } });
  } catch (error) {
    console.error('Error getModulosOcultos:', error);
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
