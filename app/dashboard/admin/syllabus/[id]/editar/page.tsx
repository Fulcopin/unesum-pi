"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function EditarSyllabusPage() {
  const params = useParams()
  const router = useRouter()
  const syllabusId = params.id as string
  const [activeTab, setActiveTab] = useState("datos-generales")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carga de datos - aquí se haría la petición a la API/BD
    const cargarDatos = async () => {
      // Datos de ejemplo - reemplazar con fetch real
      const syllabusExistente = {
        datosGenerales: {
          codigo: "TI-03",
          nombreAsignatura: "Fundamentos de Programación",
          prerrequisito: "S/N",
          correquisito: "S/N",
          facultad: "Ciencias Técnicas",
          carrera: "Tecnologías de la Información",
          unidadCurricular: "Unidad Básica",
          campoFormacion: "",
          campoAmplio: "TIC",
          campoEspecifico: "TIC",
          campoDetallado: "Diseño y Administración",
          modalidad: "presencial",
          periodoAcademico: "PI 2025",
          nivel: "I",
          paralelos: "A, B",
          horarioClases: "Paralelo A: miércoles: 9:30-11:30; viernes: 9:30-12:30",
          horarioTutorias: "Martes: 9:30 – 11:30; miércoles 14:30 – 16:30",
          profesor: "Lcdo. Fulco Pincay Ponce, Msig",
          perfilProfesor: "Docente Contratado de la Carrera de Tecnologías de la Información desde el 2021",
          totalHoras: "192",
          horasDocencia: "70",
          horasPFAE: "70",
          horasTA: "52",
          horasPPP: "0",
          horasVS: "0",
        },
        unidadesTemáticas: [
          {
            id: 1,
            nombre: "Análisis y diseño de algoritmos",
            sesiones: [
              {
                id: 1,
                numero: 1,
                contenidos: "Introducción a la programación y conceptos básicos de algoritmos",
                horasHD: "3",
                horasPFAE: "3",
                horasTA: "2",
                metodologias: "Aula Invertida, Aprendizaje basado en problemas",
                recursos: "Presentaciones, Libros, Software de programación",
                escenario: "Presencial-Áulico",
                bibliografia: "B.B.1, B.C.1",
                fechas: "12/05/2025 'A,B'",
              },
            ],
          },
        ],
        resultadosAprendizaje: [
          {
            id: 1,
            unidad: "UT 1: Análisis y diseño de algoritmos",
            contenidos: "Introducción a la programación, Estructuras de control, Variables y tipos de datos",
            resultados:
              "Diseñar algoritmos básicos utilizando estructuras de control fundamentales para resolver problemas computacionales simples",
            criterios: "Comprensión del Proceso, Aplicación de conceptos, Resolución de problemas",
            instrumentos: "Mapas mentales, Tareas individuales, Debates en clase, Rúbricas de evaluación",
          },
        ],
        visado: {
          decano: "Dr. Juan Pérez García",
          directorAcademico: "Msc. María López Sánchez",
          coordinadorCarrera: "Ing. Carlos Mendoza Torres",
          docente: "Lcdo. Fulco Pincay Ponce, Msig",
          fechaDecano: "2025-04-15",
          fechaDirector: "2025-04-18",
          fechaCoordinador: "2025-04-20",
          fechaDocente: "2025-04-10",
        },
      }

      setDatosGenerales(syllabusExistente.datosGenerales)
      setUnidadesTemáticas(syllabusExistente.unidadesTemáticas)
      setResultadosAprendizaje(syllabusExistente.resultadosAprendizaje)
      setVisado(syllabusExistente.visado)
      setLoading(false)
    }

    cargarDatos()
  }, [syllabusId])

  // Estado para Datos Generales
  const [datosGenerales, setDatosGenerales] = useState({
    codigo: "",
    nombreAsignatura: "",
    prerrequisito: "",
    correquisito: "",
    facultad: "",
    carrera: "",
    unidadCurricular: "",
    campoFormacion: "",
    campoAmplio: "",
    campoEspecifico: "",
    campoDetallado: "",
    modalidad: "",
    periodoAcademico: "",
    nivel: "",
    paralelos: "",
    horarioClases: "",
    horarioTutorias: "",
    profesor: "",
    perfilProfesor: "",
    totalHoras: "",
    horasDocencia: "",
    horasPFAE: "",
    horasTA: "",
    horasPPP: "",
    horasVS: "",
  })

  // Estado para Unidades Temáticas
  const [unidadesTemáticas, setUnidadesTemáticas] = useState<any[]>([])

  // Estado para Resultados de Aprendizaje
  const [resultadosAprendizaje, setResultadosAprendizaje] = useState<any[]>([])

  // Estado para Visado
  const [visado, setVisado] = useState({
    decano: "",
    directorAcademico: "",
    coordinadorCarrera: "",
    docente: "",
    fechaDecano: "",
    fechaDirector: "",
    fechaCoordinador: "",
    fechaDocente: "",
  })

  const handleSave = async () => {
    console.log("[v0] Actualizando syllabus:", {
      id: syllabusId,
      datosGenerales,
      unidadesTemáticas,
      resultadosAprendizaje,
      visado,
    })
    // Aquí iría la lógica para actualizar en la base de datos
    router.push(`/dashboard/admin/syllabus/${syllabusId}`)
  }

  const agregarUnidad = () => {
    setUnidadesTemáticas([
      ...unidadesTemáticas,
      {
        id: Date.now(),
        nombre: "",
        sesiones: [
          {
            id: Date.now(),
            numero: 1,
            contenidos: "",
            horasHD: "",
            horasPFAE: "",
            horasTA: "",
            metodologias: "",
            recursos: "",
            escenario: "",
            bibliografia: "",
            fechas: "",
          },
        ],
      },
    ])
  }

  const agregarSesion = (unidadId: number) => {
    setUnidadesTemáticas(
      unidadesTemáticas.map((unidad) => {
        if (unidad.id === unidadId) {
          return {
            ...unidad,
            sesiones: [
              ...unidad.sesiones,
              {
                id: Date.now(),
                numero: unidad.sesiones.length + 1,
                contenidos: "",
                horasHD: "",
                horasPFAE: "",
                horasTA: "",
                metodologias: "",
                recursos: "",
                escenario: "",
                bibliografia: "",
                fechas: "",
              },
            ],
          }
        }
        return unidad
      }),
    )
  }

  const agregarResultado = () => {
    setResultadosAprendizaje([
      ...resultadosAprendizaje,
      {
        id: Date.now(),
        unidad: "",
        contenidos: "",
        resultados: "",
        criterios: "",
        instrumentos: "",
      },
    ])
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["administrador"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center">Cargando...</div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/admin/syllabus/${syllabusId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-emerald-800">Editar Syllabus</h1>
                <p className="text-gray-600">Modifique la información del syllabus</p>
              </div>
            </div>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-gray-200 grid grid-cols-4 w-full">
              <TabsTrigger
                value="datos-generales"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                1. Datos Generales
              </TabsTrigger>
              <TabsTrigger
                value="estructura"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                2. Estructura
              </TabsTrigger>
              <TabsTrigger
                value="resultados"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                3. Resultados
              </TabsTrigger>
              <TabsTrigger
                value="visado"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                4. Visado
              </TabsTrigger>
            </TabsList>

            {/* DATOS GENERALES */}
            <TabsContent value="datos-generales" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Datos Generales y Específicos de la Asignatura</CardTitle>
                  <CardDescription>Información básica de la asignatura y el profesor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código de Asignatura *</Label>
                      <Input
                        id="codigo"
                        placeholder="Ej: TI-03"
                        value={datosGenerales.codigo}
                        onChange={(e) => setDatosGenerales({ ...datosGenerales, codigo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nombreAsignatura">Nombre de la Asignatura *</Label>
                      <Input
                        id="nombreAsignatura"
                        placeholder="Ej: Fundamentos de Programación"
                        value={datosGenerales.nombreAsignatura}
                        onChange={(e) => setDatosGenerales({ ...datosGenerales, nombreAsignatura: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Resto de los campos de datos generales igual que en nuevo/page.tsx */}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="prerrequisito">Prerrequisito</Label>
                      <Input
                        id="prerrequisito"
                        value={datosGenerales.prerrequisito}
                        onChange={(e) => setDatosGenerales({ ...datosGenerales, prerrequisito: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="correquisito">Correquisito</Label>
                      <Input
                        id="correquisito"
                        value={datosGenerales.correquisito}
                        onChange={(e) => setDatosGenerales({ ...datosGenerales, correquisito: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="facultad">Facultad *</Label>
                      <Input
                        id="facultad"
                        value={datosGenerales.facultad}
                        onChange={(e) => setDatosGenerales({ ...datosGenerales, facultad: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carrera">Carrera *</Label>
                      <Input
                        id="carrera"
                        value={datosGenerales.carrera}
                        onChange={(e) => setDatosGenerales({ ...datosGenerales, carrera: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profesor">Profesor que Imparte la Asignatura</Label>
                    <Input
                      id="profesor"
                      value={datosGenerales.profesor}
                      onChange={(e) => setDatosGenerales({ ...datosGenerales, profesor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="perfilProfesor">Perfil del Profesor</Label>
                    <Textarea
                      id="perfilProfesor"
                      value={datosGenerales.perfilProfesor}
                      onChange={(e) => setDatosGenerales({ ...datosGenerales, perfilProfesor: e.target.value })}
                      rows={5}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => setActiveTab("estructura")} className="bg-emerald-600 hover:bg-emerald-700">
                  Siguiente: Estructura
                </Button>
              </div>
            </TabsContent>

            {/* ESTRUCTURA - Similar al formulario de nuevo */}
            <TabsContent value="estructura" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Estructura de la Asignatura</CardTitle>
                      <CardDescription>Unidades temáticas, contenidos y sesiones</CardDescription>
                    </div>
                    <Button onClick={agregarUnidad} variant="outline" className="text-emerald-600 bg-transparent">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Unidad
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {unidadesTemáticas.map((unidad, unidadIndex) => (
                    <div key={unidad.id} className="border border-gray-200 rounded-lg p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-emerald-800">Unidad Temática {unidadIndex + 1}</h3>
                        {unidadesTemáticas.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 bg-transparent"
                            onClick={() => setUnidadesTemáticas(unidadesTemáticas.filter((u) => u.id !== unidad.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Nombre de la Unidad</Label>
                        <Input
                          value={unidad.nombre}
                          onChange={(e) =>
                            setUnidadesTemáticas(
                              unidadesTemáticas.map((u) => (u.id === unidad.id ? { ...u, nombre: e.target.value } : u)),
                            )
                          }
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">Sesiones</h4>
                          <Button onClick={() => agregarSesion(unidad.id)} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Sesión
                          </Button>
                        </div>

                        {unidad.sesiones.map((sesion: any) => (
                          <div key={sesion.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
                            <h5 className="font-medium text-gray-700">Sesión #{sesion.numero}</h5>
                            <div className="space-y-2">
                              <Label>Contenidos</Label>
                              <Textarea
                                value={sesion.contenidos}
                                onChange={(e) =>
                                  setUnidadesTemáticas(
                                    unidadesTemáticas.map((u) =>
                                      u.id === unidad.id
                                        ? {
                                            ...u,
                                            sesiones: u.sesiones.map((s: any) =>
                                              s.id === sesion.id ? { ...s, contenidos: e.target.value } : s,
                                            ),
                                          }
                                        : u,
                                    ),
                                  )
                                }
                                rows={3}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button onClick={() => setActiveTab("datos-generales")} variant="outline">
                  Anterior
                </Button>
                <Button onClick={() => setActiveTab("resultados")} className="bg-emerald-600 hover:bg-emerald-700">
                  Siguiente: Resultados
                </Button>
              </div>
            </TabsContent>

            {/* RESULTADOS - Similar al formulario de nuevo */}
            <TabsContent value="resultados" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Resultados y Evaluación</CardTitle>
                      <CardDescription>Resultados de aprendizaje y criterios de evaluación</CardDescription>
                    </div>
                    <Button onClick={agregarResultado} variant="outline" className="text-emerald-600 bg-transparent">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Resultado
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {resultadosAprendizaje.map((resultado, index) => (
                    <div key={resultado.id} className="border border-gray-200 rounded-lg p-6 space-y-4">
                      <h3 className="text-lg font-semibold text-emerald-800">Resultado {index + 1}</h3>
                      <div className="space-y-2">
                        <Label>Unidad Temática</Label>
                        <Input
                          value={resultado.unidad}
                          onChange={(e) =>
                            setResultadosAprendizaje(
                              resultadosAprendizaje.map((r) =>
                                r.id === resultado.id ? { ...r, unidad: e.target.value } : r,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Resultados de Aprendizaje</Label>
                        <Textarea
                          value={resultado.resultados}
                          onChange={(e) =>
                            setResultadosAprendizaje(
                              resultadosAprendizaje.map((r) =>
                                r.id === resultado.id ? { ...r, resultados: e.target.value } : r,
                              ),
                            )
                          }
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button onClick={() => setActiveTab("estructura")} variant="outline">
                  Anterior
                </Button>
                <Button onClick={() => setActiveTab("visado")} className="bg-emerald-600 hover:bg-emerald-700">
                  Siguiente: Visado
                </Button>
              </div>
            </TabsContent>

            {/* VISADO */}
            <TabsContent value="visado" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visado del Syllabus</CardTitle>
                  <CardDescription>Firmas y fechas de aprobación</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="decano">Decano/a de Facultad</Label>
                      <Input
                        id="decano"
                        value={visado.decano}
                        onChange={(e) => setVisado({ ...visado, decano: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaDecano">Fecha</Label>
                      <Input
                        id="fechaDecano"
                        type="date"
                        value={visado.fechaDecano}
                        onChange={(e) => setVisado({ ...visado, fechaDecano: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="directorAcademico">Director/a Académico/a</Label>
                      <Input
                        id="directorAcademico"
                        value={visado.directorAcademico}
                        onChange={(e) => setVisado({ ...visado, directorAcademico: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaDirector">Fecha</Label>
                      <Input
                        id="fechaDirector"
                        type="date"
                        value={visado.fechaDirector}
                        onChange={(e) => setVisado({ ...visado, fechaDirector: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="coordinadorCarrera">Coordinador/a de Carrera</Label>
                      <Input
                        id="coordinadorCarrera"
                        value={visado.coordinadorCarrera}
                        onChange={(e) => setVisado({ ...visado, coordinadorCarrera: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaCoordinador">Fecha</Label>
                      <Input
                        id="fechaCoordinador"
                        type="date"
                        value={visado.fechaCoordinador}
                        onChange={(e) => setVisado({ ...visado, fechaCoordinador: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="docente">Docente</Label>
                      <Input
                        id="docente"
                        value={visado.docente}
                        onChange={(e) => setVisado({ ...visado, docente: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaDocente">Fecha</Label>
                      <Input
                        id="fechaDocente"
                        type="date"
                        value={visado.fechaDocente}
                        onChange={(e) => setVisado({ ...visado, fechaDocente: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button onClick={() => setActiveTab("resultados")} variant="outline">
                  Anterior
                </Button>
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  )
}
