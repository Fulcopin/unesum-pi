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

// --- INTERFACES ---
interface TableCell {
  id: string; content: string; isHeader: boolean; rowSpan: number; colSpan: number;
  isEditable: boolean; isLocked?: boolean; backgroundColor?: string; textColor?: string; fontSize?: string;
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
  // Mapa de celdas bloqueadas por la comisión (cellId → true)
  const [lockedCells, setLockedCells] = useState<Record<string, boolean>>({})

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

  const getCellPositionKey = (tabIndex: number, rowIndex: number, cellIndex: number) =>
    `${tabIndex}:${rowIndex}:${cellIndex}`

  const buildComisionLockState = (datos: any) => {
    const lockById: Record<string, boolean> = {}
    const lockByPosition: Record<string, boolean> = {}
    const tabs = Array.isArray(datos?.tabs)
      ? datos.tabs
      : Array.isArray(datos?.rows)
        ? [{ rows: datos.rows }]
        : []

    tabs.forEach((tab: any, tabIndex: number) => {
      ;(tab.rows || []).forEach((row: any, rowIndex: number) => {
        ;(row.cells || []).forEach((cell: any, cellIndex: number) => {
          const locked = !!cell.isLocked
          if (cell.id) lockById[cell.id] = locked
          lockByPosition[getCellPositionKey(tabIndex, rowIndex, cellIndex)] = locked
        })
      })
    })

    return { lockById, lockByPosition }
  }

