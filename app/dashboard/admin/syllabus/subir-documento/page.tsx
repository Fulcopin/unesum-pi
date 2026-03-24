"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle, Edit3 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SyllabusFormulario } from "@/components/syllabus/syllabus-formulario"

export default function SubirDocumentoSyllabusPage() {
  const router = useRouter()
  const { token, getToken } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [nombre, setNombre] = useState("")
  const [periodo, setPeriodo] = useState("")
  const [materias, setMaterias] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Verificar que sea un archivo Excel
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Por favor, seleccione un archivo Excel (.xlsx o .xls)')
        setFile(null)
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveFormData = async () => {
    if (!result?.id) return

    setIsSaving(true)
    setError(null)

    try {
      const currentToken = token || getToken()
      const response = await fetch(`http://localhost:4000/api/syllabi/${result.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datos_syllabus: {
            ...result,
            contenido: formData,
            fecha_actualizacion: new Date().toISOString()
          }
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar los datos')
      }

      alert('✅ Datos del syllabus guardados exitosamente')
      router.push(`/dashboard/admin/syllabus/${result.id}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar los datos'
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setNombre("")
    setPeriodo("")
    setMaterias("")
    setResult(null)
    setShowForm(false)
    setFormData({})
    setError(null)
    
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file || !nombre || !periodo || !materias) {
      setError('Por favor, complete todos los campos y seleccione un archivo')
      return
    }

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('nombre', nombre)
      formData.append('periodo', periodo)
      formData.append('materias', materias)

      const currentToken = token || getToken()
      const response = await fetch('http://localhost:4000/api/syllabi/upload-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al subir el documento')
      }

      setResult(data.data)
      
      // Inicializar formData con TODOS los campos extraídos
      const initialFormData: Record<string, string> = {}
      const todosTitulos = data.data.titulos || []
      todosTitulos.forEach((titulo: string) => {
        initialFormData[titulo] = ''
      })
      setFormData(initialFormData)
      setShowForm(true)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el documento'
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/admin/syllabus">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Syllabi
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#00563F]">Subir Documento de Syllabus</h1>
        <p className="text-muted-foreground mt-2">
          Sube un archivo Excel (.xlsx) y el sistema generará pestañas basadas en las hojas del documento.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Información del Syllabus
            </CardTitle>
            <CardDescription>
              Complete los datos básicos y seleccione el archivo Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Syllabus *</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Programación Web Avanzada"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodo">Periodo Académico *</Label>
                  <Input
                    id="periodo"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    placeholder="Ej: 2025-1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="materias">Materias (separadas por coma) *</Label>
                <Input
                  id="materias"
                  value={materias}
                  onChange={(e) => setMaterias(e.target.value)}
                  placeholder="Ej: Programación, Desarrollo Web, Javascript"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-input">Archivo Excel (.xlsx) *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-input"
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileChange}
                    required
                    className="flex-1"
                  />
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="h-4 w-4" />
                      <span>{file.name}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  El sistema extraerá los campos de cada hoja del archivo Excel
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#00563F] hover:bg-[#00563F]/90"
                disabled={isUploading || !file}
              >
                {isUploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                    Procesando archivo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir y Procesar Excel
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && !showForm && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                Archivo Excel Procesado Exitosamente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">ID del Syllabus</p>
                  <p className="text-lg font-semibold text-gray-900">{result.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Campos Extraídos</p>
                  <p className="text-lg font-semibold text-gray-900">{result.titulos_extraidos}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Campos Extraídos del Excel:</p>
                <div className="bg-white rounded-lg p-4 max-h-60 overflow-y-auto">
                  <ul className="space-y-1">
                    {result.titulos?.map((titulo: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#00563F] font-semibold">{index + 1}.</span>
                        <span className="text-gray-700">{titulo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setShowForm(true)}
                  className="flex-1 bg-[#00563F] hover:bg-[#00563F]/90"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Completar Formulario
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1"
                >
                  Subir Otro Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showForm && result && (
          <SyllabusFormulario 
            titulos={result.titulos || []} 
            camposPorSeccion={result.campos_por_seccion}
            formData={formData}
            onFormChange={handleFormChange}
            onSave={handleSaveFormData}
            onCancel={() => setShowForm(false)}
            onReset={resetForm}
            isSaving={isSaving}
            error={error}
            totalCampos={result.titulos_extraidos}
          />
        )}
      </div>
    </div>
  )
}
