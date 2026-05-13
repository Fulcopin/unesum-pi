const xlsx = require('xlsx');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs').promises;
const db = require('../models');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
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
const TituloExtraido = db.TituloExtraido;
// --- EN programaController.js ---

/**
 * 🧠 DICCIONARIO MAESTRO DE SECCIONES (ESCALABLE)
 * La clave 'CONTENIDO' atrapa todas las variaciones de tablas de unidades
 * para unirlas en una sola.
 */

/**
 * ðŸ”¥ FUNCIÃ“N PARA LIMPIAR DATOS DUPLICADOS DE SECCIONES
 * Elimina filas duplicadas y limpia contenido repetido por celdas combinadas
 * MEJORADA: Extrae solo valores Ãºnicos, elimina repeticiones del tÃ­tulo
 */
function limpiarDatosSeccion(seccion) {
  if (!seccion.datos || seccion.datos.length === 0) {
    return seccion;
  }

  const tituloUpper = seccion.titulo.toUpperCase().trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ');
  
  console.log(`[LIMPIEZA] Procesando seccion: ${seccion.titulo} con ${seccion.datos.length} filas`);
  
  // Funcion auxiliar para limpiar un string - eliminar duplicados dentro del mismo string
  const limpiarStringDuplicado = (str) => {
    if (!str || typeof str !== 'string') return str;
    
    // Normalizar espacios y saltos de linea
    let limpio = str.trim()
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ');
    
    // Si es muy corto, no procesar
    if (limpio.length < 10) return limpio;
    
    // Buscar patrones repetidos (palabras o frases que se repiten consecutivamente)
    // Por ejemplo: "CARACTERIZACION CARACTERIZACION CARACTERIZACION" -> "CARACTERIZACION"
    const palabras = limpio.split(' ');
    const palabrasUnicas = [];
    let palabraAnterior = '';
    
    for (const palabra of palabras) {
      const palabraNorm = palabra.toUpperCase().trim();
      if (palabraNorm !== palabraAnterior && palabraNorm !== '') {
        palabrasUnicas.push(palabra);
        palabraAnterior = palabraNorm;
      }
    }
    
    return palabrasUnicas.join(' ');
  };
  
  // 1. Procesar los datos segun el tipo
  let datosLimpios = [];
  
  if (seccion.tipo === 'texto_largo') {
    // Para texto largo, unir todo y limpiar duplicados
    const textos = new Set();
    
    for (const fila of seccion.datos) {
      if (Array.isArray(fila)) {
        for (const celda of fila) {
          if (celda && celda.toString().trim() !== '') {
            const textoLimpio = limpiarStringDuplicado(celda.toString());
            const textoUpper = textoLimpio.toUpperCase();
            // No agregar si es el titulo de la seccion
            if (textoUpper !== tituloUpper && !textoUpper.startsWith(tituloUpper)) {
              textos.add(textoLimpio);
            }
          }
        }
      } else if (fila?.contenido) {
        const textoLimpio = limpiarStringDuplicado(fila.contenido.toString());
        textos.add(textoLimpio);
      }
    }
    
    if (textos.size > 0) {
      datosLimpios = [{ contenido: Array.from(textos).join('\n') }];
    }
  } else if (seccion.tipo === 'tabla') {
    // Para tablas, limpiar cada celda individualmente
    const filasVistas = new Set();
    
    for (const fila of seccion.datos) {
      if (Array.isArray(fila)) {
        // Limpiar cada celda de la fila
        const filaLimpia = fila.map(celda => {
          if (celda && celda.toString().trim() !== '') {
            return limpiarStringDuplicado(celda.toString());
          }
          return '';
        });
        
        // Crear clave unica para evitar filas duplicadas completas
        const claveFilaLimpia = filaLimpia.join('|').toUpperCase();
        
        // Solo agregar si la fila no esta duplicada y no es solo el titulo
        if (!filasVistas.has(claveFilaLimpia) && claveFilaLimpia !== tituloUpper && claveFilaLimpia.replace(/\|/g, '') !== '') {
          // Verificar que al menos una celda tenga contenido significativo
          const tieneContenido = filaLimpia.some(c => c && c.trim() !== '' && c.toUpperCase() !== tituloUpper);
          if (tieneContenido) {
            filasVistas.add(claveFilaLimpia);
            datosLimpios.push(filaLimpia);
          }
        }
      }
    }
  } else {
    // Otros tipos: limpiar como strings unicos
    const valoresUnicos = new Set();
    
    for (const fila of seccion.datos) {
      if (Array.isArray(fila)) {
        for (const celda of fila) {
          if (celda && celda.toString().trim() !== '') {
            const valorLimpio = limpiarStringDuplicado(celda.toString());
            const valorUpper = valorLimpio.toUpperCase();
            if (valorUpper !== tituloUpper) {
              valoresUnicos.add(valorLimpio);
            }
          }
        }
      }
    }
    
    datosLimpios = Array.from(valoresUnicos).map(v => [v]);
  }

  // 2. Limpiar encabezados duplicados
  let encabezadosLimpios = [];
  if (seccion.encabezados && seccion.encabezados.length > 0) {
    const encVistas = new Set();
    for (const enc of seccion.encabezados) {
      const encLimpio = limpiarStringDuplicado((enc || '').toString());
      const encNorm = encLimpio.toUpperCase();
      if (encNorm && !encVistas.has(encNorm) && encNorm !== tituloUpper) {
        encVistas.add(encNorm);
        encabezadosLimpios.push(encLimpio);
      }
    }
  }

  console.log(`[LIMPIEZA] Resultado ${seccion.titulo}: ${seccion.datos.length} filas -> ${datosLimpios.length} filas limpias`);

  return {
    ...seccion,
    datos: datosLimpios,
    encabezados: encabezadosLimpios,
    campos: seccion.campos
  };
}

/**
 * Controlador para gestiÃ³n de programas analÃ­ticos
 */

/**
 * FunciÃ³n auxiliar para crear o actualizar una plantilla a partir de las secciones detectadas del Excel
 */
/**
 * 🧠 DETECTOR INTELIGENTE DE ENCABEZADOS
 * Analiza un grupo de filas y determina cuál es la fila de encabezados
 * basándose en un sistema de puntuación por palabras clave.
 */
function detectarMejorFilaEncabezados(filasCandidatas) {
  // Palabras clave comunes en encabezados de programas analíticos
  const PALABRAS_CLAVE_HEADER = [
    'UNIDAD', 'TEMA', 'CAPITULO', 'CONTENIDO', 'SUBTEMA',
    'HORAS', 'TIEMPO', 'SEMANA', 'FECHA',
    'DOCENCIA', 'PRACTICA', 'AUTONOMO', 'TEORICA', 'LABORATORIO',
    'ESTRATEGIA', 'METODOLOGIA', 'ACTIVIDAD', 'RECURSOS',
    'EVALUACION', 'CALIFICACION', 'PONDERACION', 'NOTA',
    'BIBLIOGRAFIA', 'OBSERVACION', 'DESCRIPCION', 'RESULTADO'
  ];

  let mejorFila = null;
  let mejorPuntuacion = 0;
  let indiceMejorFila = -1;

  // Analizamos hasta 6 filas buscando la mejor candidata
  filasCandidatas.forEach((fila, index) => {
    if (!fila || fila.length === 0) return;

    let puntuacion = 0;
    const textoFila = fila.join(' ').toUpperCase();
    
    // 1. Puntos por palabras clave encontradas
    PALABRAS_CLAVE_HEADER.forEach(keyword => {
      if (textoFila.includes(keyword)) {
        puntuacion += 10;
      }
    });

    // 2. Puntos por cantidad de columnas con texto (los headers suelen estar llenos)
    const columnasLlenas = fila.filter(c => c && c.trim().length > 1).length;
    if (columnasLlenas > 1) {
      puntuacion += (columnasLlenas * 2);
    }

    // 3. Penalización si el texto es demasiado largo (probablemente es contenido, no header)
    const longitudPromedio = textoFila.length / (columnasLlenas || 1);
    if (longitudPromedio > 50) { // Si las celdas tienen más de 50 caracteres promedio
      puntuacion -= 15;
    }

    // Guardamos el ganador
    if (puntuacion > mejorPuntuacion && puntuacion > 5) { // Umbral mínimo de 5 puntos
      mejorPuntuacion = puntuacion;
      mejorFila = fila;
      indiceMejorFila = index;
    }
  });

  return { encabezados: mejorFila, indiceRelativo: indiceMejorFila };
}
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
        descripcion: `Plantilla generada automÃ¡ticamente desde Excel - ${new Date().toLocaleDateString()}`,
        tipo: 'excel_import',
        activa: true,
        usuario_creador_id: usuarioId
      }, { transaction });

      console.log(`âœ… Plantilla creada: ${plantilla.nombre} (ID: ${plantilla.id})`);
    } else {
      console.log(`â™»ï¸ Plantilla existente encontrada: ${plantilla.nombre} (ID: ${plantilla.id})`);
      
      // ðŸ”¥ ORDEN CORRECTO: Eliminar datos relacionales ANTES de eliminar secciones
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
          
          // 4. Eliminar valores de campos (nivel mÃ¡s profundo)
          if (filaIds.length > 0) {
            await ValorCampoPrograma.destroy({
              where: { fila_tabla_id: filaIds },
              transaction
            });
            console.log(`ðŸ—‘ï¸ ${filaIds.length} valores de campos eliminados`);
          }
          
          // 5. Eliminar filas de tablas
          await FilaTablaPrograma.destroy({
            where: { contenido_programa_id: contenidoIds },
            transaction
          });
          console.log(`ðŸ—‘ï¸ ${filasExistentes.length} filas eliminadas`);
          
          // 6. Eliminar contenidos
          await ContenidoPrograma.destroy({
            where: { seccion_plantilla_id: seccionIds },
            transaction
          });
          console.log(`ðŸ—‘ï¸ ${contenidosExistentes.length} contenidos eliminados`);
        }
      }
      
      // 7. Ahora sÃ­, eliminar secciones anteriores
      await SeccionPlantilla.destroy({
        where: { plantilla_id: plantilla.id },
        transaction
      });
      
      console.log(`ðŸ—‘ï¸ ${seccionIds.length} secciones anteriores eliminadas`);
    }

    // ðŸ”¥ ELIMINAR DUPLICADOS: Mantener solo la primera ocurrencia de cada secciÃ³n
    const seccionesUnicas = [];
    const nombresVistos = new Set();
    
    for (const seccion of seccionesDetectadas) {
      const nombreNormalizado = seccion.titulo.trim().toUpperCase();
      
      if (!nombresVistos.has(nombreNormalizado)) {
        nombresVistos.add(nombreNormalizado);
        seccionesUnicas.push(seccion);
      } else {
        // Si es duplicado, combinar los datos con la secciÃ³n existente
        const seccionExistente = seccionesUnicas.find(s => 
          s.titulo.trim().toUpperCase() === nombreNormalizado
        );
        if (seccionExistente && seccion.datos && seccion.datos.length > 0) {
          seccionExistente.datos = [...(seccionExistente.datos || []), ...seccion.datos];
          console.log(`   ðŸ”„ Combinando datos duplicados de: ${seccion.titulo}`);
        }
      }
    }
    
    console.log(`ðŸ“Š Secciones Ãºnicas a crear: ${seccionesUnicas.length} (de ${seccionesDetectadas.length} detectadas)`);

    // Crear las secciones basadas en lo detectado del Excel (SIN DUPLICADOS)
    for (let i = 0; i < seccionesUnicas.length; i++) {
      const seccion = seccionesUnicas[i];
      
      const nuevaSeccion = await SeccionPlantilla.create({
        plantilla_id: plantilla.id,
        nombre: seccion.titulo,
        descripcion: `SecciÃ³n ${seccion.tipo === 'tabla' ? 'tipo tabla' : 'de texto largo'}`,
        tipo: seccion.tipo, // 'texto_largo' o 'tabla'
        orden: i + 1,
        obligatoria: true
      }, { transaction });

      console.log(`  ðŸ“ SecciÃ³n creada: ${nuevaSeccion.nombre} (${nuevaSeccion.tipo})`);

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
          }, { transaction });            console.log(`    ðŸ”¹ Campo creado: ${encabezado}`);
          }
        }
      }
    }

    return plantilla;

  } catch (error) {
    console.error('âŒ Error al crear plantilla desde Excel:', error);
    throw error;
  }
}

