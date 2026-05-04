"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Upload, Save, Merge, Trash2, Printer, X, Pencil, Check, ArrowUpFromLine, Copy, FileText, Eraser, FileDown, Lock, Unlock, Settings } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import * as mammoth from "mammoth"
import JSZip from "jszip" 
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useSearchParams } from "next/navigation"
import { periodoAlIdSelect, periodoIdCoincideEnLista } from "@/lib/periodo-select"
import { FirmasPanel } from "@/components/firmas/firmas-panel"

// --- INTERFACES DE DATOS ---
interface TableCell { 
  id: string; 
  content: string; 
  isHeader: boolean; 
  rowSpan: number; 
  colSpan: number; 
  isEditable: boolean; 
  docenteEditable?: boolean;
  backgroundColor?: string; 
  textColor?: string; 
  fontSize?: string; 
  fontWeight?: string; 
  textAlign?: string; 
  textOrientation?: 'horizontal' | 'vertical'; 
}

interface TableRow { id: string; cells: TableCell[]; }
interface TabData { id: string; title: string; rows: TableRow[]; }
interface SyllabusData { id: string | number; name: string; description: string; tabs: TabData[]; metadata: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; }; }
interface SavedSyllabusRecord { id: number; nombre: string; periodo: string; materias: string; datos_syllabus: SyllabusData; datos_tabla?: any; created_at: string; updated_at: string; }

interface ExtractedCell {
  text: string;
  rowSpan: number;
  colSpan: number;
  isHidden: boolean;
  vMerge: string;
}

// 🚀 EXTRACTOR NATIVO DE TABLAS (SE MANTIENE INTACTO, FUNCIONA PERFECTO)
const extraerTablasNativasWord = async (file: File): Promise<ExtractedCell[][][]> => {
  try {
    const zip = new JSZip();
    await zip.loadAsync(file);
    const xmlString = await zip.file("word/document.xml")?.async("string");
    if (!xmlString) return [];

    const cleanXmlString = xmlString.replace(/<w:/g, '<').replace(/<\/w:/g, '</');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanXmlString, "text/xml");
    
    const allTables = Array.from(xmlDoc.getElementsByTagName("tbl"));
    const topLevelTables = allTables.filter(t => {
      let parent = t.parentNode;
      while(parent) {
        if (parent.nodeName === "tbl") return false;
        parent = parent.parentNode;
      }
      return true;
    });

    const rawTables: ExtractedCell[][][] = [];

    topLevelTables.forEach(tbl => {
        const rows = Array.from(tbl.childNodes).filter(n => n.nodeName === "tr");
        if (rows.length === 0) return;

        let maxCols = 0;
        const tblGrid = Array.from(tbl.childNodes).find(n => n.nodeName === "tblGrid");
        if (tblGrid) {
            maxCols = Array.from(tblGrid.childNodes).filter(n => n.nodeName === "gridCol").length;
        } else {
            rows.forEach(tr => {
                let cols = 0;
                Array.from(tr.childNodes).filter(n => n.nodeName === "tc").forEach(tc => {
                    const gs = (tc as Element).getElementsByTagName("gridSpan")[0];
                    const val = gs ? (gs.getAttribute("w:val") || gs.getAttribute("val")) : null;
                    cols += val ? parseInt(val, 10) : 1;
                });
                if (cols > maxCols) maxCols = cols;
            });
        }

        if (maxCols === 0) return;

        const grid: ExtractedCell[][] = Array.from({ length: rows.length }, () => new Array(maxCols).fill(null));

        rows.forEach((tr, rIdx) => {
            const tcs = Array.from(tr.childNodes).filter(n => n.nodeName === "tc") as Element[];
            let cIdx = 0;

            tcs.forEach(tc => {
                while (cIdx < maxCols && grid[rIdx][cIdx] !== null) cIdx++;
                if (cIdx >= maxCols) return;

                // Extraer texto preservando saltos de línea entre párrafos (<p>)
                const paragraphs = Array.from(tc.childNodes).filter(n => n.nodeName === "p");
                let text: string;
                if (paragraphs.length > 1) {
                  // Múltiples párrafos: unir con salto de línea
                  text = paragraphs.map(p => {
                    const ts = Array.from((p as Element).getElementsByTagName("t"));
                    return ts.map(t => t.textContent || "").join("").trim();
                  }).filter(t => t.length > 0).join("\n");
                } else {
                  // Un solo párrafo o sin párrafos: comportamiento original
                  const allTexts = Array.from(tc.getElementsByTagName("t")).map(t => t.textContent || "");
                  text = allTexts.join(" ").replace(/\s{2,}/g, " ").trim();
                }

                const gsNode = tc.getElementsByTagName("gridSpan")[0];
                const gsVal = gsNode ? (gsNode.getAttribute("w:val") || gsNode.getAttribute("val")) : null;
                const gs = gsVal ? parseInt(gsVal, 10) : 1;

                const vmNode = tc.getElementsByTagName("vMerge")[0];
                let vm = 'none';
                if (vmNode) {
                    vm = vmNode.getAttribute("w:val") || vmNode.getAttribute("val") || 'continue';
                }

                for (let i = 0; i < gs; i++) {
                    if (cIdx + i < maxCols) {
                        grid[rIdx][cIdx + i] = { 
                            text: i === 0 ? text : "", 
                            rowSpan: 1, colSpan: gs, isHidden: i > 0, vMerge: vm 
                        };
                    }
                }
                cIdx += gs;
            });
        });

        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < maxCols; c++) {
                if (grid[r][c] === null) {
                    grid[r][c] = { text: "", rowSpan: 1, colSpan: 1, isHidden: false, vMerge: 'none' };
                }
            }
        }

        for (let c = 0; c < maxCols; c++) {
            let masterRow = -1;
            for (let r = 0; r < grid.length; r++) {
                const cell = grid[r][c];
                
                if (cell.vMerge === 'restart' || (cell.vMerge === 'none' && !cell.isHidden)) {
                    masterRow = r;
                } else if (cell.vMerge === 'continue') {
                    if (masterRow !== -1 && grid[masterRow][c]) {
                        grid[masterRow][c].rowSpan++;
                        cell.isHidden = true;
                        cell.rowSpan = 0;
                        cell.colSpan = 0;
                    } else {
                        cell.vMerge = 'none';
                        masterRow = r;
                    }
                } else {
                    masterRow = r; 
                }
            }
        }

        rawTables.push(grid);
    });

    return rawTables;
  } catch (error) {
      console.error("❌ Error extrayendo el Word con JSZip:", error);
      return [];
  }
};

/** Comisión: estructura de tabla definida por administración; solo edición de contenido. */
const HERRAMIENTAS_TABLA_BLOQUEADAS = true

