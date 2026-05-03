const fs = require('fs');
const p1 = 'app/dashboard/docente/formularios-dinamicos/page.tsx';
let txt = fs.readFileSync(p1, 'utf8');

const sIdx = txt.indexOf('  const fetchFormulariosGuardados = async () => {');
if (sIdx > -1) {
  const insertF = `  const fetchPeriodos = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/admin/periodos', {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setPeriodos(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando periodos:', err);
    } finally {
      setLoading(false);
    }
  };\n\n`;
  
  txt = txt.substring(0, sIdx) + insertF + txt.substring(sIdx);
  fs.writeFileSync(p1, txt);
  console.log('done fixing fetchPeriodos');
}
