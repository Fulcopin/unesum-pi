"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileSpreadsheet, Loader2, Edit, Trash2, Eye, Sparkles, Eraser, Settings } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import IAExtractorModal from "@/components/programa-analitico/ia-extractor-modal"
import { ExtractorTitulosModal } from "@/components/programa-analitico/extractor-titulos-modal"
import { SesionesExtraidasList } from "@/components/programa-analitico/sesiones-extraidas-list"

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
    fecha_creacion?: string
    unidades_tematicas?: any[]
  }
  createdAt: string
  updatedAt: string
}

export default function ComisionProgramaAnaliticoPage() {
  const { token, getToken } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [programas, setProgramas] = useState<ProgramaAnalitico[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProgramas()
  }, [])

  const fetchProgramas = async () => {
    try {
      setLoading(true)
      setError(null)
      const currentToken = token || getToken()
      
      if (!currentToken) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch('http://localhost:4000/api/programa-analitico', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error('Error en el servidor. Por favor, verifica que el backend esté corriendo.')
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Error al obtener programas analíticos')
      }

      setProgramas(data.data || [])
      setError(null)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos'
      setError(errorMessage)
      console.error('Error al obtener programas:', err)
      setProgramas([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este programa analítico?')) {
      return
    }

    try {
      const currentToken = token || getToken()
      
      const response = await fetch(`http://localhost:4000/api/programa-analitico/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al eliminar')
      }

      alert('✅ Programa analítico eliminado exitosamente')
      fetchProgramas()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar'
      alert(`❌ ${errorMessage}`)
      console.error('Error:', err)
    }
  }

  const handleRelimpiar = async (id: number) => {
    if (!confirm('¿Desea re-limpiar los datos de este programa? Esto eliminará duplicados.')) {
      return
    }

    try {
      const currentToken = token || getToken()
      
      const response = await fetch(`http://localhost:4000/api/programa-analitico/${id}/relimpiar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al re-limpiar')
      }

      alert(`✅ ${data.message}\nSecciones procesadas: ${data.data.secciones_procesadas}`)
      fetchProgramas()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al re-limpiar'
      alert(`❌ ${errorMessage}`)
      console.error('Error:', err)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['comision', 'comision_academica']}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['comision', 'comision_academica']}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard/comision">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-blue-800 mb-2">Programas Analíticos</h1>
            <p className="text-gray-600">Gestiona los programas analíticos del sistema</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Opciones disponibles */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Extraer con IA */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Extraer con IA</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Usa Google AI para extraer automáticamente datos de archivos Excel o Word
                </CardDescription>
                <IAExtractorModal />
              </CardContent>
            </Card>

            {/* Extractor de Títulos */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-amber-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500 text-white">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Extraer Títulos</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Visualiza qué títulos/secciones se detectan en tu archivo antes de subirlo
                </CardDescription>
                <ExtractorTitulosModal />
              </CardContent>
            </Card>

            {/* Organizador de Pestañas */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-indigo-200">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500 text-white">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Organizar en Pestañas</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  Organiza los títulos extraídos en diferentes pestañas para mejorar el formulario
                </CardDescription>
                <Button 
                  onClick={() => router.push('/dashboard/comision/programa-analitico/organizar-pestanas')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Organizar Pestañas
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Programas Analíticos Existentes */}
          <Card>
            <CardHeader>
              <CardTitle>Programas Analíticos Guardados</CardTitle>
              <CardDescription>
                {programas.length === 0 
                  ? 'No hay programas analíticos guardados' 
                  : `${programas.length} programa(s) analítico(s) disponible(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programas.length === 0 ? (
                <div className="text-center py-12">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 text-lg">No hay programas analíticos</p>
                  <p className="text-gray-500 text-sm mt-2">Usa las herramientas de arriba para extraer y crear programas</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {programas.map((programa) => (
                    <div
                      key={programa.id}
                      className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 bg-white transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-2">
                            {programa.nombre}
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            {programa.datos_tabla?.datos_generales?.carrera && (
                              <p>
                                <span className="font-medium">Carrera:</span>{' '}
                                {programa.datos_tabla.datos_generales.carrera}
                              </p>
                            )}
                            {programa.datos_tabla?.datos_generales?.nivel && (
                              <p>
                                <span className="font-medium">Nivel:</span>{' '}
                                {programa.datos_tabla.datos_generales.nivel}
                              </p>
                            )}
                            {programa.datos_tabla?.datos_generales?.asignatura && (
                              <p>
                                <span className="font-medium">Asignatura:</span>{' '}
                                {programa.datos_tabla.datos_generales.asignatura}
                              </p>
                            )}
                            {programa.datos_tabla?.datos_generales?.periodo_academico && (
                              <p>
                                <span className="font-medium">Periodo:</span>{' '}
                                {programa.datos_tabla.datos_generales.periodo_academico}
                              </p>
                            )}
                            {programa.datos_tabla?.datos_generales?.docente && (
                              <p>
                                <span className="font-medium">Docente:</span>{' '}
                                {programa.datos_tabla.datos_generales.docente}
                              </p>
                            )}
                            {programa.datos_tabla?.unidades_tematicas && (
                              <p>
                                <span className="font-medium">Unidades:</span>{' '}
                                {programa.datos_tabla.unidades_tematicas.length}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Creado: {new Date(programa.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => handleRelimpiar(programa.id)}
                            title="Limpiar datos duplicados"
                          >
                            <Eraser className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleDelete(programa.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Sesiones de Extracción Guardadas */}
          <div className="mt-8">
            <SesionesExtraidasList />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
