// habilitaciones.controller.js
//
// Habilitaciones excepcionales de docentes: cuando la ventana del cronograma
// para editar/subir el syllabus ya cerró, se le puede reabrir a un docente
// concreto. Hay dos formas de arrancar el trámite, y las dos terminan igual:
//
//   a) El DOCENTE la pide          → estado 'solicitada'
//      El COORDINADOR la tramita   → estado 'pendiente'
//   b) El COORDINADOR la pide      → estado 'pendiente' directamente
//
//   El DECANO/A o el DIRECTOR/A ACADÉMICO/A autorizan → estado 'aprobada'
//   (basta con que uno de los dos apruebe)
//
// Una vez aprobada, el módulo vuelve a estar visible para ese docente hasta la
// fecha límite de la habilitación.
//
// El enganche real vive en cronograma.controller.js → getModulosOcultos, que
// consulta `habilitacionesVigentesDe()` para forzar la visibilidad.

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

// Módulos que una habilitación puede reabrir. Se valida contra esta lista para
// que nadie pueda colar un href arbitrario en la tabla.
const MODULOS_HABILITABLES = {
  '/dashboard/docente/editor-syllabus': 'Editar Syllabus',
  '/dashboard/docente/editor-programa-analitico': 'Editar Programa Analítico',
  '/dashboard/docente/mis-documentos': 'Ver e Imprimir mis documentos',
  '/dashboard/docente/mis-firmas': 'Firmar mis documentos',
};

// 'solicitada' = la pidió el propio docente y espera que su coordinador la
// tramite; hasta entonces NO aparece en la bandeja del decano ni de dirección.
const ESTADOS = ['solicitada', 'pendiente', 'aprobada', 'rechazada', 'revocada'];

// Estados en los que el trámite sigue abierto: sirven para no dejar que un
// mismo docente acumule solicitudes duplicadas.
const ESTADOS_ABIERTOS = ['solicitada', 'pendiente'];

// Roles que pueden autorizar. El usuario pidió explícitamente que baste con
// uno de los dos; subdecano y administrador se incluyen porque en el resto del
// sistema (firmas.controller.js) actúan como suplentes de esas mismas etapas.
const ROLES_AUTORIZADORES = ['decano', 'subdecano', 'direccion', 'administrador'];
const ROLES_COORDINADOR = ['coordinador', 'comision', 'comision_academica'];
const ROLES_DOCENTE = ['docente', 'profesor'];

const initTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.habilitaciones_docente (
      id BIGSERIAL PRIMARY KEY,
      docente_id INTEGER NOT NULL,
      docente_nombre VARCHAR(255),
      carrera_id INTEGER,
      carrera_nombre VARCHAR(255),
      facultad_id INTEGER,
      modulos TEXT NOT NULL,
      motivo TEXT,
      fecha_fin TIMESTAMP NOT NULL,
      estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
      origen VARCHAR(20) NOT NULL DEFAULT 'coordinador',
      solicitado_por INTEGER,
      solicitado_por_nombre VARCHAR(255),
      tramitado_por INTEGER,
      tramitado_por_nombre VARCHAR(255),
      tramitado_en TIMESTAMP,
      autorizado_por INTEGER,
      autorizado_por_nombre VARCHAR(255),
      autorizado_por_rol VARCHAR(50),
      observacion TEXT,
      resuelto_en TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_habilitaciones_docente ON public.habilitaciones_docente (docente_id, estado)`
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_habilitaciones_carrera ON public.habilitaciones_docente (carrera_id, estado)`
  );
  // Columnas del paso "lo pide el docente", añadidas después de la primera
  // versión de la tabla: hay que agregarlas si la tabla ya existía.
  for (const columna of [
    `origen VARCHAR(20) NOT NULL DEFAULT 'coordinador'`,
    `tramitado_por INTEGER`,
    `tramitado_por_nombre VARCHAR(255)`,
    `tramitado_en TIMESTAMP`,
  ]) {
    await sequelize.query(
      `ALTER TABLE public.habilitaciones_docente ADD COLUMN IF NOT EXISTS ${columna}`
    );
  }
};

