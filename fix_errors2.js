const fs = require('fs');

const p2 = 'app/dashboard/admin/asignaturas/registro/page.tsx';
let d2 = fs.readFileSync(p2, 'utf8');

// I messed up my other strings before, let me use regex or straightforward replacement.
// Let's replace the whole grid div missing close
let search2 = `<div className="space-y-2">\n                      <Label htmlFor="prerrequisito">Prerrequisito(s) (Puede elegir varios)</Label>`;
let preIdx = d2.indexOf(search2);
if (preIdx > -1) {
    let nextBlock = `\n                  <div className="space-y-2">\n                    <Label htmlFor="correquisito">Correquisito(s) (Puede elegir mï¿½ltiples)</Label>`;
    let oldStr = `                      </div>\n                  \n                  <div className="space-y-2">\n                    <Label htmlFor="correquisito">Correquisito(s) (Puede elegir mï¿½ltiples)</Label>`;
    let newStr = `                      </div>\n                    </div>\n                  \n                  <div className="space-y-2">\n                    <Label htmlFor="correquisito">Correquisito(s) (Puede elegir múltiples)</Label>`;
    d2 = d2.replace(oldStr, newStr);

    let oldStr2 = `                      </div>\n                  </div>\n                </div>\n              \n                <div className="flex gap-3">`;
    let newStr2 = `                      </div>\n                    </div>\n                  </div>\n                </div>\n              \n                <div className="flex gap-3">`;
    d2 = d2.replace(oldStr2, newStr2);
    
    // Also fixing character encoding error from regex
    d2 = d2.replace('mï¿½ltiples', 'múltiples');
    d2 = d2.replace('mï¿½ltiples', 'múltiples');
    fs.writeFileSync(p2, d2);
    console.log('Fixed d2');
}

const p1 = 'app/dashboard/docente/formularios-dinamicos/page.tsx';
let d1 = fs.readFileSync(p1, 'utf8');
d1 = d1.replace(`  };\n    } finally {\n      setLoading(false);\n    }\n  };`, `    } finally {\n      setLoading(false);\n    }\n  };`);
// Alternate if they had different spaces:
d1 = d1.replace(`    } catch (err) {\n      console.error('Error cargando periodos:', err);\n    }\n  };\n    } finally {\n      setLoading(false);\n    }\n  };`, `    } catch (err) {\n      console.error('Error cargando periodos:', err);\n    } finally {\n      setLoading(false);\n    }\n  };`);
fs.writeFileSync(p1, d1);
console.log('Fixed d1');
