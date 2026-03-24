const xlsx = require('xlsx');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs').promises;
const db = require('../models');
const { Op } = require('sequelize');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');

// Modelos
const ProgramaAnalitico = db.ProgramasAnaliticos;
const Usuario = db.Usuario;
const PlantillaPrograma = db.PlantillaPrograma;
const SeccionPlantilla = db.SeccionPlantilla;
const CampoSeccion = db.CampoSeccion;
const ContenidoPrograma = db.ContenidoPrograma;
const FilaTablaPrograma = db.FilaTablaPrograma;
const ValorCampoPrograma = db.ValorCampoPrograma;

/**
 * Controlador para gestión de programas analíticos
 */

/**
 * Función auxiliar para crear o actualizar una plantilla a partir de las secciones detectadas del Excel
 */
async function crearPlantillaDesdeExcel(seccionesDetectadas, nombrePlantilla, usuarioId, transaction) {
  try {
    // Buscar si ya existe una plantilla con ese nombre
    let plantilla = await PlantillaPrograma.findOne({
      where: { nombre: nombrePlantilla }
    });

    // Si no existe, crear una nueva
    if (!plantilla) {
      plantilla = await PlantillaPrograma.create({
        nombre: nombrePlantilla,
        descripcion: `Plantilla generada automáticamente desde Excel - ${new Date().toLocaleDateString()}`,
        tipo: 'excel_import',
        activa: true,
        usuario_creador_id: usuarioId
      }, { transaction });

      console.log(`✅ Plantilla creada: ${plantilla.nombre} (ID: ${plantilla.id})`);
    } else {
      console.log(`♻️ Plantilla existente encontrada: ${plantilla.nombre} (ID: ${plantilla.id})`);
      
      // 🔥 ORDEN CORRECTO: Eliminar datos relacionales ANTES de eliminar secciones
      // 1. Obtener todas las secciones de esta plantilla
      const seccionesExistentes = await SeccionPlantilla.findAll({
        where: { plantilla_id: plantilla.id },
        attributes: ['id'],
        transaction
      });
      
      const seccionIds = seccionesExistentes.map(s => s.id);
      
      if (seccionIds.length > 0) {
        // 2. Obtener todos los contenidos que referencian estas secciones
        const contenidosExistentes = await ContenidoPrograma.findAll({
          where: { seccion_plantilla_id: seccionIds },
          attributes: ['id'],
          transaction
        });
        
        const contenidoIds = contenidosExistentes.map(c => c.id);
        
        if (contenidoIds.length > 0) {
          // 3. Obtener todas las filas que referencian estos contenidos
          const filasExistentes = await FilaTablaPrograma.findAll({
            where: { contenido_programa_id: contenidoIds },
            attributes: ['id'],
            transaction
          });
          
          const filaIds = filasExistentes.map(f => f.id);
          
          // 4. Eliminar valores de campos (nivel más profundo)
          if (filaIds.length > 0) {
            await ValorCampoPrograma.destroy({
              where: { fila_tabla_id: filaIds },
              transaction
            });
            console.log(`🗑️ ${filaIds.length} valores de campos eliminados`);
          }
          
          // 5. Eliminar filas de tablas
          await FilaTablaPrograma.destroy({
            where: { contenido_programa_id: contenidoIds },
            transaction
          });
          console.log(`🗑️ ${filasExistentes.length} filas eliminadas`);
          
          // 6. Eliminar contenidos
          await ContenidoPrograma.destroy({
            where: { seccion_plantilla_id: seccionIds },
            transaction
          });
          console.log(`🗑️ ${contenidosExistentes.length} contenidos eliminados`);
        }
      }
      
      // 7. Ahora sí, eliminar secciones anteriores
      await SeccionPlantilla.destroy({
        where: { plantilla_id: plantilla.id },
        transaction
      });
      
      console.log(`🗑️ ${seccionIds.length} secciones anteriores eliminadas`);
    }

    // Crear las secciones basadas en lo detectado del Excel
    for (let i = 0; i < seccionesDetectadas.length; i++) {
      const seccion = seccionesDetectadas[i];
      
      const nuevaSeccion = await SeccionPlantilla.create({
        plantilla_id: plantilla.id,
        nombre: seccion.titulo,
        descripcion: `Sección ${seccion.tipo === 'tabla' ? 'tipo tabla' : 'de texto largo'}`,
        tipo: seccion.tipo, // 'texto_largo' o 'tabla'
        orden: i + 1,
        obligatoria: true
      }, { transaction });

      console.log(`  📝 Sección creada: ${nuevaSeccion.nombre} (${nuevaSeccion.tipo})`);

      // Si es una tabla, crear los campos basados en los encabezados
      if (seccion.tipo === 'tabla' && seccion.encabezados && seccion.encabezados.length > 0) {
        for (let j = 0; j < seccion.encabezados.length; j++) {
          const encabezado = seccion.encabezados[j];
          
          if (encabezado && encabezado.trim() !== '') {
          await CampoSeccion.create({
            seccion_id: nuevaSeccion.id,
            nombre: encabezado.toLowerCase().replace(/\s+/g, '_'),
            etiqueta: encabezado,
            tipo_campo: 'texto', // Por defecto texto, se puede mejorar
            orden: j + 1,
            requerido: false,
            placeholder: encabezado,
            opciones_json: null,
            validacion_json: null
          }, { transaction });            console.log(`    🔹 Campo creado: ${encabezado}`);
          }
        }
      }
    }

    return plantilla;

  } catch (error) {
    console.error('❌ Error al crear plantilla desde Excel:', error);
    throw error;
  }
}

/**
 * Función auxiliar para guardar datos del Excel en las tablas relacionales
 */
