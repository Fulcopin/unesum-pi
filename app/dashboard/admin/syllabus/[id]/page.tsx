"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, FileText, Download, Edit, BookOpen, Target, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { MainHeader } from "@/components/layout/main-header"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function SyllabusDetailPage() {
  const params = useParams()
  const router = useRouter()
  const syllabusId = params.id as string

  const syllabus = {
    id: syllabusId,
    // Datos Generales
    codigo: "TI-03",
    nombre: "Fundamentos de Programación",
    prerrequisito: "S/N",
    correquisito: "S/N",
    facultad: "Ciencias Técnicas",
    carrera: "Tecnologías de la Información",
    unidadCurricular: "Unidad Básica",
    campoAmplio: "TIC",
    campoEspecifico: "TIC",
    campoDetallado: "Diseño y Administración",
    modalidad: "Presencial",
    periodo: "PI 2025",
    nivel: "I",
    paralelos: "A, B",
    horarioClases: "Paralelo A: miércoles: 9:30-11:30; viernes: 9:30-12:30",
    horarioTutorias: "Martes: 9:30 – 11:30; miércoles 14:30 – 16:30",
    profesor: "Lcdo. Fulco Pincay Ponce, Msig",
    perfilProfesor: "Docente Contratado de la Carrera de Tecnologías de la Información desde el 2021",
    totalHoras: 192,
    horasDocencia: 70,
    horasPFAE: 70,
    horasTA: 52,
    horasPPP: 0,
    horasVS: 0,
    fileUrl: "#",
    fileName: "syllabus-fundamentos-programacion.pdf",

    // Estructura de la Asignatura - Unidades Temáticas
    unidades: [
      {
        id: 1,
        nombre: "Análisis y diseño de algoritmos",
        sesiones: [
          {
            numero: 1,
            contenidos: "Introducción a la programación y conceptos básicos de algoritmos",
            horasHD: 3,
            horasPFAE: 3,
            horasTA: 2,
            metodologias: "Aula Invertida, Aprendizaje basado en problemas",
            recursos: "Presentaciones, Libros, Software de programación",
            escenario: "Presencial-Áulico",
            bibliografia: "B.B.1, B.C.1",
            fechas: "12/05/2025 'A,B'",
          },
          {
            numero: 2,
            contenidos: "Estructuras de control: condicionales y bucles",
            horasHD: 4,
            horasPFAE: 4,
            horasTA: 3,
            metodologias: "Aprendizaje colaborativo, Práctica guiada",
            recursos: "IDE, Ejercicios prácticos, Videos tutoriales",
            escenario: "Presencial-Laboratorio",
            bibliografia: "B.B.1, B.C.2",
            fechas: "19/05/2025 'A,B'",
          },
        ],
      },
      {
        id: 2,
        nombre: "Programación estructurada",
        sesiones: [
          {
            numero: 3,
            contenidos: "Funciones y procedimientos",
            horasHD: 3,
            horasPFAE: 3,
            horasTA: 2,
            metodologias: "Aprendizaje basado en proyectos",
            recursos: "Entorno de desarrollo, Documentación técnica",
            escenario: "Presencial-Laboratorio",
            bibliografia: "B.B.2, B.C.3",
            fechas: "26/05/2025 'A,B'",
          },
        ],
      },
    ],

    // Resultados de Aprendizaje
    resultados: [
      {
        id: 1,
        unidad: "UT 1: Análisis y diseño de algoritmos",
        contenidos: "Introducción a la programación, Estructuras de control, Variables y tipos de datos",
        resultados:
          "Diseñar algoritmos básicos utilizando estructuras de control fundamentales para resolver problemas computacionales simples",
        criterios: "Comprensión del Proceso, Aplicación de conceptos, Resolución de problemas",
        instrumentos: "Mapas mentales, Tareas individuales, Debates en clase, Rúbricas de evaluación",
      },
      {
        id: 2,
        unidad: "UT 2: Programación estructurada",
        contenidos: "Funciones, Procedimientos, Modularización del código",
        resultados:
          "Implementar programas estructurados aplicando principios de modularización y reutilización de código",
        criterios: "Calidad del código, Documentación, Funcionalidad",
        instrumentos: "Proyectos prácticos, Revisión de código, Pruebas de funcionalidad",
      },
    ],

    // Visado
    visado: {
      decano: "Dr. Juan Pérez García",
      fechaDecano: "2025-04-15",
      directorAcademico: "Msc. María López Sánchez",
      fechaDirector: "2025-04-18",
      coordinadorCarrera: "Ing. Carlos Mendoza Torres",
      fechaCoordinador: "2025-04-20",
      docente: "Lcdo. Fulco Pincay Ponce, Msig",
      fechaDocente: "2025-04-10",
    },
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin/syllabus">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-emerald-800">{syllabus.nombre}</h1>
                <p className="text-gray-600 mt-1">
                  Código: {syllabus.codigo} • Periodo: {syllabus.periodo}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-transparent"
                onClick={() => window.open(syllabus.fileUrl, "_blank")}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
              <Link href={`/dashboard/admin/syllabus/${syllabusId}/editar`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
            </div>
          </div>

          <Tabs defaultValue="datos-generales" className="space-y-6">
            <TabsList className="bg-white border border-gray-200 grid grid-cols-4 w-full">
              <TabsTrigger
                value="datos-generales"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Datos Generales
              </TabsTrigger>
              <TabsTrigger
                value="estructura"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Estructura
              </TabsTrigger>
              <TabsTrigger
                value="resultados"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                <Target className="h-4 w-4 mr-2" />
                Resultados
              </TabsTrigger>
              <TabsTrigger
                value="visado"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Visado
              </TabsTrigger>
            </TabsList>

            {/* DATOS GENERALES */}
            <TabsContent value="datos-generales" className="space-y-6">
              <Card className="border-emerald-200">
                <CardHeader className="bg-emerald-50">
                  <CardTitle className="text-emerald-700">Datos Generales y Específicos de la Asignatura</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-semibold text-emerald-700">Código de Asignatura</label>
                      <p className="mt-1 text-gray-900">{syllabus.codigo}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-emerald-700">Nombre de la Asignatura</label>
                      <p className="mt-1 text-gray-900">{syllabus.nombre}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-emerald-700">Prerrequisito</label>
                      <p className="mt-1 text-gray-900">{syllabus.prerrequisito}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-emerald-700">Correquisito</label>
                      <p className="mt-1 text-gray-900">{syllabus.correquisito}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-emerald-700">Facultad</label>
                      <p className="mt-1 text-gray-900">{syllabus.facultad}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-emerald-700">Carrera</label>
                      <p className="mt-1 text-gray-900">{syllabus.carrera}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-emerald-700">Unidad Curricular</label>
                      <p className="mt-1 text-gray-900">{syllabus.unidadCurricular}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-emerald-700">Modalidad</label>
                      <p className="mt-1 text-gray-900">{syllabus.modalidad}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-emerald-200">
                    <h3 className="font-semibold text-emerald-700 mb-4">Campo de Formación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Campo Amplio</label>
                        <p className="mt-1 text-gray-900">{syllabus.campoAmplio}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Campo Específico</label>
                        <p className="mt-1 text-gray-900">{syllabus.campoEspecifico}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Campo Detallado</label>
                        <p className="mt-1 text-gray-900">{syllabus.campoDetallado}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-emerald-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Periodo Académico</label>
                        <p className="mt-1 text-gray-900">{syllabus.periodo}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Nivel</label>
                        <p className="mt-1 text-gray-900">{syllabus.nivel}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Paralelo/s</label>
                        <p className="mt-1 text-gray-900">{syllabus.paralelos}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-emerald-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Horario de Clases</label>
                        <p className="mt-1 text-gray-900 whitespace-pre-line">{syllabus.horarioClases}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Horario para Tutorías</label>
                        <p className="mt-1 text-gray-900 whitespace-pre-line">{syllabus.horarioTutorias}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-emerald-200">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">
                          Profesor que Imparte la Asignatura
                        </label>
                        <p className="mt-1 text-gray-900">{syllabus.profesor}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-emerald-700">Perfil del Profesor</label>
                        <p className="mt-1 text-gray-900">{syllabus.perfilProfesor}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-emerald-200">
                    <h3 className="font-semibold text-emerald-700 mb-4">Distribución de Horas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <p className="text-xs text-emerald-700 mb-1">Total</p>
                        <p className="text-2xl font-bold text-emerald-900">{syllabus.totalHoras}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <p className="text-xs text-emerald-700 mb-1">Docencia</p>
                        <p className="text-2xl font-bold text-emerald-900">{syllabus.horasDocencia}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <p className="text-xs text-emerald-700 mb-1">PFAE</p>
                        <p className="text-2xl font-bold text-emerald-900">{syllabus.horasPFAE}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <p className="text-xs text-emerald-700 mb-1">Autónomo</p>
                        <p className="text-2xl font-bold text-emerald-900">{syllabus.horasTA}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <p className="text-xs text-emerald-700 mb-1">PPP</p>
                        <p className="text-2xl font-bold text-emerald-900">{syllabus.horasPPP}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <p className="text-xs text-emerald-700 mb-1">VS</p>
                        <p className="text-2xl font-bold text-emerald-900">{syllabus.horasVS}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ESTRUCTURA DE LA ASIGNATURA */}
            <TabsContent value="estructura" className="space-y-6">
              <Card className="border-emerald-200">
                <CardHeader className="bg-emerald-50">
                  <CardTitle className="text-emerald-700">Estructura de la Asignatura - Unidades Temáticas</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  {syllabus.unidades.map((unidad, unidadIndex) => (
                    <div key={unidad.id} className="border border-gray-200 rounded-lg p-6 space-y-6">
                      <div className="bg-emerald-50 p-4 rounded-lg">
                        <h3 className="text-lg font-bold text-emerald-800">
                          Unidad Temática {unidadIndex + 1}: {unidad.nombre}
                        </h3>
                      </div>

                      <div className="space-y-6">
                        {unidad.sesiones.map((sesion) => (
                          <div key={sesion.numero} className="bg-gray-50 rounded-lg p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                              <h4 className="font-semibold text-gray-900">Sesión #{sesion.numero}</h4>
                              <div className="flex gap-4 text-sm">
                                <span className="text-emerald-700">
                                  <strong>HD:</strong> {sesion.horasHD}h
                                </span>
                                <span className="text-emerald-700">
                                  <strong>PFAE:</strong> {sesion.horasPFAE}h
                                </span>
                                <span className="text-emerald-700">
                                  <strong>TA:</strong> {sesion.horasTA}h
                                </span>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-semibold text-gray-700">Contenidos</label>
                                <p className="mt-1 text-gray-900 text-sm">{sesion.contenidos}</p>
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-700">Metodologías</label>
                                <p className="mt-1 text-gray-900 text-sm">{sesion.metodologias}</p>
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-700">Recursos Didácticos</label>
                                <p className="mt-1 text-gray-900 text-sm">{sesion.recursos}</p>
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-700">Escenario</label>
                                <p className="mt-1 text-gray-900 text-sm">{sesion.escenario}</p>
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-700">Bibliografía</label>
                                <p className="mt-1 text-gray-900 text-sm">{sesion.bibliografia}</p>
                              </div>
                              <div>
                                <label className="text-sm font-semibold text-gray-700">Fecha/Paralelo</label>
                                <p className="mt-1 text-gray-900 text-sm">{sesion.fechas}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* RESULTADOS DE APRENDIZAJE */}
            <TabsContent value="resultados" className="space-y-6">
              <Card className="border-emerald-200">
                <CardHeader className="bg-emerald-50">
                  <CardTitle className="text-emerald-700">Resultados y Evaluación de los Aprendizajes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {syllabus.resultados.map((resultado, index) => (
                    <div key={resultado.id} className="border border-gray-200 rounded-lg p-6 space-y-4">
                      <div className="bg-emerald-50 p-3 rounded-lg">
                        <h3 className="font-semibold text-emerald-800">Resultado de Aprendizaje {index + 1}</h3>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-emerald-700">Unidad Temática</label>
                          <p className="mt-1 text-gray-900">{resultado.unidad}</p>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-emerald-700">Contenidos</label>
                          <p className="mt-1 text-gray-900">{resultado.contenidos}</p>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-emerald-700">Resultados de Aprendizaje</label>
                          <p className="mt-1 text-gray-900">{resultado.resultados}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-semibold text-emerald-700">Criterios de Evaluación</label>
                            <p className="mt-1 text-gray-900">{resultado.criterios}</p>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-emerald-700">Instrumentos de Evaluación</label>
                            <p className="mt-1 text-gray-900">{resultado.instrumentos}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* VISADO */}
            <TabsContent value="visado" className="space-y-6">
              <Card className="border-emerald-200">
                <CardHeader className="bg-emerald-50">
                  <CardTitle className="text-emerald-700">Visado del Syllabus</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-gray-900">Decano/a de Facultad</h3>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Nombre</label>
                        <p className="mt-1 text-gray-900">{syllabus.visado.decano}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Fecha de Aprobación</label>
                        <p className="mt-1 text-gray-900">
                          {new Date(syllabus.visado.fechaDecano).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-gray-900">Director/a Académico/a</h3>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Nombre</label>
                        <p className="mt-1 text-gray-900">{syllabus.visado.directorAcademico}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Fecha de Aprobación</label>
                        <p className="mt-1 text-gray-900">
                          {new Date(syllabus.visado.fechaDirector).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-gray-900">Coordinador/a de Carrera</h3>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Nombre</label>
                        <p className="mt-1 text-gray-900">{syllabus.visado.coordinadorCarrera}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Fecha de Aprobación</label>
                        <p className="mt-1 text-gray-900">
                          {new Date(syllabus.visado.fechaCoordinador).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-gray-900">Docente</h3>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Nombre</label>
                        <p className="mt-1 text-gray-900">{syllabus.visado.docente}</p>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Fecha de Elaboración</label>
                        <p className="mt-1 text-gray-900">
                          {new Date(syllabus.visado.fechaDocente).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-emerald-900 mb-1">Syllabus Aprobado</h4>
                        <p className="text-sm text-emerald-800">
                          Este syllabus ha sido revisado y aprobado por todas las autoridades académicas
                          correspondientes.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  )
}