  const applyComisionLocks = (
    datos: any,
    lockState: { lockById: Record<string, boolean>; lockByPosition: Record<string, boolean> }
  ) => {
    if (Array.isArray(datos?.tabs)) {
      return {
        ...datos,
        tabs: datos.tabs.map((tab: any, tabIndex: number) => ({
          ...tab,
          rows: (tab.rows || []).map((row: any, rowIndex: number) => ({
            ...row,
            cells: (row.cells || []).map((cell: any, cellIndex: number) => {
              const positionKey = getCellPositionKey(tabIndex, rowIndex, cellIndex)
              const locked = cell.id in lockState.lockById
                ? lockState.lockById[cell.id]
                : (lockState.lockByPosition[positionKey] ?? false)

              return { ...cell, isLocked: locked }
            })
          }))
        }))
      }
    }

    if (Array.isArray(datos?.rows)) {
      return {
        ...datos,
        rows: (datos.rows || []).map((row: any, rowIndex: number) => ({
          ...row,
          cells: (row.cells || []).map((cell: any, cellIndex: number) => {
            const positionKey = getCellPositionKey(0, rowIndex, cellIndex)
            const locked = cell.id in lockState.lockById
              ? lockState.lockById[cell.id]
              : (lockState.lockByPosition[positionKey] ?? false)

            return { ...cell, isLocked: locked }
          })
        }))
      }
    }

    return datos
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
    setLockedCells({})

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

          let mergedDatos = datos
          let resolvedComisionId = docenteRes.data.syllabus_comision_id

          // La comisión es la fuente de verdad para bloquear y desbloquear.
          try {
            const comisionRes = await apiRequest(`/docente-editor/syllabus/comision?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
            if (comisionRes.success && comisionRes.data?.datos_syllabus) {
              let comisionDatos = comisionRes.data.datos_syllabus
              if (typeof comisionDatos === 'string') comisionDatos = JSON.parse(comisionDatos)

              const lockState = buildComisionLockState(comisionDatos)
              mergedDatos = applyComisionLocks(datos, lockState)
              setLockedCells(lockState.lockById)
              resolvedComisionId = resolvedComisionId || comisionRes.data.id
            }
          } catch (e) {
            setLockedCells({})
          }

          processSyllabusData(mergedDatos)
          setSyllabusComisionId(resolvedComisionId)
          setHasDocenteVersion(true)

          setLoading(false)
          return
        }
      } catch (e) { 
        console.log('No hay versión propia del docente, buscando la de comisión...') 
      }

      // 2. Buscar syllabus de la comisión
      try {
        const comisionRes = await apiRequest(`/docente-editor/syllabus/comision?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
        if (comisionRes.success && comisionRes.data?.datos_syllabus) {
          let datos = comisionRes.data.datos_syllabus
          if (typeof datos === 'string') datos = JSON.parse(datos)

          const lockState = buildComisionLockState(datos)
          processSyllabusData(applyComisionLocks(datos, lockState))
          setLockedCells(lockState.lockById)
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
    // Si el admin bloqueó la celda (en la versión propia o en el mapa de bloqueos de comisión), no puede editar
    if (cell.isLocked || lockedCells[cell.id]) return false
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

  // Generar PDF — abre ventana de impresión del navegador (preserva merges y columnas)
  const handlePrintToPdf = async () => {
    if (!syllabusData) return;

    // --- FIRMAS ---
    let firmasData: any = null
    if (syllabus_comision_id) {
      try {
        const fr = await Promise.race([
          apiRequest(`/firmas/syllabus/${syllabus_comision_id}`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ])
        if ((fr as any).success) firmasData = (fr as any).data
      } catch { /* sin firmas */ }
    }

    const escHtml = (v: string) =>
      String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

    const asignaturaNombre = asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || syllabusData.name || ''
    const periodoObj = periodos.find((p: any) => String(p.id) === String(selectedPeriod))
    const periodoNombre = periodoObj?.nombre || ''
    const docenteNombre = profesorInfo ? `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim() : ''
    const headerLine = [asignaturaNombre, periodoNombre ? `Periodo: ${periodoNombre}` : '', docenteNombre].filter(Boolean).join(' | ')
    const logoUrl = `${window.location.origin}/images/unesum-logo-official.png`

    const buildTabHtml = (tab: TabData) => {
      const rowsHtml = tab.rows.map((row) => {
        const cellsHtml = row.cells.map((cell) => {
          if ((cell.rowSpan ?? 1) <= 0 || (cell.colSpan ?? 1) <= 0) return ''
          const bg = cell.backgroundColor || (cell.isHeader ? '#f8fafc' : '#ffffff')
          const fw = cell.fontWeight || (cell.isHeader ? '700' : 'normal')
          const ta = cell.isHeader ? 'center' : 'left'
          const tdStyle = `background-color:${bg};font-weight:${fw};text-align:${ta};writing-mode:horizontal-tb;word-break:break-word;overflow-wrap:break-word;white-space:normal;`
          return `<td rowspan="${cell.rowSpan ?? 1}" colspan="${cell.colSpan ?? 1}" style="${tdStyle}">${escHtml(cell.content || '')}</td>`
        }).join('')
        return `<tr>${cellsHtml}</tr>`
      }).join('')
      return `
        <section class="print-section">
          <div class="section-title">${escHtml(tab.title || '')}</div>
          <div class="table-shell"><table><tbody>${rowsHtml}</tbody></table></div>
        </section>`
    }

    const tabsHtml = syllabusData.tabs
      .filter(t => t.rows?.length && t.title?.trim().toUpperCase() !== 'VISADO')
      .map(t => buildTabHtml(t))
      .join('')

    const VISADO_ETAPAS = [
      { etapa: 'decano', label: 'DECANO/A DE FACULTAD' },
      { etapa: 'director_academico', label: 'DIRECTOR/A ACADÉMICO/A' },
      { etapa: 'coordinador', label: 'COORDINADOR/A DE CARRERA' },
      { etapa: 'docente', label: 'DOCENTE' },
    ]
    const visadoCols = VISADO_ETAPAS.map(cfg => {
      const info = firmasData?.etapas?.find((e: any) => e.etapa === cfg.etapa)
      const fecha = info?.firma?.firmado_at ? new Date(info.firma.firmado_at).toLocaleDateString('es-EC') : ''
      const qrHtml = info?.firma?.qr_data_url
        ? `<img src="${escHtml(info.firma.qr_data_url)}" alt="QR" class="firma-qr" />`
        : '<span class="firma-pendiente">Pendiente de firma</span>'
      return `<td class="visado-cell">
        <div class="visado-label">${escHtml(cfg.label)}</div>
        <div class="visado-content">
          <div class="visado-nombre">${escHtml(info?.firma?.usuario_nombre || '')}</div>
          ${qrHtml}
          <div class="visado-fecha">${fecha ? `Fecha: ${escHtml(fecha)}` : ''}</div>
        </div></td>`
    }).join('')
    const visadoHtml = `
      <section class="print-section visado-section">
        <div class="section-title">VISADO</div>
        <div class="table-shell"><table class="visado-table"><tbody><tr>${visadoCols}</tr></tbody></table></div>
      </section>`

    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Syllabus - ${escHtml(asignaturaNombre)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-size: 7pt; font-family: Arial, Helvetica, sans-serif; }
  body { color: #1f2937; background: #fff; }
  .export-header { margin-bottom: 6pt; border: 0.5pt solid #c7cdd6; border-radius: 4pt; overflow: hidden; }
  .page-header { display: flex; align-items: center; gap: 8pt; background: #19325f; color: white; padding: 6pt 10pt; }
  .page-header img { width: 36pt; height: 36pt; object-fit: contain; }
  .page-header-text { flex: 1; text-align: center; }
  .page-header-text h1 { font-size: 12pt; font-weight: 700; color: white; }
  .page-header-text h2 { font-size: 9pt; font-weight: 700; margin-top: 2pt; color: white; }
  .page-subheader { background: #f0f4fa; color: #19325f; padding: 4pt 10pt; text-align: center; font-size: 8pt; font-weight: 700; border-top: 0.5pt solid #c7cdd6; }
  .print-section { margin-top: 6pt; }
  .section-title { background: #3b64a0; color: white; padding: 4pt 6pt; font-size: 8pt; font-weight: 700; border-radius: 2pt 2pt 0 0; }
  .table-shell { border: 0.5pt solid #c7cdd6; border-top: none; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; background: white; }
  td { border: 0.5pt solid #c7cdd6; vertical-align: middle; padding: 2pt 3pt; word-break: break-word; overflow-wrap: break-word; white-space: normal; writing-mode: horizontal-tb !important; }
  .visado-section { margin-top: 10pt; }
  .visado-table { table-layout: fixed; }
  .visado-cell { vertical-align: top; padding: 0 !important; }
  .visado-label { background: #dce5f2; color: #19325f; text-align: center; font-size: 8pt; font-weight: 700; padding: 5pt; display: block; }
  .visado-content { min-height: 80pt; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5pt; padding: 6pt; text-align: center; }
  .visado-nombre { font-size: 7pt; }
  .visado-fecha { font-size: 7pt; color: #4b5563; }
  .firma-qr { width: 54pt; height: 54pt; object-fit: contain; }
  .firma-pendiente { font-size: 7pt; color: #9ca3af; font-style: italic; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { page-break-inside: avoid; }
    .visado-section { page-break-before: auto; }
  }
</style>
</head>
<body>
  <div class="export-header">
    <header class="page-header">
      <img src="${logoUrl}" alt="UNESUM" />
      <div class="page-header-text">
        <h1>UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ</h1>
        <h2>SYLLABUS DE LA ASIGNATURA</h2>
      </div>
    </header>
    <div class="page-subheader">${escHtml(headerLine)}</div>
  </div>
  ${tabsHtml}
  ${visadoHtml}
</body>
</html>`

    const win = window.open('', '_blank', 'width=1280,height=900')
    if (!win) { alert('Permita las ventanas emergentes para exportar el PDF.'); return }
    win.document.open()
    win.document.write(fullHtml)
    win.document.close()
    const tryPrint = () => { try { win.focus(); win.print() } catch { /* ignore */ } }
    if (win.document.readyState === 'complete') {
      setTimeout(tryPrint, 700)
    } else {
      win.addEventListener('load', () => setTimeout(tryPrint, 700), { once: true })
    }
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
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1"><Unlock className="h-4 w-4 text-green-600" /> Campos editables (verde)</span>
              <span className="flex items-center gap-1"><Lock className="h-4 w-4 text-gray-400" /> Campos de solo lectura</span>
              <span className="flex items-center gap-1"><Lock className="h-4 w-4 text-amber-400" /> Bloqueado por comisión académica</span>
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
                                  const isAdminLocked = cell.isLocked || !!lockedCells[cell.id]
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
                                        isAdminLocked
                                          ? 'border-amber-300 bg-amber-50/70 text-amber-900'
                                          : editable
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
                                        backgroundColor: isAdminLocked
                                          ? '#fffbeb'
                                          : cell.backgroundColor || (isFirstSectionLabel ? undefined : cell.isHeader ? '#f8fafc' : undefined),
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
                                          <Lock className={`h-2.5 w-2.5 ${isAdminLocked ? 'text-amber-400' : 'text-gray-300'}`} />
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
