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
import { Plus, Minus, Upload, Save, Merge, Trash2, Printer, X, Pencil, Check, ArrowUpFromLine, Copy, FileText, Lock, Unlock, Settings } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useSearchParams } from 'next/navigation'
import * as mammoth from "mammoth"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { PrintProgramaAnalitico } from "@/components/programa-analitico/print-programa-analitico"

// --- INTERFACES DE DATOS ---
interface TableCell { 
  id: string; 
  content: string; 
  isHeader: boolean; 
  rowSpan: number; 
  colSpan: number; 
  isEditable: boolean; 
  isLocked?: boolean;
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
interface ProgramaAnaliticoData { id: string | number; name: string; description: string; tabs: TabData[]; metadata: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; }; }
interface SavedProgramaAnaliticoRecord { id: number; nombre: string; periodo: string; materias: string; datos_tabla: ProgramaAnaliticoData; created_at: string; updated_at: string; }

/** Comisión: estructura de tabla definida por administración; solo edición de contenido. */
const HERRAMIENTAS_TABLA_BLOQUEADAS = false

export default function EditorProgramaAnaliticoComisionPage() {
  const { token, getToken } = useAuth()
  const searchParams = useSearchParams()
  const asignaturaParam = searchParams.get('asignatura')
  const periodoParam = searchParams.get('periodo')
  
  // --- ESTADOS ---
  const [programas, setProgramas] = useState<ProgramaAnaliticoData[]>([])
  const [activeProgramaId, setActiveProgramaId] = useState<string | number | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [savedProgramas, setSavedProgramas] = useState<SavedProgramaAnaliticoRecord[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [showProgramaSelector, setShowProgramaSelector] = useState(false)
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [tempTabTitle, setTempTabTitle] = useState("")

  const [isListLoading, setIsListLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState("")
  
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [configModeDocente, setConfigModeDocente] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- DATOS DERIVADOS ---
  const activePrograma = programas.find((s) => s.id === activeProgramaId);
  const activeTab = activePrograma?.tabs.find(t => t.id === activeTabId);
  const tableData = activeTab ? activeTab.rows : [];

  // --- CARGA INICIAL ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programasData, periodosData] = await Promise.all([
          apiRequest("/api/programas-analiticos").catch(err => {
            console.error("Error en /api/programas-analiticos:", err);
            return { data: [] };
          }),
          apiRequest("/api/periodo").catch(err => {
            console.error("Error en /api/periodo:", err);
            return { data: [] };
          })
        ]);
        
        const programasArray = Array.isArray(programasData?.data) ? programasData.data : (Array.isArray(programasData) ? programasData : []);
        const periodosArray = Array.isArray(periodosData?.data) ? periodosData.data : (Array.isArray(periodosData) ? periodosData : []);
        
        setSavedProgramas(programasArray);
        setPeriodos(periodosArray);
        
        console.log('✅ Datos cargados:', {
          programas: programasArray.length,
          periodos: periodosArray.length,
          periodosData: periodosArray
        });
        
        // Inicializar selectedPeriod desde URL param
        if (periodoParam) {
          setSelectedPeriod(periodoParam);
        }
      } catch (error) { 
        console.error("❌ Error al cargar datos:", error); 
      }
      finally { setIsListLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (HERRAMIENTAS_TABLA_BLOQUEADAS) setConfigModeDocente(false)
  }, [])

  // HELPER: Sincronizar bloqueos desde la plantilla del admin
  const syncLocksFromTemplate = (uiData: any, periodoStr: string) => {
    // Buscar la plantilla del administrador para este periodo
    const templateAdmin = savedProgramas.find(s => !s.asignatura_id && s.periodo === periodoStr);
    if (!templateAdmin) return uiData;

    let templateData = (templateAdmin as any).datos_tabla || (templateAdmin as any).datos_programa;
    if (typeof templateData === 'string') {
      try { templateData = JSON.parse(templateData); } catch (e) { return uiData; }
    }
    
    if (!templateData?.tabs || !uiData?.tabs) return uiData;

    const newTabs = uiData.tabs.map((tab: any, tIdx: number) => {
      // Intentar encontrar el tab correspondiente por título o índice
      const tTab = templateData.tabs.find((t: any) => t.title === tab.title) || templateData.tabs[tIdx];
      if (!tTab) return tab;

      // Recopilar todas las celdas bloqueadas de este tab en la plantilla
      const lockedTemplateCells = tTab.rows.flatMap((r: any) => r.cells).filter((c: any) => c.isLocked === true);
      const unlockedTemplateCells = tTab.rows.flatMap((r: any) => r.cells).filter((c: any) => c.isLocked === false);

      const newRows = tab.rows.map((row: any, rIdx: number) => {
        const tRow = tTab.rows[rIdx];
        
        const newCells = row.cells.map((cell: any, cIdx: number) => {
          let shouldLock = cell.isLocked;
          let bgColor = cell.backgroundColor;
          let txtColor = cell.textColor;

          // 1. Intentar match por índice exacto (si la fila existe)
          if (tRow && tRow.cells[cIdx]) {
            const tCell = tRow.cells[cIdx];
            if (tCell.isLocked !== undefined) shouldLock = tCell.isLocked;
            if (tCell.backgroundColor) bgColor = tCell.backgroundColor;
            if (tCell.styles?.backgroundColor) bgColor = tCell.styles.backgroundColor;
            if (tCell.textColor) txtColor = tCell.textColor;
          } 
          
          // 2. Si no hubo match por índice, intentar match por contenido (muy útil para headers o etiquetas)
          if (shouldLock === undefined && cell.content && cell.content.trim().length > 0) {
            const cellContentNorm = cell.content.trim().toUpperCase();
            
            // Buscar si esta celda exacta fue bloqueada en la plantilla
            const matchedLocked = lockedTemplateCells.find((tc: any) => tc.content && tc.content.trim().toUpperCase() === cellContentNorm);
            if (matchedLocked) {
               shouldLock = true;
               if (matchedLocked.backgroundColor) bgColor = matchedLocked.backgroundColor;
               if (matchedLocked.styles?.backgroundColor) bgColor = matchedLocked.styles.backgroundColor;
               if (matchedLocked.textColor) txtColor = matchedLocked.textColor;
            } else {
               const matchedUnlocked = unlockedTemplateCells.find((tc: any) => tc.content && tc.content.trim().toUpperCase() === cellContentNorm);
               if (matchedUnlocked) shouldLock = false;
            }
          }

          return { ...cell, isLocked: shouldLock, backgroundColor: bgColor, textColor: txtColor };
        });
        return { ...row, cells: newCells };
      });
      return { ...tab, rows: newRows };
    });

    return { ...uiData, tabs: newTabs };
  };

  // Si vinimos con params ?asignatura=..&periodo=.., intentar cargar el programa correspondiente
  useEffect(() => {
    if (!asignaturaParam || !periodoParam) return;
    if (savedProgramas.length === 0) return;

    const match = savedProgramas.find((p: any) => String(p.asignatura_id) === String(asignaturaParam) && String(p.periodo) === String(periodoParam));
    if (match) {
      console.log('➡️ Cargando programa desde query params:', match.id)
      // preparar la UI data y setActive
      const programaToLoad = (match as any).datos_tabla || (match as any).datos_programa || null
      if (programaToLoad) {
        let uiData = typeof programaToLoad === 'string' ? JSON.parse(programaToLoad) : programaToLoad
        uiData = syncLocksFromTemplate(uiData, String(periodoParam));
        setProgramas([uiData])
        setActiveProgramaId(uiData.id || match.id)
        setActiveTabId(uiData.tabs?.[0]?.id || null)
        setSelectedPeriod((match as any).periodo)
      }
    }
  }, [savedProgramas, asignaturaParam, periodoParam]);
  
  useEffect(() => {
    if (activePrograma && activePrograma.tabs.length > 0) {
      if (!activePrograma.tabs.find(t => t.id === activeTabId)) {
        setActiveTabId(activePrograma.tabs[0].id);
      }
    } else {
      setActiveTabId(null);
    }
  }, [activePrograma, activeTabId]);

  // --- API ---
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const fullUrl = `http://localhost:4000${endpoint}`
    const currentToken = token || getToken()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}`, ...options.headers }
    const response = await fetch(fullUrl, { ...options, headers })
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor no devolvió JSON.");
    }

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Error en la petición al API.")
    return data
  }

  const handleSaveToDB = async () => {
    if (!activePrograma) return alert("No hay un programa analítico activo para guardar.")
    if (!selectedPeriod) return alert("Por favor, seleccione un periodo antes de guardar.")
    
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0",
        metadata: activePrograma.metadata,
        tabs: activePrograma.tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id,
            cells: row.cells.map(cell => ({
              ...cell,
              styles: {
                ...(cell.backgroundColor ? { backgroundColor: cell.backgroundColor } : {}),
                ...(cell.textColor ? { textColor: cell.textColor } : {}),
                ...(cell.textAlign ? { textAlign: cell.textAlign } : {}),
                ...(cell.textOrientation ? { textOrientation: cell.textOrientation } : {})
              }
            }))
          }))
        }))
      };

      const payload: any = {
        nombre: activePrograma.name || 'Programa Analítico',
        periodo: selectedPeriod,
        materias: activePrograma.name || 'Programa Analítico',
        datos_tabla: datosParaGuardar
      }
      // Incluir asignatura_id si viene de la URL
      if (asignaturaParam) payload.asignatura_id = parseInt(asignaturaParam, 10);
      
      // Considerar IDs numéricos Y strings que sean números (PostgreSQL BIGINT viene como string)
      const isUpdate = activePrograma.id !== null && activePrograma.id !== undefined && !String(activePrograma.id).startsWith('programa-')
      const endpoint = isUpdate ? `/api/programas-analiticos/${activePrograma.id}` : "/api/programas-analiticos"
      const method = isUpdate ? "PUT" : "POST"

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedRecord = result.data as SavedProgramaAnaliticoRecord;
      
      const savedUIData = savedRecord.datos_tabla || (savedRecord as any).datos_programa;
      savedUIData.id = savedRecord.id;
      savedUIData.name = savedRecord.nombre || activePrograma.name;
      
      if (savedUIData.tabs) {
          savedUIData.tabs = savedUIData.tabs.map((t: any) => ({
              ...t,
              rows: t.rows.map((r: any) => ({
                  ...r,
                  cells: r.cells.map((c: any) => ({
                      ...c,
                      backgroundColor: c.styles?.backgroundColor,
                      textColor: c.styles?.textColor,
                      textAlign: c.styles?.textAlign,
                      textOrientation: c.styles?.textOrientation,
                      isEditable: true
                  }))
              }))
          }));
      }

      setProgramas((prev) => prev.map((s) => (s.id === activeProgramaId ? savedUIData : s)))
      setActiveProgramaId(savedUIData.id)
      
      if (isUpdate) {
        setSavedProgramas(prev => prev.map(s => s.id === savedRecord.id ? savedRecord : s));
      } else {
        setSavedProgramas(prev => [savedRecord, ...prev]);
      }
      
      alert("¡Programa Analítico guardado exitosamente!")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updatePrograma = (id: string | number, updates: Partial<ProgramaAnaliticoData>) => {
    setProgramas(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleMetadataChange = (field: 'period' | 'subject' | 'level', value: string) => {
    if (!activePrograma) return;
    const updatedMetadata = { ...activePrograma.metadata, [field]: value };
    updatePrograma(activePrograma.id, field === 'subject' ? { metadata: updatedMetadata, name: value } : { metadata: updatedMetadata });
  };

  const handleLoadPrograma = (programaId: string) => {
    console.log("🔍 handleLoadPrograma - ID recibido:", programaId);
    console.log("📚 savedProgramas disponibles:", savedProgramas.length);
    
    if (!programaId) {
      console.error("❌ No se proporcionó programaId");
      return;
    }
    
    const id = parseInt(programaId, 10);
    console.log("🔢 ID parseado:", id);
    
    const programaToLoad = savedProgramas.find(s => Number(s.id) === id);
    console.log("📖 Programa encontrado:", programaToLoad ? "SÍ" : "NO");
    
    if (programaToLoad) {
      console.log("✅ Cargando programa:", programaToLoad.nombre);
      let rawData = (programaToLoad as any).datos_tabla || (programaToLoad as any).datos_programa;
      if (typeof rawData === 'string') {
        try { rawData = JSON.parse(rawData); } catch (e) { console.error("Error parsing datos_tabla:", e); }
      }
      
      if (!rawData || typeof rawData !== 'object') {
        console.error("❌ datos_tabla está vacío o no es un objeto");
        alert("El programa seleccionado no tiene datos válidos.");
        return;
      }
      
      const editorData = { ...rawData } as ProgramaAnaliticoData;
      editorData.id = programaToLoad.id;
      
      // Convertir formato secciones antiguo a formato tabs si es necesario
      if (!editorData.tabs || editorData.tabs.length === 0) {
        if ((rawData as any).secciones && Array.isArray((rawData as any).secciones)) {
          console.log("🔄 Convirtiendo formato secciones a tabs...");
          editorData.tabs = (rawData as any).secciones.map((sec: any, idx: number) => ({
            id: `tab-sec-${idx}-${Date.now()}`,
            title: sec.titulo || sec.nombre || `Sección ${idx + 1}`,
            rows: Array.isArray(sec.datos) ? sec.datos.map((fila: any, rIdx: number) => ({
              id: `row-${idx}-${rIdx}-${Date.now()}`,
              cells: (Array.isArray(fila) ? fila : [fila]).map((celda: any, cIdx: number) => ({
                id: `cell-${idx}-${rIdx}-${cIdx}-${Date.now()}`,
                content: typeof celda === 'string' ? celda : (celda?.contenido || celda?.content || JSON.stringify(celda) || ''),
                isHeader: rIdx === 0,
                rowSpan: 1,
                colSpan: 1,
                isEditable: true,
                textOrientation: 'horizontal' as const
              }))
            })) : []
          }));
        } else if ((rawData as any).rows && Array.isArray((rawData as any).rows)) {
          editorData.tabs = [{ id: `tab-${Date.now()}`, title: "General", rows: (rawData as any).rows }];
        } else {
          editorData.tabs = [{ id: `tab-${Date.now()}`, title: "General", rows: [] }];
        }
      }
      
      if (!editorData.metadata) {
        editorData.metadata = { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }
      if (!editorData.name) {
        editorData.name = programaToLoad.nombre || 'Programa Analítico';
      }
      
      const syncedEditorData = syncLocksFromTemplate(editorData, programaToLoad.periodo || '');
      setProgramas([syncedEditorData]);
      setActiveProgramaId(syncedEditorData.id);
      setActiveTabId(syncedEditorData.tabs[0]?.id || null);
      
      setSelectedPeriod(programaToLoad.periodo || '');
      console.log("✅ Programa cargado exitosamente, periodo:", programaToLoad.periodo, "tabs:", editorData.tabs.length);
    } else {
      console.error("❌ No se encontró el programa con ID:", id);
      console.log("📋 IDs disponibles:", savedProgramas.map(s => s.id));
    }
  };

  // --- IMPORTACIÓN MAESTRA V8: HEURÍSTICA DE ESTRUCTURA Y VERTICALIDAD ---
  const handleProgramaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = ""; 

    setIsLoading(true);
    try {
      const { value: html } = await mammoth.convertToHtml(
        { arrayBuffer: await file.arrayBuffer() },
        { 
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Title'] => h1:fresh",
            "b => strong",
            "table.header => thead" 
          ]
        }
      );

      const doc = new DOMParser().parseFromString(html, "text/html");
      const findValue = (k: string) => Array.from(doc.querySelectorAll("p, td, th"))
        .find(n => n.textContent?.includes(k))?.textContent?.split(k)[1]?.trim().replace(/^[:\s]+/, "") || "";
      
      const meta = { 
        subject: findValue("Nombre de la asignatura") || findValue("Materia") || "", 
        period: findValue("Periodo") || "", level: findValue("Nivel") || "" 
      };

      console.log("--- INICIANDO ESCANEO AVANZADO ---");
      
      const newTabs: TabData[] = [];
      let currentSectionTitle = "Sección 1"; 
      let hasAssignedTableToTitle = true; 

      const elements = Array.from(doc.body.children);

      elements.forEach((element, idx) => {
        const tagName = element.tagName;
        const text = element.textContent?.replace(/\n/g, " ").replace(/\s+/g, " ").trim() || "";
        const textUpper = text.toUpperCase();

        if (tagName === "TABLE") {
             const rowsRaw = Array.from(element.querySelectorAll("tr"));
             const tableContent = rowsRaw.map(r => r.textContent).join(" ").toUpperCase();
             const isJunkTable = (tableContent.includes("UNIVERSIDAD") || tableContent.includes("PROGRAMA")) && rowsRaw.length < 6;

             if (isJunkTable) return; 
             
             const rows: TableRow[] = rowsRaw.map((tr, rIdx) => ({
                id: `row-${newTabs.length}-${rIdx}-${Date.now()}`,
                cells: Array.from(tr.querySelectorAll("td, th")).map((td, cIdx) => {
                  const content = td.textContent?.trim() || "";
                  const contentUpper = content.toUpperCase();
                  
                  const hasBold = !!td.querySelector("strong, b");
                  const isHeader = td.tagName === "TH" || hasBold || (rowsRaw.length > 3 && rIdx <= 1);

                  const verticalKeywords = [
                    "PRESENCIAL", "SINCRÓNICA", "SINCRONICA", "PFAE", "TA",
                    "HD. PRESENCIAL", "HD. SINCRÓNICA", "HD. SINCRONICA",
                    "HD PRESENCIAL", "HD SINCRÓNICA", "HD SINCRONICA"
                  ];
                  
                  let guessVertical = false;
                  if (isHeader) {
                      const contentTrimmed = contentUpper.trim();
                      guessVertical = verticalKeywords.includes(contentTrimmed) || 
                                      contentTrimmed.includes("HD. PRESENCIAL") || 
                                      contentTrimmed.includes("HD. SINCRÓNICA") ||
                                      contentTrimmed.includes("HD. SINCRONICA") ||
                                      contentTrimmed.includes("HD PRESENCIAL") ||
                                      contentTrimmed.includes("HD SINCRÓNICA");
                  }
                  return {
                    id: `cell-${newTabs.length}-${rIdx}-${cIdx}-${Date.now()}`,
                    content: content,
                    isHeader: isHeader, 
                    rowSpan: parseInt(td.getAttribute("rowspan") || "1"),
                    colSpan: parseInt(td.getAttribute("colspan") || "1"),
                    isEditable: true,
                    textOrientation: guessVertical ? 'vertical' : 'horizontal' 
                  };
                }),
              }));

             if (rows.length > 0) {
                 newTabs.push({ id: `tab-${newTabs.length}-${Date.now()}`, title: currentSectionTitle, rows: rows });
                 hasAssignedTableToTitle = true; 
             }
             return;
        }

        const isIgnored = text.length < 3 || textUpper.includes("UNIVERSIDAD") || textUpper.includes("PROGRAMA") || tagName === "IMG";

        if (!isIgnored) {
            const startsWithNumber = /^\d/.test(text); 
            const isHeaderTag = ['H1','H2','H3','H4'].includes(tagName);
            const isList = tagName === "UL" || tagName === "OL";
            const isUppercaseTitle = (text === textUpper) && text.length < 100;
            const hasBold = !!element.querySelector('strong') || !!element.querySelector('b');

            let isNewTitle = startsWithNumber || isHeaderTag || isList || isUppercaseTitle || hasBold;

            if (!hasAssignedTableToTitle && isNewTitle) {
                if (!startsWithNumber && !isHeaderTag && !isList) {
                    isNewTitle = false;
                }
            }

            if (isNewTitle) {
                let cleanTitle = text.replace(/[:]+$/, '');
                if (isList) cleanTitle = element.querySelector("li")?.textContent?.trim().replace(/[:]+$/, '') || cleanTitle;
                
                currentSectionTitle = cleanTitle;
                hasAssignedTableToTitle = false; 
            } else if (!hasAssignedTableToTitle && text.length > 0) {
                const fakeRow: TableRow = {
                    id: `row-fake-${Date.now()}`,
                    cells: [{
                        id: `cell-fake-${Date.now()}`,
                        content: text, 
                        isHeader: false,
                        rowSpan: 1,
                        colSpan: 1,
                        isEditable: true,
                        textOrientation: 'horizontal'
                    }]
                };
                newTabs.push({ id: `tab-${newTabs.length}-${Date.now()}`, title: currentSectionTitle, rows: [fakeRow] });
                hasAssignedTableToTitle = true; 
            }
        }
      });

      if (newTabs.length === 0) {
        setIsLoading(false);
        return alert("No se encontraron datos válidos.");
      }

      const newData: ProgramaAnaliticoData = {
        id: `programa-${Date.now()}`,
        name: meta.subject || `Programa Analítico de ${file.name}`,
        description: "Importado",
        metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        tabs: newTabs,
      };
      
      const syncedNewData = syncLocksFromTemplate(newData, meta.period || selectedPeriod || '');
      setProgramas([syncedNewData]);
      setActiveProgramaId(syncedNewData.id);
      setActiveTabId(syncedNewData.tabs[0]?.id || null);

    } catch (e) { console.error(e); alert("Error crítico."); } 
    finally { setIsLoading(false); }
  };

  // --- MÉTODOS DE EDICIÓN ---
  const handleUpdateActiveTabRows = (newRows: TableRow[]) => {
    if (!activePrograma || !activeTabId) return;
    const updatedTabs = activePrograma.tabs.map(tab => tab.id === activeTabId ? { ...tab, rows: newRows } : tab);
    updatePrograma(activePrograma.id, { tabs: updatedTabs });
  };

  const startRenamingTab = (tab: TabData) => {
    setEditingTabId(tab.id);
    setTempTabTitle(tab.title);
  }

  const saveTabRename = () => {
    if (!activePrograma || !editingTabId) return;
    const updatedTabs = activePrograma.tabs.map(tab => tab.id === editingTabId ? { ...tab, title: tempTabTitle || "Sin Título" } : tab);
    updatePrograma(activePrograma.id, { tabs: updatedTabs });
    setEditingTabId(null);
  }

  const addTab = () => {
    if (!activePrograma) return;
    const newTab: TabData = {
      id: `tab-${Date.now()}`,
      title: `Nueva Sección`,
      rows: [
        { id: `r1-${Date.now()}`, cells: [{id: `c11-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}, {id: `c12-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}] },
      ]
    };
    const updatedTabs = [...activePrograma.tabs, newTab];
    updatePrograma(activePrograma.id, { tabs: updatedTabs });
    setActiveTabId(newTab.id);
  };
  
  const removeTab = (tabIdToRemove: string) => {
    if (!activePrograma) return;
    if (activePrograma.tabs.length <= 1) return alert("Debe quedar al menos una sección.");
    if (!window.confirm("¿Estás seguro de eliminar esta sección?")) return;
    const updatedTabs = activePrograma.tabs.filter(t => t.id !== tabIdToRemove);
    updatePrograma(activePrograma.id, { tabs: updatedTabs });
    if (activeTabId === tabIdToRemove) setActiveTabId(updatedTabs[0]?.id || null);
  };

  const findCellPosition = (id: string): {rowIndex: number, colIndex: number} | null => { if (!tableData) return null; for(let r=0;r<tableData.length;r++){ const c=tableData[r].cells.findIndex(cell=>cell.id===id); if(c!==-1)return{rowIndex: r, colIndex: c}} return null }
  const startEditing = (id: string, content: string) => { setEditingCell(id); setEditContent(content) }
  const saveEdit = () => { if(editingCell){ const updated=tableData.map(row=>({...row,cells:row.cells.map(c=>(c.id===editingCell?{...c,content:editContent}:c))})); handleUpdateActiveTabRows(updated); setEditingCell(null);setEditContent("")}}
  const cancelEdit = () => { setEditingCell(null); setEditContent("") }
  // Detecta si una celda fue bloqueada por el admin (isLocked=true pero docenteEditable no es false)
  const isAdminLockedCell = (c: TableCell) => c.isLocked === true && c.docenteEditable !== false;

  const handleCellClick = (id: string, e: React.MouseEvent) => {
    if (configModeDocente) {
      const updated = tableData.map(row => ({
        ...row,
        cells: row.cells.map(c => {
          if (c.id === id) {
            if (isAdminLockedCell(c)) return c; // Bloqueo de admin, no se puede tocar
            // Toggle: si está bloqueada por comisión, desbloquear; si está libre, bloquear
            const isCurrentlyLocked = c.docenteEditable === false;
            return { ...c, docenteEditable: isCurrentlyLocked ? true : false, isLocked: !isCurrentlyLocked };
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
      cells: row.cells.map(c => {
        if (isAdminLockedCell(c)) return c; // Bloqueo de admin, no se puede tocar
        return { ...c, docenteEditable: enable, isLocked: !enable };
      })
    }));
    handleUpdateActiveTabRows(updated);
  }
  
  const addRowAt=(idx:number)=>{if(!tableData.length)return;const rId=`r-${Date.now()}`,nCols=tableData[0].cells.reduce((a,c)=>a+c.colSpan,0);const nR:TableRow={id:rId,cells:Array.from({length:nCols},(_,i)=>({id:`c-${rId}-${i}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0}))};const nRows=[...tableData];nRows.splice(idx,0,nR);handleUpdateActiveTabRows(nRows)}
  const addColumnAt=(idx:number)=>{const updated=tableData.map(r=>{const nC:TableCell={id:`c-${r.id}-${Date.now()}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0};const nCells=[...r.cells];nCells.splice(idx,0,nC);return{...r,cells:nCells}});handleUpdateActiveTabRows(updated)}
  
  const handleInsertRow = (direction: "above" | "below") => { const pos = findCellPosition(selectedCells[0]); if(pos) addRowAt(direction === 'above' ? pos.rowIndex : pos.rowIndex + 1); }
  const handleInsertColumn = (direction: "left" | "right") => { const pos = findCellPosition(selectedCells[0]); if(pos) addColumnAt(direction === 'left' ? pos.colIndex : pos.colIndex + 1); }
  const removeSelectedRow = () => { const pos = findCellPosition(selectedCells[0]); if (pos) { const updated = tableData.filter((_, i) => i !== pos.rowIndex); handleUpdateActiveTabRows(updated); setSelectedCells([]); } }
  const removeSelectedColumn = () => { const pos = findCellPosition(selectedCells[0]); if (pos) { const updated = tableData.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== pos.colIndex) })); handleUpdateActiveTabRows(updated); setSelectedCells([]); } }
  const clearSelectedCells=()=>{ const updated=tableData.map(r=>({...r,cells:r.cells.map(c=>selectedCells.includes(c.id)?{...c,content:""}:c)})); handleUpdateActiveTabRows(updated); setSelectedCells([]) }
  
  const toggleVerticalText = () => {
    if (selectedCells.length === 0) return;
    const updated = tableData.map(row => ({
      ...row,
      cells: row.cells.map(cell => {
        if (selectedCells.includes(cell.id)) {
          const newOrientation: 'horizontal' | 'vertical' = cell.textOrientation === 'vertical' ? 'horizontal' : 'vertical';
          return { ...cell, textOrientation: newOrientation }
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
    if (!activePrograma) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginL = 8;
    const marginR = 8;
    const contentWidth = pageWidth - marginL - marginR;

    // --- FIRMAS del documento (para sección VISADO) ---
    let firmasData: any = null;
    const docIdNum = typeof activeProgramaId === 'number' ? activeProgramaId : null;
    if (docIdNum) {
      try {
        const fr = await Promise.race([
          apiRequest(`/firmas/programa_analitico/${docIdNum}`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        if ((fr as any).success) firmasData = (fr as any).data;
      } catch { /* no disponible o timeout */ }
    }

    // --- LOGO UNESUM ---
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
      doc.addImage(logoImg, 'PNG', marginL, 3, 11, 11);
    } catch { /* logo no disponible o timeout */ }

    // --- ENCABEZADO: rectángulo azul de fondo ---
    doc.setFillColor(25, 50, 95);
    doc.rect(marginL, 2, contentWidth, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ', pageWidth / 2, 7, { align: 'center' });
    doc.setFontSize(8);
    doc.text('PROGRAMA ANALÍTICO DE ASIGNATURA', pageWidth / 2, 12, { align: 'center' });

    // --- NOMBRE DEL PROGRAMA Y PERIODO (banda gris claro) ---
    const programaTitle = activePrograma.name || '';
    const periodoName = periodos.find((p: any) => String(p.id) === selectedPeriod || p.nombre === (activePrograma as any).periodo)?.nombre
      || (activePrograma as any).periodo || '';
    doc.setFillColor(240, 244, 250);
    doc.rect(marginL, 16, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 50, 95);
    const headerLine = [programaTitle, periodoName ? `Periodo: ${periodoName}` : ''].filter(Boolean).join('   |   ');
    if (headerLine) doc.text(headerLine, pageWidth / 2, 20.5, { align: 'center' });

    let currentY = 25;

    // --- CONTENIDO POR CADA PESTAÑA ---
    for (const tab of activePrograma.tabs) {
      if (!tab.rows || tab.rows.length === 0) continue;

      if (currentY + 15 > pageHeight - 8) {
        doc.addPage();
        currentY = 8;
      }

      // Título de sección: barra coloreada
      const tabTitleH = 5;
      doc.setFillColor(59, 100, 160);
      doc.rect(marginL, currentY, contentWidth, tabTitleH, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(tab.title.toUpperCase(), marginL + 2, currentY + 3.5);
      currentY += tabTitleH + 0.5;

      // Calcular número máximo de columnas lógicas
      let maxCols = 0;
      for (const row of tab.rows) {
        const vis = row.cells.filter((c: any) => c.rowSpan > 0 && c.colSpan > 0);
        const logCols = vis.reduce((sum: number, c: any) => sum + (c.colSpan || 1), 0);
        if (logCols > maxCols) maxCols = logCols;
      }
      if (maxCols === 0) continue;

      // Detectar columna PERIODO para darle ancho fijo y centrado
      let periodoColStart = -1;
      let periodoColSpan = 1;
      outerLoop: for (const row of tab.rows) {
        let logCol = 0;
        for (const cell of row.cells.filter((c: any) => c.rowSpan > 0 && c.colSpan > 0)) {
          if ((cell.content || '').toUpperCase().includes('PERIODO')) {
            periodoColStart = logCol;
            periodoColSpan = cell.colSpan || 1;
            break outerLoop;
          }
          logCol += cell.colSpan || 1;
        }
      }

      const colStyles: Record<number, any> = {};
      if (periodoColStart >= 0 && maxCols > 1) {
        const periodoW = Math.round(contentWidth * 0.22);
        const restCols = maxCols - periodoColSpan;
        const restW = restCols > 0 ? Math.round((contentWidth - periodoW) / restCols) : contentWidth;
        for (let i = 0; i < maxCols; i++) {
          if (i >= periodoColStart && i < periodoColStart + periodoColSpan) {
            colStyles[i] = { cellWidth: periodoW / periodoColSpan, halign: 'center' };
          } else {
            colStyles[i] = { cellWidth: restW };
          }
        }
      }

      // Construir cuerpo de la tabla (rowSpan siempre 1 para evitar el warning "row -1" de jspdf-autotable)
      const body: any[][] = [];

      for (const row of tab.rows) {
        const pdfRow: any[] = [];
        let currentLogCol = 0;

        for (const cell of row.cells) {
          if (currentLogCol >= maxCols) break;
          const isGhost = (cell.rowSpan ?? 1) <= 0 || (cell.colSpan ?? 1) <= 0;

          if (isGhost) {
            pdfRow.push({
              content: '',
              rowSpan: 1,
              colSpan: 1,
              styles: {
                fillColor: [255, 255, 255],
                textColor: [30, 30, 30],
                fontSize: 6,
                cellPadding: { top: 0.6, right: 1, bottom: 0.6, left: 1 },
              }
            });
            currentLogCol++;
          } else {
            let cellSpan = cell.colSpan || 1;
            if (currentLogCol + cellSpan > maxCols) cellSpan = Math.max(1, maxCols - currentLogCol);

            const isHeader = cell.isHeader;
            const content = (cell.content || '').replace(/\r\n/g, '\n');
            const isPeriodoCell = periodoColStart >= 0 && currentLogCol >= periodoColStart && currentLogCol < periodoColStart + periodoColSpan;

            pdfRow.push({
              content,
              rowSpan: 1,
              colSpan: cellSpan,
              styles: {
                fontStyle: isHeader ? 'bold' as const : 'normal' as const,
                fillColor: isHeader ? [220, 229, 242] : (cell.backgroundColor || [255, 255, 255]),
                textColor: isHeader ? [25, 50, 95] : [30, 30, 30],
                fontSize: isHeader ? 6.5 : 6,
                cellPadding: { top: 0.6, right: 1, bottom: 0.6, left: 1 },
                halign: (isHeader || isPeriodoCell) ? 'center' as const : 'left' as const,
                valign: 'top' as const,
                overflow: 'linebreak' as const,
              }
            });
            currentLogCol += cellSpan;
          }
        }

        if (pdfRow.length > 0) body.push(pdfRow);
      }

      if (body.length > 0) {
        autoTable(doc, {
          body: body as any,
          startY: currentY,
          theme: 'grid',
          styles: {
            fontSize: 6,
            cellPadding: { top: 0.6, right: 1, bottom: 0.6, left: 1 },
            lineColor: [180, 190, 210],
            lineWidth: 0.12,
            overflow: 'linebreak',
            halign: 'left',
            valign: 'top',
            textColor: [30, 30, 30],
            minCellHeight: 3,
          },
          margin: { left: marginL, right: marginR, top: 8 },
        });

        const finalY = (doc as any).lastAutoTable?.finalY ?? (doc as any).previousAutoTable?.finalY ?? currentY + 8;
        currentY = finalY + 2;
      }

      // Ceder el hilo al navegador entre pestañas para no congelar la UI
      await new Promise<void>(r => setTimeout(r, 0));
    }

    // ─── SECCIÓN VISADO ────────────────────────────────────────────────
    const VISADO_ETAPAS = [
      { etapa: 'decano',             label: 'DECANO/A DE FACULTAD' },
      { etapa: 'director_academico', label: 'DIRECTOR/A ACADÉMICO/A' },
      { etapa: 'coordinador',        label: 'COORDINADOR/A DE CARRERA' },
      { etapa: 'docente',            label: 'DOCENTE' },
    ];
    const VTITLE_H = 5, VHEADER_H = 7, VSIGN_H = 36;
    const VTOTAL = VTITLE_H + VHEADER_H + VSIGN_H + 3;
    if (currentY + VTOTAL > pageHeight - 5) { doc.addPage(); currentY = 8; }
    currentY += 3;

    doc.setFillColor(25, 50, 95);
    doc.rect(marginL, currentY, contentWidth, VTITLE_H, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('VISADO', marginL + 4, currentY + 3.5);
    currentY += VTITLE_H;

    const colW = contentWidth / 4;
    doc.setFillColor(220, 229, 242);
    doc.rect(marginL, currentY, contentWidth, VHEADER_H, 'F');
    doc.setDrawColor(180, 190, 210); doc.setLineWidth(0.12);
    doc.rect(marginL, currentY, contentWidth, VHEADER_H);
    VISADO_ETAPAS.forEach((cfg, i) => {
      const x = marginL + i * colW;
      if (i > 0) doc.line(x, currentY, x, currentY + VHEADER_H);
      doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(25, 50, 95);
      doc.text(doc.splitTextToSize(cfg.label, colW - 3), x + colW / 2, currentY + 4, { align: 'center' });
    });
    currentY += VHEADER_H;
    doc.setDrawColor(180, 190, 210); doc.setLineWidth(0.12);
    doc.rect(marginL, currentY, contentWidth, VSIGN_H);
    VISADO_ETAPAS.forEach((cfg, i) => {
      const x = marginL + i * colW;
      if (i > 0) doc.line(x, currentY, x, currentY + VSIGN_H);
      const eInfo = firmasData?.etapas?.find((e: any) => e.etapa === cfg.etapa);
      if (eInfo?.firmado && eInfo.firma) {
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
        doc.text(doc.splitTextToSize(eInfo.firma.usuario_nombre || '', colW - 4), x + colW / 2, currentY + 6, { align: 'center' });
        if (eInfo.firma.qr_data_url) { try { doc.addImage(eInfo.firma.qr_data_url, 'PNG', x + (colW - 16) / 2, currentY + 10, 16, 16); } catch {} }
        doc.setFontSize(5.5); doc.setTextColor(80, 80, 80);
        doc.text(`Fecha: ${new Date(eInfo.firma.firmado_at).toLocaleDateString('es-EC')}`, x + colW / 2, currentY + VSIGN_H - 3, { align: 'center' });
      } else {
        doc.setFontSize(6); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
        doc.text('Pendiente de firma', x + colW / 2, currentY + VSIGN_H / 2 + 3, { align: 'center' });
      }
    });

    const slug = programaTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 40) || 'Programa_Analitico';
    doc.save(`PA_${slug}.pdf`);
  };

  const handleDuplicatePrograma = async (programaId: number) => {
    const programaToClone = savedProgramas.find(s => s.id === programaId);
    if (!programaToClone) return;
    
    try {
      const clonedData = JSON.parse(JSON.stringify(programaToClone.datos_tabla || (programaToClone as any).datos_programa));
      clonedData.id = `programa-${Date.now()}`;
      clonedData.name = `${programaToClone.nombre} (Copia)`;
      clonedData.metadata.createdAt = new Date().toISOString();
      clonedData.metadata.updatedAt = new Date().toISOString();
      
      const payload = {
        nombre: clonedData.name,
        periodo: programaToClone.periodo,
        materias: programaToClone.materias,
        datos_tabla: clonedData
      };
      
      const result = await apiRequest('/api/programas-analiticos', { method: 'POST', body: JSON.stringify(payload) });
      
      const programasData = await apiRequest("/api/programas-analiticos").catch(() => ({ data: [] }));
      const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setSavedProgramas(programasArray);
      
      alert("Programa Analítico duplicado exitosamente");
    } catch (error: any) {
      alert(`Error al duplicar: ${error.message}`);
    }
  };

  const handleDeletePrograma = async (programaId: number) => {
    if (!window.confirm("¿Está seguro de eliminar este programa analítico? Esta acción no se puede deshacer.")) return;
    
    setIsLoading(true);
    try {
      await apiRequest(`/api/programas-analiticos/${programaId}`, { method: 'DELETE' });
      
      const programasData = await apiRequest("/api/programas-analiticos").catch(() => ({ data: [] }));
      const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setSavedProgramas(programasArray);
      
      alert("Programa Analítico eliminado exitosamente");
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPrograma = (programaId: number) => {
    console.log("Editando programa ID:", programaId);
    handleLoadPrograma(programaId.toString());
    setShowProgramaSelector(false);
  };

  const handleNewPrograma = () => {
    setShowProgramaSelector(true);
  };

  const programasFiltered = selectedPeriod 
    ? savedProgramas.filter(s => s.periodo === selectedPeriod || !s.periodo)
    : savedProgramas;
  
  const hasLockedCellsSelected = activeTab?.rows.flatMap(r => r.cells).filter(c => selectedCells.includes(c.id)).some(c => c.isLocked) || false;
  const isToolsDisabled = !selectedCells.length || configModeDocente || HERRAMIENTAS_TABLA_BLOQUEADAS || hasLockedCellsSelected;

  return (
    <ProtectedRoute allowedRoles={["comision_academica", "comision", "administrador"]}>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(37, 99, 235, 0.05) 0%, transparent 50%)',
        }}
      >
        <MainHeader />
        <main className="max-w-[100rem] mx-auto px-4 sm:px-6 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-blue-800 mb-1 flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              Editor de Programa Analítico - Comisión Académica
            </h1>
            <p className="text-blue-600/70">Gestiona y edita los programas analíticos con pestañas personalizables</p>
          </div>
          
          {!activePrograma ? (
            <>
              {/* Pantalla Inicial */}
              <Card className="mb-6 border-t-4 border-t-blue-600">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-blue-800">
                    <span>Editor de Programa Analítico</span>
                    <div className="flex gap-2">
                      <Button onClick={handleNewPrograma} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo
                      </Button>
                      <Button onClick={handleSaveToDB} disabled={!activePrograma} className="bg-emerald-600 hover:bg-emerald-700">
                        <Save className="h-4 w-4 mr-2" /> Guardar
                      </Button>
                      <PrintProgramaAnalitico
                        programaData={activePrograma || null}
                        asignaturaNombre={(activePrograma as any)?.name || (activePrograma as any)?.metadata?.subject || ''}
                        periodoNombre={selectedPeriod}
                        buttonLabel="Imprimir"
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Periodo</Label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el periodo" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodos.map((periodo) => (
                            <SelectItem key={periodo.id} value={periodo.nombre}>
                              {periodo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Modal Selector de Programa */}
              {showProgramaSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Seleccionar Programa Analítico</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowProgramaSelector(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                        {isLoading ? "Procesando..." : <><Upload className="h-4 w-4 mr-2" /> Subir Nuevo Word (.docx)</>}
                      </Button>
                      <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { handleProgramaUpload(e); setShowProgramaSelector(false); }} className="hidden" />
                      
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">O seleccione uno existente:</h3>
                        {isListLoading ? (
                          <p className="text-center py-4">Cargando...</p>
                        ) : programasFiltered.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {programasFiltered.map(s => (
                              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex-1">
                                  <p className="font-medium">{s.nombre}</p>
                                  <p className="text-sm text-gray-500">{s.periodo} - {s.materias}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => { handleLoadPrograma(s.id.toString()); setShowProgramaSelector(false); }} className="bg-blue-600 hover:bg-blue-700">
                                    Seleccionar
                                  </Button>
                                  <Button variant="outline" onClick={() => handleDeletePrograma(s.id)} className="text-red-600 hover:text-red-700 border-red-200">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">No hay programas analíticos disponibles</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tabla de Programas Creados */}
              <Card>
                <CardHeader>
                  <CardTitle>Programas Analíticos Creados</CardTitle>
                </CardHeader>
                <CardContent>
                  {isListLoading ? (
                    <p className="text-center py-8">Cargando...</p>
                  ) : programasFiltered.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Periodo</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Materia</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Fecha</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {programasFiltered.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">{s.nombre}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">{s.periodo}</td>
                              <td className="px-4 py-3">{s.materias}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(s.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleEditPrograma(s.id)} className="text-blue-600 hover:text-blue-700">
                                    <Pencil className="h-4 w-4 mr-1" /> Modificar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDuplicatePrograma(s.id)} className="text-emerald-600 hover:text-emerald-700">
                                    <Copy className="h-4 w-4 mr-1" /> Duplicar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeletePrograma(s.id)} className="text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No hay programas analíticos creados aún</p>
                      <Button onClick={handleNewPrograma} className="mt-4 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" /> Crear Primer Programa
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="mb-6 border-t-4 border-t-blue-600">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-blue-800">
                    <div className="flex items-center gap-2 min-w-0">
                      {editingName ? (
                        <>
                          <Input
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setProgramas(p => p.map(s => s.id === activeProgramaId ? { ...s, name: tempName } : s)); setEditingName(false); } if (e.key === 'Escape') setEditingName(false); }}
                            className="h-8 text-sm font-semibold"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7" onClick={() => { setProgramas(p => p.map(s => s.id === activeProgramaId ? { ...s, name: tempName } : s)); setEditingName(false); }}><Check className="h-4 w-4 text-green-600" /></Button>
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7" onClick={() => setEditingName(false)}><X className="h-4 w-4 text-red-500" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="truncate">{activePrograma.name}</span>
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7 flex-shrink-0" title="Renombrar" onClick={() => { setTempName(activePrograma.name); setEditingName(true); }}><Pencil className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                       <Button onClick={() => { setActiveProgramaId(null); setProgramas([]); }} variant="outline" size="sm"> <Plus className="h-4 w-4 mr-2" /> Nuevo</Button>
                       <Button onClick={handleSaveToDB} className="bg-emerald-600 hover:bg-emerald-700" size="sm" disabled={isSaving}>{isSaving ? "Guardando..." : <><Save className="h-4 w-4 mr-2" /> Guardar</>}</Button>
                       <PrintProgramaAnalitico
                         programaData={activePrograma || null}
                         asignaturaNombre={activePrograma?.name || activePrograma?.metadata?.subject || ''}
                         periodoNombre={selectedPeriod}
                         buttonLabel="Imprimir"
                         buttonClassName="h-9 text-sm px-3"
                       />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Periodo Académico</Label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el periodo" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodos.map((periodo) => (
                            <SelectItem key={periodo.id} value={periodo.nombre}>
                              {periodo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mb-6 select-none">
                <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-blue-100">
                  {activePrograma.tabs.map(tab => (
                    <div key={tab.id} className="relative group">
                      {editingTabId === tab.id ? (
                        <div className="flex items-center bg-white border border-blue-500 rounded px-1 shadow-sm h-10">
                          <Input value={tempTabTitle} onChange={(e) => setTempTabTitle(e.target.value)} className="h-8 w-40 border-none focus-visible:ring-0 px-1" autoFocus onKeyDown={(e) => e.key === "Enter" && saveTabRename()} onBlur={saveTabRename} />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-600" onClick={saveTabRename}><Check className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div onClick={() => setActiveTabId(tab.id)} onDoubleClick={() => startRenamingTab(tab)} className={`flex items-center h-10 px-4 rounded-md border cursor-pointer transition-all duration-200 ${activeTabId === tab.id ? 'bg-blue-600 text-white border-blue-700 shadow-md font-medium' : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'}`}>
                          <span className="max-w-[150px] truncate mr-2" title={tab.title}>{tab.title}</span>
                          <div className={`flex items-center gap-1 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                             <Pencil className={`h-3 w-3 cursor-pointer ${activeTabId === tab.id ? 'text-blue-200 hover:text-white' : 'text-blue-400 hover:text-blue-700'}`} onClick={(e) => { e.stopPropagation(); startRenamingTab(tab); }} />
                             <X className={`h-4 w-4 cursor-pointer rounded-full p-0.5 ${activeTabId === tab.id ? 'text-red-200 hover:bg-red-500 hover:text-white' : 'text-red-400 hover:bg-red-100 hover:text-red-600'}`} onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button onClick={addTab} variant="outline" size="sm" className="h-10 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"><Plus className="h-4 w-4 mr-1" /> Nueva Sección</Button>
                </div>
                <p className="text-xs text-gray-400 mt-1 italic pl-1">* Doble clic en una pestaña para renombrarla.</p>
              </div>

              {activeTab && (
                <Card className="border-blue-100 shadow-md">
                  <CardContent className="p-4">
                    <div className={`flex flex-wrap gap-2 mb-2 p-2 border rounded-md bg-blue-50/50 ${HERRAMIENTAS_TABLA_BLOQUEADAS ? "opacity-60 pointer-events-none" : ""}`}>
                       <Button size="sm" className="bg-white text-blue-700 border-blue-200" onClick={() => handleInsertRow('above')} disabled={isToolsDisabled}><Plus className="h-3 w-3 mr-1"/>Fila ↑</Button>
                       <Button size="sm" className="bg-white text-blue-700 border-blue-200" onClick={() => handleInsertRow('below')} disabled={isToolsDisabled}><Plus className="h-3 w-3 mr-1"/>Fila ↓</Button>
                       <Button size="sm" className="bg-white text-blue-700 border-blue-200" onClick={() => handleInsertColumn('left')} disabled={isToolsDisabled}><Plus className="h-3 w-3 mr-1"/>Col ←</Button>
                       <Button size="sm" className="bg-white text-blue-700 border-blue-200" onClick={() => handleInsertColumn('right')} disabled={isToolsDisabled}><Plus className="h-3 w-3 mr-1"/>Col →</Button>
                       <div className="w-px h-6 bg-blue-200 mx-1"></div>
                       <Button size="sm" onClick={removeSelectedRow} className="bg-red-50 text-red-600 border-red-200" disabled={isToolsDisabled}><Minus className="h-3 w-3 mr-1"/>Fila</Button>
                       <Button size="sm" onClick={removeSelectedColumn} className="bg-red-50 text-red-600 border-red-200" disabled={isToolsDisabled}><Minus className="h-3 w-3 mr-1"/>Col</Button>
                       <div className="w-px h-6 bg-blue-200 mx-1"></div>
                       <Button size="sm" onClick={toggleVerticalText} className="bg-white text-blue-700 border-blue-200" disabled={isToolsDisabled} title="Rotar Texto Verticalmente"><ArrowUpFromLine className="h-4 w-4 mr-1" /> Vertical</Button>
                       <Button size="sm" onClick={mergeCells} disabled={selectedCells.length < 2 || isToolsDisabled} variant="outline"><Merge className="h-4 w-4 mr-1" />Unir</Button>
                       <Button size="sm" onClick={clearSelectedCells} disabled={isToolsDisabled} variant="outline"><Trash2 className="h-4 w-4 mr-1" />Limpiar</Button>
                       <div className="w-px h-6 bg-blue-200 mx-1"></div>
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
                          <span className="inline-flex items-center gap-1 ml-2"><span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400 inline-block"></span> = Bloqueada por Admin</span>
                          <span className="inline-flex items-center gap-1 ml-2"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"></span> = Bloqueada por Comisión</span>
                          <span className="inline-flex items-center gap-1 ml-2"><span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block"></span> = Editable</span>
                        </p>
                      </div>
                    )}

                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                      <table className="w-full border-collapse text-sm text-left"> 
                        <tbody className="divide-y divide-gray-200">
                          {tableData.map((row) => {
                            const isFormRow = row.cells.length === 3 && row.cells[1].content.trim() === ':';

                            return (
                              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                {row.cells.map((cell, index) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;
                                  
                                  const isSelected = selectedCells.includes(cell.id);
                                  const isHeader = cell.isHeader;
                                  const isSeparator = cell.content.trim() === ':';
                                  const isVertical = cell.textOrientation === 'vertical';

                                  let widthStyle = 'auto';
                                  let minWidthStyle = 'auto';

                                  if (isFormRow) {
                                    if (index === 0) widthStyle = '20%';      
                                    else if (index === 1) widthStyle = '1%';  
                                    else widthStyle = 'auto';                 
                                  } else {
                                    if (isVertical) {
                                        minWidthStyle = '40px';
                                        widthStyle = '1%'; 
                                    } else if (cell.content.length > 5 || isHeader) {
                                        minWidthStyle = '120px'; 
                                    } else {
                                        minWidthStyle = '40px';
                                    }
                                  }
                                  
                                  const adminLocked = isAdminLockedCell(cell);
                                  const comisionLocked = cell.docenteEditable === false;
                                  const anyCellLocked = adminLocked || comisionLocked;
                                  
                                  const configModeClass = configModeDocente
                                    ? adminLocked
                                      ? 'ring-2 ring-inset ring-yellow-400 bg-yellow-100 cursor-not-allowed'
                                      : comisionLocked
                                        ? 'ring-2 ring-inset ring-red-400 bg-red-50/60 cursor-pointer'
                                        : 'ring-2 ring-inset ring-green-500 bg-green-50/60 cursor-pointer'
                                    : '';
                                  
                                  let justifyContent = 'justify-start'; 
                                  if (isHeader || isSeparator || isVertical) justifyContent = 'justify-center';
                                  
                                  return (
                                    <td 
                                      key={cell.id} 
                                      className={`
                                        border border-gray-200 
                                        relative transition-all duration-75 ease-in-out
                                        ${configModeDocente ? configModeClass : (
                                          isHeader ? "bg-gray-50 font-semibold text-gray-900" : "bg-white text-gray-700"
                                        )}
                                        ${!configModeDocente && anyCellLocked ? "bg-yellow-200" : ""}
                                        ${!configModeDocente && isSelected ? "ring-2 ring-inset ring-blue-500 z-10" : ""}
                                      `}
                                      style={{ 
                                        backgroundColor: configModeDocente 
                                          ? (adminLocked ? '#fef08a' : comisionLocked ? '#fef2f2' : '#f0fdf4')
                                          : (anyCellLocked ? '#fef08a' : (cell.backgroundColor || (isHeader ? '#f9fafb' : '#ffffff'))),
                                        color: cell.textColor, 
                                        width: widthStyle,
                                        minWidth: minWidthStyle, 
                                        whiteSpace: isSeparator ? 'nowrap' : 'normal',
                                        padding: 0, 
                                        height: '1px', 
                                      }} 
                                      rowSpan={cell.rowSpan || 1} 
                                      colSpan={cell.colSpan || 1} 
                                      onClick={(e) => handleCellClick(cell.id, e)} 
                                      onDoubleClick={() => (!configModeDocente && cell.isEditable) && startEditing(cell.id, cell.content)}
                                    >
                                      <div 
                                        className={`w-full h-full flex items-center ${justifyContent} p-2`}
                                        style={{
                                            writingMode: isVertical ? 'vertical-rl' : undefined,
                                            transform: isVertical ? 'rotate(180deg)' : undefined,
                                            minHeight: isVertical ? '120px' : 'auto', 
                                            textAlign: isHeader ? 'center' : 'left' 
                                        }}
                                      >
                                        {!configModeDocente && editingCell === cell.id ? (
                                          <textarea 
                                            autoFocus 
                                            value={editContent} 
                                            onChange={(e) => setEditContent(e.target.value)} 
                                            onBlur={saveEdit}
                                            className="w-full min-h-[50px] p-1 text-xs resize-y border-blue-400 focus-visible:ring-1 focus-visible:ring-blue-500" 
                                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }} 
                                          />
                                        ) : (
                                          <div 
                                            className={`whitespace-pre-wrap break-words w-full ${isHeader ? 'text-center' : ''}`}
                                            style={{ wordBreak: 'break-word', lineHeight: '1.3' }}
                                          >
                                            {cell.content.trim() || <span className="opacity-0">.</span>}
                                          </div>
                                        )}
                                        {configModeDocente ? (
                                          <div className="absolute top-0 right-0 p-0.5">
                                            {adminLocked ? (
                                              <Lock className="h-3 w-3 text-yellow-600" title="Bloqueado por el Administrador" />
                                            ) : comisionLocked ? (
                                              <Lock className="h-3 w-3 text-red-500" title="Bloqueado por la Comisión" />
                                            ) : (
                                              <Unlock className="h-3 w-3 text-green-600" title="Editable por el Docente" />
                                            )}
                                          </div>
                                        ) : (
                                          anyCellLocked && <Lock className="h-3 w-3 text-amber-600 absolute top-1 right-1 opacity-70 pointer-events-none" />
                                        )}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
