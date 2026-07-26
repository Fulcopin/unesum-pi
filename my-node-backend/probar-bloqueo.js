/**
 * Prueba del bloqueo — NO toca la base de datos.
 *
 * Reproduce el escenario exacto que se reporta: una pestaña de datos generales
 * con filas "etiqueta : valor", una plantilla de administración DESFASADA (una
 * fila de más, que es lo que pasa al resubir un Word), y se aplica el bloqueo.
 *
 * Comprueba que el texto de las celdas NO cambie al bloquear.
 *
 *   node probar-bloqueo.js
 */

// El controlador hace `require('../models')`, que abriría conexión a Postgres.
// Lo sustituimos por un doble antes de cargarlo: así la prueba corre sola.
const path = require('path');
const modelsPath = require.resolve('./src/models');

// En la plantilla, la fila "Perfil de egreso" NO bloquea su columna de valor
// (el docente debe poder escribirla). Las de horas sí. Eso nos permite comprobar
// que los bloqueos caen en la fila correcta y no corridos.
const PLANTILLA_ADMIN = {
  tabs: [
    {
      title: 'DATOS GENERALES',
      rows: [
        // ── Esta fila de más es la que desfasaba todo respecto al documento ──
        { cells: [c('Carrera', true), c(':', true), c('', true)] },
        { cells: [c('Horas de docencia presencial/ sincrónica', true), c(':', true), c('', true)] },
        { cells: [c('Horas de vinculación con la sociedad (HVS)', true), c(':', true), c('', true)] },
        { cells: [c('Perfil de egreso', true), c(':', true), c('Realiza programas de forma estructurada y modular.')] },
      ],
    },
  ],
};

// Documento real de la comisión: NO tiene la fila "Carrera"
const DOC_COMISION = {
  tabs: [
    {
      title: 'DATOS GENERALES',
      rows: [
        { cells: [c('Horas de docencia presencial/ sincrónica'), c(':'), c('70')] },
        { cells: [c('Horas de vinculación con la sociedad (HVS)'), c(':'), c('30')] },
        { cells: [c('Perfil de egreso'), c(':'), c('Realiza programas de forma estructurada y modular.')] },
      ],
    },
  ],
};

// Bloqueos que DEBEN quedar, emparejando por etiqueta de fila
const BLOQUEOS_ESPERADOS = [
  [true, true, true],   // Horas de docencia  → valor bloqueado
  [true, true, true],   // Horas de vinculación → valor bloqueado
  [true, true, false],  // Perfil de egreso → valor EDITABLE por el docente
];

function c(content, isLocked) {
  const cell = { id: `c-${Math.random().toString(36).slice(2, 8)}`, content, rowSpan: 1, colSpan: 1 };
  if (isLocked) {
    cell.isLocked = true;
    // La plantilla trae su propia apariencia: NO debe contagiarla al documento
    cell.backgroundColor = '#fffbeb';
    cell.textColor = '#b45309';
  }
  return cell;
}

// Todo lo que el bloqueo NO debe tocar. Si al bloquear cambia cualquiera de
// estas propiedades, el documento se ve distinto y eso es exactamente lo que
// veníamos arrastrando.
const INTOCABLES = ['content', 'backgroundColor', 'textColor', 'textAlign', 'textOrientation', 'rowSpan', 'colSpan'];

function retrato(datos) {
  return datos.tabs[0].rows.map((r) =>
    r.cells.map((cell) => {
      const o = {};
      for (const k of INTOCABLES) o[k] = cell[k];
      return o;
    })
  );
}

require.cache[modelsPath] = {
  id: modelsPath,
  filename: modelsPath,
  loaded: true,
  exports: {
    Periodo: { findByPk: async () => null, findOne: async () => null },
    Syllabus: {
      findOne: async () => ({ id: 1, periodo: '2025-1', datos_syllabus: PLANTILLA_ADMIN }),
    },
  },
};

const { _applyAdminLocksToData } = require('./src/controllers/comisionAcademicaController');

const textos = (datos) =>
  datos.tabs[0].rows.map((r) => r.cells.map((x) => (x.content == null ? '' : String(x.content))));

// Segundo escenario: plantilla y documento perfectamente alineados (el caso
// normal). Sirve para comprobar que emparejar por etiqueta no rompe lo que ya
// funcionaba.
const PLANTILLA_ALINEADA = {
  tabs: [
    {
      title: 'DATOS GENERALES',
      rows: PLANTILLA_ADMIN.tabs[0].rows.slice(1), // sin la fila "Carrera"
    },
  ],
};

async function escenario(titulo, plantilla, esperados) {
  require.cache[modelsPath].exports.Syllabus.findOne = async () => ({
    id: 1,
    periodo: '2025-1',
    datos_syllabus: plantilla,
  });

  const antes = textos(DOC_COMISION);
  const retratoAntes = retrato(DOC_COMISION);
  const resultado = await _applyAdminLocksToData(JSON.parse(JSON.stringify(DOC_COMISION)), '2025-1');
  const retratoDespues = retrato(resultado);

  console.log(`\n══════ ${titulo} ══════\n`);

  let alterado = false;
  for (let r = 0; r < retratoAntes.length; r++) {
    const iguales = JSON.stringify(retratoAntes[r]) === JSON.stringify(retratoDespues[r]);
    if (!iguales) alterado = true;
    console.log(`fila ${r} ${iguales ? '✅' : '❌ LA CELDA CAMBIÓ'} — ${antes[r][0]}`);
    if (!iguales) {
      console.log(`   antes:   ${JSON.stringify(retratoAntes[r])}`);
      console.log(`   después: ${JSON.stringify(retratoDespues[r])}`);
    }
  }

  // Los bloqueos SÍ deben aplicarse, y en la fila que les corresponde
  const bloqueos = resultado.tabs[0].rows.map((r) => r.cells.map((x) => x.isLocked === true));
  console.log('\n── Bloqueos ──');
  let bloqueoMal = false;
  for (let r = 0; r < bloqueos.length; r++) {
    const ok = JSON.stringify(bloqueos[r]) === JSON.stringify(esperados[r]);
    if (!ok) bloqueoMal = true;
    console.log(`fila ${r} ${ok ? '✅' : '❌ BLOQUEO EN LA FILA EQUIVOCADA'} — ${antes[r][0]}`);
    console.log(`   obtenido: ${JSON.stringify(bloqueos[r])}`);
    if (!ok) console.log(`   esperado: ${JSON.stringify(esperados[r])}`);
  }

  console.log('\n───────────────────────────────');
  if (alterado) console.log('❌ FALLA: bloquear cambió texto, color o estructura de alguna celda.');
  if (bloqueoMal) console.log('❌ FALLA: los bloqueos cayeron en filas que no les corresponden.');
  if (!alterado && !bloqueoMal) {
    console.log('✅ CORRECTO: bloquear solo marcó las celdas como no editables.');
    console.log('   Texto, colores, alineación y estructura quedaron intactos.');
  } else {
    process.exitCode = 1;
  }
  console.log('───────────────────────────────');
}

(async () => {
  await escenario(
    'CASO ROTO: la plantilla tiene una fila de más',
    PLANTILLA_ADMIN,
    BLOQUEOS_ESPERADOS
  );
  await escenario(
    'CASO NORMAL: plantilla y documento alineados',
    PLANTILLA_ALINEADA,
    BLOQUEOS_ESPERADOS
  );
  console.log('');
})();
