const xlsx = require('xlsx');
const path = require('path');

// Crear un nuevo libro de trabajo
const workbook = xlsx.utils.book_new();

// Datos para la hoja "DATOS GENERALES"
const datosGenerales = [
  ['Carrera'],
  ['Asignatura'],
  ['Código de la Asignatura'],
  ['Nivel'],
  ['Período Académico'],
  ['Modalidad'],
  ['Componente'],
  ['Número de Créditos'],
  ['Horas Presenciales'],
  ['Horas Autónomas'],
  ['Total de Horas'],
];

// Datos para la hoja "ESTRUCTURA"
const estructura = [
  ['Unidades Temáticas'],
  ['Unidad 1'],
  ['Contenidos'],
  ['Estrategias Metodológicas'],
  ['Recursos Didácticos'],
  ['Unidad 2'],
  ['Contenidos'],
  ['Estrategias Metodológicas'],
  ['Recursos Didácticos'],
];

// Datos para la hoja "RESULTADOS Y EVALUACIÓN"
const resultados = [
  ['Resultados de Aprendizaje'],
  ['Resultado 1'],
  ['Resultado 2'],
  ['Resultado 3'],
  ['Criterios de Evaluación'],
  ['Técnicas de Evaluación'],
  ['Instrumentos de Evaluación'],
  ['Ponderación'],
];

// Datos para la hoja "VISADO"
const visado = [
  ['Docente Responsable'],
  ['Nombre del Docente'],
  ['Cédula'],
  ['Correo Electrónico'],
  ['Fecha de Elaboración'],
  ['Director de Carrera'],
  ['Nombre'],
  ['Fecha de Revisión'],
  ['Decano'],
  ['Nombre'],
  ['Fecha de Aprobación'],
];

// Crear hojas
const ws1 = xlsx.utils.aoa_to_sheet(datosGenerales);
const ws2 = xlsx.utils.aoa_to_sheet(estructura);
const ws3 = xlsx.utils.aoa_to_sheet(resultados);
const ws4 = xlsx.utils.aoa_to_sheet(visado);

// Agregar hojas al libro
xlsx.utils.book_append_sheet(workbook, ws1, 'DATOS GENERALES');
xlsx.utils.book_append_sheet(workbook, ws2, 'ESTRUCTURA');
xlsx.utils.book_append_sheet(workbook, ws3, 'RESULTADOS Y EVALUACIÓN');
xlsx.utils.book_append_sheet(workbook, ws4, 'VISADO');

// Guardar el archivo
const filePath = path.join(__dirname, '..', 'uploads', 'syllabus-prueba.xlsx');
xlsx.writeFile(workbook, filePath);

console.log('✅ Archivo Excel de prueba creado exitosamente en:', filePath);
console.log('📊 Hojas creadas:');
console.log('  - DATOS GENERALES (' + datosGenerales.length + ' campos)');
console.log('  - ESTRUCTURA (' + estructura.length + ' campos)');
console.log('  - RESULTADOS Y EVALUACIÓN (' + resultados.length + ' campos)');
console.log('  - VISADO (' + visado.length + ' campos)');
console.log('📝 Total de campos: ' + (datosGenerales.length + estructura.length + resultados.length + visado.length));
