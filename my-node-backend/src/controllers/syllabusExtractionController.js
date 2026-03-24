// syllabusExtractionController.js
// Controlador para extracción de títulos de Syllabus y organización en pestañas

const db = require('../models');
const xlsx = require('xlsx');
const mammoth = require('mammoth');

// 📄 Función auxiliar para procesar archivos Word
async function procesarWord(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  const lines = text.split('\n').filter(line => line.trim());
  return lines.map(line => [line]);
}

// 🔍 Función para limpiar texto
const limpiarTexto = (texto) => {
  if (!texto) return '';
  return texto.toString()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/["""'']/g, '')
    .trim();
};

// 📋 EXTRAER TÍTULOS DE SYLLABUS
exports.extraerTitulosSyllabus = async (req, res) => {
  try {
    if (!req.files || !req.files.archivo || req.files.archivo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo'
      });
    }

    const archivo = req.files.archivo[0];

    // Validar formato: Excel o Word
    const validExcelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const validWordTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    const esExcel = validExcelTypes.includes(archivo.mimetype);
    const esWord = validWordTypes.includes(archivo.mimetype);
    
    if (!esExcel && !esWord) {
      return res.status(400).json({
        success: false,
        message: 'Formato de archivo inválido. Use .xlsx o .docx'
      });
    }

    let jsonData = [];
    let tipoArchivo = esWord ? 'Word' : 'Excel';
    let worksheet = null;

    // Procesar según el tipo de archivo
    if (esWord) {
      console.log('📄 [SYLLABUS EXTRACTOR] Procesando archivo Word (.docx)...');
      jsonData = await procesarWord(archivo.buffer);
    } else {
      console.log('📊 [SYLLABUS EXTRACTOR] Procesando archivo Excel (.xlsx)...');
      const workbook = xlsx.read(archivo.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName];
      
      jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: true });
      
      // Manejar celdas combinadas
      const merges = worksheet['!merges'] || [];
      console.log(`📊 [SYLLABUS EXTRACTOR] Celdas combinadas: ${merges.length}`);
      
      merges.forEach(merge => {
        const startRow = merge.s.r;
        const startCol = merge.s.c;
        const endRow = merge.e.r;
        const endCol = merge.e.c;
        
        const valorOriginal = jsonData[startRow] && jsonData[startRow][startCol] 
          ? jsonData[startRow][startCol] 
          : '';
        
        if (valorOriginal) {
          for (let r = startRow; r <= endRow; r++) {
            if (!jsonData[r]) jsonData[r] = [];
            for (let c = startCol; c <= endCol; c++) {
              if (!jsonData[r][c]) {
                jsonData[r][c] = valorOriginal;
              }
            }
          }
        }
      });
    }

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo está vacío'
      });
    }

    // 🎯 DETECTAR TÍTULOS AUTOMÁTICAMENTE
    const detectarSoloTitulos = (data, worksheet = null) => {
      const titulosEncontrados = [];
      const titulosUnicos = new Map();

      const celdasCombinadas = new Set();
      if (worksheet && worksheet['!merges']) {
        worksheet['!merges'].forEach(merge => {
          const fila = merge.s.r;
          const col = merge.s.c;
          celdasCombinadas.add(`${fila}-${col}`);
        });
        console.log(`📊 [SYLLABUS] Celdas combinadas detectadas: ${worksheet['!merges'].length}`);
      }

      const analizarCaracteristicas = (texto, fila, col) => {
        const textoLimpio = limpiarTexto(texto);
        if (!textoLimpio || textoLimpio.length < 2) return null;

        let puntuacion = 0;
        let caracteristicas = [];

        // ✅ REGLA 1: CELDA COMBINADA (indicador MUY fuerte - 40 pts)
        if (celdasCombinadas.has(`${fila}-${col}`)) {
          puntuacion += 40;
          caracteristicas.push('celda_combinada');
        }

        // ✅ REGLA 2: MAYÚSCULAS (indicador fuerte - 25 pts)
        const porcentajeMayusculas = (textoLimpio.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length / textoLimpio.length;
        if (porcentajeMayusculas > 0.7) {
          puntuacion += 25;
          caracteristicas.push('mayusculas');
        } else if (porcentajeMayusculas > 0.4) {
          // Parcialmente en mayúsculas
          puntuacion += 12;
          caracteristicas.push('mayusculas_parciales');
        }

        // ✅ REGLA 3: TEXTO CORTO (títulos son concisos - 20 pts)
        if (textoLimpio.length <= 80) {
          puntuacion += 20;
          caracteristicas.push('texto_corto');
        } else if (textoLimpio.length <= 120) {
          puntuacion += 10;
          caracteristicas.push('texto_medio');
        }

        // ✅ REGLA 4: TERMINA CON DOS PUNTOS (patrón común - 15 pts)
        if (textoLimpio.endsWith(':')) {
          puntuacion += 15;
          caracteristicas.push('termina_con_dos_puntos');
        }

        // ✅ REGLA 5: PRIMERA COLUMNA (15 pts)
        if (col === 0) {
          puntuacion += 15;
          caracteristicas.push('primera_columna');
        }

        // ✅ REGLA 6: SEGUNDA COLUMNA (10 pts - para subtítulos)
        if (col === 1) {
          puntuacion += 10;
          caracteristicas.push('segunda_columna');
        }

        // ✅ REGLA 7: PALABRAS ESTRUCTURALES (indicador medio - 3 pts c/u)
        const palabrasClave = [
          'SYLLABUS', 'OBJETIVOS', 'RESULTADOS', 'APRENDIZAJE', 'CONTENIDO',
          'ASIGNATURA', 'PERIODO', 'NIVEL', 'CARACTERIZACIÓN', 'COMPETENCIAS',
          'UNIDADES', 'METODOLOGÍA', 'EVALUACIÓN', 'BIBLIOGRAFÍA', 'DATOS',
          'DESCRIPCIÓN', 'ESTRATEGIAS', 'RECURSOS', 'TEMAS', 'HORAS',
          'CÓDIGO', 'CODIGO', 'NOMBRE', 'PRERREQUISITO', 'CORREQUISITO',
          'FACULTAD', 'CARRERA', 'UNIDAD', 'CURRICULAR', 'CAMPO', 'FORMACIÓN',
          'MODALIDAD', 'ACADÉMICO', 'ORDINARIO', 'PAO', 'PARALELO', 'HORARIO',
          'CLASES', 'TUTORÍAS', 'TUTORIAS', 'PROFESOR', 'IMPARTE', 'PERFIL',
          'TOTAL', 'CRÉDITOS', 'CREDITOS', 'DOCENCIA', 'PRESENCIAL', 'SINCRÓNICA',
          'PRÁCTICAS', 'PRACTICAS', 'FORMATIVAS', 'APLICACIÓN', 'EXPERIMENTACIÓN',
          'PFAE', 'TRABAJO', 'AUTÓNOMO', 'AUTONOMO', 'PREPROFESIONALES', 'PPP',
          'ESPECÍFICOS', 'ESPECIFICOS', 'GENERALES', 'EJE', 'SEMESTRE'
        ];
        
        palabrasClave.forEach(palabra => {
          if (textoLimpio.toUpperCase().includes(palabra)) {
            puntuacion += 3;
            caracteristicas.push(`keyword:${palabra.toLowerCase()}`);
          }
        });

        // ✅ REGLA 8: CONTIENE "DE" (patrón muy común - 8 pts)
        if (/\bDE\b/.test(textoLimpio.toUpperCase())) {
          puntuacion += 8;
          caracteristicas.push('contiene_de');
        }

        // ✅ REGLA 9: CONTIENE "/" (separadores - 5 pts)
        if (textoLimpio.includes('/')) {
          puntuacion += 5;
          caracteristicas.push('contiene_separador');
        }

        // ✅ REGLA 10: PATRÓN ENCABEZADO (12 pts)
        if (/^(DATOS|INFORMACIÓN|TOTAL|HORAS|PERFIL|PROFESOR|PERIODO)/i.test(textoLimpio)) {
          puntuacion += 12;
          caracteristicas.push('patron_encabezado');
        }

        // ❌ PENALIZACIONES

        // Penalizar textos MUY largos
        if (textoLimpio.length > 150) {
          puntuacion -= 30;
          caracteristicas.push('muy_largo');
        }

        // Penalizar números al inicio (listas)
        if (/^\d+\.?\s/.test(textoLimpio)) {
          puntuacion -= 10;
          caracteristicas.push('numero_al_inicio');
        }

        // Penalizar muchas palabras (párrafos)
        const palabrasCount = textoLimpio.split(/\s+/).length;
        if (palabrasCount > 15) {
          puntuacion -= 20;
          caracteristicas.push('muchas_palabras');
        }

        // Penalizar verbos (contenido descriptivo)
        if (/\b(desarrollar|implementar|analizar|evaluar|aplicar|comprender|elaborar)\b/i.test(textoLimpio)) {
          puntuacion -= 8;
          caracteristicas.push('contiene_verbos');
        }

        // ✅ UMBRAL REDUCIDO: 18 puntos (antes 25) para capturar MÁS títulos
        return {
          puntuacion,
          caracteristicas,
          esTitulo: puntuacion >= 18
        };
      };

      data.forEach((fila, idxFila) => {
        fila.forEach((celda, idxCol) => {
          const analisis = analizarCaracteristicas(celda, idxFila, idxCol);
          
          if (analisis && analisis.esTitulo) {
            const textoLimpio = limpiarTexto(celda);
            const titulo = textoLimpio.replace(/:$/, '');

            if (!titulosUnicos.has(titulo.toUpperCase())) {
              titulosUnicos.set(titulo.toUpperCase(), {
                titulo: titulo,
                tipo: analisis.caracteristicas.includes('celda_combinada') ? 'cabecera' : 
                      (analisis.puntuacion > 40 ? 'titulo_seccion' : 'campo'),
                fila: idxFila + 1,
                columna: idxCol + 1,
                columna_letra: String.fromCharCode(65 + idxCol),
                puntuacion: analisis.puntuacion,
                tiene_dos_puntos: textoLimpio.endsWith(':'),
                longitud_texto: textoLimpio.length,
                es_mayuscula: (textoLimpio.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length / textoLimpio.length > 0.7,
                es_negrita: analisis.caracteristicas.includes('celda_combinada')
              });

              console.log(`✅ [SYLLABUS AUTO] Fila ${idxFila + 1}, Col ${String.fromCharCode(65 + idxCol)}: "${titulo}" (${analisis.puntuacion} pts)`);
            }
          }
        });
      });

      let numero = 1;
      const titulosOrdenados = Array.from(titulosUnicos.values())
        .sort((a, b) => b.puntuacion - a.puntuacion);

      titulosOrdenados.forEach(titulo => {
        titulosEncontrados.push({
          numero: numero++,
          ...titulo
        });
      });

      console.log(`📊 [SYLLABUS AUTO] Total títulos detectados: ${titulosEncontrados.length}`);
      return titulosEncontrados;
    };

    const titulos = detectarSoloTitulos(jsonData, esExcel ? worksheet : null);
    console.log(`📋 [SYLLABUS] Total títulos detectados: ${titulos.length}`);

    // 💾 GUARDAR EN BASE DE DATOS
    const TituloExtraidoSyllabus = db.TituloExtraidoSyllabus;
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const usuarioId = req.user?.id || null;
    
    // Obtener periodo académico del request
    const periodoAcademico = req.body.periodo_academico || null;
    const periodoId = req.body.periodo_id || null;

    try {
      const titulosGuardados = await Promise.all(
        titulos.map(titulo => 
          TituloExtraidoSyllabus.create({
            session_id: sessionId,
            nombre_archivo: archivo.originalname,
            tipo_archivo: tipoArchivo,
            periodo_academico: periodoAcademico,
            periodo_id: periodoId,
            titulo: titulo.titulo,
            tipo: titulo.tipo,
            fila: titulo.fila,
            columna: titulo.columna,
            columna_letra: titulo.columna_letra,
            puntuacion: titulo.puntuacion,
            tiene_dos_puntos: titulo.tiene_dos_puntos,
            longitud_texto: titulo.longitud_texto,
            es_mayuscula: titulo.es_mayuscula,
            es_negrita: titulo.es_negrita,
            usuario_id: usuarioId
          })
        )
      );

      console.log(`✅ [SYLLABUS] ${titulosGuardados.length} títulos guardados en BD con session_id: ${sessionId}`);

      return res.status(200).json({
        success: true,
        message: 'Títulos extraídos y guardados exitosamente',
        data: {
          sessionId: sessionId,
          nombreArchivo: archivo.originalname,
          tipoArchivo: tipoArchivo,
          totalTitulos: titulos.length,
          titulos: titulosGuardados.map(t => ({
            id: t.id,
            titulo: t.titulo,
            tipo: t.tipo,
            fila: t.fila,
            columna: t.columna,
            columna_letra: t.columna_letra,
            puntuacion: t.puntuacion
          }))
        }
      });
    } catch (dbError) {
      console.error('❌ Error guardando en BD:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error guardando títulos en base de datos',
        error: dbError.message
      });
    }

  } catch (error) {
    console.error('❌ [SYLLABUS] Error en extraerTitulosSyllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error procesando archivo Syllabus',
      error: error.message
    });
  }
};

// 📋 OBTENER AGRUPACIONES DE UNA SESIÓN
exports.obtenerAgrupacionesSyllabus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const AgrupacionTituloSyllabus = db.AgrupacionTituloSyllabus;
    
    const agrupaciones = await AgrupacionTituloSyllabus.findAll({
      where: { session_id: sessionId },
      order: [['orden', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: agrupaciones
    });
  } catch (error) {
    console.error('❌ Error obteniendo agrupaciones Syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo agrupaciones de Syllabus',
      error: error.message
    });
  }
};

// 💾 GUARDAR/ACTUALIZAR AGRUPACIONES
exports.guardarAgrupacionesSyllabus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { agrupaciones } = req.body;

    if (!agrupaciones || !Array.isArray(agrupaciones)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de agrupaciones'
      });
    }

    const AgrupacionTituloSyllabus = db.AgrupacionTituloSyllabus;
    const { sequelize } = db;

    // Transacción para garantizar integridad
    await sequelize.transaction(async (t) => {
      // Eliminar agrupaciones anteriores
      await AgrupacionTituloSyllabus.destroy({
        where: { session_id: sessionId },
        transaction: t
      });

      // Crear nuevas agrupaciones
      await AgrupacionTituloSyllabus.bulkCreate(
        agrupaciones.map(ag => ({
          session_id: sessionId,
          nombre_pestana: ag.nombre_pestana || ag.nombrePestana,
          descripcion: ag.descripcion || null,
          orden: ag.orden,
          titulo_ids: ag.titulo_ids || ag.tituloIds || [],
          color: ag.color || 'blue',
          icono: ag.icono || '📋'
        })),
        { transaction: t }
      );
    });

    return res.status(200).json({
      success: true,
      message: 'Agrupaciones de Syllabus guardadas exitosamente'
    });
  } catch (error) {
    console.error('❌ Error guardando agrupaciones Syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error guardando agrupaciones de Syllabus',
      error: error.message
    });
  }
};

// 🗑️ ELIMINAR AGRUPACIONES
exports.eliminarAgrupacionesSyllabus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const AgrupacionTituloSyllabus = db.AgrupacionTituloSyllabus;

    await AgrupacionTituloSyllabus.destroy({
      where: { session_id: sessionId }
    });

    return res.status(200).json({
      success: true,
      message: 'Agrupaciones de Syllabus eliminadas exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando agrupaciones Syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error eliminando agrupaciones de Syllabus',
      error: error.message
    });
  }
};

// 📋 OBTENER TÍTULOS DE UNA SESIÓN
exports.obtenerTitulosSesionSyllabus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const TituloExtraidoSyllabus = db.TituloExtraidoSyllabus;
    
    const titulos = await TituloExtraidoSyllabus.findAll({
      where: { session_id: sessionId },
      order: [['fila', 'ASC'], ['columna', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: titulos
    });
  } catch (error) {
    console.error('❌ Error obteniendo títulos Syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error obteniendo títulos de Syllabus',
      error: error.message
    });
  }
};

// 📋 LISTAR TODAS LAS SESIONES DE EXTRACCIÓN
exports.listarSesionesSyllabus = async (req, res) => {
  try {
    const TituloExtraidoSyllabus = db.TituloExtraidoSyllabus;
    const { sequelize } = db;

    const sesiones = await sequelize.query(`
      SELECT 
        session_id,
        nombre_archivo,
        tipo_archivo,
        usuario_id,
        periodo_academico,
        periodo_id,
        COUNT(*) as total_titulos,
        MAX(created_at) as fecha_extraccion
      FROM titulos_extraidos_syllabus
      GROUP BY session_id, nombre_archivo, tipo_archivo, usuario_id, periodo_academico, periodo_id
      ORDER BY MAX(created_at) DESC
      LIMIT 50
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: sesiones
    });
  } catch (error) {
    console.error('❌ Error listando sesiones Syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error listando sesiones de Syllabus',
      error: error.message
    });
  }
};

// 🗑️ ELIMINAR SESIÓN COMPLETA DE SYLLABUS
exports.eliminarSesionSyllabus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere sessionId'
      });
    }

    const { sequelize } = db;
    const TituloExtraidoSyllabus = db.TituloExtraidoSyllabus;
    const AgrupacionTituloSyllabus = db.AgrupacionTituloSyllabus;

    // Transacción para eliminar todo relacionado con la sesión
    await sequelize.transaction(async (t) => {
      // 1. Eliminar agrupaciones (pestañas organizadas)
      const agrupacionesEliminadas = await AgrupacionTituloSyllabus.destroy({
        where: { session_id: sessionId },
        transaction: t
      });

      // 2. Eliminar títulos extraídos
      const titulosEliminados = await TituloExtraidoSyllabus.destroy({
        where: { session_id: sessionId },
        transaction: t
      });

      console.log(`🗑️ [SYLLABUS DELETE] Sesión ${sessionId} eliminada:`);
      console.log(`   - ${titulosEliminados} títulos eliminados`);
      console.log(`   - ${agrupacionesEliminadas} agrupaciones eliminadas`);
    });

    return res.status(200).json({
      success: true,
      message: 'Sesión de Syllabus eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando sesión Syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error eliminando sesión de Syllabus',
      error: error.message
    });
  }
};
