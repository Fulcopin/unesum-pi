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
    const { titulo, descripcion, fecha_inicio, fecha_fin, color, tipo, para_roles } = req.body;
    if (!titulo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ success: false, message: 'titulo, fecha_inicio y fecha_fin son obligatorios' });
    }
    const [result] = await sequelize.query(
      `INSERT INTO public.cronograma_eventos (titulo, descripcion, fecha_inicio, fecha_fin, color, tipo, para_roles, creado_por)
       VALUES (:titulo, :descripcion, :fecha_inicio, :fecha_fin, :color, :tipo, :para_roles, :creado_por)
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
    const { titulo, descripcion, fecha_inicio, fecha_fin, color, tipo, para_roles } = req.body;
    const [result] = await sequelize.query(
      `UPDATE public.cronograma_eventos
       SET titulo = :titulo, descripcion = :descripcion, fecha_inicio = :fecha_inicio,
           fecha_fin = :fecha_fin, color = :color, tipo = :tipo, para_roles = :para_roles,
           updated_at = NOW()
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
        },
        type: QueryTypes.UPDATE,
      }
    );
    return res.json({ success: true, data: result[0] || result });
  } catch (error) {
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
