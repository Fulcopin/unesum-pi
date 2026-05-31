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
import { Plus, Minus, Upload, Save, Merge, Trash2, Printer, X, Pencil, Check, ArrowUpFromLine, Copy, FileText, Home, Lock } from "lucide-react"
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
  textOrientation?: 'horizontal' | 'vertical'; fontFamily?: string; 
}

interface TableRow { id: string; cells: TableCell[]; }
interface TabData { id: string; title: string; rows: TableRow[]; }
interface SyllabusData { id: string | number; name: string; description: string; tabs: TabData[]; metadata: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; }; }
interface SavedSyllabusRecord { id: number; nombre: string; periodo: string; materias: string; datos_syllabus: SyllabusData; created_at: string; updated_at: string; }

export default function EditorSyllabusPage() {
  const { token, getToken, user } = useAuth()
  const router = useRouter()
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
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState("")
  
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [cellLockState, setCellLockState] = useState<Record<string, boolean>>({})
  
  // --- MODO EDICIÓN DE SYLLABUS DE COMISIÓN (para bloquear celdas a docentes) ---
  const [editingComisionId, setEditingComisionId] = useState<number | null>(null)
  const [comisionSyllabusList, setComisionSyllabusList] = useState<any[]>([])
  const [showComisionSelector, setShowComisionSelector] = useState(false)
  const [isLoadingComision, setIsLoadingComision] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- DATOS DERIVADOS ---
  const activeSyllabus = syllabi.find((s) => s.id === activeSyllabusId);
  const activeTab = activeSyllabus?.tabs.find(t => t.id === activeTabId);
  const tableData = activeTab ? activeTab.rows : [];
  const lockedCellCount = Object.values(cellLockState).filter(Boolean).length;

  const buildCellLockState = (tabs: TabData[] = []) => {
    const nextState: Record<string, boolean> = {}
    tabs.forEach((tab) => {
      (tab.rows || []).forEach((row) => {
        (row.cells || []).forEach((cell) => {
          nextState[cell.id] = !!cell.isLocked
        })
      })
    })
    return nextState
  }

  // --- CARGA INICIAL ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [syllabiData, periodosData] = await Promise.all([
          apiRequest("/api/syllabi").catch(err => {
            console.error("Error en /api/syllabi:", err);
            return { data: [] };
          }),
          apiRequest("/api/periodo").catch(err => {
            console.error("Error en /api/periodo:", err);
            return { data: [] };
          })
        ]);
        
        const syllabiArray = Array.isArray(syllabiData?.data) ? syllabiData.data : (Array.isArray(syllabiData) ? syllabiData : []);
        const periodosArray = Array.isArray(periodosData?.data) ? periodosData.data : (Array.isArray(periodosData) ? periodosData : []);
        
        setSavedSyllabi(syllabiArray);
        setPeriodos(periodosArray);
        
        console.log('✅ Datos cargados:', {
          syllabi: syllabiArray.length,
          periodos: periodosArray.length,
          periodosData: periodosArray
        });
      } catch (error) { 
        console.error("❌ Error al cargar datos:", error); 
      }
      finally { setIsListLoading(false); }
    };
    fetchData();
  }, []);
  
  useEffect(() => {
    if (activeSyllabus && activeSyllabus.tabs.length > 0) {
      if (!activeSyllabus.tabs.find(t => t.id === activeTabId)) {
        setActiveTabId(activeSyllabus.tabs[0].id);
      }
    } else {
      setActiveTabId(null);
    }
  }, [activeSyllabus, activeTabId]);

  const handlePeriodChange = (periodNombre: string) => {
    setSelectedPeriod(periodNombre);
    if (activeSyllabusId || isListLoading || savedSyllabi.length === 0) return;
    const syllabiDelPeriodo = savedSyllabi.filter(s => s.periodo === periodNombre);
    if (syllabiDelPeriodo.length === 0) return;
    const syllabusToLoad = syllabiDelPeriodo[0];
    let editorData = syllabusToLoad.datos_syllabus;
    if (!editorData) return;

    // Clonar para evitar mutación directa en savedSyllabi
    editorData = JSON.parse(JSON.stringify(editorData));
    editorData.id = syllabusToLoad.id;
    if (!editorData.tabs || editorData.tabs.length === 0) {
      editorData.tabs = (editorData as any).rows
        ? [{ id: `tab-${Date.now()}`, title: 'General', rows: (editorData as any).rows }]
        : [{ id: `tab-${Date.now()}`, title: 'General', rows: [] }];
    }
    if (!editorData.name) editorData.name = syllabusToLoad.nombre;

    setSyllabi([editorData]);
    setActiveSyllabusId(editorData.id);
    setActiveTabId(editorData.tabs[0]?.id || null);
    setCellLockState(buildCellLockState(editorData.tabs));
    setEditingComisionId(null);
  };

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
    if (!activeSyllabus) return alert("No hay un syllabus activo para guardar.")
    if (!selectedPeriod) return alert("Por favor, seleccione un periodo antes de guardar.")
    
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0",
        metadata: activeSyllabus.metadata,
        tabs: activeSyllabus.tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id,
            cells: row.cells.map(cell => ({
              ...cell,
              isLocked: cell.id in cellLockState ? !!cellLockState[cell.id] : !!cell.isLocked,
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
        nombre: activeSyllabus.name || 'Syllabus',
        periodo: selectedPeriod,
        materias: activeSyllabus.name || 'Syllabus',
        datos_syllabus: datosParaGuardar
      }
      
      const isUpdate = activeSyllabus.id !== null && activeSyllabus.id !== undefined && !String(activeSyllabus.id).startsWith('syllabus-')

      // === GUARDAR EN SYLLABUS DE COMISIÓN (para que los bloqueos lleguen al docente) ===
      if (editingComisionId) {
        const result = await apiRequest(`/api/comision-academica/syllabus/${editingComisionId}`, {
          method: 'PUT',
          body: JSON.stringify({ datos_syllabus: datosParaGuardar })
        })
        const savedRecord = result.data
        let savedData = savedRecord.datos_syllabus
        if (typeof savedData === 'string') { try { savedData = JSON.parse(savedData) } catch(e) {} }
        savedData = savedData || datosParaGuardar
        savedData.id = `comision-${editingComisionId}`
        savedData.name = activeSyllabus.name
        if (savedData.tabs) {
          savedData.tabs = savedData.tabs.map((t: any) => ({
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
          }))
        }
        setCellLockState(buildCellLockState(savedData.tabs || []))
        setSyllabi((prev) => prev.map((s) => (s.id === activeSyllabusId ? savedData : s)))
        const savedLockedCount = Object.values(buildCellLockState(savedData.tabs || [])).filter(Boolean).length
        alert(`✅ Bloqueos guardados en el syllabus de comisión. Celdas bloqueadas: ${savedLockedCount}.`)
        return
      }

      // === GUARDAR NORMAL EN TABLA SYLLABI ===
      const endpoint = isUpdate ? `/api/syllabi/${activeSyllabus.id}` : "/api/syllabi"
      const method = isUpdate ? "PUT" : "POST"

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedRecord = result.data as SavedSyllabusRecord;
      
      const savedUIData = savedRecord.datos_syllabus;
      savedUIData.id = savedRecord.id;
      savedUIData.name = savedRecord.nombre || activeSyllabus.name;
      
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

            setCellLockState(buildCellLockState(savedUIData.tabs || []))

      setSyllabi((prev) => prev.map((s) => (s.id === activeSyllabusId ? savedUIData : s)))
      setActiveSyllabusId(savedUIData.id)
      
      if (isUpdate) {
        setSavedSyllabi(prev => prev.map(s => s.id === savedRecord.id ? savedRecord : s));
      } else {
        setSavedSyllabi(prev => [savedRecord, ...prev]);
      }
      
      alert("¡Syllabus guardado exitosamente!")
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateSyllabus = (id: string | number, updates: Partial<SyllabusData>) => {
    setSyllabi(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleMetadataChange = (field: 'period' | 'subject' | 'level', value: string) => {
    if (!activeSyllabus) return;
    const updatedMetadata = { ...activeSyllabus.metadata, [field]: value };
    updateSyllabus(activeSyllabus.id, field === 'subject' ? { metadata: updatedMetadata, name: value } : { metadata: updatedMetadata });
  };

  const handleLoadSyllabus = (syllabusId: string) => {
    console.log("🔍 handleLoadSyllabus - ID recibido:", syllabusId);
    console.log("📚 savedSyllabi disponibles:", savedSyllabi.length);
    
    if (!syllabusId) {
      console.error("❌ No se proporcionó syllabusId");
      return;
    }
    
    const id = parseInt(syllabusId, 10);
    console.log("🔢 ID parseado:", id);
    
    // Comparar convirtiendo ambos a número
    const syllabusToLoad = savedSyllabi.find(s => Number(s.id) === id);
    console.log("📖 Syllabus encontrado:", syllabusToLoad ? "SÍ" : "NO");
    
    if (syllabusToLoad) {
      console.log("✅ Cargando syllabus:", syllabusToLoad.nombre);
      console.log("📊 Estructura datos_syllabus:", JSON.stringify(syllabusToLoad.datos_syllabus, null, 2));
      
      let editorData = syllabusToLoad.datos_syllabus;
      
      // 🔧 FIX CRÍTICO: Convertir formato de validación a formato de editor
      if ((editorData as any).tipo === 'syllabus_validado' && (editorData as any).titulos && !editorData.tabs) {
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
          name: syllabusToLoad.nombre,
          metadata: {
            ...editorData.metadata,
            subject: syllabusToLoad.nombre,
            period: syllabusToLoad.periodo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          tabs: [{
            id: `tab-${Date.now()}`,
            title: "Syllabus Importado",
            rows: rows
          }]
        } as any;
        
        console.log("✅ Conversión completada - Filas creadas:", rows.length);
      }
      
      editorData.id = syllabusToLoad.id;
      
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
        editorData.name = syllabusToLoad.nombre;
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
      
      setSyllabi([editorData]);
      setActiveSyllabusId(editorData.id);
      setActiveTabId(editorData.tabs[0]?.id || null);
      setCellLockState(buildCellLockState(editorData.tabs));
      setEditingComisionId(null);
      
      // Establecer el periodo seleccionado
      setSelectedPeriod(syllabusToLoad.periodo);
      console.log("✅ Syllabus cargado exitosamente");
      console.log("   - ID:", editorData.id);
      console.log("   - Nombre:", editorData.name);
      console.log("   - Periodo:", syllabusToLoad.periodo);
      console.log("   - Tabs:", editorData.tabs.length);
      console.log("   - Filas en tab activo:", editorData.tabs[0]?.rows?.length || 0);
    } else {
      console.error("❌ No se encontró el syllabus con ID:", id);
      console.log("📋 IDs disponibles:", savedSyllabi.map(s => s.id));
    }
  };

  // --- CARGAR LISTA DE SYLLABI DE COMISIÓN ---
  const loadComisionSyllabusList = async () => {
    setIsLoadingComision(true)
    try {
      const data = await apiRequest('/api/comision-academica/syllabus')
      const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
      setComisionSyllabusList(list)
      setShowComisionSelector(true)
    } catch (e: any) {
      alert(`Error al cargar syllabi de comisión: ${e.message}`)
    } finally {
      setIsLoadingComision(false)
    }
  }

  // --- CARGAR UN SYLLABUS DE COMISIÓN EN EL EDITOR ---
  const handleLoadComisionSyllabus = async (record: any) => {
    setIsLoadingComision(true)
    try {
      const response = await apiRequest(`/api/comision-academica/syllabus/${record.id}`)
      const fullRecord = response?.data || record

      let datos = fullRecord.datos_syllabus
      if (typeof datos === 'string') { try { datos = JSON.parse(datos) } catch(e) {} }
      if (!datos) { alert('Este syllabus no tiene datos de editor'); return }

      let tabs = datos.tabs
      if (!tabs && (datos as any).rows) {
        tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: (datos as any).rows }]
      }
      if (!tabs) tabs = [{ id: `tab-${Date.now()}`, title: 'General', rows: [] }]

      // Normalizar celdas (preservar isLocked)
      tabs = tabs.map((t: any) => ({
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
            // isLocked se preserva vía spread de ...c
          }))
        }))
      }))

      const editorData: SyllabusData = {
        id: `comision-${fullRecord.id}`,
        name: fullRecord.nombre || fullRecord.nombre_archivo || 'Syllabus Comisión',
        description: '',
        tabs,
        metadata: {
          subject: fullRecord.nombre || '',
          period: fullRecord.periodo || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }

      setSyllabi([editorData])
      setActiveSyllabusId(editorData.id)
      setActiveTabId(tabs[0]?.id || null)
      setCellLockState(buildCellLockState(tabs))
      setEditingComisionId(Number(fullRecord.id))
      setShowComisionSelector(false)
      if (fullRecord.periodo) setSelectedPeriod(String(fullRecord.periodo))
    } catch (e: any) {
      alert(`Error al cargar syllabus de comisión: ${e.message}`)
    } finally {
      setIsLoadingComision(false)
    }
  }

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
      formData.append('materias', activeSyllabus?.metadata?.subject || 'Sin especificar');

      console.log(`📤 Enviando syllabus para validación - Periodo: ${periodoNombre}`);

      // Enviar al endpoint de validación
      const currentToken = token || getToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${API_URL}/syllabi/upload-validado`, {
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
          `✅ Syllabus validado y guardado exitosamente\n\n` +
          `Coincidencia: ${validacion.porcentaje_coincidencia || 100}%\n` +
          `Mínimo requerido: 95%\n` +
          `Campos requeridos: ${validacion.total_requeridos || 0}\n` +
          `Campos encontrados: ${validacion.encontrados || 0}`
        );
        
        // Recargar la lista de syllabi guardados
        try {
          const syllabiData = await apiRequest("/api/syllabi");
          const syllabiArray = Array.isArray(syllabiData?.data) ? syllabiData.data : [];
          setSavedSyllabi(syllabiArray);
          
          // Cargar el syllabus recién guardado
          if (result.data?.id) {
            handleLoadSyllabus(result.data.id.toString());
          }
        } catch (err) {
          console.error("Error recargando lista:", err);
        }
      } else {
        // ❌ VALIDACIÓN FALLIDA
        const detalles = result.detalles || {};
        const faltantes = detalles.faltantes || [];
        const extras = detalles.extras || [];
        
        let mensaje = `❌ El syllabus NO cumple con la estructura requerida\n\n`;
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
      alert(`❌ Error al validar el syllabus:\n${error.message || 'Error desconocido'}\n\nPor favor, verifique que existe una plantilla de referencia para este periodo.`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- IMPORTACIÓN MAESTRA V8: HEURÍSTICA DE ESTRUCTURA Y VERTICALIDAD ---
  const handleSyllabusUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
             const isJunkTable = (tableContent.includes("UNIVERSIDAD") || tableContent.includes("SYLLABUS")) && rowsRaw.length < 6;

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

        // 2. SI ES TEXTO
        const isIgnored = text.length < 3 || textUpper.includes("UNIVERSIDAD") || textUpper.includes("SYLLABUS") || tagName === "IMG";

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

      const newData: SyllabusData = {
        id: `syllabus-${Date.now()}`,
        name: meta.subject || file.name.replace(/\.docx?$/i, ''),
        description: "Importado",
        metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        tabs: newTabs,
      };
      
      setSyllabi([newData]);
      setActiveSyllabusId(newData.id);
      setActiveTabId(newTabs[0]?.id || null);
      setCellLockState(buildCellLockState(newTabs));
      setEditingComisionId(null);

    } catch (e) { console.error(e); alert("Error crítico."); } 
    finally { setIsLoading(false); }
  };

  // --- MÉTODOS DE EDICIÓN ---
  const handleUpdateActiveTabRows = (newRows: TableRow[]) => {
    if (!activeSyllabus || !activeTabId) return;
    const updatedTabs = activeSyllabus.tabs.map(tab => tab.id === activeTabId ? { ...tab, rows: newRows } : tab);
    updateSyllabus(activeSyllabus.id, { tabs: updatedTabs });
  };

  const startRenamingTab = (tab: TabData) => {
    setEditingTabId(tab.id);
    setTempTabTitle(tab.title);
  }

  const saveTabRename = () => {
    if (!activeSyllabus || !editingTabId) return;
    const updatedTabs = activeSyllabus.tabs.map(tab => tab.id === editingTabId ? { ...tab, title: tempTabTitle || "Sin Título" } : tab);
    updateSyllabus(activeSyllabus.id, { tabs: updatedTabs });
    setEditingTabId(null);
  }

  const addTab = () => {
    if (!activeSyllabus) return;
    const newTab: TabData = {
      id: `tab-${Date.now()}`,
      title: `Nueva Sección`,
      rows: [
        { id: `r1-${Date.now()}`, cells: [{id: `c11-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}, {id: `c12-${Date.now()}`, content: "", isHeader: false, rowSpan:1, colSpan:1, isEditable:true}] },
      ]
    };
    const updatedTabs = [...activeSyllabus.tabs, newTab];
    updateSyllabus(activeSyllabus.id, { tabs: updatedTabs });
    setActiveTabId(newTab.id);
  };
  
  const removeTab = (tabIdToRemove: string) => {
    if (!activeSyllabus) return;
    if (activeSyllabus.tabs.length <= 1) return alert("Debe quedar al menos una sección.");
    if (!window.confirm("¿Estás seguro de eliminar esta sección?")) return;
    const updatedTabs = activeSyllabus.tabs.filter(t => t.id !== tabIdToRemove);
    updateSyllabus(activeSyllabus.id, { tabs: updatedTabs });
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
  
  const toggleLockCells = () => {
    if (selectedCells.length === 0) return;

    const allLocked = selectedCells.every(id => !!cellLockState[id]);
    const updated = tableData.map(row => ({
      ...row,
      cells: row.cells.map(cell =>
        selectedCells.includes(cell.id) ? { ...cell, isLocked: !allLocked } : cell
      )
    }));

    setCellLockState((prev) => {
      const next = { ...prev };
      selectedCells.forEach((id) => {
        next[id] = !allLocked;
      });
      return next;
    });
    handleUpdateActiveTabRows(updated);
  };

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
    if(!activeSyllabus || !activeTab) return;

    // --- FIRMAS del documento (para sección VISADO al final) ---
    let firmasData: any = null
    if (activeSyllabusId) {
      try {
        const fr = await Promise.race([
          apiRequest(`/api/firmas/syllabus/${activeSyllabusId}`),
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
    doc.text(`${activeSyllabus.name} — ${activeTab.title}`, pageWidth / 2, 15, { align: 'center' });

    let currentY = 20;

    const body = activeTab.rows.map(r => r.cells.map(c => ({ content: c.content, rowSpan: c.rowSpan, colSpan: c.colSpan, _raw: c })));
    autoTable(doc, { body: body as any, startY: currentY, theme: 'grid', margin: { left: marginL, right: marginR }, didParseCell: d => { 
       const c=(d.cell.raw as any)._raw as TableCell;
       if(c){ if(c.isHeader){d.cell.styles.fontStyle='bold';d.cell.styles.fillColor='#F3F4F6'} if(c.backgroundColor)d.cell.styles.fillColor=c.backgroundColor; }
    } });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 10;

    // ─── SECCIÓN VISADO ────────────────────────────────────────────────────
    const VISADO_ETAPAS_ADM = [
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
    VISADO_ETAPAS_ADM.forEach((cfg, i) => {
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
    VISADO_ETAPAS_ADM.forEach((cfg, i) => {
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

    doc.save(`${activeSyllabus.name}_${activeTab.title}.pdf`);
  }

  // --- FUNCIONES ADICIONALES ---
  const handleDuplicateSyllabus = async (syllabusId: number) => {
    const syllabusToClone = savedSyllabi.find(s => s.id === syllabusId);
    if (!syllabusToClone) return;
    
    try {
      const clonedData = JSON.parse(JSON.stringify(syllabusToClone.datos_syllabus));
      clonedData.id = `syllabus-${Date.now()}`;
      clonedData.name = `${syllabusToClone.nombre} (Copia)`;
      clonedData.metadata.createdAt = new Date().toISOString();
      clonedData.metadata.updatedAt = new Date().toISOString();
      
      // Guardar automáticamente en el backend
      const payload = {
        nombre: clonedData.name,
        periodo: syllabusToClone.periodo,
        materias: syllabusToClone.materias,
        datos_syllabus: clonedData
      };
      
      const result = await apiRequest('/api/syllabi', { method: 'POST', body: JSON.stringify(payload) });
      
      // Recargar la lista de syllabi
      const syllabiData = await apiRequest("/api/syllabi").catch(() => ({ data: [] }));
      const syllabiArray = Array.isArray(syllabiData?.data) ? syllabiData.data : [];
      setSavedSyllabi(syllabiArray);
      
      alert("Syllabus duplicado exitosamente");
    } catch (error: any) {
      alert(`Error al duplicar: ${error.message}`);
    }
  };

  const handleDeleteSyllabus = async (syllabusId: number) => {
    if (!window.confirm("¿Está seguro de eliminar este syllabus? Esta acción no se puede deshacer.")) return;
    
    setIsLoading(true);
    try {
      await apiRequest(`/api/syllabi/${syllabusId}`, { method: 'DELETE' });
      
      // Recargar la lista de syllabi
      const syllabiData = await apiRequest("/api/syllabi").catch(() => ({ data: [] }));
      const syllabiArray = Array.isArray(syllabiData?.data) ? syllabiData.data : [];
      setSavedSyllabi(syllabiArray);
      
      alert("Syllabus eliminado exitosamente");
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSyllabus = (syllabusId: number) => {
    console.log("Editando syllabus ID:", syllabusId);
    handleLoadSyllabus(syllabusId.toString());
    setShowSyllabusSelector(false);
  };

  const handleNewSyllabus = () => {
    setCellLockState({});
    setEditingComisionId(null);
    setShowSyllabusSelector(true);
  };

  const syllabiFiltered = selectedPeriod 
    ? savedSyllabi.filter(s => s.periodo === selectedPeriod)
    : savedSyllabi;
  
  return (
    <ProtectedRoute allowedRoles={["administrador", "comision_academica", "profesor"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          
          {!activeSyllabus ? (
            <>
              {/* Pantalla Inicial */}
              <Card className="mb-6 border-t-4 border-t-emerald-600">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-emerald-800">
                    <span>Editor de Syllabus</span>
                    <div className="flex gap-2">
                      <Button onClick={handleNewSyllabus} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo
                      </Button>
                      <Button onClick={loadComisionSyllabusList} disabled={isLoadingComision} className="bg-amber-600 hover:bg-amber-700">
                        <Lock className="h-4 w-4 mr-2" /> {isLoadingComision ? "Cargando..." : "Bloquear Syllabus de Docentes"}
                      </Button>
                      <Button onClick={handleSaveToDB} disabled={!activeSyllabus} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-2" /> Guardar
                      </Button>
                      <Button onClick={handlePrintToPdf} disabled={!activeSyllabus} variant="outline">
                        <Printer className="h-4 w-4 mr-2" /> Imprimir
                      </Button>
                      <Button
                      type="button"
                      onClick={() => router.push('/dashboard/admin')}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                    <div className="space-y-2">
                      <Label>Periodo</Label>
                      <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
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

              {/* Modal Selector de Syllabus */}
              {showSyllabusSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Seleccionar Syllabus</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowSyllabusSelector(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                        {isLoading ? "Procesando..." : <><Upload className="h-4 w-4 mr-2" /> Subir Nuevo Word (.docx)</>}
                      </Button>
                      <input ref={fileInputRef} type="file" accept=".docx" onChange={(e) => { handleSyllabusUpload(e); setShowSyllabusSelector(false); }} className="hidden" />
                      
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">O seleccione uno existente:</h3>
                        {isListLoading ? (
                          <p className="text-center py-4">Cargando...</p>
                        ) : syllabiFiltered.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {syllabiFiltered.map(s => (
                              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex-1">
                                  <p className="font-medium">{s.nombre}</p>
                                  <p className="text-sm text-gray-500">{s.periodo} - {s.materias}</p>
                                </div>
                                <Button onClick={() => { handleLoadSyllabus(s.id.toString()); setShowSyllabusSelector(false); }} className="bg-emerald-600 hover:bg-emerald-700">
                                  Seleccionar
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">No hay syllabus disponibles</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Modal Selector de Syllabus de COMISIÓN (para bloquear celdas a docentes) */}
              {showComisionSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-amber-600" />
                          <span>Seleccionar Syllabus de Comisión para Bloquear</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowComisionSelector(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </CardTitle>
                      <p className="text-sm text-amber-700 bg-amber-50 rounded p-2 mt-2">
                        Selecciona el syllabus que verán los docentes. Podrás marcar celdas como bloqueadas para que los docentes no puedan editarlas.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {comisionSyllabusList.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No hay syllabi de comisión disponibles</p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {comisionSyllabusList.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-amber-50">
                              <div className="flex-1">
                                <p className="font-medium">{s.nombre || s.nombre_archivo || 'Sin nombre'}</p>
                                <p className="text-sm text-gray-500">Periodo: {s.periodo} | Asignatura ID: {s.asignatura_id || 'N/A'}</p>
                              </div>
                              <Button onClick={() => handleLoadComisionSyllabus(s)} className="bg-amber-600 hover:bg-amber-700">
                                <Lock className="h-4 w-4 mr-1" /> Abrir y Bloquear
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tabla de Syllabus Creados */}
              <Card>
                <CardHeader>
                  <CardTitle>Syllabus Creados</CardTitle>
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
                            <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {syllabiFiltered.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-emerald-600" />
                                  <span className="font-medium">{s.nombre}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">{s.periodo}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleEditSyllabus(s.id)} className="text-blue-600 hover:text-blue-700">
                                    <Pencil className="h-4 w-4 mr-1" /> Modificar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDuplicateSyllabus(s.id)} className="text-emerald-600 hover:text-emerald-700">
                                    <Copy className="h-4 w-4 mr-1" /> Duplicar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeleteSyllabus(s.id)} className="text-red-600 hover:text-red-700">
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
                      <p className="text-gray-500">No hay syllabus creados aún</p>
                      <Button onClick={handleNewSyllabus} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" /> Crear Primer Syllabus
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
                            onKeyDown={e => { if (e.key === 'Enter') { setSyllabi(p => p.map(s => s.id === activeSyllabusId ? { ...s, name: tempName } : s)); setEditingName(false); } if (e.key === 'Escape') setEditingName(false); }}
                            className="h-8 text-sm font-semibold"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7" onClick={() => { setSyllabi(p => p.map(s => s.id === activeSyllabusId ? { ...s, name: tempName } : s)); setEditingName(false); }}><Check className="h-4 w-4 text-green-600" /></Button>
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7" onClick={() => setEditingName(false)}><X className="h-4 w-4 text-red-500" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="truncate">{activeSyllabus.name}</span>
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7 flex-shrink-0" title="Renombrar" onClick={() => { setTempName(activeSyllabus.name); setEditingName(true); }}><Pencil className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                       <Button onClick={() => { setActiveSyllabusId(null); setSyllabi([]); setEditingComisionId(null); setCellLockState({}); }} variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-50">
                         <span className="flex items-center gap-1">
                           <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                           Retroceder
                         </span>
                       </Button>
                       <Button onClick={() => router.push('/dashboard/admin')} variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-50">
                         <Home className="h-4 w-4 mr-2" />
                         Menú Principal
                       </Button>
                       <Button onClick={handleSaveToDB} className={editingComisionId ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"} size="sm" disabled={isSaving}>{isSaving ? "Guardando..." : <><Save className="h-4 w-4 mr-2" /> {editingComisionId ? "Guardar Bloqueos" : "Guardar"}</>}</Button>
                       <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!activeTab}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                {(editingComisionId || lockedCellCount > 0) && (
                  <div className="mx-4 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-800">
                    <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>
                      {editingComisionId
                        ? <><strong>Modo bloqueo (comisión #{editingComisionId})</strong> — </>
                        : <><strong>Bloqueo en syllabus general</strong> — </>}
                      Celdas bloqueadas: <strong>{lockedCellCount}</strong>. Selecciona celdas y presiona <strong>Bloquear</strong>. Los docentes no podrán editar esas celdas. Luego guarda.
                    </span>
                  </div>
                )}
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
                  {activeSyllabus.tabs.map(tab => (
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
                       <Button size="sm" onClick={toggleLockCells} disabled={!selectedCells.length} className="bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100" title="Bloquear/Desbloquear celdas para docentes"><Lock className="h-4 w-4 mr-1" />Bloquear</Button>
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
                                  const isLockedForDocente = !!cellLockState[cell.id] || !!cell.isLocked;
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
                                  
                                  const isFirstSectionValue = isFormRow && index === 2;

                                  
                                  const isHeaderForAlign = isHeader && !isFirstSectionValue;


                                  
                                  // --- ALINEACIÓN: CENTRAR TÍTULOS Y VERTICALES ---

                                  
                                  let justifyContent = 'justify-start'; 

                                  
                                  if (isHeaderForAlign || isSeparator || isVertical) justifyContent = 'justify-center';
                                  
                                  return (
                                    <td 
                                      key={cell.id} 
                                      className={`
                                        border border-gray-200 
                                        relative transition-all duration-75 ease-in-out
                                        ${isHeaderForAlign ? "bg-gray-50 font-semibold text-gray-900" : "bg-white text-gray-700"}
                                        ${isLockedForDocente ? "bg-amber-50/60" : ""}
                                        ${isSelected ? "ring-2 ring-inset ring-emerald-500 z-10" : ""}
                                      `}
                                      style={{
                                        backgroundColor: isLockedForDocente
                                          ? '#fffbeb'
                                          : cell.backgroundColor || (isHeaderForAlign ? '#f9fafb' : '#ffffff'), fontFamily: cell.fontFamily || undefined, fontSize: cell.fontSize || undefined,
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
                                            fontSize: cell.fontSize || undefined,
                                             writingMode: isVertical ? 'vertical-rl' : undefined,
                                            transform: isVertical ? 'rotate(180deg)' : undefined,
                                            minHeight: isVertical ? '120px' : 'auto',
                                            textAlign: isHeaderForAlign ? 'center' : 'left' 
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
                                      {isLockedForDocente && (
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