/**
 * FunciÃ³n auxiliar para guardar datos del Excel en las tablas relacionales
 */
async function guardarDatosEnTablas(programaId, plantillaId, seccionesDetectadas, transaction) {
  try {
    console.log('ðŸ“Š Guardando datos en tablas relacionales...');
    
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

    console.log(`  ðŸ“‹ ${secciones.length} secciones encontradas en la plantilla`);
    console.log(`  ðŸ“‹ Secciones de la plantilla:`, secciones.map(s => s.nombre));
    console.log(`  ðŸ“‹ Secciones del archivo:`, seccionesDetectadas.map(s => s.titulo));

    // Procesar cada secciÃ³n
    for (const seccion of secciones) {
      // Buscar los datos correspondientes del Excel
      const datosSeccion = seccionesDetectadas.find(s => 
        s.titulo.trim().toUpperCase() === seccion.nombre.trim().toUpperCase()
      );

      // Crear registro de contenido_programa SIEMPRE (incluso sin datos)
      // El docente llenarÃ¡ los campos vacÃ­os despuÃ©s
      let textoContenido = null;
      
      if (datosSeccion && datosSeccion.datos && datosSeccion.datos.length > 0) {
        if (seccion.tipo === 'texto_largo') {
          // Para texto largo: extraer solo el texto plano, sin arrays ni JSON
          textoContenido = datosSeccion.datos
            .map(fila => {
              // Unir todas las celdas de la fila con espacio
              return fila.filter(c => c && c.trim()).join(' ');
            })
            .filter(linea => linea.trim() !== '') // Eliminar lÃ­neas vacÃ­as
            .join('\n'); // Unir lÃ­neas con salto de lÃ­nea
        }
      } else {
        console.log(`  âš ï¸ Sin datos para secciÃ³n: ${seccion.nombre} - Creando vacÃ­a para que docente complete`);
      }
      
      const contenido = await ContenidoPrograma.create({
        programa_analitico_id: programaId,
        seccion_plantilla_id: seccion.id,
        contenido_texto: textoContenido
      }, { transaction });

      console.log(`  âœ… Contenido creado para: ${seccion.nombre} (ID: ${contenido.id})`);

      // Si es una tabla y tiene datos, guardar las filas y valores
      if (seccion.tipo === 'tabla' && seccion.campos && seccion.campos.length > 0 && 
          datosSeccion && datosSeccion.datos && datosSeccion.datos.length > 0) {
        let filasProcesadas = 0;

        for (let i = 0; i < datosSeccion.datos.length; i++) {
          const filaExcel = datosSeccion.datos[i];
          
          // Saltar filas vacÃ­as
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

        console.log(`    ðŸ“ ${filasProcesadas} filas guardadas en la tabla`);
      }
    }

    console.log('âœ… Datos guardados exitosamente en tablas relacionales');
    return true;

  } catch (error) {
    console.error('âŒ Error al guardar datos en tablas:', error);
    throw error;
  }
}


/**
 * ============================================================================
 * FUNCIÃ“N MEJORADA: Extraer tablas directamente del XML interno del .docx
 * Esta es la forma mÃ¡s confiable de obtener TODAS las celdas de las tablas
 * ============================================================================
 */
async function extraerTablasDeWordXML(buffer) {
  try {
    console.log('ðŸ” ========== EXTRACCIÃ“N DIRECTA DEL XML DEL DOCX ==========');
    
    // El archivo .docx es un ZIP que contiene XML
    const zip = new AdmZip(buffer);
    const documentXml = zip.readAsText('word/document.xml');
    
    if (!documentXml) {
      throw new Error('No se encontrÃ³ word/document.xml en el archivo');
    }
    
    console.log('ðŸ“„ XML extraÃ­do:', documentXml.length, 'caracteres');
    
    // Parsear el XML
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const resultado = await parser.parseStringPromise(documentXml);
    
    // Navegar a las tablas: w:document > w:body > w:tbl
    const body = resultado['w:document']?.['w:body'];
    if (!body) {
      console.log('âš ï¸ No se encontrÃ³ w:body en el documento');
      return { filas: [], secciones: [] };
    }
    
    // Obtener todas las tablas
    let tablas = body['w:tbl'];
    if (!tablas) {
      console.log('âš ï¸ No se encontraron tablas en el documento');
      return { filas: [], secciones: [] };
    }
    
    // Asegurar que sea array
    if (!Array.isArray(tablas)) {
      tablas = [tablas];
    }
    
    console.log(`ðŸ“Š Tablas encontradas: ${tablas.length}`);
    
    // FunciÃ³n auxiliar para extraer texto de un elemento
    const extraerTexto = (elemento) => {
      if (!elemento) return '';
      
      // Si es string directo
      if (typeof elemento === 'string') return elemento;
      
      // Si tiene w:t (texto)
      if (elemento['w:t']) {
        const wt = elemento['w:t'];
        if (typeof wt === 'string') return wt;
        if (wt._) return wt._;
        if (Array.isArray(wt)) return wt.map(t => typeof t === 'string' ? t : (t._ || '')).join('');
        return '';
      }
      
      // Si tiene w:r (run de texto)
      if (elemento['w:r']) {
        const runs = Array.isArray(elemento['w:r']) ? elemento['w:r'] : [elemento['w:r']];
        return runs.map(r => extraerTexto(r)).join('');
      }
      
      // Si tiene w:p (pÃ¡rrafo)
      if (elemento['w:p']) {
        const parrafos = Array.isArray(elemento['w:p']) ? elemento['w:p'] : [elemento['w:p']];
        return parrafos.map(p => extraerTexto(p)).join('\n');
      }
      
      return '';
    };
    
    // Extraer todas las filas de todas las tablas
    const todasLasFilas = [];
    
    tablas.forEach((tabla, tablaIndex) => {
      let filas = tabla['w:tr'];
      if (!filas) return;
      if (!Array.isArray(filas)) filas = [filas];
      
      console.log(`  ðŸ“‹ Tabla ${tablaIndex + 1}: ${filas.length} filas`);
      
      filas.forEach((fila, filaIndex) => {
        let celdas = fila['w:tc'];
        if (!celdas) return;
        if (!Array.isArray(celdas)) celdas = [celdas];
        
        const contenidoCeldas = celdas.map(celda => {
          return extraerTexto(celda).trim();
        });
        
        // Solo agregar si tiene contenido
        if (contenidoCeldas.some(c => c)) {
          todasLasFilas.push(contenidoCeldas);
          
          // Log para debug (primeras 30 filas)
          if (todasLasFilas.length <= 30) {
            const preview = contenidoCeldas.map(c => c.substring(0, 25)).join(' | ');
            console.log(`    Fila ${todasLasFilas.length}: ${preview}`);
          }
        }
      });
    });
    
    console.log(`\nðŸ“‹ Total filas extraÃ­das: ${todasLasFilas.length}`);
    
    // DETECTAR SECCIONES basÃ¡ndose en las filas extraÃ­das
    const secciones = detectarSeccionesDeFilasWord(todasLasFilas);
    
    return {
      filas: todasLasFilas,
      secciones: secciones
    };
    
  } catch (error) {
    console.error('âŒ Error al extraer XML del Word:', error);
    throw error;
  }
}

/**
 * Detectar secciones a partir de las filas extraÃ­das del Word
 * Busca patrones conocidos en la PRIMERA COLUMNA de cada fila
 */
const DICCIONARIO_SECCIONES = [
  {
    clave: 'CABECERA',
    tipo: 'cabecera',
    patrones: [
      /PROGRAMA\s*ANAL[IÍ]TICO/i, 
      /DATOS\s*GENERALES/i, 
      /UNIVERSIDAD/i, 
      /VICERRECTORADO/i
    ]
  },
  {
    clave: 'OBJETIVOS', 
    tipo: 'texto_largo',
    patrones: [/OBJETIVOS/i, /PROPÓSITOS/i]
  },
  {
    // 🔥 CORRECCIÓN RESULTADOS: Soporta saltos de línea y textos largos
    clave: 'RESULTADOS',
    tipo: 'texto_largo',
    patrones: [
      /RESULTADOS?\s*(DE)?\s*APRENDIZAJE/i, 
      /LOGROS?\s*(DE)?\s*APRENDIZAJE/i,
      /COMPETENCIAS/i
    ]
  },
  {
    // 🔥 CORRECCIÓN CONTENIDOS: Detecta los encabezados internos como parte de la sección
    clave: 'CONTENIDO',
    tipo: 'tabla',
    patrones: [
      /CONTENIDOS?\s*(DE\s*LA)?\s*ASIGNATURA/i,
      /UNIDADES?\s*TEM[AÁ]TICAS?/i, 
      /DESARROLLO\s*DE\s*LA\s*ASIGNATURA/i,
      /PLAN\s*MICROCURRICULAR/i,
      /TEMARIO/i,
      // Patrones internos para forzar la detección si el título falla
      /^UT\s*\d+/i,             
      /^UNIDAD\s*\d+/i,         
      /^TEMA\s*\d+/i,
      /SISTEMA\s*DE\s*CONOCIMIENTOS/i
    ]
  },
  {
    clave: 'DATOS_GENERALES',
    tipo: 'datos_generales',
    patrones: [/^ASIGNATURA$/i, /PERIODO\s*ACAD[EÉ]MICO/i, /^NIVEL$/i, /^PAO$/i]
  },
  {
    clave: 'METODOLOGIA',
    tipo: 'texto_largo',
    patrones: [/METODOLOG[IÍ]A/i, /ESTRATEGIAS/i, /ENSEÑANZA.*APRENDIZAJE/i]
  },
  {
    clave: 'EVALUACION',
    tipo: 'texto_largo',
    patrones: [/PROCEDIMIENTOS?\s*(DE)?\s*EVALUACI[OÓ]N/i, /SISTEMA\s*DE\s*EVALUACI[OÓ]N/i, /CALIFICACI[OÓ]N/i]
  },
  {
    clave: 'BIBLIOGRAFIA',
    tipo: 'tabla',
    patrones: [
      /BIBLIOGRAF[IÍ]A\s*[-–]?\s*FUENTES/i,
      /FUENTES\s*DE\s*CONSULTA/i, 
      /REFERENCIAS\s*BIBLIOGR[AÁ]FICAS/i,
      /^BIBLIOGRAF[IÍ]A$/i
    ]
  },
  {
    clave: 'VISADO',
    tipo: 'tabla',
    patrones: [/VISADO/i, /FIRMAS/i, /LEGALIZACI[OÓ]N/i, /RESPONSABLE/i]
  }
];
// ==========================================
// 2. FUNCIÓN DE DETECCIÓN Y FUSIÓN
// ==========================================
function detectarSeccionesDeFilasWord(filas) {
  console.log('\n🔍 ========== DETECCIÓN DE ESTRUCTURA V5 (FIX TOTAL) ==========');

  const secciones = [];
  let seccionActual = null;     
  let claveActual = null;        
  let datosSeccion = [];
  let encabezadosDetectados = null; 

  // Helper de identificación
  const identificarTipoSeccion = (texto) => {
    if (!texto || texto.length < 2) return null;
    const textoNorm = texto.trim().toUpperCase();
    
    for (const config of DICCIONARIO_SECCIONES) {
      for (const regex of config.patrones) {
        if (regex.test(textoNorm)) {
          return { ...config, tituloEncontrado: textoNorm }; 
        }
      }
    }
    return null; 
  };

  filas.forEach((fila, idx) => {
    // 1. Limpieza y análisis de celdas
    const celda1 = fila[0]?.trim() || '';
    const celda2 = fila[1]?.trim() || '';
    const textoFilaCompleta = fila.join(' ').toUpperCase();

    // Intentamos identificar con la primera celda, o la segunda si la primera está vacía
    let nuevaIdentificacion = identificarTipoSeccion(celda1) || identificarTipoSeccion(celda2);

    // --- FIX 1: RESULTADOS ---
    // Si estamos en Resultados y encontramos una fila que parece texto largo, la forzamos
    if (claveActual === 'RESULTADOS' && !nuevaIdentificacion) {
        // Simplemente dejamos que pase al bloque de "filas de contenido"
    }

    // --- FIX 2: CONTENIDOS / UNIDADES TEMÁTICAS ---
    // Si detectamos "UNIDADES TEMATICAS" o "DESCRIPCIÓN", NO es nueva sección, es header de Contenido
    if (claveActual === 'CONTENIDO') {
        if (textoFilaCompleta.includes('UNIDADES TEMÁTICAS') || 
            textoFilaCompleta.includes('DESCRIPCIÓN') || 
            textoFilaCompleta.includes('HORAS')) {
            
            // Es un encabezado interno, lo guardamos y continuamos
            encabezadosDetectados = fila;
            datosSeccion.push(fila); // Lo agregamos visualmente también
            return; 
        }
        // Si detectamos "UT 1", "TEMA 1", forzamos que siga en CONTENIDO
        if (/^(UT|UNIDAD|TEMA)\s*\d+/i.test(celda1) || /^(UT|UNIDAD|TEMA)\s*\d+/i.test(celda2)) {
             nuevaIdentificacion = null; // Anulamos cambio de sección para mantenernos en Contenido
        }
    }

    // --- FIX 3: BIBLIOGRAFÍA ---
    // Sub-etiquetas como "BIBLIOGRAFÍA BÁSICA" y "BIBLIOGRAFÍA COMPLEMENTARIA" 
    // son contenido INTERNO, no secciones nuevas
    if (claveActual === 'BIBLIOGRAFIA') {
        // Si estamos ya en BIBLIOGRAFIA, todo lo que venga es contenido interno
        nuevaIdentificacion = null;
    }
    
    // Si detectamos "BÁSICA" o "COMPLEMENTARIA" sueltas, no son secciones nuevas
    if (nuevaIdentificacion?.clave === 'BIBLIOGRAFIA') {
        const textoCompleto = celda1.toUpperCase() + ' ' + celda2.toUpperCase();
        // Solo permitir cambio real si dice "BIBLIOGRAFÍA - FUENTES" o similar como título principal
        if (claveActual && !textoCompleto.includes('FUENTES') && !textoCompleto.includes('REFERENCIAS')) {
            // Si ya tenemos una sección activa, probablemente es una sub-etiqueta interna
            // La dejamos pasar como contenido
            datosSeccion.push(fila);
            return;
        }
    }

    // =========================================================
    // LÓGICA DE CAMBIO DE SECCIÓN
    // =========================================================
    if (nuevaIdentificacion) {
      
      // CASO A: TÍTULO REPETIDO O CONTINUACIÓN (Merge)
      if (claveActual === nuevaIdentificacion.clave) {
         // Es el mismo título (ej: repetido en otra página o columna). 
         // Lo ignoramos o lo agregamos como separador visual si es necesario.
         return; 
      }

      // CASO B: SECCIÓN NUEVA REAL -> GUARDAR ANTERIOR
      if (seccionActual && datosSeccion.length > 0) {
        secciones.push({
          titulo: obtenerTituloEstandar(seccionActual.clave, seccionActual.tituloEncontrado),
          tipo: seccionActual.tipo,
          encabezados: encabezadosDetectados || [],
          datos: datosSeccion
        });
      }

      // INICIAR NUEVA
      console.log(`  🎯 Sección Detectada: ${nuevaIdentificacion.tituloEncontrado}`);
      seccionActual = nuevaIdentificacion;
      claveActual = nuevaIdentificacion.clave;
      datosSeccion = [];
      encabezadosDetectados = null;

      // Si la fila del título tiene contenido a la derecha, lo guardamos
      // PERO sin el nombre de la sección en la primera celda
      const contenidoExtra = fila.slice(1).filter(c => c && c.trim().length > 0);
      if (contenidoExtra.length > 0) {
          const filaSinTitulo = [...fila];
          filaSinTitulo[0] = ''; // Quitamos el título de sección para no duplicar
          datosSeccion.push(filaSinTitulo);
      }

    } else if (seccionActual) {
      // =========================================================
      // LÓGICA DE CONTENIDO (FILAS NORMALES)
      // =========================================================
      
      // Saltar filas vacías
      if (!fila.some(c => c && c.trim().length > 0)) return;

      // 1. Limpieza de Títulos Laterales Repetidos (Merged Cells del Word)
      // Solo limpiar si la primera celda es EXACTAMENTE el título de la sección
      // (NO coincidencia parcial, para no borrar contenido real)
      const celda1Upper = celda1.toUpperCase().trim();
      const tituloSeccionUpper = seccionActual.tituloEncontrado.toUpperCase().trim();
      
      // Coincidencia exacta o casi exacta (la celda es solo el título y nada más)
      const esTituloRepetido = (
        celda1Upper === tituloSeccionUpper ||
        celda1Upper === obtenerTituloEstandar(seccionActual.clave, seccionActual.tituloEncontrado).toUpperCase()
      );
      
      if (esTituloRepetido) {
          const filaLimpia = [...fila];
          filaLimpia[0] = ''; // Borramos el título lateral
          // Solo guardamos si queda algo más
          if (filaLimpia.some(c => c.trim().length > 0)) {
              datosSeccion.push(filaLimpia);
          }
      } else {
          // Fila normal de datos — guardar TAL CUAL
          datosSeccion.push(fila);
      }
    }
  });

  // Guardar la última al salir del loop
  if (seccionActual && datosSeccion.length > 0) {
    secciones.push({
      titulo: obtenerTituloEstandar(seccionActual.clave, seccionActual.tituloEncontrado),
      tipo: seccionActual.tipo,
      encabezados: encabezadosDetectados || [],
      datos: datosSeccion
    });
  }

  return secciones;
}

// Helper para limpiar nombres (Asegúrate de tener esta función o una similar)
function obtenerTituloEstandar(clave, original) {
    const mapa = {
        'CONTENIDO': 'CONTENIDOS DE LA ASIGNATURA',
        'RESULTADOS': 'RESULTADOS DE APRENDIZAJE',
        'BIBLIOGRAFIA': 'BIBLIOGRAFÍA',
        'METODOLOGIA': 'METODOLOGÍA',
        'EVALUACION': 'EVALUACIÓN'
    };
    return mapa[clave] || original;
}


/**
 * FunciÃ³n legacy para mammoth (fallback si XML falla)
 */
async function procesarWordMammoth(buffer) {
  try {
    console.log('ðŸ” Procesando con Mammoth (fallback)...');
    
    const resultadoHtml = await mammoth.convertToHtml({ buffer });
    const $ = cheerio.load(resultadoHtml.value);
    
    const filas = [];
    $('table tr').each((i, row) => {
      const celdas = [];
      $(row).find('td, th').each((j, cell) => {
        celdas.push($(cell).text().trim());
      });
      if (celdas.some(c => c)) {
        filas.push(celdas);
      }
    });
    
    return { filas, secciones: detectarSeccionesDeFilasWord(filas) };
  } catch (error) {
    console.error('âŒ Error en Mammoth fallback:', error);
    throw error;
  }
}

/**
 * FUNCIÃ“N PRINCIPAL para procesar Word
 * Intenta XML primero, luego Mammoth como fallback
 */
async function procesarWord(buffer) {
  try {
    // Intentar extracciÃ³n por XML (mÃ¡s confiable)
    let resultado = await extraerTablasDeWordXML(buffer);
    
    // Si no hay filas, intentar con Mammoth
    if (!resultado.filas || resultado.filas.length === 0) {
      console.log('âš ï¸ XML no extrajo filas, intentando con Mammoth...');
      resultado = await procesarWordMammoth(buffer);
    }
    
    // Retornar las filas para compatibilidad con el flujo existente
    // Pero tambiÃ©n pasar las secciones pre-detectadas
    resultado.filas._seccionesPreDetectadas = resultado.secciones;
    
    return resultado.filas;
    
  } catch (error) {
    console.error('âŒ Error procesando Word:', error);
    throw error;
  }
}


// Subir y procesar archivo Excel o Word de programa analÃ­tico
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.files || !req.files.excel || req.files.excel.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionÃ³ archivo'
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
        message: 'Formato de archivo invÃ¡lido. Use .xlsx o .docx'
      });
    }

    let jsonData = [];

    // Procesar segÃºn el tipo de archivo
    if (esWord) {
      console.log('ðŸ“„ Procesando archivo Word (.docx)...');
      jsonData = await procesarWord(archivo.buffer);
    } else {
      console.log('ðŸ“Š Procesando archivo Excel (.xlsx)...');
      // Leer y procesar Excel desde buffer de multer
      const workbook = xlsx.read(archivo.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Obtener rango del worksheet
      const range = xlsx.utils.decode_range(worksheet['!ref']);
      
      // Extraer datos manejando celdas combinadas
      jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: true });
      
      // ðŸ”¥ IMPORTANTE: Manejar celdas combinadas (merged cells)
      const merges = worksheet['!merges'] || [];
      console.log(`ðŸ“Š Celdas combinadas encontradas: ${merges.length}`);
      
      // Expandir celdas combinadas - copiar el valor a todas las celdas del rango
      merges.forEach(merge => {
        const startRow = merge.s.r;
        const startCol = merge.s.c;
        const endRow = merge.e.r;
        const endCol = merge.e.c;
        
        // Obtener el valor de la celda inicial
        const valorOriginal = jsonData[startRow] && jsonData[startRow][startCol] 
          ? jsonData[startRow][startCol] 
          : '';
        
        if (valorOriginal) {
          console.log(`   ðŸ“‹ Merge [${startRow},${startCol}] -> [${endRow},${endCol}]: "${valorOriginal.toString().substring(0, 30)}..."`);
          
          // Copiar el valor a todas las filas del rango combinado
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
      
      // Log para debug - mostrar primeras filas con todas las columnas
      console.log('ðŸ“Š Primeras 20 filas del Excel (con merges expandidos):');
      for (let i = 0; i < Math.min(20, jsonData.length); i++) {
        const fila = jsonData[i] || [];
        const contenido = fila.map((c, idx) => `[${idx}]:"${c ? c.toString().substring(0, 20) : ''}"`).join(' | ');
        console.log(`   Fila ${i}: ${contenido}`);
      }
    }

    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El archivo estÃ¡ vacÃ­o'
      });
    }

    // FunciÃ³n para detectar secciones por tÃ­tulos (Formato UNESUM)
    const detectarSecciones = (data) => {
      const secciones = [];
      const seccionesEspeciales = [
        // Orden CRÃTICO: De mÃ¡s especÃ­fico a mÃ¡s general
        // Secciones que contienen "ASIGNATURA" deben ir ANTES que el patrÃ³n genÃ©rico "ASIGNATURA"
        // Nota: \s+ permite mÃºltiples espacios para manejar espacios extra del Word
        
        // Cabecera
        { patron: /PROGRAMA\s+ANAL[IÃ]TICO\s+DE\s+ASIGNATURA/i, nombre: 'PROGRAMA ANALÃTICO DE ASIGNATURA', tipo: 'cabecera', esCabecera: true },
        
        // Secciones especÃ­ficas con "ASIGNATURA" (DEBEN IR PRIMERO)
        { patron: /OBJETIVOS\s+DE\s+LA\s+ASIGNATURA/i, nombre: 'OBJETIVOS DE LA ASIGNATURA', tipo: 'texto_largo' },
        { patron: /RESULTADOS?\s+D?E?\s*APRENDIZAJE\s+DE\s+LA\s+ASIGNATURA/i, nombre: 'RESULTADOS DE APRENDIZAJE DE LA ASIGNATURA', tipo: 'texto_largo' },
        { patron: /CONTENIDOS?\s+DE\s+LA\s+ASIGNATURA/i, nombre: 'CONTENIDO DE LA ASIGNATURA', tipo: 'tabla' },
        
        // Datos generales (ahora DESPUÃ‰S de los especÃ­ficos)
        { patron: /ASIGNATURA/i, nombre: 'ASIGNATURA', tipo: 'datos_generales', esDatosGenerales: true },
        { patron: /PERIODO\s+ACAD[EÃ‰]MICO/i, nombre: 'PERIODO ACADÃ‰MICO ORDINARIO(PAO)', tipo: 'datos_generales', esDatosGenerales: true },
        { patron: /NIVEL/i, nombre: 'NIVEL', tipo: 'datos_generales', esDatosGenerales: true },
        
        // Secciones principales
        { patron: /CARACTERIZACI[OÃ“]N/i, nombre: 'CARACTERIZACIÃ“N', tipo: 'texto_largo' },
        { patron: /COMPETENCIAS/i, nombre: 'COMPETENCIAS', tipo: 'texto_largo' },
        
        // Contenido alternativo
        { patron: /UNIDADES\s+TEM[AÃ]TICAS/i, nombre: 'CONTENIDO DE LA ASIGNATURA', tipo: 'tabla' },
        
        // MetodologÃ­a y evaluaciÃ³n
        { patron: /METODOLOG[IÃ]A/i, nombre: 'METODOLOGÃA', tipo: 'texto_largo' },
        { patron: /PROCEDIMIENTOS?\s+DE\s+EVALUACI[OÃ“]N/i, nombre: 'PROCEDIMIENTO DE EVALUACIÃ“N', tipo: 'texto_largo' },
        
        // BibliografÃ­a (puede ser tabla con sub-secciones)
        { patron: /BIBLIOGRAF[IÃ]A\s*-?\s*FUENTES\s+DE\s+CONSULTA/i, nombre: 'BIBLIOGRAFÃA - FUENTES DE CONSULTA', tipo: 'tabla' },
        { patron: /BIBLIOGRAF[IÃ]A\s+B[AÃ]SICA/i, nombre: 'BIBLIOGRAFÃA BÃSICA', tipo: 'texto_largo', esSubseccion: true },
        { patron: /BIBLIOGRAF[IÃ]A\s+COMPLEMENTARIA/i, nombre: 'BIBLIOGRAFÃA COMPLEMENTARIA', tipo: 'texto_largo', esSubseccion: true },
        
        // Firmas
        { patron: /VISADO/i, nombre: 'VISADO', tipo: 'tabla', esFirmas: true },
        
        // 🆕 Secciones personalizadas adicionales
        { patron: /NUEVP/i, nombre: 'NUEVP', tipo: 'texto_largo' },
        { patron: /NUEV/i, nombre: 'NUEV', tipo: 'texto_largo' }
      ];

      let seccionActual = null;
      let nombreSeccion = null;
      let tipoSeccion = 'texto_largo';
      let datosSeccion = [];
      let encabezadosTabla = [];
      let esTituloNegrilla = false;

      data.forEach((fila, idx) => {
        // FunciÃ³n para limpiar texto agresivamente
        const limpiarTexto = (texto) => {
          if (!texto) return '';
          return texto.toString()
            .replace(/[\r\n]+/g, ' ')  // Saltos de lÃ­nea
            .replace(/\s+/g, ' ')       // MÃºltiples espacios
            .replace(/["""'']/g, '')    // Comillas fancy
            .replace(/^\s+|\s+$/g, '')  // Trim
            .toUpperCase();              // MayÃºsculas para comparaciÃ³n
        };
        
        // Buscar texto en TODAS las columnas, no solo las primeras 3
        const columnasLimpias = fila.map(c => limpiarTexto(c));
        const filaTextoCompleto = columnasLimpias.join(' ').trim();
        
        // Para logs: usar las primeras columnas
        const col1Limpia = columnasLimpias[0] || '';
        const col2Limpia = columnasLimpias[1] || '';
        const col3Limpia = columnasLimpias[2] || '';
        
        // Detectar si es un tÃ­tulo de secciÃ³n usando REGEX
        // Buscar en CUALQUIER columna de la fila
        const seccionEncontrada = seccionesEspeciales.find(sec => {
          if (sec.patron instanceof RegExp) {
            // Buscar en el texto completo de la fila O en cualquier columna individual
            if (sec.patron.test(filaTextoCompleto)) return true;
            
            // TambiÃ©n buscar en cada columna individualmente
            return columnasLimpias.some(col => sec.patron.test(col));
          } else {
            // Fallback para patrones string
            if (filaTextoCompleto.includes(sec.patron.toUpperCase())) return true;
            return columnasLimpias.some(col => col.includes(sec.patron.toUpperCase()));
          }
        });

        // Log mÃ¡s detallado para depuraciÃ³n
        if (idx < 75) { // Limitar logs
          const resumen = filaTextoCompleto.length > 60 ? filaTextoCompleto.substring(0, 60) + '...' : filaTextoCompleto;
          console.log(`ðŸ“‹ Fila ${idx}: "${resumen}" ${seccionEncontrada ? `âœ… -> ${seccionEncontrada.nombre}` : ''}`);
        }

        if (seccionEncontrada) {
          // ðŸ”¥ IMPORTANTE: Evitar re-detectar la misma secciÃ³n (por celdas combinadas/merge)
          if (seccionActual === seccionEncontrada.nombre) {
            // Es la misma secciÃ³n, posiblemente por merge - capturar contenido de columna derecha
            const filaLimpia = fila.map(c => c ? c.toString().trim() : '');
            const contenidoColumnasDerecha = filaLimpia.slice(1).filter(c => c !== '');
            if (contenidoColumnasDerecha.length > 0) {
              datosSeccion.push(['', ...filaLimpia.slice(1)]);
              console.log(`   ðŸ“ Fila ${idx}: Contenido adicional agregado (merge): ${contenidoColumnasDerecha.join(' | ').substring(0, 40)}...`);
            }
            return; // No crear nueva secciÃ³n, solo agregar contenido
          }
          
          // Guardar secciÃ³n anterior si existe (INCLUSO SI ESTÃ VACÃA - el docente la llenarÃ¡)
          if (seccionActual) {
            secciones.push({
              titulo: seccionActual,
              tipo: tipoSeccion,
              encabezados: encabezadosTabla,
              datos: datosSeccion, // Puede estar vacÃ­o, el docente lo llenarÃ¡
              esNegrilla: esTituloNegrilla
            });
            console.log(`ðŸ’¾ Guardando secciÃ³n: "${seccionActual}" con ${datosSeccion.length} filas de datos`);
          }
          
          // Iniciar nueva secciÃ³n con el nombre standarizado
          seccionActual = seccionEncontrada.nombre;  // Usar nombre estandarizado
          tipoSeccion = seccionEncontrada.tipo;
          datosSeccion = [];
          encabezadosTabla = [];
          
          // ðŸ”¥ IMPORTANTE: Capturar contenido de la columna derecha si existe
          // El formato tÃ­pico es: [TITULO_SECCION] | [CONTENIDO]
          const filaLimpia = fila.map(c => c ? c.toString().trim() : '');
          
          // Buscar contenido en columnas que NO sean el tÃ­tulo
          const contenidoColumnasDerecha = filaLimpia.slice(1).filter(c => c !== '');
          
          if (contenidoColumnasDerecha.length > 0) {
            // Si hay contenido a la derecha del tÃ­tulo, agregarlo como datos
            console.log(`   ðŸ“ Contenido encontrado en columna derecha: "${contenidoColumnasDerecha.join(' | ').substring(0, 50)}..."`);
            datosSeccion.push(filaLimpia);
          }
          esTituloNegrilla = true; // Los tÃ­tulos siempre son negrilla
          
          console.log(`âœ… Nueva secciÃ³n detectada: "${seccionActual}" - Tipo: ${tipoSeccion}`);
          
          // Si es tabla, buscar encabezados en las siguientes filas
          if (tipoSeccion === 'tabla' && idx + 1 < data.length) {
            console.log(`   ðŸ” Buscando encabezados de tabla para: ${seccionActual}`);
            
            // Buscar la fila con encabezados (puede estar 1-5 filas despuÃ©s)
            for (let i = 1; i <= 5; i++) {
              if (idx + i < data.length) {
                const filaTest = data[idx + i];
                
                // Contar columnas NO vacÃ­as
                const columnasConTexto = filaTest.filter(cell => {
                  const texto = cell ? cell.toString().trim() : '';
                  return texto !== '' && texto.length > 0;
                }).length;
                
                console.log(`   ðŸ“‹ Fila +${i}: ${columnasConTexto} columnas con texto`);
                
                // Si tiene al menos 2 columnas con texto, son encabezados
                if (columnasConTexto >= 2) {
                  // Capturar TODAS las columnas, incluyendo vacÃ­as (para mantener estructura)
                  encabezadosTabla = filaTest.map(h => h ? h.toString().trim() : '');
                  
                  // Filtrar encabezados completamente vacÃ­os al final
                  while (encabezadosTabla.length > 0 && encabezadosTabla[encabezadosTabla.length - 1] === '') {
                    encabezadosTabla.pop();
                  }
                  
                  console.log(`   âœ… Encabezados encontrados (${encabezadosTabla.length} cols):`, encabezadosTabla);
                  break;
                }
              }
            }
            
            // Si no se encontraron encabezados, usar estructura genÃ©rica
            if (encabezadosTabla.length === 0) {
              console.log(`   âš ï¸ No se encontraron encabezados, usando columnas genÃ©ricas`);
            }
          }
        } else if (seccionActual) {
          // Agregar filas con contenido
          const filaLimpia = fila.map(c => c ? c.toString().trim() : '');
          
          // ðŸ”¥ MEJORADO: Verificar si esta fila es una repeticiÃ³n del tÃ­tulo por merge
          const esRepeticionTitulo = columnasLimpias[0] === seccionActual.toUpperCase() ||
            columnasLimpias.some(col => col === seccionActual.toUpperCase());
          
          // Capturar contenido de columnas derechas incluso si col 0 tiene el tÃ­tulo (por merge)
          let filaContenido = filaLimpia;
          if (esRepeticionTitulo) {
            // Si la fila repite el tÃ­tulo, extraer solo el contenido de las columnas derechas
            const contenidoDerecha = filaLimpia.slice(1).filter(c => c !== '');
            if (contenidoDerecha.length > 0) {
              filaContenido = ['', ...filaLimpia.slice(1)]; // Mantener estructura pero sin tÃ­tulo
              console.log(`   ðŸ“ Fila ${idx}: Contenido extraÃ­do de columna derecha (tÃ­tulo repetido por merge)`);
            } else {
              // Es solo el tÃ­tulo repetido sin contenido, saltar
              return;
            }
          }
          
          const tieneDatos = filaContenido.some(cell => cell !== '');
          
          if (tieneDatos) {
            // Saltar fila de encabezados si ya fue procesada
            const esFilaEncabezado = encabezadosTabla.length > 0 && 
                JSON.stringify(filaContenido) === JSON.stringify(encabezadosTabla);
            
            if (!esFilaEncabezado) {
              // Si es tabla y tiene encabezados, asegurar que la fila tenga el mismo nÃºmero de columnas
              if (tipoSeccion === 'tabla' && encabezadosTabla.length > 0) {
                // Extender o recortar la fila para que coincida con los encabezados
                const filaAjustada = [...filaContenido];
                while (filaAjustada.length < encabezadosTabla.length) {
                  filaAjustada.push('');
                }
                if (filaAjustada.length > encabezadosTabla.length) {
                  filaAjustada.length = encabezadosTabla.length;
                }
                datosSeccion.push(filaAjustada);
                console.log(`   ðŸ“ Fila ${idx} agregada a "${seccionActual}": ${filaAjustada.filter(c => c).join(' | ').substring(0, 50)}...`);
              } else {
                datosSeccion.push(filaContenido);
                console.log(`   ðŸ“ Fila ${idx} agregada a "${seccionActual}": ${filaContenido.filter(c => c).join(' | ').substring(0, 50)}...`);
              }
            }
          }
        }
      });

      // Guardar Ãºltima secciÃ³n (INCLUSO SI ESTÃ VACÃA - el docente la llenarÃ¡)
      if (seccionActual) {
        secciones.push({
          titulo: seccionActual,
          tipo: tipoSeccion,
          encabezados: encabezadosTabla,
          datos: datosSeccion
        });
        console.log(`ðŸ’¾ Guardando Ãºltima secciÃ³n: "${seccionActual}" con ${datosSeccion.length} filas de datos`);
      }

      return secciones;
    };

    // IMPORTANTE: Si es Word, usar las secciones ya extraÃ­das por procesarWord
    let seccionesDetectadas;
    if (esWord && jsonData._seccionesWord && jsonData._seccionesWord.length > 0) {
      console.log('ðŸ“‹ Usando secciones pre-extraÃ­das del Word');
      seccionesDetectadas = jsonData._seccionesWord;
    } else {
      console.log('ðŸ“‹ Detectando secciones del archivo...');
      seccionesDetectadas = detectarSecciones(jsonData);
    }
    
    // ðŸ”¥ ELIMINAR DUPLICADOS GLOBALMENTE antes de procesar
    const nombresVistosGlobal = new Set();
    const seccionesUnicasGlobal = [];
    
    for (const seccion of seccionesDetectadas) {
      const nombreNormalizado = seccion.titulo.trim().toUpperCase();
      
      if (!nombresVistosGlobal.has(nombreNormalizado)) {
        nombresVistosGlobal.add(nombreNormalizado);
        seccionesUnicasGlobal.push(seccion);
      } else {
        // Si es duplicado, combinar los datos con la secciÃ³n existente
        const seccionExistente = seccionesUnicasGlobal.find(s => 
          s.titulo.trim().toUpperCase() === nombreNormalizado
        );
        if (seccionExistente && seccion.datos && seccion.datos.length > 0) {
          seccionExistente.datos = [...(seccionExistente.datos || []), ...seccion.datos];
          console.log(`   ï¿½ Combinando datos duplicados de: ${seccion.titulo}`);
        }
      }
    }
    
    // Reemplazar con las secciones Ãºnicas
    seccionesDetectadas = seccionesUnicasGlobal;
    
    // LIMPIAR DATOS DUPLICADOS DENTRO DE CADA SECCION
    console.log("[LIMPIEZA] Limpiando datos duplicados de cada seccion...");
    seccionesDetectadas = seccionesDetectadas.map(seccion => limpiarDatosSeccion(seccion));
    
    console.log(`ï¿½ðŸ“Š Total secciones a procesar (sin duplicados): ${seccionesDetectadas.length}`);
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
    // CREAR O ACTUALIZAR PLANTILLA AUTOMÃTICAMENTE DESDE LA ESTRUCTURA DEL EXCEL
    // =========================================================================
    const transaction = await db.sequelize.transaction();
    
    try {
      console.log('ðŸš€ Creando plantilla desde estructura del Excel...');
      
      // Nombre de la plantilla basado en la asignatura
      const nombrePlantilla = datosGenerales.asignatura 
        ? `Plantilla ${datosGenerales.asignatura}` 
        : 'Plantilla Programa AnalÃ­tico';

      // Crear o actualizar la plantilla
      const plantilla = await crearPlantillaDesdeExcel(
        seccionesDetectadas, 
        nombrePlantilla, 
        req.user?.id || null,
        transaction
      );

      console.log(`âœ… Plantilla procesada exitosamente (ID: ${plantilla.id})`);
      
      // Preparar datos para guardar en la tabla existente
      const programaData = {
        nombre: datosGenerales.asignatura || 'Programa AnalÃ­tico',
        plantilla_id: plantilla.id, // ðŸ”— VINCULAR CON LA PLANTILLA CREADA
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

      console.log(`âœ… Programa analÃ­tico creado exitosamente (ID: ${programaAnalitico.id})`);

      // =========================================================================
      // ðŸ”¥ GUARDAR DATOS EN TABLAS RELACIONALES
      // =========================================================================
      await guardarDatosEnTablas(
        programaAnalitico.id,
        plantilla.id,
        seccionesDetectadas,
        transaction
      );

      await transaction.commit();

      console.log(`âœ… TransacciÃ³n completada exitosamente`);

      return res.status(201).json({
        success: true,
        message: 'Programa analÃ­tico cargado exitosamente con plantilla dinÃ¡mica',
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
      console.error('âŒ Error en transacciÃ³n:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('âŒ Error al cargar programa analÃ­tico:', error);
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
        carrera: 'IngenierÃ­a en Sistemas',
        nivel: 'Primer Nivel',
        paralelo: 'A',
        asignatura: 'ProgramaciÃ³n I',
        codigo: 'PROG101',
        creditos: 4,
        horas_semanales: 5,
        periodo_academico: '2025-1',
        docente: 'Dr. Juan PÃ©rez',
        unidad_tematica: 'Unidad 1: IntroducciÃ³n',
        contenidos: 'Variables, tipos de datos, operadores',
        horas_clase: 8,
        horas_practicas: 12,
        horas_autonomas: 20,
        estrategias_metodologicas: 'Clases magistrales, laboratorios prÃ¡cticos',
        recursos_didacticos: 'Computadora, proyector, IDE',
        evaluacion: 'Examen parcial 30%, Laboratorios 40%, Proyecto 30%',
        bibliografia: 'Deitel, P. (2020). Java How to Program'
      },
      {
        carrera: 'IngenierÃ­a en Sistemas',
        nivel: 'Primer Nivel',
        paralelo: 'A',
        asignatura: 'ProgramaciÃ³n I',
        codigo: 'PROG101',
        creditos: 4,
        horas_semanales: 5,
        periodo_academico: '2025-1',
        docente: 'Dr. Juan PÃ©rez',
        unidad_tematica: 'Unidad 2: Estructuras de Control',
        contenidos: 'If-else, switch, bucles for, while',
        horas_clase: 10,
        horas_practicas: 15,
        horas_autonomas: 25,
        estrategias_metodologicas: 'Ejercicios prÃ¡cticos, resoluciÃ³n de problemas',
        recursos_didacticos: 'Material didÃ¡ctico, ejercicios en lÃ­nea',
        evaluacion: 'Examen parcial 30%, PrÃ¡cticas 70%',
        bibliografia: 'Joyanes, L. (2019). Fundamentos de ProgramaciÃ³n'
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

    xlsx.utils.book_append_sheet(wb, ws, 'Programa AnalÃ­tico');

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

// Listar todos los programas analÃ­ticos
exports.getAll = async (req, res) => {
  try {
    // 🔍 LOG DE PARÁMETROS DE BÚSQUEDA
    console.log('🔍 ========================================');
    console.log('🔍 GET /programa-analitico - Parámetros recibidos:');
    console.log('🔍 Query params:', req.query);
    console.log('🔍 ========================================');

    // Construir filtros dinámicos
    const where = {};
    
    if (req.query.asignatura_id) {
      where.asignatura_id = req.query.asignatura_id;
      console.log('✅ Filtro aplicado: asignatura_id =', req.query.asignatura_id);
    }
    
    if (req.query.periodo) {
      where.periodo = req.query.periodo;
      console.log('✅ Filtro aplicado: periodo =', req.query.periodo);
    }

    const programas = await ProgramaAnalitico.findAll({
      where: where,
      include: [
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombres', 'apellidos', 'correo_electronico', 'rol'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 🔍 LOG DE RESULTADOS
    console.log('📊 Programas encontrados:', programas.length);
    if (programas.length > 0) {
      console.log('📋 Primer programa:');
      console.log('   - ID:', programas[0].id);
      console.log('   - Nombre:', programas[0].nombre_programa);
      console.log('   - Asignatura ID:', programas[0].asignatura_id);
      console.log('   - Periodo:', programas[0].periodo);
      console.log('   - Tiene datos_tabla:', !!programas[0].datos_tabla);
      
      if (programas[0].datos_tabla) {
        const datosTabla = typeof programas[0].datos_tabla === 'string' 
          ? JSON.parse(programas[0].datos_tabla) 
          : programas[0].datos_tabla;
        console.log('   - Secciones en JSON:', datosTabla?.secciones?.length || 0);
      }
    }
    console.log('🔍 ========================================');

    return res.status(200).json({
      success: true,
      data: programas
    });

  } catch (error) {
    console.error('Error al obtener programas analÃ­ticos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programas analÃ­ticos',
      error: error.message
    });
  }
};

// Obtener un programa analÃ­tico por ID CON DATOS DE TABLAS RELACIONALES
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener programa bÃ¡sico
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
        message: 'Programa analÃ­tico no encontrado'
      });
    }

    // ðŸ”¥ OBTENER DATOS DE TABLAS RELACIONALES
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
    console.error('Error al obtener programa analÃ­tico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programa analÃ­tico',
      error: error.message
    });
  }
};

// Obtener estructura del formulario desde el primer programa analÃ­tico guardado o uno especÃ­fico
exports.getEstructuraFormulario = async (req, res) => {
  try {
    const { id } = req.query; // Opcional: ID de programa especÃ­fico
    
    // Buscar el programa analÃ­tico especÃ­fico o el mÃ¡s reciente
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

    // Procesar secciones completas para el formulario dinÃ¡mico
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

// Eliminar programa analÃ­tico
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const programa = await ProgramaAnalitico.findByPk(id);

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analÃ­tico no encontrado'
      });
    }

    // Eliminar archivos fÃ­sicos si existen en datos_tabla
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
      message: 'Programa analÃ­tico eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar programa analÃ­tico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar programa analÃ­tico',
      error: error.message
    });
  }
};

// Asignar programa analÃ­tico a un docente
exports.asignarADocente = async (req, res) => {
  try {
    const { programaAnaliticoId, profesorId, asignaturaId, nivelId, paraleloId, periodoId } = req.body;

    if (!programaAnaliticoId || !profesorId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere programaAnaliticoId y profesorId'
      });
    }

    // Verificar que existe el programa analÃ­tico
    const programa = await ProgramaAnalitico.findByPk(programaAnaliticoId);
    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analÃ­tico no encontrado'
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

    // Crear o actualizar la asignaciÃ³n (guardamos en datos_tabla del programa)
    const asignaciones = programa.datos_tabla.asignaciones_docentes || [];
    
    // Verificar si ya existe una asignaciÃ³n para este docente
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
      message: 'Programa analÃ­tico asignado exitosamente',
      data: {
        programa_id: programa.id,
        asignacion: nuevaAsignacion
      }
    });

  } catch (error) {
    console.error('Error al asignar programa analÃ­tico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al asignar programa analÃ­tico',
      error: error.message
    });
  }
};

// Obtener programas analÃ­ticos asignados a un docente
exports.getProgramasAsignados = async (req, res) => {
  try {
    const profesorId = req.user?.profesor_id || req.user?.id;

    console.log('ðŸ” Buscando programas para profesor ID:', profesorId);

    // Buscar TODOS los programas que tienen plantilla asociada
    // Esto permite que el docente vea los formularios que el admin creÃ³
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

    console.log(`ðŸ“¦ Encontrados ${programas.length} programas con plantilla`);

    // Transformar la respuesta para incluir info Ãºtil
    const programasDisponibles = programas.map(programa => {
      // Verificar si este profesor ya tiene contenido guardado
      const tieneContenidoGuardado = programa.datos_tabla?.contenidos_docentes?.[profesorId] ? true : false;
      
      return {
        id: programa.id,
        nombre: programa.nombre,
        asignatura_id: programa.asignatura_id || null,
        periodo: programa.periodo || null,
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
      message: `Se encontraron ${programasDisponibles.length} programas analÃ­ticos disponibles`
    });

  } catch (error) {
    console.error('âŒ Error al obtener programas asignados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programas asignados',
      error: error.message
    });
  }
};

// Actualizar contenido del programa analÃ­tico (por el docente)
exports.actualizarContenidoDocente = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, seccion } = req.body;
    const profesorId = req.user?.profesor_id;

    const programa = await ProgramaAnalitico.findByPk(id);

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analÃ­tico no encontrado'
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
// NUEVOS MÃ‰TODOS PARA ESTRUCTURA DE PLANTILLA
// =========================================================================

/**
 * Obtener programa analÃ­tico con estructura completa de la plantilla
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
          attributes: ['id', 'nombres', 'apellidos', 'correo_electronico']
        }
      ]
    });

    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analÃ­tico no encontrado'
      });
    }

    // Si no tiene plantilla, devolver estructura bÃ¡sica del JSON
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
      message: 'Error al obtener programa analÃ­tico',
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
    const { id } = req.params; // ID del programa analÃ­tico
    const { contenido } = req.body; // Contenido por secciÃ³n
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
        message: 'Programa analÃ­tico no encontrado'
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

    // Procesar cada secciÃ³n del contenido
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

    // Actualizar estado de asignaciÃ³n si existe
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
        message: 'No se proporcionÃ³ ID del profesor'
      });
    }

    // Usar raw queries para obtener el contenido
    const contenidoTexto = await sequelize.query(`
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
      type: QueryTypes.SELECT
    });

    const contenidoTabla = await sequelize.query(`
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
      type: QueryTypes.SELECT
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
 * Obtener programas analÃ­ticos disponibles con sus plantillas
 */
exports.getProgramasDisponibles = async (req, res) => {
  try {
    console.log('ðŸ” Obteniendo programas analÃ­ticos disponibles...');

    // Obtener todos los programas analÃ­ticos que tengan plantilla_id
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

    console.log(`âœ… Se encontraron ${programas.length} programas con plantilla`);

    return res.status(200).json({
      success: true,
      data: programas,
      total: programas.length
    });

  } catch (error) {
    console.error('âŒ Error al obtener programas disponibles:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener programas disponibles',
      error: error.message
    });
  }
};


// RE-LIMPIAR datos de un programa analitico existente
exports.relimpiarDatos = async (req, res) => {
  try {
    const { id } = req.params;
    
    const programa = await ProgramaAnalitico.findByPk(id);
    
    if (!programa) {
      return res.status(404).json({
        success: false,
        message: 'Programa analitico no encontrado'
      });
    }
    
    console.log('[RE-LIMPIEZA] Iniciando limpieza de datos para programa:', programa.id);
    
    // Obtener secciones actuales
    const seccionesActuales = programa.datos_tabla.secciones_completas || [];
    
    if (seccionesActuales.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay secciones para limpiar'
      });
    }
    
    console.log(`[RE-LIMPIEZA] Secciones a limpiar: ${seccionesActuales.length}`);
    
    // Aplicar limpieza a cada seccion
    const seccionesLimpias = seccionesActuales.map(seccion => limpiarDatosSeccion(seccion));
    
    // Actualizar el programa con datos limpios
    programa.datos_tabla = {
      ...programa.datos_tabla,
      secciones_completas: seccionesLimpias,
      fecha_relimpieza: new Date().toISOString()
    };
    
    await programa.save();
    
    console.log('[RE-LIMPIEZA] Datos limpiados y guardados exitosamente');
    
    return res.status(200).json({
      success: true,
      message: 'Datos limpiados exitosamente',
      data: {
        id: programa.id,
        secciones_procesadas: seccionesLimpias.length,
        secciones: seccionesLimpias.map(s => ({
          titulo: s.titulo,
          tipo: s.tipo,
          num_datos: s.datos?.length || 0
        }))
      }
    });
    
  } catch (error) {
    console.error('[RE-LIMPIEZA] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al re-limpiar datos',
      error: error.message
    });
  }
};


// 📋 EXTRAER SOLO LOS TÍTULOS de un archivo Excel o Word
// Útil para validar qué secciones se detectan antes de guardar
exports.extraerTitulos = async (req, res) => {
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
    let worksheet = null; // ✅ Declarar fuera del bloque para que sea accesible

    // Procesar según el tipo de archivo
    if (esWord) {
      console.log('📄 [EXTRACTOR] Procesando archivo Word (.docx)...');
      jsonData = await procesarWord(archivo.buffer);
    } else {
      console.log('📊 [EXTRACTOR] Procesando archivo Excel (.xlsx)...');
      const workbook = xlsx.read(archivo.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName]; // ✅ Asignar sin const
      
      jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: true });
      
      // Manejar celdas combinadas
      const merges = worksheet['!merges'] || [];
      console.log(`📊 [EXTRACTOR] Celdas combinadas: ${merges.length}`);
      
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

    // 🎯 FUNCIÓN INTELIGENTE SIN PATRONES - Detecta títulos por características del formato
    const detectarSoloTitulos = (data, worksheet = null) => {
      const titulosEncontrados = [];
      const titulosUnicos = new Map();

      // ✅ Función para limpiar texto
      const limpiarTexto = (texto) => {
        if (!texto) return '';
        return texto.toString()
          .replace(/[\r\n]+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/["""'']/g, '')
          .trim();
      };

      // 🔍 ESTRATEGIA 1: Detectar celdas combinadas (worksheet['!merges'])
      const celdasCombinadas = new Set();
      if (worksheet && worksheet['!merges']) {
        worksheet['!merges'].forEach(merge => {
          const fila = merge.s.r;
          const col = merge.s.c;
          celdasCombinadas.add(`${fila}-${col}`);
        });
        console.log(`📊 [EXTRACTOR] Celdas combinadas detectadas: ${worksheet['!merges'].length}`);
      }

      // 🔍 ESTRATEGIA 2: Analizar características de formato de cada celda
      const analizarCaracteristicas = (texto, fila, col) => {
        const textoLimpio = limpiarTexto(texto);
        if (!textoLimpio || textoLimpio.length < 2) return null;

        let puntuacion = 0;
        let caracteristicas = [];

        // ✅ 1. Es celda combinada? (+30 puntos)
        if (celdasCombinadas.has(`${fila}-${col}`)) {
          puntuacion += 30;
          caracteristicas.push('celda_combinada');
        }

        // ✅ 2. Está en mayúsculas? (+20 puntos)
        const porcentajeMayusculas = (textoLimpio.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length / textoLimpio.length;
        if (porcentajeMayusculas > 0.7) {
          puntuacion += 20;
          caracteristicas.push('mayusculas');
        }

        // ✅ 3. Es texto corto? (menos de 50 caracteres = probablemente título) (+15 puntos)
        if (textoLimpio.length < 50) {
          puntuacion += 15;
          caracteristicas.push('texto_corto');
        }

        // ✅ 4. Termina con ":" (indica etiqueta/título) (+10 puntos)
        if (textoLimpio.endsWith(':')) {
          puntuacion += 10;
          caracteristicas.push('termina_con_dos_puntos');
        }

        // ✅ 5. Primera columna (A) suele tener títulos (+10 puntos)
        if (col === 0) {
          puntuacion += 10;
          caracteristicas.push('primera_columna');
        }

        // ✅ 6. Contiene palabras clave comunes en títulos académicos (+5 puntos c/u)
        const palabrasClave = [
          'PROGRAMA', 'OBJETIVOS', 'RESULTADOS', 'APRENDIZAJE', 'CONTENIDO',
          'ASIGNATURA', 'PERIODO', 'NIVEL', 'CARACTERIZACIÓN', 'COMPETENCIAS',
          'UNIDADES', 'METODOLOGÍA', 'EVALUACIÓN', 'BIBLIOGRAFÍA', 'VISADO',
          'DESCRIPCIÓN', 'ESTRATEGIAS', 'RECURSOS', 'TEMAS', 'HORAS'
        ];
        
        palabrasClave.forEach(palabra => {
          if (textoLimpio.toUpperCase().includes(palabra)) {
            puntuacion += 5;
            caracteristicas.push(`keyword:${palabra.toLowerCase()}`);
          }
        });

        // ⚠️ PENALIZACIONES
        // Si es muy largo (>100 chars), probablemente no es título (-20 puntos)
        if (textoLimpio.length > 100) {
          puntuacion -= 20;
          caracteristicas.push('muy_largo');
        }

        // Si contiene números al inicio (ej: "1. ", "2.3"), puede ser contenido (-5 puntos)
        if (/^\d+\.?\s/.test(textoLimpio)) {
          puntuacion -= 5;
          caracteristicas.push('numero_al_inicio');
        }

        return {
          puntuacion,
          caracteristicas,
          esTitulo: puntuacion >= 25 // Umbral: 25+ puntos = es título
        };
      };

      // � RECORRER TODAS LAS CELDAS Y ANALIZAR
      data.forEach((fila, idxFila) => {
        fila.forEach((celda, idxCol) => {
          const analisis = analizarCaracteristicas(celda, idxFila, idxCol);
          
          if (analisis && analisis.esTitulo) {
            const textoLimpio = limpiarTexto(celda);
            const titulo = textoLimpio.replace(/:$/, ''); // Quitar ":" final si existe

            // Solo agregar si NO existe este título aún
            if (!titulosUnicos.has(titulo.toUpperCase())) {
              titulosUnicos.set(titulo.toUpperCase(), {
                titulo: titulo,
                tipo: analisis.caracteristicas.includes('celda_combinada') ? 'cabecera' : 
                      (analisis.puntuacion > 40 ? 'titulo_seccion' : 'campo'),
                fila: idxFila + 1,
                columna: idxCol + 1,
                columnaLetra: String.fromCharCode(65 + idxCol),
                textoOriginal: celda ? celda.toString().substring(0, 100) : '',
                puntuacion: analisis.puntuacion,
                caracteristicas: analisis.caracteristicas.join(', ')
              });

              console.log(`✅ [EXTRACTOR AUTO] Fila ${idxFila + 1}, Col ${String.fromCharCode(65 + idxCol)}: "${titulo}" (${analisis.puntuacion} pts)`);
            }
          }
        });
      });

      // Convertir Map a Array ordenado por puntuación (más relevantes primero)
      let numero = 1;
      const titulosOrdenados = Array.from(titulosUnicos.values())
        .sort((a, b) => b.puntuacion - a.puntuacion);

      titulosOrdenados.forEach(titulo => {
        titulosEncontrados.push({
          numero: numero++,
          ...titulo
        });
      });

      console.log(`📊 [EXTRACTOR AUTO] Total títulos detectados: ${titulosEncontrados.length}`);
      return titulosEncontrados;
    };

    // Detectar títulos (pasando worksheet para analizar formato)
    const titulos = detectarSoloTitulos(jsonData, esExcel ? worksheet : null);

    console.log(`📋 [EXTRACTOR] Total títulos detectados: ${titulos.length}`);

    // 💾 GUARDAR EN BASE DE DATOS
    const TituloExtraido = db.TituloExtraido;
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const usuarioId = req.user?.id || null;

    try {
      // Guardar cada título en la BD
      const titulosGuardados = await Promise.all(
        titulos.map(titulo => 
          TituloExtraido.create({
            session_id: sessionId,
            nombre_archivo: archivo.originalname,
            tipo_archivo: tipoArchivo,
            titulo: titulo.titulo,
            tipo: titulo.tipo,
            fila: titulo.fila,
            columna: titulo.columna,
            columna_letra: titulo.columnaLetra,
            puntuacion: titulo.puntuacion,
            caracteristicas: titulo.caracteristicas,
            texto_original: titulo.textoOriginal,
            usuario_id: usuarioId
          })
        )
      );

      console.log(`✅ [EXTRACTOR] ${titulosGuardados.length} títulos guardados en BD con session_id: ${sessionId}`);

      return res.status(200).json({
        success: true,
        message: `Se detectaron y guardaron ${titulos.length} títulos en el archivo ${tipoArchivo}`,
        data: {
          sessionId: sessionId, // 🔑 ID único para recuperar estos títulos después
          tipoArchivo,
          nombreArchivo: archivo.originalname,
          totalFilas: jsonData.length,
          totalTitulos: titulos.length,
          titulos: titulosGuardados.map(t => ({
            id: t.id,
            numero: titulos.find(orig => orig.titulo === t.titulo)?.numero,
            titulo: t.titulo,
            tipo: t.tipo,
            fila: t.fila,
            columna: t.columna,
            columnaLetra: t.columna_letra,
            puntuacion: t.puntuacion,
            caracteristicas: t.caracteristicas
          }))
        }
      });

    } catch (dbError) {
      console.error('❌ [EXTRACTOR] Error al guardar en BD:', dbError);
      
      // Devolver resultado aunque falle el guardado
      return res.status(200).json({
        success: true,
        warning: 'Títulos detectados pero no se pudieron guardar en BD',
        message: `Se detectaron ${titulos.length} títulos en el archivo ${tipoArchivo}`,
        data: {
          tipoArchivo,
          nombreArchivo: archivo.originalname,
          totalFilas: jsonData.length,
          totalTitulos: titulos.length,
          titulos: titulos
        }
      });
    }

  } catch (error) {
    console.error('❌ [EXTRACTOR] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al extraer títulos',
      error: error.message
    });
  }
};

