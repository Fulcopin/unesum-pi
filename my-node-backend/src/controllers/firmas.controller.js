const crypto = require('crypto');
const QRCode = require('qrcode');
const { Op } = require('sequelize');

const {
  FirmaDocumento,
  Syllabus,
  ProgramasAnaliticos,
  Asignatura,
  Carrera,
  Facultad,
  Nivel,
  Profesor,
  Usuario,
} = require('../models');

// =========================================================================
// Configuración del flujo: NUEVO ORDEN
//   1) Decano firma primero (puede firmar todos de una vez)
//   2) Dirección de Carrera firma segundo
//   3) Docente firma al subir su syllabus / programa analítico
// =========================================================================
const ETAPAS_ORDEN = ['decano', 'direccion', 'docente'];

// Mapa rol activo del usuario -> etapa que firma
const ROL_A_ETAPA = {
  decano:              'decano',
  subdecano:           'decano',
  administrador:       'decano',
  direccion:           'direccion',
  comision:            'direccion',
  comision_academica:  'direccion',
  docente:             'docente',
  profesor:            'docente',
};

// =========================================================================
// QR personal por usuario: hash = userId en hex (8 chars) + hmac(40 chars)
// =========================================================================
const FIRMA_USER_SECRET = process.env.FIRMA_USER_SECRET || 'unesum-firma-qr-secret-2025';

function generarHashUsuario(userId) {
  const userIdHex = parseInt(userId, 10).toString(16).padStart(8, '0');
  const hmac = crypto
    .createHmac('sha256', FIRMA_USER_SECRET)
    .update(String(userId))
    .digest('hex')
    .slice(0, 40);
  return `${userIdHex}${hmac}`;
}

function userIdDesdeHash(hash) {
  try {
    const hexPart = hash.slice(0, 8);
    return parseInt(hexPart, 16);
  } catch {
    return null;
  }
}

function verificarHashUsuario(hash, userId) {
  return hash === generarHashUsuario(userId);
}

// Tipos de documento soportados
const TIPOS_VALIDOS = new Set(['syllabus', 'programa_analitico']);

// =========================================================================
// Helpers
// =========================================================================
function generarHashFirma(payload) {
  const data = `${payload.documento_tipo}|${payload.documento_id}|${payload.etapa}|${payload.usuario_id}|${Date.now()}|${crypto.randomBytes(8).toString('hex')}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 48);
}

function nombreUsuario(user) {
  if (!user) return null;
  const partes = [user.nombres, user.apellidos].filter(Boolean);
  if (partes.length > 0) return partes.join(' ').trim();
  return user.correo_electronico || user.email || `Usuario ${user.id}`;
}

function urlVerificacion(req, hash) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendBase}/firmas/verificar/${hash}`;
}

async function obtenerDocumento(tipo, id) {
  if (tipo === 'syllabus') {
    return Syllabus.findByPk(id, {
      include: [
        { model: Asignatura, as: 'asignatura' },
        { model: Profesor, as: 'profesor' },
      ],
    });
  }
  if (tipo === 'programa_analitico') {
    return ProgramasAnaliticos.findByPk(id, {
      include: [{ model: Asignatura, as: 'asignatura' }],
    });
  }
  return null;
}

// Devuelve las firmas de un documento como objeto { etapa: registro }
async function firmasDeDocumento(tipo, id) {
  const lista = await FirmaDocumento.findAll({
    where: { documento_tipo: tipo, documento_id: id },
    order: [['firmado_at', 'ASC']],
  });
  const porEtapa = {};
  for (const f of lista) porEtapa[f.etapa] = f;
  return { lista, porEtapa };
}

function siguienteEtapa(porEtapa) {
  for (const etapa of ETAPAS_ORDEN) {
    if (!porEtapa[etapa]) return etapa;
  }
  return null; // Todas firmadas
}

