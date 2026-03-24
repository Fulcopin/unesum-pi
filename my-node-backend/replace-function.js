const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'programaAnaliticoController.js');
const newFunctionPath = path.join(__dirname, 'nueva-funcion-word.js');

// Leer archivos
let controller = fs.readFileSync(controllerPath, 'utf8');
const newFunction = fs.readFileSync(newFunctionPath, 'utf8');

// Encontrar inicio y fin de la función a reemplazar
const startMarker = '/**\n * Función para procesar archivos Word';
const endMarker = '// Subir y procesar archivo Excel';

const startIndex = controller.indexOf(startMarker);
const endIndex = controller.indexOf(endMarker);

if (startIndex === -1) {
  console.log('No se encontró el inicio de la función');
  console.log('Buscando alternativa...');
  
  // Buscar por línea
  const lines = controller.split('\n');
  let startLine = -1;
  let endLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Función para procesar archivos Word')) {
      startLine = i - 1; // Incluir el comentario
    }
    if (lines[i].includes('Subir y procesar archivo Excel')) {
      endLine = i;
      break;
    }
  }
  
  console.log(`Start line: ${startLine}, End line: ${endLine}`);
  
  if (startLine > 0 && endLine > startLine) {
    const before = lines.slice(0, startLine).join('\n');
    const after = lines.slice(endLine).join('\n');
    controller = before + '\n\n' + newFunction + '\n\n' + after;
    fs.writeFileSync(controllerPath, controller);
    console.log('Archivo actualizado exitosamente');
  }
} else {
  const before = controller.substring(0, startIndex);
  const after = controller.substring(endIndex);
  controller = before + newFunction + '\n\n' + after;
  fs.writeFileSync(controllerPath, controller);
  console.log('Archivo actualizado exitosamente');
}