// `modulos` se guarda como JSON en TEXT. Se lee a la defensiva porque las filas
// antiguas o editadas a mano podrían no ser JSON válido.
const parsearModulos = (valor) => {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];
  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(valor).split(',').map((m) => m.trim()).filter(Boolean);
  }
};

const nombreDe = (user) => {
  if (!user) return null;
  const partes = [user.nombres, user.apellidos].filter(Boolean);
  if (partes.length > 0) return partes.join(' ').trim();
  return user.correo_electronico || user.email || `Usuario ${user.id}`;
};

const tieneRol = (req, roles) => {
  const rolActivo = req.user?.rol;
  const todos = Array.isArray(req.user?.roles) && req.user.roles.length > 0
    ? req.user.roles
    : (rolActivo ? [rolActivo] : []);
  return roles.includes(rolActivo) || todos.some((r) => roles.includes(r));
};

// Carrera sobre la que trabaja el coordinador. Sin ella no puede listar nada:
// preferimos fallar con un mensaje claro antes que mostrarle toda la facultad.
const carreraDelCoordinador = (req) => (req.user?.carrera_id ? Number(req.user.carrera_id) : null);

const facultadDelUsuario = async (req) => {
  if (req.user?.facultad_id) return Number(req.user.facultad_id);
  if (req.user?.carrera_id) {
    const [fila] = await sequelize.query(
      `SELECT facultad_id FROM public.carreras WHERE id = :id`,
      { replacements: { id: req.user.carrera_id }, type: QueryTypes.SELECT }
    );
    if (fila?.facultad_id) return Number(fila.facultad_id);
  }
  return null;
};

const serializar = (fila) => ({
  ...fila,
  modulos: parsearModulos(fila.modulos),
  modulos_labels: parsearModulos(fila.modulos).map((m) => MODULOS_HABILITABLES[m] || m),
});

// =========================================================================
// Consultado por cronograma.controller.js: módulos que este docente tiene
// habilitados por excepción vigente en este momento.
// =========================================================================
const habilitacionesVigentesDe = async (docenteId) => {
  if (!docenteId) return [];
  await initTable();
  const filas = await sequelize.query(
    `SELECT modulos, fecha_fin, autorizado_por_nombre, autorizado_por_rol
       FROM public.habilitaciones_docente
      WHERE docente_id = :docente_id
        AND estado = 'aprobada'
        AND fecha_fin >= NOW()`,
    { replacements: { docente_id: docenteId }, type: QueryTypes.SELECT }
  );
  const vigentes = new Map();
  for (const fila of filas) {
    for (const modulo of parsearModulos(fila.modulos)) {
      const previo = vigentes.get(modulo);
      // Si hay varias habilitaciones para el mismo módulo, manda la que dure más
      if (!previo || new Date(fila.fecha_fin) > new Date(previo.fecha_fin)) {
        vigentes.set(modulo, {
          modulo,
          fecha_fin: fila.fecha_fin,
          autorizado_por_nombre: fila.autorizado_por_nombre,
          autorizado_por_rol: fila.autorizado_por_rol,
        });
      }
    }
  }
  return [...vigentes.values()];
};

// =========================================================================
// GET /api/habilitaciones/modulos
// Catálogo de módulos que se pueden habilitar (para el selector del front).
// =========================================================================
exports.getModulosHabilitables = async (_req, res) => {
  return res.json({
    success: true,
    data: Object.entries(MODULOS_HABILITABLES).map(([key, label]) => ({ key, label })),
  });
};

