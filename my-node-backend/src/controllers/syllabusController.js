const db = require('../models'); // Importa desde el index de modelos
const Syllabus = db.Syllabus;   // Accede al modelo Syllabus
const Usuario = db.Usuario;     // Necesario para incluir datos del creador
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
// ✅ NUEVO: Validador basado en editor
const { extraerCamposRequeridos, extraerTitulosWord, compararTitulos, validarSyllabusContraPlantilla } = require('../utils/syllabusValidatorEditor');

// --- CREAR UN NUEVO SYLLABUS ---
exports.create = async (req, res) => {
  try {
    const { nombre, periodo, materias, asignatura_id, datos_syllabus } = req.body;
    const usuario_id = req.user.id; 

    if (!nombre || !periodo || !datos_syllabus) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, periodo y datos_syllabus son obligatorios'
      });
    }

    // 🔒 VALIDACIÓN: Verificar si ya existe un syllabus para esta materia y periodo
    // Validar por asignatura_id si está disponible, sino por nombre de materia
    // SOLO validar duplicados si hay asignatura_id (creado desde gestión de asignaturas)
    if (asignatura_id) {
      const whereValidacion = {
        periodo: periodo,
        asignatura_id: asignatura_id
        // paranoid:true filtra automáticamente los eliminados (deletedAt IS NULL)
      };

      const syllabusExistente = await Syllabus.findOne({
        where: whereValidacion,
        include: [{
          model: db.Asignatura,
          as: 'asignatura',
          attributes: ['id', 'nombre', 'codigo']
        }]
      });

      if (syllabusExistente) {
        const nombreMateria = syllabusExistente.asignatura 
          ? syllabusExistente.asignatura.nombre 
          : (syllabusExistente.materias || nombre);
        
        return res.status(409).json({ // 409 = Conflict
          success: false,
          message: `Ya existe un syllabus para la materia "${nombreMateria}" en el periodo "${periodo}". Solo puede subir un syllabus por materia por periodo. Puede eliminarlo para subir uno nuevo.`,
          existente: {
            id: syllabusExistente.id,
            nombre: syllabusExistente.nombre,
            materia: nombreMateria,
            asignatura_id: syllabusExistente.asignatura_id,
            fecha_creacion: syllabusExistente.created_at
          }
        });
      }
    }
    
    const nuevoSyllabus = await Syllabus.create({
      nombre,
      periodo,
      materias: materias || nombre,
      asignatura_id: asignatura_id || null, // 🆕 Guardar asignatura_id para validación futura
      datos_syllabus,
      usuario_id
    });
    
    return res.status(201).json({
      success: true,
      message: 'Syllabus creado exitosamente',
      data: nuevoSyllabus
    });
  } catch (error) {
    console.error('Error al crear syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear el syllabus',
      error: error.message
    });
  }
};

// --- OBTENER TODOS LOS SYLLABI ---
// Admin y comisión académica ven TODOS
exports.getAll = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const usuario_rol = req.user.rol;

    // 🔍 Construcción dinámica del WHERE
    const whereCondition = {};
    
    // Administrador y comisión académica ven TODOS los syllabi (whereCondition vacío)
    // Solo profesores/docentes ven los suyos (manejado por /mine)
    // No se filtra por usuario_id aquí

    console.log(`📋 [getAll] Usuario: ${usuario_id}, Rol: ${usuario_rol}, WHERE:`, whereCondition);

    const syllabi = await Syllabus.findAll({
      where: whereCondition,
      order: [['updatedAt', 'DESC']],
      include: {
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos', 'rol']
      }
    });

    console.log(`✅ [getAll] Encontrados ${syllabi.length} syllabi`);
    
    // 🔍 DEBUG: Ver qué tipo de datos vienen en datos_syllabus
    if (syllabi.length > 0) {
      console.log('🔍 Primer syllabus - datos_syllabus tipo:', typeof syllabi[0].datos_syllabus);
      console.log('🔍 Primer syllabus - datos_syllabus preview:', 
        typeof syllabi[0].datos_syllabus === 'string' 
          ? syllabi[0].datos_syllabus.substring(0, 100) + '...'
          : JSON.stringify(syllabi[0].datos_syllabus).substring(0, 100) + '...'
      );
    }

    return res.status(200).json({ success: true, data: syllabi });
  } catch (error) {
    console.error('❌ Error al obtener syllabi:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener los syllabi',
      error: error.message
    });
  }
};

// --- OBTENER UN SYLLABUS POR ID ---
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const syllabus = await Syllabus.findByPk(id, {
      include: {
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos']
      }
    });
    
    if (!syllabus) {
      return res.status(404).json({ success: false, message: `Syllabus con ID ${id} no encontrado` });
    }
    
    return res.status(200).json({ success: true, data: syllabus });
  } catch (error) {
    console.error('Error al obtener syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener el syllabus',
      error: error.message
    });
  }
};

// --- ¡NUEVA FUNCIÓN AÑADIDA! ---
// --- OBTENER LOS SYLLABI DEL USUARIO AUTENTICADO PARA EL ÚLTIMO PERIODO ---
exports.getMine = async (req, res) => {
  try {
    const usuario_id = req.user.id; // ID del profesor que hace la petición

    // 1. Encontrar cuál es el "último periodo" basándonos en el orden alfabético descendente.
    const ultimoPeriodoEntry = await Syllabus.findOne({
      attributes: ['periodo'],
      order: [['periodo', 'DESC']],
      limit: 1 // Aseguramos que solo traiga uno
    });

    // Si no hay ningún syllabus en toda la base de datos, no hay nada que mostrar.
    if (!ultimoPeriodoEntry) {
      return res.status(200).json({ 
          success: true, 
          data: {
              periodo: "N/A", // Indicamos que no se encontró un periodo
              syllabi: []
          } 
      });
    }

    const ultimoPeriodo = ultimoPeriodoEntry.periodo;

    // 2. Buscar todos los syllabi que pertenezcan a ESE profesor y a ESE último periodo.
    const syllabi = await Syllabus.findAll({
      where: {
        usuario_id: usuario_id,
        periodo: ultimoPeriodo
      },
      order: [['updated_at', 'DESC']],
      // No es estrictamente necesario incluir el creador, pero es buena práctica
      include: { 
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos']
      }
    });

    return res.status(200).json({ 
      success: true, 
      data: {
        periodo: ultimoPeriodo,
        syllabi: syllabi
      }
    });

  } catch (error) {
    console.error('Error al obtener los syllabi del profesor:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener los syllabi del profesor',
      error: error.message
    });
  }
};

