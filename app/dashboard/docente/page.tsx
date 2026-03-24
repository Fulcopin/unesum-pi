"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Activity, User, Calendar, FileText, FileSpreadsheet, ListChecks, FileCheck, Bot } from "lucide-react"
import Link from "next/link"

export default function DocenteDashboard() {
  const docenteModules = [
    {
      title: "Editor de Syllabus",
      description: "Ver y completar el syllabus de mi asignatura",
      icon: FileText,
      href: "/dashboard/docente/editor-syllabus",
      color: "bg-emerald-500",
    },
    {
      title: "Editor Programa Analítico",
      description: "Editar el programa analítico de mi asignatura",
      icon: FileCheck,
      href: "/dashboard/docente/editor-programa-analitico",
      color: "bg-blue-500",
    },
    {
      title: "Horas Extracurriculares",
      description: "Registrar y gestionar mis Horas Extracurriculares",
      icon: BookOpen,
      href: "/dashboard/docente/Horas_Extracurriculares",
      color: "bg-teal-500",
    },
    {
      title: "Formularios Dinámicos",
      description: "Completar formularios basados en plantillas del administrador",
      icon: FileSpreadsheet,
      href: "/dashboard/docente/formularios",
      color: "bg-indigo-500",
    },
    {
      title: "Formularios Extraídos",
      description: "Completar formularios generados desde archivos Excel/Word",
      icon: ListChecks,
      href: "/dashboard/docente/formularios-dinamicos",
      color: "bg-violet-500",
    },
    {
      title: "Syllabus Extraídos",
      description: "Ver y completar formularios de Syllabus extraídos",
      icon: FileCheck,
      href: "/dashboard/docente/syllabus-formularios",
      color: "bg-cyan-500",
    },
    {
      title: "Mi Perfil",
      description: "Actualizar información personal y académica",
      icon: User,
      href: "/dashboard/docente/perfil",
      color: "bg-purple-500",
    },
    {
      title: "Plan de Trabajo Docente",
      description: "Planificación de trabajo docente",
      icon: Calendar,
      href: "/dashboard/docente/plan_trabajo",
      color: "bg-orange-500",
    },
    {
      title: "Planifición de Actividades Docentes",
      description: "Generar reportes de mis actividades docentes",
      icon: FileText,
      href: "/dashboard/docente/reportes",
      color: "bg-red-500",
    },
    {
      title: "Asistente IA",
      description: "Consulta información curricular con inteligencia artificial",
      icon: Bot,
      href: "/dashboard/docente/asistente-ia",
      color: "bg-blue-600",
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente", "comision"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Docente</h1>
            <p className="text-gray-600">Gestiona tus actividades académicas y funciones sustantivas</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docenteModules.map((module) => {
              const IconComponent = module.icon
              return (
                <Card key={module.href} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${module.color} text-white`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{module.description}</CardDescription>
                    <Link href={module.href}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Acceder</Button>
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
