"use client"

import type React from "react"

import { useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileSpreadsheet, AlertTriangle, Download } from "lucide-react"

interface UnidadImportada {
  unidad: string
  resultado: string
}

export interface AsignaturaImportada {
  Código: string
  Asignatura: string
  Nivel: string
  "Unidad de Organización": string
  "Horas Docencia": string
  "Horas Práctica": string
  "Horas Autónoma": string
  "Horas Vinculación": string
  "Horas Práctica Preprofesional": string
  // Columnas opcionales para prerrequisitos y correquisitos
  Prerrequisito?: string
  Correquisito?: string
  prerrequisitos?: string[]
  correquisitos?: string[]
  unidades?: UnidadImportada[]
}

interface ExcelAsignaturasImportProps {
  open: boolean
  onClose: () => void
  onImport: (asignaturas: AsignaturaImportada[]) => Promise<void> | void
  onRequestTemplateRows?: () => Promise<Record<string, any>[]>
  codigoMalla?: string
  facultadId?: number
  carreraId?: number
  facultades?: Array<{ id: number; nombre: string }>
  carreras?: Array<{ id: number; nombre: string; facultad_id?: number }>
  facultadValue?: string
  carreraValue?: string
  onFacultadChange?: (value: string) => void
  onCarreraChange?: (value: string) => void
}

const REQUIRED_COLUMNS = [
  "Código",
  "Asignatura",
  "Nivel",
  "Unidad de Organización",
  "Horas Docencia",
  "Horas Práctica",
  "Horas Autónoma",
  "Horas Vinculación",
  "Horas Práctica Preprofesional",
] as const

// Columnas opcionales que se aceptan sin error de validación
const OPTIONAL_COLUMNS = ["Prerrequisito", "Correquisito"] as const

function pickFirstValue(record: Record<string, any>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = record[alias]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return ""
}

function normalizeRow(record: Record<string, any>): AsignaturaImportada {
  const codigo = pickFirstValue(record, ["Código"])
  const asignatura = pickFirstValue(record, ["Asignatura"])
  const nivel = pickFirstValue(record, ["Nivel"])
  const unidadOrganizacion = pickFirstValue(record, ["Unidad de Organización"])

  const horasDocencia = pickFirstValue(record, ["Horas Docencia"])
  const horasPractica = pickFirstValue(record, ["Horas Práctica"])
  const horasAutonoma = pickFirstValue(record, ["Horas Autónoma"])
  const horasVinculacion = pickFirstValue(record, ["Horas Vinculación"])
  const horasPreprofesional = pickFirstValue(record, ["Horas Práctica Preprofesional"])

  // Columnas opcionales: verificar si existen en el record usando acceso directo
  // NO usar pickFirstValue porque siempre retorna string (nunca undefined)
  // En su lugar, buscar si alguna variante del nombre de la columna existe en el record
  const prereqKey = ["Prerrequisito", "Prerrequisitos", "prerrequisito"].find((k) => k in record)
  const correqKey = ["Correquisito", "Correquisitos", "correquisito"].find((k) => k in record)

  return {
    Código: codigo,
    Asignatura: asignatura,
    Nivel: nivel,
    "Unidad de Organización": unidadOrganizacion,
    "Horas Docencia": horasDocencia,
    "Horas Práctica": horasPractica,
    "Horas Autónoma": horasAutonoma,
    "Horas Vinculación": horasVinculacion,
    "Horas Práctica Preprofesional": horasPreprofesional,
    // Solo incluir si la columna realmente existe en el Excel (clave presente en el record)
    ...(prereqKey !== undefined ? { Prerrequisito: String(record[prereqKey] ?? "").trim() } : {}),
    ...(correqKey !== undefined ? { Correquisito: String(record[correqKey] ?? "").trim() } : {}),
  }
}

