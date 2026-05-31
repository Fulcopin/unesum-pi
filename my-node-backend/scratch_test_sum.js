const { Client } = require('pg');

const dbUrl = "postgresql://neondb_owner:npg_F4IVyrtCQqh7@ep-rapid-mud-ae623rtp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

function calcColumnSums(data) {
  if (!data) return {};
  const sums = { presencial: 0, sincronica: 0, pfae: 0, ta: 0, vinc: 0, ppp: 0 };
  const tabEst = data.tabs.find(t =>
    ['ESTRUCTURA', 'ASIGNATURA', 'CONTENIDO', 'UNIDAD'].some(k => t.title.toUpperCase().includes(k))
  );
  if (!tabEst) return sums;

  const colMap = {};
  let hRowIndex = -1;
  for (let r = 0; r < Math.min(6, tabEst.rows.length); r++) {
    const row = tabEst.rows[r];
    if (row.cells.some(c => {
      const t = c.content.toUpperCase();
      return t.includes('PRESENCIAL') || t.includes('PFAE') || t.includes('TA') || t.includes('AUTÓNOMO') || t.includes('AUTONOM') || t.includes('SINCRÓN') || t.includes('SINCRONIC');
    })) {
      hRowIndex = r;
      let col = 0;
      for (const c of row.cells) {
        const t = c.content.toUpperCase().trim();
        const span = c.colSpan || 1;
        let tipo = '';
        if (t.includes('PRESENCIAL')) tipo = 'presencial';
        else if (t.includes('SINCRÓN') || t.includes('SINCRONIC')) tipo = 'sincronica';
        else if (t.includes('PFAE') || t.includes('APLICACIÓN') || t.includes('EXPERIMENTAC')) tipo = 'pfae';
        else if ((t === 'TA' || t.includes('AUTÓNOM') || t.includes('AUTONOM')) && !t.includes('PRESENCIAL') && !t.includes('SINCRÓN')) tipo = 'ta';
        else if (t.includes('VINCULAC')) tipo = 'vinc';
        else if (t.includes('PPP') || t.includes('PREPROFES')) tipo = 'ppp';
        for (let s = 0; s < span; s++) { if (tipo) colMap[col + s] = tipo; }
        col += span;
      }
      break;
    }
  }
  
  console.log("hRowIndex:", hRowIndex);
  console.log("colMap:", colMap);

  tabEst.rows.forEach((row, rIdx) => {
    if (rIdx <= hRowIndex) return;
    const firstCellText = (row.cells[0]?.content || '').toUpperCase().trim();
    if (firstCellText.includes('TOTAL')) return; 
    let col = 0;
    for (const c of row.cells) {
      const span = c.colSpan || 1;
      const val = parseInt((c.content || '').trim(), 10);
      if (!isNaN(val) && val > 0) {
        for (let s = 0; s < span; s++) {
          const tipo = colMap[col + s];
          if (tipo && tipo in sums) {
            sums[tipo] += val;
            console.log(`Added ${val} to ${tipo} from row ${rIdx} col ${col}`);
          }
        }
      }
      col += span;
    }
  });
  return sums;
}

async function run() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const res = await client.query('SELECT id, datos_syllabus FROM syllabus_docente ORDER BY id DESC LIMIT 1');
  if (res.rows.length > 0) {
    let data = res.rows[0].datos_syllabus;
    if (typeof data === 'string') data = JSON.parse(data);
    
    console.log("Calculated sums:", calcColumnSums(data));
  }
  await client.end();
}

run().catch(console.error);