async function guardarDatosEnTablas(programaId, plantillaId, seccionesDetectadas, transaction) {
  try {
    console.log('📊 Guardando datos en tablas relacionales...');
    
    // Obtener todas las secciones de la plantilla con sus campos
    const secciones = await SeccionPlantilla.findAll({
      where: { plantilla_id: plantillaId },
      include: [{
        model: CampoSeccion,
        as: 'campos',
        required: false
      }],
      order: [['orden', 'ASC'], [{ model: CampoSeccion, as: 'campos' }, 'orden', 'ASC']],
      transaction
    });

    console.log(`  📋 ${secciones.length} secciones encontradas en la plantilla`);

    // Procesar cada sección
    for (const seccion of secciones) {
      // Buscar los datos correspondientes del Excel
      const datosSeccion = seccionesDetectadas.find(s => 
        s.titulo.trim().toUpperCase() === seccion.nombre.trim().toUpperCase()
      );

      if (!datosSeccion || !datosSeccion.datos || datosSeccion.datos.length === 0) {
        console.log(`  ⚠️ Sin datos para sección: ${seccion.nombre}`);
        continue;
      }

      // Crear registro de contenido_programa
      let textoContenido = null;
      
      if (seccion.tipo === 'texto_largo') {
        // Para texto largo: extraer solo el texto plano, sin arrays ni JSON
        textoContenido = datosSeccion.datos
          .map(fila => {
            // Unir todas las celdas de la fila con espacio
            return fila.filter(c => c && c.trim()).join(' ');
          })
          .filter(linea => linea.trim() !== '') // Eliminar líneas vacías
          .join('\n'); // Unir líneas con salto de línea
      }
      
      const contenido = await ContenidoPrograma.create({
        programa_analitico_id: programaId,
        seccion_plantilla_id: seccion.id,
        contenido_texto: textoContenido
      }, { transaction });

      console.log(`  ✅ Contenido creado para: ${seccion.nombre} (ID: ${contenido.id})`);

      // Si es una tabla, guardar las filas y valores
      if (seccion.tipo === 'tabla' && seccion.campos && seccion.campos.length > 0) {
        let filasProcesadas = 0;

        for (let i = 0; i < datosSeccion.datos.length; i++) {
          const filaExcel = datosSeccion.datos[i];
          
          // Saltar filas vacías
          if (!filaExcel || !filaExcel.some(cell => cell && cell.toString().trim() !== '')) {
            continue;
          }

          // Crear fila de tabla
          const fila = await FilaTablaPrograma.create({
            contenido_programa_id: contenido.id,
            orden: i + 1
          }, { transaction });

          // Guardar valores de cada campo
          for (let j = 0; j < seccion.campos.length; j++) {
            const campo = seccion.campos[j];
            const valor = filaExcel[j] ? filaExcel[j].toString().trim() : '';

            if (valor) {
              await ValorCampoPrograma.create({
                fila_tabla_id: fila.id,
                campo_seccion_id: campo.id,
                valor: valor
              }, { transaction });
            }
          }

          filasProcesadas++;
        }

        console.log(`    📝 ${filasProcesadas} filas guardadas en la tabla`);
      }
    }

    console.log('✅ Datos guardados exitosamente en tablas relacionales');
    return true;

  } catch (error) {
    console.error('❌ Error al guardar datos en tablas:', error);
    throw error;
  }
}