// 📊 OBTENER TÍTULOS GUARDADOS POR SESSION_ID
exports.getTitulosPorSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const TituloExtraido = db.TituloExtraido;
    const Usuario = db.Usuario;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere sessionId'
      });
    }

    const titulos = await TituloExtraido.findAll({
      where: { session_id: sessionId },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombres', 'apellidos', 'correo_electronico'],
          required: false
        }
      ],
      order: [['puntuacion', 'DESC'], ['fila', 'ASC'], ['columna', 'ASC']]
    });

    if (titulos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron títulos para este sessionId'
      });
    }

    // Agrupar por tipo para el formulario dinámico
    const agrupadosPorTipo = titulos.reduce((acc, titulo) => {
      if (!acc[titulo.tipo]) {
        acc[titulo.tipo] = [];
      }
      acc[titulo.tipo].push(titulo);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        sessionId: sessionId,
        nombreArchivo: titulos[0].nombre_archivo,
        tipoArchivo: titulos[0].tipo_archivo,
        totalTitulos: titulos.length,
        titulos: titulos,
        agrupadosPorTipo: agrupadosPorTipo,
        estadisticas: {
          cabecera: agrupadosPorTipo.cabecera?.length || 0,
          titulo_seccion: agrupadosPorTipo.titulo_seccion?.length || 0,
          campo: agrupadosPorTipo.campo?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener títulos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener títulos',
      error: error.message
    });
  }
};