// --- VERIFICAR SI YA EXISTE SYLLABUS PARA MATERIA/PERIODO ---
exports.verificarExistencia = async (req, res) => {
  try {
    const { periodo, materia, asignatura_id } = req.query;
    const usuario_id = req.user.id;

    console.log('🔍 Verificando existencia:', { usuario_id, periodo, materia, asignatura_id });

    if (!periodo) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el periodo'
      });
    }

    if (!asignatura_id && !materia) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere asignatura_id o materia'
      });
    }

    // Construir condición WHERE - paranoid:true ya filtra los eliminados automáticamente
    const whereCondicion = {
      periodo: periodo
    };

    if (asignatura_id) {
      whereCondicion.asignatura_id = asignatura_id;
    } else {
      whereCondicion.materias = materia;
    }

    let syllabusExistente = await Syllabus.findOne({
      where: whereCondicion,
      attributes: ['id', 'nombre', 'materias', 'asignatura_id', 'createdAt', 'updatedAt']
    });

    // Si no se encontró con asignatura_id, intentar buscar por nombre de materia
    // (el admin puede haber subido sin asignatura_id vinculado)
    if (!syllabusExistente && asignatura_id && materia) {
      console.log('🔄 No encontrado por asignatura_id, buscando por nombre de materia:', materia);
      const { Op } = require('sequelize');
      syllabusExistente = await Syllabus.findOne({
        where: {
          periodo: periodo,
          materias: { [Op.iLike]: `%${materia}%` }
        },
        attributes: ['id', 'nombre', 'materias', 'asignatura_id', 'createdAt', 'updatedAt']
      });
    }
    
    // Último intento: buscar solo por nombre de la materia si se proporcionó asignatura_id
    // y podemos resolverlo a un nombre
    if (!syllabusExistente && asignatura_id && !materia) {
      try {
        const asigRecord = await db.Asignatura.findByPk(asignatura_id, { attributes: ['nombre'] });
        if (asigRecord && asigRecord.nombre) {
          console.log('🔄 Buscando por nombre de asignatura resuelto:', asigRecord.nombre);
          const { Op } = require('sequelize');
          syllabusExistente = await Syllabus.findOne({
            where: {
              periodo: periodo,
              materias: { [Op.iLike]: `%${asigRecord.nombre}%` }
            },
            attributes: ['id', 'nombre', 'materias', 'asignatura_id', 'createdAt', 'updatedAt']
          });
        }
      } catch(e) { console.log('⚠️ Error resolviendo nombre de asignatura:', e.message); }
    }

    // Último fallback: buscar CUALQUIER syllabus del periodo (admin subió sin materia ni asignatura_id)
    if (!syllabusExistente) {
      console.log('🔄 Último fallback: buscando cualquier syllabus del periodo:', periodo);
      syllabusExistente = await Syllabus.findOne({
        where: { periodo: periodo },
        attributes: ['id', 'nombre', 'materias', 'asignatura_id', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']]
      });
      if (syllabusExistente) {
        console.log('✅ Encontrado syllabus genérico del periodo:', syllabusExistente.id);
      }
    }

    if (syllabusExistente) {
      // Obtener nombre de asignatura si existe asignatura_id
      let nombreMateria = syllabusExistente.materias || materia;
      
      if (syllabusExistente.asignatura_id) {
        try {
          const asignatura = await db.Asignatura.findByPk(syllabusExistente.asignatura_id, {
            attributes: ['id', 'nombre', 'codigo']
          });
          if (asignatura) {
            nombreMateria = asignatura.nombre;
          }
        } catch (err) {
          console.log('⚠️ No se pudo obtener asignatura:', err.message);
        }
      }

      return res.status(200).json({
        success: true,
        existe: true,
        message: `Ya existe un syllabus para "${nombreMateria}" en el periodo "${periodo}"`,
        syllabus: {
          id: syllabusExistente.id,
          nombre: syllabusExistente.nombre,
          materia: nombreMateria,
          asignatura_id: syllabusExistente.asignatura_id,
          asignatura: syllabusExistente.asignatura,
          fecha_creacion: syllabusExistente.createdAt,
          fecha_actualizacion: syllabusExistente.updatedAt
        }
      });
    }

    return res.status(200).json({
      success: true,
      existe: false,
      message: 'No existe syllabus para esta materia/periodo, puede subir uno nuevo'
    });

  } catch (error) {
    console.error('❌ Error al verificar existencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar existencia de syllabus',
      error: error.message
    });
  }
};

// --- ACTUALIZAR UN SYLLABUS ---
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRol = req.user.rol;
    
    const syllabus = await Syllabus.findByPk(id);
    
    if (!syllabus) {
      return res.status(404).json({ success: false, message: `Syllabus con ID ${id} no encontrado` });
    }

    // ¡VERIFICACIÓN DE PERMISOS! Solo el creador o un admin puede editar.
    if (syllabus.usuario_id !== userId && userRol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'No tienes permiso para editar este syllabus.' });
    }
    
    await syllabus.update(req.body);
    
    return res.status(200).json({
      success: true,
      message: 'Syllabus actualizado exitosamente',
      data: syllabus
    });
  } catch (error) {
    console.error('Error al actualizar syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al actualizar el syllabus',
      error: error.message
    });
  }
};

// --- ELIMINAR UN SYLLABUS (Borrado Lógico) ---
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRol = req.user.rol;

    const syllabus = await Syllabus.findByPk(id);
    
    if (!syllabus) {
      return res.status(404).json({ success: false, message: `Syllabus con ID ${id} no encontrado` });
    }

    // ¡VERIFICACIÓN DE PERMISOS!
    if (syllabus.usuario_id !== userId && userRol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este syllabus.' });
    }
    
    await syllabus.destroy();
    
    return res.status(200).json({ success: true, message: 'Syllabus eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar syllabus:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al eliminar el syllabus',
      error: error.message
    });
  }
};

