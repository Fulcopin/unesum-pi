"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, Loader2, Lock, Unlock, FileDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { FirmasPanel } from "@/components/firmas/firmas-panel"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// --- INTERFACES ---
interface TableCell {
  id: string; content: string; isHeader: boolean; rowSpan: number; colSpan: number;
  isEditable: boolean; backgroundColor?: string; textColor?: string; fontSize?: string;
  fontWeight?: string; textAlign?: string; textOrientation?: 'horizontal' | 'vertical';
}
interface TableRow { id: string; cells: TableCell[]; }
interface TabData { id: string; title: string; rows: TableRow[]; }
interface SyllabusData {
  id?: string | number; name?: string; description?: string; tabs: TabData[];
  metadata?: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; };
  version?: string;
}

// Campos que el docente PUEDE editar en el syllabus
const DOCENTE_EDITABLE_LABELS = [
  "PARALELO", "PARALELOS", "PARALELO/S",
  "HORARIO DE CLASES", "HORARIO DE CLASE", "HORARIO CLASES",
  "HORARIO PARA TUTORÍAS", "HORARIO TUTORÍAS", "HORARIO TUTORIAS", "HORARIO PARA TUTORIAS",
  "PERFIL DEL PROFESOR", "PERFIL PROFESOR", "PERFIL DOCENTE", "PROFESOR",
  "HD. PRESENCIAL", "HD PRESENCIAL", "HORAS PRESENCIAL",
  "HD. SINCRÓNICA", "HD SINCRONICA", "HD. SINCRONICA", "HORAS SINCRONICA",
  "PFAE", "PRÁCTICAS DE APLICACIÓN",
  "TA", "TRABAJO AUTÓNOMO",
  "METODOLOGÍAS DE ENSEÑANZA-APRENDIZAJE A APLICAR", "METODOLOGÍAS", "METODOLOGIA", "METODOLOGÍAS DE ENSEÑANZA",
  "RECURSOS DIDÁCTICOS", "RECURSOS DIDACTICOS", "RECURSOS",
  "ESCENARIO DE APRENDIZAJE", "ESCENARIO", "ESCENARIOS DE APRENDIZAJE",
  "BIBLIOGRAFÍAS/FUENTES DE CONSULTA", "BIBLIOGRAFÍA", "BIBLIOGRAFIA", "BIBLIOGRAFIAS", "FUENTES DE CONSULTA",
  "FECHA/PARALELO", "FECHA", "FECHA / PARALELO",
  "CRITERIOS DE EVALUACIÓN", "CRITERIOS EVALUACION", "CRITERIOS DE EVALUACION",
  "INSTRUMENTOS DE EVALUACIÓN", "INSTRUMENTOS EVALUACION", "INSTRUMENTOS DE EVALUACION",
  "CONTENIDOS", "CONTENIDO",
]

// Headers de columnas editables (para tablas con headers)
const DOCENTE_EDITABLE_HEADERS = [
  "HD. PRESENCIAL", "HD PRESENCIAL",
  "HD. SINCRÓNICA", "HD SINCRONICA", "HD. SINCRONICA",
  "PFAE", "TA",
  "METODOLOGÍAS DE ENSEÑANZA-APRENDIZAJE A APLICAR", "METODOLOGÍAS",
  "RECURSOS DIDÁCTICOS", "RECURSOS",
  "ESCENARIO DE APRENDIZAJE", "ESCENARIO",
  "BIBLIOGRAFÍAS/FUENTES DE CONSULTA", "BIBLIOGRAFÍA",
  "FECHA/PARALELO", "FECHA",
  "CRITERIOS DE EVALUACIÓN", "CRITERIOS",
  "INSTRUMENTOS DE EVALUACIÓN", "INSTRUMENTOS",
  "CONTENIDOS", "CONTENIDO",
]