// 📝 OBTENER TODAS LAS SESIONES DE EXTRACCIÓN
exports.getSesionesExtraccion = async (req, res) => {
  try {
    const TituloExtraido = db.TituloExtraido;
    const Usuario = db.Usuario;
    const { usuarioId } = req.query;

    // Obtener sesiones únicas con estadísticas
    const whereClause = usuarioId ? { usuario_id: usuarioId } : {};

    const sesiones = await sequelize.query(`
      SELECT 
        session_id,
        nombre_archivo,
        tipo_archivo,
        usuario_id,
        COUNT(*) as total_titulos,
        MAX(created_at) as fecha_extraccion
      FROM titulos_extraidos
      ${usuarioId ? 'WHERE usuario_id = :usuarioId' : ''}
      GROUP BY session_id, nombre_archivo, tipo_archivo, usuario_id
      ORDER BY MAX(created_at) DESC
      LIMIT 50
    `, {
      replacements: { usuarioId },
      type: QueryTypes.SELECT
    });

    return res.status(200).json({
      success: true,
      data: sesiones
    });

  } catch (error) {
    console.error('❌ Error al obtener sesiones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener sesiones',
      error: error.message
    });
  }
};

/**
 * � OBTENER SESIÓN DE EXTRACCIÓN ESPECÍFICA
 * Obtiene los detalles completos de una sesión de extracción por sessionId
 */