// --- SUBIR Y PROCESAR DOCUMENTO WORD DE SYLLABUS ---
exports.uploadDocument = async (req, res) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    const filePath = req.file.path;
    const { nombre, periodo, materias } = req.body;
    const usuario_id = req.user.id;

    if (!nombre || !periodo || !materias) {
      // Eliminar el archivo si falta información
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, periodo y materias son obligatorios'
      });
    }

    // Leer el documento Word con conversión HTML para poder procesar tablas
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;
    
    // También extraer el texto plano para referencia
    const textResult = await mammoth.extractRawText({ path: filePath });
    const text = textResult.value;

    console.log('📄 Primeros 2000 caracteres del HTML:', html.substring(0, 2000));
    console.log('📄 Primeros 2000 caracteres del texto:', text.substring(0, 2000));
    
    // Buscar específicamente "Unidades temáticas" en el texto completo
    const buscandoUnidades = text.toLowerCase().includes('unidades') || text.toLowerCase().includes('temáticas');
    console.log('🔍 ¿Contiene "unidades" o "temáticas"?', buscandoUnidades);
    
    // Extraer todas las líneas que contengan palabras clave
    const lineasConUnidades = text.split('\n').filter(line => 
      line.toLowerCase().includes('unidad') || 
      line.toLowerCase().includes('temática') ||
      line.toLowerCase().includes('contenido') ||
      line.toLowerCase().includes('resultado') ||
      line.toLowerCase().includes('criterio') ||
      line.toLowerCase().includes('instrumento')
    );
    console.log('📋 Líneas con palabras clave:', lineasConUnidades.slice(0, 10));

    // Función para extraer texto de HTML sin etiquetas
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Función para normalizar títulos (eliminar espacios extras, caracteres especiales)
    const normalizeTitulo = (titulo) => {
      return titulo
        .replace(/\s+/g, ' ')
        .replace(/[:：]/g, '')
        .trim();
    };

    // LISTA DE CAMPOS OBLIGATORIOS que deben estar en el syllabus
    const camposObligatorios = [
      'DATOS GENERALES',
      'RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES',
      'Unidades temáticas',
      'CONTENIDOS',
      'Resultados de aprendizaje',
      'Criterios de evaluación',
      'Instrumentos de evaluación',
      'Total horas por componente',
      'Total horas vinculación/prácticas preprofesionales',
      'Total horas de la asignatura',
      'Evaluación de Recuperación',
      'VISADO',
      'DECANO/A',
      'DIRECTOR/A',
      'COORDINADOR/A',
      'DOCENTE'
    ];
    
    // PATRONES ALTERNATIVOS: Buscar variaciones de los campos (por si están separados o con diferente formato)
    const patronesBusqueda = [
      { variantes: ['unidades temáticas', 'unidad temática', 'unidades', 'temáticas'], campo: 'Unidades temáticas' },
      { variantes: ['contenidos', 'contenido'], campo: 'CONTENIDOS' },
      { variantes: ['resultados de aprendizaje', 'resultado de aprendizaje', 'resultados aprendizaje'], campo: 'Resultados de aprendizaje' },
      { variantes: ['criterios de evaluación', 'criterio de evaluación', 'criterios evaluación'], campo: 'Criterios de evaluación' },
      { variantes: ['instrumentos de evaluación', 'instrumento de evaluación', 'instrumentos evaluación'], campo: 'Instrumentos de evaluación' },
      { variantes: ['total horas por componente', 'total horas componente'], campo: 'Total horas por componente' },
      { variantes: ['total horas vinculación', 'total horas prácticas preprofesionales'], campo: 'Total horas vinculación/prácticas preprofesionales' },
      { variantes: ['total horas de la asignatura', 'total horas asignatura'], campo: 'Total horas de la asignatura' },
      { variantes: ['evaluación de recuperación', 'evaluación recuperación'], campo: 'Evaluación de Recuperación' }
    ];

    // Extraer títulos y contenido de las tablas
    const titulos = [];
    const contenidoCompleto = {};
    const titulosSet = new Set(); // Para evitar duplicados
    const seccionesPrincipales = []; // Para guardar los títulos de sección principales
    const seccionActual = { nombre: null, campos: [] }; // Para rastrear a qué sección pertenece cada campo
    
    // Primero extraer títulos de sección del texto plano
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Secciones esperadas en un syllabus
    const seccionesEsperadas = [
      'DATOS GENERALES',
      'ESTRUCTURA DE LA ASIGNATURA',
      'RESULTADOS Y EVALUACIÓN',
      'VISADO'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineUpper = line.toUpperCase();
      
      // Detectar títulos de sección con varios formatos:
      // - "1. DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA"
      // - "2. ESTRUCTURA DE LA ASIGNATURA"
      // - "RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES"
      // - "3 VISADO"
      
      const esSeccionNumerada = /^\d+\.?\-?\s+[A-ZÁÉÍÓÚÑ\s\/Y]+$/.test(line) && 
                               line.length >= 10 && 
                               line.length < 150;
      
      const esSeccionMayusculas = /^[A-ZÁÉÍÓÚÑ\s\/Y]{15,150}$/.test(line) && 
                                   !line.includes('NOMBRE:') && 
                                   !line.includes('FECHA:') &&
                                   !line.includes('FIRMA') &&
                                   !line.includes('MSc') &&
                                   !line.includes('Mg') &&
                                   !line.includes('PhD') &&
                                   !line.includes('Lic.');
      
      // Verificar si contiene alguna sección esperada
      const esSeccionConocida = seccionesEsperadas.some(seccion => lineUpper.includes(seccion));
      
      if ((esSeccionNumerada || esSeccionMayusculas || esSeccionConocida) && line.length > 10) {
        seccionesPrincipales.push(line);
        seccionActual.nombre = line;
        
        const tituloLimpio = line.replace(/^\d+\.?\-?\s*/, '').trim();
        
        if (!titulosSet.has(tituloLimpio)) {
          titulosSet.add(tituloLimpio);
          titulos.push(tituloLimpio);
          contenidoCompleto[tituloLimpio] = '';
          console.log(`📌 SECCIÓN PRINCIPAL: ${tituloLimpio}`);
        }
      }
    }
    
    console.log(`\n✓ Encontradas ${seccionesPrincipales.length} secciones principales\n`);
    
    // Expresión regular para encontrar TODAS las tablas completas
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
    const tableRowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis; // Captura tanto <td> como <th>
    
    let tableMatch;
    let tableCount = 0;
    
    // Procesar cada tabla
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      tableCount++;
      const tableHtml = tableMatch[1];
      
      let rowMatch;
      let rowCount = 0;
      
      // Procesar cada fila de la tabla
      while ((rowMatch = tableRowRegex.exec(tableHtml)) !== null) {
        rowCount++;
        const rowHtml = rowMatch[1];
        const cells = [];
        
        let cellMatch;
        // Extraer todas las celdas de la fila (tanto <td> como <th>)
        while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
          const cellContent = stripHtml(cellMatch[1]);
          if (cellContent) { // Solo agregar si no está vacío
            cells.push(cellContent);
          }
        }
        
        // Si la fila tiene celdas, procesar
        if (cells.length > 0) {
          const primeraColumna = cells[0].trim();
          
          // MEJORADO: Detectar si la primera celda es un campo importante
          const esCampoImportante = primeraColumna.length > 3 && (
            primeraColumna.toLowerCase().includes('total') ||
            primeraColumna.toLowerCase().includes('evaluación') ||
            primeraColumna.toLowerCase().includes('hora') ||
            /^[A-ZÁÉÍÓÚÑ]/.test(primeraColumna) // Empieza con mayúscula
          );
          
          // Caso 1: Fila con 2 columnas (campo: valor)
          if (cells.length === 2) {
            const titulo = normalizeTitulo(primeraColumna);
            
            // Validar que el título no sea vacío, muy corto, o solo números
            if (titulo && titulo.length > 2 && !/^[\d\s\-:]+$/.test(titulo)) {
              if (!titulosSet.has(titulo)) {
                titulosSet.add(titulo);
                titulos.push(titulo);
                contenidoCompleto[titulo] = cells[1].trim();
                
                // Guardar también con el título original
                if (primeraColumna !== titulo) {
                  contenidoCompleto[primeraColumna] = cells[1].trim();
                }
              }
            }
          }
          // Caso 2: Fila con múltiples columnas
          else if (cells.length > 2) {
            // Si la primera columna es un campo importante (ej: "Total horas por componente")
            // la guardamos como un campo único con todas las celdas restantes como valor
            if (esCampoImportante) {
              const titulo = normalizeTitulo(primeraColumna);
              if (titulo && titulo.length > 2 && !titulosSet.has(titulo)) {
                titulosSet.add(titulo);
                titulos.push(titulo);
                // Unir todas las celdas restantes como valor
                const valor = cells.slice(1).filter(c => c.trim()).join(' | ');
                contenidoCompleto[titulo] = valor;
                
                if (primeraColumna !== titulo) {
                  contenidoCompleto[primeraColumna] = valor;
                }
              }
            } else {
              // Si no, guardar cada celda como un posible campo (encabezados)
              for (let i = 0; i < cells.length; i++) {
                const campo = cells[i].trim();
                const titulo = normalizeTitulo(campo);
                
                // Validar que sea un título válido
                if (titulo && titulo.length > 2 && !/^[\d\s\-:]+$/.test(titulo)) {
                  if (!titulosSet.has(titulo)) {
                    titulosSet.add(titulo);
                    titulos.push(titulo);
                    contenidoCompleto[titulo] = ''; // Encabezados sin contenido inicial
                    
                    if (campo !== titulo) {
                      contenidoCompleto[campo] = '';
                    }
                  }
                }
              }
            }
          }
          // Caso 3: Fila con 1 columna (puede ser un encabezado o título)
          else if (cells.length === 1) {
            const titulo = normalizeTitulo(primeraColumna);
            
            // Si parece ser un título importante (mayúsculas, longitud razonable, o tiene palabras clave)
            if (titulo && titulo.length > 2 && (
              primeraColumna === primeraColumna.toUpperCase() ||
              esCampoImportante
            )) {
              if (!titulosSet.has(titulo)) {
                titulosSet.add(titulo);
                titulos.push(titulo);
                contenidoCompleto[titulo] = '';
                
                if (primeraColumna !== titulo) {
                  contenidoCompleto[primeraColumna] = '';
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`✓ Procesadas ${tableCount} tablas`);
    console.log(`✓ Extraídos ${titulos.length} campos hasta ahora`);
    console.log(`✓ Secciones principales encontradas: ${seccionesPrincipales.length}`);
    
    // PASO 1: EXTRACCIÓN ULTRA-AGRESIVA - Extraer TODO el texto del HTML
    const todoElTextoHTML = stripHtml(html);
    const palabrasHTML = todoElTextoHTML.split(/\s+/).filter(p => p.length > 0);
    
    console.log(`✓ Palabras totales extraídas del HTML: ${palabrasHTML.length}`);
    console.log('Primeras 50 palabras:', palabrasHTML.slice(0, 50).join(' '));
    
    // PASO 2: Buscar ESPECÍFICAMENTE cada campo obligatorio con sus variantes
    for (const patron of patronesBusqueda) {
      let encontrado = false;
      let varianteEncontrada = '';
      
      // Buscar cada variante
      for (const variante of patron.variantes) {
        const varianteLower = variante.toLowerCase();
        
        // Buscar en texto plano
        if (text.toLowerCase().includes(varianteLower)) {
          encontrado = true;
          varianteEncontrada = variante;
          break;
        }
        
        // Buscar en HTML
        if (html.toLowerCase().includes(varianteLower)) {
          encontrado = true;
          varianteEncontrada = variante;
          break;
        }
        
        // Buscar palabras individuales (para texto rotado que puede estar separado)
        const palabras = variante.split(' ');
        let todasLasPalabrasEncontradas = true;
        for (const palabra of palabras) {
          if (palabra.length > 3) { // Solo palabras significativas
            if (!text.toLowerCase().includes(palabra.toLowerCase()) && 
                !html.toLowerCase().includes(palabra.toLowerCase())) {
              todasLasPalabrasEncontradas = false;
              break;
            }
          }
        }
        if (todasLasPalabrasEncontradas && palabras.length > 0) {
          encontrado = true;
          varianteEncontrada = variante;
          break;
        }
      }
      
      if (encontrado) {
        const campoNormalizado = normalizeTitulo(patron.campo);
        if (!titulosSet.has(campoNormalizado)) {
          titulosSet.add(campoNormalizado);
          titulos.push(patron.campo);
          contenidoCompleto[patron.campo] = '';
          console.log(`✅ Campo encontrado: "${patron.campo}" (variante: "${varianteEncontrada}")`);
        }
      }
    }
    
    // También buscar los campos obligatorios simples (VISADO, etc.)
    for (const campoObligatorio of camposObligatorios) {
      const campoNormalizado = normalizeTitulo(campoObligatorio);
      const campoLower = campoObligatorio.toLowerCase();
      
      if ((text.toLowerCase().includes(campoLower) || html.toLowerCase().includes(campoLower)) 
          && !titulosSet.has(campoNormalizado)) {
        titulosSet.add(campoNormalizado);
        titulos.push(campoObligatorio);
        contenidoCompleto[campoObligatorio] = '';
        console.log(`✅ Campo obligatorio encontrado: ${campoObligatorio}`);
      }
    }
    
    // PASO 3: Extraer TODO el texto de TODAS las etiquetas HTML
    const allTextRegex = />([^<]+)</g;
    let textMatch;
    const todosLosTextos = new Set();
    
    while ((textMatch = allTextRegex.exec(html)) !== null) {
      const textoExtraido = textMatch[1].trim();
      if (textoExtraido && textoExtraido.length > 2) {
        todosLosTextos.add(textoExtraido);
      }
    }
    
    console.log(`✓ Textos únicos extraídos: ${todosLosTextos.size}`);
    
    // Procesar cada texto extraído
    for (const texto of todosLosTextos) {
      // Detectar campos importantes
      const esImportante = (
        texto.toLowerCase().includes('unidades') ||
        texto.toLowerCase().includes('temáticas') ||
        texto.toLowerCase().includes('contenido') ||
        texto.toLowerCase().includes('resultado') ||
        texto.toLowerCase().includes('criterio') ||
        texto.toLowerCase().includes('instrumento') ||
        texto.toLowerCase().includes('evaluación') ||
        texto.toLowerCase().includes('aprendizaje') ||
        texto.toLowerCase().includes('total') ||
        texto.toLowerCase().includes('hora') ||
        texto.toLowerCase().includes('recuperación') ||
        (texto.length > 5 && texto.length < 100 && /^[A-ZÁÉÍÓÚÑ]/.test(texto))
      );
      
      if (esImportante) {
        const titulo = normalizeTitulo(texto);
        if (titulo && titulo.length > 2 && !titulosSet.has(titulo) && !/^[\d\s\-:]+$/.test(titulo)) {
          titulosSet.add(titulo);
          titulos.push(texto);
          contenidoCompleto[texto] = '';
          console.log(`✓ Campo importante agregado: ${texto}`);
        }
      }
    }
    
    console.log(`✓ Después de extracción ultra-agresiva: ${titulos.length} campos totales`);
    
    // PASO ADICIONAL: Extraer también del texto plano líneas importantes que no estén en tablas
    // Esto captura campos como "Evaluación de Recuperación", títulos de sección, etc.
    const textLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];
      
      // Detectar líneas que parecen ser títulos o campos importantes
      const esLineaImportante = (
        // Líneas que terminan con ":"
        line.endsWith(':') ||
        // Líneas completamente en mayúsculas (títulos de sección)
        (line === line.toUpperCase() && line.length > 3 && line.length < 100 && !/^\d+$/.test(line)) ||
        // Líneas que empiezan con número y punto (ej: "1. DATOS GENERALES", "3. VISADO")
        line.match(/^\d+\.\s+[A-ZÁÉÍÓÚÑ]/) ||
        // Líneas que contienen "Total" (campos de totales)
        line.toLowerCase().includes('total ') ||
        // Líneas que contienen "Evaluación"
        line.toLowerCase().includes('evaluación') ||
        // Líneas con formato "PALABRA/PALABRA" en mayúsculas
        /^[A-ZÁÉÍÓÚÑ\/\s]+$/.test(line) && line.includes('/')
      );

      if (esLineaImportante) {
        const titulo = normalizeTitulo(line.replace(/:$/, ''));
        
        if (titulo && titulo.length > 2 && !titulosSet.has(titulo)) {
          titulosSet.add(titulo);
          titulos.push(titulo);
          
          // Intentar obtener el contenido de la línea siguiente
          const contenido = (i + 1 < textLines.length) ? textLines[i + 1] : '';
          contenidoCompleto[titulo] = contenido;
          
          // Guardar también con el título original
          if (line !== titulo) {
            contenidoCompleto[line.replace(/:$/, '')] = contenido;
          }
        }
      }
    }
    
    // ========== EXTRACCIÓN ESPECÍFICA PARA LA SECCIÓN DE VISADO ==========
    console.log('\n=== EXTRAYENDO SECCIÓN DE VISADO ===\n');
    
    // Buscar el índice donde empieza VISADO en el texto
    const visadoIndex = text.search(/(\d+\.?\s*)?VISADO/i);
    
    if (visadoIndex !== -1) {
      // Extraer todo el texto desde VISADO hasta el final
      const visadoText = text.substring(visadoIndex);
      const siguienteSeccion = visadoText.substring(10).search(/^\d+\.\s+[A-ZÁÉÍÓÚÑ]/m);
      const textoVisado = siguienteSeccion !== -1 
        ? visadoText.substring(0, siguienteSeccion + 10)
        : visadoText.substring(0, 2000); // Tomar máximo 2000 caracteres
      
      console.log('📄 Texto de VISADO extraído (primeros 800 chars):', textoVisado.substring(0, 800));
      
      // Agregar el título VISADO
      if (!titulosSet.has('VISADO')) {
        titulosSet.add('VISADO');
        titulos.push('VISADO');
        contenidoCompleto['VISADO'] = '';
      }
      
      // Extraer nombres con títulos académicos del VISADO
      // Buscar patrones como "Lic. Alexandra Monserrate Pionce Parrales, Mg. Duie."
      const nombresConTitulos = textoVisado.match(/((?:Lic\.|Ing\.|Dr\.|PhD|MSc|Mg\.|MBA)\.?\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,5}(?:,\s*(?:Mg|MSc|PhD|MBA|MSIG)\.?)?)/gi);
      
      if (nombresConTitulos && nombresConTitulos.length > 0) {
        console.log(`\n✓ Encontrados ${nombresConTitulos.length} nombres en VISADO:\n`);
        
        nombresConTitulos.forEach((nombre, index) => {
          const nombreLimpio = nombre.trim();
          const campo = `Persona ${index + 1} - VISADO`;
          
          if (!titulosSet.has(campo)) {
            titulosSet.add(campo);
            titulos.push(campo);
            contenidoCompleto[campo] = nombreLimpio;
            console.log(`✅ ${campo}: ${nombreLimpio}`);
          }
        });
      }
      
      // Patrones específicos para cada cargo en VISADO
      const cargosVisado = [
        { patron: /DECANO\/A\s+DE\s+FACULTAD/i, campo: 'DECANO/A DE FACULTAD' },
        { patron: /DIRECTOR\/A\s+ACADÉMICO\/A/i, campo: 'DIRECTOR/A ACADÉMICO/A' },
        { patron: /DIRECTOR\/A\s+DE\s+CARRERA/i, campo: 'DIRECTOR/A DE CARRERA' },
        { patron: /COORDINADOR\/A\s+DE\s+CARRERA/i, campo: 'COORDINADOR/A DE CARRERA' },
        { patron: /DOCENTE(?!\s*:)/i, campo: 'DOCENTE' }
      ];
      
      // Buscar cada cargo y extraer el contenido asociado
      for (const { patron, campo } of cargosVisado) {
        const cargoMatch = textoVisado.match(patron);
        
        if (cargoMatch) {
          const startPos = cargoMatch.index + cargoMatch[0].length;
          const restOfText = textoVisado.substring(startPos, startPos + 200);
          
          // Buscar estructura Nombre: ... Fecha: ...
          const estructuraMatch = restOfText.match(/Nombre:\s*([^\n]+)[\s\S]*?Fecha:\s*([^\n]+)/i);
          
          if (estructuraMatch) {
            const nombre = estructuraMatch[1]?.trim() || '';
            const fecha = estructuraMatch[2]?.trim() || '';
            const contenido = `Nombre: ${nombre} | Fecha: ${fecha}`;
            
            if (!titulosSet.has(campo)) {
              titulosSet.add(campo);
              titulos.push(campo);
              contenidoCompleto[campo] = contenido;
              console.log(`✅ ${campo}: ${contenido}`);
            }
          } else {
            // Extraer las siguientes 2-3 líneas como contenido
            const lineas = restOfText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && !l.match(/^[_\-\s]+$/));
            const contenido = lineas.slice(0, 2).join(' | ');
            
            if (contenido && !titulosSet.has(campo)) {
              titulosSet.add(campo);
              titulos.push(campo);
              contenidoCompleto[campo] = contenido;
              console.log(`✅ ${campo}: ${contenido}`);
            }
          }
        }
      }
      
      // También buscar campos adicionales de firma
      const otrosCargos = ['Firma', 'Sello', 'Fecha de elaboración', 'Fecha de aprobación'];
      for (const cargo of otrosCargos) {
        const regex = new RegExp(cargo + '[:\\s]*([^\\n]{5,100})', 'i');
        const match = textoVisado.match(regex);
        if (match && !titulosSet.has(cargo)) {
          titulosSet.add(cargo);
          titulos.push(cargo);
          contenidoCompleto[cargo] = match[1]?.trim() || '';
          console.log(`✅ ${cargo}: ${match[1]?.trim() || ''}`);
        }
      }
    } else {
      console.log('⚠️ No se encontró la sección VISADO en el documento');
    }

    // VERIFICACIÓN FINAL: Comprobar qué campos obligatorios se encontraron
    console.log('\n=== VERIFICACIÓN DE CAMPOS OBLIGATORIOS ===');
    const camposFaltantes = [];
    for (const campo of camposObligatorios) {
      const encontrado = titulos.some(t => 
        t.toLowerCase().includes(campo.toLowerCase()) ||
        campo.toLowerCase().includes(t.toLowerCase())
      );
      if (encontrado) {
        console.log(`✅ ${campo}`);
      } else {
        console.log(`❌ ${campo} - NO ENCONTRADO`);
        camposFaltantes.push(campo);
      }
    }
    
    if (camposFaltantes.length > 0) {
      console.log('\n⚠️ ADVERTENCIA: Faltan los siguientes campos:');
      console.log(camposFaltantes.join(', '));
    } else {
      console.log('\n✅ TODOS los campos obligatorios fueron encontrados');
    }
    
    // Organizar campos por sección
    const camposPorSeccion = {
      'DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA': [],
      'ESTRUCTURA DE LA ASIGNATURA': [],
      'RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES': [],
      'VISADO': []
    };
    
    // Asignar cada título a su sección correspondiente
    let seccionActualKey = null;
    
    for (const titulo of titulos) {
      const tituloUpper = titulo.toUpperCase();
      const tituloLimpio = titulo.trim();
      
      // Detectar si es un título de sección (NO agregarlo como campo)
      const esTituloSeccion = seccionesPrincipales.some(seccion => 
        seccion.toUpperCase().includes(tituloUpper) || tituloUpper.includes(seccion.toUpperCase())
      );
      
      // Cambiar la sección actual cuando encontramos un título de sección
      if (tituloUpper.includes('DATOS GENERALES')) {
        seccionActualKey = 'DATOS GENERALES Y ESPECÍFICOS DE LA ASIGNATURA';
        // NO agregarlo como campo si es el título de sección
        if (!esTituloSeccion || tituloLimpio.length < 30) {
          continue;
        }
      } else if (tituloUpper.includes('ESTRUCTURA DE LA ASIGNATURA') || tituloUpper === 'ESTRUCTURA') {
        seccionActualKey = 'ESTRUCTURA DE LA ASIGNATURA';
        continue; // No agregar el título de sección como campo
      } else if ((tituloUpper.includes('RESULTADOS') && tituloUpper.includes('EVALUACIÓN')) || 
                 (tituloUpper.includes('RESULTADOS') && tituloUpper.includes('APRENDIZAJE'))) {
        seccionActualKey = 'RESULTADOS Y EVALUACIÓN DE LOS APRENDIZAJES';
        continue; // No agregar el título de sección como campo
      } else if (tituloUpper === 'VISADO' || (tituloUpper.includes('VISADO') && tituloLimpio.length < 15)) {
        seccionActualKey = 'VISADO';
        continue; // No agregar el título de sección como campo
      } else if (seccionActualKey && !esTituloSeccion) {
        // Agregar a la sección actual SOLO si NO es un título de sección
        camposPorSeccion[seccionActualKey].push(titulo);
      }
    }
    
    console.log('\n=== CAMPOS ORGANIZADOS POR SECCIÓN ===');
    for (const [seccion, campos] of Object.entries(camposPorSeccion)) {
      console.log(`\n📁 ${seccion} (${campos.length} campos):`);
      campos.slice(0, 5).forEach((campo, idx) => {
        console.log(`   ${idx + 1}. ${campo}`);
      });
      if (campos.length > 5) {
        console.log(`   ... y ${campos.length - 5} campos más`);
      }
    }
    
    // Estructura de datos para guardar
    const datos_syllabus = {
      titulos: titulos,
      contenido: contenidoCompleto,
      secciones: seccionesPrincipales,
      campos_por_seccion: camposPorSeccion, // Organización por secciones
      texto_completo: text,
      html_completo: html,
      fecha_extraccion: new Date().toISOString(),
      campos_faltantes: camposFaltantes
    };

    // Crear el registro en la base de datos
    const nuevoSyllabus = await Syllabus.create({
      nombre,
      periodo,
      materias,
      datos_syllabus,
      usuario_id
    });

    // Eliminar el archivo temporal
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(201).json({
      success: true,
      message: camposFaltantes.length > 0 
        ? `Documento procesado. ADVERTENCIA: ${camposFaltantes.length} campos no encontrados` 
        : 'Documento procesado exitosamente con todos los campos',
      data: {
        id: nuevoSyllabus.id,
        nombre: nuevoSyllabus.nombre,
        periodo: nuevoSyllabus.periodo,
        materias: nuevoSyllabus.materias,
        titulos_extraidos: titulos.length,
        campos_obligatorios_encontrados: camposObligatorios.length - camposFaltantes.length,
        campos_obligatorios_totales: camposObligatorios.length,
        campos_faltantes: camposFaltantes,
        titulos: titulos, // TODOS los títulos extraídos
        secciones: seccionesPrincipales, // Secciones principales detectadas
        campos_por_seccion: datos_syllabus.campos_por_seccion, // Campos organizados por sección
        primeros_20_titulos: titulos.slice(0, 20) // Mantener por compatibilidad
      }
    });

  } catch (error) {
    console.error('Error al procesar documento:', error);
    
    // Limpiar el archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: 'Error al procesar el documento',
      error: error.message
    });
  }
};