export default function EditorSyllabusComisionPage() {
  const { token, getToken, user } = useAuth()
  
  // --- ESTADOS ---
  const [syllabi, setSyllabi] = useState<SyllabusData[]>([])
  const [activeSyllabusId, setActiveSyllabusId] = useState<string | number | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [savedSyllabi, setSavedSyllabi] = useState<SavedSyllabusRecord[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [showSyllabusSelector, setShowSyllabusSelector] = useState(false)
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [tempTabTitle, setTempTabTitle] = useState("")

  const [isListLoading, setIsListLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const searchParams = useSearchParams()
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [modalCell, setModalCell] = useState<{id: string, content: string, isEditable: boolean} | null>(null)
  
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [mappingData, setMappingData] = useState<{ etiquetasSinMatch: any[], wordData: Record<string, string>, sugerencias: any } | null>(null)
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({}) 
  
  const [showWordPreview, setShowWordPreview] = useState(false)
  const [wordRawTables, setWordRawTables] = useState<ExtractedCell[][][]>([])
  const [selectedWordTable, setSelectedWordTable] = useState<number | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<number, number>>({}) 
  const [configModeDocente, setConfigModeDocente] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [autoMapResult, setAutoMapResult] = useState<{ tabsImportados: number; totalTablas: number } | null>(null)
  
  const asignaturaIdParam = searchParams.get("asignatura")
  const periodoParam = searchParams.get("periodo")
  const syllabusIdParam = searchParams.get("id")
  const sourceParam = searchParams.get("source")
  const nuevaParam = searchParams.get("nueva")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRefSync = useRef<HTMLInputElement>(null)

  const activeSyllabus = syllabi.find((s) => s.id === activeSyllabusId);
  const activeTab = activeSyllabus?.tabs.find(t => t.id === activeTabId);
  const tableData = activeTab ? activeTab.rows : [];
  const [asignaturaInfo, setAsignaturaInfo] = useState<any>(null)

  // Filtrar syllabi por periodo seleccionado (como lo hace el admin)
  const syllabiFiltered = (() => {
    if (!selectedPeriod) return savedSyllabi;
    const periodoObj = periodos.find((p: any) => p.id.toString() === selectedPeriod);
    const periodoNombre = periodoObj?.nombre || '';
    return savedSyllabi.filter((s: any) => {
      const sPeriodo = String(s.periodo || '').trim();
      return sPeriodo === selectedPeriod || sPeriodo === periodoNombre;
    });
  })();

  useEffect(() => {
    const cargarMateria = async () => {
      if (asignaturaIdParam) {
        try {
          const res = await apiRequest(`/api/asignaturas/${asignaturaIdParam}`)
          if (res && res.data) setAsignaturaInfo(res.data)
        } catch (err) {
          console.error("Error cargando materia:", err)
        }
      }
    }
    cargarMateria()
  }, [asignaturaIdParam])

  useEffect(() => {
    if (HERRAMIENTAS_TABLA_BLOQUEADAS) setConfigModeDocente(false)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programasData, comisionData, periodosData] = await Promise.all([
          apiRequest("/api/syllabi").catch(() => ({ data: [] })),
          apiRequest("/api/comision-academica/syllabus").catch(() => ({ data: [] })),
          apiRequest("/api/periodo").catch(() => ({ data: [] }))
        ]);
        
        const generales = Array.isArray(programasData?.data) ? programasData.data.map((s: any) => ({ ...s, _source: 'general' })) : [];
        const comision = Array.isArray(comisionData?.data) ? comisionData.data.map((s: any) => ({ ...s, _source: 'comision' })) : [];
        // Mergeamos ambas listas, comisión primero para dar prioridad
        setSavedSyllabi([...comision, ...generales]);
        
        const periodosArr = Array.isArray(periodosData?.data) ? periodosData.data : [];
        setPeriodos(periodosArr);
        // Pre-seleccionar periodo desde URL o el actual
        if (periodoParam) {
          setSelectedPeriod(periodoParam);
        } else if (!selectedPeriod && periodosArr.length > 0) {
          const actual = periodosArr.find((p: any) => p.estado === 'actual');
          if (actual) setSelectedPeriod(actual.id.toString());
        }
      } catch (error) { 
        console.error("Error al cargar datos:", error); 
      } finally { setIsListLoading(false); }
    };
    fetchData();
  }, []);
  
  useEffect(() => {
    if (activeSyllabus && activeSyllabus.tabs.length > 0) {
      if (!activeSyllabus.tabs.find(t => t.id === activeTabId)) setActiveTabId(activeSyllabus.tabs[0].id);
    } else {
      setActiveTabId(null);
    }
  }, [activeSyllabus, activeTabId]);

  useEffect(() => {
    // Si venimos de "Ver Syllabus" con id, no auto-cargar de savedSyllabi
    if (syllabusIdParam) return;
    if (!selectedPeriod) return;
    
    // Buscar el nombre del periodo para match flexible (registros viejos guardan nombre, nuevos guardan ID)
    const periodoObj = periodos.find((p: any) => p.id.toString() === selectedPeriod);
    const periodoNombre = periodoObj?.nombre || '';
    
    // Filtrar por periodo (ID o nombre) y opcionalmente por asignatura
    const nombreAsignatura = asignaturaInfo?.nombre || '';
    let syllabiDelPeriodo = savedSyllabi.filter((s: any) => {
      const sPeriodo = String(s.periodo || '').trim();
      const matchPeriodo = sPeriodo === selectedPeriod || sPeriodo === periodoNombre;
      if (!matchPeriodo) return false;
      // Si tenemos asignatura, filtrar ESTRICTAMENTE por asignatura_id
      if (asignaturaIdParam) {
        if (s.asignatura_id && String(s.asignatura_id) === String(asignaturaIdParam)) return true;
        // Match por nombre de materia solo si coincide asignatura_id o no tiene asignatura_id
        if (nombreAsignatura && s.materias && !s.asignatura_id) {
          const materiasLower = s.materias.toLowerCase();
          const nombreLower = nombreAsignatura.toLowerCase();
          if (materiasLower.includes(nombreLower) || nombreLower.includes(materiasLower)) return true;
        }
        return false;
      }
      return true;
    });
    
    if (syllabiDelPeriodo.length > 0) {
      const primerSyllabus = syllabiDelPeriodo[0];
      if (activeSyllabusId !== primerSyllabus.id) handleLoadSyllabus(String(primerSyllabus.id));
    } else if (asignaturaIdParam && selectedPeriod) {
      // No encontrado en savedSyllabi, intentar buscar directamente en el backend
      const buscarEnBackend = async () => {
        let syllabusData: any = null;
        let source = 'comision';
        
        // 1) Intentar en tabla comisión por asignatura_id
        try {
          const res = await apiRequest(`/api/comision-academica/syllabus/buscar?asignatura_id=${asignaturaIdParam}&periodo=${selectedPeriod}`);
          if (res?.data) syllabusData = res.data;
        } catch(e) { /* no existe en comisión */ }
        
        // 2) Si no hay en comisión, buscar en tabla general (admin)
        // El admin puede haber subido sin asignatura_id, así que pasamos también el nombre de materia
        if (!syllabusData) {
          const materiaName = nombreAsignatura ? encodeURIComponent(nombreAsignatura) : '';
          const periodoObj2 = periodos.find((p: any) => p.id.toString() === selectedPeriod);
          
          // Intentar con periodo ID
          try {
            const verRes = await apiRequest(`/api/syllabi/verificar-existencia?asignatura_id=${asignaturaIdParam}&periodo=${selectedPeriod}${materiaName ? `&materia=${materiaName}` : ''}`);
            if (verRes?.existe && verRes?.syllabus?.id) {
              const fullRes = await apiRequest(`/api/syllabi/${verRes.syllabus.id}`);
              if (fullRes?.data) { syllabusData = fullRes.data; source = 'general'; }
            }
          } catch(e) { /* no encontrado */ }
          
          // Intentar con nombre del periodo
          if (!syllabusData && periodoObj2?.nombre) {
            try {
              const verRes = await apiRequest(`/api/syllabi/verificar-existencia?asignatura_id=${asignaturaIdParam}&periodo=${encodeURIComponent(periodoObj2.nombre)}${materiaName ? `&materia=${materiaName}` : ''}`);
              if (verRes?.existe && verRes?.syllabus?.id) {
                const fullRes = await apiRequest(`/api/syllabi/${verRes.syllabus.id}`);
                if (fullRes?.data) { syllabusData = fullRes.data; source = 'general'; }
              }
            } catch(e) { /* no encontrado */ }
          }
        }
        
        if (!syllabusData) return;
        console.log(`✅ Syllabus encontrado en tabla ${source}:`, syllabusData.id);
        
        let editorData = syllabusData.datos_syllabus || syllabusData.datos_tabla;
        if (typeof editorData === 'string') try { editorData = JSON.parse(editorData); } catch(e) { return; }
        if (!editorData) return;
        
        editorData.id = syllabusData.id;
        if (!editorData.name) editorData.name = syllabusData.nombre;
        if (editorData.tabs) {
          editorData.tabs = editorData.tabs.map((t: any) => ({
            ...t, rows: (t.rows || []).map((r: any) => ({
              ...r, cells: (r.cells || []).map((c: any) => ({
                ...c, backgroundColor: c.styles?.backgroundColor || c.backgroundColor,
                textColor: c.styles?.textColor || c.textColor,
                textAlign: c.styles?.textAlign || c.textAlign,
                textOrientation: c.styles?.textOrientation || c.textOrientation,
                isEditable: true
              }))
            }))
          }));
        } else if (editorData.rows) {
          editorData.tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: editorData.rows }];
        }
        setSyllabi([editorData]);
        setActiveSyllabusId(editorData.id);
        setActiveTabId(editorData.tabs?.[0]?.id || null);
        setSavedSyllabi(prev => {
          const exists = prev.find((s: any) => s.id === syllabusData.id);
          return exists ? prev : [{ ...syllabusData, _source: source }, ...prev];
        });
      };
      buscarEnBackend();
    }
  }, [selectedPeriod, savedSyllabi.length, periodos.length, asignaturaInfo]);

  // 🔄 Cargar syllabus específico cuando se viene de "Ver Syllabus" con ?id=X
  useEffect(() => {
    if (!syllabusIdParam) return;
    const cargarSyllabusDirecto = async () => {
      try {
        let syllabusData: any = null;
        
        if (sourceParam === 'general') {
          // Fuente es la tabla general (admin), intentar primero ahí
          try {
            const res = await apiRequest(`/api/syllabi/${syllabusIdParam}`);
            if (res?.data) syllabusData = res.data;
          } catch(e) {
            try {
              const res = await apiRequest(`/api/comision-academica/syllabus/${syllabusIdParam}`);
              if (res?.data) syllabusData = res.data;
            } catch(e2) { /* no encontrado */ }
          }
        } else {
          // Fuente es comisión (default), intentar primero ahí
          try {
            const res = await apiRequest(`/api/comision-academica/syllabus/${syllabusIdParam}`);
            if (res?.data) syllabusData = res.data;
          } catch(e) {
            try {
              const res = await apiRequest(`/api/syllabi/${syllabusIdParam}`);
              if (res?.data) syllabusData = res.data;
            } catch(e2) { /* no encontrado */ }
          }
        }
        
        if (!syllabusData) return;
        console.log('✅ Syllabus cargado directo por ID:', syllabusData.id);
        
        let editorData = syllabusData.datos_syllabus || syllabusData.datos_tabla;
        if (typeof editorData === 'string') {
          try { editorData = JSON.parse(editorData); } catch(e) {}
        }
        if (!editorData) return;
        
        editorData.id = syllabusData.id;
        if (!editorData.name) editorData.name = syllabusData.nombre;
        
        // Normalizar estructura de tabs para el editor
        if (editorData.tabs) {
          editorData.tabs = editorData.tabs.map((t: any) => ({
            ...t,
            rows: (t.rows || []).map((r: any) => ({
              ...r,
              cells: (r.cells || []).map((c: any) => ({
                ...c,
                backgroundColor: c.styles?.backgroundColor || c.backgroundColor,
                textColor: c.styles?.textColor || c.textColor,
                textAlign: c.styles?.textAlign || c.textAlign,
                textOrientation: c.styles?.textOrientation || c.textOrientation,
                isEditable: true
              }))
            }))
          }));
        } else if ((editorData as any).rows) {
          editorData.tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: (editorData as any).rows }];
        }
        
        setSyllabi([editorData]);
        setActiveSyllabusId(editorData.id);
        setActiveTabId(editorData.tabs?.[0]?.id || null);
        
        // También agregar a savedSyllabi para que el guardar pueda detectarlo
        setSavedSyllabi(prev => {
          const exists = prev.find(s => s.id === syllabusData.id);
          return exists ? prev : [syllabusData, ...prev];
        });
      } catch (err) {
        console.error('Error cargando syllabus directo:', err);
      }
    };
    cargarSyllabusDirecto();
  }, [syllabusIdParam]);

  // El período guardado puede ser nombre; el Select usa id — cubre URL ?id= y carga desde la lista
  useEffect(() => {
    if (activeSyllabusId == null || periodos.length === 0) return;
    const s = savedSyllabi.find((x: any) => String(x.id) === String(activeSyllabusId));
    if (!s?.periodo) return;
    const id = periodoAlIdSelect(s.periodo, periodos);
    if (periodoIdCoincideEnLista(id, periodos)) setSelectedPeriod(id);
  }, [activeSyllabusId, periodos, savedSyllabi]);

  // 🆕 Crear syllabus vacío cuando se viene con ?nueva=true
  useEffect(() => {
    if (nuevaParam !== 'true') return;
    if (syllabusIdParam) return; // Si tiene ID, no crear nuevo
    if (activeSyllabusId) return; // Ya hay uno activo

    // Esperar a que carguen los datos necesarios
    if (isListLoading) return;

    const buscarOCrearSyllabus = async () => {
      const periodo = selectedPeriod || periodoParam || '';

      // Resolver nombre del periodo para búsquedas flexibles
      // (el admin guarda con nombre, la comisión trabaja con ID)
      const periodoObj = periodos.find((p: any) => p.id.toString() === periodo);
      const periodoNombre = periodoObj?.nombre || '';

      const normalizeEditorData = (editorData: any) => {
        if (editorData.tabs) {
          editorData.tabs = editorData.tabs.map((t: any) => ({
            ...t, rows: (t.rows || []).map((r: any) => ({
              ...r, cells: (r.cells || []).map((c: any) => ({
                ...c, backgroundColor: c.styles?.backgroundColor || c.backgroundColor,
                textColor: c.styles?.textColor || c.textColor,
                textAlign: c.styles?.textAlign || c.textAlign,
                textOrientation: c.styles?.textOrientation || c.textOrientation,
                isEditable: true
              }))
            }))
          }));
        } else if (editorData.rows) {
          editorData.tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: editorData.rows }];
        }
        return editorData;
      };

      const cargarEditorData = (editorData: any, id: any, nombre?: string) => {
        editorData.id = id;
        if (!editorData.name && nombre) editorData.name = nombre;
        normalizeEditorData(editorData);
        setSyllabi([editorData]);
        setActiveSyllabusId(editorData.id);
        setActiveTabId(editorData.tabs?.[0]?.id || null);
      };

      if (periodo) {
        // 1. Buscar en tabla comisión por asignatura+periodo
        if (asignaturaIdParam) {
          for (const p of [periodo, periodoNombre].filter(Boolean)) {
            try {
              const res = await apiRequest(`/api/comision-academica/syllabus/buscar?asignatura_id=${asignaturaIdParam}&periodo=${encodeURIComponent(p)}`);
              if (res?.data) {
                let editorData = res.data.datos_syllabus || res.data.datos_tabla;
                if (typeof editorData === 'string') try { editorData = JSON.parse(editorData); } catch(e) { editorData = null; }
                if (editorData) {
                  cargarEditorData(editorData, res.data.id, res.data.nombre);
                  return;
                }
              }
            } catch(e) { /* no existe en comisión, seguir buscando */ }
          }
        }

        // 2. Buscar en tabla general (admin) por asignatura+periodo — el backend ya resuelve ID↔nombre
        const asigQuery = asignaturaIdParam ? `&asignatura_id=${asignaturaIdParam}` : '';
        for (const p of [periodo, periodoNombre].filter(Boolean)) {
          try {
            const verRes = await apiRequest(`/api/syllabi/verificar-existencia?periodo=${encodeURIComponent(p)}${asigQuery}&materia=${encodeURIComponent(asignaturaInfo?.nombre || '')}`);
            if (verRes?.existe && verRes?.syllabus?.id) {
              const fullRes = await apiRequest(`/api/syllabi/${verRes.syllabus.id}`);
              if (fullRes?.data) {
                let editorData = fullRes.data.datos_syllabus || fullRes.data.datos_tabla;
                if (typeof editorData === 'string') try { editorData = JSON.parse(editorData); } catch(e) { editorData = null; }
                if (editorData) {
                  console.log(`✅ Cargando syllabus del admin (periodo: ${p}) como plantilla`);
                  cargarEditorData(editorData, fullRes.data.id, fullRes.data.nombre);
                  return;
                }
              }
            }
          } catch(e) { /* no existe */ }
        }
      }

      // No se encontró ninguno existente → dejar la pantalla inicial
      // para que el usuario seleccione de la lista o suba un Word
      console.log('ℹ️ No se encontró syllabus existente para esta asignatura/periodo');
    };

    buscarOCrearSyllabus();
  }, [nuevaParam, syllabusIdParam, activeSyllabusId, isListLoading, asignaturaInfo, selectedPeriod, periodos]);

  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const fullUrl = `http://localhost:4000${endpoint}`
    const currentToken = token || getToken()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}`, ...options.headers }
    const response = await fetch(fullUrl, { ...options, headers })
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) throw new Error("El servidor no devolvió JSON.");
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Error en la petición.")
    return data
  }

  const handleSmartSync = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeSyllabus) return;

    if (fileInputRefSync.current) fileInputRefSync.current.value = "";
    setIsLoading(true);
    setAutoMapResult(null);

    try {
      // EXTRACCIÓN MAESTRA CON JSZIP
      const tablasPerfectas = await extraerTablasNativasWord(file);

      if (tablasPerfectas.length > 0) {
        setWordRawTables(tablasPerfectas);
        setShowWordPreview(true);
        const idxMejorTabla = tablasPerfectas.reduce((bestIdx, t, idx, arr) =>
          (t[0]?.length || 0) > (arr[bestIdx][0]?.length || 0) ? idx : bestIdx, 0
        );
        setSelectedWordTable(idxMejorTabla);
        setColumnMapping({});

        // 🤖 AUTO-MAPEO: aplicar automáticamente todas las tablas a sus pestañas
        autoMapearTodas(tablasPerfectas);
      } else {
        alert('⚠️ No se encontraron tablas en el documento Word.');
      }
    } catch (error: any) {
      console.error("Error en sincronizacion:", error);
      alert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🚀 LA SOLUCIÓN DEFINITIVA: EL MOTOR DE IMPORTACIÓN QUE EXPANDE Y CLONA LA ESTRUCTURA
  const importarTablaWord = (wordTableIdx: number, startRowEditor: number, colMap: Record<number, number>) => {
    if (!activeSyllabus || !activeTab) return;
    const wordTable = wordRawTables[wordTableIdx];
    if (!wordTable) return;
    
    const tabIdx = activeSyllabus.tabs.findIndex(t => t.id === activeTab.id);
    if (tabIdx < 0) return;
    
    const updatedTabs = activeSyllabus.tabs.map((tab, tIdx) => {
      if (tIdx !== tabIdx) return tab;
      
      const processedRows = [...tab.rows];

      // 1. Determinar el máximo de columnas necesario (Expansión de Columnas)
      const maxEditorCols = Math.max(...processedRows.map(r => r.cells.length), ...Object.values(colMap).map(v => v + 1));

      for (let wRIdx = 0; wRIdx < wordTable.length; wRIdx++) {
        const targetRIdx = startRowEditor + wRIdx;
        const wordRow = wordTable[wRIdx];

        // 2. Si la fila no existe en el editor, la creamos (Expansión de Filas)
        if (!processedRows[targetRIdx]) {
            processedRows[targetRIdx] = {
                id: `row-auto-${Date.now()}-${targetRIdx}`,
                cells: []
            };
        }

        // 3. Si a la fila le faltan columnas, agregamos las faltantes
        while (processedRows[targetRIdx].cells.length < maxEditorCols) {
            processedRows[targetRIdx].cells.push({
                id: `cell-auto-${Date.now()}-${targetRIdx}-${processedRows[targetRIdx].cells.length}`,
                content: "",
                isHeader: targetRIdx === 0,
                rowSpan: 1, colSpan: 1,
                isEditable: true,
                textOrientation: 'horizontal'
            });
        }

        // 4. Copiar los datos y la ESTRUCTURA EXACTA (RowSpan/ColSpan)
        processedRows[targetRIdx].cells = processedRows[targetRIdx].cells.map((cell, cIdx) => {
            const wordColIdx = Object.entries(colMap).find(([, editorCol]) => editorCol === cIdx);
            if (!wordColIdx) return cell;
            
            const wColIdx = parseInt(wordColIdx[0]);
            if (wColIdx >= wordRow.length) return cell;
            
            const wordCell = wordRow[wColIdx];
            if (!wordCell) return cell;
            
            const upperText = wordCell.text.toUpperCase().trim();
            // Solo vertical para headers cortos de columna, nunca para datos como "Presencial-Áulico"
            const isShortHeader = upperText.length <= 14 && !upperText.includes('-');
            const matchesVert = ["AUTÓNOMO", "PRACTICO", "SINCRÓNICA", "PFAE"].some(k => upperText.includes(k)) || upperText === 'TA' || (upperText === 'PRESENCIAL' || upperText === 'HD. PRESENCIAL');
            const isVertical = isShortHeader && matchesVert;

            // 🔥 APLICAMOS LA MAGIA: Clonar isHidden para no desfasar celdas en React
            return { 
                ...cell, 
                content: wordCell.isHidden ? "" : wordCell.text.trim(), 
                rowSpan: wordCell.isHidden ? 0 : wordCell.rowSpan,
                colSpan: wordCell.isHidden ? 0 : wordCell.colSpan,
                isEditable: !wordCell.isHidden,
                textOrientation: isVertical ? 'vertical' : 'horizontal'
            };
        });
      }
      
      return { ...tab, rows: processedRows };
    });
    
    setSyllabi(prev => prev.map(s => s.id === activeSyllabus.id ? { ...s, tabs: updatedTabs } : s));
    alert(`✅ ¡Tabla importada con éxito!\n\nSe ajustaron automáticamente las filas, columnas y celdas combinadas para mantener el diseño exacto.`);
  };

  // 🤖 AUTO-MAPEO: Importa todas las tablas del Word a sus pestañas correspondientes
  const autoMapearTodas = (tablas: ExtractedCell[][][]) => {
    if (!activeSyllabus) return;

    // Las tablas del syllabus son T1-T4 (índice 1 a 4), T0 suele ser logo/encabezado
    const tablasSyllabus = tablas.slice(1, 5);
    const editorTabs = activeSyllabus.tabs;
    if (tablasSyllabus.length === 0 || editorTabs.length === 0) return;

    let tabsImportados = 0;

    const updatedTabs = editorTabs.map((tab, tabIdx) => {
      const wordTable = tablasSyllabus[tabIdx];
      if (!wordTable || wordTable.length === 0) return tab;

      const maxCols = Math.max(
        wordTable[0]?.length || 0,
        tab.rows[0]?.cells.length || 0
      );
      const processedRows = [...tab.rows];

      for (let wRIdx = 0; wRIdx < wordTable.length; wRIdx++) {
        const wordRow = wordTable[wRIdx];
        if (!processedRows[wRIdx]) {
          processedRows[wRIdx] = {
            id: `row-auto-${Date.now()}-${wRIdx}`,
            cells: []
          };
        }
        while (processedRows[wRIdx].cells.length < maxCols) {
          processedRows[wRIdx].cells.push({
            id: `cell-auto-${Date.now()}-${wRIdx}-${processedRows[wRIdx].cells.length}`,
            content: '', isHeader: wRIdx === 0,
            rowSpan: 1, colSpan: 1, isEditable: true, textOrientation: 'horizontal'
          });
        }
        processedRows[wRIdx].cells = processedRows[wRIdx].cells.map((cell, cIdx) => {
          const wordCell = wordRow[cIdx];
          if (!wordCell) return cell;
          const upperText = wordCell.text.toUpperCase().trim();
          const isShortHeader = upperText.length <= 14 && !upperText.includes('-');
          const matchesVert = ['AUTÓNOMO', 'PRACTICO', 'SINCRÓNICA', 'PFAE'].some(k => upperText.includes(k)) || upperText === 'TA';
          const isVertical = isShortHeader && matchesVert;
          return {
            ...cell,
            content: wordCell.isHidden ? '' : wordCell.text.trim(),
            rowSpan: wordCell.isHidden ? 0 : wordCell.rowSpan,
            colSpan: wordCell.isHidden ? 0 : wordCell.colSpan,
            isEditable: !wordCell.isHidden,
            textOrientation: isVertical ? 'vertical' : 'horizontal'
          };
        });
      }
      tabsImportados++;
      return { ...tab, rows: processedRows };
    });

    setSyllabi(prev => prev.map(s =>
      s.id === activeSyllabus.id ? { ...s, tabs: updatedTabs } : s
    ));
    setAutoMapResult({ tabsImportados, totalTablas: tablasSyllabus.length });
  };

  // 🗑️ ELIMINAR syllabus activo de la base de datos
  const handleEliminarSyllabusActivo = async () => {
    if (!activeSyllabus || typeof activeSyllabus.id !== 'number') return;
    setShowDeleteConfirm(false);
    setIsLoading(true);
    try {
      const endpoint = sourceParam === 'general'
        ? `/api/syllabi/${activeSyllabus.id}`
        : `/api/comision-academica/syllabus/${activeSyllabus.id}`;
      await apiRequest(endpoint, { method: 'DELETE' });
      setActiveSyllabusId(null);
      setSyllabi([]);
      setSavedSyllabi(prev => prev.filter(s => s.id !== activeSyllabus.id));
    } catch (err: any) {
      alert('❌ Error al eliminar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDB = async () => {
    if (!activeSyllabus) return alert("No hay un ProgramaAnalitico activo para guardar.")
    if (!selectedPeriod) return alert("Por favor, seleccione un periodo antes de guardar.")
    if (!asignaturaIdParam) return alert("No se detectó la asignatura. Vuelva a la pantalla de asignaturas y seleccione una.")
    
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0",
        metadata: activeSyllabus.metadata,
        tabs: activeSyllabus.tabs.map(tab => ({
          id: tab.id, title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id, cells: row.cells.map(cell => ({
              ...cell, styles: { backgroundColor: cell.backgroundColor, textColor: cell.textColor, textAlign: cell.textAlign, textOrientation: cell.textOrientation }
            }))
          }))
        }))
      };

      const asigId = parseInt(asignaturaIdParam, 10);
      const payload: any = { 
        nombre: activeSyllabus.name || 'Syllabus', 
        periodo: selectedPeriod, 
        materias: activeSyllabus.name || 'Syllabus', 
        datos_syllabus: datosParaGuardar,
        asignatura_id: asigId
      };

      // Verificar si ya existe uno para esta asignatura+periodo (actualizar en vez de crear)
      let existingId: number | null = null;
      try {
        const checkRes = await apiRequest(`/api/comision-academica/syllabus/buscar?asignatura_id=${asigId}&periodo=${selectedPeriod}`);
        if (checkRes?.data?.id) existingId = checkRes.data.id;
      } catch (e) { /* no existe, se creará */ }

      const isUpdate = existingId !== null;
      const endpoint = isUpdate ? `/api/comision-academica/syllabus/${existingId}` : "/api/comision-academica/syllabus";
      const method = isUpdate ? "PUT" : "POST";

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedRecord = result.data;
      const savedUIData = savedRecord.datos_syllabus;
      if (savedUIData) {
        savedUIData.id = savedRecord.id;
        
        if (savedUIData.tabs) {
            savedUIData.tabs = savedUIData.tabs.map((t: any) => ({
                ...t, rows: t.rows.map((r: any) => ({
                    ...r, cells: r.cells.map((c: any) => ({
                        ...c, backgroundColor: c.styles?.backgroundColor, textOrientation: c.styles?.textOrientation, isEditable: true
                    }))
                }))
            }));
        }

        setSyllabi((prev) => prev.map((s) => (s.id === activeSyllabusId ? savedUIData : s)))
        setActiveSyllabusId(savedUIData.id)
      }
      
      if (isUpdate) setSavedSyllabi(prev => prev.map(s => s.id === savedRecord.id ? savedRecord : s));
      else setSavedSyllabi(prev => [savedRecord, ...prev]);
      
      alert("Syllabus guardado exitosamente!")
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateProgramaAnalitico = (id: string | number, updates: Partial<SyllabusData>) => {
    setSyllabi(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleLoadSyllabus = async (syllabusId: string) => {
    if (!syllabusId) return;
    const id = parseInt(syllabusId, 10);
    const syllabusToLoad = savedSyllabi.find((s: any) => Number(s.id) === id);
    if (!syllabusToLoad) return;

    let editorData: any = syllabusToLoad.datos_syllabus || syllabusToLoad.datos_tabla;
    
    // Si no hay datos_syllabus (la lista de comisión no los incluye), buscar por ID en la API
    if (!editorData) {
      try {
        const source = (syllabusToLoad as any)._source || 'comision';
        let fullData: any = null;
        if (source === 'comision') {
          try {
            const res = await apiRequest(`/api/comision-academica/syllabus/${id}`);
            if (res?.data) fullData = res.data;
          } catch(e) {
            const res = await apiRequest(`/api/syllabi/${id}`);
            if (res?.data) fullData = res.data;
          }
        } else {
          try {
            const res = await apiRequest(`/api/syllabi/${id}`);
            if (res?.data) fullData = res.data;
          } catch(e) {
            const res = await apiRequest(`/api/comision-academica/syllabus/${id}`);
            if (res?.data) fullData = res.data;
          }
        }
        if (fullData) {
          editorData = fullData.datos_syllabus || fullData.datos_tabla;
          // Actualizar savedSyllabi con los datos completos
          setSavedSyllabi(prev => prev.map(s => Number(s.id) === id ? { ...s, datos_syllabus: editorData } : s));
        }
      } catch(e) {
        console.error('Error al cargar datos completos del syllabus:', e);
        return;
      }
    }

    if (typeof editorData === 'string') {
      try { editorData = JSON.parse(editorData); } catch(e) { return; }
    }
    if (!editorData) return;
    
    editorData.id = syllabusToLoad.id;
    if (!editorData.name) editorData.name = syllabusToLoad.nombre;
    
    // Normalizar tabs
    if (editorData.tabs) {
      editorData.tabs = editorData.tabs.map((t: any) => ({
        ...t, rows: (t.rows || []).map((r: any) => ({
          ...r, cells: (r.cells || []).map((c: any) => ({
            ...c, backgroundColor: c.styles?.backgroundColor || c.backgroundColor,
            textColor: c.styles?.textColor || c.textColor,
            textAlign: c.styles?.textAlign || c.textAlign,
            textOrientation: c.styles?.textOrientation || c.textOrientation,
            isEditable: true
          }))
        }))
      }));
    } else if (editorData.rows) {
      editorData.tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: editorData.rows }];
    }
    
    setSyllabi([editorData]);
    setActiveSyllabusId(editorData.id);
    setActiveTabId(editorData.tabs?.[0]?.id || null);
    if (syllabusToLoad.periodo && periodos.length > 0) {
      const id = periodoAlIdSelect(syllabusToLoad.periodo, periodos);
      if (periodoIdCoincideEnLista(id, periodos)) setSelectedPeriod(id);
    }
  };

  const handleSyllabusUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = ""; 

    setIsLoading(true);

    try {
      const tablasNativas = await extraerTablasNativasWord(file);
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const doc = new DOMParser().parseFromString(html, "text/html");
      const findMeta = (k: string) => Array.from(doc.querySelectorAll("p, td")).find(n => n.textContent?.includes(k))?.textContent?.split(k)[1]?.trim() || "";
      
      const meta = { subject: findMeta("Nombre de la asignatura") || file.name.replace(".docx",""), period: findMeta("Periodo") || "", level: findMeta("Nivel") || "" };

      const SECTION_TRIGGERS = [
        "DATOS GENERALES", "INFORMACIÓN GENERAL", "OBJETIVOS", "OBJETIVO",
        "RESULTADOS DE APRENDIZAJE", "RESULTADOS", "CONTENIDOS", "UNIDADES TEMÁTICAS",
        "METODOLOGÍA", "ESTRATEGIAS METODOLÓGICAS", "EVALUACIÓN", "SISTEMA DE EVALUACIÓN",
        "BIBLIOGRAFÍA", "FUENTES DE CONSULTA", "VISADO", "LEGALIZACIÓN"
      ];

      const newTabs: TabData[] = [];
      let currentRows: TableRow[] = [];
      let currentSectionTitle = "Información General"; 

      const pushCurrentSection = () => {
        if (currentRows.length > 0) {
            newTabs.push({ id: `tab-${newTabs.length}-${Date.now()}`, title: currentSectionTitle, rows: [...currentRows] });
            currentRows = []; 
        }
      };

      tablasNativas.forEach((grid, tIdx) => {
        grid.forEach((gridRow, rIdx) => {
            const firstValidCell = gridRow.find(c => !c.isHidden && c.text.trim() !== "");
            const firstCellText = firstValidCell ? firstValidCell.text.toUpperCase() : "";
            const matchedTrigger = SECTION_TRIGGERS.find(trigger => firstCellText.includes(trigger));

            if (matchedTrigger && firstCellText.length < 50) {
                pushCurrentSection();
                let cleanTitle = matchedTrigger;
                if (cleanTitle.includes("CONTENIDOS")) cleanTitle = "Contenidos y Unidades";
                if (cleanTitle.includes("RESULTADOS")) cleanTitle = "Resultados de Aprendizaje";
                if (cleanTitle.includes("BIBLIOGRAFÍA")) cleanTitle = "Bibliografía";
                currentSectionTitle = cleanTitle.charAt(0) + cleanTitle.slice(1).toLowerCase();
            }

            const isUnitHeader = currentSectionTitle.includes("Contenidos") && gridRow.some(c => c.text.toUpperCase().includes("UNIDADES TEM"));

            const finalCells: TableCell[] = gridRow.map((extCell, cIdx) => {
                const upperText = extCell.text.toUpperCase().trim();
                // Solo aplicar vertical a headers de columna (texto corto, sin guiones/espacios largos)
                const isHeaderCell = (isUnitHeader || rIdx === 0) && upperText.length <= 14 && !upperText.includes('-');
                const matchesVerticalKeyword = ["AUTÓNOMO", "PRACTICO", "SINCRÓNICA", "PFAE"].some(k => upperText.includes(k)) || upperText === 'TA' || (upperText === 'PRESENCIAL' || upperText === 'HD. PRESENCIAL');
                const isVertical = isHeaderCell && matchesVerticalKeyword;
                return {
                    id: `cell-${Date.now()}-${tIdx}-${rIdx}-${cIdx}`,
                    content: extCell.text,
                    isHeader: isUnitHeader || rIdx === 0,
                    rowSpan: extCell.isHidden ? 0 : extCell.rowSpan, 
                    colSpan: extCell.isHidden ? 0 : extCell.colSpan, 
                    isEditable: !extCell.isHidden, 
                    textOrientation: isVertical ? 'vertical' : 'horizontal',
                    backgroundColor: isUnitHeader ? '#f0fdf4' : undefined 
                };
            });

            currentRows.push({ id: `row-${Date.now()}-${tIdx}-${rIdx}`, cells: finalCells });
        });
      });

      pushCurrentSection();

      if (newTabs.length === 0) {
        setIsLoading(false);
        return alert("No se pudo detectar ninguna estructura válida en el documento.");
      }

      const newData: SyllabusData = {
        id: `ProgramaAnalitico-${Date.now()}`,
        name: meta.subject,
        description: "Importado (JSZip Expansion)",
        metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        tabs: newTabs,
      };
      
      setSyllabi([newData]);
      setActiveSyllabusId(newData.id);
      
      const tabContenidos = newTabs.find(t => t.title.toLowerCase().includes("contenidos"));
      setActiveTabId(tabContenidos ? tabContenidos.id : newTabs[0].id);

    } catch (e) { 
        console.error(e); 
        alert("Error al procesar el archivo. Verifica que no esté corrupto."); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const handleUpdateActiveTabRows = (newRows: TableRow[]) => {
    if (!activeSyllabus || !activeTabId) return;
    const updatedTabs = activeSyllabus.tabs.map(tab => tab.id === activeTabId ? { ...tab, rows: newRows } : tab);
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
  };

  const startRenamingTab = (tab: TabData) => {
    setEditingTabId(tab.id);
    setTempTabTitle(tab.title);
  }

  const saveTabRename = () => {
    if (!activeSyllabus || !editingTabId) return;
    const updatedTabs = activeSyllabus.tabs.map(tab => tab.id === editingTabId ? { ...tab, title: tempTabTitle || "Sin Título" } : tab);
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    setEditingTabId(null);
  }

  const addTab = () => {
    if (!activeSyllabus) return;
    const newTab: TabData = {
      id: `tab-${Date.now()}`, title: `Nueva Sección`,
      rows: [ { id: `r1-${Date.now()}`, cells: [{id: `c11-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true, textOrientation: 'horizontal'}, {id: `c12-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true, textOrientation: 'horizontal'}] } ]
    };
    const updatedTabs = [...activeSyllabus.tabs, newTab];
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    setActiveTabId(newTab.id);
  };
  
  const removeTab = (tabIdToRemove: string) => {
    if (!activeSyllabus) return;
    if (activeSyllabus.tabs.length <= 1) return alert("Debe quedar al menos una sección.");
    if (!window.confirm("¿Estás seguro de eliminar esta sección?")) return;
    const updatedTabs = activeSyllabus.tabs.filter(t => t.id !== tabIdToRemove);
    updateProgramaAnalitico(activeSyllabus.id, { tabs: updatedTabs });
    if (activeTabId === tabIdToRemove) setActiveTabId(updatedTabs[0]?.id || null);
  };

  const findCellPosition = (id: string): {rowIndex: number, colIndex: number} | null => { if (!tableData) return null; for(let r=0;r<tableData.length;r++){ const c=tableData[r].cells.findIndex(cell=>cell.id===id); if(c!==-1)return{rowIndex: r, colIndex: c}} return null }
  const saveEdit = () => { if(editingCell){ const updated=tableData.map(row=>({...row,cells:row.cells.map(c=>(c.id===editingCell?{...c,content:editContent}:c))})); handleUpdateActiveTabRows(updated); setEditingCell(null);setEditContent("")}}
  const cancelEdit = () => { setEditingCell(null); setEditContent("") }
  const saveModalEdit = () => {
    if (!modalCell) return;
    const updated = tableData.map(row => ({ ...row, cells: row.cells.map(c => (c.id === modalCell.id ? { ...c, content: editContent } : c)) }));
    handleUpdateActiveTabRows(updated);
    setModalCell(null);
    setEditContent("");
  }
  const handleCellClick = (id: string, e: React.MouseEvent) => {
    // Si estamos en modo configuración docente, togglear docenteEditable
    if (configModeDocente) {
      const updated = tableData.map(row => ({
        ...row,
        cells: row.cells.map(c => {
          if (c.id === id) {
            return { ...c, docenteEditable: c.docenteEditable === false ? true : (c.docenteEditable === true ? false : false) };
          }
          return c;
        })
      }));
      handleUpdateActiveTabRows(updated);
      return;
    }
    e.ctrlKey||e.metaKey ? setSelectedCells(p => p.includes(id)?p.filter(i=>i!==id):[...p,id]) : setSelectedCells([id])
  }

  const toggleDocenteEditableAll = (enable: boolean) => {
    const updated = tableData.map(row => ({
      ...row,
      cells: row.cells.map(c => ({ ...c, docenteEditable: enable }))
    }));
    handleUpdateActiveTabRows(updated);
  }
  
  const handleInsertRow = (direction: "above" | "below") => { const pos = findCellPosition(selectedCells[0]); if(pos) {
    const rId=`r-${Date.now()}`,nCols=tableData[0].cells.length;
    const nR:TableRow={id:rId,cells:Array.from({length:nCols},(_,i)=>({id:`c-${rId}-${i}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0, textOrientation: 'horizontal'}))};
    const nRows=[...tableData];nRows.splice(direction === 'above' ? pos.rowIndex : pos.rowIndex + 1,0,nR);handleUpdateActiveTabRows(nRows)
  }}
  const handleInsertColumn = (direction: "left" | "right") => { const pos = findCellPosition(selectedCells[0]); if(pos) {
    const idx = direction === 'left' ? pos.colIndex : pos.colIndex + 1;
    const updated=tableData.map(r=>{const nC:TableCell={id:`c-${r.id}-${Date.now()}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0, textOrientation: 'horizontal'};const nCells=[...r.cells];nCells.splice(idx,0,nC);return{...r,cells:nCells}});
    handleUpdateActiveTabRows(updated)
  }}
  const removeSelectedRow = () => { const pos = findCellPosition(selectedCells[0]); if (pos) { const updated = tableData.filter((_, i) => i !== pos.rowIndex); handleUpdateActiveTabRows(updated); setSelectedCells([]); } }
  const removeSelectedColumn = () => { const pos = findCellPosition(selectedCells[0]); if (pos) { const updated = tableData.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== pos.colIndex) })); handleUpdateActiveTabRows(updated); setSelectedCells([]); } }
  const clearSelectedCells=()=>{ const updated=tableData.map(r=>({...r,cells:r.cells.map(c=>selectedCells.includes(c.id)?{...c,content:""}:c)})); handleUpdateActiveTabRows(updated); setSelectedCells([]) }
  
  const toggleVerticalText = () => {
    if (selectedCells.length === 0) return;
    const updated = tableData.map(row => ({
      ...row,
      cells: row.cells.map(cell => {
        if (selectedCells.includes(cell.id)) {
          return { ...cell, textOrientation: (cell.textOrientation === 'vertical' ? 'horizontal' : 'vertical') as 'horizontal'|'vertical' } 
        }
        return cell;
      })
    }));
    handleUpdateActiveTabRows(updated);
  };

  const mergeCells = () => {
    if (selectedCells.length < 2 || !activeTab) return alert("Selecciona 2+ celdas.");
    let posFirst=null, minR=Infinity, maxR=-1, minC=Infinity, maxC=-1, content=[];
    for(let r=0;r<tableData.length;r++){
      for(let c=0;c<tableData[r].cells.length;c++){
        const cell=tableData[r].cells[c];
        if(selectedCells.includes(cell.id)){
          if(!posFirst) posFirst={rowIndex:r, colIndex:c};
          minR=Math.min(minR,r); maxR=Math.max(maxR,r+cell.rowSpan-1);
          minC=Math.min(minC,c); maxC=Math.max(maxC,c+cell.colSpan-1);
          if(cell.content) content.push(cell.content);
        }
      }
    }
    if(posFirst){
      const {rowIndex, colIndex}=posFirst; const firstId=tableData[rowIndex].cells[colIndex].id;
      const updated=tableData.map(row=>({...row,cells:row.cells.map(cell=>{
        if(cell.id===firstId) return {...cell, rowSpan:maxR-minR+1, colSpan:maxC-minC+1, content:content.join("\n")};
        if(selectedCells.includes(cell.id)) return {...cell, rowSpan:0, colSpan:0};
        return cell;
      })}));
      handleUpdateActiveTabRows(updated); setSelectedCells([firstId]);
    }
  };

  const handlePrintToPdf = async () => { 
    if(!activeSyllabus) return;

    // --- FIRMAS del documento (para sección VISADO al final) ---
    let firmasData: any = null
    if (activeSyllabusId) {
      try {
        const fr = await Promise.race([
          apiRequest(`/firmas/syllabus/${activeSyllabusId}`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ])
        if ((fr as any).success) firmasData = (fr as any).data
      } catch { /* firmas no disponibles o timeout */ }
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginL = 10;
    const marginR = 10;
    const contentWidth = pageWidth - marginL - marginR;

    // --- LOGO ---
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject();
          logoImg.src = '/images/unesum-logo-official.png';
        }),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
      ]);
      doc.addImage(logoImg, 'PNG', marginL, 3, 12, 12);
    } catch { /* logo no disponible */ }

    // --- ENCABEZADO ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ', pageWidth / 2, 6, { align: 'center' });
    doc.setFontSize(8);
    doc.text('SYLLABUS DE ASIGNATURA', pageWidth / 2, 11, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(activeSyllabus.name || '', pageWidth / 2, 15, { align: 'center' });

    let currentY = 19;

    // Helper: detectar si es la primera sección (datos generales)
    const isFirstSectionTab = (title: string) => {
      const t = title.toUpperCase();
      return t.includes('GENERAL') || t.includes('INFORMACIÓN') || t.includes('DATOS') || t.includes('INFORMACION');
    };

    // --- GENERAR CONTENIDO POR CADA PESTAÑA ---
    for (const tab of activeSyllabus.tabs) {
      if (!tab.rows || tab.rows.length === 0) continue;

      // Nueva página si no hay espacio suficiente para título + al menos el header + primera fila de datos
      // Para ESTRUCTURA se necesita más espacio (~80mm) para header + primera fila de datos
      const isEstructuraSectionPreCheck = tab.title.toUpperCase().includes('ESTRUCTURA') || tab.title.toUpperCase().includes('ASIGNATURA');
      const minSpace = isEstructuraSectionPreCheck ? 80 : 25;
      if (currentY + minSpace > pageHeight - 10) { doc.addPage(); currentY = 10; }

      // Guardar posición antes de dibujar título (para calcular startY de la tabla)
      const titleStartY = currentY;

      // Título de sección con estilo profesional
      currentY += 1.5; // espacio antes del título
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(25, 50, 95); // azul oscuro
      doc.text(tab.title.toUpperCase(), marginL, currentY);
      // Línea decorativa debajo del título
      currentY += 1;
      doc.setDrawColor(25, 50, 95);
      doc.setLineWidth(0.4);
      doc.line(marginL, currentY, marginL + contentWidth, currentY);
      currentY += 2;

      // Guardar info del título para redibujar si autoTable salta de página
      const sectionTitle = tab.title.toUpperCase();
      const titlePageNum = doc.getNumberOfPages();

      const isFirstSection = isFirstSectionTab(tab.title);
      const isVisadoSection = tab.title.toUpperCase().includes('VISADO') || tab.title.toUpperCase().includes('LEGALIZACIÓN') || tab.title.toUpperCase().includes('LEGALIZACION');
      const isEstructuraSection = tab.title.toUpperCase().includes('ESTRUCTURA') || tab.title.toUpperCase().includes('ASIGNATURA');

      if (isFirstSection) {
        // ======= PRIMERA SECCIÓN: Reconstruir como tabla limpia de 3 columnas =======
        // Esto evita que los colSpan subyacentes compriman las columnas de valor
        const cleanRows: any[][] = [];

        for (const row of tab.rows) {
          const visible = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          if (visible.length === 0) continue;

          if (visible.length === 1) {
            // Fila con una sola celda: título/header que abarca todo
            const txt = (visible[0].content || '').trim();
            if (!txt) continue;
            cleanRows.push([{
              content: txt, colSpan: 3,
              styles: { fontStyle: 'bold' as const, fillColor: '#E5E7EB', halign: 'left' as const, fontSize: 8 }
            }]);
          } else {
            // Separar en: label, separador, valor(es)
            let label = '';
            let sep = '';
            let values: string[] = [];

            for (let ci = 0; ci < visible.length; ci++) {
              const txt = (visible[ci].content || '').trim();
              const isSep = txt === ':' || (txt.length <= 2 && txt.length > 0 && !/[a-zA-Z0-9]/.test(txt));
              
              if (ci === 0) { label = txt; }
              else if (isSep && !sep) { sep = txt; }
              else { values.push(txt); }
            }

            const valueTxt = values.join(' ').trim();

            cleanRows.push([
              { content: label, styles: { fontStyle: 'bold' as const, fillColor: '#F9FAFB', halign: 'left' as const } },
              { content: sep || ':', styles: { halign: 'center' as const, fillColor: '#FFFFFF' } },
              { content: valueTxt, styles: { fontStyle: 'normal' as const, fillColor: '#FFFFFF', halign: 'left' as const } },
            ]);
          }
        }

        if (cleanRows.length > 0) {
          // Anchos: label=30%, sep=2%, valor=68% del contentWidth
          const labelW = contentWidth * 0.30;
          const sepW = contentWidth * 0.02;
          const valW = contentWidth * 0.68;

          autoTable(doc, {
            body: cleanRows as any,
            startY: currentY,
            theme: 'grid',
            columnStyles: {
              0: { cellWidth: labelW },
              1: { cellWidth: sepW },
              2: { cellWidth: valW },
            },
            styles: {
              fontSize: 8,
              cellPadding: { top: 0.5, right: 1, bottom: 0.5, left: 1 },
              lineColor: '#9CA3AF',
              lineWidth: 0.15,
              overflow: 'linebreak',
              halign: 'left',
              valign: 'top',
              textColor: '#1F2937',
            },
            margin: { left: marginL, right: marginR },
            tableWidth: contentWidth,
          });

          currentY = (doc as any).lastAutoTable?.finalY || (doc as any).previousAutoTable?.finalY || currentY + 10;
          // Si autoTable saltó a nueva página, borrar título huérfano
          const pagesAfter1 = doc.getNumberOfPages();
          if (pagesAfter1 > titlePageNum) {
            doc.setPage(titlePageNum);
            doc.setFillColor(255, 255, 255);
            doc.rect(marginL - 1, titleStartY - 1, contentWidth + 2, 8, 'F');
            doc.setPage(pagesAfter1);
          }
          currentY += 2; // más espacio entre secciones
        }
      } else {
        // ======= SECCIONES NORMALES: renderizar fiel con rowSpan/colSpan =======

        // PASO 1: Identificar el header - buscar la fila que tiene el flag isHeader=true
        // en ALL sus celdas visibles Y cuyo texto promedio es corto (títulos de columna)
        let headerRowIdx = -1;
        for (let ri = 0; ri < tab.rows.length; ri++) {
          const vis = tab.rows[ri].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          if (vis.length < 3) continue;
          const allAreHeader = vis.every(c => c.isHeader);
          const avgLen = vis.reduce((sum, c) => sum + (c.content || '').trim().length, 0) / vis.length;
          // Header real: todas marcadas isHeader Y texto promedio corto (<=40 chars = títulos)
          if (allAreHeader && avgLen <= 40) { headerRowIdx = ri; break; }
        }
        // Fallback: si no encontró por isHeader, usar la primera fila con 3+ celdas
        if (headerRowIdx === -1) {
          for (let ri = 0; ri < tab.rows.length; ri++) {
            const vis = tab.rows[ri].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
            if (vis.length >= 3) { headerRowIdx = ri; break; }
          }
        }

        // PASO 2: Determinar columnas lógicas - usar las filas de DATOS (no header)
        // El header puede tener colSpans que inflan el conteo con columnas fantasma
        const colCounts: number[] = [];
        for (let ri = 0; ri < tab.rows.length; ri++) {
          if (ri === headerRowIdx) continue; // saltar header
          const vis = tab.rows[ri].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          if (vis.length === 0) continue;
          const logCols = vis.reduce((sum, c) => sum + (c.colSpan || 1), 0);
          colCounts.push(logCols);
        }
        // Usar la MODA (el valor más frecuente) como número real de columnas
        let maxLogCols = 0;
        if (colCounts.length > 0) {
          const freq: Record<number, number> = {};
          for (const n of colCounts) freq[n] = (freq[n] || 0) + 1;
          let bestCount = 0;
          for (const [cols, count] of Object.entries(freq)) {
            if (count > bestCount) { bestCount = count; maxLogCols = Number(cols); }
          }
        }
        // Fallback: si no hay datos, usar el header
        if (maxLogCols === 0 && headerRowIdx >= 0) {
          const hdrVis = tab.rows[headerRowIdx].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          maxLogCols = hdrVis.reduce((sum, c) => sum + (c.colSpan || 1), 0);
        }

        // PASO 3: Detectar tipos de columna desde el header
        type ColType = 'unidad' | 'contenido' | 'horas' | 'pfae' | 'metodologia' | 'recursos' | 'escenario' | 'biblio' | 'fecha' | 'separator' | 'resultado' | 'criterio' | 'instrumento' | 'other';
        const colTypeMap: Record<number, ColType> = {};

        if (headerRowIdx >= 0) {
          const hdrCells = tab.rows[headerRowIdx].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          let colIdx = 0;
          for (const hc of hdrCells) {
            const txt = (hc.content || '').trim().toUpperCase();
            const isSep = txt === ':' || (txt.length <= 2 && txt.length > 0 && !/[A-Z0-9]/.test(txt));
            const span = hc.colSpan || 1;

            let type: ColType = 'other';
            if (isSep) type = 'separator';
            else if (txt.includes('UNIDAD') || txt.includes('TEMÁT') || txt.includes('TEMAT')) type = 'unidad';
            else if (txt.includes('CONTENIDO')) type = 'contenido';
            else if (txt.includes('PRESENCIAL') || txt.includes('SINCRÓNIC') || txt.includes('SINCRONIC')) type = 'horas';
            else if (txt === 'PFAE' || txt === 'TA') type = 'pfae';
            else if (txt.includes('METODOLOG') || txt.includes('ENSEÑANZA')) type = 'metodologia';
            else if (txt.includes('RECURSO') || txt.includes('DIDÁCTICO') || txt.includes('DIDACTICO')) type = 'recursos';
            else if (txt.includes('ESCENARIO')) type = 'escenario';
            else if (txt.includes('BIBLIOGRAF') || txt.includes('FUENTE') || txt.includes('CONSULTA')) type = 'biblio';
            else if (txt.includes('FECHA') || txt.includes('PARALELO')) type = 'fecha';
            else if (txt.includes('RESULTADO') || txt.includes('APRENDIZAJE')) type = 'resultado';
            else if (txt.includes('CRITERIO')) type = 'criterio';
            else if (txt.includes('INSTRUMENTO')) type = 'instrumento';

            for (let s = 0; s < span && (colIdx + s) < maxLogCols; s++) {
              colTypeMap[colIdx + s] = type;
            }
            colIdx += span;
          }
        }

        // PASO 4: Calcular anchos proporcionales
        const widthByType: Record<ColType, number> = {
          unidad: 24,        contenido: 50,
          horas: 13,         pfae: 9,
          metodologia: 24,   recursos: 55,
          escenario: 20,     biblio: 38,
          fecha: 26,         separator: 3,
          resultado: 42,     criterio: 36,
          instrumento: 32,   other: 28,
        };

        const colWidthMap: Record<number, number> = {};
        let totalAssigned = 0;
        for (let i = 0; i < maxLogCols; i++) {
          totalAssigned += widthByType[colTypeMap[i] || 'other'];
        }
        if (totalAssigned > 0) {
          const scaleF = contentWidth / totalAssigned;
          for (let i = 0; i < maxLogCols; i++) {
            colWidthMap[i] = Math.round(widthByType[colTypeMap[i] || 'other'] * scaleF * 10) / 10;
          }
        }

        // PASO 5: Construir body (todo va al body para evitar que rowSpan del header se coma filas)
        const body: any[][] = [];

        // Calcular cuántas filas ocupa el header original (su rowSpan máximo)
        let headerOriginalSpan = 1;
        if (headerRowIdx >= 0) {
          const hdrCells = tab.rows[headerRowIdx].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          headerOriginalSpan = Math.max(1, ...hdrCells.map(c => c.rowSpan || 1));
        }

        for (let ri = 0; ri < tab.rows.length; ri++) {
          const row = tab.rows[ri];
          const pdfRow: any[] = [];
          const visibleCells = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          if (visibleCells.length === 0) continue;

          // Saltar filas que estaban absorbidas por el rowSpan del header
          if (headerRowIdx >= 0 && ri > headerRowIdx && ri < headerRowIdx + headerOriginalSpan) continue;

          // Header detectado: estilo diferente, rowSpan forzado a 1
          const isRealHeader = (ri === headerRowIdx);

          let currentLogCol = 0;
          for (const cell of visibleCells) {
            let content = (cell.content || '').replace(/\r\n/g, '\n');
            const contentUp = content.trim().toUpperCase();
            const isVert = cell.textOrientation === 'vertical';

            // Para bibliografías: forzar saltos de línea
            if (!isVert && !isRealHeader && content.includes('B.') && !content.includes('\n')) {
              content = content.replace(/\s+(B\.)/g, '\n$1');
            }

            // Abreviar headers verticales
            let displayContent = content;
            if (isVert && isRealHeader) {
              if (contentUp.includes('METODOLOG')) displayContent = 'Metodología';
              else if (contentUp.includes('ESCENARIO')) displayContent = 'Escenario';
              else if (contentUp.includes('PRESENCIAL')) displayContent = 'HD.\nPresencial';
              else if (contentUp.includes('SINCRÓNIC') || contentUp.includes('SINCRONIC')) displayContent = 'HD.\nSincrónica';
            }

            // Limitar colSpan al máximo real
            let cellSpan = cell.colSpan || 1;
            if (currentLogCol + cellSpan > maxLogCols) {
              cellSpan = Math.max(1, maxLogCols - currentLogCol);
            }

            // CLAVE: Forzar rowSpan=1 para el header para evitar que se coma la primera fila de datos
            const safeRowSpan = isRealHeader ? 1 : (cell.rowSpan || 1);

            // Para VISADO: diferenciar fila de nombres (firma) vs fila de fechas
            const isVisadoDataRow = isVisadoSection && !isRealHeader;
            const isVisadoFechaRow = isVisadoDataRow && content.trim().toLowerCase().startsWith('fecha');
            pdfRow.push({
              content: displayContent,
              rowSpan: safeRowSpan,
              colSpan: cellSpan,
              styles: {
                fontStyle: isRealHeader ? 'bold' as const : 'normal' as const,
                fillColor: isRealHeader ? '#E8EDF2' : (cell.backgroundColor || '#FFFFFF'),
                textColor: isRealHeader ? '#1E3A5F' : '#1F2937',
                fontSize: isVisadoSection ? 10 : isRealHeader ? 7.5 : 8,
                cellPadding: isVisadoFechaRow
                  ? { top: 2, right: 3, bottom: 2, left: 3 }
                  : isVisadoDataRow
                    ? { top: 20, right: 3, bottom: 3, left: 3 }
                    : isRealHeader 
                      ? { top: 1.5, right: 1, bottom: 1.5, left: 1 }
                      : { top: 0.8, right: 0.8, bottom: 0.8, left: 0.8 },
                halign: isVisadoSection ? 'center' as const : isEstructuraSection ? 'center' as const : isRealHeader ? 'center' as const : 'left' as const,
                valign: isVisadoDataRow ? 'bottom' as const : 'middle' as const,
                minCellHeight: isVisadoFechaRow ? 8 : isVisadoDataRow ? 30 : isRealHeader ? 6 : 3,
                overflow: 'linebreak' as const,
              }
            });
            currentLogCol += cellSpan;
          }

          if (pdfRow.length > 0) {
            body.push(pdfRow);
          }
        }

        if (body.length > 0) {
          // Construir columnStyles
          const colStyles: Record<number, { cellWidth: number }> = {};
          for (let i = 0; i < maxLogCols; i++) {
            if (colWidthMap[i]) colStyles[i] = { cellWidth: colWidthMap[i] };
          }

          // Rastrear celdas combinadas (rowSpan>1) para limpiar bordes internos
          const mergedCellsOnPage: Array<{x: number, y: number, w: number, h: number, bg: any, rawContent: string, text: string[], styles: any, page: number}> = [];

          autoTable(doc, {
            body: body as any,
            startY: currentY,
            theme: 'grid',
            styles: {
              fontSize: isVisadoSection ? 10 : 8,
              cellPadding: isVisadoSection 
                ? { top: 6, right: 3, bottom: 6, left: 3 }
                : isEstructuraSection
                  ? { top: 1.2, right: 1, bottom: 1.2, left: 1 }
                  : { top: 0.8, right: 0.8, bottom: 0.8, left: 0.8 },
              lineColor: '#9CA3AF',
              lineWidth: 0.15,
              overflow: 'linebreak',
              halign: isEstructuraSection ? 'center' : 'left',
              valign: 'middle',
              minCellHeight: isVisadoSection ? 20 : 3,
            },
            columnStyles: colStyles,
            margin: { left: marginL, right: marginR, top: 15 },
            tableWidth: contentWidth,
            didDrawCell: (data: any) => {
              // Para sección ESTRUCTURA: registrar celdas combinadas para limpiar bordes internos
              if (isEstructuraSection && data.cell.rowSpan > 1) {
                const rawContent = typeof data.cell.raw === 'object' ? (data.cell.raw?.content || '') : (data.cell.raw || '');
                mergedCellsOnPage.push({
                  x: data.cell.x,
                  y: data.cell.y,
                  w: data.cell.width,
                  h: data.cell.height,
                  bg: data.cell.styles.fillColor,
                  rawContent: String(rawContent),
                  text: data.cell.text || [],
                  styles: { ...data.cell.styles },
                  page: doc.getNumberOfPages()
                });
              }
            },
            didDrawPage: (data: any) => {
              // Limpiar bordes internos en celdas combinadas de ESTRUCTURA
              if (isEstructuraSection && mergedCellsOnPage.length > 0) {
                const currentPage = doc.getNumberOfPages();
                for (const mc of mergedCellsOnPage) {
                  if (mc.page !== currentPage) continue;
                  // Rellenar el interior de la celda combinada para ocultar líneas internas
                  const bg = mc.bg;
                  if (bg) {
                    if (typeof bg === 'string') doc.setFillColor(bg);
                    else if (Array.isArray(bg)) doc.setFillColor(bg[0] || 255, bg[1] || 255, bg[2] || 255);
                    else doc.setFillColor(255, 255, 255);
                  } else {
                    doc.setFillColor(255, 255, 255);
                  }
                  const lw = 0.15;
                  doc.rect(mc.x + lw, mc.y + lw, mc.w - 2 * lw, mc.h - 2 * lw, 'F');

                  // Redibujar el texto de la celda combinada - calcular posición manualmente
                  const textLines = mc.text && mc.text.length > 0 ? mc.text : (mc.rawContent ? mc.rawContent.split('\n') : []);
                  if (textLines.length > 0 && textLines.some((t: string) => t.trim().length > 0)) {
                    const tc = mc.styles.textColor;
                    if (tc) {
                      if (typeof tc === 'string') doc.setTextColor(tc);
                      else if (Array.isArray(tc)) doc.setTextColor(tc[0], tc[1], tc[2]);
                      else doc.setTextColor(31, 41, 55);
                    }
                    const fs = mc.styles.fontSize || 8;
                    doc.setFontSize(fs);
                    doc.setFont('helvetica', mc.styles.fontStyle || 'normal');

                    // Calcular posición del texto basado en alineación
                    const pad = 1.2;
                    const cellInnerW = mc.w - 2 * pad;
                    const halign = mc.styles.halign || 'center';
                    let textX: number;
                    if (halign === 'center') textX = mc.x + mc.w / 2;
                    else if (halign === 'right') textX = mc.x + mc.w - pad;
                    else textX = mc.x + pad;

                    // Posición vertical centrada en la celda
                    const lineH = fs * 0.4; // aprox altura de línea en mm
                    const totalTextH = textLines.length * lineH;
                    const textY = mc.y + (mc.h - totalTextH) / 2 + lineH * 0.7;

                    for (let li = 0; li < textLines.length; li++) {
                      const line = textLines[li];
                      if (line.trim().length === 0) continue;
                      doc.text(line, textX, textY + li * lineH, {
                        align: halign,
                        maxWidth: cellInnerW
                      });
                    }
                  }

                  // Redibujar los bordes exteriores de la celda combinada
                  doc.setDrawColor('#9CA3AF');
                  doc.setLineWidth(lw);
                  doc.rect(mc.x, mc.y, mc.w, mc.h, 'S');
                }
                mergedCellsOnPage.length = 0;
              }

              // Redibujar título de sección en páginas de continuación de la tabla
              if (data.pageNumber > 1 || data.pageCount > 1) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(25, 50, 95);
                doc.text(sectionTitle + ' (cont.)', marginL, 10);
                doc.setDrawColor(25, 50, 95);
                doc.setLineWidth(0.4);
                doc.line(marginL, 11, marginL + contentWidth, 11);
              }
            },
          });

          currentY = (doc as any).lastAutoTable?.finalY || (doc as any).previousAutoTable?.finalY || currentY + 10;
          // Si autoTable saltó a nueva página, borrar título huérfano y redibujar
          const pagesAfter2 = doc.getNumberOfPages();
          if (pagesAfter2 > titlePageNum) {
            doc.setPage(titlePageNum);
            doc.setFillColor(255, 255, 255);
            doc.rect(marginL - 1, titleStartY - 1, contentWidth + 2, 8, 'F');
            doc.setPage(pagesAfter2);
          }
          currentY += 2;
        }
      }
    }

    // ─── SECCIÓN VISADO ────────────────────────────────────────────────────
    const VISADO_ETAPAS_SYL = [
      { etapa: 'decano',             label: 'DECANO/A DE FACULTAD' },
      { etapa: 'director_academico', label: 'DIRECTOR/A ACADÉMICO/A' },
      { etapa: 'coordinador',        label: 'COORDINADOR/A DE CARRERA' },
      { etapa: 'docente',            label: 'DOCENTE' },
    ]
    const VTITLE_H = 5, VHEADER_H = 7, VSIGN_H = 36
    const VTOTAL = VTITLE_H + VHEADER_H + VSIGN_H + 3

    if (currentY + VTOTAL > pageHeight - 5) { doc.addPage(); currentY = 8 }
    currentY += 3

    doc.setFillColor(25, 50, 95)
    doc.rect(marginL, currentY, contentWidth, VTITLE_H, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('VISADO', marginL + 4, currentY + 3.5)
    currentY += VTITLE_H

    const vColW = contentWidth / 4

    doc.setFillColor(220, 229, 242)
    doc.rect(marginL, currentY, contentWidth, VHEADER_H, 'F')
    doc.setDrawColor(180, 190, 210)
    doc.setLineWidth(0.12)
    doc.rect(marginL, currentY, contentWidth, VHEADER_H)
    VISADO_ETAPAS_SYL.forEach((cfg, i) => {
      const x = marginL + i * vColW
      if (i > 0) doc.line(x, currentY, x, currentY + VHEADER_H)
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(25, 50, 95)
      const lns = doc.splitTextToSize(cfg.label, vColW - 3)
      doc.text(lns, x + vColW / 2, currentY + 4, { align: 'center' })
    })
    currentY += VHEADER_H

    doc.setDrawColor(180, 190, 210)
    doc.setLineWidth(0.12)
    doc.rect(marginL, currentY, contentWidth, VSIGN_H)
    VISADO_ETAPAS_SYL.forEach((cfg, i) => {
      const x = marginL + i * vColW
      if (i > 0) doc.line(x, currentY, x, currentY + VSIGN_H)
      const etapaInfo = firmasData?.etapas?.find((e: any) => e.etapa === cfg.etapa)
      if (etapaInfo?.firmado && etapaInfo.firma) {
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 30, 30)
        const lns = doc.splitTextToSize(etapaInfo.firma.usuario_nombre || '', vColW - 4)
        doc.text(lns, x + vColW / 2, currentY + 6, { align: 'center' })
        if (etapaInfo.firma.qr_data_url) {
          try {
            const qrSz = 16
            doc.addImage(etapaInfo.firma.qr_data_url, 'PNG', x + (vColW - qrSz) / 2, currentY + 10, qrSz, qrSz)
          } catch {}
        }
        const fecha = `Fecha: ${new Date(etapaInfo.firma.firmado_at).toLocaleDateString('es-EC')}`
        doc.setFontSize(5.5)
        doc.setTextColor(80, 80, 80)
        doc.text(fecha, x + vColW / 2, currentY + VSIGN_H - 3, { align: 'center' })
      } else {
        doc.setFontSize(6)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text('Pendiente de firma', x + vColW / 2, currentY + VSIGN_H / 2 + 3, { align: 'center' })
      }
    })

    doc.save(`Syllabus_${activeSyllabus.name}.pdf`);
  }

  const formatPeriodoSimple = (periodoIdOrName: string) => {
    if (!periodoIdOrName) return "";
    // Buscar nombre del periodo por ID
    const periodoObj = periodos.find((p: any) => p.id?.toString() === periodoIdOrName);
    const nombre = periodoObj?.nombre || periodoIdOrName;
    const match = nombre.match(/(P[IVX]+\s\d{4})/i);
    return match ? match[0].toUpperCase() : nombre;
  };

  const getAutoFilledContent = (cell: TableCell, rowIndex: number, cellIndex: number): string => {
    if (!asignaturaInfo || rowIndex > 5) return cell.content || "";
    const currentRow = tableData[rowIndex];
    if (cellIndex > 0 && currentRow) {
      const etiqueta = currentRow.cells[cellIndex - 1]?.content?.toUpperCase().trim() || "";
      if (etiqueta === "ASIGNATURA") return `${asignaturaInfo.codigo || ""} - ${asignaturaInfo.nombre || ""}`;
      if (etiqueta === "PERIODO ACADÉMICO ORDINARIO (PAO)" || etiqueta === "PAO") return formatPeriodoSimple(selectedPeriod) || cell.content || "";
      if (etiqueta === "NIVEL") return asignaturaInfo.nivel?.nombre || "";
    }
    return cell.content || "";
  };

  const isCellReadOnly = (cell: TableCell, rowIndex: number, cellIndex: number): boolean => {
    if (rowIndex > 5) return false;
    const currentRow = tableData[rowIndex];
    if (cellIndex > 0 && currentRow) {
      const etiqueta = currentRow.cells[cellIndex - 1]?.content?.toUpperCase().trim() || "";
      return ["ASIGNATURA", "NIVEL", "PAO", "PERIODO ACADÉMICO ORDINARIO (PAO)"].includes(etiqueta);
    }
    return false;
  };

  return (
    <ProtectedRoute allowedRoles={["administrador", "comision_academica", "comision", "profesor"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          {!activeSyllabus ? (
            <>
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-emerald-800">
                    <span>Editor de Syllabus - Comisión Académica</span>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowSyllabusSelector(true)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-1/2 space-y-2">
                    <Label>Periodo</Label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger><SelectValue placeholder="Seleccione el periodo" /></SelectTrigger>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem key={periodo.id} value={periodo.id.toString()}>{periodo.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {showSyllabusSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Seleccionar Syllabus</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowSyllabusSelector(false)}><X className="h-5 w-5" /></Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                        {isLoading ? "Procesando..." : <><Upload className="h-4 w-4 mr-2" /> Subir Nuevo Word (.docx)</>}
                      </Button>
                      <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { handleSyllabusUpload(e); setShowSyllabusSelector(false); }} className="hidden" />
                      
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">O seleccione uno existente:</h3>
                        {isListLoading ? <p className="text-center py-4">Cargando...</p> : syllabiFiltered.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {syllabiFiltered.map(s => (
                              <div key={`modal-${s.id}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div><p className="font-medium">{s.nombre}</p><p className="text-sm text-gray-500">{s.periodo} - {s.materias}</p></div>
                                <Button onClick={() => { handleLoadSyllabus(s.id.toString()); setShowSyllabusSelector(false); }} className="bg-emerald-600">Seleccionar</Button>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-center text-gray-500 py-4">No hay Syllabus para este periodo</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tabla de Syllabus Disponibles filtrados por periodo (como admin) */}
              <Card>
                <CardHeader>
                  <CardTitle>Syllabus Disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  {isListLoading ? (
                    <p className="text-center py-8">Cargando...</p>
                  ) : syllabiFiltered.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Periodo</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Materias</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Origen</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {syllabiFiltered.map(s => (
                            <tr key={`list-${s.id}`} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">{s.nombre}</td>
                              <td className="px-4 py-3 text-sm">{s.periodo}</td>
                              <td className="px-4 py-3 text-sm">{s.materias}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${(s as any)._source === 'comision' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {(s as any)._source === 'comision' ? 'Comisión' : 'General'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <Button size="sm" onClick={() => handleLoadSyllabus(s.id.toString())} className="bg-emerald-600 hover:bg-emerald-700">
                                  Cargar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      {selectedPeriod ? 'No hay syllabus disponibles para este periodo. Use el botón "Nuevo" para subir uno.' : 'Seleccione un periodo para ver los syllabus disponibles.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-emerald-800">
                    <span className="truncate">{activeSyllabus.name}</span>
                    <div className="flex gap-2 flex-wrap">
                       <Button onClick={() => { setActiveSyllabusId(null); setSyllabi([]); }} variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Nuevo</Button>
                       <Button onClick={handleSaveToDB} className="bg-blue-600 hover:bg-blue-700" size="sm" disabled={isSaving}>{isSaving ? "Guardando..." : <><Save className="h-4 w-4 mr-2"/> Guardar</>}</Button>
                       <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!activeTab}><FileDown className="h-4 w-4 mr-2" /> Exportar PDF</Button>
                       {typeof activeSyllabus.id === 'number' && (
                         <Button
                           onClick={() => setShowDeleteConfirm(true)}
                           variant="outline"
                           size="sm"
                           className="border-red-300 text-red-600 hover:bg-red-50"
                         >
                           <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                         </Button>
                       )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h4 className="text-amber-800 font-bold flex items-center gap-2">
                          <FileText className="h-5 w-5" /> Sincronización Inteligente
                        </h4>
                        <p className="text-amber-700 text-sm">
                          Sube el Word lleno — todas las pestañas se auto-completarán automáticamente.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => fileInputRefSync.current?.click()}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          disabled={isLoading}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {isLoading ? 'Procesando...' : 'Subir Word y Auto-Mapear'}
                        </Button>
                        {wordRawTables.length > 0 && (
                          <Button
                            onClick={() => setShowWordPreview(!showWordPreview)}
                            variant="outline"
                            className="text-blue-700"
                          >
                            <FileText className="h-4 w-4 mr-1" /> Ver Tablas
                          </Button>
                        )}
                      </div>
                      <input type="file" ref={fileInputRefSync} className="hidden" accept=".docx" onChange={handleSmartSync} />
                    </div>
                    {autoMapResult && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2 text-green-800 text-sm">
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                        <span>
                          ✅ Auto-mapeo completado: <strong>{autoMapResult.tabsImportados}</strong> de <strong>{autoMapResult.totalTablas}</strong> secciones llenadas automáticamente.
                          Revisa cada pestaña y guarda cuando estés conforme.
                        </span>
                        <button onClick={() => setAutoMapResult(null)} className="ml-auto text-green-600 hover:text-green-800">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="mb-4 select-none border-b border-emerald-100 pb-1.5 flex flex-wrap gap-1">
                {activeSyllabus.tabs.map(tab => (
                  <div key={tab.id} className="relative group">
                    {editingTabId === tab.id ? (
                      <div className="flex items-center bg-white border border-emerald-500 rounded px-1 h-7">
                        <Input value={tempTabTitle} onChange={(e) => setTempTabTitle(e.target.value)} className="h-6 w-36 text-xs border-none focus-visible:ring-0" autoFocus onKeyDown={(e) => e.key === "Enter" && saveTabRename()} onBlur={saveTabRename} />
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={saveTabRename}><Check className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <div onClick={() => setActiveTabId(tab.id)} onDoubleClick={() => startRenamingTab(tab)} className={`flex items-center h-7 px-2.5 rounded border cursor-pointer text-[11px] font-medium ${activeTabId === tab.id ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}>
                        <span className="mr-1.5">{tab.title}</span>
                        <div className={`flex gap-0.5 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                           <Pencil className="h-2.5 w-2.5" onClick={(e) => { e.stopPropagation(); startRenamingTab(tab); }} />
                           <X className="h-3 w-3 hover:text-red-500" onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={addTab} variant="outline" size="sm" className="h-7 text-[11px] border-dashed border-emerald-300 px-2"><Plus className="h-3 w-3 mr-0.5" /> Nueva Sección</Button>
              </div>

              {activeTab && (
                <Card className="border-emerald-100 shadow-md">
                  <CardContent className="p-4">
                    <div className={`flex flex-wrap gap-2 mb-2 p-2 border rounded-md bg-emerald-50/50 ${HERRAMIENTAS_TABLA_BLOQUEADAS ? "opacity-60 pointer-events-none" : ""}`}>
                       <Button size="sm" onClick={() => handleInsertRow('above')} disabled={!selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS}><Plus className="h-3 w-3 mr-1"/>Fila ↑</Button>
                       <Button size="sm" onClick={() => handleInsertRow('below')} disabled={!selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS}><Plus className="h-3 w-3 mr-1"/>Fila ↓</Button>
                       <Button size="sm" onClick={() => handleInsertColumn('left')} disabled={!selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS}><Plus className="h-3 w-3 mr-1"/>Col ←</Button>
                       <Button size="sm" onClick={() => handleInsertColumn('right')} disabled={!selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS}><Plus className="h-3 w-3 mr-1"/>Col →</Button>
                       <div className="w-px h-6 bg-emerald-200 mx-1"></div>
                       <Button size="sm" onClick={removeSelectedRow} className="bg-red-50 text-red-600" disabled={!selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS}><Minus className="h-3 w-3 mr-1"/>Fila</Button>
                       <Button size="sm" onClick={removeSelectedColumn} className="bg-red-50 text-red-600" disabled={!selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS}><Minus className="h-3 w-3 mr-1"/>Col</Button>
                       <div className="w-px h-6 bg-emerald-200 mx-1"></div>
                       <Button size="sm" onClick={toggleVerticalText} disabled={!selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS}><ArrowUpFromLine className="h-4 w-4 mr-1" /> Vertical</Button>
                       <Button size="sm" onClick={mergeCells} disabled={selectedCells.length < 2 || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS} variant="outline"><Merge className="h-4 w-4 mr-1" />Unir</Button>
                       <Button size="sm" onClick={clearSelectedCells} disabled={!selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS} variant="outline"><Trash2 className="h-4 w-4 mr-1" />Limpiar</Button>
                       <div className="w-px h-6 bg-emerald-200 mx-1"></div>
                       <Button 
                         size="sm" 
                         onClick={() => setConfigModeDocente(!configModeDocente)} 
                         className={configModeDocente ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}
                         variant={configModeDocente ? "default" : "outline"}
                         disabled={HERRAMIENTAS_TABLA_BLOQUEADAS}
                       >
                         <Settings className="h-4 w-4 mr-1" />
                         {configModeDocente ? 'Salir Config. Docente' : 'Config. Celdas Docente'}
                       </Button>
                    </div>
                    {HERRAMIENTAS_TABLA_BLOQUEADAS && (
                      <p className="text-xs text-slate-600 mb-4 flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        Caja de herramientas bloqueada: la estructura la define el administrador. Solo puede editar el contenido de las celdas permitidas.
                      </p>
                    )}

                    {configModeDocente && !HERRAMIENTAS_TABLA_BLOQUEADAS && (
                      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-purple-800 font-bold text-sm flex items-center gap-2">
                            <Settings className="h-4 w-4" /> Modo Configuración: Permisos del Docente
                          </h4>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-700 border-green-300 h-7 text-xs" onClick={() => toggleDocenteEditableAll(true)}>
                              <Unlock className="h-3 w-3 mr-1" /> Habilitar Todas
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-700 border-red-300 h-7 text-xs" onClick={() => toggleDocenteEditableAll(false)}>
                              <Lock className="h-3 w-3 mr-1" /> Bloquear Todas
                            </Button>
                          </div>
                        </div>
                        <p className="text-purple-600 text-xs">
                          Haz clic en cada celda para alternar si el docente puede editarla.
                          <span className="inline-flex items-center gap-1 ml-2"><span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block"></span> = Editable</span>
                          <span className="inline-flex items-center gap-1 ml-2"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"></span> = Bloqueada</span>
                          <span className="inline-flex items-center gap-1 ml-2"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block"></span> = Sin configurar (usa lógica automática)</span>
                        </p>
                      </div>
                    )}

                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white max-h-[75vh] overflow-y-auto custom-scrollbar">
                      <table className="border-collapse text-xs text-left" style={{ tableLayout: (activeTab && (activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS'))) ? 'fixed' : 'auto', width: '100%', maxWidth: '100%' }}> 
                        <tbody className="divide-y divide-gray-200">
                          {tableData.length === 0 ? (
                            <tr><td className="p-12 text-center text-gray-500">La tabla está vacía. Importe o cree una nueva.</td></tr>
                          ) : (
                            tableData.map((row, rowIndex) => {
                              const isFirstSectionRow = activeTab && (activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS'));
                              const rowVisibleCols = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                              const isFormRow = isFirstSectionRow && rowVisibleCols <= 4;
                              return (
                              <tr key={row.id} className={`transition-colors ${isFormRow ? 'hover:bg-slate-50/80' : 'hover:bg-blue-50/50'}`}>
                                {row.cells.map((cell, cellIndex) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;
                                  
                                  const contentTrimmed = cell.content.trim();
                                  const isSelected = selectedCells.includes(cell.id);
                                  const isReadOnly = isCellReadOnly(cell, rowIndex, cellIndex);
                                  const displayContent = getAutoFilledContent(cell, rowIndex, cellIndex);

                                  // Determinar si estamos en la primera sección (datos generales, filas con pocas columnas)
                                  const isFirstSection = activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS');
                                  // En la primera sección (datos generales) nunca mostrar texto vertical
                                  // Para datos como "Presencial-Áulico": nunca vertical (tiene guion o >14 chars)
                                  const isVertical = (() => {
                                    if (cell.textOrientation !== 'vertical') return false;
                                    if (isFirstSection) return false;
                                    if (contentTrimmed.includes('-') || contentTrimmed.length > 14) return false;
                                    return true;
                                  })();

                                  // Detector de separadores (":" y similares)
                                  const isSeparator = contentTrimmed === ':' || (contentTrimmed.length <= 2 && !/[a-zA-Z0-9]/.test(contentTrimmed) && contentTrimmed.length > 0);

                                  const totalVisibleCols = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                                  const isSimpleRow = totalVisibleCols <= 4; // filas tipo etiqueta-valor

                                  // Detectar tipo de columna desde el header de esta pestaña
                                  const getHeaderColType = () => {
                                    if (!activeTab || !activeTab.rows) return 'other';
                                    // Buscar la fila header
                                    for (const hRow of activeTab.rows) {
                                      const vis = hRow.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
                                      if (vis.length < 3 || !vis.every(c => c.isHeader)) continue;
                                      // Encontrar qué header corresponde a este cellIndex
                                      let col = 0;
                                      for (const hc of vis) {
                                        const span = hc.colSpan || 1;
                                        if (cellIndex >= col && cellIndex < col + span) {
                                          const t = (hc.content || '').trim().toUpperCase();
                                          if (t.includes('UNIDAD') || t.includes('TEMÁT') || t.includes('TEMAT')) return 'unidad';
                                          if (t.includes('CONTENIDO')) return 'contenido';
                                          if (t.includes('RESULTADO') || t.includes('APRENDIZAJE')) return 'resultado';
                                          if (t.includes('CRITERIO')) return 'criterio';
                                          if (t.includes('INSTRUMENTO')) return 'instrumento';
                                          if (t.includes('METODOLOG') || t.includes('ENSEÑANZA')) return 'metodologia';
                                          if (t.includes('RECURSO') || t.includes('DIDÁCTICO')) return 'recursos';
                                          if (t.includes('ESCENARIO')) return 'escenario';
                                          if (t.includes('BIBLIOGRAF') || t.includes('FUENTE')) return 'biblio';
                                          if (t.includes('FECHA') || t.includes('PARALELO')) return 'fecha';
                                          if (t.includes('PRESENCIAL') || t.includes('SINCRÓNIC') || t.includes('SINCRONIC')) return 'horas';
                                          if (t === 'PFAE' || t === 'TA') return 'pfae';
                                          return 'other';
                                        }
                                        col += span;
                                      }
                                      break;
                                    }
                                    return 'other';
                                  };
                                  const colType = cell.isHeader ? getHeaderColType() : getHeaderColType();

                                  // Anchos proporcionales por tipo de columna
                                  const colWidthConfig: Record<string, { w: string, min: string, max: string }> = {
                                    unidad: { w: 'auto', min: '100px', max: '160px' },
                                    contenido: { w: 'auto', min: '130px', max: '220px' },
                                    resultado: { w: 'auto', min: '130px', max: '250px' },
                                    criterio: { w: 'auto', min: '100px', max: '180px' },
                                    instrumento: { w: 'auto', min: '100px', max: '170px' },
                                    metodologia: { w: 'auto', min: '100px', max: '180px' },
                                    recursos: { w: 'auto', min: '120px', max: '200px' },
                                    escenario: { w: 'auto', min: '80px', max: '130px' },
                                    biblio: { w: 'auto', min: '100px', max: '170px' },
                                    fecha: { w: 'auto', min: '80px', max: '140px' },
                                    horas: { w: 'auto', min: '35px', max: '55px' },
                                    pfae: { w: 'auto', min: '30px', max: '45px' },
                                    other: { w: 'auto', min: '60px', max: 'none' },
                                  };

                                  // Lógica de anchos compacta
                                  const dims = (() => {
                                    if (isFirstSection && isSimpleRow) {
                                      // Primera sección: layout tipo formulario
                                      if (isSeparator) return { w: '18px', min: '18px', max: '18px' };
                                      if (cellIndex === 0) return { w: '250px', min: '200px', max: '300px' };
                                      // Valor: ocupa el resto
                                      return { w: 'auto', min: '60px', max: 'none' };
                                    }
                                    if (isVertical) return { w: '28px', min: '28px', max: '28px' };
                                    if (isSeparator) return { w: '20px', min: '20px', max: '20px' };
                                    if (contentTrimmed.length <= 4 && cellIndex > 1 && !cell.isHeader) return { w: '35px', min: '35px', max: '45px' };
                                    // Usar anchos por tipo de columna detectado desde headers
                                    if (colType !== 'other') return colWidthConfig[colType];
                                    if (cellIndex === 0) return { w: 'auto', min: '100px', max: '160px' };
                                    return { w: 'auto', min: '60px', max: 'none' };
                                  })();
                                  const cellWidth = dims.w;
                                  const cellMinW = dims.min;
                                  const cellMaxW = dims.max;

                                  // Estilo especial para primera sección (formulario)
                                  const isFirstSectionLabel = isFirstSection && isSimpleRow && cellIndex === 0;
                                  const isFirstSectionValue = isFirstSection && isSimpleRow && cellIndex > 0 && !isSeparator;

                                  // Detectar si estamos en pestaña VISADO
                                  const isVisadoTab = activeTab.title.toUpperCase().includes('VISADO') || activeTab.title.toUpperCase().includes('LEGALIZACIÓN') || activeTab.title.toUpperCase().includes('LEGALIZACION');
                                  // Centrar verticalmente: headers, celdas con rowSpan grande, VISADO, y todas las celdas de tablas con muchas columnas
                                  const shouldCenterVertically = cell.isHeader || (cell.rowSpan && cell.rowSpan > 1) || isVisadoTab || totalVisibleCols >= 3;
                                  const vertAlign = shouldCenterVertically ? 'align-middle' : 'align-top';

                                  // Config mode docente: visual indicator
                                  const docenteFlag = cell.docenteEditable;
                                  const configModeClass = configModeDocente
                                    ? docenteFlag === true
                                      ? 'ring-2 ring-inset ring-green-500 bg-green-50/60 cursor-pointer'
                                      : docenteFlag === false
                                        ? 'ring-2 ring-inset ring-red-400 bg-red-50/60 cursor-pointer'
                                        : 'ring-1 ring-inset ring-gray-300 bg-gray-50/40 cursor-pointer'
                                    : '';

                                  return (
                                    <td
                                      key={cell.id}
                                      className={`border relative ${vertAlign} ${
                                        configModeDocente ? configModeClass : (
                                        isFirstSectionLabel 
                                          ? 'border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 font-semibold text-gray-700'
                                          : isFirstSectionValue
                                            ? 'border-gray-200 bg-white text-gray-800'
                                            : cell.isHeader 
                                              ? 'border-gray-300 bg-gray-100/80 font-bold text-gray-800' 
                                              : 'border-gray-300 bg-white text-gray-700'
                                      )} ${!configModeDocente && isSelected ? 'ring-2 ring-inset ring-blue-500 z-10 bg-blue-50' : ''} ${!configModeDocente && isReadOnly ? 'bg-gray-50 cursor-not-allowed text-gray-500' : !configModeDocente ? 'cursor-cell' : ''}`}
                                      style={{ 
                                        backgroundColor: configModeDocente 
                                          ? (docenteFlag === true ? '#f0fdf4' : docenteFlag === false ? '#fef2f2' : '#f9fafb')
                                          : (cell.backgroundColor || (isFirstSectionLabel ? undefined : cell.isHeader ? '#f8fafc' : undefined)), 
                                        width: cellWidth,
                                        minWidth: cellMinW,
                                        maxWidth: cellMaxW,
                                        padding: 0,
                                        ...(isFirstSection && isSimpleRow ? { borderBottom: '1px solid #e2e8f0' } : {}),
                                      }}
                                      rowSpan={cell.rowSpan} 
                                      colSpan={cell.colSpan}
                                      onClick={(e) => handleCellClick(cell.id, e)}
                                      onDoubleClick={() => { if (!configModeDocente) { setModalCell({ id: cell.id, content: displayContent, isEditable: cell.isEditable && !isReadOnly }); setEditContent(displayContent); } }}
                                    >
                                      <div 
                                        className={`w-full h-full flex ${cell.isHeader ? 'justify-center text-center items-center' : shouldCenterVertically ? 'justify-start text-left items-center' : 'justify-start text-left items-start'} ${isFirstSectionLabel ? 'px-2 py-1' : isFirstSectionValue ? 'px-2 py-1' : 'px-1 py-0.5'}`} 
                                        style={{ 
                                          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb', 
                                          transform: isVertical ? 'rotate(180deg)' : 'none',
                                          maxHeight: isVertical ? '100px' : 'none', 
                                          whiteSpace: isVertical ? 'nowrap' : 'pre-wrap', 
                                          overflow: 'hidden',
                                          lineHeight: isFirstSection ? '1.4' : '1.3',
                                          fontSize: isFirstSectionLabel ? '17px' : isVertical ? '9px' : '17px'
                                        }}
                                      >
                                        {editingCell === cell.id ? (
                                          <Textarea 
                                            value={editContent} 
                                            onChange={(e) => setEditContent(e.target.value)} 
                                            autoFocus 
                                            onBlur={saveEdit} 
                                            className="w-full min-h-[50px] p-1 text-xs resize-y border-blue-400 focus-visible:ring-1 focus-visible:ring-blue-500" 
                                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }} 
                                          />
                                        ) : (
                                          <div 
                                            className={`whitespace-pre-wrap break-words w-full ${cell.isHeader ? 'text-center' : ''}`}
                                            style={{ wordBreak: 'break-word', lineHeight: '1.3' }}
                                          >
                                            {displayContent || <span className="opacity-0">.</span>}
                                          </div>
                                        )}
                                        {configModeDocente && (
                                          <div className="absolute top-0 right-0 p-0.5">
                                            {docenteFlag === true ? (
                                              <Unlock className="h-3 w-3 text-green-600" />
                                            ) : docenteFlag === false ? (
                                              <Lock className="h-3 w-3 text-red-500" />
                                            ) : (
                                              <span className="text-[8px] text-gray-400">?</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );})
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PANEL PREVIEW TABLAS JSZIP */}
              {showWordPreview && wordRawTables.length > 0 && (
                <Card className="mt-6 border-t-4 border-t-blue-600 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex justify-between text-blue-800">
                      <span><FileText className="inline h-5 w-5 mr-2" /> Tablas Nativas Extraídas ({wordRawTables.length})</span>
                      <Button variant="ghost" size="sm" onClick={() => setShowWordPreview(false)}><X className="h-4 w-4" /></Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-3 items-center">
                      {wordRawTables.map((table, tIdx) => {
                        // Solo mostrar T2-T5 (índices 1-4): las secciones principales del syllabus
                        if (tIdx === 0 || tIdx > 4) return null;
                        // Nombres fijos para las tablas del syllabus
                        const FIXED_NAMES: Record<number, string> = {
                          1: 'DATOS GENERALES',
                          2: 'ESTRUCTURA DE LA ASIGNATURA',
                          3: 'RESULTADOS Y EVALUACIÓN',
                          4: 'VISADO',
                        };
                        const sectionName = FIXED_NAMES[tIdx] || '';
                        return (
                          <button key={tIdx} className={`text-[10px] leading-tight px-2 py-1 rounded border transition-colors ${selectedWordTable === tIdx ? "bg-blue-600 text-white border-blue-600 font-semibold" : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400"}`} onClick={() => { setSelectedWordTable(tIdx); setColumnMapping({}); }}>
                            <span className="font-medium">T{tIdx + 1}</span> <span className="text-[9px] opacity-75">({table.length}×{table[0]?.length || 0})</span>{sectionName ? <><br/><span className="text-[9px]">{sectionName}</span></> : ''}
                          </button>
                        );
                      })}
                      <button className="text-[10px] leading-tight px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors ml-1" onClick={() => { setWordRawTables([]); setSelectedWordTable(null); setShowWordPreview(false); }}>
                        🗑️ Limpiar todo
                      </button>
                    </div>

                    {selectedWordTable !== null && wordRawTables[selectedWordTable] && (
                      <div>
                        <div className="flex gap-2 mb-3">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow" onClick={() => {
                            const maxCols = Math.max(wordRawTables[selectedWordTable][0]?.length || 0, activeTab?.rows[0]?.cells.length || 0);
                            const directMap: Record<number, number> = {};
                            for (let c = 0; c < maxCols; c++) directMap[c] = c;
                            importarTablaWord(selectedWordTable, 0, directMap);
                          }}>
                            📥 Importar Directo (columna 1→1 exacta)
                          </Button>
                        </div>
                        
                        <div className="overflow-x-auto border rounded-lg max-h-[400px]">
                          <table className="w-full border-collapse text-xs">
                            <tbody>
                              {wordRawTables[selectedWordTable].map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx === 0 ? "bg-blue-100 font-bold" : "bg-white hover:bg-gray-50"}>
                                  <td className="border px-1 py-0.5 text-gray-400 text-center w-8 bg-gray-100 sticky left-0 z-10">{rIdx}</td>
                                  {row.map((cell, cIdx) => {
                                    if (cell.isHidden) return null; // No dibujar celdas fantasma
                                    return (
                                      <td 
                                        key={cIdx} 
                                        rowSpan={cell.rowSpan} 
                                        colSpan={cell.colSpan} 
                                        className="border px-2 py-1 max-w-[200px] truncate" 
                                        title={cell.text}
                                      >
                                        {cell.text.substring(0, 80) || <span className="text-gray-300">—</span>}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Panel de firmas digitales */}
          {activeSyllabusId && (
            <div className="mt-6">
              <FirmasPanel
                tipo="syllabus"
                documentoId={Number(activeSyllabusId)}
                documentoNombre={activeSyllabus?.name || 'Syllabus'}
              />
            </div>
          )}
        </main>
      </div>

      {modalCell && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalCell(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between p-4 border-b bg-emerald-50"><h3 className="font-semibold text-emerald-800">Ver / Editar</h3><button onClick={() => setModalCell(null)}><X className="h-5 w-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-4">
              {modalCell.isEditable ? <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full min-h-[300px] p-3 text-sm border-gray-300 rounded-lg" autoFocus /> : <div className="whitespace-pre-wrap text-sm text-gray-700 p-3 bg-gray-50 rounded-lg min-h-[200px]">{modalCell.content}</div>}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50"><Button variant="outline" onClick={() => setModalCell(null)}>Cerrar</Button>{modalCell.isEditable && <Button className="bg-emerald-600 text-white" onClick={saveModalEdit}><Save className="h-4 w-4 mr-2" /> Guardar</Button>}</div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación del syllabus activo */}
      {showDeleteConfirm && activeSyllabus && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Eliminar Syllabus</h2>
            </div>
            <p className="text-gray-600 mb-2">¿Está seguro de eliminar este syllabus?</p>
            <p className="font-semibold text-gray-900 mb-4">"{activeSyllabus.name}"</p>
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleEliminarSyllabusActivo}>
                Sí, eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}