exports.obtenerSesionPorId = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const TituloExtraido = db.TituloExtraido;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un sessionId'
      });
    }

    // Obtener todos los títulos de esta sesión
    const titulos = await TituloExtraido.findAll({
      where: { session_id: sessionId },
      order: [['fila', 'ASC'], ['columna', 'ASC']]
    });

    if (titulos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró la sesión especificada'
      });
    }

    // Agrupar por tipo
    const agrupadosPorTipo = {
      cabecera: titulos.filter(t => t.tipo === 'cabecera'),
      titulo_seccion: titulos.filter(t => t.tipo === 'titulo_seccion'),
      campo: titulos.filter(t => t.tipo === 'campo')
    };

    // Construir respuesta con formato similar a obtenerSesionesExtraccion
    const sesion = {
      session_id: sessionId,
      nombre_archivo: titulos[0].nombre_archivo,
      tipo_archivo: titulos[0].tipo_archivo,
      usuario_id: titulos[0].usuario_id,
      total_titulos: titulos.length,
      fecha_extraccion: titulos[0].created_at,
      created_at: titulos[0].created_at,
      titulos: titulos,
      agrupadosPorTipo: agrupadosPorTipo
    };

    return res.status(200).json({
      success: true,
      data: sesion
    });

  } catch (error) {
    console.error('❌ Error al obtener sesión:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la sesión',
      error: error.message
    });
  }
};

