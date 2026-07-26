/**
 * Diagnóstico y reparación de las celdas separadoras corrompidas.
 *
 * SÍNTOMA: en una fila de tipo "etiqueta : valor" (3 celdas), la celda del medio
 * —que debería tener solo ":"— acabó con texto largo que pertenece a otra fila.
 * Como esa columna se renderiza a ~18px, el texto sale como una tira vertical de
 * una letra por línea y el documento se ve roto.
 *
 * CAUSA: rutinas que copiaban contenido por índice al aplicar bloqueos. Ya están
 * corregidas, pero lo que se guardó mientras tanto sigue en la base — por eso
 * recargar no lo arregla. Este script lo localiza y, opcionalmente, lo limpia.
 *
 * USO:
 *   node revisar-celdas-separador.js          → solo REPORTA, no toca nada
 *   node revisar-celdas-separador.js --fix    → repara (haz respaldo antes)
 *   node revisar-celdas-separador.js --dump   → vuelca la estructura real de las
 *                                               filas (contenido + rowSpan/colSpan)
 *                                               para ver dónde está el desfase
 *
 * Ejecutar desde la carpeta my-node-backend.
 */

require('dotenv').config();
const db = require('./src/models');

const APLICAR = process.argv.includes('--fix');
const VOLCAR = process.argv.includes('--dump');

// Cada tabla con el nombre de la columna JSON que guarda las pestañas
const FUENTES = [
  { modelo: 'SyllabusComisionAcademica', campo: 'datos_syllabus', etiqueta: 'Syllabus de comisión' },
  { modelo: 'SyllabusDocente', campo: 'datos_syllabus', etiqueta: 'Syllabus del docente' },
  { modelo: 'ProgramasAnaliticos', campo: 'datos_tabla', etiqueta: 'Programa analítico' },
  { modelo: 'ProgramaAnaliticoDocente', campo: 'datos_programa', etiqueta: 'Programa analítico del docente' },
];

const parse = (v) => {
  if (!v) return null;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return null; }
  }
  return v;
};

const texto = (c) => (c && c.content != null ? String(c.content) : '').trim();

/**
 * ¿Es una fila "etiqueta : valor"? Son las de 3 celdas visibles donde la del
 * medio hace de separador. Nos apoyamos en el resto de filas de la pestaña para
 * confirmar que esa columna es realmente la de los dos puntos: si la mayoría de
 * las filas de 3 celdas tienen ":" en el medio, la columna es un separador.
 */
function columnaEsSeparador(tab) {
  let conDosPuntos = 0;
  let filasDeTres = 0;
  for (const row of tab.rows || []) {
    const celdas = row.cells || [];
    if (celdas.length !== 3) continue;
    filasDeTres++;
    const medio = texto(celdas[1]);
    if (medio === ':' || medio === '::' || medio === '') conDosPuntos++;
  }
  // Necesitamos evidencia suficiente para no tocar tablas que no son de este tipo
  return filasDeTres >= 3 && conDosPuntos >= Math.ceil(filasDeTres * 0.6);
}

/** El valor "sano" para la columna separadora de esta pestaña. */
function valorSano(tab) {
  let dosPuntos = 0;
  let vacias = 0;
  for (const row of tab.rows || []) {
    const celdas = row.cells || [];
    if (celdas.length !== 3) continue;
    const medio = texto(celdas[1]);
    if (medio === ':') dosPuntos++;
    else if (medio === '') vacias++;
  }
  return dosPuntos >= vacias ? ':' : '';
}

/**
 * Vuelca la estructura de las pestañas que contienen filas "etiqueta : valor".
 * Muestra rowSpan/colSpan de cada celda: es lo único que permite distinguir
 * entre "el texto está mal guardado" y "hay una celda fusionada rindiéndose en
 * la columna equivocada".
 */
