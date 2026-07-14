"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
// --- 1. IMPORTA EL NUEVO ICONO ---
import {
  Users, BookOpen, Activity, Calendar, FileSpreadsheet, Settings, Edit3, FileText, Library, LucideCamera, LucideAlarmClock, LucideActivity, LucideActivitySquare, LucideAirVent, LucideArchiveRestore, GraduationCap,
  Grid3x3,
  ClipboardList,
  LucideAccessibility,
  LucideAirplay,
  LucideArchive,
  Upload,
  Sparkles,
  Bot,
  ClipboardEdit,
  ShieldCheck,
  Pen,
  QrCode,
  UserPlus,
} from "lucide-react"
import Link from "next/link"
import { useModulosOcultos } from "@/lib/use-modulos-ocultos"

export default function AdminDashboard() {
  // Opciones que el cronograma tiene fuera de plazo se ocultan del menú
  const { estaOculto } = useModulosOcultos()

  const adminModules = [
    {
      title: "Mis Documentos para Firmar",
      description: "Ve todos los documentos pendientes de tu firma (syllabus y programas analíticos) y fírmalos de inmediato",
      icon: Pen,
      href: "/dashboard/admin/mis-firmas",
      color: "bg-indigo-700",
      destacado: true,
    },
    {
      title: "Mi QR Personal",
      description: "Ver y descargar tu sello digital personal de identidad para firmar documentos",
      icon: QrCode,
      href: "/dashboard/admin/mi-qr",
      color: "bg-purple-500",
    },
    {
      title: "Gestión de Usuarios",
      description: "Registrar y administrar todos los usuarios del sistema (docentes, decanos, comisión, dirección, etc.)",
      icon: UserPlus,
      href: "/dashboard/admin/usuarios",
      color: "bg-orange-500",
    },
    {
      title: "Gestión de Roles",
      description: "Crear y administrar los roles del sistema de las personas que manipulan el programa",
      icon: Users,
      href: "/dashboard/admin/users",
      color: "bg-cyan-500",
    },
    {
      title: "Paralelo",
      description: "Crear Paralelos",
      icon: LucideCamera,
      href: "/dashboard/admin/paralelo",
      color: "bg-purple-500",
    },
    {
      title: "Periodo",
      description: "Crear Periodo",
      icon: LucideArchive,
      href: "/dashboard/admin/periodo",
      color: "bg-orange-500",
    },
    {
      title: "Organización",
      description: "Crear Unidad de organización curricular ",
      icon: LucideAccessibility,
      href: "/dashboard/admin/organizacion",
      color: "bg-cyan-500",
    },
    {
      title: "Metodologías",
      description: "Crear el catálogo de metodologías de enseñanza-aprendizaje para el syllabus",
      icon: ClipboardList,
      href: "/dashboard/admin/metodologia",
      color: "bg-emerald-500",
    },
    {
      title: "Escenarios de Aprendizaje",
      description: "Crear el catálogo de escenarios (Áulico, Virtual, Laboratorio…) para el syllabus",
      icon: LucideAirVent,
      href: "/dashboard/admin/escenario",
      color: "bg-teal-500",
    },
    {
      title: "Campo de Formación",
      description: "Crear los campos de formación de carrera ",
      icon: LucideAirplay,
      href: "/dashboard/admin/campo-formacion",
      color: "bg-purple-500",
    },
    /*{
      title: "Syllabus de Asignaturas",
      description: "Crear, editar y gestionar syllabus de asignaturas",
      icon: FileText,
      href: "/dashboard/admin/syllabus",
      color: "bg-orange-500",
    },*/
    /*{
      title: "Syllabus",
      description: "Gestionar Syllabus",
      icon: Sparkles,
      href: "/dashboard/admin/syllabus/extraer-titulos",
      color: "bg-orange-500",
    },*/
    {
      title: "Funciones Sustantivas",
      description: "Registrar y gestionar funciones sustantivas",
      icon: BookOpen,
      href: "/dashboard/admin/funciones-sustantivas",
      color: "bg-orange-500",
    },
    {
      title: "Gestión de Docentes",
      description: "Administrar información de docentes",
      icon: Users,
      href: "/dashboard/admin/docentes",
      color: "bg-cyan-500",

    },
    {
      title: "Actividades Extracurriculares",
      description: "Gestionar actividades y seguimiento",
      icon: LucideActivitySquare,
      href: "/dashboard/admin/actividades",
      color: "bg-purple-500",
    },

    /*{
      title: "Malla Curricular",
      description: "Malla Curricular",
      icon: FileSpreadsheet,
      href: "/dashboard/admin/import",
      color: "bg-green-500",
    },*/
    {
      title: "Programa Analítico",
      description: "Configuración de Programa Analíticos",
      icon: ClipboardList,
      href: "/dashboard/admin/programa-analitico",
      color: "bg-orange-500",
    },

    // --- 2. AÑADE EL NUEVO MÓDULO AQUÍ ---
    {
      title: "Syllabus",
      description: "Configuración de Syllabus",
      icon: FileText,
      href: "/dashboard/admin/editor-syllabus",
      color: "bg-cyan-500",
    },
    /*{
      title: "Configuración",
      description: "Configuración general del sistema",
      icon: LucideAirVent,
      href: "/dashboard/admin/settings",
      color: "bg-purple-500",
    },*/
    {
      title: "Facultades y Carreras",
      description: "Ingresa facultades y carreras académicas",
      icon: Library,
      href: "/dashboard/admin/gestion-academica",
      color: "bg-purple-500",
    },
    {
      title: "Niveles",
      description: "Ingresa Niveles",
      icon: LucideAlarmClock,
      href: "/dashboard/admin/niveles",
      color: "bg-orange-500",
    },
    {
      title: "Malla -  Asignaturas",
      description: "Asignaturas de la Malla de la Carrera",
      icon: GraduationCap,
      href: "/dashboard/admin/asignaturas/registro",
      color: "bg-cyan-500",
    },
    {
      title: "Malla Curricular",
      description: "Visualiza la malla curricular",
      icon: Grid3x3,
      href: "/dashboard/admin/malla-curricular",
      color: "bg-purple-500",
    },
    {
      title: "Cronograma Institucional",
      description: "Gestionar actividades para docentes y personal",
      icon: Calendar,
      href: "/dashboard/admin/cronograma",
      color: "bg-orange-500",
    },
    {
      title: "Planificación Académica",
      description: "Gestionar planificación Académica ",
      icon: ClipboardList,
      href: "/dashboard/admin/planificacion-academica",
      color: "bg-orange-500",
    },
    {
      title: "Asignaturas",
      description: "Gestiona Asignaturas",
      icon: ClipboardEdit,
      href: "/dashboard/admin/materias",
      color: "bg-cyan-500",
    },

    /* {
       title: "Asistente IA",
       description: "Consulta documentos curriculares con IA · Subir PDFs, gestionar índice y hacer preguntas",
       icon: Bot,
       href: "/dashboard/admin/asistente-ia",
       color: "bg-violet-600",
     },*/
  ]

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
            <p className="text-gray-600">Gestiona todos los aspectos del sistema académico</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminModules.filter((module) => !estaOculto(module.href)).map((module) => {
              const IconComponent = module.icon
              const esDestacado = (module as any).destacado
              return (
                <Card
                  key={module.href}
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${esDestacado ? 'border-indigo-300 bg-indigo-50 md:col-span-2 lg:col-span-3' : ''
                    }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${module.color} text-white`}>
                        <IconComponent className={esDestacado ? "h-8 w-8" : "h-6 w-6"} />
                      </div>
                      <div>
                        <CardTitle className={esDestacado ? "text-xl" : "text-lg"}>{module.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{module.description}</CardDescription>
                    <Link href={module.href}>
                      <Button
                        className={`w-full ${esDestacado
                          ? 'bg-indigo-700 hover:bg-indigo-800 text-base py-5'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                      >
                        {esDestacado ? 'Ver mis documentos pendientes →' : 'Acceder'}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}