/**


// Subir y procesar archivo Excel o Word de programa analítico
// Subir y procesar archivo Excel o Word de programa analítico
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.excel || req.files.excel.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo'
      });
    }

    const archivo = req.files.excel[0];
    const escudoFile = req.files.escudo ? req.files.escudo[0] : null;

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

    // Procesar según el tipo de archivo
    if (esWord) {
      console.log('📄 Procesando archivo Word (.docx)...');
      jsonData = await procesarWord(archivo.buffer);
    } else {
      console.log('📊 Procesando archivo Excel (.xlsx)...');
      // Leer y procesar Excel desde buffer de multer
      const workbook = xlsx.read(archivo.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Extraer todas las celdas con header para detectar secciones
      const range = xlsx.utils.decode_range(worksheet['!ref']);
      jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    }

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo está vacío'
      });
    }

    // Función para detectar secciones por títulos (Formato UNESUM)
    const detectarSecciones = (data) => {
      const secciones = [];
      const seccionesEspeciales = [
        // Orden CRÍTICO: De más específico a más general
        // Secciones que contienen "ASIGNATURA" deben ir ANTES que el patrón genérico "ASIGNATURA"
        // Nota: \s+ permite múltiples espacios para manejar espacios extra del Word
        
        // Cabecera
        { patron: /PROGRAMA\s+ANAL[IÍ]TICO\s+DE\s+ASIGNATURA/i, nombre: 'PROGRAMA ANALÍTICO DE ASIGNATURA', tipo: 'cabecera', esCabecera: true },
        
        // Secciones específicas con "ASIGNATURA" (DEBEN IR PRIMERO)
        { patron: /OBJETIVOS\s+DE\s+LA\s+ASIGNATURA/i, nombre: 'OBJETIVOS DE LA ASIGNATURA', tipo: 'texto_largo' },
        { patron: /RESULTADOS?\s+D?E?\s*APRENDIZAJE\s+DE\s+LA\s+ASIGNATURA/i, nombre: 'RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA', tipo: 'texto_largo' },
        { patron: /CONTENIDOS?\s+DE\s+LA\s+ASIGNATURA/i, nombre: 'CONTENIDO DE LA ASIGNATURA', tipo: 'tabla' },
        
        // Datos generales (ahora DESPUÉS de los específicos)
        { patron: /ASIGNATURA/i, nombre: 'ASIGNATURA', tipo: 'datos_generales', esDatosGenerales: true },
        { patron: /PERIODO\s+ACAD[EÉ]MICO/i, nombre: 'PERIODO ACADÉMICO ORDINARIO(PAO)', tipo: 'datos_generales', esDatosGenerales: true },
        { patron: /NIVEL/i, nombre: 'NIVEL', tipo: 'datos_generales', esDatosGenerales: true },
        
        // Secciones principales
        { patron: /CARACTERIZACI[OÓ]N/i, nombre: 'CARACTERIZACIÓN', tipo: 'texto_largo' },
        { patron: /COMPETENCIAS/i, nombre: 'COMPETENCIAS', tipo: 'texto_largo' },
        
        // Contenido alternativo
        { patron: /UNIDADES\s+TEM[AÁ]TICAS/i, nombre: 'CONTENIDO DE LA ASIGNATURA', tipo: 'tabla' },
        
        // Metodología y evaluación
        { patron: /METODOLOG[IÍ]A/i, nombre: 'METODOLOGÍA', tipo: 'texto_largo' },
        { patron: /PROCEDIMIENTOS?\s+DE\s+EVALUACI[OÓ]N/i, nombre: 'PROCEDIMIENTO DE EVALUACIÓN', tipo: 'texto_largo' },
        
        // Bibliografía (puede ser tabla con sub-secciones)
        { patron: /BIBLIOGRAF[IÍ]A\s*-?\s*FUENTES\s+DE\s+CONSULTA/i, nombre: 'BIBLIOGRAFÍA - FUENTES DE CONSULTA', tipo: 'tabla' },
        { patron: /BIBLIOGRAF[IÍ]A\s+B[AÁ]SICA/i, nombre: 'BIBLIOGRAFÍA BÁSICA', tipo: 'texto_largo', esSubseccion: true },
        { patron: /BIBLIOGRAF[IÍ]A\s+COMPLEMENTARIA/i, nombre: 'BIBLIOGRAFÍA COMPLEMENTARIA', tipo: 'texto_largo', esSubseccion: true },
        
        // Firmas
        { patron: /VISADO/i, nombre: 'VISADO', tipo: 'tabla', esFirmas: true }
      ];

      let seccionActual = null;
      let nombreSeccion = null;
      let tipoSeccion = 'texto_largo';
      let datosSeccion = [];
      let encabezadosTabla = [];
      let esTituloNegrilla = false;

      data.forEach((fila, idx) => {
        // Función para limpiar texto agresivamente
        const limpiarTexto = (texto) => {
          if (!texto) return '';
          return texto.toString()
            .replace(/[\r\n]+/g, ' ')  // Saltos de línea
            .replace(/\s+/g, ' ')       // Múltiples espacios
            .replace(/["""'']/g, '')    // Comillas fancy
            .replace(/^\s+|\s+$/g, '')  // Trim
            .toUpperCase();              // Mayúsculas para comparación
        };
        
        // Buscar texto en TODAS las columnas, no solo las primeras 3
        const columnasLimpias = fila.map(c => limpiarTexto(c));
        const filaTextoCompleto = columnasLimpias.join(' ').trim();
        
        // Para logs: usar las primeras columnas
        const col1Limpia = columnasLimpias[0] || '';
        const col2Limpia = columnasLimpias[1] || '';
        const col3Limpia = columnasLimpias[2] || '';
        
        // Detectar si es un título de sección usando REGEX
        // Buscar en CUALQUIER columna de la fila
        const seccionEncontrada = seccionesEspeciales.find(sec => {
          if (sec.patron instanceof RegExp) {
            // Buscar en el texto completo de la fila O en cualquier columna individual
            if (sec.patron.test(filaTextoCompleto)) return true;
            
            // También buscar en cada columna individualmente
            return columnasLimpias.some(col => sec.patron.test(col));
          } else {
            // Fallback para patrones string
            if (filaTextoCompleto.includes(sec.patron.toUpperCase())) return true;
            return columnasLimpias.some(col => col.includes(sec.patron.toUpperCase()));
          }
        });

        // Log más detallado para depuración
        if (idx < 75) { // Limitar logs
          const resumen = filaTextoCompleto.length > 60 ? filaTextoCompleto.substring(0, 60) + '...' : filaTextoCompleto;
          console.log(`📋 Fila ${idx}: "${resumen}" ${seccionEncontrada ? `✅ -> ${seccionEncontrada.nombre}` : ''}`);
        }

        if (seccionEncontrada) {
          // Guardar sección anterior si existe
          if (seccionActual && datosSeccion.length > 0) {
            secciones.push({
              titulo: seccionActual,
              tipo: tipoSeccion,
              encabezados: encabezadosTabla,
              datos: datosSeccion,
              esNegrilla: esTituloNegrilla
            });
          }
          
          // Iniciar nueva sección con el nombre standarizado
          seccionActual = seccionEncontrada.nombre;  // Usar nombre estandarizado
          tipoSeccion = seccionEncontrada.tipo;
          datosSeccion = [];
          encabezadosTabla = [];
          esTituloNegrilla = true; // Los títulos siempre son negrilla
          
          console.log(`✅ Nueva sección detectada: "${seccionActual}" - Tipo: ${tipoSeccion}`);
          
          // Si es tabla, buscar encabezados en las siguientes filas
          if (tipoSeccion === 'tabla' && idx + 1 < data.length) {
            console.log(`   🔍 Buscando encabezados de tabla para: ${seccionActual}`);
            
            // Buscar la fila con encabezados (puede estar 1-5 filas después)
            for (let i = 1; i <= 5; i++) {
              if (idx + i < data.length) {
                const filaTest = data[idx + i];
                
                // Contar columnas NO vacías
                const columnasConTexto = filaTest.filter(cell => {
                  const texto = cell ? cell.toString().trim() : '';
                  return texto !== '' && texto.length > 0;
                }).length;
                
                console.log(`   📋 Fila +${i}: ${columnasConTexto} columnas con texto`);
                
                // Si tiene al menos 2 columnas con texto, son encabezados
                if (columnasConTexto >= 2) {
                  // Capturar TODAS las columnas, incluyendo vacías (para mantener estructura)
                  encabezadosTabla = filaTest.map(h => h ? h.toString().trim() : '');
                  
                  // Filtrar encabezados completamente vacíos al final
                  while (encabezadosTabla.length > 0 && encabezadosTabla[encabezadosTabla.length - 1] === '') {
                    encabezadosTabla.pop();
                  }
                  
                  console.log(`   ✅ Encabezados encontrados (${encabezadosTabla.length} cols):`, encabezadosTabla);
                  break;
                }
              }
            }
            
            // Si no se encontraron encabezados, usar estructura genérica
            if (encabezadosTabla.length === 0) {
              console.log(`   ⚠️ No se encontraron encabezados, usando columnas genéricas`);
            }
          }
        } else if (seccionActual) {
          // Agregar filas con contenido
          const filaLimpia = fila.map(c => c ? c.toString().trim() : '');
          const tieneDatos = filaLimpia.some(cell => cell !== '');
          
          if (tieneDatos) {
            // Saltar fila de encabezados si ya fue procesada
            const esFilaEncabezado = encabezadosTabla.length > 0 && 
                JSON.stringify(filaLimpia) === JSON.stringify(encabezadosTabla);
            
            if (!esFilaEncabezado) {
              // Si es tabla y tiene encabezados, asegurar que la fila tenga el mismo número de columnas
              if (tipoSeccion === 'tabla' && encabezadosTabla.length > 0) {
                // Extender o recortar la fila para que coincida con los encabezados
                const filaAjustada = [...filaLimpia];
                while (filaAjustada.length < encabezadosTabla.length) {
                  filaAjustada.push('');
                }
                if (filaAjustada.length > encabezadosTabla.length) {
                  filaAjustada.length = encabezadosTabla.length;
                }
                datosSeccion.push(filaAjustada);
              } else {
                datosSeccion.push(filaLimpia);
              }
            }
          }
        }
      });

      // Guardar última sección
      if (seccionActual && datosSeccion.length > 0) {
        secciones.push({
          titulo: seccionActual,
          tipo: tipoSeccion,
          encabezados: encabezadosTabla,
          datos: datosSeccion
        });
      }

      return secciones;
    };

    // IMPORTANTE: Si es Word, usar las secciones ya extraídas por procesarWord
    let seccionesDetectadas;
    if (esWord && jsonData._seccionesWord && jsonData._seccionesWord.length > 0) {
      console.log('📋 Usando secciones pre-extraídas del Word');
      seccionesDetectadas = jsonData._seccionesWord;
    } else {
      console.log('📋 Detectando secciones del archivo...');
      seccionesDetectadas = detectarSecciones(jsonData);
    }
    
    console.log(`📊 Total secciones a procesar: ${seccionesDetectadas.length}`);
    seccionesDetectadas.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.titulo} (${s.tipo}) - ${s.datos?.length || 0} items`);
    });

    // Guardar archivos
    const uploadsDir = path.join(__dirname, '../../uploads/programa-analitico');
    await fs.mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const archivoFileName = `programa_${timestamp}_${archivo.originalname}`;
    const archivoPath = path.join(uploadsDir, archivoFileName);
    await fs.writeFile(archivoPath, archivo.buffer);

    let escudoPath = null;
    let escudoFileName = null;
    if (escudoFile) {
      escudoFileName = `escudo_${timestamp}_${escudoFile.originalname}`;
      escudoPath = path.join(uploadsDir, escudoFileName);
      await fs.writeFile(escudoPath, escudoFile.buffer);
    }

    // Extraer datos principales del encabezado
    let datosGenerales = {};
    
    // Buscar datos generales en las primeras filas
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const fila = jsonData[i];
      if (fila[0] && fila[0].toString().includes('ASIGNATURA')) {
        datosGenerales.asignatura = fila[1] || '';
      }
      if (fila[0] && fila[0].toString().includes('PERIODO')) {
        datosGenerales.periodo_academico = fila[1] || '';
      }
      if (fila[0] && fila[0].toString().includes('NIVEL')) {
        datosGenerales.nivel = fila[1] || '';
      }
    }

    // Procesar secciones para crear estructura de tablas
    const tablasDatos = seccionesDetectadas.map(seccion => {
      let datosObjeto = [];

      if (seccion.tipo === 'texto_largo') {
        // Para secciones de texto largo, combinar todo en un solo campo
        datosObjeto = [{
          contenido: seccion.datos.map(fila => 
            fila.filter(cell => cell && cell.toString().trim() !== '').join(' ')
          ).join('\n')
        }];
      } else if (seccion.tipo === 'tabla') {
        // Para tablas, usar encabezados si existen
        datosObjeto = seccion.datos.map((fila, idx) => {
          if (!fila.some(cell => cell && cell.toString().trim() !== '')) return null;
          
          const objeto = {};
          
          if (seccion.encabezados && seccion.encabezados.length > 0) {
            // Usar encabezados como claves
            seccion.encabezados.forEach((encabezado, colIdx) => {
              const clave = encabezado 
                ? encabezado.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')
                : `columna_${colIdx + 1}`;
              objeto[clave] = fila[colIdx] ? fila[colIdx].toString().trim() : '';
            });
          } else {
            // Sin encabezados, usar columna_N
            fila.forEach((celda, colIdx) => {
              objeto[`columna_${colIdx + 1}`] = celda ? celda.toString().trim() : '';
            });
          }
          
          return objeto;
        }).filter(item => item !== null && Object.values(item).some(v => v !== ''));
      }

      return {
        titulo: seccion.titulo,
        tipo: seccion.tipo,
        encabezados: seccion.encabezados || [],
        datos: datosObjeto
      };
    });
    
    // =========================================================================
    // CREAR O ACTUALIZAR PLANTILLA AUTOMÁTICAMENTE DESDE LA ESTRUCTURA DEL EXCEL
    // =========================================================================
    const transaction = await db.sequelize.transaction();
    
    try {
      console.log('🚀 Creando plantilla desde estructura del Excel...');
      
      // Nombre de la plantilla basado en la asignatura
      const nombrePlantilla = datosGenerales.asignatura 
        ? `Plantilla ${datosGenerales.asignatura}` 
        : 'Plantilla Programa Analítico';

      // Crear o actualizar la plantilla
      const plantilla = await crearPlantillaDesdeExcel(
        seccionesDetectadas, 
        nombrePlantilla, 
        req.user?.id || null,
        transaction
      );

      console.log(`✅ Plantilla procesada exitosamente (ID: ${plantilla.id})`);
      
      // Preparar datos para guardar en la tabla existente
      const programaData = {
        nombre: datosGenerales.asignatura || 'Programa Analítico',
        plantilla_id: plantilla.id, // 🔗 VINCULAR CON LA PLANTILLA CREADA
        carrera: datosGenerales.carrera || null,
        nivel: datosGenerales.nivel || null,
        asignatura: datosGenerales.asignatura || null,
        periodo_academico: datosGenerales.periodo_academico || null,
        datos_tabla: {
          archivo_excel: archivoFileName,
          archivo_escudo: escudoFileName,
          rutas: {
            excel: archivoPath,
            escudo: escudoPath
          },
          datos_generales: {
            carrera: datosGenerales.carrera || '',
            nivel: datosGenerales.nivel || '',
            paralelo: datosGenerales.paralelo || '',
            asignatura: datosGenerales.asignatura || '',
            codigo: datosGenerales.codigo || '',
            creditos: datosGenerales.creditos || 0,
            horas_semanales: datosGenerales.horas_semanales || 0,
            periodo_academico: datosGenerales.periodo_academico || '',
            docente: datosGenerales.docente || ''
          },
          unidades_tematicas: [],
          tablas_datos: tablasDatos,
          secciones_completas: seccionesDetectadas,
          secciones_formulario: seccionesDetectadas.map(s => ({
            titulo: s.titulo,
            tipo: s.tipo,
            campos: s.encabezados || []
          })),
          fecha_carga: new Date().toISOString()
        },
        usuario_id: req.user?.id || null
      };

      const programaAnalitico = await ProgramaAnalitico.create(programaData, { transaction });

      console.log(`✅ Programa analítico creado exitosamente (ID: ${programaAnalitico.id})`);

      // =========================================================================
      // 🔥 GUARDAR DATOS EN TABLAS RELACIONALES
      // =========================================================================
      await guardarDatosEnTablas(
        programaAnalitico.id,
        plantilla.id,
        seccionesDetectadas,
        transaction
      );

      await transaction.commit();

      console.log(`✅ Transacción completada exitosamente`);

      return res.status(201).json({
        success: true,
        message: 'Programa analítico cargado exitosamente con plantilla dinámica',
        data: {
          id: programaAnalitico.id,
          plantilla_id: plantilla.id,
          plantilla_nombre: plantilla.nombre,
          archivo_excel: archivoFileName,
          archivo_escudo: escudoFileName,
          registros_procesados: jsonData.length,
          secciones_detectadas: seccionesDetectadas.length,
          secciones: seccionesDetectadas.map(s => ({
            nombre: s.titulo,
            tipo: s.tipo,
            num_campos: s.encabezados ? s.encabezados.length : 0
          }))
        }
      });

    } catch (transactionError) {
      await transaction.rollback();
      console.error('❌ Error en transacción:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Error al cargar programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo',
      error: error.message
    });
  }
};// Descargar plantilla de Excel
exports.descargarPlantilla = async (req, res) => {
  try {
    // Crear plantilla con datos de ejemplo
    const plantillaData = [
      {
        carrera: 'Ingeniería en Sistemas',
        nivel: 'Primer Nivel',
        paralelo: 'A',
        asignatura: 'Programación I',
        codigo: 'PROG101',
        creditos: 4,
        horas_semanales: 5,
        periodo_academico: '2025-1',
        docente: 'Dr. Juan Pérez',
        unidad_tematica: 'Unidad 1: Introducción',
        contenidos: 'Variables, tipos de datos, operadores',
        horas_clase: 8,
        horas_practicas: 12,
        horas_autonomas: 20,
        estrategias_metodologicas: 'Clases magistrales, laboratorios prácticos',
        recursos_didacticos: 'Computadora, proyector, IDE',
        evaluacion: 'Examen parcial 30%, Laboratorios 40%, Proyecto 30%',
        bibliografia: 'Deitel, P. (2020). Java How to Program'
      },
      {
        carrera: 'Ingeniería en Sistemas',
        nivel: 'Primer Nivel',
        paralelo: 'A',
        asignatura: 'Programación I',
        codigo: 'PROG101',
        creditos: 4,
        horas_semanales: 5,
        periodo_academico: '2025-1',
        docente: 'Dr. Juan Pérez',
        unidad_tematica: 'Unidad 2: Estructuras de Control',
        contenidos: 'If-else, switch, bucles for, while',
        horas_clase: 10,
        horas_practicas: 15,
        horas_autonomas: 25,
        estrategias_metodologicas: 'Ejercicios prácticos, resolución de problemas',
        recursos_didacticos: 'Material didáctico, ejercicios en línea',
        evaluacion: 'Examen parcial 30%, Prácticas 70%',
        bibliografia: 'Joyanes, L. (2019). Fundamentos de Programación'
      }
    ];

    // Crear workbook
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(plantillaData);

    // Configurar anchos de columnas
    ws['!cols'] = [
      { wch: 25 }, // carrera
      { wch: 15 }, // nivel
      { wch: 10 }, // paralelo
      { wch: 25 }, // asignatura
      { wch: 10 }, // codigo
      { wch: 10 }, // creditos
      { wch: 15 }, // horas_semanales
      { wch: 15 }, // periodo_academico
      { wch: 25 }, // docente
      { wch: 30 }, // unidad_tematica
      { wch: 40 }, // contenidos
      { wch: 12 }, // horas_clase
      { wch: 15 }, // horas_practicas
      { wch: 15 }, // horas_autonomas
      { wch: 40 }, // estrategias_metodologicas
      { wch: 30 }, // recursos_didacticos
      { wch: 40 }, // evaluacion
      { wch: 40 }  // bibliografia
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Programa Analítico');

    // Generar buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Enviar archivo
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_programa_analitico.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error al generar plantilla:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar plantilla',
      error: error.message
    });
  }
};

// Listar todos los programas analíticos
exports.getAll = async (req, res) => {
  try {
    const programas = await ProgramaAnalitico.findAll({
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombres', 'apellidos', 'correo_electronico'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: programas
    });

  } catch (error) {
    console.error('Error al obtener programas analíticos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programas analíticos',
      error: error.message
    });
  }
};

// Obtener un programa analítico por ID CON DATOS DE TABLAS RELACIONALES
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener programa básico
    const programa = await ProgramaAnalitico.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombres', 'apellidos', 'correo_electronico'],
          required: false
        },
        {
          model: PlantillaPrograma,
          as: 'plantilla',
          required: false
        }
      ]
    });

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analítico no encontrado'
      });
    }

    // 🔥 OBTENER DATOS DE TABLAS RELACIONALES
    let seccionesConDatos = [];
    
    if (programa.plantilla_id) {
      // Obtener contenidos del programa con sus secciones
      const contenidos = await ContenidoPrograma.findAll({
        where: { programa_analitico_id: id },
        include: [
          {
            model: SeccionPlantilla,
            as: 'seccion',
            include: [
              {
                model: CampoSeccion,
                as: 'campos',
                order: [['orden', 'ASC']]
              }
            ]
          },
          {
            model: FilaTablaPrograma,
            as: 'filas',
            include: [
              {
                model: ValorCampoPrograma,
                as: 'valores',
                include: [
                  {
                    model: CampoSeccion,
                    as: 'campo'
                  }
                ]
              }
            ],
            order: [['orden', 'ASC']]
          }
        ],
        order: [[{ model: SeccionPlantilla, as: 'seccion' }, 'orden', 'ASC']]
      });

      // Transformar datos en estructura legible
      seccionesConDatos = contenidos.map(contenido => {
        const seccion = {
          id: contenido.seccion.id,
          nombre: contenido.seccion.nombre,
          tipo: contenido.seccion.tipo,
          contenido_texto: contenido.contenido_texto,
          datos: []
        };

        // Si es tabla, organizar por filas y columnas
        if (contenido.seccion.tipo === 'tabla' && contenido.filas) {
          seccion.encabezados = contenido.seccion.campos.map(c => c.etiqueta);
          
          seccion.datos = contenido.filas.map(fila => {
            const filaObj = { _orden: fila.orden };
            
            fila.valores.forEach(valor => {
              filaObj[valor.campo.nombre] = valor.valor;
            });
            
            return filaObj;
          });
        }

        return seccion;
      });
    }

    // Preparar respuesta combinada
    const response = {
      ...programa.toJSON(),
      secciones_tablas_relacionales: seccionesConDatos,
      tiene_datos_tablas: seccionesConDatos.length > 0
    };

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error al obtener programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programa analítico',
      error: error.message
    });
  }
};

// Obtener estructura del formulario desde el primer programa analítico guardado o uno específico
exports.getEstructuraFormulario = async (req, res) => {
  try {
    const { id } = req.query; // Opcional: ID de programa específico
    
    // Buscar el programa analítico específico o el más reciente
    const programa = id 
      ? await ProgramaAnalitico.findByPk(id)
      : await ProgramaAnalitico.findOne({
          where: {},
          order: [['createdAt', 'DESC']]
        });

    if (!programa || !programa.datos_tabla) {
      return res.status(200).json({
        success: true,
        data: {
          campos_datos_generales: [
            'carrera', 'nivel', 'paralelo', 'asignatura', 'codigo', 
            'creditos', 'horas_semanales', 'periodo_academico', 'docente'
          ],
          campos_unidades: [
            'unidad_tematica', 'contenidos', 'horas_clase', 'horas_practicas',
            'horas_autonomas', 'estrategias_metodologicas', 'recursos_didacticos',
            'evaluacion', 'bibliografia'
          ],
          secciones_completas: [],
          mensaje: 'Usando estructura por defecto'
        }
      });
    }

    // Extraer campos desde los datos guardados
    const datosGenerales = programa.datos_tabla.datos_generales || {};
    const unidadesTematicas = programa.datos_tabla.unidades_tematicas || [];
    const tablasDatos = programa.datos_tabla.tablas_datos || [];
    const seccionesCompletas = programa.datos_tabla.secciones_completas || [];

    const camposDatosGenerales = Object.keys(datosGenerales).filter(k => k !== 'fecha_carga');
    
    let camposUnidades = [];
    if (unidadesTematicas.length > 0) {
      const primeraUnidad = unidadesTematicas[0];
      camposUnidades = Object.keys(primeraUnidad).filter(k => 
        !['carrera', 'nivel', 'paralelo', 'asignatura', 'codigo', 
          'creditos', 'horas_semanales', 'periodo_academico', 'docente'].includes(k)
      );
    }

    // Extraer estructura de tablas adicionales con tipos
    const seccionesTablas = tablasDatos.map(tabla => ({
      titulo: tabla.titulo || '',
      tipo: tabla.tipo || 'texto_largo',
      encabezados: tabla.encabezados || [],
      campos: Object.keys(tabla.datos?.[0] || {}),
      ejemplo: tabla.datos?.[0] || {},
      datos_completos: tabla.datos || []
    }));

    // Procesar secciones completas para el formulario dinámico
    const seccionesFormulario = seccionesCompletas.map(seccion => ({
      titulo: seccion.titulo,
      tipo: seccion.tipo,
      encabezados: seccion.encabezados || [],
      campos: seccion.tipo === 'tabla' 
        ? seccion.encabezados 
        : ['contenido'],
      num_filas: seccion.datos?.length || 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        programa_id: programa.id,
        nombre_programa: programa.nombre,
        campos_datos_generales: camposDatosGenerales.length > 0 ? camposDatosGenerales : [
          'carrera', 'nivel', 'paralelo', 'asignatura', 'codigo', 
          'creditos', 'horas_semanales', 'periodo_academico', 'docente'
        ],
        campos_unidades: camposUnidades.length > 0 ? camposUnidades : [
          'unidad_tematica', 'contenidos', 'horas_clase', 'horas_practicas',
          'horas_autonomas', 'estrategias_metodologicas', 'recursos_didacticos',
          'evaluacion', 'bibliografia'
        ],
        secciones_tablas: seccionesTablas,
        secciones_formulario: seccionesFormulario,
        secciones_completas: seccionesCompletas,
        ejemplo_datos_generales: datosGenerales,
        ejemplo_unidad: unidadesTematicas[0] || null,
        tablas_completas: tablasDatos,
        metadata: {
          total_secciones: seccionesCompletas.length,
          tiene_tablas: seccionesTablas.length > 0,
          fecha_creacion: programa.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener estructura:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estructura del formulario',
      error: error.message
    });
  }
};

// Eliminar programa analítico
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const programa = await ProgramaAnalitico.findByPk(id);

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analítico no encontrado'
      });
    }

    // Eliminar archivos físicos si existen en datos_tabla
    if (programa.datos_tabla && programa.datos_tabla.rutas) {
      const { excel, escudo } = programa.datos_tabla.rutas;
      
      if (excel) {
        try {
          await fs.unlink(excel);
        } catch (err) {
          console.error('Error al eliminar archivo Excel:', err);
        }
      }

      if (escudo) {
        try {
          await fs.unlink(escudo);
        } catch (err) {
          console.error('Error al eliminar archivo de escudo:', err);
        }
      }
    }

    await programa.destroy();

    return res.status(200).json({
      success: true,
      message: 'Programa analítico eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar programa analítico',
      error: error.message
    });
  }
};

// Asignar programa analítico a un docente
exports.asignarADocente = async (req, res) => {
  try {
    const { programaAnaliticoId, profesorId, asignaturaId, nivelId, paraleloId, periodoId } = req.body;

    if (!programaAnaliticoId || !profesorId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere programaAnaliticoId y profesorId'
      });
    }

    // Verificar que existe el programa analítico
    const programa = await ProgramaAnalitico.findByPk(programaAnaliticoId);
    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analítico no encontrado'
      });
    }

    // Verificar que existe el profesor
    const profesor = await db.Profesores.findByPk(profesorId);
    if (!profesor) {
      return res.status(404).json({
        success: false,
        message: 'Profesor no encontrado'
      });
    }

    // Crear o actualizar la asignación (guardamos en datos_tabla del programa)
    const asignaciones = programa.datos_tabla.asignaciones_docentes || [];
    
    // Verificar si ya existe una asignación para este docente
    const indexExistente = asignaciones.findIndex(a => a.profesor_id === profesorId);
    
    const nuevaAsignacion = {
      profesor_id: profesorId,
      asignatura_id: asignaturaId || null,
      nivel_id: nivelId || null,
      paralelo_id: paraleloId || null,
      periodo_id: periodoId || null,
      fecha_asignacion: new Date().toISOString(),
      estado: 'pendiente' // pendiente, en_progreso, completado
    };

    if (indexExistente >= 0) {
      asignaciones[indexExistente] = nuevaAsignacion;
    } else {
      asignaciones.push(nuevaAsignacion);
    }

    // Actualizar el programa con las asignaciones
    programa.datos_tabla = {
      ...programa.datos_tabla,
      asignaciones_docentes: asignaciones
    };

    await programa.save();

    return res.status(200).json({
      success: true,
      message: 'Programa analítico asignado exitosamente',
      data: {
        programa_id: programa.id,
        asignacion: nuevaAsignacion
      }
    });

  } catch (error) {
    console.error('Error al asignar programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al asignar programa analítico',
      error: error.message
    });
  }
};

// Obtener programas analíticos asignados a un docente
exports.getProgramasAsignados = async (req, res) => {
  try {
    const profesorId = req.user?.profesor_id || req.user?.id;

    console.log('🔍 Buscando programas para profesor ID:', profesorId);

    // Buscar TODOS los programas que tienen plantilla asociada
    // Esto permite que el docente vea los formularios que el admin creó
    const programas = await ProgramaAnalitico.findAll({
      where: {
        plantilla_id: {
          [Op.ne]: null // Solo programas con plantilla
        }
      },
      include: [
        {
          model: PlantillaPrograma,
          as: 'plantilla',
          attributes: ['id', 'nombre']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    console.log(`📦 Encontrados ${programas.length} programas con plantilla`);

    // Transformar la respuesta para incluir info útil
    const programasDisponibles = programas.map(programa => {
      // Verificar si este profesor ya tiene contenido guardado
      const tieneContenidoGuardado = programa.datos_tabla?.contenidos_docentes?.[profesorId] ? true : false;
      
      return {
        id: programa.id,
        nombre: programa.nombre,
        plantilla: programa.plantilla ? {
          id: programa.plantilla.id,
          nombre: programa.plantilla.nombre
        } : null,
        tiene_contenido_guardado: tieneContenidoGuardado,
        fecha_creacion: programa.createdAt,
        ultima_actualizacion: programa.updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      data: programasDisponibles,
      message: `Se encontraron ${programasDisponibles.length} programas analíticos disponibles`
    });

  } catch (error) {
    console.error('❌ Error al obtener programas asignados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programas asignados',
      error: error.message
    });
  }
};

// Actualizar contenido del programa analítico (por el docente)
exports.actualizarContenidoDocente = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, seccion } = req.body;
    const profesorId = req.user?.profesor_id;

    const programa = await ProgramaAnalitico.findByPk(id);

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analítico no encontrado'
      });
    }

    // Verificar que el docente tiene acceso a este programa
    const asignaciones = programa.datos_tabla?.asignaciones_docentes || [];
    const tieneAcceso = asignaciones.some(a => a.profesor_id === profesorId);

    if (!tieneAcceso && req.user?.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para editar este programa'
      });
    }

    // Guardar el contenido completado por el docente
    const contenidosDocentes = programa.datos_tabla.contenidos_docentes || {};
    
    if (!contenidosDocentes[profesorId]) {
      contenidosDocentes[profesorId] = {
        fecha_inicio: new Date().toISOString(),
        secciones_completadas: {}
      };
    }

    if (seccion) {
      contenidosDocentes[profesorId].secciones_completadas[seccion] = {
        contenido: contenido,
        fecha_actualizacion: new Date().toISOString()
      };
    } else {
      contenidosDocentes[profesorId].contenido_general = contenido;
      contenidosDocentes[profesorId].fecha_actualizacion = new Date().toISOString();
    }

    programa.datos_tabla = {
      ...programa.datos_tabla,
      contenidos_docentes: contenidosDocentes
    };

    await programa.save();

    return res.status(200).json({
      success: true,
      message: 'Contenido actualizado exitosamente',
      data: {
        contenido: contenidosDocentes[profesorId]
      }
    });

  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar contenido',
      error: error.message
    });
  }
};

// =========================================================================
// NUEVOS MÉTODOS PARA ESTRUCTURA DE PLANTILLA
// =========================================================================

/**
 * Obtener programa analítico con estructura completa de la plantilla
 */
