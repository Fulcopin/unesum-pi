'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainHeader } from '@/components/layout/main-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Upload, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import axios from 'axios'

interface Periodo {
  id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

export default function ComisionExtractorSyllabusPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('')
  const [loadingPeriodos, setLoadingPeriodos] = useState(false)

  useEffect(() => {
    cargarPeriodos()
  }, [])

  const cargarPeriodos = async () => {
    try {
      setLoadingPeriodos(true)
      const response = await axios.get('http://localhost:4000/api/periodo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.success) {
        setPeriodos(response.data.data || [])
      }
    } catch (error: any) {
      console.error('Error al cargar periodos:', error)
      // No mostrar error al usuario, solo en consola
      // El usuario puede continuar sin seleccionar periodo
    } finally {
      setLoadingPeriodos(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArchivo(file)
      setResultado(null)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!archivo) {
      setError('Por favor selecciona un archivo')
      return
    }

    setLoading(true)
    setError(null)
    setResultado(null)

    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      if (periodoSeleccionado) {
        formData.append('periodo_id', periodoSeleccionado)
      }

      const response = await axios.post(
        'http://localhost:4000/api/syllabus-extraction/extraer-titulos',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      if (response.data.success) {
        setResultado(response.data.data)
        setError(null)
      } else {
        setError(response.data.message || 'Error al extraer títulos')
      }
    } catch (err: any) {
      console.error('Error en extracción:', err)
      setError(
        err.response?.data?.message || 
        err.response?.data?.error ||
        'Error al procesar el archivo'
      )
    } finally {
      setLoading(false)
    }
  }

  const irAOrganizar = () => {
    if (resultado?.session_id) {
      router.push(`/dashboard/comision/syllabus/organizar-pestanas?session=${resultado.session_id}`)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['comision', 'comision_academica']}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Extractor de Syllabus
            </h1>
            <p className="text-gray-600">
              Sube archivos Excel o Word para extraer los títulos del syllabus
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500 text-white">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Cargar Archivo</CardTitle>
                  <CardDescription>
                    Selecciona un archivo Excel (.xlsx, .xls) o Word (.docx) con el syllabus
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selector de Periodo */}
                {periodos.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="periodo">
                      Periodo Académico (Opcional)
                    </Label>
                    <Select
                      value={periodoSeleccionado}
                      onValueChange={setPeriodoSeleccionado}
                      disabled={loadingPeriodos}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un periodo académico" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem key={periodo.id} value={periodo.id.toString()}>
                            {periodo.nombre} ({periodo.estado})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Input de archivo */}
                <div className="space-y-2">
                  <Label htmlFor="archivo">
                    Archivo de Syllabus
                  </Label>
                  <Input
                    id="archivo"
                    type="file"
                    accept=".xlsx,.xls,.docx"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                  {archivo && (
                    <p className="text-sm text-gray-500">
                      Archivo seleccionado: {archivo.name}
                    </p>
                  )}
                </div>

                {/* Alerta de error */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Alerta de éxito */}
                {resultado && (
                  <Alert className="border-green-500 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      ✅ Extracción completada: {resultado.totalTitulos} títulos detectados
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botones */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={!archivo || loading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Extraer Títulos
                      </>
                    )}
                  </Button>

                  {resultado && (
                    <Button
                      type="button"
                      onClick={irAOrganizar}
                      variant="outline"
                      className="border-purple-500 text-purple-600 hover:bg-purple-50"
                    >
                      Organizar en Pestañas
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