export default function ExcelAsignaturasImport({
  open,
  onClose,
  onImport,
  onRequestTemplateRows,
  codigoMalla,
  facultadId,
  carreraId,
  facultades = [],
  carreras = [],
  facultadValue = "",
  carreraValue = "",
  onFacultadChange,
  onCarreraChange,
}: ExcelAsignaturasImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileName, setSelectedFileName] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [rows, setRows] = useState<AsignaturaImportada[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const facultadSeleccionadaNombre = useMemo(() => {
    if (!facultadValue) return ""
    return facultades.find((f) => f.id.toString() === facultadValue)?.nombre || ""
  }, [facultades, facultadValue])

  const carrerasFiltradas = useMemo(() => {
    if (!facultadValue) return []
    return carreras.filter((c) => c.facultad_id?.toString() === facultadValue)
  }, [carreras, facultadValue])

  const carreraSeleccionadaNombre = useMemo(() => {
    if (!carreraValue) return ""
    return carreras.find((c) => c.id.toString() === carreraValue)?.nombre || ""
  }, [carreras, carreraValue])

  const canImport = useMemo(() => {
    const hasAcademicContext = Boolean(facultadValue && carreraValue)
    return rows.length > 0 && !isParsing && !isImporting && hasAcademicContext
  }, [rows, isParsing, isImporting, facultadValue, carreraValue])

  const resetState = () => {
    setSelectedFileName("")
    setRows([])
    setErrors([])
    setIsParsing(false)
    setIsImporting(false)
    setIsDownloadingTemplate(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const getFallbackTemplateRows = () => [
      {
        Código: "",
        Asignatura: "",
        Nivel: "",
        "Unidad de Organización": "",
        "Horas Docencia": "",
        "Horas Práctica": "",
        "Horas Autónoma": "",
        "Horas Vinculación": "",
        "Horas Práctica Preprofesional": "",
      },
    ]

  const normalizeHeader = (value: unknown) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")

  const validateHeaders = (headers: string[]) => {
    const normalized = headers.map(normalizeHeader).filter(Boolean)
    const missing = REQUIRED_COLUMNS.filter((col) => !normalized.includes(col))
    // Ignorar columnas opcionales (Prerrequisito, Correquisito) al detectar extras
    const allAllowed = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as string[]
    const extras = normalized.filter((col) => !allAllowed.includes(col))
    // Para el orden, solo verificamos las columnas requeridas al inicio
    const requiredInOrder = normalized.filter((col) =>
      REQUIRED_COLUMNS.includes(col as (typeof REQUIRED_COLUMNS)[number])
    )
    const hasExactOrder =
      requiredInOrder.length === REQUIRED_COLUMNS.length &&
      REQUIRED_COLUMNS.every((col, index) => requiredInOrder[index] === col)
    return { missing, extras, hasExactOrder }
  }

  const sanitizeTemplateRows = (rawRows: Record<string, any>[]) => {
    if (!Array.isArray(rawRows) || rawRows.length === 0) return getFallbackTemplateRows()

    return rawRows.map((raw) => {
      const row: Record<string, any> = {}
      REQUIRED_COLUMNS.forEach((column) => {
        row[column] = raw?.[column] ?? ""
      })
      // Incluir columnas opcionales si existen en los datos
      OPTIONAL_COLUMNS.forEach((column) => {
        if (raw?.[column] !== undefined) {
          row[column] = raw[column] ?? ""
        }
      })
      return row
    })
  }

  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true)
    setErrors([])
    try {
      const dynamicRows = onRequestTemplateRows ? await onRequestTemplateRows() : []
      const templateRows = sanitizeTemplateRows(dynamicRows)

      // Determinar qué columnas opcionales están presentes en los datos
      const optionalPresent = OPTIONAL_COLUMNS.filter((col) =>
        templateRows.some((row) => row[col] !== undefined && row[col] !== "")
      )
      const allColumns = [...REQUIRED_COLUMNS, ...optionalPresent]

      const headerRow = allColumns
      const dataRows = templateRows.map((row) => allColumns.map((column) => row[column] ?? ""))
      const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
      worksheet["!cols"] = allColumns.map((col) => ({ wch: Math.max(16, col.length + 2) }))

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla")
      XLSX.writeFile(workbook, "plantilla_asignaturas.xlsx")
    } catch (error) {
      console.error("Error al descargar plantilla:", error)
      setErrors(["No se pudo generar la plantilla con los datos actuales. Intente nuevamente."])
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  const validateRows = (data: AsignaturaImportada[]): string[] => {
    const validationErrors: string[] = []

    if (data.length === 0) {
      validationErrors.push("No se encontraron filas válidas en el archivo.")
      return validationErrors
    }

    data.forEach((row, index) => {
      const rowNumber = index + 2
      if (!row.Código) validationErrors.push(`Fila ${rowNumber}: falta Código`)
      if (!row.Asignatura) validationErrors.push(`Fila ${rowNumber}: falta Asignatura`)
      if (!row.Nivel) validationErrors.push(`Fila ${rowNumber}: falta Nivel`)
      if (!row["Unidad de Organización"]) {
        validationErrors.push(`Fila ${rowNumber}: falta Unidad de Organización`)
      }
    })

    return validationErrors
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFileName(file.name)
    setIsParsing(true)
    setErrors([])

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const headerRows = XLSX.utils.sheet_to_json<any[]>(firstSheet, {
        header: 1,
        raw: false,
      })
      const headers = (headerRows[0] || []) as unknown[]
      const { missing, extras, hasExactOrder } = validateHeaders(headers.map((h) => String(h ?? "")))

      if (missing.length > 0 || extras.length > 0 || !hasExactOrder) {
        const erroresEstructura: string[] = []
        if (missing.length > 0) {
          erroresEstructura.push(`Faltan columnas: ${missing.join(", ")}`)
        }
        if (extras.length > 0) {
          erroresEstructura.push(`Columnas no permitidas: ${extras.join(", ")}`)
        }
        if (!hasExactOrder) {
          erroresEstructura.push(`Orden requerido: ${REQUIRED_COLUMNS.join(" | ")}`)
        }
        erroresEstructura.push("Use un Excel con la estructura exacta de la plantilla.")
        setErrors(erroresEstructura)
        setRows([])
        return
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
        defval: "",
        raw: false,
      })

      const mappedRows = rawRows
        .map(normalizeRow)
        .filter((row) =>
          REQUIRED_COLUMNS.some((col) => String(row[col]).trim() !== "")
        )

      const validationErrors = validateRows(mappedRows)
      if (validationErrors.length > 0) {
        setErrors(validationErrors.slice(0, 20))
      }

      setRows(mappedRows)
    } catch (error) {
      console.error("Error al procesar Excel:", error)
      setErrors(["No se pudo leer el archivo Excel. Verifique el formato e intente de nuevo."])
      setRows([])
    } finally {
      setIsParsing(false)
      if (event.target) {
        event.target.value = ""
      }
    }
  }

  const handleImport = async () => {
    if (!canImport) return

    setIsImporting(true)
    try {
      await onImport(rows)
      handleClose()
    } catch (error) {
      console.error("Error durante la importación:", error)
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error durante la importación. Revise el log e intente de nuevo."

      const messageLines = message
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean)

      setErrors(
        messageLines.length > 0
          ? messageLines
          : ["Ocurrió un error durante la importación. Revise el log e intente de nuevo."]
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleClose() : undefined)}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Carga Masiva de Asignaturas
          </DialogTitle>
          <DialogDescription>
            {codigoMalla
              ? `Malla: ${codigoMalla}${facultadSeleccionadaNombre ? ` | Facultad: ${facultadSeleccionadaNombre}` : facultadId ? ` | Facultad ID: ${facultadId}` : ""}${carreraSeleccionadaNombre ? ` | Carrera: ${carreraSeleccionadaNombre}` : carreraId ? ` | Carrera ID: ${carreraId}` : ""}`
              : "Seleccione Facultad y Carrera, luego cargue un archivo .xlsx o .xls."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Contexto académico */}
          <div className="rounded-lg border p-4 space-y-4 bg-white">
            <p className="text-sm font-semibold text-gray-700">Contexto académico para la carga</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Facultad</Label>
                <Select value={facultadValue} onValueChange={(value) => onFacultadChange?.(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione facultad" />
                  </SelectTrigger>
                  <SelectContent>
                    {facultades.map((fac) => (
                      <SelectItem key={fac.id} value={fac.id.toString()}>
                        {fac.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {facultades.length === 0 ? (
                  <p className="text-xs text-amber-700">No se encontraron facultades cargadas desde la base de datos.</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Carrera</Label>
                <Select
                  value={carreraValue}
                  onValueChange={(value) => onCarreraChange?.(value)}
                  disabled={!facultadValue || carrerasFiltradas.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!facultadValue ? "Seleccione facultad" : "Seleccione carrera"} />
                  </SelectTrigger>
                  <SelectContent>
                    {carrerasFiltradas.map((carr) => (
                      <SelectItem key={carr.id} value={carr.id.toString()}>
                        {carr.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {facultadValue && carrerasFiltradas.length === 0 ? (
                  <p className="text-xs text-amber-700">No se encontraron carreras para la facultad seleccionada.</p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Paso 1: Descargar plantilla */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700 mb-2">Paso 1 — Descargue la plantilla Excel</p>
            <p className="text-xs text-gray-500 mb-3">
              La plantilla incluye las columnas: <strong>{REQUIRED_COLUMNS.join(", ")}</strong>.
            </p>
            <button
              onClick={downloadTemplate}
              disabled={isDownloadingTemplate || !facultadValue || !carreraValue}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#00563F] text-white text-sm font-medium hover:bg-[#00563F]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloadingTemplate
                ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generando...</>
                : "⬇️ Descargar plantilla (.xlsx)"}
            </button>
            {(!facultadValue || !carreraValue) && (
              <p className="text-xs text-amber-600 mt-2">⚠️ Seleccione Facultad y Carrera arriba para poder descargar la plantilla.</p>
            )}
          </div>

          {/* Paso 2: Cargar archivo */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center space-y-3 bg-white">
            <p className="text-sm font-semibold text-gray-700 mb-1">Paso 2 — Cargue el archivo completado</p>
            <p className="text-xs text-gray-500 mb-4">Formatos aceptados: .xlsx, .xls</p>
            
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing || isImporting || !facultadValue || !carreraValue}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing ? "Procesando archivo..." : "Seleccionar archivo"}
            </button>
            {(!facultadValue || !carreraValue) && (
              <p className="text-xs text-amber-600 mt-2">⚠️ Seleccione Facultad y Carrera arriba antes de cargar el archivo.</p>
            )}
            {selectedFileName && <p className="text-xs text-[#00563F] font-medium mt-2">Archivo: {selectedFileName}</p>}
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {errors.map((error, idx) => (
                    <li key={`${error}-${idx}`}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Previsualización</p>
              <p className="text-sm text-muted-foreground">{rows.length} asignaturas detectadas.</p>
              <div className="max-h-56 overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Código</th>
                      <th className="text-left p-2">Asignatura</th>
                      <th className="text-left p-2">Nivel</th>
                      <th className="text-left p-2">Organización</th>
                      <th className="text-left p-2">H. Docencia</th>
                      <th className="text-left p-2">H. Práctica</th>
                      <th className="text-left p-2">H. Autónoma</th>
                      <th className="text-left p-2">H. Vinculación</th>
                      <th className="text-left p-2">H. Práctica Pre.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={`${row.Código}-${index}`} className="border-t">
                        <td className="p-2">{row.Código || "-"}</td>
                        <td className="p-2">{row.Asignatura || "-"}</td>
                        <td className="p-2">{row.Nivel || "-"}</td>
                        <td className="p-2">{row["Unidad de Organización"] || "-"}</td>
                        <td className="p-2">{row["Horas Docencia"] || "-"}</td>
                        <td className="p-2">{row["Horas Práctica"] || "-"}</td>
                        <td className="p-2">{row["Horas Autónoma"] || "-"}</td>
                        <td className="p-2">{row["Horas Vinculación"] || "-"}</td>
                        <td className="p-2">{row["Horas Práctica Preprofesional"] || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!canImport} className="bg-[#00563F] hover:bg-[#004832]">
            {isImporting ? "Importando..." : "Importar asignaturas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