exports.getProgramaConPlantilla = async (req, res) => {
  try {
    const { id } = req.params;
    const PlantillaPrograma = db.PlantillaPrograma;
    const SeccionPlantilla = db.SeccionPlantilla;
    const CampoSeccion = db.CampoSeccion;

    const programa = await ProgramaAnalitico.findByPk(id, {
      include: [
        {
          model: PlantillaPrograma,
          as: 'plantilla',
          include: [
            {
              model: SeccionPlantilla,
              as: 'secciones',
              include: [
                {
                  model: CampoSeccion,
                  as: 'campos',
                  order: [['orden', 'ASC']]
                }
              ],
              order: [['orden', 'ASC']]
            }
          ]
        },
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'email']
        }
      ]
    });

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analítico no encontrado'
      });
    }

    // Si no tiene plantilla, devolver estructura básica del JSON
    if (!programa.plantilla) {
      return res.status(200).json({
        success: true,
        data: {
          id: programa.id,
          nombre: programa.nombre,
          datos_tabla: programa.datos_tabla || {},
          estructura: null,
          mensaje: 'Este programa no tiene plantilla asociada'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: programa.id,
        nombre: programa.nombre,
        carrera: programa.carrera,
        nivel: programa.nivel,
        asignatura: programa.asignatura,
        periodo_academico: programa.periodo_academico,
        datos_tabla: programa.datos_tabla || {},
        plantilla: {
          id: programa.plantilla.id,
          nombre: programa.plantilla.nombre,
          descripcion: programa.plantilla.descripcion,
          tipo: programa.plantilla.tipo,
          secciones: programa.plantilla.secciones.map(seccion => ({
            id: seccion.id,
            nombre: seccion.nombre,
            descripcion: seccion.descripcion,
            tipo: seccion.tipo, // 'texto_largo' o 'tabla'
            orden: seccion.orden,
            obligatoria: seccion.obligatoria,
            campos: seccion.campos ? seccion.campos.map(campo => ({
              id: campo.id,
              etiqueta: campo.etiqueta,
              tipo_campo: campo.tipo_campo, // 'texto', 'numero', 'select', etc.
              orden: campo.orden,
              opciones: campo.opciones,
              validaciones: campo.validaciones,
              obligatorio: campo.obligatorio
            })) : []
          }))
        },
        creador: programa.creador,
        createdAt: programa.createdAt,
        updatedAt: programa.updatedAt
      }
    });

  } catch (error) {
    console.error('Error al obtener programa con plantilla:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programa analítico',
      error: error.message
    });
  }
};

