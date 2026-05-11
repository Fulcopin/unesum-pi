// comentariosController.js
// Controlador para comentarios/retroalimentación sobre documentos del docente

const db = require('../models');
const { Op } = require('sequelize');

// ── Listar comentarios de un documento ──────────────────────────────────────
// GET /api/comentarios-documento?tipo=syllabus&id=X
exports.listar = async (req, res) => {
  try {
    const { tipo, id } = req.query;
    if (!tipo || !id) {
      return res.status(400).json({ success: false, message: 'Parámetros "tipo" e "id" son requeridos' });
    }

    const comentarios = await db.ComentarioDocumento.findAll({
      where: { documento_tipo: tipo, documento_id: parseInt(id) },
      order: [['created_at', 'ASC']],
    });

    res.json({ success: true, data: comentarios });
  } catch (e) {
    console.error('Error al listar comentarios:', e);
    res.status(500).json({ success: false, message: 'Error al obtener los comentarios' });
  }
};

// ── Crear un comentario ─────────────────────────────────────────────────────
// POST /api/comentarios-documento
exports.crear = async (req, res) => {
  try {
    const { documento_tipo, documento_id, comentario } = req.body;

    if (!documento_tipo || !documento_id || !comentario?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: documento_tipo, documento_id, comentario',
      });
    }

    if (!['syllabus', 'programa'].includes(documento_tipo)) {
      return res.status(400).json({ success: false, message: 'documento_tipo debe ser "syllabus" o "programa"' });
    }

    const user = req.user;
    const autor_nombre = [user.nombres, user.apellidos].filter(Boolean).join(' ').trim()
      || user.correo_electronico
      || `Usuario ${user.id}`;
    const autor_rol = user.rol || 'desconocido';
    const autor_id = user.id;

    const nuevo = await db.ComentarioDocumento.create({
      documento_tipo,
      documento_id: parseInt(documento_id),
      comentario: comentario.trim(),
      autor_nombre,
      autor_rol,
      autor_id,
      leido: false,
    });

    res.status(201).json({ success: true, data: nuevo });
  } catch (e) {
    console.error('Error al crear comentario:', e);
    res.status(500).json({ success: false, message: 'Error al guardar el comentario' });
  }
};

// ── Eliminar un comentario (solo el autor) ──────────────────────────────────
// DELETE /api/comentarios-documento/:id
exports.eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const comentario = await db.ComentarioDocumento.findByPk(id);

    if (!comentario) {
      return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
    }

    // Solo el autor puede eliminar su propio comentario (o el administrador)
    const esAdmin = ['administrador'].includes(req.user.rol);
    if (comentario.autor_id !== req.user.id && !esAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este comentario' });
    }

    await comentario.destroy();
    res.json({ success: true, message: 'Comentario eliminado' });
  } catch (e) {
    console.error('Error al eliminar comentario:', e);
    res.status(500).json({ success: false, message: 'Error al eliminar el comentario' });
  }
};

// ── Marcar comentarios como leídos ──────────────────────────────────────────
// PUT /api/comentarios-documento/marcar-leido
exports.marcarLeido = async (req, res) => {
  try {
    const { tipo, id } = req.body;
    if (!tipo || !id) {
      return res.status(400).json({ success: false, message: '"tipo" e "id" son requeridos' });
    }

    await db.ComentarioDocumento.update(
      { leido: true },
      { where: { documento_tipo: tipo, documento_id: parseInt(id), leido: false } }
    );

    res.json({ success: true, message: 'Comentarios marcados como leídos' });
  } catch (e) {
    console.error('Error al marcar como leídos:', e);
    res.status(500).json({ success: false, message: 'Error al marcar comentarios como leídos' });
  }
};