// =========================================================================
// POST /api/firmas/:tipo/:id/firmar
// Firma el documento como la etapa correspondiente al rol activo.
// =========================================================================
exports.firmar = async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const { observaciones } = req.body;

    if (!TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo de documento inválido' });
    }

    const documentoId = parseInt(id, 10);
    if (!documentoId || Number.isNaN(documentoId)) {
      return res.status(400).json({ success: false, message: 'ID de documento inválido' });
    }

    const documento = await obtenerDocumento(tipo, documentoId);
    if (!documento) {
      return res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }

    const rolActivo = req.user?.rol;
    const etapaSolicitada = ROL_A_ETAPA[rolActivo];
    if (!etapaSolicitada) {
      return res.status(403).json({
        success: false,
        message: `Tu rol "${rolActivo}" no participa en el flujo de firmas`,
      });
    }

    const { porEtapa } = await firmasDeDocumento(tipo, documentoId);

    if (porEtapa[etapaSolicitada]) {
      return res.status(409).json({
        success: false,
        message: `Este documento ya fue firmado en la etapa "${etapaSolicitada}"`,
      });
    }
    // Sin filtro secuencial: cualquier etapa puede firmar en cualquier momento

    const hash = generarHashFirma({
      documento_tipo: tipo,
      documento_id: documentoId,
      etapa: etapaSolicitada,
      usuario_id: req.user.id,
    });

    const nueva = await FirmaDocumento.create({
      documento_tipo: tipo,
      documento_id: documentoId,
      etapa: etapaSolicitada,
      usuario_id: req.user.id,
      usuario_nombre: nombreUsuario(req.user),
      usuario_rol: rolActivo,
      hash_firma: hash,
      observaciones: observaciones ? String(observaciones).trim() : null,
      firmado_at: new Date(),
    });

    const qrDataUrl = await QRCode.toDataURL(urlVerificacion(req, hash), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
    });

    return res.status(201).json({
      success: true,
      message: `Firma registrada como "${etapaSolicitada}"`,
      data: {
        firma: nueva,
        qr_data_url: qrDataUrl,
        url_verificacion: urlVerificacion(req, hash),
      },
    });
  } catch (error) {
    console.error('[firmas:firmar] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar la firma',
      error: error.message,
    });
  }
};

// =========================================================================
// GET /api/firmas/:tipo/:id
// Devuelve todas las firmas del documento + info del doc + QR de cada firma.
// =========================================================================
exports.obtenerFirmas = async (req, res) => {
  try {
    const { tipo, id } = req.params;
    if (!TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo de documento inválido' });
    }

    const docId = parseInt(id, 10);

    // Cargar info del documento junto con las firmas
    const [{ lista, porEtapa }, documento] = await Promise.all([
      firmasDeDocumento(tipo, docId),
      obtenerDocumento(tipo, docId),
    ]);

    const firmasConQR = await Promise.all(
      lista.map(async (f) => {
        const qr = await QRCode.toDataURL(urlVerificacion(req, f.hash_firma), {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 180,
        });
        return { ...f.toJSON(), qr_data_url: qr, url_verificacion: urlVerificacion(req, f.hash_firma) };
      })
    );

    const etapas = ETAPAS_ORDEN.map((etapa) => {
      const firma = porEtapa[etapa];
      return {
        etapa,
        firmado: !!firma,
        firma: firma ? firmasConQR.find((x) => x.etapa === etapa) : null,
      };
    });

    // Info del documento
    let infoDoc = null;
    if (documento) {
      infoDoc = {
        id: documento.id,
        nombre: documento.nombre,
        periodo: documento.periodo,
        asignatura: documento.asignatura
          ? {
              id: documento.asignatura.id,
              nombre: documento.asignatura.nombre,
              codigo: documento.asignatura.codigo,
            }
          : null,
        profesor: documento.profesor
          ? { id: documento.profesor.id, nombre: nombreUsuario(documento.profesor) }
          : null,
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        documento_tipo: tipo,
        documento_id: docId,
        documento: infoDoc,
        etapas,
        siguiente_etapa: siguienteEtapa(porEtapa),
        total_firmas: lista.length,
        completo: lista.length === ETAPAS_ORDEN.length,
      },
    });
  } catch (error) {
    console.error('[firmas:obtenerFirmas] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener firmas',
      error: error.message,
    });
  }
};