/**
 * Guardar contenido llenado por el docente
 */
exports.guardarContenidoDocente = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { id } = req.params; // ID del programa analítico
    const { contenido } = req.body; // Contenido por sección
    const profesorId = req.usuario?.profesor_id || req.body.profesor_id;

    if (!contenido || typeof contenido !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar el contenido a guardar'
      });
    }

    const programa = await ProgramaAnalitico.findByPk(id);
    
    if (!programa) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Programa analítico no encontrado'
      });
    }

    // Obtener o crear tabla contenido_programa
    const ContenidoPrograma = db.sequelize.define('contenido_programa', {
      id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      programa_id: db.Sequelize.INTEGER,
      seccion_id: db.Sequelize.INTEGER,
      profesor_id: db.Sequelize.INTEGER,
      contenido_texto: db.Sequelize.TEXT
    }, {
      tableName: 'contenido_programa',
      timestamps: true,
      underscored: true
    });

    const FilaTablaPrograma = db.sequelize.define('filas_tabla_programa', {
      id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      contenido_id: db.Sequelize.INTEGER,
      orden: db.Sequelize.INTEGER
    }, {
      tableName: 'filas_tabla_programa',
      timestamps: true,
      underscored: true
    });

    const ValorCampoPrograma = db.sequelize.define('valores_campo_programa', {
      id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      fila_id: db.Sequelize.INTEGER,
      campo_id: db.Sequelize.INTEGER,
      valor: db.Sequelize.TEXT
    }, {
      tableName: 'valores_campo_programa',
      timestamps: true,
      underscored: true
    });

    // Procesar cada sección del contenido
    for (const [seccionId, datos] of Object.entries(contenido)) {
      const seccionIdNum = parseInt(seccionId);

      if (datos.tipo === 'texto_largo') {
        // Guardar o actualizar contenido de texto largo
        const [contenidoExistente] = await ContenidoPrograma.findOrCreate({
          where: {
            programa_id: id,
            seccion_id: seccionIdNum,
            profesor_id: profesorId
          },
          defaults: {
            contenido_texto: datos.contenido || ''
          },
          transaction
        });

        if (contenidoExistente) {
          await contenidoExistente.update({
            contenido_texto: datos.contenido || ''
          }, { transaction });
        }

      } else if (datos.tipo === 'tabla') {
        // Guardar o actualizar contenido de tabla
        const [contenidoExistente] = await ContenidoPrograma.findOrCreate({
          where: {
            programa_id: id,
            seccion_id: seccionIdNum,
            profesor_id: profesorId
          },
          transaction
        });

        // Eliminar filas existentes
        await FilaTablaPrograma.destroy({
          where: { contenido_id: contenidoExistente.id },
          transaction
        });

        // Guardar nuevas filas
        if (datos.filas && Array.isArray(datos.filas)) {
          for (let i = 0; i < datos.filas.length; i++) {
            const fila = datos.filas[i];
            
            const nuevaFila = await FilaTablaPrograma.create({
              contenido_id: contenidoExistente.id,
              orden: i + 1
            }, { transaction });

            // Guardar valores de cada campo
            if (fila.valores && typeof fila.valores === 'object') {
              for (const [campoId, valor] of Object.entries(fila.valores)) {
                await ValorCampoPrograma.create({
                  fila_id: nuevaFila.id,
                  campo_id: parseInt(campoId),
                  valor: valor || ''
                }, { transaction });
              }
            }
          }
        }
      }
    }

    // Actualizar estado de asignación si existe
    const AsignacionProgramaDocente = db.AsignacionProgramaDocente;
    const asignacion = await AsignacionProgramaDocente.findOne({
      where: {
        programa_id: id,
        profesor_id: profesorId
      }
    });

    if (asignacion) {
      await asignacion.update({
        estado: 'en_progreso',
        fecha_ultima_modificacion: new Date()
      }, { transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Contenido guardado exitosamente',
      data: {
        programa_id: id,
        profesor_id: profesorId
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error al guardar contenido:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar contenido',
      error: error.message
    });
  }
};

