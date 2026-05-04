"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, Loader2, FileDown } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { FirmasPanel } from "@/components/firmas/firmas-panel"

// --- INTERFACES ---
interface TableCell {
  id: string; content: string; isHeader: boolean; rowSpan: number; colSpan: number;
  isEditable: boolean; docenteEditable?: boolean; backgroundColor?: string; textColor?: string; fontSize?: string;
  fontWeight?: string; textAlign?: string; textOrientation?: 'horizontal' | 'vertical';
}
interface TableRow { id: string; cells: TableCell[]; }
interface TabData { id: string; title: string; rows: TableRow[]; }
interface ProgramaData {
  id?: string | number; name?: string; description?: string; tabs: TabData[];
  metadata?: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; };
  version?: string;
}

export default function DocenteEditorProgramaAnaliticoPage() {
  const { token, getToken, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [programaData, setProgramaData] = useState<ProgramaData | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [modalCell, setModalCell] = useState<{id: string, content: string, isEditable: boolean} | null>(null)
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [profesorInfo, setProfesorInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [programa_comision_id, setProgramaComisionId] = useState<number | null>(null)
  const [hasDocenteVersion, setHasDocenteVersion] = useState(false)
  const [asignaturasDisponibles, setAsignaturasDisponibles] = useState<any[]>([])
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<string>('')

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
          
          const mainId = res.data.asignatura_id || res.data.asignatura?.id || (asigs.length > 0 ? asigs[0].id : null)
          if (mainId) setSelectedAsignaturaId(String(mainId))
        }
      } catch (e) { console.error('Error cargando info profesor:', e) }
    }
    loadProfesor()
  }, [])

  // Cargar programa cuando cambia el periodo o la asignatura
  useEffect(() => {
    if (!selectedPeriod || !profesorInfo) return
    if (!selectedAsignaturaId && asignaturasDisponibles.length === 0) return
    loadPrograma()
  }, [selectedPeriod, profesorInfo, selectedAsignaturaId])

  const loadPrograma = async () => {
    setLoading(true)
    setError(null)

    const asignaturaId = selectedAsignaturaId || profesorInfo?.asignatura_id || profesorInfo?.asignatura?.id
    if (!asignaturaId) {
      setError("No tienes una asignatura asignada. Contacta al administrador.")
      setLoading(false)
      return
    }

    try {
      // 1. Primero buscar si el docente ya tiene una versión guardada
      try {
        const docenteRes = await apiRequest(`/docente-editor/programa/mio?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
        if (docenteRes.success && docenteRes.data?.datos_programa) {
          let datos = docenteRes.data.datos_programa
          if (typeof datos === 'string') datos = JSON.parse(datos)
          processProgramaData(datos)
          setProgramaComisionId(docenteRes.data.programa_comision_id)
          setHasDocenteVersion(true)
          setLoading(false)
          return
        }
      } catch (e) { /* No tiene versión propia, buscar la de comisión */ }

      // 2. Buscar programa de la comisión
      const comisionRes = await apiRequest(`/docente-editor/programa/comision?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
      if (comisionRes.success && comisionRes.data) {
        let datos = comisionRes.data.datos_programa
        if (typeof datos === 'string') datos = JSON.parse(datos)
        processProgramaData(datos)
        setProgramaComisionId(comisionRes.data.id)
        setHasDocenteVersion(false)
      } else {
        setError("No se encontró programa analítico para tu asignatura en este periodo.")
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar programa analítico")
    } finally {
      setLoading(false)
    }
  }

  const processProgramaData = (datos: any) => {
    let parsed: ProgramaData

    // If datos has secciones format (old), convert to tabs
    let normalizedDatos = datos
    if (!datos.tabs && datos.secciones && Array.isArray(datos.secciones)) {
      normalizedDatos = {
        ...datos,
        tabs: datos.secciones.map((sec: any, idx: number) => ({
          id: sec.id || `tab-${idx}`,
          title: sec.titulo || sec.title || `Sección ${idx + 1}`,
          rows: (sec.filas || sec.rows || []).map((fila: any, fIdx: number) => ({
            id: fila.id || `row-${idx}-${fIdx}`,
            cells: (fila.celdas || fila.cells || []).map((celda: any, cIdx: number) => ({
              id: celda.id || `cell-${idx}-${fIdx}-${cIdx}`,
              content: celda.contenido || celda.content || '',
              isHeader: celda.esEncabezado || celda.isHeader || false,
              rowSpan: celda.rowSpan || 1,
              colSpan: celda.colSpan || 1,
              isEditable: true,
              backgroundColor: celda.backgroundColor || celda.styles?.backgroundColor,
              textColor: celda.textColor || celda.styles?.textColor,
              fontSize: celda.fontSize || celda.styles?.fontSize,
              fontWeight: celda.fontWeight || celda.styles?.fontWeight,
              textAlign: celda.textAlign || celda.styles?.textAlign,
              textOrientation: celda.textOrientation || celda.styles?.textOrientation || 'horizontal',
            }))
          }))
        }))
      }
    }

    if (normalizedDatos.tabs) {
      parsed = {
        ...normalizedDatos,
        tabs: normalizedDatos.tabs.map((t: any) => ({
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
    } else {
      setError("Formato de programa analítico no reconocido")
      return
    }

    setProgramaData(parsed)
    if (parsed.tabs.length > 0 && !activeTabId) {
      setActiveTabId(parsed.tabs[0].id)
    }
  }

  const activeTab = programaData?.tabs.find(t => t.id === activeTabId)
  const tableData = activeTab?.rows || []

  // Edición de celdas - verificar si la comisión lo permite
  const isCellEditable = (cell: TableCell): boolean => {
    // Si la comisión configuró docenteEditable, respetar esa configuración
    if (cell.docenteEditable === true) return true;
    if (cell.docenteEditable === false) return false;
    // Si no está configurado (undefined), todas editables por defecto en programa analítico
    return true;
  }

  const saveEdit = () => {
    if (!editingCell || !programaData) return
    setProgramaData(prev => {
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
    if (!modalCell || !programaData) return
    setProgramaData(prev => {
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
    if (!programaData) return alert("No hay programa para guardar.")
    if (!selectedPeriod) return alert("Seleccione un periodo.")

    const asignaturaId = selectedAsignaturaId || profesorInfo?.asignatura_id || profesorInfo?.asignatura?.id
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0-docente",
        metadata: programaData.metadata,
        tabs: programaData.tabs.map(tab => ({
          id: tab.id, title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id, cells: row.cells.map(cell => ({
              ...cell,
              styles: { backgroundColor: cell.backgroundColor, textColor: cell.textColor, textAlign: cell.textAlign, textOrientation: cell.textOrientation }
            }))
          }))
        }))
      }

      await apiRequest('/docente-editor/programa/guardar', {
        method: 'POST',
        body: JSON.stringify({
          asignatura_id: asignaturaId,
          periodo: selectedPeriod,
          nombre: programaData.name || 'Programa Analítico Docente',
          datos_programa: datosParaGuardar,
          programa_comision_id: programa_comision_id
        })
      })

      setHasDocenteVersion(true)
      alert("Programa analítico guardado exitosamente!")
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // =====================================================================
  // GENERACIÓN DE PDF - PROGRAMA ANALÍTICO DE ASIGNATURA
  // =====================================================================
  const handlePrintToPdf = async () => {
    if (!programaData) return

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()   // 297mm
    const pageHeight = doc.internal.pageSize.getHeight() // 210mm
    const marginL = 8
    const marginR = 8
    const contentWidth = pageWidth - marginL - marginR    // 281mm

    // --- FIRMAS del documento (para sección VISADO al final) ---
    let firmasData: any = null
    if (programa_comision_id) {
      try {
        const firmasRes = await Promise.race([
          apiRequest(`/firmas/programa_analitico/${programa_comision_id}`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ])
        if ((firmasRes as any).success) firmasData = (firmasRes as any).data
      } catch { /* firmas no disponibles o timeout */ }
    }

    // --- LOGO UNESUM ---
    try {
      const logoImg = new Image()
      logoImg.crossOrigin = 'anonymous'
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve()
          logoImg.onerror = () => reject()
          logoImg.src = '/images/unesum-logo-official.png'
        }),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
      ])
      doc.addImage(logoImg, 'PNG', marginL, 3, 11, 11)
    } catch { /* logo no disponible o timeout */ }

    // --- ENCABEZADO: rectángulo azul de fondo ---
    doc.setFillColor(25, 50, 95)
    doc.rect(marginL, 2, contentWidth, 14, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ', pageWidth / 2, 7, { align: 'center' })
    doc.setFontSize(8)
    doc.text('PROGRAMA ANALÍTICO DE ASIGNATURA', pageWidth / 2, 12, { align: 'center' })

    // --- MATERIA Y PERIODO (banda gris claro) ---
    const asignaturaName = asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || programaData.name || ''
    const periodoName = periodos.find((p: any) => String(p.id) === selectedPeriod)?.nombre || ''
    doc.setFillColor(240, 244, 250)
    doc.rect(marginL, 16, contentWidth, 7, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(25, 50, 95)
    const headerLine = [asignaturaName, periodoName ? `Periodo: ${periodoName}` : ''].filter(Boolean).join('   |   ')
    if (headerLine) doc.text(headerLine, pageWidth / 2, 20.5, { align: 'center' })

    let currentY = 25

    // --- CONTENIDO POR CADA PESTAÑA ---
    for (const tab of programaData.tabs) {
      if (!tab.rows || tab.rows.length === 0) continue

      if (currentY + 15 > pageHeight - 8) {
        doc.addPage()
        currentY = 8
      }

      // Título de sección: barra coloreada
      const tabTitleH = 5
      doc.setFillColor(59, 100, 160)
      doc.rect(marginL, currentY, contentWidth, tabTitleH, 'F')
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(tab.title.toUpperCase(), marginL + 2, currentY + 3.5)
      currentY += tabTitleH + 0.5

      // Calcular número máximo de columnas lógicas
      let maxCols = 0
      for (const row of tab.rows) {
        const vis = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0)
        const logCols = vis.reduce((sum, c) => sum + (c.colSpan || 1), 0)
        if (logCols > maxCols) maxCols = logCols
      }
      if (maxCols === 0) continue

      // Detectar columna PERIODO para darle ancho fijo y centrado
      let periodoColStart = -1
      let periodoColSpan = 1
      outer: for (const row of tab.rows) {
        let logCol = 0
        for (const cell of row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0)) {
          if ((cell.content || '').toUpperCase().includes('PERIODO')) {
            periodoColStart = logCol
            periodoColSpan = cell.colSpan || 1
            break outer
          }
          logCol += cell.colSpan || 1
        }
      }

      // Calcular columnStyles: columna PERIODO = 22% del ancho, resto proporcional
      const colStyles: Record<number, any> = {}
      if (periodoColStart >= 0 && maxCols > 1) {
        const periodoW = Math.round(contentWidth * 0.22)
        const restCols = maxCols - periodoColSpan
        const restW = restCols > 0 ? Math.round((contentWidth - periodoW) / restCols) : contentWidth
        for (let i = 0; i < maxCols; i++) {
          if (i >= periodoColStart && i < periodoColStart + periodoColSpan) {
            colStyles[i] = { cellWidth: periodoW / periodoColSpan, halign: 'center' }
          } else {
            colStyles[i] = { cellWidth: restW }
          }
        }
      }

      // Construir cuerpo de la tabla (rowSpan siempre 1 para evitar el warning "row -1" de jspdf-autotable)
      const body: any[][] = []

      for (const row of tab.rows) {
        const pdfRow: any[] = []
        let currentLogCol = 0

        for (const cell of row.cells) {
          if (currentLogCol >= maxCols) break
          const isGhost = (cell.rowSpan ?? 1) <= 0 || (cell.colSpan ?? 1) <= 0

          if (isGhost) {
            // Celda cubierta por span anterior → filler vacío
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
            })
            currentLogCol++
          } else {
            let cellSpan = cell.colSpan || 1
            if (currentLogCol + cellSpan > maxCols) cellSpan = Math.max(1, maxCols - currentLogCol)

            const isHeader = cell.isHeader
            const content = (cell.content || '').replace(/\r\n/g, '\n')
            const isPeriodoCell = periodoColStart >= 0 && currentLogCol >= periodoColStart && currentLogCol < periodoColStart + periodoColSpan

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
            })
            currentLogCol += cellSpan
          }
        }

        if (pdfRow.length > 0) body.push(pdfRow)
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
        })

        const finalY = (doc as any).lastAutoTable?.finalY ?? (doc as any).previousAutoTable?.finalY ?? currentY + 8
        currentY = finalY + 2
      }

      // Ceder el hilo al navegador entre pestañas para no congelar la UI
      await new Promise<void>(r => setTimeout(r, 0))
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

    // Title bar
    doc.setFillColor(25, 50, 95)
    doc.rect(marginL, currentY, contentWidth, VTITLE_H, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('VISADO', marginL + 4, currentY + 3.5)
    currentY += VTITLE_H

    const colW = contentWidth / 4

    // Column header row (light blue)
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

    // Signature boxes
    doc.setDrawColor(180, 190, 210)
    doc.setLineWidth(0.12)
    doc.rect(marginL, currentY, contentWidth, VSIGN_H)

    VISADO_ETAPAS.forEach((cfg, i) => {
      const x = marginL + i * colW
      if (i > 0) doc.line(x, currentY, x, currentY + VSIGN_H)

      const etapaInfo = firmasData?.etapas?.find((e: any) => e.etapa === cfg.etapa)

      if (etapaInfo?.firmado && etapaInfo.firma) {
        // Nombre
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 30, 30)
        const lns = doc.splitTextToSize(etapaInfo.firma.usuario_nombre || '', colW - 4)
        doc.text(lns, x + colW / 2, currentY + 6, { align: 'center' })
        // QR
        if (etapaInfo.firma.qr_data_url) {
          try {
            const qrSz = 16
            doc.addImage(etapaInfo.firma.qr_data_url, 'PNG', x + (colW - qrSz) / 2, currentY + 10, qrSz, qrSz)
          } catch {}
        }
        // Fecha
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

    const slug = asignaturaName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 40) || 'Programa_Analitico'
    doc.save(`PA_${slug}.pdf`)
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
                <h1 className="text-2xl font-bold text-gray-900">Editor de Programa Analítico</h1>
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
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isSaving || !programaData}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar</>}
              </Button>
              <Button onClick={handlePrintToPdf} variant="outline" disabled={!programaData}>
                <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>

          {hasDocenteVersion && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Estás editando tu versión guardada del programa analítico.
            </div>
          )}

          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            Haz doble clic en las celdas habilitadas para editarlas. Las celdas bloqueadas por la comisión aparecen en gris.
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-600">Cargando programa analítico...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadPrograma} variant="outline">Reintentar</Button>
            </div>
          )}

          {!loading && !error && programaData && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2 border-b">
                {programaData.tabs.map(tab => (
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
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white max-h-[75vh] overflow-y-auto">
                      <table className="border-collapse text-xs text-left w-full">
                        <tbody className="divide-y divide-gray-200">
                          {tableData.length === 0 ? (
                            <tr><td className="p-12 text-center text-gray-500">La tabla está vacía.</td></tr>
                          ) : (
                            tableData.map((row, rowIndex) => (
                              <tr key={row.id} className="hover:bg-blue-50/50">
                                {row.cells.map((cell, cellIndex) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;

                                  const isVertical = cell.textOrientation === 'vertical'
                                  const editable = isCellEditable(cell)

                                  return (
                                    <td
                                      key={cell.id}
                                      className={`border relative align-top ${editable ? 'cursor-cell' : 'cursor-not-allowed'} ${
                                        cell.isHeader
                                          ? 'border-gray-300 bg-gray-100/80 font-bold text-gray-800 hover:bg-gray-200/80'
                                          : editable 
                                            ? 'border-gray-200 bg-white text-gray-700 hover:bg-blue-50/50'
                                            : 'border-gray-200 bg-gray-50 text-gray-500'
                                      }`}
                                      style={{
                                        backgroundColor: cell.backgroundColor || undefined,
                                        padding: 0,
                                        minWidth: isVertical ? '28px' : '40px',
                                      }}
                                      rowSpan={cell.rowSpan}
                                      colSpan={cell.colSpan}
                                      onDoubleClick={() => {
                                        if (!editable) return;
                                        setModalCell({ id: cell.id, content: cell.content || '', isEditable: true })
                                        setEditContent(cell.content || '')
                                      }}
                                    >
                                      <div
                                        className="w-full h-full px-1 py-0.5 flex justify-start text-left"
                                        style={{
                                          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                                          transform: isVertical ? 'rotate(180deg)' : 'none',
                                          alignItems: 'flex-start',
                                          maxHeight: isVertical ? '100px' : 'none',
                                          whiteSpace: isVertical ? 'nowrap' : 'pre-wrap',
                                          overflow: 'hidden',
                                          lineHeight: '1.15',
                                          fontSize: isVertical ? '9px' : '11px',
                                        }}
                                      >
                                        {editingCell === cell.id ? (
                                          <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            autoFocus
                                            onBlur={saveEdit}
                                            className="w-full min-h-[50px] p-1 text-xs resize-y"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                              if (e.key === "Escape") cancelEdit();
                                            }}
                                          />
                                        ) : (
                                          <div className="whitespace-pre-wrap break-words w-full" style={{ wordBreak: 'break-word', lineHeight: '1.15' }}>
                                            {cell.content || <span className="opacity-0">.</span>}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Panel de firmas digitales */}
          {programa_comision_id && (
            <div className="mt-6">
              <FirmasPanel
                tipo="programa_analitico"
                documentoId={programa_comision_id}
                documentoNombre={
                  asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre
                  || programaData?.name
                  || 'Programa Analítico'
                }
              />
            </div>
          )}
        </main>

        {/* Modal de edición */}
        {modalCell && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalCell(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-lg font-bold text-blue-800">Editar Celda</h3>
              </div>
              <div className="p-4">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[300px] p-3 text-sm border-gray-300 rounded-lg"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setModalCell(null)}>Cerrar</Button>
                <Button className="bg-blue-600 text-white" onClick={saveModalEdit}>
                  <Save className="h-4 w-4 mr-2" /> Guardar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
