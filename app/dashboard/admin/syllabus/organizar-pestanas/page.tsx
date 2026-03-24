'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, FileText, Settings, CheckCircle2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { OrganizadorPestanas } from '@/components/programa-analitico/organizador-pestanas'

interface SesionSyllabus {
  session_id: string
  nombre_archivo: string
  tipo_archivo: string
  total_titulos: number
  fecha_extraccion: string
  titulos?: any[]
}

export default function OrganizarPestanasSyllabusPage() {
  const { token } = useAuth()
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get('sessionId')
  
  const [sesiones, setSesiones] = useState<SesionSyllabus[]>([])
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionSyllabus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)

  useEffect(() => {
    if (token) {
      if (sessionIdParam) {
        cargarSesionEspecifica(sessionIdParam)
      } else {
        cargarSesiones()
      }
    }
  }, [token, sessionIdParam])

  const cargarSesiones = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('http://localhost:4000/api/syllabus-extraction/sesiones', {
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
      setError('Error al cargar las sesiones de extracción de Syllabus')
    } finally {
      setLoading(false)
    }
  }

  const cargarSesionEspecifica = async (sessionId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Cargar títulos de la sesión
      const response = await fetch(
        `http://localhost:4000/api/syllabus-extraction/sesion-extraccion/${sessionId}/titulos`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()

      if (data.success) {
        const titulos = data.data || []
        
        // Obtener info de la sesión desde las sesiones
        const sesionesResponse = await fetch('http://localhost:4000/api/syllabus-extraction/sesiones', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        const sesionesData = await sesionesResponse.json()
        const sesionInfo = sesionesData.data?.find((s: any) => s.session_id === sessionId)

        setSesionSeleccionada({
          session_id: sessionId,
          nombre_archivo: sesionInfo?.nombre_archivo || 'Archivo Syllabus',
          tipo_archivo: sesionInfo?.tipo_archivo || 'Excel',
          total_titulos: titulos.length,
          fecha_extraccion: sesionInfo?.fecha_extraccion || new Date().toISOString(),
          titulos: titulos
        })
      } else {
        setError(data.message || 'Error al cargar sesión de Syllabus')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Error al cargar los detalles de la sesión')
    } finally {
      setLoading(false)
    }
  }

  const seleccionarSesion = async (sessionId: string) => {
    await cargarSesionEspecifica(sessionId)
  }

  const handleVolverALista = () => {
    setSesionSeleccionada(null)
    setGuardadoExitoso(false)
    cargarSesiones()
  }

  const handleGuardarExitoso = () => {
    setGuardadoExitoso(true)
    setTimeout(() => setGuardadoExitoso(false), 5000)
  }

  const eliminarSesion = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Evitar que se abra la sesión al hacer clic en eliminar
    
    if (!confirm('¿Estás seguro de eliminar esta sesión de Syllabus? Se eliminarán todos los títulos y agrupaciones asociados.')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:4000/api/syllabus-extraction/sesion/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ Sesión eliminada exitosamente')
        // Recargar la lista de sesiones
        cargarSesiones()
      } else {
        alert('❌ ' + (data.message || 'Error al eliminar sesión'))
      }
    } catch (error) {
      console.error('Error eliminando sesión:', error)
      alert('❌ Error al eliminar sesión')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard/admin" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="h-8 w-8 text-blue-500" />
                Organizar Syllabus en Pestañas
              </h1>
              <p className="text-gray-600 mt-2">
                Configura cómo se mostrarán los títulos del Syllabus en el formulario del docente
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {guardadoExitoso && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ Organización guardada exitosamente
            </AlertDescription>
          </Alert>
        )}

        {loading && !sesionSeleccionada ? (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando sesiones de Syllabus...</p>
              </div>
            </CardContent>
          </Card>
        ) : sesionSeleccionada ? (
          // Vista de organización
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {sesionSeleccionada.nombre_archivo}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {sesionSeleccionada.total_titulos} títulos detectados • {sesionSeleccionada.tipo_archivo}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleVolverALista}>
                    ← Volver a la lista
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Componente reutilizable - cambiamos solo los endpoints */}
            <OrganizadorPestanas
              sessionId={sesionSeleccionada.session_id}
              titulos={sesionSeleccionada.titulos || []}
              apiBaseUrl="http://localhost:4000/api/syllabus-extraction"
              onGuardar={handleGuardarExitoso}
            />
          </div>
        ) : (
          // Lista de sesiones
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sesiones de Extracción de Syllabus</CardTitle>
                <CardDescription>
                  Selecciona una sesión para organizar sus títulos en pestañas
                </CardDescription>
              </CardHeader>
            </Card>

            {sesiones.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    No hay sesiones de extracción de Syllabus disponibles
                  </p>
                  <Link href="/dashboard/admin/syllabus/extraer-titulos">
                    <Button>
                      Extraer Títulos de Syllabus
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sesiones.map((sesion) => (
                  <Card 
                    key={sesion.session_id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => seleccionarSesion(sesion.session_id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5 text-blue-500" />
                            {sesion.nombre_archivo}
                          </CardTitle>
                          <CardDescription className="mt-2 space-y-1">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                📄 {sesion.tipo_archivo}
                              </span>
                              <span className="flex items-center gap-1">
                                📋 {sesion.total_titulos} títulos
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Session: {sesion.session_id}
                            </div>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Organizar →
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => eliminarSesion(sesion.session_id, e)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
  )
}