/**
 * �💾 GUARDAR FORMULARIO DINÁMICO COMPLETADO
 * Guarda los datos ingresados por el docente en un formulario generado desde títulos extraídos
 */
exports.guardarFormularioDinamico = async (req, res) => {
  try {
    const { sessionId, contenido, nombreFormulario } = req.body;
    const usuarioId = req.user?.id;

    if (!sessionId || !contenido) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos (sessionId, contenido)'
      });
    }

    // Crear un nuevo programa analítico con los datos del formulario
    const nuevoPrograma = await ProgramaAnalitico.create({
      nombre: nombreFormulario || `Formulario Dinámico - ${sessionId}`,
      datos_tabla: {
        session_id: sessionId,
        tipo: 'formulario_dinamico',
        fecha_creacion: new Date().toISOString(),
        contenido: contenido
      },
      usuario_id: usuarioId
    });

    console.log(`✅ Formulario dinámico guardado: ID ${nuevoPrograma.id}`);

    return res.status(201).json({
      success: true,
      message: 'Formulario guardado exitosamente',
      data: {
        id: nuevoPrograma.id,
        nombre: nuevoPrograma.nombre,
        sessionId: sessionId
      }
    });

  } catch (error) {
    console.error('❌ Error al guardar formulario dinámico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar el formulario',
      error: error.message
    });
  }
};

