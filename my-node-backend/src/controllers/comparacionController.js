const { TituloExtraidoSyllabus, TituloExtraidoProgramaAnalitico } = require('../models');

// Función para calcular similitud entre dos strings usando Levenshtein
function calcularSimilitud(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return 0;
  if (len2 === 0) return 0;
  
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

const compararTitulos = async (req, res) => {
  try {
    const { syllabus_session_id, programa_analitico_session_id } = req.body;

    if (!syllabus_session_id || !programa_analitico_session_id) {
      return res.status(400).json({
        error: 'Se requieren ambos IDs de sesión'
      });
    }

    // Obtener títulos del Syllabus
    const titulosSyllabus = await TituloExtraidoSyllabus.findAll({
      where: { session_id: syllabus_session_id },
      attributes: ['id', 'titulo', 'fila', 'columna']
    });

    // Obtener títulos del Programa Analítico
    const titulosProgramaAnalitico = await TituloExtraidoProgramaAnalitico.findAll({
      where: { sesion_id: Number.parseInt(programa_analitico_session_id, 10) },
      attributes: ['id', 'titulo', 'fila', 'columna']
    });

    if (titulosSyllabus.length === 0 && titulosProgramaAnalitico.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron títulos para las sesiones especificadas'
      });
    }

    // Normalizar títulos
    const syllabusNormalizados = titulosSyllabus.map(t => t.titulo.toLowerCase().trim());
    const programaNormalizados = titulosProgramaAnalitico.map(t => t.titulo.toLowerCase().trim());

    // Conjuntos para rastrear títulos procesados
    const syllabusSet = new Set(syllabusNormalizados);
    const programaSet = new Set(programaNormalizados);

    // Arrays para resultados
    const enAmbos = [];
    const soloEnSyllabus = [];
    const soloEnProgramaAnalitico = [];
    const similares = [];

    // Encontrar títulos en ambos (coincidencias exactas)
    titulosSyllabus.forEach(titulo => {
      const tituloNormalizado = titulo.titulo.toLowerCase().trim();
      if (programaSet.has(tituloNormalizado)) {
        enAmbos.push(titulo.titulo);
      } else {
        soloEnSyllabus.push(titulo.titulo);
      }
    });

    // Encontrar títulos solo en Programa Analítico
    titulosProgramaAnalitico.forEach(titulo => {
      const tituloNormalizado = titulo.titulo.toLowerCase().trim();
      if (!syllabusSet.has(tituloNormalizado)) {
        soloEnProgramaAnalitico.push(titulo.titulo);
      }
    });

    // Calcular similitudes para títulos no coincidentes
    soloEnSyllabus.forEach(tituloSyllabus => {
      soloEnProgramaAnalitico.forEach(tituloPrograma => {
        const similitud = calcularSimilitud(tituloSyllabus, tituloPrograma);
        
        // Si la similitud es >= 60% pero no es coincidencia exacta
        if (similitud >= 0.6 && similitud < 1) {
          similares.push({
            syllabus: tituloSyllabus,
            programaAnalitico: tituloPrograma,
            similitud: Math.round(similitud * 100)
          });
        }
      });
    });

    // Ordenar similares por similitud descendente
    similares.sort((a, b) => b.similitud - a.similitud);

    // Preparar respuesta
    const resultado = {
      enAmbos,
      soloEnSyllabus,
      soloEnProgramaAnalitico,
      similares,
      estadisticas: {
        totalSyllabus: titulosSyllabus.length,
        totalProgramaAnalitico: titulosProgramaAnalitico.length,
        enAmbos: enAmbos.length,
        soloEnSyllabus: soloEnSyllabus.length,
        soloEnProgramaAnalitico: soloEnProgramaAnalitico.length,
        similares: similares.length
      }
    };

    res.json(resultado);

  } catch (error) {
    console.error('Error al comparar títulos:', error);
    res.status(500).json({
      error: 'Error al comparar títulos',
      detalle: error.message
    });
  }
};

module.exports = {
  compararTitulos
};
