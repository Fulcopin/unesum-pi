"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Upload, Save, Merge, Trash2, Printer, X, Pencil, Check, ArrowUpFromLine, Copy, FileText, Home, Loader2, Lock } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import * as mammoth from "mammoth"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// --- INTERFACES DE DATOS ---
interface TableCell { 
  id: string; 
  content: string; 
  isHeader: boolean; 
  rowSpan: number; 
  colSpan: number; 
  isEditable: boolean;
  isLocked?: boolean;
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
interface SavedProgramaAnaliticoRecord { id: number; nombre: string; periodo: string; materias: string; asignatura_id?: number; datos_tabla: ProgramaAnaliticoData; created_at: string; updated_at: string; }

export default function EditorProgramaAnaliticoPage() {
  const { token, getToken, user } = useAuth()
  const router = useRouter()
  // --- ESTADOS ---
  const [programas, setprogramas] = useState<ProgramaAnaliticoData[]>([])
  const [activeProgramaAnaliticoId, setActiveProgramaAnaliticoId] = useState<string | number | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [savedprogramas, setSavedprogramas] = useState<SavedProgramaAnaliticoRecord[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [carreras, setCarreras] = useState<any[]>([])
  const [asignaturas, setAsignaturas] = useState<any[]>([])
  const [selectedCarrera, setSelectedCarrera] = useState<string>("")
  const [selectedAsignatura, setSelectedAsignatura] = useState<string>("")
  const [showProgramaAnaliticoSelector, setShowProgramaAnaliticoSelector] = useState(false)
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [tempTabTitle, setTempTabTitle] = useState("")

  const [isListLoading, setIsListLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState("")
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- DATOS DERIVADOS ---
  const activeProgramaAnalitico = programas.find((s) => s.id === activeProgramaAnaliticoId);
  const activeTab = activeProgramaAnalitico?.tabs.find(t => t.id === activeTabId);
  const tableData = activeTab ? activeTab.rows : [];

  // --- CARGA INICIAL ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [programasData, periodosData, carrerasData, todasAsignaturasData] = await Promise.all([
          apiRequest("/api/programa-analitico").catch(err => {
            console.error("Error en /api/programa-analitico:", err);
            return { data: [] };
          }),
          apiRequest("/api/periodo").catch(err => {
            console.error("Error en /api/periodo:", err);
            return { data: [] };
          }),
          apiRequest("/api/carreras").catch(err => {
            console.error("Error en /api/carreras:", err);
            return { data: [] };
          }),
          apiRequest("/api/asignaturas").catch(err => {
            console.error("Error en /api/asignaturas:", err);
            return { data: [] };
          })
        ]);
        
        const programasArray = Array.isArray(programasData?.data) ? programasData.data : (Array.isArray(programasData) ? programasData : []);
        const periodosArray = Array.isArray(periodosData?.data) ? periodosData.data : (Array.isArray(periodosData) ? periodosData : []);
        const carrerasArray = Array.isArray(carrerasData?.data) ? carrerasData.data : (Array.isArray(carrerasData) ? carrerasData : []);
        const todasAsignaturasArray = Array.isArray(todasAsignaturasData?.data) ? todasAsignaturasData.data : (Array.isArray(todasAsignaturasData) ? todasAsignaturasData : []);
        
        setSavedprogramas(programasArray);
        setPeriodos(periodosArray);
        setCarreras(carrerasArray);
        setAsignaturas(todasAsignaturasArray); // Cargar TODAS las asignaturas al inicio
        
        console.log('✅ Datos cargados:', {
          programas: programasArray.length,
          periodos: periodosArray.length,
          carreras: carrerasArray.length,
          asignaturas: todasAsignaturasArray.length
        });
      } catch (error) { 
        console.error("❌ Error al cargar datos:", error); 
      }
      finally { setIsListLoading(false); }
    };
    fetchData();
  }, []);
  
  // Cargar asignaturas cuando se selecciona una carrera
  useEffect(() => {
    const fetchAsignaturas = async () => {
      if (!selectedCarrera) {
        setAsignaturas([]);
        setSelectedAsignatura("");
        return;
      }
      
      try {
        const response = await apiRequest(`/api/asignaturas?carrera_id=${selectedCarrera}`);
        const asignaturasArray = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        setAsignaturas(asignaturasArray);
        console.log('✅ Asignaturas cargadas:', asignaturasArray.length);
      } catch (error) {
        console.error("Error al cargar asignaturas:", error);
        setAsignaturas([]);
      }
    };
    
    fetchAsignaturas();
  }, [selectedCarrera]);
  
  useEffect(() => {
    if (activeProgramaAnalitico && activeProgramaAnalitico.tabs.length > 0) {
      if (!activeProgramaAnalitico.tabs.find(t => t.id === activeTabId)) {
        setActiveTabId(activeProgramaAnalitico.tabs[0].id);
      }
    } else {
      setActiveTabId(null);
    }
  }, [activeProgramaAnalitico, activeTabId]);

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
    if (!activeProgramaAnalitico) return alert("No hay un ProgramaAnalitico activo para guardar.")
    if (!selectedPeriod) return alert("Por favor, seleccione un periodo antes de guardar.")
    // ✅ El admin NO necesita asignatura - sube programas GENERALES para que la comisión los use
    
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0",
        name: activeProgramaAnalitico.name || 'ProgramaAnalitico',
        metadata: activeProgramaAnalitico.metadata,
        tabs: activeProgramaAnalitico.tabs.map(tab => ({
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

      const payload = {
        nombre: activeProgramaAnalitico.name || 'ProgramaAnalitico',
        periodo: selectedPeriod,
        materias: activeProgramaAnalitico.name || 'ProgramaAnalitico',
        datos_tabla: datosParaGuardar,
        ...(selectedAsignatura && { asignatura_id: parseInt(selectedAsignatura) })
      }
      
      const isUpdate = activeProgramaAnalitico.id !== null && activeProgramaAnalitico.id !== undefined && !String(activeProgramaAnalitico.id).startsWith('ProgramaAnalitico-')
      const endpoint = isUpdate ? `/api/programa-analitico/${activeProgramaAnalitico.id}` : "/api/programa-analitico"
      const method = isUpdate ? "PUT" : "POST"

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedRecord = result.data as SavedProgramaAnaliticoRecord;
      
      const savedUIData = savedRecord.datos_tabla;
      savedUIData.id = savedRecord.id;
      savedUIData.name = savedRecord.nombre || activeProgramaAnalitico.name;
      
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

      setprogramas((prev) => prev.map((s) => (s.id === activeProgramaAnaliticoId ? savedUIData : s)))
      setActiveProgramaAnaliticoId(savedUIData.id)
      
      if (isUpdate) {
        setSavedprogramas(prev => prev.map(s => s.id === savedRecord.id ? savedRecord : s));
      } else {
        setSavedprogramas(prev => [savedRecord, ...prev]);
      }
      
      alert("¡ProgramaAnalitico guardado exitosamente!")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateProgramaAnalitico = (id: string | number, updates: Partial<ProgramaAnaliticoData>) => {
    setprogramas(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleMetadataChange = (field: 'period' | 'subject' | 'level', value: string) => {
    if (!activeProgramaAnalitico) return;
    const updatedMetadata = { ...activeProgramaAnalitico.metadata, [field]: value };
    updateProgramaAnalitico(activeProgramaAnalitico.id, field === 'subject' ? { metadata: updatedMetadata, name: value } : { metadata: updatedMetadata });
  };

  const handleLoadProgramaAnalitico = (ProgramaAnaliticoId: string, sourceList?: SavedProgramaAnaliticoRecord[]) => {
    console.log("🔍 handleLoadProgramaAnalitico - ID recibido:", ProgramaAnaliticoId);
    console.log("📚 savedprogramas disponibles:", savedprogramas.length);
    
    if (!ProgramaAnaliticoId) {
      console.error("❌ No se proporcionó ProgramaAnaliticoId");
      return;
    }
    
    const id = parseInt(ProgramaAnaliticoId, 10);
    console.log("🔢 ID parseado:", id);
    
    // Usar sourceList si se provee (evita race condition con estado async)
    const list = sourceList ?? savedprogramas;
    const ProgramaAnaliticoToLoad = list.find(s => Number(s.id) === id);
    console.log("📖 ProgramaAnalitico encontrado:", ProgramaAnaliticoToLoad ? "SÍ" : "NO");
    
    if (ProgramaAnaliticoToLoad) {
      console.log("✅ Cargando ProgramaAnalitico:", ProgramaAnaliticoToLoad.nombre);
      console.log("📊 Estructura datos_tabla:", JSON.stringify(ProgramaAnaliticoToLoad.datos_tabla, null, 2));
      
      let editorData = ProgramaAnaliticoToLoad.datos_tabla;
      
      // 🔧 FIX CRÍTICO: Convertir formato de validación a formato de editor
      if ((editorData as any).tipo === 'ProgramaAnalitico_validado' && (editorData as any).titulos && !editorData.tabs) {
        console.log("🔄 Convirtiendo formato de validación a formato de editor...");
        console.log("   Títulos encontrados:", (editorData as any).titulos.length);
        
        // Crear una tabla con los títulos encontrados
        const rows = (editorData as any).titulos.map((titulo: string, index: number) => ({
          id: `row-${Date.now()}-${index}`,
          cells: [
            {
              id: `cell-${Date.now()}-${index}-0`,
              content: titulo,
              colSpan: 1,
              rowSpan: 1,
              isEditable: true
            },
            {
              id: `cell-${Date.now()}-${index}-1`,
              content: "",
              colSpan: 1,
              rowSpan: 1,
              isEditable: true
            }
          ]
        }));
        
        editorData = {
          version: "2.0",
          name: ProgramaAnaliticoToLoad.nombre,
          metadata: {
            ...editorData.metadata,
            subject: ProgramaAnaliticoToLoad.nombre,
            period: ProgramaAnaliticoToLoad.periodo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          tabs: [{
            id: `tab-${Date.now()}`,
            title: "ProgramaAnalitico Importado",
            rows: rows
          }]
        } as any;
        
        console.log("✅ Conversión completada - Filas creadas:", rows.length);
      }
      
      editorData.id = ProgramaAnaliticoToLoad.id;
      
      // ✅ VALIDACIÓN Y NORMALIZACIÓN DE LA ESTRUCTURA
      if (!editorData.tabs || editorData.tabs.length === 0) {
        console.log("⚠️ No hay tabs, creando estructura desde rows...");
        
        // Si tiene rows directamente (formato antiguo)
        if ((editorData as any).rows && Array.isArray((editorData as any).rows)) {
          console.log("📋 Encontradas", (editorData as any).rows.length, "filas directas");
          editorData.tabs = [{ 
            id: `tab-${Date.now()}`, 
            title: "General", 
            rows: (editorData as any).rows 
          }];
        } else {
          // Crear estructura vacía
          console.log("⚠️ No hay rows, creando estructura vacía");
          editorData.tabs = [{ 
            id: `tab-${Date.now()}`, 
            title: "General", 
            rows: [] 
          }];
        }
      } else {
        console.log(`✅ Estructura con ${editorData.tabs.length} tabs encontrada`);
        editorData.tabs.forEach((tab: any, idx: number) => {
          console.log(`   Tab ${idx + 1}: "${tab.title}" - ${tab.rows?.length || 0} filas`);
        });
      }
      
      // Asegurar que el nombre esté presente
      if (!editorData.name) {
        editorData.name = ProgramaAnaliticoToLoad.nombre;
      }
      
      // Normalizar celdas: extraer estilos y marcar como editables
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
      
      setprogramas([editorData]);
      setActiveProgramaAnaliticoId(editorData.id);
      setActiveTabId(editorData.tabs[0]?.id || null);
      
      // Establecer el periodo seleccionado
      setSelectedPeriod(ProgramaAnaliticoToLoad.periodo);
      
      // 🔥 NUEVO: Establecer asignatura si existe
      if (ProgramaAnaliticoToLoad.asignatura_id) {
        setSelectedAsignatura(ProgramaAnaliticoToLoad.asignatura_id.toString());
        console.log("✅ Asignatura establecida:", ProgramaAnaliticoToLoad.asignatura_id);
        
        // Buscar la carrera de esta asignatura para cargar el selector
        const asignaturaData = asignaturas.find((a: any) => a.id === ProgramaAnaliticoToLoad.asignatura_id);
        if (asignaturaData?.carrera_id) {
          setSelectedCarrera(asignaturaData.carrera_id.toString());
          console.log("✅ Carrera establecida:", asignaturaData.carrera_id);
        }
      }
      
      console.log("✅ ProgramaAnalitico cargado exitosamente");
      console.log("   - ID:", editorData.id);
      console.log("   - Nombre:", editorData.name);
      console.log("   - Periodo:", ProgramaAnaliticoToLoad.periodo);
      console.log("   - Asignatura ID:", ProgramaAnaliticoToLoad.asignatura_id);
      console.log("   - Tabs:", editorData.tabs.length);
      console.log("   - Filas en tab activo:", editorData.tabs[0]?.rows?.length || 0);
    } else {
      console.error("❌ No se encontró el ProgramaAnalitico con ID:", id);
      console.log("📋 IDs disponibles:", savedprogramas.map(s => s.id));
    }
  };

  // --- NUEVA FUNCIÓN: Upload con validación para comisión académica ---
  const handleUploadConValidacion = async (file: File) => {
    try {
      // Verificar que haya un periodo seleccionado
      if (!selectedPeriod) {
        alert("❌ Por favor seleccione un periodo académico antes de subir el documento");
        setIsLoading(false);
        return;
      }

      const periodoNombre = periodos.find(p => p.id.toString() === selectedPeriod)?.nombre || selectedPeriod;

      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nombre', file.name.replace(/\.docx?$/i, ''));
      formData.append('periodo', periodoNombre);
      formData.append('materias', activeProgramaAnalitico?.metadata?.subject || 'Sin especificar');

      console.log(`📤 Enviando ProgramaAnalitico para validación - Periodo: ${periodoNombre}`);

      // Enviar al endpoint de validación
      const currentToken = token || getToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${API_URL}/programa-analitico/upload-validado`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ✅ VALIDACIÓN EXITOSA
        const validacion = result.data?.validacion || {};
        alert(
          `✅ ProgramaAnalitico validado y guardado exitosamente\n\n` +
          `Coincidencia: ${validacion.porcentaje_coincidencia || 100}%\n` +
          `Mínimo requerido: 95%\n` +
          `Campos requeridos: ${validacion.total_requeridos || 0}\n` +
          `Campos encontrados: ${validacion.encontrados || 0}`
        );
        
        // Recargar la lista de programas guardados
        try {
          const programasData = await apiRequest("/api/programa-analitico");
          const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
          setSavedprogramas(programasArray);
          
          // Cargar el ProgramaAnalitico recién guardado
          // Se pasa programasArray directamente para evitar race condition con el estado async
          if (result.data?.id) {
            handleLoadProgramaAnalitico(result.data.id.toString(), programasArray);
          }
        } catch (err) {
          console.error("Error recargando lista:", err);
        }
      } else {
        // ❌ VALIDACIÓN FALLIDA
        const detalles = result.detalles || {};
        const faltantes = detalles.faltantes || [];
        const extras = detalles.extras || [];
        
        let mensaje = `❌ El ProgramaAnalitico NO cumple con la estructura requerida\n\n`;
        mensaje += `📊 Coincidencia: ${detalles.porcentaje_coincidencia || 0}% (mínimo requerido: 95%)\n`;
        mensaje += `📋 Total requeridos: ${detalles.total_requeridos || 0}\n`;
        mensaje += `✅ Encontrados: ${detalles.encontrados || 0}\n\n`;
        
        if (faltantes.length > 0) {
          mensaje += `❌ Campos Faltantes (${faltantes.length}):\n`;
          faltantes.slice(0, 10).forEach((campo: string) => {
            mensaje += `   • ${campo}\n`;
          });
          if (faltantes.length > 10) {
            mensaje += `   ... y ${faltantes.length - 10} más\n`;
          }
        }
        
        if (extras.length > 0) {
          mensaje += `\n⚠️ Campos Extra (${extras.length}):\n`;
          extras.slice(0, 5).forEach((campo: string) => {
            mensaje += `   • ${campo}\n`;
          });
        }
        
        mensaje += `\n💡 Por favor, revise el documento y asegúrese de que contenga todos los campos requeridos según la plantilla del administrador.`;
        
        alert(mensaje);
      }
    } catch (error: any) {
      console.error('❌ Error en validación:', error);
      alert(`❌ Error al validar el ProgramaAnalitico:\n${error.message || 'Error desconocido'}\n\nPor favor, verifique que existe una plantilla de referencia para este periodo.`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- IMPORTACIÓN MAESTRA V8: HEURÍSTICA DE ESTRUCTURA Y VERTICALIDAD ---
  const handleProgramaAnaliticoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = ""; 

    setIsLoading(true);

    // 🆕 Si es comisión académica, usar validación contra plantilla
    if (user?.rol === 'comision_academica') {
      await handleUploadConValidacion(file);
      return;
    }

    // Admin continúa con el flujo normal
    try {
      const { value: html } = await mammoth.convertToHtml(
        { arrayBuffer: await file.arrayBuffer() },
        { 
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Title'] => h1:fresh",
            "b => strong",
            // Forzar detección de celdas de encabezado si el word tiene estilo "Header"
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

        // 1. SI ES TABLA
        if (tagName === "TABLE") {
             const rowsRaw = Array.from(element.querySelectorAll("tr"));
             const tableContent = rowsRaw.map(r => r.textContent).join(" ").toUpperCase();
             // Filtro de tablas basura
             const isJunkTable = (tableContent.includes("UNIVERSIDAD") || tableContent.includes("ProgramaAnalitico")) && rowsRaw.length < 6;

             if (isJunkTable) return; 
             
             // --- LÓGICA DE DETECCIÓN DE ESTRUCTURA ---
             const rows: TableRow[] = rowsRaw.map((tr, rIdx) => ({
                id: `row-${newTabs.length}-${rIdx}-${Date.now()}`,
                cells: Array.from(tr.querySelectorAll("td, th")).map((td, cIdx) => {
                  const content = td.textContent?.trim() || "";
                  const contentUpper = content.toUpperCase();
                  
                  // DETECCIÓN DE ENCABEZADO
                  // En tablas complejas (como la imagen), las primeras filas suelen ser encabezados
                  const hasBold = !!td.querySelector("strong, b");
                  // Consideramos header si está en negrita, es <th> o está en las primeras 2 filas de una tabla compleja
                  const isHeader = td.tagName === "TH" || hasBold || (rowsRaw.length > 3 && rIdx <= 1);

                  // DETECCIÓN DE VERTICAL (PALABRAS CLAVE)
                  // Solo estas palabras EXACTAS deben ser verticales
                  const verticalKeywords = ["PRESENCIAL", "SINCRÓNICA", "SINCRONICA", "PFAE", "TA"];
                  
                  let guessVertical = false;
                  // Comparación exacta: solo si el contenido ES exactamente una de estas palabras
                  if (isHeader) {
                      const contentTrimmed = contentUpper.trim();
                      guessVertical = verticalKeywords.includes(contentTrimmed);
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

        // 2. SI ES TEXTO
        const isIgnored = text.length < 3 || textUpper.includes("UNIVERSIDAD") || textUpper.includes("ProgramaAnalitico") || tagName === "IMG";

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
        id: `ProgramaAnalitico-${Date.now()}`,
        name: meta.subject || file.name.replace(/\.docx?$/i, ''),
        description: "Importado",
        metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        tabs: newTabs,
      };
      
      setprogramas([newData]);
      setActiveProgramaAnaliticoId(newData.id);
      setActiveTabId(newTabs[0]?.id || null);

    } catch (e) { console.error(e); alert("Error crítico."); } 
    finally { setIsLoading(false); }
  };

  // --- MÉTODOS DE EDICIÓN ---
  const handleUpdateActiveTabRows = (newRows: TableRow[]) => {
    if (!activeProgramaAnalitico || !activeTabId) return;
    const updatedTabs = activeProgramaAnalitico.tabs.map(tab => tab.id === activeTabId ? { ...tab, rows: newRows } : tab);
    updateProgramaAnalitico(activeProgramaAnalitico.id, { tabs: updatedTabs });
  };

  const startRenamingTab = (tab: TabData) => {
    setEditingTabId(tab.id);
    setTempTabTitle(tab.title);
  }

  const saveTabRename = () => {
    if (!activeProgramaAnalitico || !editingTabId) return;
    const updatedTabs = activeProgramaAnalitico.tabs.map(tab => tab.id === editingTabId ? { ...tab, title: tempTabTitle || "Sin Título" } : tab);
    updateProgramaAnalitico(activeProgramaAnalitico.id, { tabs: updatedTabs });
    setEditingTabId(null);
  }

  const addTab = () => {
    if (!activeProgramaAnalitico) return;
    const newTab: TabData = {
      id: `tab-${Date.now()}`,
      title: `Nueva Sección`,
      rows: [
        { id: `r1-${Date.now()}`, cells: [{id: `c11-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}, {id: `c12-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}] },
      ]
    };
    const updatedTabs = [...activeProgramaAnalitico.tabs, newTab];
    updateProgramaAnalitico(activeProgramaAnalitico.id, { tabs: updatedTabs });
    setActiveTabId(newTab.id);
  };
  
  const removeTab = (tabIdToRemove: string) => {
    if (!activeProgramaAnalitico) return;
    if (activeProgramaAnalitico.tabs.length <= 1) return alert("Debe quedar al menos una sección.");
    if (!window.confirm("¿Estás seguro de eliminar esta sección?")) return;
    const updatedTabs = activeProgramaAnalitico.tabs.filter(t => t.id !== tabIdToRemove);
    updateProgramaAnalitico(activeProgramaAnalitico.id, { tabs: updatedTabs });
    if (activeTabId === tabIdToRemove) setActiveTabId(updatedTabs[0]?.id || null);
  };

  const findCellPosition = (id: string): {rowIndex: number, colIndex: number} | null => { if (!tableData) return null; for(let r=0;r<tableData.length;r++){ const c=tableData[r].cells.findIndex(cell=>cell.id===id); if(c!==-1)return{rowIndex: r, colIndex: c}} return null }
  const startEditing = (id: string, content: string) => { setEditingCell(id); setEditContent(content) }
  const saveEdit = () => { if(editingCell){ const updated=tableData.map(row=>({...row,cells:row.cells.map(c=>(c.id===editingCell?{...c,content:editContent}:c))})); handleUpdateActiveTabRows(updated); setEditingCell(null);setEditContent("")}}
  const cancelEdit = () => { setEditingCell(null); setEditContent("") }
  const handleCellClick = (id: string, e: React.MouseEvent) => { e.ctrlKey||e.metaKey ? setSelectedCells(p => p.includes(id)?p.filter(i=>i!==id):[...p,id]) : setSelectedCells([id]) }
  
  // 🆕 Función para inicializar tabla vacía
  const initializeEmptyTable = (rows: number = 5, cols: number = 3) => {
    console.log(`🎨 Inicializando tabla vacía: ${rows} filas x ${cols} columnas`);
    const newRows: TableRow[] = [];
    for (let r = 0; r < rows; r++) {
      const rowId = `r-${Date.now()}-${r}`;
      const cells: TableCell[] = [];
      for (let c = 0; c < cols; c++) {
        cells.push({
          id: `c-${rowId}-${c}`,
          content: "",
          isHeader: r === 0, // Primera fila como headers
          rowSpan: 1,
          colSpan: 1,
          isEditable: true
        });
      }
      newRows.push({ id: rowId, cells });
    }
    handleUpdateActiveTabRows(newRows);
    console.log("✅ Tabla inicializada con éxito");
  };
  
  const addRowAt=(idx:number)=>{
    // Si la tabla está vacía, inicializar primero
    if(!tableData.length) {
      console.log("⚠️ Tabla vacía, inicializando...");
      initializeEmptyTable(3, 3);
      return;
    }
    const rId=`r-${Date.now()}`,nCols=tableData[0].cells.reduce((a,c)=>a+c.colSpan,0);
    const nR:TableRow={id:rId,cells:Array.from({length:nCols},(_,i)=>({id:`c-${rId}-${i}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0}))};
    const nRows=[...tableData];nRows.splice(idx,0,nR);handleUpdateActiveTabRows(nRows)
  }
  const addColumnAt=(idx:number)=>{
    // Si la tabla está vacía, inicializar primero
    if(!tableData.length) {
      console.log("⚠️ Tabla vacía, inicializando...");
      initializeEmptyTable(3, 3);
      return;
    }
    const updated=tableData.map(r=>{const nC:TableCell={id:`c-${r.id}-${Date.now()}`,content:"",isHeader:!1,rowSpan:1,colSpan:1,isEditable:!0};const nCells=[...r.cells];nCells.splice(idx,0,nC);return{...r,cells:nCells}});
    handleUpdateActiveTabRows(updated)
  }
  
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
    if (!activeProgramaAnalitico) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginL = 8;
    const marginR = 8;
    const contentWidth = pageWidth - marginL - marginR;

    // --- FIRMAS del documento (para sección VISADO) ---
    let firmasData: any = null;
    const docIdNum = typeof activeProgramaAnaliticoId === 'number' ? activeProgramaAnaliticoId : null;
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
    const programaTitle = activeProgramaAnalitico.name || '';
    const periodoName = periodos.find((p: any) => String(p.id) === selectedPeriod || p.nombre === (activeProgramaAnalitico as any).periodo)?.nombre
      || (activeProgramaAnalitico as any).periodo || '';
    doc.setFillColor(240, 244, 250);
    doc.rect(marginL, 16, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 50, 95);
    const headerLine = [programaTitle, periodoName ? `Periodo: ${periodoName}` : ''].filter(Boolean).join('   |   ');
    if (headerLine) doc.text(headerLine, pageWidth / 2, 20.5, { align: 'center' });

    let currentY = 25;

    // --- CONTENIDO POR CADA PESTAÑA ---
    for (const tab of activeProgramaAnalitico.tabs) {
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
      outerBlock: for (const row of tab.rows) {
        let logCol = 0;
        for (const cell of row.cells.filter((c: any) => c.rowSpan > 0 && c.colSpan > 0)) {
          if ((cell.content || '').toUpperCase().includes('PERIODO')) {
            periodoColStart = logCol;
            periodoColSpan = cell.colSpan || 1;
            break outerBlock;
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

      // rowSpan siempre 1 para evitar el warning "row -1" de jspdf-autotable
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

            const isPeriodoCell = periodoColStart >= 0 && currentLogCol >= periodoColStart && currentLogCol < periodoColStart + periodoColSpan;

            pdfRow.push({
              content: (cell.content || '').replace(/\r\n/g, '\n'),
              rowSpan: 1,
              colSpan: cellSpan,
              styles: {
                fontStyle: cell.isHeader ? 'bold' as const : 'normal' as const,
                fillColor: cell.isHeader ? [220, 229, 242] : (cell.backgroundColor || [255, 255, 255]),
                textColor: cell.isHeader ? [25, 50, 95] : [30, 30, 30],
                fontSize: cell.isHeader ? 6.5 : 6,
                cellPadding: { top: 0.6, right: 1, bottom: 0.6, left: 1 },
                halign: (cell.isHeader || isPeriodoCell) ? 'center' as const : 'left' as const,
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

    // ─── SECCIÓN VISADO ───────────────────────────────────────────────
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
  }

  // --- FUNCIONES ADICIONALES ---
  const handleDuplicateProgramaAnalitico = async (ProgramaAnaliticoId: number) => {
    const ProgramaAnaliticoToClone = savedprogramas.find(s => s.id === ProgramaAnaliticoId);
    if (!ProgramaAnaliticoToClone) return;
    
    try {
      const clonedData = JSON.parse(JSON.stringify(ProgramaAnaliticoToClone.datos_tabla));
      clonedData.id = `ProgramaAnalitico-${Date.now()}`;
      clonedData.name = `${ProgramaAnaliticoToClone.nombre} (Copia)`;
      clonedData.metadata.createdAt = new Date().toISOString();
      clonedData.metadata.updatedAt = new Date().toISOString();
      
      // Guardar automáticamente en el backend
      const payload = {
        nombre: clonedData.name,
        periodo: ProgramaAnaliticoToClone.periodo,
        materias: ProgramaAnaliticoToClone.materias,
        datos_tabla: clonedData
      };
      
      const result = await apiRequest('/api/programa-analitico', { method: 'POST', body: JSON.stringify(payload) });
      
      // Recargar la lista de programas
      const programasData = await apiRequest("/api/programa-analitico").catch(() => ({ data: [] }));
      const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setSavedprogramas(programasArray);
      
      alert("ProgramaAnalitico duplicado exitosamente");
    } catch (error: any) {
      alert(`Error al duplicar: ${error.message}`);
    }
  };

  const handleDeleteProgramaAnalitico = async (ProgramaAnaliticoId: number) => {
    if (!window.confirm("¿Está seguro de eliminar este ProgramaAnalitico? Esta acción no se puede deshacer.")) return;
    
    setIsLoading(true);
    try {
      await apiRequest(`/api/programa-analitico/${ProgramaAnaliticoId}`, { method: 'DELETE' });
      
      // Recargar la lista de programas
      const programasData = await apiRequest("/api/programa-analitico").catch(() => ({ data: [] }));
      const programasArray = Array.isArray(programasData?.data) ? programasData.data : [];
      setSavedprogramas(programasArray);
      
      alert("ProgramaAnalitico eliminado exitosamente");
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProgramaAnalitico = (ProgramaAnaliticoId: number) => {
    console.log("Editando ProgramaAnalitico ID:", ProgramaAnaliticoId);
    handleLoadProgramaAnalitico(ProgramaAnaliticoId.toString());
    setShowProgramaAnaliticoSelector(false);
  };

  const handleNewProgramaAnalitico = () => {
    setShowProgramaAnaliticoSelector(true);
  };

  const programasFiltered = selectedPeriod 
    ? savedprogramas.filter(s => s.periodo === selectedPeriod)
    : savedprogramas;
  
  return (
    <ProtectedRoute allowedRoles={["administrador", "comision_academica", "profesor"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          {!activeProgramaAnalitico ? (
            <>
              {/* Pantalla Inicial */}
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-emerald-800">
                    <span>Editor de Programa Analítico</span>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowProgramaAnaliticoSelector(true)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo
                      </Button>
                      <Button onClick={handleSaveToDB} disabled={!activeProgramaAnalitico || isSaving} className="bg-blue-600 hover:bg-blue-700">
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar
                      </Button>
                      <Button onClick={handlePrintToPdf} disabled={!activeProgramaAnalitico} variant="outline">
                        <Printer className="h-4 w-4 mr-2" /> Imprimir
                      </Button>
                      <Button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        variant="outline"
                        className="border-gray-400 text-gray-700 hover:bg-gray-50 px-6"
                        disabled={isSaving}
                      >
                        <Home className="h-4 w-4 mr-2" />
                        MENÚ PRINCIPAL
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
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

              {/* Modal Selector de ProgramaAnalitico */}
              {showProgramaAnaliticoSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Seleccionar ProgramaAnalitico</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowProgramaAnaliticoSelector(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {user?.rol === 'comision_academica' ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded">
                          <p className="text-sm text-emerald-800 mb-2">Seleccione una plantilla subida por el administrador para el periodo seleccionado.</p>
                          <p className="text-xs text-gray-500">Si no aparece ninguna plantilla, verifique que el administrador haya subido programas para ese periodo.</p>
                        </div>
                      ) : (
                        <>
                          <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                            {isLoading ? "Procesando..." : <><Upload className="h-4 w-4 mr-2" /> Subir Nuevo Word (.docx)</>}
                          </Button>
                          <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { handleProgramaAnaliticoUpload(e); setShowProgramaAnaliticoSelector(false); }} className="hidden" />
                        </>
                      )}

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
                                <Button onClick={() => { handleLoadProgramaAnalitico(s.id.toString()); setShowProgramaAnaliticoSelector(false); }} className="bg-emerald-600 hover:bg-emerald-700">
                                  Seleccionar
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">No hay ProgramaAnalitico disponibles</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tabla de ProgramaAnalitico Creados */}
              <Card>
                <CardHeader>
                  <CardTitle>Programa Analitico Creados</CardTitle>
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
                                  <FileText className="h-4 w-4 text-emerald-600" />
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
                                  <Button variant="outline" size="sm" onClick={() => handleEditProgramaAnalitico(s.id)} className="text-blue-600 hover:text-blue-700">
                                    <Pencil className="h-4 w-4 mr-1" /> Modificar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDuplicateProgramaAnalitico(s.id)} className="text-emerald-600 hover:text-emerald-700">
                                    <Copy className="h-4 w-4 mr-1" /> Duplicar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeleteProgramaAnalitico(s.id)} className="text-red-600 hover:text-red-700">
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
                      <p className="text-gray-500">No hay ProgramaAnalitico creados aún</p>
                      <Button onClick={handleNewProgramaAnalitico} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Crear Primer ProgramaAnalitico
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-emerald-800">
                    <div className="flex items-center gap-2 min-w-0">
                      {editingName ? (
                        <>
                          <Input
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setprogramas(p => p.map(s => s.id === activeProgramaAnaliticoId ? { ...s, name: tempName } : s)); setEditingName(false); } if (e.key === 'Escape') setEditingName(false); }}
                            className="h-8 text-sm font-semibold"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7" onClick={() => { setprogramas(p => p.map(s => s.id === activeProgramaAnaliticoId ? { ...s, name: tempName } : s)); setEditingName(false); }}><Check className="h-4 w-4 text-green-600" /></Button>
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7" onClick={() => setEditingName(false)}><X className="h-4 w-4 text-red-500" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="truncate">{activeProgramaAnalitico.name}</span>
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7 flex-shrink-0" title="Renombrar" onClick={() => { setTempName(activeProgramaAnalitico.name); setEditingName(true); }}><Pencil className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                       <Button onClick={() => { setActiveProgramaAnaliticoId(null); setprogramas([]); }} variant="outline" size="sm"> <Plus className="h-4 w-4 mr-2" /> Nuevo</Button>
                       <Button onClick={handleSaveToDB} className="bg-blue-600 hover:bg-blue-700" size="sm" disabled={isSaving}>{isSaving ? "Guardando..." : <><Save className="h-4 w-4 mr-2" /> Guardar</>}</Button>
                       <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!activeTab}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
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
                <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-emerald-100">
                  {activeProgramaAnalitico.tabs.map(tab => (
                    <div key={tab.id} className="relative group">
                      {editingTabId === tab.id ? (
                        <div className="flex items-center bg-white border border-emerald-500 rounded px-1 shadow-sm h-10">
                          <Input value={tempTabTitle} onChange={(e) => setTempTabTitle(e.target.value)} className="h-8 w-40 border-none focus-visible:ring-0 px-1" autoFocus onKeyDown={(e) => e.key === "Enter" && saveTabRename()} onBlur={saveTabRename} />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={saveTabRename}><Check className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <div onClick={() => setActiveTabId(tab.id)} onDoubleClick={() => startRenamingTab(tab)} className={`flex items-center h-10 px-4 rounded-md border cursor-pointer transition-all duration-200 ${activeTabId === tab.id ? 'bg-emerald-600 text-white border-emerald-700 shadow-md font-medium' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'}`}>
                          <span className="max-w-[150px] truncate mr-2" title={tab.title}>{tab.title}</span>
                          <div className={`flex items-center gap-1 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                             <Pencil className={`h-3 w-3 cursor-pointer ${activeTabId === tab.id ? 'text-emerald-200 hover:text-white' : 'text-emerald-400 hover:text-emerald-700'}`} onClick={(e) => { e.stopPropagation(); startRenamingTab(tab); }} />
                             <X className={`h-4 w-4 cursor-pointer rounded-full p-0.5 ${activeTabId === tab.id ? 'text-red-200 hover:bg-red-500 hover:text-white' : 'text-red-400 hover:bg-red-100 hover:text-red-600'}`} onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button onClick={addTab} variant="outline" size="sm" className="h-10 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50"><Plus className="h-4 w-4 mr-1" /> Nueva Sección</Button>
                </div>
                <p className="text-xs text-gray-400 mt-1 italic pl-1">* Doble clic en una pestaña para renombrarla.</p>
              </div>

              {activeTab && (
                <Card className="border-emerald-100 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2 mb-4 p-2 border rounded-md bg-emerald-50/50">
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertRow('above')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Fila ↑</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertRow('below')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Fila ↓</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertColumn('left')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Col ←</Button>
                       <Button size="sm" className="bg-white text-emerald-700 border-emerald-200" onClick={() => handleInsertColumn('right')} disabled={!selectedCells.length}><Plus className="h-3 w-3 mr-1"/>Col →</Button>
                       <div className="w-px h-6 bg-emerald-200 mx-1"></div>
                       <Button size="sm" onClick={removeSelectedRow} className="bg-red-50 text-red-600 border-red-200" disabled={!selectedCells.length}><Minus className="h-3 w-3 mr-1"/>Fila</Button>
                       <Button size="sm" onClick={removeSelectedColumn} className="bg-red-50 text-red-600 border-red-200" disabled={!selectedCells.length}><Minus className="h-3 w-3 mr-1"/>Col</Button>
                       <div className="w-px h-6 bg-emerald-200 mx-1"></div>
                       <Button size="sm" onClick={toggleVerticalText} className="bg-white text-emerald-700 border-emerald-200" disabled={!selectedCells.length} title="Rotar Texto Verticalmente"><ArrowUpFromLine className="h-4 w-4 mr-1" /> Vertical</Button>
                       <Button size="sm" onClick={mergeCells} disabled={selectedCells.length < 2} variant="outline"><Merge className="h-4 w-4 mr-1" />Unir</Button>
                       <Button size="sm" onClick={clearSelectedCells} disabled={!selectedCells.length} variant="outline"><Trash2 className="h-4 w-4 mr-1" />Limpiar</Button>
                       <div className="w-px h-6 bg-emerald-200 mx-1"></div>
                       <Button size="sm" onClick={toggleLockCells} disabled={!selectedCells.length} className="bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100" title="Bloquear/Desbloquear celda para docentes"><Lock className="h-4 w-4 mr-1" />Bloquear</Button>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                      <table className="w-full border-collapse text-sm text-left"> 
                        <tbody className="divide-y divide-gray-200">
                          {tableData.length === 0 ? (
                            <tr>
                              <td className="p-12 text-center">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="text-gray-400">
                                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-lg font-medium text-gray-600">La tabla está vacía</p>
                                    <p className="text-sm text-gray-500 mt-1">Crea una tabla inicial o sube un archivo Word</p>
                                  </div>
                                  <Button 
                                    onClick={() => initializeEmptyTable(5, 3)} 
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear Tabla Inicial (5x3)
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                          tableData.map((row) => {
                            const isFormRow = row.cells.length === 3 && row.cells[1].content.trim() === ':';

                            return (
                              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                {row.cells.map((cell, index) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;
                                  
                                  const isSelected = selectedCells.includes(cell.id);
                                  const isHeader = cell.isHeader;
                                  const isSeparator = cell.content.trim() === ':';
                                  const isVertical = cell.textOrientation === 'vertical';

                                  // --- LÓGICA DE ANCHOS ---
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
                                  
                                  // --- ALINEACIÓN: CENTRAR TÍTULOS Y VERTICALES ---
                                  let justifyContent = 'justify-start'; 
                                  if (isHeader || isSeparator || isVertical) justifyContent = 'justify-center';
                                  
                                  return (
                                    <td 
                                      key={cell.id} 
                                      className={`
                                        border border-gray-200 
                                        relative transition-all duration-75 ease-in-out
                                        ${isHeader ? "bg-gray-50 font-semibold text-gray-900" : "bg-white text-gray-700"}
                                        ${cell.isLocked ? "bg-amber-50/60" : ""}
                                        ${isSelected ? "ring-2 ring-inset ring-emerald-500 z-10" : ""}
                                      `}
                                      style={{ 
                                        backgroundColor: cell.backgroundColor || (isHeader ? '#f9fafb' : '#ffffff'),
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
                                      onDoubleClick={() => cell.isEditable && startEditing(cell.id, cell.content)}
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
                                        {editingCell === cell.id ? (
                                          <Textarea 
                                            value={editContent} 
                                            onChange={(e) => setEditContent(e.target.value)} 
                                            autoFocus 
                                            onBlur={saveEdit} 
                                            className="w-full min-h-[60px] p-1 bg-white border-emerald-400 focus:ring-0 text-sm resize-none shadow-sm leading-normal"
                                            style={{ writingMode: 'horizontal-tb', transform: 'none' }} 
                                            onKeyDown={(e) => { 
                                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } 
                                              if (e.key === "Escape") { cancelEdit(); } 
                                            }}
                                          />
                                        ) : (
                                          <div className="whitespace-pre-wrap leading-normal break-words">
                                            {cell.content || <span className="opacity-0">.</span>}
                                          </div>
                                        )}
                                      </div>
                                      {cell.isLocked && (
                                        <div className="absolute top-0.5 right-0.5" title="Bloqueado para docentes">
                                          <Lock className="h-3 w-3 text-amber-500" />
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            );
                          })
                          )}
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