/**
 * Obtener contenido guardado del docente para un programa
 */
exports.getContenidoDocente = async (req, res) => {
  try {
    const { id } = req.params; // ID del programa
    const profesorId = req.usuario?.profesor_id || req.query.profesor_id;

    if (!profesorId) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ID del profesor'
      });
    }

    // Usar raw queries para obtener el contenido
    const contenidoTexto = await db.sequelize.query(`
      SELECT 
        cp.id,
        cp.seccion_id,
        cp.contenido_texto,
        sp.nombre as seccion_nombre,
        sp.tipo as seccion_tipo
      FROM contenido_programa cp
      INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
      WHERE cp.programa_id = :programaId 
        AND cp.profesor_id = :profesorId
        AND sp.tipo = 'texto_largo'
      ORDER BY sp.orden
    `, {
      replacements: { programaId: id, profesorId },
      type: db.Sequelize.QueryTypes.SELECT
    });

    const contenidoTabla = await db.sequelize.query(`
      SELECT 
        cp.id as contenido_id,
        cp.seccion_id,
        sp.nombre as seccion_nombre,
        sp.tipo as seccion_tipo,
        ft.id as fila_id,
        ft.orden as fila_orden,
        vcp.campo_id,
        vcp.valor,
        cs.etiqueta as campo_etiqueta,
        cs.tipo_campo
      FROM contenido_programa cp
      INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
      LEFT JOIN filas_tabla_programa ft ON ft.contenido_id = cp.id
      LEFT JOIN valores_campo_programa vcp ON vcp.fila_id = ft.id
      LEFT JOIN campos_seccion cs ON cs.id = vcp.campo_id
      WHERE cp.programa_id = :programaId 
        AND cp.profesor_id = :profesorId
        AND sp.tipo = 'tabla'
      ORDER BY sp.orden, ft.orden, cs.orden
    `, {
      replacements: { programaId: id, profesorId },
      type: db.Sequelize.QueryTypes.SELECT
    });

    // Estructurar el contenido
    const contenidoEstructurado = {};

    // Procesar contenido de texto
    contenidoTexto.forEach(item => {
      contenidoEstructurado[item.seccion_id] = {
        tipo: 'texto_largo',
        nombre: item.seccion_nombre,
        contenido: item.contenido_texto
      };
    });

    // Procesar contenido de tablas
    const tablasPorSeccion = {};
    contenidoTabla.forEach(item => {
      if (!tablasPorSeccion[item.seccion_id]) {
        tablasPorSeccion[item.seccion_id] = {
          tipo: 'tabla',
          nombre: item.seccion_nombre,
          filas: {}
        };
      }

      if (item.fila_id) {
        if (!tablasPorSeccion[item.seccion_id].filas[item.fila_id]) {
          tablasPorSeccion[item.seccion_id].filas[item.fila_id] = {
            orden: item.fila_orden,
            valores: {}
          };
        }

        if (item.campo_id) {
          tablasPorSeccion[item.seccion_id].filas[item.fila_id].valores[item.campo_id] = item.valor;
        }
      }
    });

    // Convertir filas de objeto a array
    Object.keys(tablasPorSeccion).forEach(seccionId => {
      const filasArray = Object.values(tablasPorSeccion[seccionId].filas)
        .sort((a, b) => a.orden - b.orden);
      tablasPorSeccion[seccionId].filas = filasArray;
      contenidoEstructurado[seccionId] = tablasPorSeccion[seccionId];
    });

    return res.status(200).json({
      success: true,
      data: {
        programa_id: id,
        profesor_id: profesorId,
        contenido: contenidoEstructurado
      }
    });

  } catch (error) {
    console.error('Error al obtener contenido del docente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener contenido',
      error: error.message
    });
  }
};

