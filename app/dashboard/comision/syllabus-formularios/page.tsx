'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainHeader } from '@/components/layout/main-header'
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Eye,
  Download
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

interface SesionSyllabus {
  session_id: string
  nombre_archivo: string
  tipo_archivo: string
  total_titulos: string
  fecha_extraccion: string
  periodo_academico?: string
  periodo_id?: number
}

interface Titulo {
  id: number
  titulo: string
  tipo: string
  fila: number
  columna: number
  columna_letra: string
}

interface Agrupacion {
  id: number
  nombre_pestana: string
  descripcion: string | null
  orden: number
  titulo_ids: number[]
  color: string
  icono: string
}

export default function ComisionSyllabusPage() {
  const { token } = useAuth()
  const [sesiones, setSesiones] = useState<SesionSyllabus[]>([])
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionSyllabus | null>(null)
  const [titulos, setTitulos] = useState<Titulo[]>([])
  const [agrupaciones, setAgrupaciones] = useState<Agrupacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para filtro de periodo
  const [periodos, setPeriodos] = useState<any[]>([])
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('todos')

  useEffect(() => {
    if (token) {
      cargarSesiones()
      cargarPeriodos()
    }
  }, [token])

  const cargarSesiones = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_URL}/syllabus-extraction/sesiones`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        setSesiones(data.data || [])
      } else {
        setError(data.message || 'Error al cargar sesiones de Syllabus')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error al cargar las sesiones de Syllabus')
    } finally {
      setLoading(false)
    }
  }

  const cargarPeriodos = async () => {
    try {
      const response = await fetch(`${API_URL}/periodo`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        setPeriodos(data.data || [])
      }
    } catch (err) {
      console.error('Error cargando periodos:', err)
    }
  }

  const seleccionarSesion = async (sessionId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Cargar títulos
      const titulosResponse = await fetch(
        `${API_URL}/syllabus-extraction/sesion-extraccion/${sessionId}/titulos`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const titulosData = await titulosResponse.json()

      if (!titulosData.success) {
        setError('Error al cargar títulos del Syllabus')
        setLoading(false)
        return
      }

      setTitulos(titulosData.data || [])

      // Cargar agrupaciones
      const agrupacionesResponse = await fetch(
        `${API_URL}/syllabus-extraction/sesion-extraccion/${sessionId}/agrupaciones`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const agrupacionesData = await agrupacionesResponse.json()

      if (agrupacionesData.success) {
        setAgrupaciones(agrupacionesData.data || [])
      }

      // Encontrar la sesión seleccionada
      const sesion = sesiones.find(s => s.session_id === sessionId)
      if (sesion) {
        setSesionSeleccionada(sesion)
      }

    } catch (err) {
      console.error('Error:', err)
      setError('Error al cargar detalles de la sesión')
    } finally {
      setLoading(false)
    }
  }

  const volverALista = () => {
    setSesionSeleccionada(null)
    setTitulos([])
    setAgrupaciones([])
  }

  const getTitulosPorAgrupacion = (agrupacion: Agrupacion) => {
    return agrupacion.titulo_ids
      .map(id => titulos.find(t => t.id === id))
      .filter(Boolean) as Titulo[]
  }

  const renderVistaPorPestanas = () => {
    if (agrupaciones.length === 0) {
      return (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            ℹ️ Este Syllabus no tiene pestañas organizadas. Mostrando todos los títulos.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <>
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <Eye className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            👁️ Modo Revisión - Comisión Académica
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="0" className="w-full">
          <TabsList className="grid w-full" style={{ 
            gridTemplateColumns: `repeat(${agrupaciones.length}, minmax(0, 1fr))` 
          }}>
            {agrupaciones.map((agrupacion, index) => (
              <TabsTrigger 
                key={agrupacion.id || index} 
                value={index.toString()}
                className="flex items-center gap-2"
              >
                <span>{agrupacion.icono}</span>
                <span>{agrupacion.nombre_pestana}</span>
                <Badge variant="secondary" className="ml-1">
                  {agrupacion.titulo_ids.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {agrupaciones.map((agrupacion, index) => {
            const titulosPestana = getTitulosPorAgrupacion(agrupacion)
            
            return (
              <TabsContent key={agrupacion.id || index} value={index.toString()}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{agrupacion.icono}</span>
                      {agrupacion.nombre_pestana}
                    </CardTitle>
                    {agrupacion.descripcion && (
                      <CardDescription>{agrupacion.descripcion}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {titulosPestana.map((titulo) => (
                        <div 
                          key={titulo.id}
                          className="border rounded-lg p-4 bg-blue-50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <label className="font-medium text-sm flex items-center gap-2">
                              <span className="text-[#00563F]">{titulo.titulo}</span>
                              <span className="text-xs text-gray-500">
                                (Fila {titulo.fila}, Col {titulo.columna_letra})
                              </span>
                            </label>
                            <Badge variant="outline" className="text-xs">
                              {titulo.tipo}
                            </Badge>
                          </div>
                          <div className="bg-white p-3 rounded border border-blue-200 min-h-[80px] text-gray-600 italic">
                            [Contenido pendiente de llenar por el docente]
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      </>
    )
  }

  const renderVistaSinPestanas = () => {
    return (
      <div className="space-y-4">
        {titulos.map((titulo) => (
          <div 
            key={titulo.id}
            className="border rounded-lg p-4 bg-blue-50 space-y-2"
          >
            <div className="flex items-center justify-between">
              <label className="font-medium text-sm flex items-center gap-2">
                <span className="text-[#00563F]">{titulo.titulo}</span>
                <span className="text-xs text-gray-500">
                  {titulo.tipo} - Fila {titulo.fila}, Col {titulo.columna_letra}
                </span>
              </label>
              <Badge variant="outline" className="text-xs">
                {titulo.tipo}
              </Badge>
            </div>
            <div className="bg-white p-3 rounded border border-blue-200 min-h-[80px] text-gray-600 italic">
              [Contenido pendiente de llenar por el docente]
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading && sesiones.length === 0) {
    return (
      <ProtectedRoute allowedRoles={["comision", "comision_academica"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-400" />
                  <p className="mt-4 text-gray-600">Cargando Syllabus...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["comision", "comision_academica"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        
        <div className="bg-[#00563F] text-white px-6 py-6 mb-8">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Eye className="h-8 w-8" />
              Revisión de Syllabus - Comisión Académica
            </h1>
            <p className="text-green-100 mt-2">
              Visualiza y revisa los formularios de Syllabus extraídos
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-6xl">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {sesionSeleccionada ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {sesionSeleccionada.nombre_archivo}
                      </CardTitle>
                      <CardDescription>
                        {sesionSeleccionada.total_titulos} títulos disponibles - Modo revisión
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </Button>
                      <Button variant="outline" onClick={volverALista}>
                        ← Cambiar Syllabus
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {agrupaciones.length > 0 ? renderVistaPorPestanas() : renderVistaSinPestanas()}
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Syllabus Extraídos para Revisión</CardTitle>
                  <CardDescription>
                    Selecciona un Syllabus para revisar su contenido
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filtro de Periodo */}
                  <div className="mb-6">
                    <Label htmlFor="periodoFiltro" className="mb-2 block">Filtrar por Periodo Académico</Label>
                    <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los periodos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los periodos</SelectItem>
                        {periodos.map((periodo) => (
                          <SelectItem key={periodo.id} value={periodo.id.toString()}>
                            {periodo.nombre} ({periodo.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {sesiones.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      No hay sesiones de Syllabus disponibles para revisar
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {sesiones
                    .filter(sesion => periodoFiltro === 'todos' || sesion.periodo_id?.toString() === periodoFiltro)
                    .map((sesion) => (
                    <Card
                      key={sesion.session_id}
                      className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                      onClick={() => seleccionarSesion(sesion.session_id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <FileText className="h-5 w-5 text-blue-600" />
                              {sesion.nombre_archivo}
                            </CardTitle>
                            <CardDescription className="mt-2 space-y-1">
                              <div className="flex items-center gap-4 text-sm">
                                <span>📄 {sesion.tipo_archivo}</span>
                                <span>📋 {sesion.total_titulos} títulos</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(sesion.fecha_extraccion).toLocaleDateString()}
                                </span>
                              </div>
                              {sesion.periodo_academico && (
                                <Badge variant="outline" className="text-xs mt-2">
                                  📅 {sesion.periodo_academico}
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Eye className="h-4 w-4 mr-2" />
                            Revisar →
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
