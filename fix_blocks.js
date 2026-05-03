const fs = require('fs');
const file = 'app/dashboard/admin/asignaturas/registro/page.tsx';
let txt = fs.readFileSync(file, 'utf8');

const preStart = '<Label htmlFor="prerrequisito">Prerrequisito</Label>';
const preEnd = '</Select>';
const idx1 = txt.indexOf(preStart);
if (idx1 > -1) {
  let endIdx1 = txt.indexOf(preEnd, idx1) + preEnd.length;
  let newPre = `<Label htmlFor="prerrequisito">Prerrequisito(s) (Puede elegir múltiples)</Label>
                      <div className="border border-input rounded-md p-3 h-32 overflow-y-auto space-y-2 bg-background mt-1 text-sm text-foreground">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="pre-ninguno" 
                            checked={adscrCedDE.length === 0}
                            onChange={(e) => {
                              if (e.target.checked) setAdscrCedDE([]);
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor="pre-ninguno" className="font-medium cursor-pointer">Sin prerrequisito</label>
                        </div>
                        {asignaturasNivelAnterior.map((asig) => (
                          <div key={\`pre-\${asig.id}\`} className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id={\`pre-\${asig.codigo}\`}
                              checked={adscrCedDE.includes(asig.codigo)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAdscrCedDE([...adscrCedDE, asig.codigo]);
                                } else {
                                  setAdscrCedDE(adscrCedDE.filter(a => a !== asig.codigo));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor={\`pre-\${asig.codigo}\`} className="font-medium cursor-pointer">{asig.nombre} ({asig.codigo})</label>
                          </div>
                        ))}
                      </div>`;
  txt = txt.substring(0, idx1) + newPre + txt.substring(endIdx1);
}

const coStart = '<Label htmlFor="correquisito">Correquisito</Label>';
const coEnd = '</Select>';
const idx2 = txt.indexOf(coStart);
if (idx2 > -1) {
  let endIdx2 = txt.indexOf(coEnd, idx2) + coEnd.length;
  let newCo = `<Label htmlFor="correquisito">Correquisito(s) (Puede elegir múltiples)</Label>
                      <div className="border border-input rounded-md p-3 h-32 overflow-y-auto space-y-2 bg-background mt-1 text-sm text-foreground">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="co-ninguno" 
                            checked={adscrCedCODE.length === 0}
                            onChange={(e) => {
                              if (e.target.checked) setAdscrCedCODE([]);
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor="co-ninguno" className="font-medium cursor-pointer">Sin correquisito (No aplica)</label>
                        </div>
                        {asignaturasNivelActual.map((asig) => (
                          <div key={\`co-\${asig.id}\`} className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id={\`co-\${asig.codigo}\`}
                              checked={adscrCedCODE.includes(asig.codigo)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAdscrCedCODE([...adscrCedCODE, asig.codigo]);
                                } else {
                                  setAdscrCedCODE(adscrCedCODE.filter(a => a !== asig.codigo));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <label htmlFor={\`co-\${asig.codigo}\`} className="font-medium cursor-pointer">{asig.nombre} ({asig.codigo})</label>
                          </div>
                        ))}
                      </div>`;
  txt = txt.substring(0, idx2) + newCo + txt.substring(endIdx2);
}

// Codigo replace handling potential whitespaces
const cInput = '<Input id="codigo" placeholder="Ej: ASIG-001" value={codigo} onChange={(e) => handleCodigoChange(e.target.value.toUpperCase())} />';
const nInput = '<Input id="codigo" placeholder="Ej: ASIG-001" value={codigo} disabled={!!editingAsignaturaId} onChange={(e) => handleCodigoChange(e.target.value.toUpperCase())} />';
txt = txt.replace(cInput, nInput);

fs.writeFileSync(file, txt);
console.log('done');