export default function DocenteEditorSyllabusPage() {
  const { token, getToken, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [modalCell, setModalCell] = useState<{id: string, content: string, isEditable: boolean} | null>(null)
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [profesorInfo, setProfesorInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [syllabus_comision_id, setSyllabusComisionId] = useState<number | null>(null)
  const [hasDocenteVersion, setHasDocenteVersion] = useState(false)
  const [asignaturasDisponibles, setAsignaturasDisponibles] = useState<any[]>([])
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<string>('')
  const [periodoAutoSyncMsg, setPeriodoAutoSyncMsg] = useState<string | null>(null)
  const isAutoSyncingPeriod = useRef(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const authToken = getToken() || token
    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, ...options.headers }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
    return data
  }

  // Cargar periodos
  useEffect(() => {
    const loadPeriodos = async () => {
      try {
        const res = await apiRequest('/periodo')
        const data = Array.isArray(res) ? res : (res.data || [])
        setPeriodos(data)
        if (data.length > 0 && !selectedPeriod) {
          setSelectedPeriod(String(data[0].id))
        }
      } catch (e) { console.error('Error cargando periodos:', e) }
    }
    loadPeriodos()
  }, [])

  // Cargar info del profesor
  useEffect(() => {
    const loadProfesor = async () => {
      try {
        const res = await apiRequest('/docente-editor/mi-info')
        if (res.success) {
          setProfesorInfo(res.data)
          
          // Construir lista de asignaturas disponibles (directa + M2M)
          const asigs: any[] = []
          if (res.data.asignatura) {
            asigs.push(res.data.asignatura)
          }
          if (res.data.asignaturas && Array.isArray(res.data.asignaturas)) {
            for (const a of res.data.asignaturas) {
              if (!asigs.find((x: any) => x.id === a.id)) {
                asigs.push(a)
              }
            }
          }
          setAsignaturasDisponibles(asigs)
          
          // Pre-seleccionar la primera asignatura
          const mainId = res.data.asignatura_id || res.data.asignatura?.id || (asigs.length > 0 ? asigs[0].id : null)
          if (mainId) setSelectedAsignaturaId(String(mainId))
        }
      } catch (e) { console.error('Error cargando info profesor:', e) }
    }
    loadProfesor()
  }, [])

  // Cargar syllabus cuando cambia el periodo o la asignatura seleccionada
  useEffect(() => {
    if (!selectedPeriod || !profesorInfo) return
    if (isAutoSyncingPeriod.current) return  // ignorar re-render causado por auto-sync de periodo
    loadSyllabus()
  }, [selectedPeriod, profesorInfo, selectedAsignaturaId])

  const loadSyllabus = async () => {
    setLoading(true)
    setError(null)
    setSyllabusData(null)
    setActiveTabId(null)

    const asignaturaId = selectedAsignaturaId || profesorInfo?.asignatura_id || profesorInfo?.asignatura?.id
    if (!asignaturaId) {
      setError("No tienes una asignatura asignada. Contacta al administrador para que te asignen una asignatura.")
      setLoading(false)
      return
    }

    try {
      // 1. Primero buscar si el docente ya tiene una versión guardada
      try {
        const docenteRes = await apiRequest(`/docente-editor/syllabus/mio?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
        if (docenteRes.success && docenteRes.data?.datos_syllabus) {
          let datos = docenteRes.data.datos_syllabus
          if (typeof datos === 'string') datos = JSON.parse(datos)
          processSyllabusData(datos)
          setSyllabusComisionId(docenteRes.data.syllabus_comision_id)
          setHasDocenteVersion(true)
          setLoading(false)
          return
        }
      } catch (e) { 
        console.log('No hay versión propia del docente, buscando la de comisión...') 
      }

      // 2. Buscar syllabus de la comisión (el backend buscará por asignatura+periodo y si no encuentra,
      //    retorna el más reciente para esa asignatura — con su período real incluido en la respuesta)
      try {
        const comisionRes = await apiRequest(`/docente-editor/syllabus/comision?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
        if (comisionRes.success && comisionRes.data?.datos_syllabus) {
          let datos = comisionRes.data.datos_syllabus
          if (typeof datos === 'string') datos = JSON.parse(datos)
          processSyllabusData(datos)
          setSyllabusComisionId(comisionRes.data.id)
          setHasDocenteVersion(false)
          // Auto-sincronizar el selector de periodo con el periodo real del syllabus cargado
          const periodoCargado = comisionRes.data.periodo
          if (periodoCargado) {
            const matched = periodos.find((p: any) =>
              String(p.id) === String(periodoCargado) || p.nombre === periodoCargado
            )
            if (matched && String(matched.id) !== selectedPeriod) {
              isAutoSyncingPeriod.current = true
              setSelectedPeriod(String(matched.id))
              setPeriodoAutoSyncMsg(`Periodo ajustado a "${matched.nombre}" (periodo del syllabus subido para tu asignatura)`)
              setTimeout(() => { isAutoSyncingPeriod.current = false }, 200)
            } else {
              setPeriodoAutoSyncMsg(null)
            }
          }
          setLoading(false)
          return
        }
      } catch (e: any) {
        console.log('No se encontró syllabus de comisión:', e.message)
      }

      setError("La comisión académica aún no ha subido un syllabus para tu asignatura. Contacta a la comisión académica.")
    } catch (e: any) {
      setError(e.message || "Error al cargar syllabus")
    } finally {
      setLoading(false)
    }
  }

  const processSyllabusData = (datos: any) => {
    let parsed: SyllabusData

    if (datos.tabs) {
      parsed = {
        ...datos,
        tabs: datos.tabs.map((t: any) => ({
          ...t,
          rows: (t.rows || []).map((r: any) => ({
            ...r,
            cells: (r.cells || []).map((c: any) => ({
              ...c,
              backgroundColor: c.backgroundColor || c.styles?.backgroundColor,
              textOrientation: c.textOrientation || c.styles?.textOrientation || 'horizontal',
              isEditable: true
            }))
          }))
        }))
      }
    } else if (datos.rows) {
      // Formato antiguo: solo rows sin tabs, envolver en un tab
      parsed = {
        ...datos,
        tabs: [{
          id: 'tab-general',
          title: 'General',
          rows: (datos.rows || []).map((r: any) => ({
            ...r,
            cells: (r.cells || []).map((c: any) => ({
              ...c,
              backgroundColor: c.backgroundColor || c.styles?.backgroundColor,
              textOrientation: c.textOrientation || c.styles?.textOrientation || 'horizontal',
              isEditable: true
            }))
          }))
        }]
      }
    } else if (datos.campos_por_seccion || datos.hojas) {
      // Formato viejo de extracción (campos_por_seccion): convertir a tabs con filas
      const tabs: TabData[] = []
      const contenido = datos.contenido || {}
      const camposPorSeccion = datos.campos_por_seccion || {}
      
      Object.entries(camposPorSeccion).forEach(([seccion, campos]: [string, any], tabIdx: number) => {
        const rows: TableRow[] = []
        if (Array.isArray(campos)) {
          campos.forEach((campo: string, rowIdx: number) => {
            rows.push({
              id: `row-${tabIdx}-${rowIdx}`,
              cells: [
                {
                  id: `cell-${tabIdx}-${rowIdx}-0`,
                  content: campo,
                  isHeader: true,
                  rowSpan: 1,
                  colSpan: 1,
                  isEditable: false,
                  fontWeight: 'bold',
                  textAlign: 'left'
                },
                {
                  id: `cell-${tabIdx}-${rowIdx}-1`,
                  content: contenido[campo] || '',
                  isHeader: false,
                  rowSpan: 1,
                  colSpan: 1,
                  isEditable: true,
                  textAlign: 'left'
                }
              ]
            })
          })
        }
        tabs.push({
          id: `tab-${tabIdx}`,
          title: seccion,
          rows
        })
      })

      if (tabs.length === 0) {
        // Si no hay campos_por_seccion tampoco, crear tab vacío de hojas
        (datos.hojas || ['General']).forEach((hoja: string, idx: number) => {
          tabs.push({ id: `tab-${idx}`, title: hoja, rows: [] })
        })
      }

      parsed = { ...datos, tabs }
    } else {
      setError("No se encontró contenido en el syllabus. Contacta a la comisión académica para que suba el syllabus.")
      return
    }

    setSyllabusData(parsed)
    if (parsed.tabs.length > 0 && !activeTabId) {
      setActiveTabId(parsed.tabs[0].id)
    }
  }

  // Determinar si una celda es editable para el docente
  const isDocenteEditable = (cell: TableCell, rowIndex: number, cellIndex: number, allRows: TableRow[]): boolean => {
    if (!allRows || allRows.length === 0) return false
    
    // Si la comisión configuró explícitamente el permiso, respetar esa configuración
    if ((cell as any).docenteEditable === true) return true
    if ((cell as any).docenteEditable === false) return false
    
    // Fallback: lógica automática por detección de etiquetas
    const currentRow = allRows[rowIndex]
    if (!currentRow) return false
    
    // Revisar si la celda de la izquierda (misma fila) es una etiqueta editable
    if (cellIndex > 0) {
      const leftCell = currentRow.cells[cellIndex - 1]
      if (leftCell) {
        const label = leftCell.content?.toUpperCase().trim() || ""
        if (DOCENTE_EDITABLE_LABELS.some(l => label.includes(l) || l.includes(label))) {
          return true
        }
      }
    }

    // Revisar si hay headers en las primeras filas que coincidan
    // Buscar la fila de headers (usualmente fila 0 o 1)
    for (let headerRow = 0; headerRow < Math.min(3, allRows.length); headerRow++) {
      const hRow = allRows[headerRow]
      if (!hRow) continue
      
      // Verificar si la celda en la misma columna del header es editable
      if (cellIndex < hRow.cells.length) {
        const headerCell = hRow.cells[cellIndex]
        if (headerCell) {
          const headerLabel = headerCell.content?.toUpperCase().trim() || ""
          if (DOCENTE_EDITABLE_HEADERS.some(h => headerLabel.includes(h) || h.includes(headerLabel))) {
            // Solo aplicar si estamos después de la fila de headers
            if (rowIndex > headerRow) return true
          }
        }
      }
    }

    // Permitir editar en celdas del "Contenidos" section (filas después de la header de contenidos)
    // Buscar si estamos en una sección de contenidos
    for (let r = rowIndex; r >= 0; r--) {
      const row = allRows[r]
      if (!row) continue
      for (const c of row.cells) {
        const label = c.content?.toUpperCase().trim() || ""
        if (label.includes("CONTENIDO") || label.includes("UNIDAD")) {
          // Estamos en la sección de contenidos, verificar columna
          if (cellIndex > 0) return true // Cualquier columna después de la primera en contenidos
        }
      }
    }

    return false
  }

  const activeTab = syllabusData?.tabs.find(t => t.id === activeTabId)
  const tableData = activeTab?.rows || []

  // Edición de celdas
  const startEdit = (cellId: string, content: string) => {
    setEditingCell(cellId)
    setEditContent(content)
  }

  const saveEdit = () => {
    if (!editingCell || !syllabusData) return
    setSyllabusData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tabs: prev.tabs.map(tab => ({
          ...tab,
          rows: tab.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell =>
              cell.id === editingCell ? { ...cell, content: editContent } : cell
            )
          }))
        }))
      }
    })
    setEditingCell(null)
    setEditContent("")
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditContent("")
  }

  const saveModalEdit = () => {
    if (!modalCell || !syllabusData) return
    setSyllabusData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tabs: prev.tabs.map(tab => ({
          ...tab,
          rows: tab.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell =>
              cell.id === modalCell.id ? { ...cell, content: editContent } : cell
            )
          }))
        }))
      }
    })
    setModalCell(null)
    setEditContent("")
  }

  // Guardar
  const handleSave = async () => {
    if (!syllabusData) return alert("No hay syllabus para guardar.")
    if (!selectedPeriod) return alert("Seleccione un periodo.")

    const asignaturaId = selectedAsignaturaId || profesorInfo?.asignatura_id || profesorInfo?.asignatura?.id
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0-docente",
        metadata: syllabusData.metadata,
        tabs: syllabusData.tabs.map(tab => ({
          id: tab.id, title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id, cells: row.cells.map(cell => ({
              ...cell,
              styles: { backgroundColor: cell.backgroundColor, textColor: cell.textColor, textAlign: cell.textAlign, textOrientation: cell.textOrientation }
            }))
          }))
        }))
      }

      await apiRequest('/docente-editor/syllabus/guardar', {
        method: 'POST',
        body: JSON.stringify({
          asignatura_id: asignaturaId,
          periodo: selectedPeriod,
          nombre: syllabusData.name || 'Syllabus Docente',
          datos_syllabus: datosParaGuardar,
          syllabus_comision_id: syllabus_comision_id
        })
      })

      setHasDocenteVersion(true)
      alert("Syllabus guardado exitosamente!")
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Generar PDF con el mismo formato que la comisión académica
  const handlePrintToPdf = async () => {
    if (!syllabusData) return;

    // --- FIRMAS del documento (para sección VISADO al final) ---
    let firmasData: any = null
    if (syllabus_comision_id) {
      try {
        const fr = await Promise.race([
          apiRequest(`/firmas/syllabus/${syllabus_comision_id}`),
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
      doc.addImage(logoImg, 'PNG', marginL, 2, 16, 16);
    } catch { /* logo no disponible */ }

    // --- ENCABEZADO ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 17, 17);
    doc.text('UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ', pageWidth / 2, 8, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    doc.text('Creada mediante registro Oficial 261 del 7 de febrero del 2001', pageWidth / 2, 12.5, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 17, 17);
    doc.text('SYLLABUS DE LA ASIGNATURA', pageWidth / 2, 17, { align: 'center' });

    // Línea divisoria
    doc.setDrawColor(25, 50, 95);
    doc.setLineWidth(0.6);
    doc.line(marginL, 19.5, marginL + contentWidth, 19.5);

    // Sublinea: asignatura • Periodo • Docente
    const asignaturaNombreHeader = asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || syllabusData.name || '';
    const periodoObj = periodos.find((p: any) => String(p.id) === String(selectedPeriod));
    const periodoNombre = periodoObj?.nombre || '';
    const docenteNombreHeader = profesorInfo ? `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim() : '';
    const subParts = [asignaturaNombreHeader, periodoNombre ? `Periodo: ${periodoNombre}` : '', docenteNombreHeader].filter(Boolean);
    const subLineTxt = subParts.join('  •  ');

    if (subLineTxt) {
      doc.setFillColor(237, 242, 250);
      doc.rect(marginL, 20, contentWidth, 6, 'F');
      doc.setDrawColor(25, 50, 95);
      doc.setLineWidth(0.3);
      doc.rect(marginL, 20, contentWidth, 6, 'D');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(25, 50, 95);
      doc.text(subLineTxt, pageWidth / 2, 23.5, { align: 'center', maxWidth: contentWidth - 4 });
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    let currentY = subLineTxt ? 28 : 23;

    const isFirstSectionTab = (title: string) => {
      const t = title.toUpperCase();
      return t.includes('GENERAL') || t.includes('INFORMACIÓN') || t.includes('DATOS') || t.includes('INFORMACION');
    };

    for (const tab of syllabusData.tabs) {
      if (!tab.rows || tab.rows.length === 0) continue;
      // Omitir el tab VISADO del template — el VISADO se genera al final con los QR reales
      if (tab.title.trim().toUpperCase() === 'VISADO') continue;

      const isEstructuraSectionPreCheck = tab.title.toUpperCase().includes('ESTRUCTURA') || tab.title.toUpperCase().includes('ASIGNATURA');
      const minSpace = isEstructuraSectionPreCheck ? 80 : 25;

      const titleStartY = currentY;

      currentY += 1.5;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(25, 50, 95);
      doc.text(tab.title.toUpperCase(), marginL, currentY);
      currentY += 1;
      doc.setDrawColor(25, 50, 95);
      doc.setLineWidth(0.4);
      doc.line(marginL, currentY, marginL + contentWidth, currentY);
      currentY += 2;

      const sectionTitle = tab.title.toUpperCase();
      const titlePageNum = doc.getNumberOfPages();

      const isFirstSection = isFirstSectionTab(tab.title);
      const isVisadoSection = tab.title.toUpperCase().includes('VISADO') || tab.title.toUpperCase().includes('LEGALIZACIÓN') || tab.title.toUpperCase().includes('LEGALIZACION');
      const isEstructuraSection = tab.title.toUpperCase().includes('ESTRUCTURA') || tab.title.toUpperCase().includes('ASIGNATURA');

      if (isFirstSection) {
        const cleanRows: any[][] = [];
        for (const row of tab.rows) {
          const visible = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          if (visible.length === 0) continue;
          if (visible.length === 1) {
            const txt = (visible[0].content || '').trim();
            if (!txt) continue;
            cleanRows.push([{ content: txt, colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: '#E5E7EB', halign: 'left' as const, fontSize: 8 } }]);
          } else {
            let label = '', sep = '', values: string[] = [];
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
          const labelW = contentWidth * 0.30;
          const sepW = contentWidth * 0.02;
          const valW = contentWidth * 0.68;
          autoTable(doc, {
            body: cleanRows as any,
            startY: currentY,
            theme: 'grid',
            columnStyles: { 0: { cellWidth: labelW }, 1: { cellWidth: sepW }, 2: { cellWidth: valW } },
            styles: { fontSize: 8, cellPadding: { top: 0.5, right: 1, bottom: 0.5, left: 1 }, lineColor: '#9CA3AF', lineWidth: 0.15, overflow: 'linebreak', halign: 'left', valign: 'top', textColor: '#1F2937' },
            margin: { left: marginL, right: marginR },
            tableWidth: contentWidth,
          });
          currentY = (doc as any).lastAutoTable?.finalY || (doc as any).previousAutoTable?.finalY || currentY + 10;
          const pagesAfter1 = doc.getNumberOfPages();
          if (pagesAfter1 > titlePageNum) {
            doc.setPage(titlePageNum);
            doc.setFillColor(255, 255, 255);
            doc.rect(marginL - 1, titleStartY - 1, contentWidth + 2, 8, 'F');
            doc.setPage(pagesAfter1);
          }
          currentY += 2;
        }
      } else {
        // SECCIONES NORMALES
        let headerRowIdx = -1;
        for (let ri = 0; ri < tab.rows.length; ri++) {
          const vis = tab.rows[ri].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          if (vis.length < 3) continue;
          const allAreHeader = vis.every(c => c.isHeader);
          const avgLen = vis.reduce((sum, c) => sum + (c.content || '').trim().length, 0) / vis.length;
          if (allAreHeader && avgLen <= 40) { headerRowIdx = ri; break; }
        }
        if (headerRowIdx === -1) {
          for (let ri = 0; ri < tab.rows.length; ri++) {
            const vis = tab.rows[ri].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
            if (vis.length >= 3) { headerRowIdx = ri; break; }
          }
        }

        const colCounts: number[] = [];
        for (let ri = 0; ri < tab.rows.length; ri++) {
          if (ri === headerRowIdx) continue;
          const vis = tab.rows[ri].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          if (vis.length === 0) continue;
          const logCols = vis.reduce((sum, c) => sum + (c.colSpan || 1), 0);
          colCounts.push(logCols);
        }
        let maxLogCols = 0;
        if (colCounts.length > 0) {
          const freq: Record<number, number> = {};
          for (const n of colCounts) freq[n] = (freq[n] || 0) + 1;
          let bestCount = 0;
          for (const [cols, count] of Object.entries(freq)) {
            if (count > bestCount) { bestCount = count; maxLogCols = Number(cols); }
          }
        }
        if (maxLogCols === 0 && headerRowIdx >= 0) {
          const hdrVis = tab.rows[headerRowIdx].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          maxLogCols = hdrVis.reduce((sum, c) => sum + (c.colSpan || 1), 0);
        }

        type ColType = 'unidad' | 'contenido' | 'horas' | 'pfae' | 'metodologia' | 'recursos' | 'escenario' | 'biblio' | 'fecha' | 'separator' | 'resultado' | 'criterio' | 'instrumento' | 'other';
        const colTypeMap: Record<number, ColType> = {};
        if (headerRowIdx >= 0) {
          const hdrCells = tab.rows[headerRowIdx].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          let colIdx = 0;
          for (const hc of hdrCells) {
            const txt = (hc.content || '').trim().toUpperCase();
            const isSepH = txt === ':' || (txt.length <= 2 && txt.length > 0 && !/[A-Z0-9]/.test(txt));
            const span = hc.colSpan || 1;
            let type: ColType = 'other';
            if (isSepH) type = 'separator';
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
            for (let s = 0; s < span && (colIdx + s) < maxLogCols; s++) { colTypeMap[colIdx + s] = type; }
            colIdx += span;
          }
        }

        const widthByType: Record<ColType, number> = {
          unidad: 24, contenido: 50, horas: 13, pfae: 9, metodologia: 24, recursos: 55,
          escenario: 20, biblio: 38, fecha: 26, separator: 3, resultado: 42, criterio: 36, instrumento: 32, other: 28,
        };
        const colWidthMap: Record<number, number> = {};
        let totalAssigned = 0;
        for (let i = 0; i < maxLogCols; i++) { totalAssigned += widthByType[colTypeMap[i] || 'other']; }
        if (totalAssigned > 0) {
          const scaleF = contentWidth / totalAssigned;
          for (let i = 0; i < maxLogCols; i++) { colWidthMap[i] = Math.round(widthByType[colTypeMap[i] || 'other'] * scaleF * 10) / 10; }
        }

        const body: any[][] = [];
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
          if (headerRowIdx >= 0 && ri > headerRowIdx && ri < headerRowIdx + headerOriginalSpan) continue;
          const isRealHeader = (ri === headerRowIdx);
          let currentLogCol = 0;
          for (const cell of visibleCells) {
            let content = (cell.content || '').replace(/\r\n/g, '\n');
            const contentUp = content.trim().toUpperCase();
            const isVert = cell.textOrientation === 'vertical';
            if (!isVert && !isRealHeader && content.includes('B.') && !content.includes('\n')) {
              content = content.replace(/\s+(B\.)/g, '\n$1');
            }
            let displayContentPdf = content;
            if (isVert && isRealHeader) {
              if (contentUp.includes('METODOLOG')) displayContentPdf = 'Metodología';
              else if (contentUp.includes('ESCENARIO')) displayContentPdf = 'Escenario';
              else if (contentUp.includes('PRESENCIAL')) displayContentPdf = 'HD.\nPresencial';
              else if (contentUp.includes('SINCRÓNIC') || contentUp.includes('SINCRONIC')) displayContentPdf = 'HD.\nSincrónica';
            }
            let cellSpan = cell.colSpan || 1;
            if (currentLogCol + cellSpan > maxLogCols) { cellSpan = Math.max(1, maxLogCols - currentLogCol); }
            const safeRowSpan = isRealHeader ? 1 : (cell.rowSpan || 1);
            const isVisadoDataRow = isVisadoSection && !isRealHeader;
            const isVisadoFechaRow = isVisadoDataRow && content.trim().toLowerCase().startsWith('fecha');
            pdfRow.push({
              content: displayContentPdf, rowSpan: safeRowSpan, colSpan: cellSpan,
              styles: {
                fontStyle: isRealHeader ? 'bold' as const : 'normal' as const,
                fillColor: isRealHeader ? '#E8EDF2' : (cell.backgroundColor || '#FFFFFF'),
                textColor: isRealHeader ? '#1E3A5F' : '#1F2937',
                fontSize: isVisadoSection ? 10 : isRealHeader ? 7.5 : 8,
                cellPadding: isVisadoFechaRow ? { top: 2, right: 3, bottom: 2, left: 3 } : isVisadoDataRow ? { top: 20, right: 3, bottom: 3, left: 3 } : isRealHeader ? { top: 1.5, right: 1, bottom: 1.5, left: 1 } : { top: 0.8, right: 0.8, bottom: 0.8, left: 0.8 },
                halign: isVisadoSection ? 'center' as const : isEstructuraSection ? 'center' as const : isRealHeader ? 'center' as const : 'left' as const,
                valign: isVisadoDataRow ? 'bottom' as const : 'middle' as const,
                minCellHeight: isVisadoFechaRow ? 8 : isVisadoDataRow ? 30 : isRealHeader ? 6 : 3,
                overflow: 'linebreak' as const,
              }
            });
            currentLogCol += cellSpan;
          }
          if (pdfRow.length > 0) body.push(pdfRow);
        }

        if (body.length > 0) {
          const colStyles: Record<number, { cellWidth: number }> = {};
          for (let i = 0; i < maxLogCols; i++) { if (colWidthMap[i]) colStyles[i] = { cellWidth: colWidthMap[i] }; }

          // Rastrear celdas combinadas (rowSpan>1) para limpiar bordes internos
          const mergedCellsOnPage: Array<{x: number, y: number, w: number, h: number, bg: any, rawContent: string, text: string[], styles: any, page: number}> = [];

          autoTable(doc, {
            body: body as any, startY: currentY, theme: 'grid',
            styles: {
              fontSize: isVisadoSection ? 10 : 8,
              cellPadding: isVisadoSection ? { top: 6, right: 3, bottom: 6, left: 3 } : isEstructuraSection ? { top: 1.2, right: 1, bottom: 1.2, left: 1 } : { top: 0.8, right: 0.8, bottom: 0.8, left: 0.8 },
              lineColor: '#9CA3AF', lineWidth: 0.15, overflow: 'linebreak',
              halign: isEstructuraSection ? 'center' : 'left', valign: 'middle',
              minCellHeight: isVisadoSection ? 20 : 3,
            },
            columnStyles: colStyles,
            margin: { left: marginL, right: marginR, top: 15 },
            tableWidth: contentWidth,
            didDrawCell: (data: any) => {
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
              if (isEstructuraSection && mergedCellsOnPage.length > 0) {
                const currentPage = doc.getNumberOfPages();
                for (const mc of mergedCellsOnPage) {
                  if (mc.page !== currentPage) continue;
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
                    const pad = 1.2;
                    const cellInnerW = mc.w - 2 * pad;
                    const halign = mc.styles.halign || 'center';
                    let textX: number;
                    if (halign === 'center') textX = mc.x + mc.w / 2;
                    else if (halign === 'right') textX = mc.x + mc.w - pad;
                    else textX = mc.x + pad;
                    const lineH = fs * 0.4;
                    const totalTextH = textLines.length * lineH;
                    const textY = mc.y + (mc.h - totalTextH) / 2 + lineH * 0.7;
                    for (let li = 0; li < textLines.length; li++) {
                      const line = textLines[li];
                      if (line.trim().length === 0) continue;
                      doc.text(line, textX, textY + li * lineH, { align: halign, maxWidth: cellInnerW });
                    }
                  }

                  doc.setDrawColor('#9CA3AF');
                  doc.setLineWidth(lw);
                  doc.rect(mc.x, mc.y, mc.w, mc.h, 'S');
                }
                mergedCellsOnPage.length = 0;
              }
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
    const VISADO_ETAPAS = [
      { etapa: 'decano',             label: 'DECANO/A DE FACULTAD' },
      { etapa: 'director_academico', label: 'DIRECTOR/A ACADÉMICO/A' },
      { etapa: 'coordinador',        label: 'COORDINADOR/A DE CARRERA' },
      { etapa: 'docente',            label: 'DOCENTE' },
    ]
    const VTITLE_H = 5
    const VHEADER_H = 7
    const VSIGN_H = 36
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

    const colW = contentWidth / 4

    doc.setFillColor(220, 229, 242)
    doc.rect(marginL, currentY, contentWidth, VHEADER_H, 'F')
    doc.setDrawColor(180, 190, 210)
    doc.setLineWidth(0.12)
    doc.rect(marginL, currentY, contentWidth, VHEADER_H)
    VISADO_ETAPAS.forEach((cfg, i) => {
      const x = marginL + i * colW
      if (i > 0) doc.line(x, currentY, x, currentY + VHEADER_H)
      doc.setFontSize(5.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(25, 50, 95)
      const lns = doc.splitTextToSize(cfg.label, colW - 3)
      doc.text(lns, x + colW / 2, currentY + 4, { align: 'center' })
    })
    currentY += VHEADER_H

    doc.setDrawColor(180, 190, 210)
    doc.setLineWidth(0.12)
    doc.rect(marginL, currentY, contentWidth, VSIGN_H)
    VISADO_ETAPAS.forEach((cfg, i) => {
      const x = marginL + i * colW
      if (i > 0) doc.line(x, currentY, x, currentY + VSIGN_H)
      const etapaInfo = firmasData?.etapas?.find((e: any) => e.etapa === cfg.etapa)
      if (etapaInfo?.firmado && etapaInfo.firma) {
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 30, 30)
        const lns = doc.splitTextToSize(etapaInfo.firma.usuario_nombre || '', colW - 4)
        doc.text(lns, x + colW / 2, currentY + 6, { align: 'center' })
        if (etapaInfo.firma.qr_data_url) {
          try {
            const qrSz = 16
            doc.addImage(etapaInfo.firma.qr_data_url, 'PNG', x + (colW - qrSz) / 2, currentY + 10, qrSz, qrSz)
          } catch {}
        }
        const fecha = `Fecha: ${new Date(etapaInfo.firma.firmado_at).toLocaleDateString('es-EC')}`
        doc.setFontSize(5.5)
        doc.setTextColor(80, 80, 80)
        doc.text(fecha, x + colW / 2, currentY + VSIGN_H - 3, { align: 'center' })
      } else {
        doc.setFontSize(6)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text('Pendiente de firma', x + colW / 2, currentY + VSIGN_H / 2 + 3, { align: 'center' })
      }
    })

    doc.save(`Syllabus_${syllabusData.name || 'Docente'}.pdf`);
  }

  // Auto-fill content for profesor info
  const getAutoFilledContent = (cell: TableCell, rowIndex: number, cellIndex: number): string => {
    if (rowIndex <= 5 && cellIndex > 0 && profesorInfo) {
      const currentRow = tableData[rowIndex]
      if (!currentRow) return cell.content || ""
      const prevCell = currentRow.cells[cellIndex - 1]
      const etiqueta = prevCell?.content?.toUpperCase().trim() || ""
      
      if (etiqueta.includes("PARALELO") && profesorInfo.paralelo?.nombre) {
        return profesorInfo.paralelo.nombre
      }
      if ((etiqueta.includes("PROFESOR") || etiqueta.includes("DOCENTE")) && !etiqueta.includes("PERFIL")) {
        return `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim()
      }
    }
    return cell.content || ""
  }

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/docente">
                <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Editor de Syllabus</h1>
                <p className="text-sm text-gray-500">
                  {profesorInfo ? `${profesorInfo.nombres} ${profesorInfo.apellidos}` : 'Cargando...'}
                  {selectedAsignaturaId && asignaturasDisponibles.length > 0 && (
                    <> — {asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || 'Sin asignatura'}</>
                  )}
                  {!selectedAsignaturaId && asignaturasDisponibles.length === 0 && profesorInfo && ' — Sin asignatura'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {asignaturasDisponibles.length > 1 && (
                <Select value={selectedAsignaturaId} onValueChange={setSelectedAsignaturaId}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Asignatura" /></SelectTrigger>
                  <SelectContent>
                    {asignaturasDisponibles.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.nombre} ({a.codigo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[250px]"><SelectValue placeholder="Periodo" /></SelectTrigger>
                <SelectContent>
                  {periodos.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isSaving || !syllabusData}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar</>}
              </Button>
              <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!syllabusData}>
                <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>

          {hasDocenteVersion && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Estás editando tu versión guardada del syllabus.
            </div>
          )}

          {periodoAutoSyncMsg && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
              ⚠️ {periodoAutoSyncMsg}
            </div>
          )}

          {/* Legend */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Unlock className="h-4 w-4 text-green-600" /> Campos editables (verde)</span>
              <span className="flex items-center gap-1"><Lock className="h-4 w-4 text-gray-400" /> Campos de solo lectura (gris)</span>
            </div>
            <p className="mt-1 text-amber-700 text-xs">
              Puedes editar: Paralelo, Horario, Perfil del profesor, Contenidos (HD, PFAE, TA), Metodologías, Recursos, Escenario, Bibliografía, Fecha, Criterios e Instrumentos de evaluación.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-600">Cargando syllabus...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadSyllabus} variant="outline">Reintentar</Button>
            </div>
          )}

          {!loading && !error && syllabusData && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2 border-b">
                {syllabusData.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-4 py-2 text-sm rounded-t-lg whitespace-nowrap transition-colors ${
                      activeTabId === tab.id
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>

              {/* Table */}
              {activeTab && (
                <Card className="border-emerald-100 shadow-md">
                  <CardContent className="p-4">
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white max-h-[75vh] overflow-y-auto custom-scrollbar">
                      <table className="border-collapse text-xs text-left" style={{ tableLayout: (activeTab && (activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS'))) ? 'fixed' : 'auto', width: '100%', maxWidth: '100%' }}>
                        <tbody className="divide-y divide-gray-200">
                          {tableData.length === 0 ? (
                            <tr><td className="p-12 text-center text-gray-500">La tabla está vacía.</td></tr>
                          ) : (
                            tableData.map((row, rowIndex) => {
                              const isFirstSectionRow = activeTab && (activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS'));
                              const rowVisibleCols = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                              const isFormRow = isFirstSectionRow && rowVisibleCols <= 4;
                              return (
                              <tr key={row.id} className={`transition-colors ${isFormRow ? 'hover:bg-slate-50/80' : 'hover:bg-blue-50/50'}`}>
                                {row.cells.map((cell, cellIndex) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;

                                  const editable = isDocenteEditable(cell, rowIndex, cellIndex, tableData)
                                  const displayContent = getAutoFilledContent(cell, rowIndex, cellIndex)
                                  const contentTrimmed = (cell.content || '').trim();

                                  // Primera sección: nunca vertical; con guión o >14 chars: nunca vertical
                                  const isFirstSection = activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS');
                                  const isVertical = (() => {
                                    if (cell.textOrientation !== 'vertical') return false;
                                    if (isFirstSection) return false;
                                    if (contentTrimmed.includes('-') || contentTrimmed.length > 14) return false;
                                    return true;
                                  })();

                                  const isSeparator = contentTrimmed === ':' || (contentTrimmed.length <= 2 && !/[a-zA-Z0-9]/.test(contentTrimmed) && contentTrimmed.length > 0);
                                  const totalVisibleCols = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                                  const isSimpleRow = totalVisibleCols <= 4;

                                  // Column type detection from headers
                                  const getHeaderColType = () => {
                                    if (!activeTab || !activeTab.rows) return 'other';
                                    for (const hRow of activeTab.rows) {
                                      const vis = hRow.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
                                      if (vis.length < 3 || !vis.every(c => c.isHeader)) continue;
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
                                  const colType = getHeaderColType();

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

                                  const dims = (() => {
                                    if (isFirstSection && isSimpleRow) {
                                      if (isSeparator) return { w: '18px', min: '18px', max: '18px' };
                                      if (cellIndex === 0) return { w: '250px', min: '200px', max: '300px' };
                                      return { w: 'auto', min: '60px', max: 'none' };
                                    }
                                    if (isVertical) return { w: '28px', min: '28px', max: '28px' };
                                    if (isSeparator) return { w: '20px', min: '20px', max: '20px' };
                                    if (contentTrimmed.length <= 4 && cellIndex > 1 && !cell.isHeader) return { w: '35px', min: '35px', max: '45px' };
                                    if (colType !== 'other') return colWidthConfig[colType];
                                    if (cellIndex === 0) return { w: 'auto', min: '100px', max: '160px' };
                                    return { w: 'auto', min: '60px', max: 'none' };
                                  })();
                                  const cellWidth = dims.w;
                                  const cellMinW = dims.min;
                                  const cellMaxW = dims.max;

                                  const isFirstSectionLabel = isFirstSection && isSimpleRow && cellIndex === 0;
                                  const isFirstSectionValue = isFirstSection && isSimpleRow && cellIndex > 0 && !isSeparator;

                                  const isVisadoTab = activeTab.title.toUpperCase().includes('VISADO') || activeTab.title.toUpperCase().includes('LEGALIZACIÓN') || activeTab.title.toUpperCase().includes('LEGALIZACION');
                                  const shouldCenterVertically = cell.isHeader || (cell.rowSpan && cell.rowSpan > 1) || isVisadoTab || totalVisibleCols >= 3;
                                  const vertAlign = shouldCenterVertically ? 'align-middle' : 'align-top';

                                  return (
                                    <td
                                      key={cell.id}
                                      className={`border relative ${vertAlign} ${
                                        editable
                                          ? 'border-green-300 bg-green-50/50 cursor-cell hover:bg-green-100/50'
                                          : isFirstSectionLabel
                                            ? 'border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 font-semibold text-gray-700'
                                            : isFirstSectionValue
                                              ? 'border-gray-200 bg-white text-gray-800'
                                              : cell.isHeader
                                                ? 'border-gray-300 bg-gray-100/80 font-bold text-gray-800'
                                                : 'border-gray-300 bg-white text-gray-700'
                                      }`}
                                      style={{
                                        backgroundColor: cell.backgroundColor || (isFirstSectionLabel ? undefined : cell.isHeader ? '#f8fafc' : undefined),
                                        width: cellWidth,
                                        minWidth: cellMinW,
                                        maxWidth: cellMaxW,
                                        padding: 0,
                                        ...(isFirstSection && isSimpleRow ? { borderBottom: '1px solid #e2e8f0' } : {}),
                                      }}
                                      rowSpan={cell.rowSpan}
                                      colSpan={cell.colSpan}
                                      onDoubleClick={() => {
                                        if (editable) {
                                          setModalCell({ id: cell.id, content: displayContent, isEditable: true })
                                          setEditContent(displayContent)
                                        }
                                      }}
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
                                          fontSize: isFirstSectionLabel ? '17px' : isVertical ? '9px' : '17px',
                                        }}
                                      >
                                        {editingCell === cell.id ? (
                                          <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            autoFocus
                                            onBlur={saveEdit}
                                            className="w-full min-h-[50px] p-1 text-xs resize-y border-blue-400 focus-visible:ring-1 focus-visible:ring-blue-500"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                              if (e.key === "Escape") cancelEdit();
                                            }}
                                          />
                                        ) : (
                                          <div
                                            className={`whitespace-pre-wrap break-words w-full ${cell.isHeader ? 'text-center' : ''}`}
                                            style={{ wordBreak: 'break-word', lineHeight: '1.3' }}
                                          >
                                            {displayContent || <span className="opacity-0">.</span>}
                                            {editable && !displayContent && (
                                              <span className="text-green-400 italic text-[9px]">Doble clic para editar</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {!editable && (
                                        <div className="absolute top-0 right-0 p-0.5">
                                          <Lock className="h-2.5 w-2.5 text-gray-300" />
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            );})                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Panel de firmas digitales */}
          {syllabus_comision_id && (
            <div className="mt-6">
              <FirmasPanel
                tipo="syllabus"
                documentoId={syllabus_comision_id}
                documentoNombre={syllabusData?.name || 'Syllabus'}
              />
            </div>
          )}
        </main>

        {/* Modal de edición */}
        {modalCell && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalCell(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
                <h3 className="text-lg font-bold text-emerald-800">Editar Celda</h3>
              </div>
              <div className="p-4">
                {modalCell.isEditable ? (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[300px] p-3 text-sm border-gray-300 rounded-lg"
                    autoFocus
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-gray-700 p-3 bg-gray-50 rounded-lg min-h-[200px]">
                    {modalCell.content}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setModalCell(null)}>Cerrar</Button>
                {modalCell.isEditable && (
                  <Button className="bg-emerald-600 text-white" onClick={saveModalEdit}>
                    <Save className="h-4 w-4 mr-2" /> Guardar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