/**
 * 📋 OBTENER FORMULARIOS DINÁMICOS DEL DOCENTE
 * Lista todos los formularios dinámicos guardados por el docente
 */
exports.obtenerFormulariosDinamicosDocente = async (req, res) => {
  try {
    const usuarioId = req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Obtener programas analíticos que son formularios dinámicos
    const formularios = await ProgramaAnalitico.findAll({
      where: {
        usuario_id: usuarioId,
        datos_tabla: {
          tipo: 'formulario_dinamico'
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    return res.status(200).json({
      success: true,
      data: formularios.map(f => ({
        id: f.id,
        nombre: f.nombre,
        sessionId: f.datos_tabla?.session_id,
        fechaCreacion: f.createdAt,
        contenido: f.datos_tabla?.contenido
      }))
    });

  } catch (error) {
    console.error('❌ Error al obtener formularios dinámicos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener formularios',
      error: error.message
    });
  }
};

/**
 * 🗂️ OBTENER AGRUPACIONES DE TÍTULOS POR SESIÓN
 * Devuelve la organización en pestañas creada por el admin
 */
exports.obtenerAgrupaciones = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const AgrupacionTitulo = db.AgrupacionTitulo;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un sessionId'
      });
    }

    const agrupaciones = await AgrupacionTitulo.findAll({
      where: { session_id: sessionId },
      order: [['orden', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: agrupaciones
    });

  } catch (error) {
    console.error('❌ Error al obtener agrupaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener agrupaciones',
      error: error.message
    });
  }
};

/**
 * 💾 GUARDAR AGRUPACIONES DE TÍTULOS
 * Permite al admin organizar títulos en pestañas
 */
