"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileSpreadsheet, 
  Eye,
  Trash2,
  Calendar
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export default function ComisionAcademicaPage() {
  const router = useRouter()
  const { token, getToken } = useAuth()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para Periodos
  const [periodos, setPeriodos] = useState<any[]>([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('')
  
  // Lista de syllabus
  const [syllabusList, setSyllabusList] = useState<any[]>([])
  const [syllabusSeleccionado, setSyllabusSeleccionado] = useState<any>(null)
  const [vistaActual, setVistaActual] = useState<'upload' | 'lista' | 'detalle'>('upload')

  useEffect(() => {
    if (token) {
      cargarPeriodos()
      cargarSyllabusList()
    }
  }, [token])

  const cargarPeriodos = async () => {
    try {
      const currentToken = token || getToken()
      const response = await axios.get(`${API_URL}/periodo`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      })
      if (response.data.success) {
        setPeriodos(response.data.data || [])
      }
    } catch (err) {
      console.error('Error cargando periodos:', err)
    }
  }

  const cargarSyllabusList = async () => {
    try {
      const currentToken = token || getToken()
      const response = await axios.get(`${API_URL}/comision-academica/syllabus`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      })
      if (response.data.success) {
        setSyllabusList(response.data.data || [])
      }
    } catch (err) {
      console.error('Error cargando syllabus:', err)
    }
  }

  const manejarCambioArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validFormats = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ]
      
      if (validFormats.includes(file.type) || /\.(xlsx|xls)$/i.test(file.name)) {
        setArchivo(file)
        setError(null)
      } else {
        setError('Formato de archivo inválido. Use Excel (.xlsx, .xls)')
        setArchivo(null)
      }
    }
  }

  const procesarSyllabus = async () => {
    if (!archivo) {
      setError('Por favor seleccione un archivo')
      return
    }

    if (!periodoSeleccionado) {
      setError('Por favor seleccione un periodo académico')
      return
    }

    setCargando(true)
    setError(null)
    setResultado(null)

    try {
      const periodoObj = periodos.find(p => p.id.toString() === periodoSeleccionado)
      const formData = new FormData()
      formData.append('archivo', archivo)
      formData.append('periodo_academico', periodoObj?.nombre || '')
      formData.append('periodo_id', periodoSeleccionado)

      const currentToken = token || getToken()
      const response = await axios.post(
        `${API_URL}/comision-academica/procesar-syllabus`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${currentToken}`
          }
        }
      )

      if (response.data.success) {
        setResultado(response.data.data)
        cargarSyllabusList()
      } else {
        setError(response.data.message || 'Error al procesar syllabus')
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.response?.data?.message || 'Error al procesar el archivo')
    } finally {
      setCargando(false)
    }
  }

  const verDetalle = async (sessionId: string) => {
    try {
      const currentToken = token || getToken()
      const response = await axios.get(
        `${API_URL}/comision-academica/syllabus/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${currentToken}` }
        }
      )
      
      if (response.data.success) {
        setSyllabusSeleccionado(response.data.data)
        setVistaActual('detalle')
      }
    } catch (err) {
      console.error('Error cargando detalle:', err)
      alert('Error al cargar el detalle del syllabus')
    }
  }

  const eliminarSyllabus = async (sessionId: string) => {
    if (!confirm('¿Está seguro de eliminar este syllabus?')) return

    try {
      const currentToken = token || getToken()
      await axios.delete(
        `${API_URL}/comision-academica/syllabus/${sessionId}`,
        {
          headers: { Authorization: `Bearer ${currentToken}` }
        }
      )
      
      alert('✅ Syllabus eliminado exitosamente')
      cargarSyllabusList()
      if (syllabusSeleccionado?.session_id === sessionId) {
        setVistaActual('lista')
        setSyllabusSeleccionado(null)
      }
    } catch (err) {
      console.error('Error eliminando:', err)
      alert('❌ Error al eliminar syllabus')
    }
  }

  const renderTablaClaveValor = (datos: any) => {
    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <tbody>
            {Object.entries(datos).map(([key, value]: [string, any]) => (
              <tr key={key} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold bg-gray-50 w-1/3">
                  {key.replace(/_/g, ' ').toUpperCase()}
                </td>
                <td className="px-4 py-3">{value || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderTablaCompleja = (datos: any) => {
    if (!datos.columnas || !datos.filas) return null

    return (
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {datos.columnas.map((col: any) => (
                <th key={col.key} className="px-3 py-2 text-left font-semibold border-r">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.filas.map((fila: any, idx: number) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                {datos.columnas.map((col: any) => (
                  <td key={col.key} className="px-3 py-2 border-r">
                    {fila[col.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#00563F] text-white px-6 py-6 mb-8">
        <div className="container mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8" />
            Comisión Académica - Gestión de Syllabus
          </h1>
          <p className="text-green-100 mt-2">
            Procesa y gestiona los syllabus completos en formato Excel
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        {/* Menú de navegación */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button
                variant={vistaActual === 'upload' ? 'default' : 'outline'}
                onClick={() => setVistaActual('upload')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Syllabus
              </Button>
              <Button
                variant={vistaActual === 'lista' ? 'default' : 'outline'}
                onClick={() => setVistaActual('lista')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Ver Todos ({syllabusList.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vista: Upload */}
        {vistaActual === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Subir Syllabus Completo</CardTitle>
              <CardDescription>
                El sistema procesará automáticamente el archivo Excel y organizará el contenido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="periodo">Periodo Académico *</Label>
                <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado} disabled={cargando}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un periodo académico" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodos.map((periodo) => (
                      <SelectItem key={periodo.id} value={periodo.id.toString()}>
                        {periodo.nombre} ({periodo.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="archivo">Archivo Excel *</Label>
                <Input
                  id="archivo"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={manejarCambioArchivo}
                  disabled={cargando}
                />
                {archivo && (
                  <p className="text-sm text-muted-foreground">
                    📄 {archivo.name}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={procesarSyllabus} 
                disabled={!archivo || !periodoSeleccionado || cargando}
                className="w-full"
              >
                {cargando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Procesar Syllabus
                  </>
                )}
              </Button>

              {resultado && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✅ Syllabus procesado: <strong>{resultado.totalSecciones} secciones</strong> detectadas
                    <div className="mt-2">
                      <Button 
                        onClick={() => verDetalle(resultado.sessionId)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Resultado
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vista: Lista */}
        {vistaActual === 'lista' && (
          <div className="space-y-4">
            {syllabusList.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No hay syllabus procesados</p>
                </CardContent>
              </Card>
            ) : (
              syllabusList.map((syllabus) => (
                <Card key={syllabus.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileSpreadsheet className="h-5 w-5 text-[#00563F]" />
                          {syllabus.nombre_archivo}
                        </CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">
                              <Calendar className="h-3 w-3 mr-1" />
                              {syllabus.periodo_academico}
                            </Badge>
                            <span className="text-xs">
                              {new Date(syllabus.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => verDetalle(syllabus.session_id)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        <Button
                          onClick={() => eliminarSyllabus(syllabus.session_id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Vista: Detalle */}
        {vistaActual === 'detalle' && syllabusSeleccionado && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{syllabusSeleccionado.nombre_archivo}</CardTitle>
                    <CardDescription>
                      {syllabusSeleccionado.periodo_academico}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setVistaActual('lista')}>
                    ← Volver
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {syllabusSeleccionado.datos_json?.secciones && (
              <Tabs defaultValue="0" className="w-full">
                <TabsList className="grid w-full" style={{
                  gridTemplateColumns: `repeat(${syllabusSeleccionado.datos_json.secciones.length}, minmax(0, 1fr))`
                }}>
                  {syllabusSeleccionado.datos_json.secciones.map((seccion: any, index: number) => (
                    <TabsTrigger key={index} value={index.toString()}>
                      <span className="mr-2">{seccion.icono}</span>
                      {seccion.nombre.substring(0, 30)}...
                    </TabsTrigger>
                  ))}
                </TabsList>

                {syllabusSeleccionado.datos_json.secciones.map((seccion: any, index: number) => (
                  <TabsContent key={index} value={index.toString()}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-2xl">{seccion.icono}</span>
                          {seccion.nombre}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {seccion.tipo === 'tabla_clave_valor' && renderTablaClaveValor(seccion.datos)}
                        {seccion.tipo === 'tabla_compleja' && renderTablaCompleja(seccion.datos)}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
