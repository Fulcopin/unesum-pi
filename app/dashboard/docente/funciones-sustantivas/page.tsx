"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Upload, Save, Merge, Trash2, Printer, ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import * as mammoth from "mammoth"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// --- INTERFACES DE DATOS ---
interface TableCell { id: string; content: string; isHeader: boolean; rowSpan: number; colSpan: number; isEditable: boolean; backgroundColor?: string; textColor?: string; fontSize?: string; fontWeight?: string; textAlign?: string; }
interface TableRow { id: string; cells: TableCell[]; }
interface SyllabusData { id: string | number; name: string; description: string; rows: TableRow[]; metadata: { subject: string; period: string; level: string; createdAt: string; updatedAt: string; }; }
interface SavedSyllabusRecord { id: number; nombre: string; periodo: string; materias: string; datos_syllabus: SyllabusData; created_at: string; updated_at: string; }

export default function EditorSyllabusPage() {
  // --- ESTADOS Y HOOKS ---
  const { token, getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [syllabi, setSyllabi] = useState<SyllabusData[]>([])
  const [activeSyllabusId, setActiveSyllabusId] = useState<string | number | null>(null)
  const [savedSyllabi, setSavedSyllabi] = useState<SavedSyllabusRecord[]>([])
  const [isListLoading, setIsListLoading] = useState(true)
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- DATOS DERIVADOS ---
  const activeSyllabus = syllabi.find((s) => s.id === activeSyllabusId)
  const tableData = activeSyllabus ? activeSyllabus.rows : []
  
  // --- EFECTO PARA CARGAR DATOS INICIALES ---
  useEffect(() => {
    const syllabusIdToLoad = searchParams.get('id');

    const fetchSyllabusById = async (id: string) => {
      setIsLoading(true);
      try {
        const result = await apiRequest(`/api/syllabi/${id}`);
        const record = result.data as SavedSyllabusRecord;
        const editorData = record.datos_syllabus;
        editorData.id = record.id;
        setSyllabi([editorData]);
        setActiveSyllabusId(editorData.id);
      } catch (error) {
        console.error("Error al cargar el syllabus para editar:", error);
        alert("No se pudo cargar el syllabus seleccionado.");
        router.push('/profesor/syllabus');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAllSyllabi = async () => {
      setIsListLoading(true);
      try {
        const result = await apiRequest("/api/syllabi");
        setSavedSyllabi(result.data);
      } catch (error) {
        console.error("Error al cargar la lista de syllabi:", error);
      } finally {
        setIsListLoading(false);
      }
    };

    if (syllabusIdToLoad) {
      fetchSyllabusById(syllabusIdToLoad);
    } else {
      fetchAllSyllabi();
    }
  }, [searchParams, router]);

  // --- LÓGICA DE COMUNICACIÓN CON EL BACKEND ---
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const fullUrl = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`
    const currentToken = token || getToken()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}`, ...options.headers }
    const response = await fetch(fullUrl, { ...options, headers })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Error en la petición al API.")
    return data
  }

  const handleSaveToDB = async () => {
    if (!activeSyllabus) return alert("No hay un syllabus activo para guardar.")
    setIsSaving(true)
    try {
      const payload = {
        nombre: activeSyllabus.name,
        periodo: activeSyllabus.metadata.period,
        materias: activeSyllabus.metadata.subject,
        datos_syllabus: activeSyllabus
      }
      const isUpdate = typeof activeSyllabus.id === "number"
      const endpoint = isUpdate ? `/api/syllabi/${activeSyllabus.id}` : "/api/syllabi"
      const method = isUpdate ? "PUT" : "POST"
      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedRecord = result.data as SavedSyllabusRecord;
      const savedUIData = savedRecord.datos_syllabus;
      savedUIData.id = savedRecord.id;
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
  
  // --- MANIPULACIÓN DEL ESTADO ---
  const updateSyllabus = (id: string | number, updates: Partial<SyllabusData>) => {
    setSyllabi(p => p.map(s => s.id === id ? { ...s, ...updates, metadata: { ...s.metadata, ...(updates.metadata || {}), updatedAt: new Date().toISOString() } } : s))
  }

  const handleMetadataChange = (field: 'period' | 'subject' | 'level', value: string) => {
    if (!activeSyllabus) return;
    const updatedMetadata = { ...activeSyllabus.metadata, [field]: value };
    updateSyllabus(activeSyllabus.id, field === 'subject' ? { metadata: updatedMetadata, name: value } : { metadata: updatedMetadata });
  };

  const handleLoadSyllabus = (syllabusId: string) => {
    if (!syllabusId) return;
    const id = parseInt(syllabusId, 10);
    const syllabusToLoad = savedSyllabi.find(s => s.id === id);
    if (syllabusToLoad) {
      const editorData = syllabusToLoad.datos_syllabus;
      editorData.id = syllabusToLoad.id;
      setSyllabi([editorData]);
      setActiveSyllabusId(editorData.id);
    }
  };

  // --- LÓGICA DE IMPORTACIÓN DE SYLLABUS ---
  const handleSyllabusUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith(".docx")) return alert("Por favor, sube un archivo de Word (.docx).");
    setIsLoading(true);
    try {
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const doc = new DOMParser().parseFromString(html, "text/html");
      const findValue = (k: string) => Array.from(doc.querySelectorAll("p, td, th")).find(n => n.textContent?.includes(k))?.textContent?.split(k)[1]?.trim().replace(":", "").trim() || "";
      const meta = { subject: findValue("Nombre de la asignatura"), period: findValue("Periodo académico ordinario (PAO)"), level: findValue("Nivel") };
      const tables = Array.from(doc.querySelectorAll("table"));
      if (tables.length === 0) return alert("No se encontraron tablas en el documento.");
      const rows: TableRow[] = tables.flatMap(t => Array.from(t.querySelectorAll("tr")).map((tr, rIdx) => ({ id: `row-${rIdx}-${Date.now()}`, cells: Array.from(tr.querySelectorAll("td, th")).map((td, cIdx) => ({ id: `cell-${rIdx}-${cIdx}-${Date.now()}`, content: td.textContent?.trim() || "", isHeader: td.tagName === "TH" || !!td.querySelector("strong, b"), rowSpan: parseInt(td.getAttribute("rowspan") || "1"), colSpan: parseInt(td.getAttribute("colspan") || "1"), isEditable: true })) })));
      const newData: SyllabusData = { id: `syllabus-${Date.now()}`, name: meta.subject || `Syllabus de ${file.name}`, description: "Syllabus importado", metadata: { ...meta, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, rows };
      setSyllabi([newData]);
      setActiveSyllabusId(newData.id);
    } catch (e) {
      console.error("Error al procesar el archivo:", e);
      alert("Ocurrió un error al procesar el Syllabus.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // --- LÓGICA DE EDICIÓN DE CELDAS Y TABLA ---
  const findCellPosition = (cellId: string): { rowIndex: number; colIndex: number } | null => {
    if (!tableData) return null;
    for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
      const colIndex = tableData[rowIndex].cells.findIndex((cell) => cell.id === cellId);
      if (colIndex !== -1) return { rowIndex, colIndex };
    }
    return null;
  };

  const startEditing = (id: string, content: string) => {
    setEditingCell(id);
    setEditContent(content);
  };

  const saveEdit = () => {
    if (editingCell && activeSyllabus) {
      const updatedRows = tableData.map(row => ({
        ...row,
        cells: row.cells.map(cell => (cell.id === editingCell ? { ...cell, content: editContent } : cell))
      }));
      updateSyllabus(activeSyllabus.id, { rows: updatedRows });
      setEditingCell(null);
      setEditContent("");
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditContent("");
  };

  const handleCellClick = (id: string, e: React.MouseEvent) => {
    e.ctrlKey || e.metaKey
      ? setSelectedCells(p => (p.includes(id) ? p.filter(i => i !== id) : [...p, id]))
      : setSelectedCells([id]);
  };

  const addRowAt = (idx: number) => {
    if (!activeSyllabus || !tableData || tableData.length === 0) return;
    const rId = `r-${Date.now()}`;
    const nCols = tableData[0].cells.reduce((a, c) => a + c.colSpan, 0);
    const nR: TableRow = { id: rId, cells: Array.from({ length: nCols }, (_, i) => ({ id: `c-${rId}-${i}`, content: "", isHeader: false, rowSpan: 1, colSpan: 1, isEditable: true })) };
    const nRows = [...tableData];
    nRows.splice(idx, 0, nR);
    updateSyllabus(activeSyllabus.id, { rows: nRows });
  };

  const addColumnAt = (idx: number) => {
    if (!activeSyllabus) return;
    const updatedRows = tableData.map(r => {
      const nC: TableCell = { id: `c-${r.id}-${Date.now()}`, content: "", isHeader: false, rowSpan: 1, colSpan: 1, isEditable: true };
      const nCells = [...r.cells];
      nCells.splice(idx, 0, nC);
      return { ...r, cells: nCells };
    });
    updateSyllabus(activeSyllabus.id, { rows: updatedRows });
  };

  const handleInsertRow = (direction: "above" | "below") => {
    if (selectedCells.length === 0) return alert("Por favor, selecciona una celda de referencia.");
    const pos = findCellPosition(selectedCells[0]);
    if (pos) {
      addRowAt(direction === "above" ? pos.rowIndex : pos.rowIndex + 1);
    }
  };

  const handleInsertColumn = (direction: "left" | "right") => {
    if (selectedCells.length === 0) return alert("Por favor, selecciona una celda de referencia.");
    const pos = findCellPosition(selectedCells[0]);
    if (pos) {
      addColumnAt(direction === "left" ? pos.colIndex : pos.colIndex + 1);
    }
  };

  const removeSelectedRow = () => {
    if (selectedCells.length === 0) return alert("Por favor, selecciona una celda en la fila a eliminar.");
    if (!activeSyllabus || tableData.length <= 1) return alert("No se puede eliminar la única fila.");
    const pos = findCellPosition(selectedCells[0]);
    if (pos) {
      const updatedRows = tableData.filter((_, i) => i !== pos.rowIndex);
      updateSyllabus(activeSyllabus.id, { rows: updatedRows });
      setSelectedCells([]);
    }
  };

  const removeSelectedColumn = () => {
    if (selectedCells.length === 0) return alert("Por favor, selecciona una celda en la columna a eliminar.");
    if (!activeSyllabus || (tableData.length > 0 && tableData[0].cells.length <= 1)) return alert("No se puede eliminar la única columna.");
    const pos = findCellPosition(selectedCells[0]);
    if (pos) {
      const updatedRows = tableData.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== pos.colIndex) }));
      updateSyllabus(activeSyllabus.id, { rows: updatedRows });
      setSelectedCells([]);
    }
  };

  const clearSelectedCells = () => {
    if (selectedCells.length === 0 || !activeSyllabus) return;
    const updatedRows = tableData.map(r => ({ ...r, cells: r.cells.map(c => (selectedCells.includes(c.id) ? { ...c, content: "" } : c)) }));
    updateSyllabus(activeSyllabus.id, { rows: updatedRows });
    setSelectedCells([]);
  };
  
  const mergeCells = () => {
    if (selectedCells.length < 2 || !activeSyllabus) {
      alert("Selecciona al menos dos celdas para combinar.");
      return;
    }

    let positionOfFirstCell: { rowIndex: number; colIndex: number } | null = null;
    let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
    let contentToMerge: string[] = [];

    // Itera para encontrar los límites y la primera celda
    for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
      for (let colIndex = 0; colIndex < tableData[rowIndex].cells.length; colIndex++) {
        const cell = tableData[rowIndex].cells[colIndex];
        if (selectedCells.includes(cell.id)) {
          if (!positionOfFirstCell) {
            positionOfFirstCell = { rowIndex, colIndex };
          }
          minRow = Math.min(minRow, rowIndex);
          maxRow = Math.max(maxRow, rowIndex + cell.rowSpan - 1);
          minCol = Math.min(minCol, colIndex);
          maxCol = Math.max(maxCol, colIndex + cell.colSpan - 1);
          if (cell.content) {
            contentToMerge.push(cell.content);
          }
        }
      }
    }

    // El bloque `if` ahora es a prueba de errores de TypeScript
    if (positionOfFirstCell) {
      // Al desestructurar aquí, TypeScript sabe que rowIndex y colIndex son números.
      const { rowIndex, colIndex } = positionOfFirstCell;
      const firstCellId = tableData[rowIndex].cells[colIndex].id;
      const newRowSpan = maxRow - minRow + 1;
      const newColSpan = maxCol - minCol + 1;

      const updatedRows = tableData.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => {
          if (cell.id === firstCellId) {
            return { ...cell, rowSpan: newRowSpan, colSpan: newColSpan, content: contentToMerge.join("\n") };
          }
          if (selectedCells.includes(cell.id)) {
            return { ...cell, rowSpan: 0, colSpan: 0 }; // Oculta las otras celdas
          }
          return cell;
        }),
      }));

      updateSyllabus(activeSyllabus.id, { rows: updatedRows });
      setSelectedCells([firstCellId]);
    } else {
      console.error("Error al combinar: No se pudo determinar la celda de inicio.");
      alert("Ocurrió un error al intentar combinar las celdas.");
    }
  };

  // --- LÓGICA DE IMPRESIÓN PDF ---
  const handlePrintToPdf = () => {
    if (!activeSyllabus) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(activeSyllabus.name, 14, 22);
    doc.setFontSize(11); doc.setTextColor(100);
    doc.text(`Asignatura: ${activeSyllabus.metadata.subject}`, 14, 30);
    doc.text(`Periodo: ${activeSyllabus.metadata.period}`, 14, 35);
    doc.text(`Nivel: ${activeSyllabus.metadata.level}`, 14, 40);
    const body = activeSyllabus.rows.map(r => r.cells.map(c => ({ content: c.content, rowSpan: c.rowSpan, colSpan: c.colSpan, _raw: c })));
    autoTable(doc, {
      body: body as any, startY: 50, theme: 'grid', columnStyles: { 0: { cellWidth: 60 } },
      didParseCell: d => {
        const c = (d.cell.raw as any)._raw as TableCell;
        if (c) {
          if (c.isHeader) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = '#F3F4F6'; }
          if (c.backgroundColor) d.cell.styles.fillColor = c.backgroundColor;
          const a = c.textAlign || 'left';
          if (['left', 'center', 'right', 'justify'].includes(a)) d.cell.styles.halign = a as any;
        }
      }
    });
    doc.save(`${activeSyllabus.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };
  
  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <ProtectedRoute allowedRoles={["administrador", "profesor"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Editor de Syllabus</h1>
            <p className="text-gray-600">Carga un documento .docx, selecciona uno existente o edita el syllabus cargado.</p>
          </div>

          {isLoading && (
            <Card className="text-center p-12">
              <p className="text-gray-500">Cargando syllabus para editar...</p>
            </Card>
          )}

          {!activeSyllabus && !isLoading && (
            <Card>
              <CardHeader>
                <CardTitle>Crear o Cargar un Syllabus</CardTitle>
                <CardDescription>
                  Para empezar, sube un archivo .docx o selecciona un syllabus que ya hayas guardado previamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
                <div className="text-center space-y-4 p-4 border rounded-lg">
                  <h2 className="text-xl font-semibold">Cargar Nuevo Syllabus</h2>
                  <Button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 w-full" disabled={isLoading}>
                    <Upload className="h-4 w-4 mr-2" /> Seleccionar Archivo .docx
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".docx" onChange={handleSyllabusUpload} className="hidden" />
                </div>
                <div className="text-center space-y-4 p-4 border rounded-lg">
                  <h2 className="text-xl font-semibold">Cargar uno Existente</h2>
                  {isListLoading ? (
                    <p className="text-gray-500">Cargando lista...</p>
                  ) : savedSyllabi.length > 0 ? (
                    <Select onValueChange={handleLoadSyllabus}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un syllabus guardado..." />
                      </SelectTrigger>
                      <SelectContent>
                        {savedSyllabi.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.nombre || `${s.materias} - ${s.periodo}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-gray-500">No hay syllabi guardados.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSyllabus && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-4 text-emerald-700">
                    <span className="truncate">{activeSyllabus.name}</span>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <Button onClick={() => router.push('/profesor/syllabus')} variant="outline" size="sm">
                         <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Mis Syllabus
                      </Button>
                      <Button onClick={handleSaveToDB} className="bg-blue-600 hover:bg-blue-700" size="sm" disabled={isSaving}>
                        {isSaving ? "Guardando..." : <><Save className="h-4 w-4 mr-2" /> Guardar</>}
                      </Button>
                      <Button onClick={handlePrintToPdf} variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" /> Imprimir
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="materia">Nombre de la Materia</Label>
                      <Input id="materia" placeholder="Ej: Programación Avanzada" value={activeSyllabus.metadata.subject} onChange={(e) => handleMetadataChange('subject', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="periodo">Periodo Académico</Label>
                      <Input id="periodo" placeholder="Ej: 2025-S1" value={activeSyllabus.metadata.period} onChange={(e) => handleMetadataChange('period', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2 mb-4 p-2 border rounded-md bg-gray-50">
                     <Button size="sm" onClick={() => handleInsertRow('above')} disabled={selectedCells.length === 0}><Plus className="h-4 w-4 mr-1" />Fila Arriba</Button>
                     <Button size="sm" onClick={() => handleInsertRow('below')} disabled={selectedCells.length === 0}><Plus className="h-4 w-4 mr-1" />Fila Abajo</Button>
                     <Button size="sm" onClick={() => handleInsertColumn('left')} disabled={selectedCells.length === 0}><Plus className="h-4 w-4 mr-1" />Col. Izq.</Button>
                     <Button size="sm" onClick={() => handleInsertColumn('right')} disabled={selectedCells.length === 0}><Plus className="h-4 w-4 mr-1" />Col. Der.</Button>
                     <Button size="sm" onClick={removeSelectedRow} variant="destructive" disabled={selectedCells.length === 0}><Minus className="h-4 w-4 mr-1" />Elim. Fila</Button>
                     <Button size="sm" onClick={removeSelectedColumn} variant="destructive" disabled={selectedCells.length === 0}><Minus className="h-4 w-4 mr-1" />Elim. Columna</Button>
                     <Button size="sm" onClick={clearSelectedCells} disabled={selectedCells.length === 0} variant="outline"><Trash2 className="h-4 w-4 mr-1" />Limpiar</Button>
                     <Button size="sm" onClick={mergeCells} disabled={selectedCells.length < 2} variant="outline"><Merge className="h-4 w-4 mr-1" />Combinar</Button>
                  </div>

                  <div className="overflow-x-auto border rounded-lg shadow-sm">
                    <table className="dynamic-table w-full border-collapse">
                      <tbody>
                        {tableData.map((row) => (
                          <tr key={row.id}>
                            {row.cells.map((cell) => {
                              if (cell.rowSpan === 0 || cell.colSpan === 0) return null;
                              return (
                                <td key={cell.id} className={`border p-2 relative align-top ${cell.isHeader ? "font-bold bg-gray-100" : "bg-white"} ${selectedCells.includes(cell.id) ? "ring-2 ring-emerald-500 z-10" : ""}`} style={{ backgroundColor: cell.backgroundColor, color: cell.textColor, textAlign: (cell.textAlign as any) || "left", }} rowSpan={cell.rowSpan || 1} colSpan={cell.colSpan || 1} onClick={(e) => handleCellClick(cell.id, e)} onDoubleClick={() => cell.isEditable && startEditing(cell.id, cell.content)}>
                                  {editingCell === cell.id ? (
                                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} autoFocus onBlur={saveEdit} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") { cancelEdit(); } }}/>
                                  ) : (
                                    <div className="min-h-[24px] whitespace-pre-wrap">{cell.content || <br />}</div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}