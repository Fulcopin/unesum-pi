"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { FirmasPanel } from "@/components/firmas/firmas-panel"
import { PrintProgramaAnalitico } from "@/components/programa-analitico/print-programa-analitico"

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
      // 1. Primero buscar si el docente ya tiene una versiÃ³n guardada
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
      } catch (e) { /* No tiene versiÃ³n propia, buscar la de comisiÃ³n */ }

      // 2. Buscar programa de la comisión (el backend busca por asignatura+periodo y si no encuentra,
      //    retorna el más reciente para esa asignatura — con su período real incluido en la respuesta)
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
      setError(e.message || "Error al cargar programa analÃ­tico")
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
          title: sec.titulo || sec.title || `SecciÃ³n ${idx + 1}`,
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
      setError("Formato de programa analÃ­tico no reconocido")
      return
    }

    setProgramaData(parsed)
    if (parsed.tabs.length > 0 && !activeTabId) {
      setActiveTabId(parsed.tabs[0].id)
    }
  }

  const activeTab = programaData?.tabs.find(t => t.id === activeTabId)
  const tableData = activeTab?.rows || []

  // Valores para auto-rellenar celdas vacías en el editor (ASIGNATURA, PERIODO, NIVEL, DOCENTE)
  const asignaturaNombreActual = asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || ''
  const periodoNombreActual = periodos.find((p: any) => String(p.id) === selectedPeriod)?.nombre || ''
  const nivelNombreActual = profesorInfo?.nivel?.nombre || ''
  const docenteNombreActual = profesorInfo ? `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim() : ''

  const getDisplayContent = (cells: TableCell[], idx: number): string => {
    const cell = cells[idx]
    if (cell.content?.trim()) return cell.content
    if (idx === 0) return ''
    const prevLabel = (cells[idx - 1].content || '').toUpperCase().trim()
    if (prevLabel.includes('ASIGNATURA') && asignaturaNombreActual) return asignaturaNombreActual
    if ((prevLabel.includes('PERIODO') || prevLabel.includes('PAO')) && periodoNombreActual) return periodoNombreActual
    if (prevLabel === 'NIVEL' && nivelNombreActual) return nivelNombreActual
    if (prevLabel === 'DOCENTE' && docenteNombreActual) return docenteNombreActual
    return ''
  }

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
          nombre: programaData.name || 'Programa AnalÃ­tico Docente',
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
                    <> &mdash; {asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || 'Sin asignatura'}</>
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
              <PrintProgramaAnalitico
                programaData={programaData}
                asignaturaNombre={asignaturaNombreActual}
                periodoNombre={periodoNombreActual}
                nivelNombre={nivelNombreActual}
                docenteNombre={docenteNombreActual}
                programa_comision_id={programa_comision_id}
                token={token || ''}
                buttonLabel="Imprimir / PDF"
              />
            </div>
          </div>

          {hasDocenteVersion && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Estás editando tu versión guardada del programa analítico.
            </div>
          )}

          {periodoAutoSyncMsg && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
              ⚠️ {periodoAutoSyncMsg}
            </div>
          )}

          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            Haz doble clic en las celdas habilitadas para editarlas. Las celdas bloqueadas por la comisión aparecen en gris.
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-600">Cargando programa analÃ­tico...</span>
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
                        {tableData.length === 0 ? (
                          <tbody><tr><td className="p-12 text-center text-gray-500">La tabla está vacía.</td></tr></tbody>
                        ) : (() => {
                          // Separar filas de encabezado (sticky) y filas de cuerpo
                          const renderCell = (cell: TableCell, cellIndex: number, row: TableRow) => {
                            if ((cell.rowSpan ?? 1) <= 0 || (cell.colSpan ?? 1) <= 0) return null;
                            const isVertical = cell.textOrientation === 'vertical';
                            const editable = isCellEditable(cell);
                            return (
                              <td
                                key={cell.id}
                                className={`border relative align-top ${editable ? 'cursor-cell' : 'cursor-not-allowed'} ${
                                  cell.isHeader
                                    ? 'border-gray-400 bg-[#e8f0f8] font-bold text-gray-800'
                                    : editable
                                      ? 'border-gray-300 bg-white text-gray-700 hover:bg-blue-50/50'
                                      : 'border-gray-300 bg-gray-50 text-gray-500'
                                }`}
                                style={{ backgroundColor: cell.backgroundColor || undefined, padding: 0, minWidth: isVertical ? '28px' : '40px', minHeight: '28px' }}
                                rowSpan={cell.rowSpan}
                                colSpan={cell.colSpan}
                                onDoubleClick={() => {
                                  if (!editable) return;
                                  setModalCell({ id: cell.id, content: cell.content || '', isEditable: true });
                                  setEditContent(cell.content || '');
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
                                    minHeight: '24px',
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
                                      {getDisplayContent(row.cells, cellIndex) || <span className="opacity-0">.</span>}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          };

                          const isHeaderRow = (row: TableRow) =>
                            row.cells.some(c => c.isHeader && (c.rowSpan ?? 1) > 0 && (c.colSpan ?? 1) > 0);
                          const hasVisibleCells = (row: TableRow) =>
                            row.cells.some(c => (c.rowSpan ?? 1) > 0 && (c.colSpan ?? 1) > 0);

                          const theadRows = tableData.filter(r => isHeaderRow(r) && hasVisibleCells(r));
                          const tbodyRows = tableData.filter(r => !isHeaderRow(r) && hasVisibleCells(r));

                          return (
                            <>
                              {theadRows.length > 0 && (
                                <thead className="sticky top-0 z-10 shadow-sm">
                                  {theadRows.map((row) => (
                                    <tr key={row.id}>
                                      {row.cells.map((cell, cellIndex) => renderCell(cell, cellIndex, row))}
                                    </tr>
                                  ))}
                                </thead>
                              )}
                              <tbody>
                                {tbodyRows.length === 0 ? (
                                  <tr>
                                    <td colSpan={100} className="text-center text-gray-400 italic py-6 border border-gray-200 bg-gray-50">
                                      Sin filas de datos — la comisión no ha añadido contenido aún
                                    </td>
                                  </tr>
                                ) : (
                                  tbodyRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-blue-50/30">
                                      {row.cells.map((cell, cellIndex) => renderCell(cell, cellIndex, row))}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </>
                          );
                        })()}
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

        {/* Modal de ediciÃ³n */}
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