// ── Mis documentos con comentarios (vista del docente) ──────────────────────
// GET /api/comentarios-documento/mis-documentos?periodo=X
exports.misDocumentos = async (req, res) => {
  try {
    const { periodo } = req.query;
    const user = req.user;
    const profesor_id = user.id;

    // Resolver periodo (por nombre o ID)
    let periodoValues = [];
    if (periodo) {
      periodoValues.push(periodo.toString());
      try {
        const pr = await db.Periodo.findByPk(parseInt(periodo));
        if (pr?.nombre) periodoValues.push(pr.nombre);
      } catch (_) { /* ok */ }
      // también intentar a la inversa: si el periodo es un nombre, buscar el ID
      if (periodoValues.length === 1) {
        try {
          const pr2 = await db.Periodo.findOne({ where: { nombre: periodo } });
          if (pr2) periodoValues.push(pr2.id.toString());
        } catch (_) { /* ok */ }
      }
    }

    const whereBase = { profesor_id };
    if (periodoValues.length > 0) {
      whereBase.periodo = { [Op.in]: periodoValues };
    }

    // Obtener syllabi del docente
    const syllabi = await db.SyllabusDocente.findAll({
      where: whereBase,
      include: [
        { model: db.Asignatura, as: 'asignatura', attributes: ['id', 'nombre', 'codigo'], required: false },
      ],
      order: [['updated_at', 'DESC']],
    });

    // Obtener programas del docente
    const programas = await db.ProgramaAnaliticoDocente.findAll({
      where: whereBase,
      include: [
        { model: db.Asignatura, as: 'asignatura', attributes: ['id', 'nombre', 'codigo'], required: false },
      ],
      order: [['updated_at', 'DESC']],
    });

    // Contar comentarios por documento
    const syllabusIds = syllabi.map(s => s.id);
    const programaIds = programas.map(p => p.id);

    const comentariosSyllabus = syllabusIds.length > 0
      ? await db.ComentarioDocumento.findAll({
          where: { documento_tipo: 'syllabus', documento_id: { [Op.in]: syllabusIds } },
          attributes: ['documento_id', 'leido'],
          raw: true,
        })
      : [];

    const comentariosPrograma = programaIds.length > 0
      ? await db.ComentarioDocumento.findAll({
          where: { documento_tipo: 'programa', documento_id: { [Op.in]: programaIds } },
          attributes: ['documento_id', 'leido'],
          raw: true,
        })
      : [];

    // Agrupar conteos
    const buildConteos = (comentarios, ids) => {
      const conteos = {};
      for (const id of ids) conteos[id] = { total: 0, noLeidos: 0 };
      for (const c of comentarios) {
        if (!conteos[c.documento_id]) conteos[c.documento_id] = { total: 0, noLeidos: 0 };
        conteos[c.documento_id].total++;
        if (!c.leido) conteos[c.documento_id].noLeidos++;
      }
      return conteos;
    };

    const conteosSyllabus = buildConteos(comentariosSyllabus, syllabusIds);
    const conteosPrograma = buildConteos(comentariosPrograma, programaIds);

    const syllabusData = syllabi.map(s => ({
      id: s.id,
      tipo: 'syllabus',
      asignatura: s.asignatura,
      nombre: s.nombre,
      periodo: s.periodo,
      estado: s.estado,
      updated_at: s.updated_at,
      comentarios: conteosSyllabus[s.id] || { total: 0, noLeidos: 0 },
    }));

    const programasData = programas.map(p => ({
      id: p.id,
      tipo: 'programa',
      asignatura: p.asignatura,
      nombre: p.nombre,
      periodo: p.periodo,
      estado: p.estado,
      updated_at: p.updated_at,
      comentarios: conteosPrograma[p.id] || { total: 0, noLeidos: 0 },
    }));

    res.json({
      success: true,
      data: {
        syllabi: syllabusData,
        programas: programasData,
        totalNoLeidos:
          syllabusData.reduce((s, d) => s + d.comentarios.noLeidos, 0) +
          programasData.reduce((s, d) => s + d.comentarios.noLeidos, 0),
      },
    });
  } catch (e) {
    console.error('Error en misDocumentos:', e);
    res.status(500).json({ success: false, message: 'Error al obtener los documentos' });
  }
};