// =========================================================================
// GET /api/firmas/verificar/:hash  (PÚBLICO, sin auth)
// =========================================================================
exports.verificar = async (req, res) => {
  try {
    const { hash } = req.params;
    const firma = await FirmaDocumento.findOne({ where: { hash_firma: hash } });
    if (!firma) {
      return res.status(404).json({
        success: false,
        valido: false,
        message: 'Firma no encontrada o inválida',
      });
    }

    let documento = null;
    let asignatura = null;
    if (firma.documento_tipo === 'syllabus') {
      documento = await Syllabus.findByPk(firma.documento_id, {
        include: [{ model: Asignatura, as: 'asignatura' }],
      });
    } else if (firma.documento_tipo === 'programa_analitico') {
      documento = await ProgramasAnaliticos.findByPk(firma.documento_id, {
        include: [{ model: Asignatura, as: 'asignatura' }],
      });
    }
    if (documento?.asignatura) {
      asignatura = {
        id: documento.asignatura.id,
        nombre: documento.asignatura.nombre,
        codigo: documento.asignatura.codigo,
      };
    }

    return res.status(200).json({
      success: true,
      valido: true,
      data: {
        firma: {
          id: firma.id,
          etapa: firma.etapa,
          usuario_nombre: firma.usuario_nombre,
          usuario_rol: firma.usuario_rol,
          firmado_at: firma.firmado_at,
          observaciones: firma.observaciones,
          hash_firma: firma.hash_firma,
        },
        documento: documento
          ? {
              tipo: firma.documento_tipo,
              id: firma.documento_id,
              nombre: documento.nombre,
              periodo: documento.periodo,
              asignatura,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('[firmas:verificar] Error:', error);
    return res.status(500).json({
      success: false,
      valido: false,
      message: 'Error al verificar la firma',
      error: error.message,
    });
  }
};

// =========================================================================
// GET /api/firmas/pendientes?tipo=&periodo=&carrera_id=&nivel_id=
// Lista documentos que le toca firmar al rol activo del usuario.
// =========================================================================
exports.pendientes = async (req, res) => {
  try {
    const rolActivo = req.user?.rol;
    const etapaUsuario = ROL_A_ETAPA[rolActivo];
    if (!etapaUsuario) {
      return res.status(403).json({
        success: false,
        message: `Tu rol "${rolActivo}" no participa en el flujo de firmas`,
      });
    }

    const tipo = req.query.tipo;
    if (tipo && !TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    const tiposABuscar = tipo ? [tipo] : Array.from(TIPOS_VALIDOS);
    const { periodo, carrera_id, nivel_id } = req.query;

    const resultados = [];

    for (const t of tiposABuscar) {
      let docs = [];
      const includeAsignatura = {
        model: Asignatura,
        as: 'asignatura',
        required: false,
        include: [
          { model: Carrera, as: 'carrera', required: false, include: [{ model: Facultad, as: 'facultad', required: false }] },
          { model: Nivel, as: 'nivel', required: false },
        ],
      };

      const whereDoc = {};
      if (periodo) whereDoc.periodo = periodo;

      if (t === 'syllabus') {
        docs = await Syllabus.findAll({
          where: whereDoc,
          include: [includeAsignatura, { model: Profesor, as: 'profesor', required: false }],
          order: [['id', 'DESC']],
          limit: 500,
        });
      } else if (t === 'programa_analitico') {
        docs = await ProgramasAnaliticos.findAll({
          where: whereDoc,
          include: [includeAsignatura],
          order: [['id', 'DESC']],
          limit: 500,
        });
      }

      for (const d of docs) {
        if (carrera_id && d.asignatura?.carrera_id?.toString() !== carrera_id.toString()) continue;
        if (nivel_id && d.asignatura?.nivel_id?.toString() !== nivel_id.toString()) continue;

        const { porEtapa } = await firmasDeDocumento(t, d.id);

        // Mostrar si el usuario aún NO ha firmado este documento (sin bloqueo secuencial)
        if (porEtapa[etapaUsuario]) continue;

        const sigEtapa = siguienteEtapa(porEtapa);

        resultados.push({
          tipo: t,
          id: d.id,
          nombre: d.nombre,
          periodo: d.periodo,
          asignatura: d.asignatura
            ? {
                id: d.asignatura.id,
                nombre: d.asignatura.nombre,
                codigo: d.asignatura.codigo,
                carrera: d.asignatura.carrera
                  ? { id: d.asignatura.carrera.id, nombre: d.asignatura.carrera.nombre }
                  : null,
                facultad: d.asignatura.carrera?.facultad
                  ? { id: d.asignatura.carrera.facultad.id, nombre: d.asignatura.carrera.facultad.nombre }
                  : null,
                nivel: d.asignatura.nivel
                  ? { id: d.asignatura.nivel.id, nombre: d.asignatura.nivel.nombre }
                  : null,
              }
            : null,
          profesor: d.profesor
            ? {
                id: d.profesor.id,
                nombre: nombreUsuario(d.profesor),
              }
            : null,
          firmas: ETAPAS_ORDEN.map((e) => ({
            etapa: e,
            firmado: !!porEtapa[e],
            usuario_nombre: porEtapa[e]?.usuario_nombre || null,
            firmado_at: porEtapa[e]?.firmado_at || null,
          })),
          siguiente_etapa: sigEtapa,
        });
      }
    }

    return res.status(200).json({ success: true, data: resultados, etapa_usuario: etapaUsuario });
  } catch (error) {
    console.error('[firmas:pendientes] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al listar pendientes',
      error: error.message,
    });
  }
};

// =========================================================================
// GET /api/firmas/listar?tipo=&periodo=&carrera_id=&nivel_id=
// Lista TODOS los documentos con su estado de firmas (no solo pendientes).
// Útil para vistas de decano/dirección en modo "ver todo".
// =========================================================================
exports.listar = async (req, res) => {
  try {
    const tipo = req.query.tipo;
    if (tipo && !TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    const tiposABuscar = tipo ? [tipo] : Array.from(TIPOS_VALIDOS);
    const { periodo, carrera_id, nivel_id } = req.query;

    const resultados = [];

    for (const t of tiposABuscar) {
      let docs = [];
      const includeAsignatura = {
        model: Asignatura,
        as: 'asignatura',
        required: false,
        include: [
          { model: Carrera, as: 'carrera', required: false, include: [{ model: Facultad, as: 'facultad', required: false }] },
          { model: Nivel, as: 'nivel', required: false },
        ],
      };
      const whereDoc = {};
      if (periodo) whereDoc.periodo = periodo;

      if (t === 'syllabus') {
        docs = await Syllabus.findAll({
          where: whereDoc,
          include: [includeAsignatura, { model: Profesor, as: 'profesor', required: false }],
          order: [['id', 'DESC']],
          limit: 1000,
        });
      } else if (t === 'programa_analitico') {
        docs = await ProgramasAnaliticos.findAll({
          where: whereDoc,
          include: [includeAsignatura],
          order: [['id', 'DESC']],
          limit: 1000,
        });
      }

      for (const d of docs) {
        if (carrera_id && d.asignatura?.carrera_id?.toString() !== carrera_id.toString()) continue;
        if (nivel_id && d.asignatura?.nivel_id?.toString() !== nivel_id.toString()) continue;

        const { porEtapa } = await firmasDeDocumento(t, d.id);
        const sigEtapa = siguienteEtapa(porEtapa);

        resultados.push({
          tipo: t,
          id: d.id,
          nombre: d.nombre,
          periodo: d.periodo,
          asignatura: d.asignatura
            ? {
                id: d.asignatura.id,
                nombre: d.asignatura.nombre,
                codigo: d.asignatura.codigo,
                carrera: d.asignatura.carrera
                  ? { id: d.asignatura.carrera.id, nombre: d.asignatura.carrera.nombre }
                  : null,
                facultad: d.asignatura.carrera?.facultad
                  ? { id: d.asignatura.carrera.facultad.id, nombre: d.asignatura.carrera.facultad.nombre }
                  : null,
                nivel: d.asignatura.nivel
                  ? { id: d.asignatura.nivel.id, nombre: d.asignatura.nivel.nombre }
                  : null,
              }
            : null,
          profesor: d.profesor ? { id: d.profesor.id, nombre: nombreUsuario(d.profesor) } : null,
          firmas: ETAPAS_ORDEN.map((e) => ({
            etapa: e,
            firmado: !!porEtapa[e],
            usuario_nombre: porEtapa[e]?.usuario_nombre || null,
            firmado_at: porEtapa[e]?.firmado_at || null,
          })),
          siguiente_etapa: sigEtapa,
          completo: !sigEtapa,
        });
      }
    }

    return res.status(200).json({ success: true, data: resultados });
  } catch (error) {
    console.error('[firmas:listar] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al listar documentos',
      error: error.message,
    });
  }
};

// =========================================================================
// GET /api/firmas/reporte-qr?tipo=&periodo=
// Genera QR codes para todos los documentos con al menos 1 firma.
// Usado por el admin para ver/imprimir QRs de todos los docentes.
// =========================================================================
exports.reporteQR = async (req, res) => {
  try {
    const tipo = req.query.tipo;
    if (tipo && !TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    const tiposABuscar = tipo ? [tipo] : Array.from(TIPOS_VALIDOS);
    const { periodo } = req.query;
    const resultados = [];

    for (const t of tiposABuscar) {
      let docs = [];
      const includeAsignatura = {
        model: Asignatura,
        as: 'asignatura',
        required: false,
        include: [
          { model: Carrera, as: 'carrera', required: false },
          { model: Nivel, as: 'nivel', required: false },
        ],
      };
      const whereDoc = {};
      if (periodo) whereDoc.periodo = periodo;

      if (t === 'syllabus') {
        docs = await Syllabus.findAll({
          where: whereDoc,
          include: [includeAsignatura, { model: Profesor, as: 'profesor', required: false }],
          order: [['id', 'DESC']],
          limit: 500,
        });
      } else if (t === 'programa_analitico') {
        docs = await ProgramasAnaliticos.findAll({
          where: whereDoc,
          include: [includeAsignatura],
          order: [['id', 'DESC']],
          limit: 500,
        });
      }

      for (const d of docs) {
        const { lista, porEtapa } = await firmasDeDocumento(t, d.id);
        if (lista.length === 0) continue;

        const firmasConQR = await Promise.all(
          lista.map(async (f) => {
            const qr = await QRCode.toDataURL(urlVerificacion(req, f.hash_firma), {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 200,
            });
            return {
              ...f.toJSON(),
              qr_data_url: qr,
              url_verificacion: urlVerificacion(req, f.hash_firma),
            };
          })
        );

        resultados.push({
          tipo: t,
          id: d.id,
          nombre: d.nombre,
          periodo: d.periodo,
          asignatura: d.asignatura
            ? {
                id: d.asignatura.id,
                nombre: d.asignatura.nombre,
                codigo: d.asignatura.codigo,
                carrera: d.asignatura.carrera
                  ? { id: d.asignatura.carrera.id, nombre: d.asignatura.carrera.nombre }
                  : null,
                nivel: d.asignatura.nivel
                  ? { id: d.asignatura.nivel.id, nombre: d.asignatura.nivel.nombre }
                  : null,
              }
            : null,
          profesor: d.profesor
            ? { id: d.profesor.id, nombre: nombreUsuario(d.profesor) }
            : null,
          firmas: ETAPAS_ORDEN.map((e) => {
            const firmaConQR = firmasConQR.find((f) => f.etapa === e);
            return {
              etapa: e,
              firmado: !!porEtapa[e],
              firma: firmaConQR || null,
            };
          }),
          completo: !siguienteEtapa(porEtapa),
          total_firmas: lista.length,
        });
      }
    }

    return res.status(200).json({ success: true, data: resultados, total: resultados.length });
  } catch (error) {
    console.error('[firmas:reporteQR] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar reporte QR',
      error: error.message,
    });
  }
};

// =========================================================================
// GET /api/firmas/qr-por-documento?tipo=syllabus&periodo=
// Genera un QR único por cada documento apuntando a la página de firma directa.
// El usuario escanea → va a /firmas/firmar/{tipo}/{id} → inicia sesión y firma.
// =========================================================================
exports.qrPorDocumento = async (req, res) => {
  try {
    const tipo = req.query.tipo;
    if (tipo && !TIPOS_VALIDOS.has(tipo)) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    const tiposABuscar = tipo ? [tipo] : Array.from(TIPOS_VALIDOS);
    const { periodo } = req.query;
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';

    const whereDoc = {};
    if (periodo) whereDoc.periodo = periodo;

    const includeAsignatura = {
      model: Asignatura,
      as: 'asignatura',
      required: false,
      include: [
        { model: Carrera, as: 'carrera', required: false },
        { model: Nivel, as: 'nivel', required: false },
      ],
    };

    const resultados = [];

    for (const t of tiposABuscar) {
      let docs = [];
      if (t === 'syllabus') {
        docs = await Syllabus.findAll({
          where: whereDoc,
          include: [includeAsignatura, { model: Profesor, as: 'profesor', required: false }],
          order: [['id', 'DESC']],
          limit: 500,
        });
      } else {
        docs = await ProgramasAnaliticos.findAll({
          where: whereDoc,
          include: [includeAsignatura],
          order: [['id', 'DESC']],
          limit: 500,
        });
      }

      for (const d of docs) {
        const { porEtapa } = await firmasDeDocumento(t, d.id);
        const sigEtapa = siguienteEtapa(porEtapa);
        const firmadosCount = ETAPAS_ORDEN.filter((e) => porEtapa[e]).length;

        // URL directa de firma para este documento
        const urlFirma = `${frontendBase}/firmas/firmar/${t}/${d.id}`;

        const qrDataUrl = await QRCode.toDataURL(urlFirma, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 220,
        });

        resultados.push({
          tipo: t,
          id: d.id,
          nombre: d.nombre,
          periodo: d.periodo,
          url_firma: urlFirma,
          qr_data_url: qrDataUrl,
          asignatura: d.asignatura
            ? {
                id: d.asignatura.id,
                nombre: d.asignatura.nombre,
                codigo: d.asignatura.codigo,
                carrera: d.asignatura.carrera
                  ? { id: d.asignatura.carrera.id, nombre: d.asignatura.carrera.nombre }
                  : null,
                nivel: d.asignatura.nivel
                  ? { id: d.asignatura.nivel.id, nombre: d.asignatura.nivel.nombre }
                  : null,
              }
            : null,
          profesor: d.profesor
            ? { id: d.profesor.id, nombre: nombreUsuario(d.profesor) }
            : null,
          siguiente_etapa: sigEtapa,
          firmas_completadas: firmadosCount,
          total_etapas: ETAPAS_ORDEN.length,
          completo: !sigEtapa,
        });
      }
    }

    // Agrupar por profesor
    const porProfesor = new Map();
    for (const r of resultados) {
      const key = r.profesor ? String(r.profesor.id) : 'sin-docente';
      if (!porProfesor.has(key)) {
        porProfesor.set(key, {
          profesor: r.profesor,
          documentos: [],
        });
      }
      porProfesor.get(key).documentos.push(r);
    }

    const agrupado = Array.from(porProfesor.values()).sort((a, b) => {
      const na = a.profesor?.nombre || 'zzz';
      const nb = b.profesor?.nombre || 'zzz';
      return na.localeCompare(nb);
    });

    return res.status(200).json({
      success: true,
      total: resultados.length,
      data: agrupado,
    });
  } catch (error) {
    console.error('[firmas:qrPorDocumento] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar QR por documento',
      error: error.message,
    });
  }
};

// =========================================================================
// GET /api/firmas/invitaciones-qr?etapa=docente&periodo=
// Genera QR de invitación por docente apuntando a la página de firma del frontend.
// Un QR por docente por tipo de documento, para imprimir y entregar.
// =========================================================================
exports.invitacionesQR = async (req, res) => {
  try {
    const etapa = req.query.etapa || 'docente';
    const { periodo } = req.query;
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';

    const etapaIdx = ETAPAS_ORDEN.indexOf(etapa);
    if (etapaIdx === -1) {
      return res.status(400).json({ success: false, message: 'Etapa inválida' });
    }

    const whereDoc = {};
    if (periodo) whereDoc.periodo = periodo;

    const includeAsignatura = {
      model: Asignatura,
      as: 'asignatura',
      required: false,
      include: [{ model: Carrera, as: 'carrera', required: false }],
    };

    // Cargar syllabi y PAs
    const [syllabi, programas] = await Promise.all([
      Syllabus.findAll({
        where: whereDoc,
        include: [includeAsignatura, { model: Profesor, as: 'profesor', required: false }],
        order: [['id', 'DESC']],
        limit: 1000,
      }),
      ProgramasAnaliticos.findAll({
        where: whereDoc,
        include: [includeAsignatura],
        order: [['id', 'DESC']],
        limit: 1000,
      }),
    ]);

    // Agrupar por profesor: { profesorId -> { nombre, syllabusPendientes, paPendientes } }
    const docenteMap = new Map();

    const procesarDoc = async (doc, tipo) => {
      const { porEtapa } = await firmasDeDocumento(tipo, doc.id);
      const sigEtapa = siguienteEtapa(porEtapa);
      if (sigEtapa !== etapa) return; // No le toca al etapa solicitado

      const profId = doc.profesor?.id ?? `sin-${doc.asignatura?.id ?? doc.id}`;
      const profNombre = doc.profesor
        ? nombreUsuario(doc.profesor)
        : `Sin docente (${doc.asignatura?.nombre || 'Asignatura ' + doc.id})`;
      const profEmail = doc.profesor?.correo_electronico || doc.profesor?.email || null;

      if (!docenteMap.has(profId)) {
        docenteMap.set(profId, {
          profesorId: doc.profesor?.id ?? null,
          profesorNombre: profNombre,
          profesorEmail: profEmail,
          syllabusPendientes: [],
          paPendientes: [],
        });
      }
      const entrada = docenteMap.get(profId);
      if (tipo === 'syllabus') {
        entrada.syllabusPendientes.push({
          id: doc.id,
          nombre: doc.nombre,
          periodo: doc.periodo,
          asignatura: doc.asignatura
            ? { id: doc.asignatura.id, nombre: doc.asignatura.nombre, codigo: doc.asignatura.codigo }
            : null,
          carrera: doc.asignatura?.carrera
            ? { id: doc.asignatura.carrera.id, nombre: doc.asignatura.carrera.nombre }
            : null,
        });
      } else {
        entrada.paPendientes.push({
          id: doc.id,
          nombre: doc.nombre,
          periodo: doc.periodo,
          asignatura: doc.asignatura
            ? { id: doc.asignatura.id, nombre: doc.asignatura.nombre, codigo: doc.asignatura.codigo }
            : null,
          carrera: doc.asignatura?.carrera
            ? { id: doc.asignatura.carrera.id, nombre: doc.asignatura.carrera.nombre }
            : null,
        });
      }
    };

    await Promise.all([
      ...syllabi.map((d) => procesarDoc(d, 'syllabus')),
      ...programas.map((d) => procesarDoc(d, 'programa_analitico')),
    ]);

    // Para cada docente con pendientes, generar QR apuntando a la página de firma
    const rolPath =
      etapa === 'docente'
        ? 'docente'
        : etapa === 'comision_academica'
        ? 'comision'
        : etapa === 'direccion'
        ? 'direccion'
        : 'decano';

    const resultados = [];
    for (const [, entrada] of docenteMap) {
      const pendientes = entrada.syllabusPendientes.length + entrada.paPendientes.length;
      if (pendientes === 0) continue;

      // QR de syllabus (si tiene pendientes de syllabus)
      let qrSyllabus = null;
      if (entrada.syllabusPendientes.length > 0) {
        const url = `${frontendBase}/dashboard/${rolPath}/firmar-syllabus`;
        qrSyllabus = await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 220,
        });
      }

      // QR de programa analítico (si tiene pendientes de PA)
      let qrPA = null;
      if (entrada.paPendientes.length > 0) {
        const url = `${frontendBase}/dashboard/${rolPath}/firmar-programa-analitico`;
        qrPA = await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 220,
        });
      }

      resultados.push({
        profesorId: entrada.profesorId,
        profesorNombre: entrada.profesorNombre,
        profesorEmail: entrada.profesorEmail,
        syllabusPendientes: entrada.syllabusPendientes,
        paPendientes: entrada.paPendientes,
        totalPendientes: pendientes,
        qr_syllabus: qrSyllabus,
        qr_programa_analitico: qrPA,
        url_syllabus: entrada.syllabusPendientes.length > 0
          ? `${frontendBase}/dashboard/${rolPath}/firmar-syllabus`
          : null,
        url_programa_analitico: entrada.paPendientes.length > 0
          ? `${frontendBase}/dashboard/${rolPath}/firmar-programa-analitico`
          : null,
      });
    }

    resultados.sort((a, b) => a.profesorNombre.localeCompare(b.profesorNombre));

    return res.status(200).json({
      success: true,
      etapa,
      total_docentes: resultados.length,
      data: resultados,
    });
  } catch (error) {
    console.error('[firmas:invitacionesQR] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar invitaciones QR',
      error: error.message,
    });
  }
};