// =========================================================================
// GET /api/habilitaciones/docentes
// Docentes de la carrera del coordinador, con el estado de su habilitación.
// =========================================================================
exports.getDocentes = async (req, res) => {
  try {
    await initTable();

    // El coordinador queda atado a su carrera; decano/dirección/admin pueden
    // consultar cualquier carrera pasándola por query.
    const esCoordinador = tieneRol(req, ROLES_COORDINADOR) && !tieneRol(req, ['administrador']);
    let carreraId = req.query.carrera_id ? Number(req.query.carrera_id) : null;
    if (esCoordinador) carreraId = carreraDelCoordinador(req);

    if (!carreraId) {
      return res.status(400).json({
        success: false,
        message: esCoordinador
          ? 'Tu usuario no tiene una carrera asignada. Pide al administrador que la registre para poder ver a tus docentes.'
          : 'Indica la carrera con ?carrera_id=',
      });
    }

    // Un docente puede estar en la carrera por su columna directa o por la
    // tabla puente profesor_carreras (asignación múltiple).
    const docentes = await sequelize.query(
      `SELECT DISTINCT p.id, p.nombres, p.apellidos, p.email, p.activo, p.carrera_id,
              c.nombre AS carrera_nombre
         FROM public.profesores p
         LEFT JOIN public.profesor_carreras pc ON pc.profesor_id = p.id
         LEFT JOIN public.carreras c ON c.id = p.carrera_id
        WHERE (p.carrera_id = :carrera_id OR pc.carrera_id = :carrera_id)
          AND p."deletedAt" IS NULL
        ORDER BY p.apellidos ASC, p.nombres ASC`,
      { replacements: { carrera_id: carreraId }, type: QueryTypes.SELECT }
    );

    // Última habilitación relevante por docente: primero las vigentes, luego
    // las pendientes, y si no hay ninguna, la más reciente del historial.
    const habilitaciones = await sequelize.query(
      `SELECT * FROM public.habilitaciones_docente
        WHERE carrera_id = :carrera_id
        ORDER BY created_at DESC`,
      { replacements: { carrera_id: carreraId }, type: QueryTypes.SELECT }
    );

    const ahora = new Date();
    const porDocente = new Map();
    for (const h of habilitaciones) {
      const vigente = h.estado === 'aprobada' && new Date(h.fecha_fin) >= ahora;
      // Lo que el docente acaba de pedir es lo más urgente de mostrarle al
      // coordinador, por encima de una habilitación que ya está en curso.
      const prioridad = h.estado === 'solicitada' ? 4 : vigente ? 3 : h.estado === 'pendiente' ? 2 : 1;
      const previo = porDocente.get(h.docente_id);
      if (!previo || prioridad > previo.prioridad) {
        porDocente.set(h.docente_id, { prioridad, habilitacion: { ...serializar(h), vigente } });
      }
    }

    return res.json({
      success: true,
      data: docentes.map((d) => ({
        id: d.id,
        nombres: d.nombres,
        apellidos: d.apellidos,
        nombre_completo: `${d.nombres || ''} ${d.apellidos || ''}`.trim(),
        email: d.email,
        activo: d.activo,
        carrera_id: d.carrera_id,
        carrera_nombre: d.carrera_nombre,
        habilitacion: porDocente.get(d.id)?.habilitacion || null,
      })),
    });
  } catch (error) {
    console.error('Error getDocentes habilitaciones:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// POST /api/habilitaciones
// El coordinador solicita habilitar a un docente. Body:
//   { docente_id, modulos: [href], fecha_fin, motivo }
// =========================================================================
exports.crearSolicitud = async (req, res) => {
  try {
    await initTable();
    const { docente_id, modulos, fecha_fin, motivo } = req.body;

    if (!docente_id) {
      return res.status(400).json({ success: false, message: 'docente_id es obligatorio' });
    }
    const modulosPedidos = Array.isArray(modulos) ? modulos : [];
    const invalidos = modulosPedidos.filter((m) => !MODULOS_HABILITABLES[m]);
    if (modulosPedidos.length === 0 || invalidos.length > 0) {
      return res.status(400).json({
        success: false,
        message: invalidos.length > 0
          ? `Módulos no habilitables: ${invalidos.join(', ')}`
          : 'Selecciona al menos un módulo a habilitar',
      });
    }
    const limite = new Date(fecha_fin);
    if (!fecha_fin || Number.isNaN(limite.getTime())) {
      return res.status(400).json({ success: false, message: 'La fecha límite no es válida' });
    }
    if (limite <= new Date()) {
      return res.status(400).json({ success: false, message: 'La fecha límite debe ser posterior a hoy' });
    }

    const [docente] = await sequelize.query(
      `SELECT p.id, p.nombres, p.apellidos, p.carrera_id, c.nombre AS carrera_nombre, c.facultad_id
         FROM public.profesores p
         LEFT JOIN public.carreras c ON c.id = p.carrera_id
        WHERE p.id = :id AND p."deletedAt" IS NULL`,
      { replacements: { id: docente_id }, type: QueryTypes.SELECT }
    );
    if (!docente) {
      return res.status(404).json({ success: false, message: 'Docente no encontrado' });
    }

    // El coordinador solo puede pedir habilitaciones de su propia carrera
    const esCoordinador = tieneRol(req, ROLES_COORDINADOR) && !tieneRol(req, ['administrador']);
    if (esCoordinador) {
      const miCarrera = carreraDelCoordinador(req);
      if (!miCarrera) {
        return res.status(400).json({
          success: false,
          message: 'Tu usuario no tiene una carrera asignada. Pide al administrador que la registre.',
        });
      }
      const [pertenece] = await sequelize.query(
        `SELECT 1 AS ok FROM public.profesores p
          LEFT JOIN public.profesor_carreras pc ON pc.profesor_id = p.id
          WHERE p.id = :id AND (p.carrera_id = :carrera_id OR pc.carrera_id = :carrera_id)
          LIMIT 1`,
        { replacements: { id: docente_id, carrera_id: miCarrera }, type: QueryTypes.SELECT }
      );
      if (!pertenece) {
        return res.status(403).json({ success: false, message: 'Ese docente no pertenece a tu carrera' });
      }
    }

    // Un solo trámite abierto por docente evita duplicados en la bandeja del
    // decano. Si el propio docente ya la pidió, hay que tramitar esa, no crear otra.
    const [abierta] = await sequelize.query(
      `SELECT id, estado FROM public.habilitaciones_docente
        WHERE docente_id = :docente_id AND estado IN (:estados) LIMIT 1`,
      { replacements: { docente_id, estados: ESTADOS_ABIERTOS }, type: QueryTypes.SELECT }
    );
    if (abierta) {
      return res.status(409).json({
        success: false,
        message: abierta.estado === 'solicitada'
          ? 'Ese docente ya te pidió la habilitación. Tramítala desde "Solicitudes de mis docentes".'
          : 'Ese docente ya tiene una solicitud pendiente de autorización',
      });
    }

    const [result] = await sequelize.query(
      `INSERT INTO public.habilitaciones_docente
         (docente_id, docente_nombre, carrera_id, carrera_nombre, facultad_id, modulos,
          motivo, fecha_fin, estado, origen, solicitado_por, solicitado_por_nombre)
       VALUES (:docente_id, :docente_nombre, :carrera_id, :carrera_nombre, :facultad_id, :modulos,
               :motivo, :fecha_fin, 'pendiente', 'coordinador', :solicitado_por, :solicitado_por_nombre)
       RETURNING *`,
      {
        replacements: {
          docente_id,
          docente_nombre: `${docente.nombres || ''} ${docente.apellidos || ''}`.trim(),
          carrera_id: docente.carrera_id || carreraDelCoordinador(req),
          carrera_nombre: docente.carrera_nombre || null,
          facultad_id: docente.facultad_id || null,
          modulos: JSON.stringify(modulosPedidos),
          motivo: motivo?.trim() || null,
          fecha_fin: limite,
          solicitado_por: req.user?.id || null,
          solicitado_por_nombre: nombreDe(req.user),
        },
        type: QueryTypes.INSERT,
      }
    );

    const fila = Array.isArray(result) ? result[0] : result;
    return res.status(201).json({ success: true, data: serializar(fila) });
  } catch (error) {
    console.error('Error crearSolicitud habilitacion:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// POST /api/habilitaciones/solicitar   (el propio DOCENTE)
// Body: { modulos: [href], fecha_fin, motivo }
// Queda en 'solicitada': todavía no llega al decano, primero la tiene que
// tramitar el coordinador de su carrera.
// =========================================================================
exports.solicitarComoDocente = async (req, res) => {
  try {
    await initTable();
    const { modulos, fecha_fin, motivo } = req.body;

    const modulosPedidos = Array.isArray(modulos) ? modulos : [];
    const invalidos = modulosPedidos.filter((m) => !MODULOS_HABILITABLES[m]);
    if (modulosPedidos.length === 0 || invalidos.length > 0) {
      return res.status(400).json({
        success: false,
        message: invalidos.length > 0
          ? `Módulos no habilitables: ${invalidos.join(', ')}`
          : 'Selecciona al menos un módulo',
      });
    }
    const limite = new Date(fecha_fin);
    if (!fecha_fin || Number.isNaN(limite.getTime())) {
      return res.status(400).json({ success: false, message: 'La fecha límite no es válida' });
    }
    if (limite <= new Date()) {
      return res.status(400).json({ success: false, message: 'La fecha límite debe ser posterior a hoy' });
    }
    if (!motivo || !String(motivo).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Explica el motivo: es lo que va a leer tu coordinador para tramitar la solicitud',
      });
    }

    // El docente autenticado vive en la tabla `profesores`, así que su id de
    // sesión ya es el docente_id que usa la habilitación.
    const [docente] = await sequelize.query(
      `SELECT p.id, p.nombres, p.apellidos, p.carrera_id, c.nombre AS carrera_nombre, c.facultad_id
         FROM public.profesores p
         LEFT JOIN public.carreras c ON c.id = p.carrera_id
        WHERE p.id = :id AND p."deletedAt" IS NULL`,
      { replacements: { id: req.user?.id }, type: QueryTypes.SELECT }
    );
    if (!docente) {
      return res.status(404).json({ success: false, message: 'No se encontró tu ficha de docente' });
    }

    const [abierta] = await sequelize.query(
      `SELECT id, estado FROM public.habilitaciones_docente
        WHERE docente_id = :docente_id AND estado IN (:estados) LIMIT 1`,
      { replacements: { docente_id: docente.id, estados: ESTADOS_ABIERTOS }, type: QueryTypes.SELECT }
    );
    if (abierta) {
      return res.status(409).json({
        success: false,
        message: abierta.estado === 'solicitada'
          ? 'Ya tienes una solicitud enviada a tu coordinador. Espera su respuesta.'
          : 'Tu solicitud ya fue enviada a la autoridad y está esperando autorización.',
      });
    }

    const [result] = await sequelize.query(
      `INSERT INTO public.habilitaciones_docente
         (docente_id, docente_nombre, carrera_id, carrera_nombre, facultad_id, modulos,
          motivo, fecha_fin, estado, origen, solicitado_por, solicitado_por_nombre)
       VALUES (:docente_id, :docente_nombre, :carrera_id, :carrera_nombre, :facultad_id, :modulos,
               :motivo, :fecha_fin, 'solicitada', 'docente', :solicitado_por, :solicitado_por_nombre)
       RETURNING *`,
      {
        replacements: {
          docente_id: docente.id,
          docente_nombre: `${docente.nombres || ''} ${docente.apellidos || ''}`.trim(),
          carrera_id: docente.carrera_id || null,
          carrera_nombre: docente.carrera_nombre || null,
          facultad_id: docente.facultad_id || null,
          modulos: JSON.stringify(modulosPedidos),
          motivo: String(motivo).trim(),
          fecha_fin: limite,
          solicitado_por: docente.id,
          solicitado_por_nombre: `${docente.nombres || ''} ${docente.apellidos || ''}`.trim(),
        },
        type: QueryTypes.INSERT,
      }
    );

    const fila = Array.isArray(result) ? result[0] : result;
    return res.status(201).json({ success: true, data: serializar(fila) });
  } catch (error) {
    console.error('Error solicitarComoDocente:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// GET /api/habilitaciones/mias   (el propio DOCENTE)
// Sus solicitudes, para que vea en qué paso va cada una.
// =========================================================================
exports.misSolicitudes = async (req, res) => {
  try {
    await initTable();
    const filas = await sequelize.query(
      `SELECT * FROM public.habilitaciones_docente
        WHERE docente_id = :docente_id
        ORDER BY created_at DESC
        LIMIT 100`,
      { replacements: { docente_id: req.user?.id }, type: QueryTypes.SELECT }
    );
    const ahora = new Date();
    return res.json({
      success: true,
      data: filas.map((f) => ({
        ...serializar(f),
        vigente: f.estado === 'aprobada' && new Date(f.fecha_fin) >= ahora,
      })),
    });
  } catch (error) {
    console.error('Error misSolicitudes:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// PUT /api/habilitaciones/:id/tramitar   (COORDINADOR)
// Body: { accion: 'enviar' | 'descartar', modulos?, fecha_fin?, observacion? }
// El coordinador revisa lo que pidió el docente y decide si lo eleva a la
// autoridad. Puede ajustar los módulos y la fecha antes de enviarlo.
// =========================================================================
exports.tramitar = async (req, res) => {
  try {
    await initTable();
    const { accion, modulos, fecha_fin, observacion } = req.body;
    if (!['enviar', 'descartar'].includes(accion)) {
      return res.status(400).json({ success: false, message: "accion debe ser 'enviar' o 'descartar'" });
    }

    const [solicitud] = await sequelize.query(
      `SELECT * FROM public.habilitaciones_docente WHERE id = :id`,
      { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
    );
    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }
    if (solicitud.estado !== 'solicitada') {
      return res.status(409).json({
        success: false,
        message: `Esta solicitud ya no está esperando trámite (estado: ${solicitud.estado})`,
      });
    }

    // El coordinador solo tramita lo de su carrera
    const esCoordinador = tieneRol(req, ROLES_COORDINADOR) && !tieneRol(req, ['administrador']);
    if (esCoordinador) {
      const miCarrera = carreraDelCoordinador(req);
      if (!miCarrera || Number(solicitud.carrera_id) !== miCarrera) {
        return res.status(403).json({ success: false, message: 'Esa solicitud no pertenece a tu carrera' });
      }
    }

    if (accion === 'descartar') {
      const [rechazada] = await sequelize.query(
        `UPDATE public.habilitaciones_docente
            SET estado = 'rechazada',
                observacion = :observacion,
                tramitado_por = :tramitado_por,
                tramitado_por_nombre = :tramitado_por_nombre,
                tramitado_en = NOW(),
                resuelto_en = NOW(),
                updated_at = NOW()
          WHERE id = :id
          RETURNING *`,
        {
          replacements: {
            id: req.params.id,
            observacion: observacion?.trim() || 'Descartada por el coordinador de carrera',
            tramitado_por: req.user?.id || null,
            tramitado_por_nombre: nombreDe(req.user),
          },
          type: QueryTypes.UPDATE,
        }
      );
      const fila = Array.isArray(rechazada) ? rechazada[0] : rechazada;
      return res.json({ success: true, data: serializar(fila) });
    }

    // Enviar a autorización: el coordinador puede ajustar módulos y fecha
    let modulosFinales = parsearModulos(solicitud.modulos);
    if (Array.isArray(modulos) && modulos.length > 0) {
      const invalidos = modulos.filter((m) => !MODULOS_HABILITABLES[m]);
      if (invalidos.length > 0) {
        return res.status(400).json({ success: false, message: `Módulos no habilitables: ${invalidos.join(', ')}` });
      }
      modulosFinales = modulos;
    }

    let limite = new Date(solicitud.fecha_fin);
    if (fecha_fin) {
      const nueva = new Date(fecha_fin);
      if (Number.isNaN(nueva.getTime())) {
        return res.status(400).json({ success: false, message: 'La fecha límite no es válida' });
      }
      limite = nueva;
    }
    if (limite <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La fecha límite ya pasó. Ajústala antes de enviarla a autorización.',
      });
    }

    const [result] = await sequelize.query(
      `UPDATE public.habilitaciones_docente
          SET estado = 'pendiente',
              modulos = :modulos,
              fecha_fin = :fecha_fin,
              observacion = COALESCE(:observacion, observacion),
              tramitado_por = :tramitado_por,
              tramitado_por_nombre = :tramitado_por_nombre,
              tramitado_en = NOW(),
              updated_at = NOW()
        WHERE id = :id
        RETURNING *`,
      {
        replacements: {
          id: req.params.id,
          modulos: JSON.stringify(modulosFinales),
          fecha_fin: limite,
          observacion: observacion?.trim() || null,
          tramitado_por: req.user?.id || null,
          tramitado_por_nombre: nombreDe(req.user),
        },
        type: QueryTypes.UPDATE,
      }
    );

    const fila = Array.isArray(result) ? result[0] : result;
    return res.json({ success: true, data: serializar(fila) });
  } catch (error) {
    console.error('Error tramitar habilitacion:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// GET /api/habilitaciones?estado=pendiente
// Coordinador → su carrera. Decano/subdecano → su facultad. Dirección/admin → todo.
// =========================================================================
exports.listar = async (req, res) => {
  try {
    await initTable();

    const { estado } = req.query;
    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ success: false, message: `estado debe ser uno de: ${ESTADOS.join(', ')}` });
    }

    const condiciones = [];
    const replacements = {};

    if (estado) {
      condiciones.push('estado = :estado');
      replacements.estado = estado;
    }

    // Lo que el docente pidió pero su coordinador todavía no elevó no debe
    // aparecer en la bandeja de las autoridades: ese paso es del coordinador.
    if (tieneRol(req, ['decano', 'subdecano', 'direccion']) && !tieneRol(req, ROLES_COORDINADOR)) {
      condiciones.push("estado <> 'solicitada'");
    }

    const esAdminODireccion = tieneRol(req, ['direccion', 'administrador']);
    if (!esAdminODireccion) {
      if (tieneRol(req, ['decano', 'subdecano'])) {
        const facultadId = await facultadDelUsuario(req);
        if (facultadId) {
          condiciones.push('facultad_id = :facultad_id');
          replacements.facultad_id = facultadId;
        }
      } else if (tieneRol(req, ROLES_COORDINADOR)) {
        const carreraId = carreraDelCoordinador(req);
        if (!carreraId) {
          return res.status(400).json({
            success: false,
            message: 'Tu usuario no tiene una carrera asignada. Pide al administrador que la registre.',
          });
        }
        condiciones.push('carrera_id = :carrera_id');
        replacements.carrera_id = carreraId;
      }
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
    const filas = await sequelize.query(
      `SELECT * FROM public.habilitaciones_docente ${where} ORDER BY
         CASE estado WHEN 'solicitada' THEN 0 WHEN 'pendiente' THEN 1 ELSE 2 END, created_at DESC
       LIMIT 500`,
      { replacements, type: QueryTypes.SELECT }
    );

    const ahora = new Date();
    return res.json({
      success: true,
      data: filas.map((f) => ({
        ...serializar(f),
        vigente: f.estado === 'aprobada' && new Date(f.fecha_fin) >= ahora,
      })),
    });
  } catch (error) {
    console.error('Error listar habilitaciones:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// PUT /api/habilitaciones/:id/resolver   (decano | dirección)
// Body: { accion: 'aprobar' | 'rechazar', observacion }
// =========================================================================
exports.resolver = async (req, res) => {
  try {
    await initTable();
    const { accion, observacion } = req.body;
    if (!['aprobar', 'rechazar'].includes(accion)) {
      return res.status(400).json({ success: false, message: "accion debe ser 'aprobar' o 'rechazar'" });
    }

    const [solicitud] = await sequelize.query(
      `SELECT * FROM public.habilitaciones_docente WHERE id = :id`,
      { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
    );
    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }
    if (solicitud.estado !== 'pendiente') {
      return res.status(409).json({
        success: false,
        message: `Esta solicitud ya fue ${solicitud.estado} por ${solicitud.autorizado_por_nombre || 'otro usuario'}`,
      });
    }

    // El decano solo resuelve lo de su facultad; dirección y admin, todo.
    if (tieneRol(req, ['decano', 'subdecano']) && !tieneRol(req, ['direccion', 'administrador'])) {
      const facultadId = await facultadDelUsuario(req);
      if (facultadId && solicitud.facultad_id && Number(solicitud.facultad_id) !== facultadId) {
        return res.status(403).json({ success: false, message: 'Esa solicitud no pertenece a tu facultad' });
      }
    }

    const nuevoEstado = accion === 'aprobar' ? 'aprobada' : 'rechazada';
    const [result] = await sequelize.query(
      `UPDATE public.habilitaciones_docente
          SET estado = :estado,
              autorizado_por = :autorizado_por,
              autorizado_por_nombre = :autorizado_por_nombre,
              autorizado_por_rol = :autorizado_por_rol,
              observacion = :observacion,
              resuelto_en = NOW(),
              updated_at = NOW()
        WHERE id = :id
        RETURNING *`,
      {
        replacements: {
          id: req.params.id,
          estado: nuevoEstado,
          autorizado_por: req.user?.id || null,
          autorizado_por_nombre: nombreDe(req.user),
          autorizado_por_rol: req.user?.rol || null,
          observacion: observacion?.trim() || null,
        },
        type: QueryTypes.UPDATE,
      }
    );

    const fila = Array.isArray(result) ? result[0] : result;
    return res.json({ success: true, data: serializar(fila) });
  } catch (error) {
    console.error('Error resolver habilitacion:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// PUT /api/habilitaciones/:id/revocar
// Cierra antes de tiempo una habilitación ya aprobada.
// =========================================================================
exports.revocar = async (req, res) => {
  try {
    await initTable();
    const [solicitud] = await sequelize.query(
      `SELECT * FROM public.habilitaciones_docente WHERE id = :id`,
      { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
    );
    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }
    if (solicitud.estado !== 'aprobada') {
      return res.status(409).json({ success: false, message: 'Solo se puede revocar una habilitación aprobada' });
    }

    const esCoordinador = tieneRol(req, ROLES_COORDINADOR) && !tieneRol(req, ROLES_AUTORIZADORES);
    if (esCoordinador) {
      const miCarrera = carreraDelCoordinador(req);
      if (!miCarrera || Number(solicitud.carrera_id) !== miCarrera) {
        return res.status(403).json({ success: false, message: 'Esa habilitación no pertenece a tu carrera' });
      }
    }

    const [result] = await sequelize.query(
      `UPDATE public.habilitaciones_docente
          SET estado = 'revocada',
              observacion = COALESCE(:observacion, observacion),
              updated_at = NOW()
        WHERE id = :id
        RETURNING *`,
      {
        replacements: { id: req.params.id, observacion: req.body?.observacion?.trim() || null },
        type: QueryTypes.UPDATE,
      }
    );

    const fila = Array.isArray(result) ? result[0] : result;
    return res.json({ success: true, data: serializar(fila) });
  } catch (error) {
    console.error('Error revocar habilitacion:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.habilitacionesVigentesDe = habilitacionesVigentesDe;
exports.MODULOS_HABILITABLES = MODULOS_HABILITABLES;
exports.ROLES_AUTORIZADORES = ROLES_AUTORIZADORES;
exports.ROLES_COORDINADOR = ROLES_COORDINADOR;
exports.ROLES_DOCENTE = ROLES_DOCENTE;
