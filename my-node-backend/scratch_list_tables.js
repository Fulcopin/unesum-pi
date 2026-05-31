const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_F4IVyrtCQqh7@ep-rapid-mud-ae623rtp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
client.connect().then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
