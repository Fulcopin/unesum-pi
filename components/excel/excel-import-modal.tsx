"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download } from "lucide-react"

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: any[]) => void
  title: string
  expectedColumns: string[]
  sampleData?: Record<string, any>
  importType: "docentes" | "actividades" | "funciones"
}

export function ExcelImportModal({
  isOpen,
  onClose,
  onImport,
  title,
  expectedColumns,
  sampleData,
  importType,
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<"upload" | "preview" | "complete">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      processFile(selectedFile)
    }
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setErrors([])

    try {
      // Simulate file processing - in real implementation, use a library like xlsx
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock data based on import type
      let mockData: any[] = []

      if (importType === "docentes") {
        mockData = [
          {
            nombre: "Juan Carlos",
            apellido: "Pérez González",
            cedula: "1234567890",
            telefono: "0999999999",
            correo: "juan.perez@unesum.edu.ec",
            fechaNacimiento: "1980-05-15",
            direccion: "Av. Principal 123",
            facultad: "Ingeniería",
            carrera: "Ingeniería en Sistemas",
            estado: "activo",
          },
          {
            nombre: "María Elena",
            apellido: "García Rodríguez",
            cedula: "0987654321",
            telefono: "0988888888",
            correo: "maria.garcia@unesum.edu.ec",
            fechaNacimiento: "1975-08-22",
            direccion: "Calle Secundaria 456",
            facultad: "Ciencias de la Salud",
            carrera: "Medicina",
            estado: "activo",
          },
        ]
      } else if (importType === "actividades") {
        mockData = [
          {
            codigo: "ACT005",
            nombre: "Seminario de Investigación",
            funcionSustantiva: "Investigación",
            descripcion: "Seminario sobre metodología de investigación",
            estado: "activo",
          },
          {
            codigo: "ACT006",
            nombre: "Taller de Emprendimiento",
            funcionSustantiva: "Vinculación con la Sociedad",
            descripcion: "Taller para fomentar el emprendimiento estudiantil",
            estado: "activo",
          },
        ]
      } else if (importType === "funciones") {
        mockData = [
          {
            codigo: "FS004",
            nombre: "Gestión Académica",
            descripcion: "Actividades de gestión y administración académica",
            estado: "activo",
          },
          {
            codigo: "FS005",
            nombre: "Desarrollo Institucional",
            descripcion: "Actividades para el desarrollo institucional",
            estado: "activo",
          },
        ]
      }

      // Validate data
      const validationErrors = validateData(mockData)
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
      }

      setPreviewData(mockData)
      setStep("preview")
    } catch (error) {
      setErrors(["Error al procesar el archivo. Verifique que sea un archivo Excel válido."])
    } finally {
      setIsProcessing(false)
    }
  }

  const validateData = (data: any[]): string[] => {
    const errors: string[] = []

    if (data.length === 0) {
      errors.push("El archivo está vacío o no contiene datos válidos.")
      return errors
    }

    // Check required columns
    const firstRow = data[0]
    const missingColumns = expectedColumns.filter((col) => !(col in firstRow))

    if (missingColumns.length > 0) {
      errors.push(`Columnas faltantes: ${missingColumns.join(", ")}`)
    }

    // Validate specific data based on type
    if (importType === "docentes") {
      data.forEach((row, index) => {
        if (!row.cedula || row.cedula.length !== 10) {
          errors.push(`Fila ${index + 1}: Cédula inválida`)
        }
        if (!row.correo || !row.correo.includes("@")) {
          errors.push(`Fila ${index + 1}: Correo inválido`)
        }
      })
    }

    return errors
  }

  const handleImport = () => {
    if (errors.length === 0) {
      onImport(previewData)
      setStep("complete")
      setTimeout(() => {
        handleClose()
      }, 2000)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewData([])
    setErrors([])
    setStep("upload")
    onClose()
  }

  const downloadTemplate = () => {
    // In real implementation, generate and download Excel template
    alert("Descargando plantilla Excel...")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>Importar datos desde archivo Excel (.xlsx, .xls)</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "upload" && (
            <>
              {/* Template Download */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Plantilla de Excel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        Descarga la plantilla con el formato correcto para importar datos.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Columnas requeridas: {expectedColumns.join(", ")}</p>
                    </div>
                    <Button onClick={downloadTemplate} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Plantilla
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Seleccionar Archivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                        <p className="text-xs text-gray-500">Formatos soportados: .xlsx, .xls (máximo 10MB)</p>
                      </div>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="mt-4"
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Procesando..." : "Seleccionar Archivo"}
                      </Button>
                    </div>

                    {file && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sample Data */}
              {sampleData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ejemplo de Datos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs bg-gray-50 p-3 rounded-lg">
                      <pre>{JSON.stringify(sampleData, null, 2)}</pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {step === "preview" && (
            <>
              {/* Validation Results */}
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Se encontraron errores en los datos:</p>
                      <ul className="list-disc list-inside text-sm">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Data Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Vista Previa de Datos ({previewData.length} registros)</span>
                    <Badge variant={errors.length > 0 ? "destructive" : "default"}>
                      {errors.length > 0 ? "Con Errores" : "Válido"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {expectedColumns.map((column) => (
                            <TableHead key={column} className="font-semibold">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            {expectedColumns.map((column) => (
                              <TableCell key={column} className="text-sm">
                                {row[column] || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {previewData.length > 10 && (
                      <p className="text-sm text-gray-500 text-center mt-2">
                        Mostrando 10 de {previewData.length} registros
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button onClick={() => setStep("upload")} variant="outline">
                  Volver
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={errors.length > 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Importar Datos
                </Button>
              </div>
            </>
          )}

          {step === "complete" && (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Importación Completada</h3>
                <p className="text-gray-600">Se importaron {previewData.length} registros exitosamente.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
