const { Client } = require('pg');

const dbUrl = "postgresql://neondb_owner:npg_F4IVyrtCQqh7@ep-rapid-mud-ae623rtp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function run() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log("Connected. Fetching from syllabus_docente...");
  const res = await client.query('SELECT id, datos_syllabus FROM syllabus_docente ORDER BY id DESC LIMIT 1');
  if (res.rows.length > 0) {
    const data = res.rows[0].datos_syllabus;
    if (typeof data === 'string') {
      console.log(`ID: ${res.rows[0].id}`);
      const parsed = JSON.parse(data);
      if (parsed.tabs) {
        const estTab = parsed.tabs.find(t => t.title.toUpperCase().includes('ESTRUCTURA') || t.title.toUpperCase().includes('UNIDAD'));
        if (estTab) {
          console.log("Found ESTRUCTURA tab.");
          console.log("Rows count:", estTab.rows.length);
          // show first few rows
          for (let i=0; i<Math.min(10, estTab.rows.length); i++) {
             console.log(`Row ${i}:`);
             estTab.rows[i].cells.forEach((c, cIdx) => {
               console.log(`  Cell ${cIdx}: [${c.content}] (span: col=${c.colSpan || 1}, row=${c.rowSpan || 1})`);
             });
          }
        } else {
          console.log("No ESTRUCTURA tab found.");
          console.log(parsed.tabs.map(t => t.title));
        }
      }
    } else {
      console.log("datos_syllabus is an object already");
      const parsed = data;
      if (parsed.tabs) {
        const estTab = parsed.tabs.find(t => t.title.toUpperCase().includes('ESTRUCTURA') || t.title.toUpperCase().includes('UNIDAD'));
        if (estTab) {
          console.log("Found ESTRUCTURA tab.");
          console.log("Rows count:", estTab.rows.length);
          // show first few rows
          for (let i=0; i<Math.min(10, estTab.rows.length); i++) {
             console.log(`Row ${i}:`);
             estTab.rows[i].cells.forEach((c, cIdx) => {
               console.log(`  Cell ${cIdx}: [${c.content}] (span: col=${c.colSpan || 1}, row=${c.rowSpan || 1})`);
             });
          }
        }
      }
    }
  } else {
    console.log("No records found in syllabus_docente");
  }

  await client.end();
}

run().catch(console.error);