/**
 * Obtener programas analíticos disponibles con sus plantillas
 */
exports.getProgramasDisponibles = async (req, res) => {
  try {
    console.log('🔍 Obteniendo programas analíticos disponibles...');

    // Obtener todos los programas analíticos que tengan plantilla_id
    const programas = await ProgramaAnalitico.findAll({
      where: {
        plantilla_id: {
          [Op.ne]: null // No es null
        }
      },
      include: [
        {
          model: PlantillaPrograma,
          as: 'plantilla',
          attributes: ['id', 'nombre', 'descripcion', 'tipo'],
          include: [
            {
              model: SeccionPlantilla,
              as: 'secciones',
              attributes: ['id', 'nombre', 'descripcion', 'tipo', 'orden', 'obligatoria'],
              include: [
                {
                  model: CampoSeccion,
                  as: 'campos',
                  attributes: ['id', 'nombre', 'etiqueta', 'tipo_campo', 'orden', 'requerido', 'placeholder', 'opciones_json', 'validacion_json']
                }
              ]
            }
          ]
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        [{ model: PlantillaPrograma, as: 'plantilla' }, { model: SeccionPlantilla, as: 'secciones' }, 'orden', 'ASC'],
        [{ model: PlantillaPrograma, as: 'plantilla' }, { model: SeccionPlantilla, as: 'secciones' }, { model: CampoSeccion, as: 'campos' }, 'orden', 'ASC']
      ]
    });

    console.log(`✅ Se encontraron ${programas.length} programas con plantilla`);

    return res.status(200).json({
      success: true,
      data: programas,
      total: programas.length
    });

  } catch (error) {
    console.error('❌ Error al obtener programas disponibles:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programas disponibles',
      error: error.message
    });
  }
};

module.exports = exports;