exports.guardarAgrupaciones = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { agrupaciones } = req.body;
    const AgrupacionTitulo = db.AgrupacionTitulo;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un sessionId'
      });
    }

    if (!agrupaciones || !Array.isArray(agrupaciones)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de agrupaciones'
      });
    }

    // Eliminar agrupaciones anteriores de esta sesión
    await AgrupacionTitulo.destroy({
      where: { session_id: sessionId }
    });

    // Crear nuevas agrupaciones
    const nuevasAgrupaciones = await AgrupacionTitulo.bulkCreate(
      agrupaciones.map((ag, index) => ({
        session_id: sessionId,
        nombre_pestana: ag.nombre_pestana || `Pestaña ${index + 1}`,
        descripcion: ag.descripcion || null,
        orden: ag.orden !== undefined ? ag.orden : index,
        titulo_ids: ag.titulo_ids || [],
        color: ag.color || 'blue',
        icono: ag.icono || '📋'
      }))
    );

    return res.status(200).json({
      success: true,
      data: nuevasAgrupaciones,
      message: `✅ ${nuevasAgrupaciones.length} agrupaciones guardadas correctamente`
    });

  } catch (error) {
    console.error('❌ Error al guardar agrupaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar agrupaciones',
      error: error.message
    });
  }
};

/**
 * 🗑️ ELIMINAR AGRUPACIONES DE UNA SESIÓN
 * Elimina toda la organización en pestañas
 */
exports.eliminarAgrupaciones = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const AgrupacionTitulo = db.AgrupacionTitulo;

    const eliminadas = await AgrupacionTitulo.destroy({
      where: { session_id: sessionId }
    });

    return res.status(200).json({
      success: true,
      message: `✅ ${eliminadas} agrupaciones eliminadas`
    });

  } catch (error) {
    console.error('❌ Error al eliminar agrupaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar agrupaciones',
      error: error.message
    });
  }
};

// --- CREAR UN NUEVO PROGRAMA ANALÍTICO (compatible con editor) ---
exports.create = async (req, res) => {
  try {
    const { nombre, periodo, materias, asignatura_id, datos_tabla } = req.body;
    // Solo guardar usuario_id si el usuario viene de la tabla 'usuarios' (admin/comision).
    // Los profesores están en 'profesores', no en 'usuarios', por lo que causaría FK error.
    const usuario_id = (req.user.tabla === 'usuarios') ? req.user.id : null;

    if (!nombre || !periodo || !datos_tabla) {
      return res.status(400).json({
        success: false,
        message: 'Los campos nombre, periodo y datos_tabla son obligatorios'
      });
    }

    // 🔒 VALIDACIÓN: Verificar si ya existe un programa para esta materia y periodo
    // SOLO validar duplicados si hay asignatura_id (creado desde gestión de asignaturas)
    if (asignatura_id) {
      const whereValidacion = {
        periodo: periodo,
        asignatura_id: asignatura_id
      };

      const programaExistente = await ProgramaAnalitico.findOne({
        where: whereValidacion
      });

      if (programaExistente) {
        const nombreMateria = programaExistente.materias || nombre;
        
        return res.status(409).json({
          success: false,
          message: `Ya existe un programa analítico para la materia "${nombreMateria}" en el periodo "${periodo}". Solo puede subir un programa por materia por periodo. Puede eliminarlo para subir uno nuevo.`,
          existente: {
            id: programaExistente.id,
            nombre: programaExistente.nombre,
            materia: nombreMateria,
            asignatura_id: programaExistente.asignatura_id,
            fecha_creacion: programaExistente.created_at
          }
        });
      }
    }
    
    const nuevoPrograma = await ProgramaAnalitico.create({
      nombre,
      periodo,
      materias: materias || nombre,
      asignatura_id: asignatura_id || null,
      datos_tabla,
      usuario_id
    });
    
    return res.status(201).json({
      success: true,
      message: 'Programa analítico creado exitosamente',
      data: nuevoPrograma
    });
  } catch (error) {
    console.error('Error al crear programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear el programa analítico',
      error: error.message
    });
  }
};
// controlador/programaController.js

// --- CONTROLADOR PARA SINCRONIZACIÓN INTELIGENTE (Smart Sync) ---
// --- CONTROLADOR PARA SINCRONIZACIÓN INTELIGENTE (Smart Sync) ---
// ... al final de programaController.js

// --- CONTROLADOR PARA SINCRONIZACIÓN INTELIGENTE (Smart Sync) ---
exports.extractForSync = async (req, res) => {
  try {
    console.log('🔄 Iniciando Smart Sync Mejorado...');

    let buffer;
    if (req.file) {
        buffer = req.file.buffer;
    } else if (req.files && req.files.archivo && req.files.archivo[0]) {
        buffer = req.files.archivo[0].buffer;
    } else {
         return res.status(400).json({ 
             success: false, 
             message: 'No se subió ningún archivo. Asegúrate de enviar el campo "archivo".' 
         });
    }

    // 1. Extraer todas las filas crudas del XML
    const { filas } = await extraerTablasDeWordXML(buffer);
    
    // 2. Usar tu detector inteligente para agrupar por secciones reales
    // Esto agrupa las filas en bloques lógicos (Ej: Todas las filas de Bibliografía juntas)
    const seccionesDetectadas = detectarSeccionesDeFilasWord(filas);
    
    const mapaDatos = {};

    // 3. Convertir las secciones detectadas en un mapa fácil de consumir por el Frontend
    seccionesDetectadas.forEach(seccion => {
      const clave = seccion.titulo.toUpperCase().trim();

      if (seccion.tipo === 'tabla') {
        // Para tablas (Contenidos, Bibliografía), guardamos el ARRAY de filas
        // Solo filtramos filas completamente vacías
        mapaDatos[clave] = seccion.datos.filter(fila => {
           const textoFila = fila.join('').trim();
           return textoFila.length > 3;
        });
      } else {
        // Para texto largo (Objetivos, Resultados), unimos todo en un solo String
        const textoAcumulado = seccion.datos
          .map(fila => fila.filter(c => c && c.trim().length > 0).join(' '))
          .join('\n')
          .trim();
        
        mapaDatos[clave] = textoAcumulado;
      }
    });

    // 4. Capturar también datos simples (Metadatos: Asignatura, Periodo)
    // Revisamos las primeras 15 filas buscando patrones "CLAVE: VALOR"
    filas.slice(0, 15).forEach(fila => {
       const celdas = fila.filter(c => c && c.trim().length > 0);
       
       // Caso A: Dos celdas [ "ASIGNATURA", "Matemáticas" ]
       if (celdas.length >= 2) {
         const key = celdas[0].toUpperCase().replace(':', '').trim();
         // Solo agregamos si no existe ya como sección grande y la clave es corta
         if (!mapaDatos[key] && key.length < 40) {
            mapaDatos[key] = celdas.slice(1).join(' ').trim();
         }
       }
       // Caso B: Una celda [ "ASIGNATURA: Matemáticas" ]
       else if (celdas.length === 1) {
          const texto = celdas[0];
          const separador = texto.indexOf(':');
          if (separador > 2 && separador < 40) {
             const key = texto.substring(0, separador).toUpperCase().trim();
             const val = texto.substring(separador + 1).trim();
             if (!mapaDatos[key]) {
                mapaDatos[key] = val;
             }
          }
       }
    });

    console.log(`✅ Smart Sync: ${Object.keys(mapaDatos).length} secciones procesadas.`);
    
    // LOG DETALLADO para depuración
    Object.keys(mapaDatos).forEach(clave => {
      const valor = mapaDatos[clave];
      if (Array.isArray(valor)) {
        console.log(`  📋 ${clave}: ${valor.length} filas`);
        valor.forEach((fila, i) => console.log(`     [${i}] ${JSON.stringify(fila)}`));
      } else {
        console.log(`  📝 ${clave}: "${String(valor).substring(0, 80)}..."`);
      }
    });

    return res.json({ 
        success: true, 
        data: mapaDatos 
    });

  } catch (error) {
    console.error('❌ Error en extractForSync:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// --- SUBIR PROGRAMA ANALÍTICO CON VALIDACIÓN (Word/Excel) ---
exports.uploadValidado = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó archivo' });
    }
    const archivo = req.file;
    const { nombre, periodo, materias } = req.body;
    const asignatura_id = req.body.asignatura_id ? parseInt(req.body.asignatura_id, 10) : null;
    // Solo guardar usuario_id si el usuario viene de la tabla 'usuarios' (admin/comision).
    const usuario_id = (req.user.tabla === 'usuarios') ? req.user.id : null;

    // Parsear el archivo Word para extraer contenido
    let datosTabla = {
      version: '2.0',
      nombre_archivo: archivo.originalname,
      metadata: {
        subject: nombre || archivo.originalname.replace(/\.docx?$/i, ''),
        period: periodo || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      tabs: []
    };

    try {
      const filas = await procesarWord(archivo.buffer);
      if (Array.isArray(filas) && filas.length > 0) {
        datosTabla.tabs = [{
          id: `tab-${Date.now()}`,
          title: 'Programa Analítico',
          rows: filas.map((fila, ri) => ({
            id: `row-${ri}`,
            cells: (Array.isArray(fila) ? fila : [String(fila || '')]).map((celda, ci) => ({
              id: `cell-${ri}-${ci}`,
              content: typeof celda === 'string' ? celda : String(celda || ''),
              isHeader: ri === 0,
              rowSpan: 1,
              colSpan: 1,
              isEditable: true
            }))
          }))
        }];
      }
    } catch (parseErr) {
      console.error('⚠️ Error parsing Word file (saving anyway):', parseErr.message);
    }

    // Verificar duplicado si hay asignatura_id
    if (asignatura_id && periodo) {
      const existente = await ProgramaAnalitico.findOne({
        where: { asignatura_id, periodo }
      });
      if (existente) {
        return res.status(409).json({
          success: false,
          message: `Ya existe un programa analítico para esta asignatura en el periodo "${periodo}". Puede eliminarlo para subir uno nuevo.`,
          existente: { id: existente.id }
        });
      }
    }

    const nuevoPrograma = await ProgramaAnalitico.create({
      nombre: nombre || archivo.originalname.replace(/\.docx?$/i, ''),
      periodo: periodo || null,
      materias: materias || nombre || archivo.originalname,
      asignatura_id: (!isNaN(asignatura_id) && asignatura_id) ? asignatura_id : null,
      datos_tabla: datosTabla,
      usuario_id
    });

    return res.status(201).json({
      success: true,
      message: 'Programa analítico subido exitosamente',
      data: {
        id: nuevoPrograma.id,
        nombre: nuevoPrograma.nombre,
        periodo: nuevoPrograma.periodo,
        asignatura_id: nuevoPrograma.asignatura_id,
        validacion: { porcentaje_coincidencia: 100, total_requeridos: 0, encontrados: 0 }
      }
    });
  } catch (error) {
    console.error('Error en uploadValidado:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- ACTUALIZAR UN PROGRAMA ANALÍTICO ---
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRol = req.user.rol;
    
    const programa = await ProgramaAnalitico.findByPk(id);
    
    if (!programa) {
      return res.status(404).json({ 
        success: false, 
        message: `Programa analítico con ID ${id} no encontrado` 
      });
    }

    // ¡VERIFICACIÓN DE PERMISOS! El creador, admin o comisión académica puede editar.
    const rolesPermitidos = ['administrador', 'comision_academica', 'comision'];
    if (Number(programa.usuario_id) !== Number(userId) && !rolesPermitidos.includes(userRol)) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permiso para editar este programa analítico.' 
        });
    }
    
    await programa.update(req.body);
    
    return res.status(200).json({
      success: true,
      message: 'Programa analítico actualizado exitosamente',
      data: programa
    });
  } catch (error) {
    console.error('Error al actualizar programa analítico:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al actualizar el programa analítico',
      error: error.message
    });
  }
};

module.exports = exports;