// --- SUBIR Y PROCESAR ARCHIVO EXCEL ---
exports.uploadExcel = async (req, res) => {
  try {
    console.log('\n=== INICIANDO PROCESAMIENTO DE ARCHIVO EXCEL ===\n');
    
    const { nombre, periodo, materias } = req.body;
    const usuario_id = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo Excel'
      });
    }

    if (!nombre || !periodo || !materias) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, periodo y materias son obligatorios'
      });
    }

    const filePath = req.file.path;
    console.log('📁 Archivo Excel recibido:', req.file.originalname);

    // Leer el archivo Excel
    const workbook = xlsx.readFile(filePath);
    console.log('📊 Hojas encontradas:', workbook.SheetNames.length);
    console.log('📋 Nombres de hojas:', workbook.SheetNames.join(', '));

    const camposPorSeccion = {};
    const todasLasCeldasExtraidas = [];
    let totalCamposExtraidos = 0;

    // Procesar cada hoja del Excel
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n=== Procesando hoja: "${sheetName}" ===`);
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir la hoja a JSON (array de objetos)
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { 
        header: 1, // Usar índices numéricos como encabezados
        defval: '', // Valor por defecto para celdas vacías
        blankrows: false // Omitir filas completamente vacías
      });

      const camposDeHoja = [];

      // Extraer todos los valores no vacíos
      jsonData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell && cell.toString().trim() !== '') {
            const valorCelda = cell.toString().trim();
            
            // Detectar si es un campo (título) o contenido
            // Consideramos campo si tiene cierto formato o es la primera columna
            const esCampo = colIndex === 0 || 
                           valorCelda.length < 100 || 
                           valorCelda.endsWith(':') ||
                           /^[A-ZÁÉÍÓÚÑ\s]+:?$/.test(valorCelda);
            
            if (esCampo) {
              const campoLimpio = valorCelda.replace(/:$/, '').trim();
              if (campoLimpio.length > 2) {
                camposDeHoja.push(campoLimpio);
                todasLasCeldasExtraidas.push({
                  hoja: sheetName,
                  fila: rowIndex + 1,
                  columna: colIndex + 1,
                  valor: campoLimpio
                });
              }
            }
          }
        });
      });

      console.log(`✓ Campos extraídos de "${sheetName}": ${camposDeHoja.length}`);
      
      // Agregar los campos de esta hoja a la estructura
      camposPorSeccion[sheetName] = camposDeHoja;
      totalCamposExtraidos += camposDeHoja.length;
    }

    console.log(`\n✓ Total de campos extraídos: ${totalCamposExtraidos}`);
    console.log(`✓ Hojas procesadas: ${Object.keys(camposPorSeccion).length}`);

    // Estructura de datos para guardar
    const datos_syllabus = {
      tipo_archivo: 'excel',
      hojas: workbook.SheetNames,
      campos_por_seccion: camposPorSeccion,
      total_campos: totalCamposExtraidos,
      fecha_extraccion: new Date().toISOString()
    };

    // Crear el registro en la base de datos
    const nuevoSyllabus = await Syllabus.create({
      nombre,
      periodo,
      materias,
      datos_syllabus,
      usuario_id
    });

    // Eliminar el archivo temporal
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Preparar lista de todos los títulos para compatibilidad
    const todosTitulos = [];
    for (const hoja of workbook.SheetNames) {
      todosTitulos.push(...(camposPorSeccion[hoja] || []));
    }

    return res.status(201).json({
      success: true,
      message: 'Archivo Excel procesado exitosamente',
      data: {
        id: nuevoSyllabus.id,
        nombre: nuevoSyllabus.nombre,
        periodo: nuevoSyllabus.periodo,
        materias: nuevoSyllabus.materias,
        tipo_archivo: 'excel',
        hojas: workbook.SheetNames,
        titulos_extraidos: totalCamposExtraidos,
        titulos: todosTitulos,
        campos_por_seccion: camposPorSeccion
      }
    });

  } catch (error) {
    console.error('Error al procesar archivo Excel:', error);
    
    // Limpiar el archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo Excel',
      error: error.message
    });
  }
};

// ============================================
// NUEVAS FUNCIONES PARA VALIDACIÓN DE TÍTULOS
// ============================================

/**
 * Marcar un syllabus como plantilla de referencia del admin
 * Solo el admin puede hacer esto
 */
exports.marcarComoPlantilla = async (req, res) => {
  try {
    const { id } = req.params;
    const { periodo } = req.body;
    
    // Verificar que el usuario sea admin
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden marcar plantillas de referencia'
      });
    }
    
    // Buscar el syllabus
    const syllabus = await Syllabus.findByPk(id);
    if (!syllabus) {
      return res.status(404).json({
        success: false,
        message: 'Syllabus no encontrado'
      });
    }
    
    // Desmarcar cualquier otra plantilla del mismo periodo
    await Syllabus.update(
      { es_plantilla_referencia: false },
      { where: { periodo: periodo || syllabus.periodo, es_plantilla_referencia: true } }
    );
    
    // Marcar este como plantilla
    syllabus.es_plantilla_referencia = true;
    
    // Si no tiene títulos extraídos, intentar extraerlos ahora
    if (!syllabus.titulos_extraidos || syllabus.titulos_extraidos.length === 0) {
      console.log('⚠️ La plantilla no tiene títulos extraídos. Debe subir un archivo Word para extraer títulos.');
    }
    
    await syllabus.save();
    
    console.log(`✅ Syllabus ${id} marcado como plantilla de referencia para periodo: ${syllabus.periodo}`);
    
    return res.status(200).json({
      success: true,
      message: 'Syllabus marcado como plantilla de referencia exitosamente',
      data: {
        id: syllabus.id,
        nombre: syllabus.nombre,
        periodo: syllabus.periodo,
        es_plantilla_referencia: syllabus.es_plantilla_referencia,
        titulos_extraidos: syllabus.titulos_extraidos || []
      }
    });
    
  } catch (error) {
    console.error('❌ Error al marcar syllabus como plantilla:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al marcar syllabus como plantilla',
      error: error.message
    });
  }
};

/**
 * Subir syllabus del admin con extracción de títulos para plantilla
 * Este será el syllabus de referencia que los profesores deben seguir
 */
exports.subirPlantillaAdmin = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo'
      });
    }
    
    const filePath = req.file.path;
    const { nombre, periodo, materias } = req.body;
    const usuario_id = req.user.id;
    
    if (!nombre || !periodo) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre y periodo son obligatorios'
      });
    }
    
    console.log(`📤 Admin subiendo plantilla de referencia para periodo: ${periodo}`);
    
    // Extraer títulos en negrita del documento
    const titulos = await extraerTitulosNegrita(filePath);
    
    console.log(`📋 Títulos extraídos de la plantilla: ${titulos.length}`);
    console.log('Títulos:', titulos);
    
    if (titulos.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'No se pudieron extraer títulos del documento. Asegúrese de que los títulos importantes estén en negrita.'
      });
    }
    
    // Desmarcar cualquier plantilla anterior del mismo periodo
    await Syllabus.update(
      { es_plantilla_referencia: false },
      { where: { periodo, es_plantilla_referencia: true } }
    );
    
    // Crear el syllabus plantilla
    const plantilla = await Syllabus.create({
      nombre,
      periodo,
      materias: materias || nombre,
      datos_syllabus: { tipo: 'plantilla_referencia', titulos },
      usuario_id,
      es_plantilla_referencia: true,
      titulos_extraidos: titulos
    });
    
    // Eliminar archivo temporal
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    console.log(`✅ Plantilla de referencia creada: ID ${plantilla.id}, Periodo: ${periodo}, Títulos: ${titulos.length}`);
    
    return res.status(201).json({
      success: true,
      message: 'Plantilla de referencia creada exitosamente',
      data: {
        id: plantilla.id,
        nombre: plantilla.nombre,
        periodo: plantilla.periodo,
        es_plantilla_referencia: true,
        total_titulos: titulos.length,
        titulos_requeridos: titulos
      }
    });
    
  } catch (error) {
    console.error('❌ Error al subir plantilla del admin:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la plantilla',
      error: error.message
    });
  }
};

/**
 * Validar y subir syllabus de profesor/comisión
 * Compara contra la plantilla de referencia del admin antes de guardar
 */
exports.subirSyllabusConValidacion = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se ha proporcionado ningún archivo' });
    }

    const filePath = req.file.path;
    const { nombre, periodo, materias } = req.body;
    const usuario_id = req.user.id;

    if (!nombre || !periodo) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: 'Los campos nombre y periodo son obligatorios' });
    }

    console.log(`📤 Usuario ${req.user.nombres} subiendo syllabus para periodo: ${periodo}`);

    // 1. Buscar la plantilla de referencia del admin para este periodo
    const plantilla = await Syllabus.findOne({ where: { periodo, es_plantilla_referencia: true } });

    if (!plantilla) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: `No existe una plantilla de referencia para el periodo ${periodo}. Contacte al administrador.` });
    }

    if (!plantilla.datos_syllabus || Object.keys(plantilla.datos_syllabus).length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: 'La plantilla de referencia no contiene la configuración del editor (datos_syllabus). Contacte al administrador.' });
    }

    console.log(`📋 Plantilla encontrada: ${plantilla.nombre} (ID: ${plantilla.id}) - validando contra configuración del editor`);

    // 2. Validar usando la configuración del editor (datos_syllabus)
    const resultado = await validarSyllabusContraPlantilla(plantilla.datos_syllabus, filePath);

    // Resultado esperado: { esValido, faltantes, extras, porcentaje, encontrados, total }
    if (!resultado || typeof resultado !== 'object') {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(500).json({ success: false, message: 'Error al validar el documento contra la plantilla' });
    }

    console.log(`📊 Resultado validación: ${resultado.porcentaje}% coincidencia - Válido: ${resultado.esValido}`);

    if (!resultado.esValido) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'El syllabus no cumple con la estructura requerida según la plantilla del administrador',
        detalles: {
          porcentaje_coincidencia: resultado.porcentaje,
          total_requeridos: resultado.total,
          encontrados: resultado.encontrados,
          faltantes: resultado.faltantes,
          extras: resultado.extras
        }
      });
    }

    // 3. Si pasó la validación, extraer títulos del documento para almacenarlos (separado)
    const titulosProfesor = await extraerTitulosWord(filePath).catch(err => {
      console.warn('⚠️ No se pudieron extraer títulos del Word para almacenamiento:', err.message);
      return [];
    });

    // 4. Guardar el syllabus validado
    const nuevoSyllabus = await Syllabus.create({
      nombre,
      periodo,
      materias: materias || nombre,
      datos_syllabus: {
        tipo: 'syllabus_validado',
        titulos: titulosProfesor,
        validacion: resultado
      },
      usuario_id,
      es_plantilla_referencia: false,
      titulos_extraidos: titulosProfesor
    });

    // Eliminar archivo temporal
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    console.log(`✅ Syllabus validado y guardado: ID ${nuevoSyllabus.id}`);

    return res.status(201).json({
      success: true,
      message: '✅ Syllabus validado y guardado exitosamente',
      data: {
        id: nuevoSyllabus.id,
        nombre: nuevoSyllabus.nombre,
        periodo: nuevoSyllabus.periodo,
        validacion: {
          porcentaje_coincidencia: resultado.porcentaje,
          total_requeridos: resultado.total,
          encontrados: resultado.encontrados
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al validar syllabus:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({ success: false, message: 'Error al procesar el syllabus', error: error.message });
  }
};

/**
 * Obtener la plantilla de referencia para un periodo específico
 */
exports.obtenerPlantillaPeriodo = async (req, res) => {
  try {
    const { periodo } = req.params;
    
    const plantilla = await Syllabus.findOne({
      where: {
        periodo,
        es_plantilla_referencia: true
      },
      include: {
        model: Usuario,
        as: 'creador',
        attributes: ['id', 'nombres', 'apellidos']
      }
    });
    
    if (!plantilla) {
      return res.status(404).json({
        success: false,
        message: `No existe plantilla de referencia para el periodo ${periodo}`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        id: plantilla.id,
        nombre: plantilla.nombre,
        periodo: plantilla.periodo,
        titulos_requeridos: plantilla.titulos_extraidos || [],
        total_titulos: (plantilla.titulos_extraidos || []).length,
        creador: plantilla.creador
      }
    });
    
  } catch (error) {
    console.error('❌ Error al obtener plantilla:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener plantilla de referencia',
      error: error.message
    });
  }
};

// ============================================================
// EXTRAER TABLAS CRUDAS DEL WORD (mammoth + cheerio)
// POST /api/syllabi/extract-word-tables
// Devuelve: { rawTables: string[][][], flatHeaders: string[][], wordData: Record<string,string>, stats }
// ============================================================
exports.extractWordTables = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió archivo .docx' });
    }

    const buffer = fs.readFileSync(req.file.path);

    // 1) Convertir a HTML con mammoth
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const html = htmlResult.value;

    // 2) Parsear tablas con cheerio
    // 2) Parsear tablas con cheerio (SOPORTE PARA ROWSPAN Y COLSPAN)
    const $ = cheerio.load(html);
    const rawTables = [];
    const flatHeaders = [];

    $('table').each((tIdx, table) => {
      const grid = [];
      
      $(table).find('tr').each((rIdx, tr) => {
        if (!grid[rIdx]) grid[rIdx] = [];
        let cIdx = 0;
        
        $(tr).find('td, th').each((_, td) => {
          // Buscar la siguiente columna disponible en esta fila
          while (grid[rIdx][cIdx] !== undefined) {
            cIdx++;
          }
          
          const $td = $(td);
          const text = ($td.text() || '').replace(/\s+/g, ' ').trim();
          const rowSpan = parseInt($td.attr('rowspan') || '1', 10) || 1;
          const colSpan = parseInt($td.attr('colspan') || '1', 10) || 1;
          
          // Llenar la matriz virtual
          for (let r = 0; r < rowSpan; r++) {
            for (let c = 0; c < colSpan; c++) {
              if (!grid[rIdx + r]) grid[rIdx + r] = [];
              grid[rIdx + r][cIdx + c] = (r === 0 && c === 0) ? text : "";
            }
          }
        });
      });

      // Limpiar y guardar la tabla
      const tableRows = grid.filter(row => row && row.length > 0);
      if (tableRows.length > 0) {
        rawTables.push(tableRows);
        // Los headers son la primera fila de la tabla
        flatHeaders.push(tableRows[0] || []);
      }
    });

    // 3) Construir wordData (pares clave → valor) de todas las filas
    const wordData = {};

    const normalizar = (s) => (s || '')
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ').trim();

    rawTables.forEach((table) => {
      table.forEach((row) => {
        // Fila de 2 celdas: clave | valor
        if (row.length === 2 && row[0].length >= 2 && row[0].length < 100 && row[1].length > 0) {
          const clave = normalizar(row[0]);
          if (!wordData[clave]) wordData[clave] = row[1];
        }
        // Fila de 4 celdas: clave1 | val1 | clave2 | val2
        if (row.length === 4) {
          const c0 = normalizar(row[0]);
          const c2 = normalizar(row[2]);
          if (c0.length >= 2 && c0.length < 100 && row[1].length > 0 && !wordData[c0]) wordData[c0] = row[1];
          if (c2.length >= 2 && c2.length < 100 && row[3].length > 0 && !wordData[c2]) wordData[c2] = row[3];
        }
        // Fila de 3 celdas
        if (row.length === 3) {
          const c0 = normalizar(row[0]);
          const c1 = normalizar(row[1]);
          if (c0.length >= 2 && c0.length < 100 && !wordData[c0]) wordData[c0] = [row[1], row[2]].filter(Boolean).join(' | ');
          if (c1.length >= 2 && c1.length < 60 && row[2].length > 0 && !wordData[c1]) wordData[c1] = row[2];
        }
      });
    });

    // Limpiar archivo temporal
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    console.log(`✅ [extractWordTables] ${rawTables.length} tablas, ${Object.keys(wordData).length} claves`);

    return res.status(200).json({
      success: true,
      rawTables,
      flatHeaders,
      wordData,
      stats: {
        tablas: rawTables.length,
        claves: Object.keys(wordData).length,
        metodo: 'mammoth+cheerio'
      }
    });
  } catch (error) {
    console.error('❌ [extractWordTables] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al extraer tablas del Word',
      error: error.message
    });
  }
};