// =========================================================================
// GET /api/firmas/mi-qr   (usuario autenticado)
// Devuelve el QR personal del usuario logueado.
// =========================================================================
exports.miQR = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const hash = generarHashUsuario(userId);
    const url = `${frontendBase}/firmas/verificar-usuario/${hash}`;

    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 260,
    });

    return res.json({
      success: true,
      data: {
        hash,
        url_verificacion: url,
        qr_data_url: qrDataUrl,
        usuario: {
          id: userId,
          nombres: req.user.nombres,
          apellidos: req.user.apellidos,
          correo_electronico: req.user.correo_electronico || req.user.email,
          rol: req.user.rol,
        },
      },
    });
  } catch (error) {
    console.error('[firmas:miQR]', error);
    return res.status(500).json({ success: false, message: 'Error al generar QR personal', error: error.message });
  }
};

// =========================================================================
// GET /api/firmas/verificar-usuario/:hash  (PÚBLICO)
// Verifica el QR personal de un usuario.
// =========================================================================
exports.verificarUsuarioQR = async (req, res) => {
  try {
    const { hash } = req.params;
    const userId = userIdDesdeHash(hash);
    if (!userId) return res.status(400).json({ success: false, valido: false, message: 'Hash inválido' });

    if (!verificarHashUsuario(hash, userId)) {
      return res.status(404).json({ success: false, valido: false, message: 'QR no válido' });
    }

    const usuario = await Usuario.findByPk(userId);
    if (!usuario) return res.status(404).json({ success: false, valido: false, message: 'Usuario no encontrado' });

    return res.json({
      success: true,
      valido: true,
      data: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo_electronico: usuario.correo_electronico,
        rol: usuario.rol,
        roles: usuario.roles,
        facultad: usuario.facultad,
        carrera: usuario.carrera,
        cedula_identidad: usuario.cedula_identidad,
      },
    });
  } catch (error) {
    console.error('[firmas:verificarUsuarioQR]', error);
    return res.status(500).json({ success: false, valido: false, message: 'Error al verificar', error: error.message });
  }
};

