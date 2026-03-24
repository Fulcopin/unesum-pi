"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ArrowLeft, AlertCircle, CheckCircle, Trash2, Eye, Upload, FileText } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface Periodo {
  id: number
  nombre: string
  codigo: string
}

interface Asignatura {
  id: number
  nombre: string
  codigo: string
}

interface SyllabusExistente {
  id: number
  nombre: string
  materia: string
  asignatura_id: number
  fecha_creacion: string
}

export default function SubirSyllabusPage() {
  const { token, getToken } = useAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('')
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState<string>('')
  const [archivo, setArchivo] = useState<File | null>(null)
  
  const [syllabusExistente, setSyllabusExistente] = useState<SyllabusExistente | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchDatos()
  }, [])

  useEffect(() => {
    if (periodoSeleccionado && asignaturaSeleccionada) {
      verificarExistencia()
    } else {
      setSyllabusExistente(null)
    }
  }, [periodoSeleccionado, asignaturaSeleccionada])

  const fetchDatos = async () => {
    try {
      setLoading(true)
      const currentToken = token || getToken()

      const [periodosRes, asignaturasRes] = await Promise.all([
        fetch('http://localhost:4000/api/datos-academicos/periodos', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/asignaturas', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        })
      ])

      const [periodosData, asignaturasData] = await Promise.all([
        periodosRes.json(),
        asignaturasRes.json()
      ])

      setPeriodos(periodosData.data || [])
      setAsignaturas(asignaturasData.data || [])

    } catch (err) {
      console.error('Error al cargar datos:', err)
      setError('Error al cargar periodos y asignaturas')
    } finally {
      setLoading(false)
    }
  }

  const verificarExistencia = async () => {
    try {
      const currentToken = token || getToken()
      
      const response = await fetch(
        `http://localhost:4000/api/syllabi/verificar-existencia?periodo=${periodoSeleccionado}&asignatura_id=${asignaturaSeleccionada}`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        }
      )

      const data = await response.json()

      if (data.existe) {
        setSyllabusExistente(data.syllabus)
        setError(null)
      } else {
        setSyllabusExistente(null)
      }

    } catch (err) {
      console.error('Error al verificar existencia:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!archivo || !periodoSeleccionado || !asignaturaSeleccionada) {
      setError('Por favor seleccione periodo, materia y archivo')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const currentToken = token || getToken()
      const formData = new FormData()
      formData.append('file', archivo)
      formData.append('periodo', periodoSeleccionado)
      formData.append('asignatura_id', asignaturaSeleccionada)

      const response = await fetch('http://localhost:4000/api/syllabi/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        body: formData
      })

      const data = await response.json()

      if (response.status === 409) {
        // Duplicado
        setError(data.message)
        setSyllabusExistente(data.existente)
        return
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al subir syllabus')
      }

      setSuccess('✅ Syllabus subido exitosamente')
      setArchivo(null)
      
      // Redirigir a la lista después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard/docente/syllabus')
      }, 2000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir syllabus'
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleEliminar = async (syllabusId: number) => {
    if (!confirm('¿Está seguro de eliminar este syllabus? Luego podrá subir uno nuevo.')) {
      return
    }

    try {
      const currentToken = token || getToken()
      
      const response = await fetch(`http://localhost:4000/api/syllabi/${syllabusId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al eliminar')
      }

      setSuccess('✅ Syllabus eliminado. Ahora puede subir uno nuevo.')
      setSyllabusExistente(null)
      
      // Volver a verificar
      setTimeout(() => {
        verificarExistencia()
      }, 1000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar'
      setError(errorMessage)
      console.error('Error:', err)
    }
  }

  const asignaturaSeleccionadaObj = asignaturas.find(a => a.id.toString() === asignaturaSeleccionada)

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard/docente/syllabus">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Mis Syllabus
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#00563F] mb-2">Subir Nuevo Syllabus</h1>
            <p className="text-gray-600">Seleccione el periodo y materia para subir su syllabus</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-500 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Éxito</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>1. Seleccione Periodo y Materia</CardTitle>
              <CardDescription>
                Solo puede tener un syllabus por materia por periodo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selector de Periodo */}
              <div className="space-y-2">
                <Label htmlFor="periodo">Periodo Académico *</Label>
                <Select 
                  value={periodoSeleccionado} 
                  onValueChange={setPeriodoSeleccionado}
                  disabled={loading}
                >
                  <SelectTrigger id="periodo">
                    <SelectValue placeholder="Seleccione un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodos.map((periodo) => (
                      <SelectItem key={periodo.id} value={periodo.id.toString()}>
                        {periodo.nombre} {periodo.codigo && `(${periodo.codigo})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de Materia */}
              <div className="space-y-2">
                <Label htmlFor="asignatura">Asignatura/Materia *</Label>
                <Select 
                  value={asignaturaSeleccionada} 
                  onValueChange={setAsignaturaSeleccionada}
                  disabled={loading || !periodoSeleccionado}
                >
                  <SelectTrigger id="asignatura">
                    <SelectValue placeholder="Seleccione una asignatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {asignaturas.map((asignatura) => (
                      <SelectItem key={asignatura.id} value={asignatura.id.toString()}>
                        {asignatura.nombre} ({asignatura.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!periodoSeleccionado && (
                  <p className="text-sm text-gray-500">
                    Primero seleccione un periodo
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alerta si ya existe syllabus */}
          {syllabusExistente && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ya existe un syllabus</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  Ya existe un syllabus para <strong>{syllabusExistente.materia}</strong> en el 
                  periodo seleccionado.
                </p>
                <div className="bg-red-100 p-3 rounded text-sm">
                  <p><strong>Nombre:</strong> {syllabusExistente.nombre}</p>
                  <p><strong>Creado:</strong> {new Date(syllabusExistente.fecha_creacion).toLocaleDateString()}</p>
                </div>
                <p className="text-sm">
                  Solo puede tener <strong>un syllabus por materia por periodo</strong>. 
                  Si desea subir uno nuevo, debe eliminar el anterior.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleEliminar(syllabusExistente.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar para subir nuevo
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/dashboard/docente/syllabus`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver syllabus actual
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Formulario de subida (solo si no existe) */}
          {periodoSeleccionado && asignaturaSeleccionada && !syllabusExistente && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  2. Subir Archivo
                </CardTitle>
                <CardDescription>
                  {asignaturaSeleccionadaObj && (
                    <>
                      Subiendo syllabus para: <strong>{asignaturaSeleccionadaObj.nombre}</strong>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="archivo">Archivo (Excel o Word) *</Label>
                  <Input
                    id="archivo"
                    type="file"
                    accept=".xlsx,.xls,.docx,.doc"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {archivo && (
                    <p className="text-sm text-gray-600">
                      Archivo seleccionado: <strong>{archivo.name}</strong>
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={handleUpload}
                    disabled={!archivo || uploading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {uploading ? (
                      <>
                        <FileText className="h-4 w-4 mr-2 animate-pulse" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Subir Syllabus
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setArchivo(null)
                      setPeriodoSeleccionado('')
                      setAsignaturaSeleccionada('')
                    }}
                    disabled={uploading}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mensaje si no han seleccionado nada */}
          {(!periodoSeleccionado || !asignaturaSeleccionada) && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">
                  Seleccione un periodo y una materia para continuar
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
