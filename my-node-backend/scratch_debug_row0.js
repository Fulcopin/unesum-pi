const { Client } = require('pg');

const dbUrl = "postgresql://neondb_owner:npg_F4IVyrtCQqh7@ep-rapid-mud-ae623rtp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function run() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const res = await client.query('SELECT id, datos_syllabus FROM syllabus_docente ORDER BY id DESC LIMIT 1');
  if (res.rows.length > 0) {
    let data = res.rows[0].datos_syllabus;
    if (typeof data === 'string') data = JSON.parse(data);
    
    const tabEst = data.tabs.find(t =>
      ['ESTRUCTURA', 'ASIGNATURA', 'CONTENIDO', 'UNIDAD'].some(k => t.title.toUpperCase().includes(k))
    );
    
    console.log("Row 0 exact contents:");
    tabEst.rows[0].cells.forEach((c, i) => {
      console.log(`Cell ${i}: '${c.content}'`);
      const t = (c.content || '').toUpperCase();
      console.log(`  toUpperCase: '${t}'`);
      console.log(`  includes PRESENCIAL? ${t.includes('PRESENCIAL')}`);
    });
  }
  await client.end();
}

run().catch(console.error);