// =========================================================================
// GET /api/firmas/qr-todos-usuarios   (admin)
// Genera el QR personal de TODOS los usuarios del sistema.
// =========================================================================
exports.qrTodosUsuarios = async (req, res) => {
  try {
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const { rol } = req.query;

    const where = { estado: true };
    if (rol) where.rol = rol;

    const usuarios = await Usuario.findAll({
      where,
      order: [['apellidos', 'ASC'], ['nombres', 'ASC']],
      limit: 500,
    });

    const resultado = await Promise.all(
      usuarios.map(async (u) => {
        const hash = generarHashUsuario(u.id);
        const url = `${frontendBase}/firmas/verificar-usuario/${hash}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 220,
        });
        return {
          id: u.id,
          nombres: u.nombres,
          apellidos: u.apellidos,
          correo_electronico: u.correo_electronico,
          rol: u.rol,
          roles: u.roles,
          facultad: u.facultad,
          carrera: u.carrera,
          cedula_identidad: u.cedula_identidad,
          hash_qr: hash,
          url_verificacion: url,
          qr_data_url: qrDataUrl,
        };
      })
    );

    return res.json({ success: true, total: resultado.length, data: resultado });
  } catch (error) {
    console.error('[firmas:qrTodosUsuarios]', error);
    return res.status(500).json({ success: false, message: 'Error al generar QRs de usuarios', error: error.message });
  }
};

// =========================================================================
// POST /api/firmas/firmar-masivo
// El decano (o director) firma TODOS los documentos pendientes de su etapa.
// Body: { tipo?: 'syllabus'|'programa_analitico', periodo?: string, ids?: number[] }
// =========================================================================
exports.firmarMasivo = async (req, res) => {
  try {
    const rolActivo = req.user?.rol;
    const etapaSolicitada = ROL_A_ETAPA[rolActivo];
    if (!etapaSolicitada) {
      return res.status(403).json({ success: false, message: `Tu rol "${rolActivo}" no participa en el flujo de firmas` });
    }

    const { tipo, periodo, ids, observaciones } = req.body;
    const tiposABuscar = tipo && TIPOS_VALIDOS.has(tipo) ? [tipo] : Array.from(TIPOS_VALIDOS);

    const whereDoc = {};
    if (periodo) whereDoc.periodo = periodo;

    const includeAsignatura = {
      model: Asignatura,
      as: 'asignatura',
      required: false,
    };

    const resultados = { firmados: [], omitidos: [], errores: [] };

    for (const t of tiposABuscar) {
      let docs = [];
      if (t === 'syllabus') {
        const where = { ...whereDoc };
        if (ids && ids.length > 0) where.id = ids;
        docs = await Syllabus.findAll({
          where,
          include: [includeAsignatura, { model: Profesor, as: 'profesor', required: false }],
          limit: 500,
        });
      } else {
        const where = { ...whereDoc };
        if (ids && ids.length > 0) where.id = ids;
        docs = await ProgramasAnaliticos.findAll({
          where,
          include: [includeAsignatura],
          limit: 500,
        });
      }

      for (const d of docs) {
        try {
          const { porEtapa } = await firmasDeDocumento(t, d.id);

          if (porEtapa[etapaSolicitada]) {
            resultados.omitidos.push({ tipo: t, id: d.id, razon: 'Ya firmado' });
            continue;
          }

          const indiceEtapa = ETAPAS_ORDEN.indexOf(etapaSolicitada);
          const previas = ETAPAS_ORDEN.slice(0, indiceEtapa);
          const faltantes = previas.filter((e) => !porEtapa[e]);
          if (faltantes.length > 0) {
            resultados.omitidos.push({ tipo: t, id: d.id, razon: `Faltan firmas: ${faltantes.join(', ')}` });
            continue;
          }

          const hash = generarHashFirma({
            documento_tipo: t,
            documento_id: d.id,
            etapa: etapaSolicitada,
            usuario_id: req.user.id,
          });

          await FirmaDocumento.create({
            documento_tipo: t,
            documento_id: d.id,
            etapa: etapaSolicitada,
            usuario_id: req.user.id,
            usuario_nombre: nombreUsuario(req.user),
            usuario_rol: rolActivo,
            hash_firma: hash,
            observaciones: observaciones ? String(observaciones).trim() : null,
            firmado_at: new Date(),
          });

          resultados.firmados.push({ tipo: t, id: d.id, hash });
        } catch (e) {
          resultados.errores.push({ tipo: t, id: d.id, error: e.message });
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `Firma masiva completada: ${resultados.firmados.length} firmado(s), ${resultados.omitidos.length} omitido(s)`,
      data: resultados,
    });
  } catch (error) {
    console.error('[firmas:firmarMasivo]', error);
    return res.status(500).json({ success: false, message: 'Error en firma masiva', error: error.message });
  }
};

exports.ETAPAS_ORDEN = ETAPAS_ORDEN;
exports.generarHashUsuario = generarHashUsuario;
