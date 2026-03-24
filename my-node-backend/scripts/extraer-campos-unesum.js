/**
 * Script SIMPLE para extraer SOLO LOS TÍTULOS del Excel UNESUM
 * NO devuelve JSON, solo strings con los títulos encontrados
 */

const xlsx = require('xlsx');
const path = require('path');

// Archivo de ejemplo (ajusta la ruta según tu Excel)
const archivoExcel = process.argv[2] || path.join(__dirname, '../uploads/programa-ejemplo.xlsx');

console.log('📂 Leyendo archivo:', archivoExcel);
console.log('');

try {
  const workbook = xlsx.readFile(archivoExcel);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertir a array de arrays
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  console.log('� TÍTULOS ENCONTRADOS EN EL EXCEL (solo strings):\n');
  console.log('═'.repeat(80));
  console.log('');
  
  const titulosEncontrados = [];
  let contador = 0;
  
  for (let idx = 0; idx < data.length; idx++) {
    const fila = data[idx];
    const primeraCol = fila[0] ? String(fila[0]).trim() : '';
    const segundaCol = fila[1] ? String(fila[1]).trim() : '';
    const terceraCol = fila[2] ? String(fila[2]).trim() : '';
    
    // Detectar títulos en MAYÚSCULAS (más de 2 caracteres)
    if (primeraCol.length > 2) {
      const esMayusculas = primeraCol === primeraCol.toUpperCase();
      const tieneLetras = /[A-ZÁÉÍÓÚÑ]/.test(primeraCol);
      const noEsSoloNumeros = !/^\d+$/.test(primeraCol);
      const noEsFecha = !primeraCol.includes('FECHA');
      
      if (esMayusculas && tieneLetras && noEsSoloNumeros) {
        contador++;
        titulosEncontrados.push(primeraCol);
        console.log(`${contador}. ${primeraCol}`);
      }
    }
    
    // También detectar si hay títulos en segunda o tercera columna
    if (segundaCol.length > 2) {
      const esMayusculas = segundaCol === segundaCol.toUpperCase();
      const tieneLetras = /[A-ZÁÉÍÓÚÑ]/.test(segundaCol);
      const noEsSoloNumeros = !/^\d+$/.test(segundaCol);
      const noEsFecha = !segundaCol.includes('FECHA');
      const noEstaRepetido = !titulosEncontrados.includes(segundaCol);
      
      if (esMayusculas && tieneLetras && noEsSoloNumeros && noEsFecha && noEstaRepetido) {
        contador++;
        titulosEncontrados.push(segundaCol);
        console.log(`${contador}. ${segundaCol}`);
      }
    }
    
    if (terceraCol.length > 2) {
      const esMayusculas = terceraCol === terceraCol.toUpperCase();
      const tieneLetras = /[A-ZÁÉÍÓÚÑ]/.test(terceraCol);
      const noEsSoloNumeros = !/^\d+$/.test(terceraCol);
      const noEsFecha = !terceraCol.includes('FECHA');
      const noEstaRepetido = !titulosEncontrados.includes(terceraCol);
      
      if (esMayusculas && tieneLetras && noEsSoloNumeros && noEsFecha && noEstaRepetido) {
        contador++;
        titulosEncontrados.push(terceraCol);
        console.log(`${contador}. ${terceraCol}`);
      }
    }
  }
  
  console.log('');
  console.log('═'.repeat(80));
  console.log(`\n✅ Total de títulos extraídos: ${contador}`);
  console.log('');
  console.log('📋 LISTA DE TÍTULOS (copiar y pegar):');
  console.log('');
  titulosEncontrados.forEach(titulo => console.log(titulo));
  
} catch (error) {
  console.error('❌ Error al leer el archivo:', error.message);
  console.log('\n💡 Uso: node extraer-campos-unesum.js [ruta-al-excel.xlsx]');
  console.log('Ejemplo: node extraer-campos-unesum.js ../uploads/mi-programa.xlsx');
}
