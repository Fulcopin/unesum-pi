const { Client } = require('pg');

const dbUrl = "postgresql://neondb_owner:npg_F4IVyrtCQqh7@ep-rapid-mud-ae623rtp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function run() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const res = await client.query('SELECT id, datos_syllabus FROM syllabus_docente ORDER BY id DESC LIMIT 1');
  if (res.rows.length > 0) {
    let data = res.rows[0].datos_syllabus;
    if (typeof data === 'string') data = JSON.parse(data);
    
    const estTab = data.tabs.find(t => t.title.toUpperCase().includes('ESTRUCTURA'));
    if (estTab) {
      estTab.rows.forEach((r, rIdx) => {
        const text = r.cells[0]?.content || '';
        if (text.toUpperCase().includes('TOTAL')) {
          console.log(`Found TOTAL in row ${rIdx}:`);
          r.cells.forEach((c, cIdx) => {
            console.log(`  Cell ${cIdx}: [${c.content}] colSpan=${c.colSpan} rowSpan=${c.rowSpan}`);
          });
        }
      });
    }
  }

  await client.end();
}

run().catch(console.error);
