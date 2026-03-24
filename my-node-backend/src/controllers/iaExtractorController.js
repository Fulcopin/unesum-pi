/**
 * Controller para extraer datos de Excel/Word usando Google Generative AI (Gemini)
 * Este es un módulo INDEPENDIENTE que no afecta la funcionalidad existente
 */

// Cargar variables de entorno
require('dotenv').config();

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const xlsx = require('xlsx');
const mammoth = require('mammoth');

// Configurar el modelo de Google Generative AI
const getGoogleAI = () => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  console.log('🔑 API Key encontrada:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NO CONFIGURADA');
  
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY no está configurada en las variables de entorno');
  }
  
  // Usar gemini-1.5-flash que tiene mejores límites en el tier gratuito
  // Alternativas: gemini-1.0-pro, gemini-pro
  return new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-pro',
    apiKey: apiKey,
    maxOutputTokens: 4096,
    temperature: 0.1,
  });
};

/**
 * Extraer texto de un archivo Excel
 */
const extraerTextoExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  let textoCompleto = '';
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    textoCompleto += `\n=== Hoja: ${sheetName} ===\n`;
    
    jsonData.forEach((fila, idx) => {
      const filaTexto = fila
        .map(celda => (celda ? celda.toString().trim() : ''))
        .filter(c => c !== '')
        .join(' | ');
      
      if (filaTexto) {
        textoCompleto += `Fila ${idx + 1}: ${filaTexto}\n`;
      }
    });
  });
  
  return textoCompleto;
};

/**
 * Extraer texto de un archivo Word
 */
const extraerTextoWord = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error extrayendo texto de Word:', error);
    throw error;
  }
};

/**
 * Endpoint principal: Extraer datos con IA
 * POST /api/programa-analitico/extraer-con-ia
 */
exports.extraerConIA = async (req, res) => {
  try {
    console.log('🤖 Iniciando extracción con IA...');
    
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const archivo = req.file;
    const extension = archivo.originalname.split('.').pop().toLowerCase();
    
    console.log(`📄 Archivo recibido: ${archivo.originalname} (${extension})`);
    
    // Verificar extensión válida
    if (!['xlsx', 'xls', 'docx', 'doc'].includes(extension)) {
      return res.status(400).json({
        success: false,
        message: 'Formato no soportado. Use archivos Excel (.xlsx, .xls) o Word (.docx, .doc)'
      });
    }

    // Extraer texto según el tipo de archivo
    let textoExtraido = '';
    
    if (['xlsx', 'xls'].includes(extension)) {
      console.log('📊 Extrayendo texto de Excel...');
      textoExtraido = extraerTextoExcel(archivo.buffer);
    } else {
      console.log('📝 Extrayendo texto de Word...');
      textoExtraido = await extraerTextoWord(archivo.buffer);
    }

    if (!textoExtraido || textoExtraido.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo extraer texto del archivo'
      });
    }

    console.log(`📋 Texto extraído: ${textoExtraido.length} caracteres`);

    // Construir el prompt para la IA
    const prompt = `Analiza el siguiente documento de Programa Analítico universitario y extrae TODA la información estructurada.

DOCUMENTO:
${textoExtraido}

INSTRUCCIONES:
1. Identifica TODAS las secciones del documento (ej: CARACTERIZACIÓN, OBJETIVOS, COMPETENCIAS, CONTENIDOS, METODOLOGÍA, EVALUACIÓN, BIBLIOGRAFÍA, etc.)
2. Para cada sección, extrae el contenido completo
3. Si hay tablas, extrae los datos en formato estructurado
4. Mantén el contenido EXACTO del documento, no inventes información

FORMATO DE RESPUESTA (JSON):
{
  "secciones": [
    {
      "nombre": "NOMBRE DE LA SECCIÓN",
      "tipo": "texto" | "tabla",
      "contenido": "texto del contenido..." (para tipo texto),
      "encabezados": ["col1", "col2", ...] (para tipo tabla),
      "filas": [["valor1", "valor2"], ...] (para tipo tabla)
    }
  ],
  "metadatos": {
    "asignatura": "nombre si se encontró",
    "periodo": "periodo si se encontró",
    "docente": "nombre si se encontró",
    "carrera": "carrera si se encontró"
  }
}

Responde SOLO con el JSON, sin texto adicional.`;

    // Llamar a la IA
    console.log('🤖 Enviando a Google AI...');
    
    const model = getGoogleAI();
    const response = await model.invoke(prompt);
    
    console.log('✅ Respuesta recibida de Google AI');

    // Procesar la respuesta
    let contenidoIA = response.content;
    
    // Limpiar la respuesta (quitar bloques de código markdown si existen)
    if (typeof contenidoIA === 'string') {
      contenidoIA = contenidoIA
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
    }

    // Intentar parsear como JSON
    let datosExtraidos;
    try {
      datosExtraidos = JSON.parse(contenidoIA);
    } catch (parseError) {
      console.log('⚠️ No se pudo parsear como JSON, devolviendo como texto');
      datosExtraidos = {
        textoPlano: contenidoIA,
        parseError: true
      };
    }

    // Devolver resultado
    return res.status(200).json({
      success: true,
      message: 'Datos extraídos exitosamente con IA',
      datos: datosExtraidos,
      textoOriginal: textoExtraido.substring(0, 2000) + (textoExtraido.length > 2000 ? '...' : ''),
      archivo: {
        nombre: archivo.originalname,
        tipo: extension,
        tamaño: archivo.size
      }
    });

  } catch (error) {
    console.error('❌ Error en extracción con IA:', error);
    
    // Manejo de errores específicos
    if (error.message.includes('GOOGLE_AI_API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'API Key de Google AI no configurada. Configure GOOGLE_AI_API_KEY en el archivo .env',
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo con IA',
      error: error.message
    });
  }
};

/**
 * Endpoint para verificar el estado de la configuración de IA
 * GET /api/programa-analitico/ia-status
 */
exports.verificarConfiguracionIA = async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({
        success: true,
        configurado: false,
        message: 'GOOGLE_AI_API_KEY no está configurada'
      });
    }

    // Probar conexión con un mensaje simple
    const model = getGoogleAI();
    await model.invoke('Responde solo "OK"');

    return res.status(200).json({
      success: true,
      configurado: true,
      message: 'Google AI está configurado correctamente'
    });

  } catch (error) {
    return res.status(200).json({
      success: true,
      configurado: false,
      message: 'Error al conectar con Google AI: ' + error.message
    });
  }
};
