"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Minus, Download, Upload, Save, Edit3, Merge, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import * as mammoth from "mammoth"
import * as XLSX from "xlsx"

// --- INTERFACES DE DATOS ---
interface TableCell {
  id: string
  content: string
  isHeader: boolean
  rowSpan: number
  colSpan: number
  isEditable: boolean
  backgroundColor?: string
  textColor?: string
  fontSize?: string
  fontWeight?: string
  textAlign?: string
}

interface TableRow {
  id: string
  cells: TableCell[]
}

interface TableData {
  id: string | number // ID puede ser string (temporal) o number (de la BD)
  name: string
  description: string
  rows: TableRow[]
  metadata: {
    subject: string
    period: string
    level: string
    createdAt: string
    updatedAt: string
  }
}

// --- NUEVA INTERFAZ PARA EL VISADO ---
interface VisadoData {
  decano: string
  director: string
  coordinador: string
  docente: string
}

export default function EditorTablasPage() {
  // --- ESTADOS Y HOOKS ---
  const { token, getToken } = useAuth()
  const [tables, setTables] = useState<TableData[]>([])
  const [activeTableId, setActiveTableId] = useState<string | number | null>(null)
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [visadoData, setVisadoData] = useState<VisadoData | null>(null) // <-- NUEVO ESTADO PARA VISADO
  const fileInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)

  // --- DATOS DERIVADOS Y ESTILOS ---
  const activeTable = tables.find((t) => t.id === activeTableId)
  const tableData = activeTable ? activeTable.rows : []
  const cellStyles = {
    title: { fontSize: "18px", fontWeight: "bold", backgroundColor: "#f3f4f6" },
    subtitle: { fontSize: "16px", fontWeight: "bold" },
    normal: { fontSize: "14px", fontWeight: "normal", backgroundColor: "#ffffff", color: "#000000" },
  }

  // --- FUNCIONES AUXILIARES ---
  const findCellPosition = (cellId: string): { rowIndex: number; colIndex: number } | null => {
    if (!tableData) return null
    for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
      const colIndex = tableData[rowIndex].cells.findIndex((cell) => cell.id === cellId)
      if (colIndex !== -1) return { rowIndex, colIndex }
    }
    return null
  }

  // --- COMUNICACIÓN CON EL BACKEND ---
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
    const fullUrl = `${API_URL}${endpoint}`
    const currentToken = token || getToken()
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}`, ...options.headers }
    
    console.log('🔍 API Request:', { fullUrl, method: options.method || 'GET' })
    
    const response = await fetch(fullUrl, { ...options, headers })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Error en la petición al API.")
    return data
  }

  const fetchTables = async () => {
    setIsLoading(true)
    try {
      const result = await apiRequest("/programas-analiticos")
      if (result.data && result.data.length > 0) {
        const formattedTables = result.data.map((p: any) => p.datos_tabla)
        setTables(formattedTables)
        setActiveTableId(formattedTables[0].id)
      } else {
        createNewTable()
      }
    } catch (error: any) {
      console.error("Error fetching tables:", error)
      createNewTable()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchTables()
  }, [token])
  
  const handleSaveToDB = async () => {
    if (!activeTable) return alert("No hay tabla activa para guardar.")
    setIsSaving(true)
    try {
      const payload = { nombre: activeTable.name, datos_tabla: activeTable }
      const isUpdate = typeof activeTable.id === 'number'
      const endpoint = isUpdate ? `/programas-analiticos/${activeTable.id}` : '/programas-analiticos'
      const method = isUpdate ? 'PUT' : 'POST'

      console.log('💾 Guardando:', { endpoint, method, payload })

      const result = await apiRequest(endpoint, { method, body: JSON.stringify(payload) })
      const savedTableData = result.data.datos_tabla

      setTables(prevTables => prevTables.map(t => t.id === activeTableId ? savedTableData : t))
      setActiveTableId(savedTableData.id)
      alert('¡Programa guardado exitosamente!')
    } catch (error: any) {
      console.error("Error al guardar:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // --- MANIPULACIÓN DEL ESTADO DE LA TABLA ---
  const updateTable = (tableId: string | number, updates: Partial<TableData>) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? { ...table, ...updates, metadata: { ...table.metadata, ...updates.metadata, updatedAt: new Date().toISOString() } }
          : table,
      ),
    )
  }
  
  // --- LÓGICA DE EDICIÓN DE CELDAS ---
  const startEditing = (cellId: string, currentContent: string) => { setEditingCell(cellId); setEditContent(currentContent) }
  const saveEdit = () => {
    if (editingCell && activeTable) {
      const updatedRows = tableData.map((row) => ({ ...row, cells: row.cells.map((cell) => (cell.id === editingCell ? { ...cell, content: editContent } : cell)) }))
      updateTable(activeTable.id, { rows: updatedRows })
      setEditingCell(null); setEditContent("")
    }
  }
  const cancelEdit = () => { setEditingCell(null); setEditContent("") }

  // --- LÓGICA DE INSERCIÓN Y ELIMINACIÓN ---
  const addRowAt = (index: number) => {
    if (!activeTable || !tableData || tableData.length === 0) return
    const newRowId = `row-${Date.now()}`
    const newRow: TableRow = {
      id: newRowId,
      cells: tableData[0].cells.map((_, cellIndex) => ({
        id: `cell-${newRowId}-${cellIndex + 1}`, content: "", isHeader: false, rowSpan: 1, colSpan: 1, isEditable: true,
      })),
    }
    const newRows = [...tableData]; newRows.splice(index, 0, newRow)
    updateTable(activeTable.id, { rows: newRows })
  }

  const addColumnAt = (index: number) => {
    if (!activeTable || !tableData || tableData.length === 0) return
    const updatedRows = tableData.map((row, rowIndex) => {
      const newCell: TableCell = {
        id: `cell-${row.id}-${Date.now()}`, content: rowIndex === 0 ? "NUEVA COLUMNA" : "", isHeader: rowIndex === 0, rowSpan: 1, colSpan: 1, isEditable: true,
        ...(rowIndex === 0 && { backgroundColor: "#000000", textColor: "#ffffff", fontWeight: "bold", textAlign: "center" }),
      }
      const newCells = [...row.cells]; newCells.splice(index, 0, newCell)
      return { ...row, cells: newCells }
    })
    updateTable(activeTable.id, { rows: updatedRows })
  }

  const handleInsertRow = (direction: "above" | "below") => {
    if (selectedCells.length === 0) return alert("Por favor, selecciona una celda de referencia.")
    const position = findCellPosition(selectedCells[0])
    if (position) addRowAt(direction === "above" ? position.rowIndex : position.rowIndex + 1)
  }

  const handleInsertColumn = (direction: "left" | "right") => {
    if (selectedCells.length === 0) return alert("Por favor, selecciona una celda de referencia.")
    const position = findCellPosition(selectedCells[0])
    if (position) addColumnAt(direction === "left" ? position.colIndex : position.colIndex + 1)
  }

  // --- NUEVA LÓGICA DE ELIMINACIÓN POR SELECCIÓN ---
  const removeSelectedRow = () => {
    if (selectedCells.length === 0) return alert("Por favor, selecciona una celda en la fila que deseas eliminar.")
    if (!activeTable || tableData.length <= 1) return alert("No se puede eliminar la única fila.")
    const position = findCellPosition(selectedCells[0])
    if (position) {
      const newRows = [...tableData]; newRows.splice(position.rowIndex, 1)
      updateTable(activeTable.id, { rows: newRows }); setSelectedCells([])
    }
  }

  const removeSelectedColumn = () => {
    if (selectedCells.length === 0) return alert("Por favor, selecciona una celda en la columna que deseas eliminar.")
    if (!activeTable || (tableData.length > 0 && tableData[0].cells.length <= 1)) return alert("No se puede eliminar la única columna.")
    const position = findCellPosition(selectedCells[0])
    if (position) {
      const updatedRows = tableData.map((row) => {
        const newCells = [...row.cells]; newCells.splice(position.colIndex, 1)
        return { ...row, cells: newCells }
      })
      updateTable(activeTable.id, { rows: updatedRows }); setSelectedCells([])
    }
  }

  const clearSelectedCells = () => {
    if (selectedCells.length === 0 || !activeTable) return
    const updatedRows = tableData.map((row) => ({ ...row, cells: row.cells.map((cell) => (selectedCells.includes(cell.id) ? { ...cell, content: "" } : cell)) }))
    updateTable(activeTable.id, { rows: updatedRows }); setSelectedCells([])
  }

  // --- MERGE / SPLIT ---
    const mergeCells = () => {
    if (selectedCells.length < 2 || !activeTable) return;
    let firstCell: TableCell | null = null; let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
    tableData.forEach((row, rowIndex) => {
      row.cells.forEach((cell, colIndex) => {
        if (selectedCells.includes(cell.id)) {
          if (cell.id === selectedCells[0]) firstCell = cell;
          minRow = Math.min(minRow, rowIndex); maxRow = Math.max(maxRow, rowIndex);
          minCol = Math.min(minCol, colIndex); maxCol = Math.max(maxCol, colIndex);
        }
      });
    });
    if (firstCell) {
      const newRowSpan = maxRow - minRow + 1; const newColSpan = maxCol - minCol + 1;
      const updatedRows = tableData.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => {
          if (cell.id === firstCell!.id) return { ...cell, rowSpan: newRowSpan, colSpan: newColSpan };
          if (selectedCells.includes(cell.id) && cell.id !== firstCell!.id) return { ...cell, rowSpan: 0, colSpan: 0 };
          return cell;
        }),
      }));
      updateTable(activeTable.id, { rows: updatedRows }); setSelectedCells([]);
    }
  };

  const splitCell = (cellId: string) => {
    if(!activeTable) return;
    let cellToSplit: TableCell | null = null; let startRow = -1, startCol = -1;
    for (let rIndex = 0; rIndex < tableData.length; rIndex++) {
      const cIndex = tableData[rIndex].cells.findIndex((cell) => cell.id === cellId);
      if (cIndex !== -1) { cellToSplit = tableData[rIndex].cells[cIndex]; startRow = rIndex; startCol = cIndex; break; }
    }
    if (!cellToSplit || (cellToSplit.rowSpan <= 1 && cellToSplit.colSpan <= 1)) return;
    const { rowSpan: originalRowSpan, colSpan: originalColSpan } = cellToSplit;
    const updatedRows = tableData.map((row, rowIndex) => {
      if (rowIndex >= startRow && rowIndex < startRow + originalRowSpan) {
        return { ...row, cells: row.cells.map((cell) => {
            if (rowIndex >= startRow && rowIndex < startRow + originalRowSpan && cell.colSpan === 0) {
              return { ...cell, rowSpan: 1, colSpan: 1, isEditable: true };
            }
            if(cell.id === cellId) return { ...cell, rowSpan: 1, colSpan: 1 };
            return cell;
          })
        };
      }
      return row;
    });
    updateTable(activeTable.id, { rows: updatedRows }); setSelectedCells([]);
  };

  // --- MANEJO DE TABLAS (NUEVA, COMBINAR) ---
  const createNewTable = () => {
    const newTableId = `table-${Date.now()}`
    const newTable: TableData = {
      id: newTableId, name: `Nueva Tabla ${tables.length + 1}`, description: "Descripción",
      metadata: { subject: "Nueva Asignatura", period: "PI 2025", level: "Primero", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      rows: [
        { id: "row-1", cells: [{ id: "cell-1-1", content: "ENCABEZADO", isHeader: true, rowSpan: 1, colSpan: 1, isEditable: true, backgroundColor: "#000000", textColor: "#ffffff", fontWeight: "bold", textAlign: "center" }] },
        { id: "row-2", cells: [{ id: "cell-2-1", content: "", isHeader: false, rowSpan: 1, colSpan: 1, isEditable: true }] },
      ],
    }
    setTables((prev) => [...prev, newTable]); setActiveTableId(newTableId)
  }

  // --- IMPORTACIÓN INTELIGENTE ---
  const extractMetadataFromHtmlDoc = (doc: Document): Partial<TableData['metadata']> => {
  const metadata: Partial<TableData['metadata']> = {};
  const allTextNodes = Array.from(doc.querySelectorAll('p, td, th'));

  const findValueAfterKeyword = (keyword: string): string | undefined => { // <-- Cambiamos el tipo de retorno a string | undefined
    const keywordNode = allTextNodes.find(node => node.textContent?.includes(keyword));
    if (keywordNode) {
      const nextCell = keywordNode.nextElementSibling;
      if (nextCell) return nextCell.textContent?.trim() || undefined; // <-- CAMBIO AQUÍ
      
      const text = keywordNode.textContent || "";
      const value = text.split(keyword)[1]?.trim();
      return value || undefined; // <-- CAMBIO AQUÍ
    }
    return undefined; // <-- CAMBIO AQUÍ
  };
  
  metadata.subject = findValueAfterKeyword('Asignatura');
  metadata.period = findValueAfterKeyword('PERIODO ACADÉMICO ORDINARIO (PAO)');
  metadata.level = findValueAfterKeyword('NIVEL');

  return metadata;
};

  const htmlTableToTableData = (tableElement: HTMLTableElement, fileName: string): TableData => {
    const newRows: TableRow[] = [];
    tableElement.querySelectorAll("tr").forEach((tr, rowIndex) => {
        const newCells: TableCell[] = [];
        tr.querySelectorAll("td, th").forEach((td, cellIndex) => {
            newCells.push({
                id: `cell-${Date.now()}-${rowIndex}-${cellIndex}`, content: td.textContent || "", isHeader: td.tagName === "TH",
                rowSpan: parseInt(td.getAttribute("rowspan") || "1"), colSpan: parseInt(td.getAttribute("colspan") || "1"),
                isEditable: true, ...(td.querySelector("strong, b") && cellStyles.subtitle),
            });
        });
        newRows.push({ id: `row-${Date.now()}-${rowIndex}`, cells: newCells });
    });
    return {
        id: `table-file-${Date.now()}`, name: `Tabla de ${fileName}`, description: `Importada de ${fileName}`,
        metadata: { subject: "Importado", period: "PI 2025", level: "Importado", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        rows: newRows,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith(".docx")) return alert("Por favor, sube un archivo Word (.docx).");
    setIsLoading(true); setVisadoData(null);
    try {
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        const doc = new DOMParser().parseFromString(html, "text/html");
        const allTables = Array.from(doc.querySelectorAll("table"));
        const visadoTableElement = allTables.find(t => t.textContent?.toUpperCase().includes("DECANO/A"));
        if (visadoTableElement) {
            const dataRow = visadoTableElement.querySelectorAll("tr")[1];
            if (dataRow) {
                const dataCells = dataRow.querySelectorAll("td, th");
                setVisadoData({
                    decano: dataCells[0]?.textContent?.trim() || "N/A", director: dataCells[1]?.textContent?.trim() || "N/A",
                    coordinador: dataCells[2]?.textContent?.trim() || "N/A", docente: dataCells[3]?.textContent?.trim() || "N/A",
                });
            }
        }
        const mainTableElement = allTables.find(t => !t.textContent?.toUpperCase().includes("DECANO/A"));
        if (mainTableElement) {
            const newTable = htmlTableToTableData(mainTableElement, file.name);
            const extractedMetadata = extractMetadataFromHtmlDoc(doc);
            newTable.name = extractedMetadata.subject || newTable.name;
            newTable.metadata = { ...newTable.metadata, ...extractedMetadata };
            setTables((prev) => [...prev, newTable]);
            setActiveTableId(newTable.id);
            alert(`Programa "${newTable.name}" importado exitosamente.`);
        } else {
            alert("No se encontró la tabla principal en el archivo.");
        }
    } catch (error) {
        console.error("Error al procesar archivo:", error);
        alert("Ocurrió un error al procesar el archivo.");
    } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- FUNCIÓN PARA IMPORTAR DESDE EXCEL ---
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExcelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validExcelTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx)$/)) {
      return alert("Por favor, sube un archivo Excel (.xls o .xlsx).");
    }

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a HTML para procesar la tabla
      const html = XLSX.utils.sheet_to_html(worksheet);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const tableElement = doc.querySelector("table");
      
      if (tableElement) {
        const newTable = htmlTableToTableData(tableElement, file.name);
        newTable.name = `Programa Analítico Excel - ${file.name}`;
        newTable.metadata = {
          subject: "Importado desde Excel",
          period: "PI 2025",
          level: "Por definir",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setTables((prev) => [...prev, newTable]);
        setActiveTableId(newTable.id);
        alert(`Programa "${newTable.name}" importado exitosamente desde Excel.`);
      } else {
        alert("No se pudo procesar el archivo Excel.");
      }
    } catch (error) {
      console.error("Error al procesar Excel:", error);
      alert("Ocurrió un error al procesar el archivo Excel.");
    } finally {
      setIsLoading(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  // --- UI INTERACTION ---
  const handleCellClick = (cellId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      setSelectedCells((prev) => (prev.includes(cellId) ? prev.filter((id) => id !== cellId) : [...prev, cellId]))
    } else {
      setSelectedCells([cellId])
    }
  }

  const applyCellStyle = (style: string) => {
    if (selectedCells.length === 0 || !activeTable) return
    const newStyle = cellStyles[style as keyof typeof cellStyles]
    if (!newStyle) return
    const updatedRows = tableData.map((row) => ({ ...row, cells: row.cells.map((cell) => (selectedCells.includes(cell.id) ? { ...cell, ...newStyle } : cell)) }))
    updateTable(activeTable.id, { rows: updatedRows })
  }

  // --- RENDERIZADO CONDICIONAL ---
  if (isLoading && tables.length === 0) {
    return <div className="flex h-screen items-center justify-center text-xl">Cargando Editor...</div>
  }
  
  if (!activeTable) {
    return (
       <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8 text-center">
            <h1 className="text-2xl mb-4">No hay programas analíticos.</h1>
            <Button onClick={createNewTable} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Crear tu primer programa
            </Button>
        </main>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* ... Títulos y Header de la página ... */}
           <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Editor de Tablas Dinámicas</h1>
            <p className="text-gray-600">
              Crea y edita programas analíticos con tablas dinámicas - Almacenamiento JSONB
            </p>
          </div>
          <div className="bg-emerald-600 text-white text-center py-4 mb-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold">UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ</h2>
            <p className="text-emerald-100 mt-1">Sistema de Gestión Académica - Editor de Tablas</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-emerald-700">
                <span>Gestión de Tablas</span>
                <Button onClick={createNewTable} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Tabla
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <Select value={activeTableId?.toString()} onValueChange={(value) => setActiveTableId(value)}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar tabla" /></SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (<SelectItem key={table.id} value={table.id.toString()}>{table.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
                <h4 className="font-semibold text-emerald-800">Información de la Tabla:</h4>
                <p className="text-sm text-emerald-700">
                  <strong>Asignatura:</strong> {activeTable.metadata.subject} |<strong> Período:</strong> {activeTable.metadata.period} |<strong> Nivel:</strong> {activeTable.metadata.level}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Última actualización: {new Date(activeTable.metadata.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Edit3 className="h-5 w-5" />{activeTable.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                <Button onClick={() => handleInsertRow('above')} disabled={selectedCells.length === 0}><Plus className="h-4 w-4 mr-2" />Fila Arriba</Button>
                <Button onClick={() => handleInsertRow('below')} disabled={selectedCells.length === 0}><Plus className="h-4 w-4 mr-2" />Fila Abajo</Button>
                <Button onClick={() => handleInsertColumn('left')} disabled={selectedCells.length === 0}><Plus className="h-4 w-4 mr-2" />Col. Izquierda</Button>
                <Button onClick={() => handleInsertColumn('right')} disabled={selectedCells.length === 0}><Plus className="h-4 w-4 mr-2" />Col. Derecha</Button>
                <Button onClick={removeSelectedRow} variant="outline" className="text-red-600"><Minus className="h-4 w-4 mr-2" />Eliminar Fila</Button>
                <Button onClick={removeSelectedColumn} variant="outline" className="text-red-600"><Minus className="h-4 w-4 mr-2" />Eliminar Columna</Button>
                <Button onClick={clearSelectedCells} disabled={selectedCells.length === 0} variant="outline" className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Limpiar Celdas</Button>
                <Button onClick={mergeCells} disabled={selectedCells.length < 2} variant="outline"><Merge className="h-4 w-4 mr-2" />Combinar</Button>
                <Button onClick={() => { if (selectedCells.length === 1) splitCell(selectedCells[0])}} disabled={selectedCells.length !== 1} variant="outline"><div className="h-4 w-4 mr-2 border border-current" />Dividir</Button>
                <Button onClick={handleSaveToDB} className="bg-blue-600 hover:bg-blue-700" disabled={isSaving}>{isSaving ? 'Guardando...' : <><Save className="h-4 w-4 mr-2" />Guardar</>}</Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="text-blue-600" disabled={isLoading}>{isLoading ? 'Procesando...' : <><Upload className="h-4 w-4 mr-2" />Importar Word</>}</Button>
                <Button onClick={() => excelInputRef.current?.click()} variant="outline" className="text-emerald-600" disabled={isLoading}>{isLoading ? 'Procesando...' : <><Upload className="h-4 w-4 mr-2" />Importar Excel</>}</Button>
                <Select onValueChange={applyCellStyle}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Estilo de Texto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Texto Normal</SelectItem>
                    <SelectItem value="title">Título</SelectItem>
                    <SelectItem value="subtitle">Subtítulo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <input ref={fileInputRef} type="file" accept=".docx" onChange={handleFileUpload} className="hidden" />
              <input ref={excelInputRef} type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleExcelUpload} className="hidden" />
              <div className="overflow-x-auto border rounded-lg shadow-sm">
                <table className="dynamic-table w-full border-collapse">
                  <tbody>
                    {tableData.map((row) => (
                      <tr key={row.id}>
                        {row.cells.map((cell) => {
                          if (cell.rowSpan === 0 || cell.colSpan === 0) return null;
                          return (
                            <td
                              key={cell.id}
                              className={`border p-3 ${selectedCells.includes(cell.id) ? "ring-2 ring-emerald-500" : ""}`}
                              style={{
                                backgroundColor: cell.backgroundColor || (cell.isHeader ? "#000" : "#fff"),
                                color: cell.textColor || (cell.isHeader ? "#fff" : "#000"),
                                fontWeight: cell.fontWeight || "normal", 
                                textAlign: (cell.textAlign as any) || "left",
                                fontSize: cell.fontSize || "14px",
                              }}
                              rowSpan={cell.rowSpan || 1}
                              colSpan={cell.colSpan || 1}
                              onClick={(e) => handleCellClick(cell.id, e)}
                              onDoubleClick={() => startEditing(cell.id, cell.content)}
                            >
                              {editingCell === cell.id ? (
                                <div>
                                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} autoFocus onBlur={saveEdit} onKeyDown={(e) => {if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }}}/>
                                  <div className="flex gap-2 mt-2">
                                    <Button size="sm" onClick={saveEdit}><Save className="h-3 w-3 mr-1" />Guardar</Button>
                                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancelar</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="min-h-[40px] flex items-center">{cell.content || ""}</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {visadoData && (
            <Card className="mt-8">
              <CardHeader><CardTitle className="text-emerald-700">Visado</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 font-semibold">DECANO/A DE FACULTAD</th>
                        <th className="px-4 py-2 font-semibold">DIRECTOR/A ACADÉMICO/A</th>
                        <th className="px-4 py-2 font-semibold">COORDINADOR/A DE CARRERA</th>
                        <th className="px-4 py-2 font-semibold">DOCENTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-4 py-2">{visadoData.decano}</td>
                        <td className="px-4 py-2">{visadoData.director}</td>
                        <td className="px-4 py-2">{visadoData.coordinador}</td>
                        <td className="px-4 py-2">{visadoData.docente}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </main>
      </div>
    </ProtectedRoute>
  )
}