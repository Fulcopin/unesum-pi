"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileSpreadsheet, Loader2, Edit } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { FormularioDinamico } from "@/components/programa-analitico/formulario-dinamico"

interface ProgramaAnalitico {
  id: number
  nombre: string
  datos_tabla: {
    datos_generales?: {
      carrera?: string
      nivel?: string
      asignatura?: string
      periodo_academico?: string
      docente?: string
    }
    secciones_completas?: any[]
    secciones_formulario?: any[]
    fecha_creacion?: string
    unidades_tematicas?: any[]
    asignaciones_docentes?: any[]
    contenidos_docentes?: Record<string, any>
  }
  asignacion?: {
    profesor_id: number
    asignatura_id?: number
    nivel_id?: number
    paralelo_id?: number
    periodo_id?: number
    fecha_asignacion: string
    estado: 'pendiente' | 'en_progreso' | 'completado'
  }
  createdAt: string
  updatedAt: string
}

export default function DocenteProgramaAnaliticoPage() {
  const { token, getToken, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [programas, setProgramas] = useState<ProgramaAnalitico[]>([])
  const [selectedPrograma, setSelectedPrograma] = useState<ProgramaAnalitico | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)

  useEffect(() => {
    fetchProgramasAsignados()
  }, [])

  const fetchProgramasAsignados = async () => {
    try {
      setLoading(true)
      setError(null)
      const currentToken = token || getToken()

      console.log('🔍 Obteniendo programas analíticos disponibles...')
      console.log('Token:', currentToken ? 'Presente ✓' : 'No hay token ✗')
      
      // Usar el nuevo endpoint para obtener programas disponibles con plantillas
      const response = await fetch('http://localhost:4000/api/programa-analitico/disponibles', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 Response status:', response.status)

      const data = await response.json()
      console.log('📦 Data recibida:', data)

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener programas analíticos')
      }

      setProgramas(data.data || [])
      console.log('✅ Programas asignados cargados:', data.data?.length || 0)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos'
      
      // Si es error de red, dar más información
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

  const handleGuardarContenido = async (programaId: number, contenido: Record<string, any>) => {
    try {
      setSaving(true)
      setError(null)
      const currentToken = token || getToken()
      const profesorId = (user as any)?.profesor_id || user?.id
      
      console.log('💾 Guardando contenido:', contenido)
      
      // Usar el nuevo endpoint que guarda en las tablas relacionales
      const response = await fetch(`http://localhost:4000/api/programa-analitico/${programaId}/guardar-contenido`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          contenido,
          profesor_id: profesorId
        })
      })

      const data = await response.json()
      console.log('📡 Respuesta del servidor:', data)

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar')
      }

      alert('✅ Contenido guardado exitosamente en la base de datos')
      setModoEdicion(false)
      fetchProgramasAsignados()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar'
      setError(errorMessage)
      alert('❌ ' + errorMessage)
      console.error('Error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSeleccionarPrograma = async (programa: ProgramaAnalitico) => {
    try {
      setLoading(true)
      const currentToken = token || getToken()

      console.log('🔍 Cargando estructura de plantilla para programa:', programa.id)

      // Obtener estructura completa de la plantilla
      const response = await fetch(`http://localhost:4000/api/programa-analitico/${programa.id}/plantilla`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log('📦 Datos de plantilla recibidos:', data)

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al cargar estructura')
      }

      // Obtener contenido guardado del docente
      const profesorId = (user as any)?.profesor_id || user?.id
      const contenidoResponse = await fetch(`http://localhost:4000/api/programa-analitico/${programa.id}/contenido-docente?profesor_id=${profesorId}`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      const contenidoData = await contenidoResponse.json()
      console.log('📝 Contenido guardado:', contenidoData)

      // Crear programa completo con estructura de plantilla y contenido
      const programaCompleto = {
        ...programa,
        plantilla: data.data.plantilla,
        contenido_guardado: contenidoData.success ? contenidoData.data.contenido : {}
      }

      setSelectedPrograma(programaCompleto)
      setModoEdicion(true)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar programa'
      setError(errorMessage)
      console.error('❌ Error al cargar programa:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelarEdicion = () => {
    setSelectedPrograma(null)
    setModoEdicion(false)
  }

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

  // Si está en modo edición, mostrar el formulario
  if (modoEdicion && selectedPrograma) {
    // Usar la estructura de la plantilla si existe
    const plantilla = (selectedPrograma as any).plantilla
    const contenidoGuardado = (selectedPrograma as any).contenido_guardado || {}
    
    if (!plantilla?.secciones) {
      return (
        <ProtectedRoute allowedRoles={["profesor", "docente"]}>
          <div className="min-h-screen bg-gray-50">
            <MainHeader />
            <main className="max-w-7xl mx-auto px-6 py-8">
              <div className="mb-6">
                <Button variant="ghost" size="sm" onClick={handleCancelarEdicion}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a la lista
                </Button>
              </div>
              <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <h2 className="font-bold mb-2">❌ Error</h2>
                <p>Este programa no tiene una plantilla asociada. Contacte al administrador.</p>
              </div>
            </main>
          </div>
        </ProtectedRoute>
      )
    }

    // Convertir la estructura de la plantilla al formato esperado por FormularioDinamico
    const seccionesFormateadas = plantilla.secciones.map((seccion: any) => ({
      id: seccion.id,
      titulo: seccion.nombre,
      descripcion: seccion.descripcion,
      tipo: seccion.tipo, // 'texto_largo' o 'tabla'
      orden: seccion.orden,
      obligatoria: seccion.obligatoria,
      campos: seccion.campos || []
    }))

    // En lugar de hardcodear datosGenerales, los extraemos de la primera sección de tipo 'tabla'
    // o los dejamos vacíos para que el formulario los genere desde la plantilla
    const datosGenerales = {}

    // Formatear contenido guardado para el formulario
    const contenidoInicial: Record<string, any> = {}
    for (const seccionId of Object.keys(contenidoGuardado)) {
      const seccion = contenidoGuardado[seccionId]
      if (seccion.tipo === 'texto_largo') {
        contenidoInicial[seccionId] = seccion.contenido || ''
      } else if (seccion.tipo === 'tabla') {
        contenidoInicial[seccionId] = seccion.filas || []
      }
    }

    return (
      <ProtectedRoute allowedRoles={["profesor", "docente"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-6">
              <Button variant="ghost" size="sm" onClick={handleCancelarEdicion}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a la lista
              </Button>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#00563F] mb-2">{selectedPrograma.nombre}</h1>
              <p className="text-gray-600">Complete el programa analítico asignado</p>
              {plantilla.nombre && (
                <p className="text-sm text-gray-500 mt-2">
                  📋 Plantilla: <span className="font-medium">{plantilla.nombre}</span>
                </p>
              )}
            </div>

            <FormularioDinamico
              secciones={seccionesFormateadas}
              datosGenerales={datosGenerales}
              contenidoInicial={contenidoInicial}
              onGuardar={(contenido) => handleGuardarContenido(selectedPrograma.id, contenido)}
              onCancelar={handleCancelarEdicion}
              guardando={saving}
              error={error}
            />
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
            <h1 className="text-3xl font-bold text-[#00563F] mb-2">📝 Formularios de Programa Analítico</h1>
            <p className="text-gray-600">Complete los formularios creados por el administrador</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Lista de Programas Analíticos Disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Programas Analíticos Disponibles
              </CardTitle>
              <CardDescription>
                {programas.length === 0 
                  ? 'No hay programas analíticos disponibles' 
                  : `${programas.length} formulario(s) disponible(s) para completar`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programas.length === 0 ? (
                <div className="text-center py-12">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 text-lg">No hay formularios disponibles</p>
                  <p className="text-gray-500 text-sm mt-2">El administrador debe subir un archivo Excel para crear formularios</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {programas.map((programa: any) => (
                    <div
                      key={programa.id}
                      className="p-6 rounded-lg border-2 border-gray-200 hover:border-emerald-300 bg-white transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-bold text-gray-900 text-lg">
                              {programa.nombre}
                            </h3>
                            {programa.tiene_contenido_guardado && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                                En Progreso
                              </span>
                            )}
                          </div>
                          
                          {programa.plantilla && (
                            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                              <p className="text-sm text-emerald-800">
                                <span className="font-semibold">📋 Plantilla:</span> {programa.plantilla.nombre}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <p>
                              <span className="font-medium">📅 Creado:</span>{' '}
                              {new Date(programa.fecha_creacion).toLocaleDateString('es-ES')}
                            </p>
                            <p>
                              <span className="font-medium">🔄 Actualizado:</span>{' '}
                              {new Date(programa.ultima_actualizacion).toLocaleDateString('es-ES')}
                            </p>
                          </div>

                          {programa.tiene_contenido_guardado && (
                            <p className="text-sm text-blue-600 mt-2">
                              ✏️ Ya has empezado a completar este formulario
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="lg"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleSeleccionarPrograma(programa)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {programa.tiene_contenido_guardado ? 'Continuar' : 'Completar Formulario'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
