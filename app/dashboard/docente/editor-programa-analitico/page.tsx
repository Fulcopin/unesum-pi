"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, Loader2, FileText, Lock, Unlock, ShieldAlert } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { FirmasPanel } from "@/components/firmas/firmas-panel"
import { PrintProgramaAnalitico } from "@/components/programa-analitico/print-programa-analitico"

// --- INTERFACES ---
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
interface ProgramaData {
  id?: string | number; 
  name?: string; 
  description?: string; 
  tabs: TabData[];
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
    if (isAutoSyncingPeriod.current) return  // ignorar re-render causado por auto-sync de periodo
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
        
        // Auto-sincronizar el selector de periodo con el periodo real del programa cargado
        const periodoCargado = comisionRes.data.periodo
        if (periodoCargado) {
          const matched = periodos.find((p: any) =>
            String(p.id) === String(periodoCargado) || p.nombre === periodoCargado
          )
          if (matched && String(matched.id) !== selectedPeriod) {
            isAutoSyncingPeriod.current = true
            setSelectedPeriod(String(matched.id))
            setPeriodoAutoSyncMsg(`Periodo ajustado a "${matched.nombre}" (periodo del programa subido para tu asignatura)`)
            setTimeout(() => { isAutoSyncingPeriod.current = false }, 200)
          } else {
            setPeriodoAutoSyncMsg(null)
          }
        }
      } else {
        setError("La comisión académica aún no ha subido un programa analítico para tu asignatura. Contacta a la comisión académica.")
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar programa analítico")
    } finally {
      setLoading(false)
    }
  }

  const processProgramaData = (datos: any) => {
    let parsed: ProgramaData

    // Convertir de formato antiguo "secciones" a "tabs" si es necesario
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

  // Auto-relleno de celdas
  const asignaturaNombreActual = asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || ''
  const periodoNombreActual = periodos.find((p: any) => String(p.id) === selectedPeriod)?.nombre || ''
  const nivelNombreActual = profesorInfo?.nivel?.nombre || ''
  const docenteNombreActual = profesorInfo ? `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim() : ''

  // ─── Convertir Nivel a Ordinal en Español ────────────────────────────────────
  const formatearNivelOrdinal = (val: string | number): string => {
    if (!val) return '';
    const originalVal = String(val).trim();
    const valStr = originalVal.toUpperCase();

    const ordinalsMap: Record<string, string> = {
      'PRIMERO': 'Primero',
      'SEGUNDO': 'Segundo',
      'TERCERO': 'Tercero',
      'CUARTO': 'Cuarto',
      'QUINTO': 'Quinto',
      'SEXTO': 'Sexto',
      'SÉPTIMO': 'Séptimo',
      'OCTAVO': 'Octavo',
      'NOVENO': 'Noveno',
      'DÉCIMO': 'Décimo',
      'PRIMER': 'Primer',
      'TERCER': 'Tercer',
      'DÉCIMO PRIMERO': 'Décimo Primero',
      'DÉCIMO SEGUNDO': 'Décimo Segundo'
    };

    const ordinalsList = Object.keys(ordinalsMap);
    if (ordinalsList.includes(valStr)) {
      return ordinalsMap[valStr];
    }

    const mapaOrdinales: Record<string, string> = {
      '1': 'Primero', '2': 'Segundo', '3': 'Tercero', '4': 'Cuarto', '5': 'Quinto',
      '6': 'Sexto', '7': 'Séptimo', '8': 'Octavo', '9': 'Noveno', '10': 'Décimo',
      '11': 'Décimo Primero', '12': 'Décimo Segundo'
    };

    const mapaAbreviaturas: Record<string, string> = {
      '1RO': 'Primero', '1RA': 'Primero', '1°': 'Primero', '1.º': 'Primero', '1ER': 'Primero', '1º': 'Primero',
      '2DO': 'Segundo', '2DA': 'Segundo', '2°': 'Segundo', '2.º': 'Segundo', '2º': 'Segundo',
      '3RO': 'Tercero', '3RA': 'Tercero', '3°': 'Tercero', '3.º': 'Tercero', '3º': 'Tercero', '3ER': 'Tercero',
      '4TO': 'Cuarto', '4TA': 'Cuarto', '4°': 'Cuarto', '4.º': 'Cuarto', '4º': 'Cuarto',
      '5TO': 'Quinto', '5TA': 'Quinto', '5°': 'Quinto', '5.º': 'Quinto', '5º': 'Quinto',
      '6TO': 'Sexto', '6TA': 'Sexto', '6°': 'Sexto', '6.º': 'Sexto', '6º': 'Sexto',
      '7MO': 'Séptimo', '7MA': 'Séptimo', '7°': 'Séptimo', '7.º': 'Séptimo', '7º': 'Séptimo',
      '8VO': 'Octavo', '8VA': 'Octavo', '8°': 'Octavo', '8.º': 'Octavo', '8º': 'Octavo',
      '9NO': 'Noveno', '9NA': 'Noveno', '9°': 'Noveno', '9.º': 'Noveno', '9º': 'Noveno',
      '10MO': 'Décimo', '10MA': 'Décimo', '10°': 'Décimo', '10.º': 'Décimo', '10º': 'Décimo'
    };

    if (mapaOrdinales[valStr]) {
      return mapaOrdinales[valStr];
    }

    const cleanVal = valStr.replace(/[\.\s]/g, '');
    if (mapaAbreviaturas[cleanVal]) {
      return mapaAbreviaturas[cleanVal];
    }

    for (const [num, word] of Object.entries(mapaOrdinales)) {
      const regex = new RegExp(`\\b${num}\\b|\\b${num}(?:do|er|ro|to|mo|vo|no|º|°|._º)\\b`, 'i');
      if (regex.test(valStr)) {
        return originalVal.replace(new RegExp(`\\b${num}\\b|\\b${num}(?:do|er|ro|to|mo|vo|no|º|°|._º)?\\b`, 'i'), word);
      }
    }

    return originalVal;
  };

  const getDisplayContent = (cells: TableCell[], idx: number): string => {
    const cell = cells[idx]
    if (idx > 0) {
      const prevLabel = (cells[idx - 1].content || '').toUpperCase().trim()
      if (prevLabel === 'NIVEL') {
        const val = cell.content?.trim() || nivelNombreActual
        return formatearNivelOrdinal(val)
      }
    }
    if (cell.content?.trim()) return cell.content
    if (idx === 0) return ''
    const prevLabel = (cells[idx - 1].content || '').toUpperCase().trim()
    if (prevLabel.includes('ASIGNATURA') && asignaturaNombreActual) return asignaturaNombreActual
    if ((prevLabel.includes('PERIODO') || prevLabel.includes('PAO')) && periodoNombreActual) return periodoNombreActual
    if (prevLabel === 'NIVEL' && nivelNombreActual) return formatearNivelOrdinal(nivelNombreActual)
    if (prevLabel === 'DOCENTE' && docenteNombreActual) return docenteNombreActual
    return ''
  }

  // Permisos del Docente para editar la celda
  const isCellEditable = (cell: TableCell): boolean => {
    if (cell.isLocked === true) return false; // Bloqueo estricto del Administrador
    if (cell.docenteEditable === true) return true;
    if (cell.docenteEditable === false) return false;
    return true; // Por defecto editable si no se especifica
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
      alert("¡Programa analítico guardado exitosamente!")
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente"]}>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(37, 99, 235, 0.04) 0%, transparent 50%)',
        }}
      >
        <MainHeader />

        <main className="max-w-[100rem] mx-auto px-4 sm:px-6 py-6">
          
          {/* Título y breadcrumb */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-800 mb-1 flex items-center gap-2">
                <FileText className="h-8 w-8 text-blue-600" />
                Editor de Programa Analítico
              </h1>
              <p className="text-blue-600/70">
                Docente: <strong className="text-blue-800 font-semibold">{profesorInfo ? `${profesorInfo.nombres} ${profesorInfo.apellidos}` : 'Cargando...'}</strong>
              </p>
            </div>
            <Link href="/dashboard/docente">
              <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Dashboard
              </Button>
            </Link>
          </div>

          {/* Versión guardada banner */}
          {hasDocenteVersion && (
            <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-center gap-2.5 shadow-sm">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse shrink-0"></span>
              <span>Estás editando tu versión guardada localmente de este programa analítico.</span>
            </div>
          )}

          {/* Sincronización automática de periodo */}
          {periodoAutoSyncMsg && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800 flex items-center gap-2 shadow-sm">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{periodoAutoSyncMsg}</span>
            </div>
          )}

          {/* Información del editor */}
          <div className="mb-6 p-3.5 bg-blue-50/40 border border-blue-100 rounded-xl text-sm text-blue-800 flex items-center gap-2.5 shadow-sm">
            <Unlock className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Haz doble clic en las celdas habilitadas para editarlas. Las celdas bloqueadas por la comisión aparecen con un candado gris.</span>
          </div>

          {/* Selector de Asignatura y Periodo */}
          <Card className="mb-6 border-t-4 border-t-blue-600 border-blue-100 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-blue-800 text-lg font-bold">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                  <span className="truncate">{programaData?.name || 'Programa Analítico'}</span>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 h-9" disabled={isSaving || !programaData}>
                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar Cambios</>}
                  </Button>
                  <PrintProgramaAnalitico
                    programaData={programaData}
                    asignaturaNombre={asignaturaNombreActual}
                    periodoNombre={periodoNombreActual}
                    nivelNombre={nivelNombreActual}
                    docenteNombre={docenteNombreActual}
                    programa_comision_id={programa_comision_id}
                    token={token || ''}
                    buttonLabel="Imprimir / PDF"
                    buttonClassName="h-9 text-sm px-3"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 border-t pt-4">
                {asignaturasDisponibles.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Asignatura</label>
                    <Select value={selectedAsignaturaId} onValueChange={setSelectedAsignaturaId}>
                      <SelectTrigger className="w-full bg-white border-slate-200"><SelectValue placeholder="Asignatura" /></SelectTrigger>
                      <SelectContent>
                        {asignaturasDisponibles.map((a: any) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.nombre} ({a.codigo})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Periodo Académico</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-full bg-white border-slate-200"><SelectValue placeholder="Periodo" /></SelectTrigger>
                    <SelectContent>
                      {periodos.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loader */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-blue-100 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <span className="mt-4 text-slate-600 font-medium">Cargando la estructura del programa analítico...</span>
            </div>
          )}

          {/* Errores */}
          {error && !loading && (
            <div className="p-12 text-center bg-white rounded-2xl border border-blue-100 shadow-sm max-w-2xl mx-auto">
              <p className="text-slate-600 text-base mb-6 font-medium">{error}</p>
              <Button onClick={loadPrograma} className="bg-blue-600 hover:bg-blue-700">Reintentar Carga</Button>
            </div>
          )}

          {/* Contenedor del Editor */}
          {!loading && !error && programaData && (
            <>
              {/* Pestañas (Secciones) idénticas a la comisión académica */}
              <div className="mb-4 select-none">
                <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-blue-100">
                  {programaData.tabs.map(tab => (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={`flex items-center h-10 px-4 rounded-md border cursor-pointer transition-all duration-200 ${
                        activeTabId === tab.id
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md font-medium'
                          : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      <span className="max-w-[200px] truncate" title={tab.title}>{tab.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla Renderizada con alineaciones y estilos oficiales */}
              {activeTab && (
                <Card className="border-blue-100 shadow-md">
                  <CardContent className="p-4">
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                      <table className="w-full border-collapse text-sm text-left">
                        <tbody className="divide-y divide-gray-200">
                          {tableData.length === 0 ? (
                            <tr>
                              <td className="p-12 text-center text-gray-500 italic">La tabla no tiene celdas o filas definidas.</td>
                            </tr>
                          ) : (
                            tableData.map((row) => {
                              const isFormRow = row.cells.length === 3 && row.cells[1].content.trim() === ':';

                              return (
                                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                  {row.cells.map((cell, index) => {
                                    if ((cell.rowSpan ?? 1) <= 0 || (cell.colSpan ?? 1) <= 0) return null;

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

                                    let justifyContent = 'justify-start';
                                    if (isHeader || isSeparator || isVertical) {
                                      justifyContent = 'justify-center';
                                    } else if (isFormRow && index === 2) {
                                      const labelUpper = (row.cells[0].content || '').toUpperCase().trim();
                                      if (labelUpper === 'NIVEL') justifyContent = 'justify-center';
                                    }

                                    const editable = isCellEditable(cell);

                                    return (
                                      <td
                                        key={cell.id}
                                        className={`
                                          border border-gray-200 
                                          relative transition-all duration-75 ease-in-out
                                          ${isHeader ? "bg-gray-50 font-semibold text-gray-900" : "bg-white text-gray-700"}
                                          ${editable ? "hover:bg-blue-50/40 cursor-cell" : "bg-slate-50/60 cursor-not-allowed opacity-80"}
                                        `}
                                        style={{
                                          backgroundColor: cell.backgroundColor || (isHeader ? '#f9fafb' : editable ? '#ffffff' : '#f8fafc'),
                                          color: cell.textColor,
                                          width: widthStyle,
                                          minWidth: minWidthStyle,
                                          whiteSpace: isSeparator ? 'nowrap' : 'normal',
                                          padding: 0,
                                          height: '1px',
                                        }}
                                        rowSpan={cell.rowSpan || 1}
                                        colSpan={cell.colSpan || 1}
                                        onDoubleClick={() => {
                                          if (editable) {
                                            setModalCell({ id: cell.id, content: cell.content || '', isEditable: true });
                                            setEditContent(cell.content || '');
                                          }
                                        }}
                                      >
                                        <div
                                          className={`w-full h-full flex items-center ${justifyContent} p-2`}
                                          style={{
                                            writingMode: isVertical ? 'vertical-rl' : undefined,
                                            transform: isVertical ? 'rotate(180deg)' : undefined,
                                            minHeight: isVertical ? '120px' : 'auto',
                                            textAlign: (isFormRow && index === 2 && (row.cells[0].content || '').toUpperCase().trim() === 'NIVEL') ? 'center' : (isHeader ? 'center' : (cell.textAlign as any) || 'left'),
                                            fontSize: cell.fontSize || (isVertical ? '9px' : '11px'),
                                            fontWeight: cell.fontWeight || undefined,
                                          }}
                                        >
                                          <div className="whitespace-pre-wrap leading-normal break-words w-full">
                                            {getDisplayContent(row.cells, index) || <span className="opacity-0">.</span>}
                                          </div>

                                          {/* Candados flotantes en las celdas */}
                                          <div className="absolute top-1 right-1 opacity-20 hover:opacity-100 transition-opacity">
                                            {editable ? (
                                              <Unlock className="h-3 w-3 text-green-500" />
                                            ) : (
                                              <Lock className="h-3 w-3 text-slate-400" />
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    );
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalCell(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-800">Editar Celda</h3>
              </div>
              <div className="p-4">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[300px] p-3 text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setModalCell(null)}>Cerrar</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={saveModalEdit}>
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
