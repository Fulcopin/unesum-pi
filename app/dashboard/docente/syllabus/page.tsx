"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { SyllabusFormulario } from "@/components/syllabus/syllabus-formulario"

interface Syllabus {
  id: number
  nombre: string
  periodo: string
  materias: string
  datos_syllabus: {
    tipo_archivo?: string
    hojas?: string[]
    campos_por_seccion?: Record<string, string[]>
    contenido?: Record<string, string>
  }
}

interface ProfesorInfo {
  id: number
  nombres: string
  apellidos: string
  email: string
  asignatura: { 
    id: number
    nombre: string
    codigo: string
    carrera?: {
      id: number
      nombre: string
      facultad?: {
        id: number
        nombre: string
      }
    }
  } | null
  nivel: { id: number; nombre: string } | null
  paralelo: { id: number; nombre: string } | null
}

interface CatalogosData {
  facultades: Array<{ id: number; nombre: string }>
  carreras: Array<{ id: number; nombre: string; facultad_id?: number }>
  asignaturas: Array<{ id: number; nombre: string; codigo: string }>
  niveles: Array<{ id: number; nombre: string }>
  paralelos: Array<{ id: number; nombre: string }>
  modalidades: Array<{ nombre: string }>
}

export default function DocenteSyllabusPage() {
  const { token, getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profesor, setProfesor] = useState<ProfesorInfo | null>(null)
  const [syllabi, setSyllabi] = useState<Syllabus[]>([])
  const [selectedSyllabus, setSelectedSyllabus] = useState<Syllabus | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [catalogos, setCatalogos] = useState<CatalogosData>({
    facultades: [],
    carreras: [],
    asignaturas: [],
    niveles: [],
    paralelos: [],
    modalidades: [
      { nombre: 'Presencial' },
      { nombre: 'Semi-presencial' },
      { nombre: 'En línea' },
      { nombre: 'Híbrida' }
    ]
  })

  useEffect(() => {
    fetchMySyllabi()
    fetchCatalogos()
  }, [])

  const fetchCatalogos = async () => {
    try {
      const currentToken = token || getToken()
      
      const [facultadesRes, carrerasRes, asignaturasRes, nivelesRes, paralelosRes] = await Promise.all([
        fetch('http://localhost:4000/api/datos-academicos/facultades', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/carreras', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/asignaturas', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/niveles', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/paralelos', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        })
      ])

      const [facultadesData, carrerasData, asignaturasData, nivelesData, paralelosData] = await Promise.all([
        facultadesRes.json(),
        carrerasRes.json(),
        asignaturasRes.json(),
        nivelesRes.json(),
        paralelosRes.json()
      ])

      setCatalogos(prev => ({
        ...prev,
        facultades: facultadesData.data || [],
        carreras: carrerasData.data || [],
        asignaturas: asignaturasData.data || [],
        niveles: nivelesData.data || [],
        paralelos: paralelosData.data || []
      }))

    } catch (err) {
      console.error('Error al cargar catálogos:', err)
    }
  }

  const fetchMySyllabi = async () => {
    try {
      setLoading(true)
      const currentToken = token || getToken()
      
      const response = await fetch('http://localhost:4000/api/profesores/my-syllabi', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al obtener syllabi')
      }

      setProfesor(data.data.profesor)
      setSyllabi(data.data.syllabi)

      // Si hay syllabi disponibles, seleccionar el primero automáticamente
      if (data.data.syllabi.length > 0) {
        handleSelectSyllabus(data.data.syllabi[0])
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos'
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSyllabus = (syllabus: Syllabus) => {
    setSelectedSyllabus(syllabus)
    
    // Inicializar formData con contenido existente o valores vacíos
    const initialData: Record<string, string> = {}
    const camposPorSeccion = syllabus.datos_syllabus.campos_por_seccion || {}
    const contenidoExistente = syllabus.datos_syllabus.contenido || {}
    
    Object.values(camposPorSeccion).forEach((campos: string[]) => {
      campos.forEach((campo: string) => {
        initialData[campo] = contenidoExistente[campo] || ''
      })
    })
    
    setFormData(initialData)
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!selectedSyllabus) return

    setSaving(true)
    setError(null)

    try {
      const currentToken = token || getToken()
      const response = await fetch(`http://localhost:4000/api/syllabi/${selectedSyllabus.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datos_syllabus: {
            ...selectedSyllabus.datos_syllabus,
            contenido: formData,
            fecha_actualizacion: new Date().toISOString()
          }
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar')
      }

      alert('✅ Syllabus guardado exitosamente')
      
      // Actualizar la lista de syllabi
      setSyllabi(prev => prev.map(s => 
        s.id === selectedSyllabus.id 
          ? { ...s, datos_syllabus: { ...s.datos_syllabus, contenido: formData } }
          : s
      ))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar'
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setSaving(false)
    }
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
            <h1 className="text-3xl font-bold text-[#00563F] mb-2">Mis Syllabus</h1>
            {profesor && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-gray-700">
                  <span className="font-semibold">Profesor:</span> {profesor.nombres} {profesor.apellidos}
                </p>
                {profesor.asignatura && (
                  <p className="text-gray-700">
                    <span className="font-semibold">Asignatura:</span> {profesor.asignatura.nombre} ({profesor.asignatura.codigo})
                  </p>
                )}
                {profesor.nivel && (
                  <p className="text-gray-700">
                    <span className="font-semibold">Nivel:</span> {profesor.nivel.nombre}
                  </p>
                )}
                {profesor.paralelo && (
                  <p className="text-gray-700">
                    <span className="font-semibold">Paralelo:</span> {profesor.paralelo.nombre}
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {syllabi.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 text-lg">No hay syllabi asignados actualmente</p>
                <p className="text-gray-500 text-sm mt-2">Contacta al administrador para más información</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {/* Lista de Syllabi disponibles */}
              <Card>
                <CardHeader>
                  <CardTitle>Syllabus Disponibles</CardTitle>
                  <CardDescription>Selecciona un syllabus para completar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {syllabi.map((syllabus) => (
                      <button
                        key={syllabus.id}
                        onClick={() => handleSelectSyllabus(syllabus)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          selectedSyllabus?.id === syllabus.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <h3 className="font-semibold text-gray-900">{syllabus.nombre}</h3>
                        <p className="text-sm text-gray-600">Periodo: {syllabus.periodo}</p>
                        <p className="text-sm text-gray-600">Materias: {syllabus.materias}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Formulario del Syllabus seleccionado */}
              {selectedSyllabus && (
                <SyllabusFormulario
                  titulos={Object.values(selectedSyllabus.datos_syllabus.campos_por_seccion || {}).flat()}
                  camposPorSeccion={selectedSyllabus.datos_syllabus.campos_por_seccion}
                  formData={formData}
                  onFormChange={handleFormChange}
                  onSave={handleSave}
                  isSaving={saving}
                  error={error}
                  totalCampos={Object.values(selectedSyllabus.datos_syllabus.campos_por_seccion || {}).flat().length}
                  showCancelButtons={false}
                  catalogos={catalogos}
                  profesorContext={profesor ? {
                    nombres: profesor.nombres,
                    apellidos: profesor.apellidos,
                    facultad: profesor.asignatura?.carrera?.facultad ? {
                      nombre: profesor.asignatura.carrera.facultad.nombre
                    } : undefined,
                    carrera: profesor.asignatura?.carrera ? {
                      nombre: profesor.asignatura.carrera.nombre
                    } : undefined,
                    asignatura: profesor.asignatura ? {
                      nombre: profesor.asignatura.nombre,
                      codigo: profesor.asignatura.codigo
                    } : undefined,
                    nivel: profesor.nivel ? {
                      nombre: profesor.nivel.nombre
                    } : undefined,
                    paralelo: profesor.paralelo ? {
                      nombre: profesor.paralelo.nombre
                    } : undefined
                  } : undefined}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