function volcar(etiquetaTabla, fila, datos) {
  console.log(`\n═══ ${etiquetaTabla} #${fila.id} — ${fila.nombre || '(sin nombre)'}`);
  for (const [tIdx, tab] of datos.tabs.entries()) {
    if (!Array.isArray(tab.rows) || !columnaEsSeparador(tab)) continue;
    console.log(`\n  ── pestaña [${tIdx}] "${tab.title || ''}"  (${tab.rows.length} filas)`);
    for (const [rIdx, row] of tab.rows.entries()) {
      const celdas = (row.cells || []).map((c) => {
        const rs = c.rowSpan === undefined ? 1 : c.rowSpan;
        const cs = c.colSpan === undefined ? 1 : c.colSpan;
        const marca = rs !== 1 || cs !== 1 ? ` rs=${rs} cs=${cs}` : '';
        const lock = c.isLocked === true ? ' 🔒' : c.docenteEditable === true ? ' 🔓' : '';
        return `"${texto(c).slice(0, 34)}"${marca}${lock}`;
      });
      console.log(`     fila ${String(rIdx).padStart(2)} (${celdas.length} celdas): ${celdas.join(' | ')}`);
    }
  }
}

async function main() {
  const hallazgos = [];

  for (const fuente of FUENTES) {
    const Modelo = db[fuente.modelo];
    if (!Modelo) {
      console.log(`  (se omite ${fuente.modelo}: el modelo no existe)`);
      continue;
    }

    const filas = await Modelo.findAll();
    for (const fila of filas) {
      const datos = parse(fila[fuente.campo]);
      if (!datos || !Array.isArray(datos.tabs)) continue;

      if (VOLCAR) volcar(fuente.etiqueta, fila, datos);

      let tocado = false;
      const sospechosas = [];

      for (const [tIdx, tab] of datos.tabs.entries()) {
        if (!Array.isArray(tab.rows) || !columnaEsSeparador(tab)) continue;
        const sano = valorSano(tab);

        for (const [rIdx, row] of tab.rows.entries()) {
          const celdas = row.cells || [];
          if (celdas.length !== 3) continue;
          const medio = texto(celdas[1]);
          // Sano: ":", "::" o vacío. Cualquier otra cosa en esta columna es basura
          // que se coló copiando contenido por índice.
          if (medio === ':' || medio === '::' || medio === '') continue;

          sospechosas.push({
            pestana: tab.title || `#${tIdx}`,
            fila: rIdx,
            etiqueta: texto(celdas[0]).slice(0, 50),
            basura: medio.slice(0, 60),
            valorReal: texto(celdas[2]).slice(0, 40),
          });

          if (APLICAR) {
            celdas[1].content = sano;
            tocado = true;
          }
        }
      }

      if (sospechosas.length > 0) {
        hallazgos.push({
          tabla: fuente.etiqueta,
          id: fila.id,
          nombre: fila.nombre || '(sin nombre)',
          celdas: sospechosas,
        });
        if (APLICAR && tocado) {
          await fila.update({ [fuente.campo]: JSON.stringify(datos) });
        }
      }
    }
  }

  if (hallazgos.length === 0) {
    console.log('\n✅ No se encontraron celdas separadoras con contenido extraño.');
    console.log('   Si el syllabus se sigue viendo mal, el problema NO es este: avisa.\n');
  } else {
    console.log(`\n⚠️  ${hallazgos.length} documento(s) con celdas separadoras corrompidas:\n`);
    for (const h of hallazgos) {
      console.log(`── ${h.tabla} #${h.id} — ${h.nombre}`);
      for (const c of h.celdas) {
        console.log(`     [${c.pestana}] fila ${c.fila} · "${c.etiqueta}"`);
        console.log(`        basura en la columna del ":" → "${c.basura}"`);
        console.log(`        valor real de la fila        → "${c.valorReal}"`);
      }
      console.log('');
    }
    console.log(
      APLICAR
        ? '✅ Reparado. Recarga el editor.\n'
        : 'Nada se modificó. Para repararlo:  node revisar-celdas-separador.js --fix\n'
    );
  }

  await db.sequelize.close();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
