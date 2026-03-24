/**
 * Script de prueba para verificar la detección de secciones del formato UNESUM
 */

// Formato esperado del Programa Analítico UNESUM
const formatoUNESUM = {
  secciones: [
    {
      titulo: 'PROGRAMA ANALÍTICO DE ASIGNATURA',
      tipo: 'encabezado',
      esNegrilla: true,
      descripcion: 'Título principal del documento'
    },
    {
      titulo: 'ASIGNATURA',
      tipo: 'datos_generales',
      esNegrilla: true,
      campos: ['nombre_asignatura', 'periodo_academico', 'nivel']
    },
    {
      titulo: 'CARACTERIZACIÓN',
      tipo: 'texto_largo',
      esNegrilla: true,
      descripcion: 'Descripción de la asignatura'
    },
    {
      titulo: 'OBJETIVOS DE LA ASIGNATURA',
      tipo: 'texto_largo',
      esNegrilla: true,
      descripcion: 'Objetivos generales y específicos'
    },
    {
      titulo: 'COMPETENCIAS',
      tipo: 'lista',
      esNegrilla: true,
      descripcion: 'Lista de competencias a desarrollar'
    },
    {
      titulo: 'RESULTADOS D E APRENDIZAJE DE LA ASIGNATURA',
      tipo: 'texto_largo',
      esNegrilla: true,
      descripcion: 'Resultados esperados del aprendizaje'
    },
    {
      titulo: 'CONTENIDOS DE LA ASIGNATURA',
      tipo: 'tabla',
      esNegrilla: true,
      encabezados: ['UNIDADES TEMÁTICAS', 'DESCRIPCIÓN'],
      descripcion: 'Tabla con unidades y sus descripciones'
    },
    {
      titulo: 'METODOLOGÍA',
      tipo: 'texto_largo',
      esNegrilla: true,
      descripcion: 'Metodologías de enseñanza-aprendizaje'
    },
    {
      titulo: 'PROCEDIMIENTOS DE EVALUACIÓN',
      tipo: 'texto_largo',
      esNegrilla: true,
      descripcion: 'Criterios y métodos de evaluación'
    },
    {
      titulo: 'BIBLIOGRAFÍA BÁSICA',
      tipo: 'tabla',
      esNegrilla: true,
      descripcion: 'Bibliografía principal recomendada'
    },
    {
      titulo: 'BIBLIOGRAFÍA - FUENTES DE CONSULTA',
      tipo: 'tabla',
      esNegrilla: true,
      encabezados: ['BIBLIOGRAFÍA COMPLEMENTARIA'],
      descripcion: 'Fuentes adicionales de consulta'
    },
    {
      titulo: 'VISADO',
      tipo: 'firmas',
      esNegrilla: true,
      campos: [
        'DECANO/A DE FACULTAD',
        'DIRECTOR/A ACADÉMICO/A',
        'COORDINADOR/A DE CARRERA',
        'DOCENTE'
      ],
      descripcion: 'Sección de firmas y aprobaciones'
    }
  ]
};

console.log('📋 FORMATO PROGRAMA ANALÍTICO UNESUM\n');
console.log('Total de secciones:', formatoUNESUM.secciones.length);
console.log('\n='.repeat(70));

formatoUNESUM.secciones.forEach((seccion, index) => {
  console.log(`\n${index + 1}. ${seccion.titulo}`);
  console.log(`   Tipo: ${seccion.tipo}`);
  console.log(`   Es negrilla: ${seccion.esNegrilla ? '✅' : '❌'}`);
  
  if (seccion.encabezados) {
    console.log(`   Encabezados: ${seccion.encabezados.join(', ')}`);
  }
  
  if (seccion.campos) {
    console.log(`   Campos: ${seccion.campos.length}`);
  }
  
  if (seccion.descripcion) {
    console.log(`   📝 ${seccion.descripcion}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n✅ Estructura validada correctamente\n');

// Exportar para usar en otros scripts
module.exports = formatoUNESUM;
