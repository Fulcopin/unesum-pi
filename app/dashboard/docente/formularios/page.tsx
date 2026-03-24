"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileSpreadsheet, Loader2, Edit, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { FormularioDinamico } from "@/components/programa-analitico/formulario-dinamico"

interface Plantilla {
  id: number
  nombre: string
  descripcion: string
  tipo: string
  secciones: SeccionPlantilla[]
}

interface SeccionPlantilla {
  id: number
  nombre: string
  descripcion: string
  tipo: 'texto_largo' | 'tabla'
  orden: number
  obligatoria: boolean
  campos: Campo[]
}

interface Campo {
  id: number
  nombre?: string
  etiqueta: string
  tipo_campo: string
  orden: number
  requerido?: boolean
  placeholder?: string
  opciones_json?: any
  validacion_json?: any
}

interface ProgramaAnalitico {
  id: number
  nombre: string
  plantilla_id: number
  plantilla?: Plantilla
  createdAt: string
  estado?: string
}

export default function DocenteFormulariosPage() {
  const { token, getToken, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [programas, setProgramas] = useState<ProgramaAnalitico[]>([])
  const [selectedPrograma, setSelectedPrograma] = useState<ProgramaAnalitico | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contenidoInicial, setContenidoInicial] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchProgramasDisponibles()
  }, [])

  const fetchProgramasDisponibles = async () => {
    try {
      setLoading(true)
      setError(null)
      const currentToken = token || getToken()

      console.log('🔍 Obteniendo programas analíticos disponibles...')
      
      const response = await fetch('http://localhost:4000/api/programa-analitico/disponibles', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        throw new Error('Error al obtener programas analíticos')
      }

      const data = await response.json()
      console.log('📦 Data recibida:', data)

      if (data.success) {
        setProgramas(data.data || [])
        console.log('✅ Programas cargados:', data.data?.length || 0)
      } else {
        throw new Error(data.message || 'Error al cargar programas')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos'
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('❌ No se pudo conectar al servidor. Asegúrate de que el backend esté corriendo en http://localhost:4000')
      } else {
        setError(errorMessage)
      }
      
      console.error('❌ Error completo:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSeleccionarPrograma = async (programa: ProgramaAnalitico) => {
    try {
      setLoading(true)
      setError(null)
      const currentToken = token || getToken()

      console.log('🔍 Cargando plantilla del programa:', programa.id)

      // Obtener estructura completa de la plantilla
      const response = await fetch(`http://localhost:4000/api/programa-analitico/${programa.id}/plantilla`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Error al cargar plantilla')
      }

      const data = await response.json()
      console.log('📦 Datos de plantilla recibidos:', data)

      if (!data.success) {
        throw new Error(data.message || 'Error al cargar estructura')
      }

      // Obtener contenido guardado del docente
      const profesorId = (user as any)?.profesor_id || user?.id
      const contenidoResponse = await fetch(
        `http://localhost:4000/api/programa-analitico/${programa.id}/contenido-docente?profesor_id=${profesorId}`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      let contenidoGuardado = {}
      if (contenidoResponse.ok) {
        const contenidoData = await contenidoResponse.json()
        console.log('📝 Contenido guardado:', contenidoData)
        if (contenidoData.success) {
          contenidoGuardado = contenidoData.data.contenido || {}
        }
      }

      // Crear programa completo con estructura de plantilla
      const programaCompleto = {
        ...programa,
        plantilla: data.data.plantilla
      }

      setSelectedPrograma(programaCompleto)
      setContenidoInicial(contenidoGuardado)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar programa'
      setError(errorMessage)
      console.error('❌ Error al cargar programa:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarContenido = async (contenido: Record<string, any>) => {
    if (!selectedPrograma) return

    try {
      setSaving(true)
      setError(null)
      const currentToken = token || getToken()
      const profesorId = (user as any)?.profesor_id || user?.id
      
      console.log('💾 Guardando contenido:', contenido)
      
      const response = await fetch(
        `http://localhost:4000/api/programa-analitico/${selectedPrograma.id}/guardar-contenido`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            contenido,
            profesor_id: profesorId
          })
        }
      )

      const data = await response.json()
      console.log('📡 Respuesta del servidor:', data)

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar')
      }

      alert('✅ Contenido guardado exitosamente')
      setSelectedPrograma(null)
      setContenidoInicial({})
      fetchProgramasDisponibles()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar'
      setError(errorMessage)
      alert('❌ ' + errorMessage)
      console.error('Error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelar = () => {
    setSelectedPrograma(null)
    setContenidoInicial({})
    setError(null)
  }

  // Si está en modo edición, mostrar el formulario
  if (selectedPrograma && selectedPrograma.plantilla) {
    const plantilla = selectedPrograma.plantilla
    
    if (!plantilla.secciones || plantilla.secciones.length === 0) {
      return (
        <ProtectedRoute allowedRoles={["profesor", "docente"]}>
          <div className="min-h-screen bg-gray-50">
            <MainHeader />
            <main className="max-w-7xl mx-auto px-6 py-8">
              <div className="mb-6">
                <Button variant="ghost" size="sm" onClick={handleCancelar}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a la lista
                </Button>
              </div>
              <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <h2 className="font-bold mb-2">❌ Error</h2>
                <p>Esta plantilla no tiene secciones definidas. Contacte al administrador.</p>
              </div>
            </main>
          </div>
        </ProtectedRoute>
      )
    }

    // Convertir la estructura de la plantilla al formato esperado por FormularioDinamico
    const seccionesFormateadas = plantilla.secciones.map((seccion) => ({
      id: seccion.id,
      titulo: seccion.nombre,
      descripcion: seccion.descripcion,
      tipo: seccion.tipo,
      orden: seccion.orden,
      obligatoria: seccion.obligatoria,
      campos: seccion.campos || []
    }))

    // Formatear contenido inicial
    const contenidoFormateado: Record<string, any> = {}
    for (const [seccionId, datos] of Object.entries(contenidoInicial)) {
      contenidoFormateado[seccionId] = datos
    }

    return (
      <ProtectedRoute allowedRoles={["profesor", "docente"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-6">
              <Button variant="ghost" size="sm" onClick={handleCancelar}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a la lista
              </Button>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#00563F] mb-2">{selectedPrograma.nombre}</h1>
              <p className="text-gray-600">Complete el formulario según la plantilla</p>
              <p className="text-sm text-gray-500 mt-2">
                📋 Plantilla: <span className="font-medium">{plantilla.nombre}</span>
              </p>
            </div>

            <FormularioDinamico
              secciones={seccionesFormateadas}
              datosGenerales={{}}
              contenidoInicial={contenidoFormateado}
              onGuardar={handleGuardarContenido}
              onCancelar={handleCancelar}
              guardando={saving}
              error={error}
            />
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  // Vista de lista de programas
  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["profesor", "docente"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard/docente">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#00563F] mb-2">
              📝 Formularios de Programas Analíticos
            </h1>
            <p className="text-gray-600">
              Complete los formularios creados dinámicamente por el administrador
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Lista de Programas Analíticos Disponibles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programas.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 text-lg">No hay programas analíticos disponibles</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Contacta al administrador para que suba programas analíticos
                  </p>
                </CardContent>
              </Card>
            ) : (
              programas.map((programa) => (
                <Card key={programa.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                      {programa.nombre}
                    </CardTitle>
                    <CardDescription>
                      {programa.plantilla ? (
                        <>
                          <span className="text-emerald-600 font-medium">
                            ✓ Plantilla: {programa.plantilla.nombre}
                          </span>
                          <br />
                          <span className="text-sm text-gray-500">
                            {programa.plantilla.secciones?.length || 0} secciones
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-600">⚠️ Sin plantilla asociada</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-xs text-gray-500">
                        Creado: {new Date(programa.createdAt).toLocaleDateString('es-ES')}
                      </div>
                      
                      {programa.estado && (
                        <div className="flex items-center gap-2">
                          {programa.estado === 'completado' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600" />
                          )}
                          <span className="text-sm capitalize">{programa.estado}</span>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => handleSeleccionarPrograma(programa)}
                        disabled={!programa.plantilla}
                        className="w-full bg-[#00563F] hover:bg-[#00563F]/90"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Llenar Formulario
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
