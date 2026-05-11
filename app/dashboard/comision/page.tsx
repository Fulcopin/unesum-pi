"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileCheck, Upload, Sparkles, GitCompare, FileText, BookOpen, School, Bot, Pen, QrCode, Users } from "lucide-react"
import Link from "next/link"

export default function ComisionDashboard() {
  const comisionModules = [
    {
      title: "Mis Documentos para Firmar",
      description: "Ve todos los documentos pendientes de tu firma y fírmalos de inmediato con tu QR personal",
      icon: Pen,
      href: "/dashboard/comision/mis-firmas",
      color: "bg-indigo-700",
      featured: true,
      destacado: true,
    },
    {
      title: "Mi QR Personal",
      description: "Ver y descargar tu sello digital personal de identidad para firmar documentos",
      icon: QrCode,
      href: "/dashboard/comision/mi-qr",
      color: "bg-emerald-600",
      featured: true,
    },
    /*{
      title: "Editor de Syllabus",
      description: "Crear y editar syllabus con pestañas personalizables y tablas interactivas",
      icon: FileText,
      href: "/dashboard/comision/editor-syllabus",
      color: "bg-emerald-500",
      featured: true,
    },*/
   /* {
      title: "Editor de Programa Analítico",
      description: "Crear y editar programas analíticos con pestañas personalizables y tablas interactivas",
      icon: BookOpen,
      href: "/dashboard/comision/editor-programa-analitico",
      color: "bg-blue-500",
      featured: true,
    },*/
    {
      title: "Gestión de Asignaturas",
      description: "Gestiona asignaturas de tu facultad y crea syllabus y programas analíticos",
      icon: School,
      href: "/dashboard/comision/asignaturas",
      color: "bg-indigo-500",
      featured: true,
    },
    {
      title: "Documentos de Docentes",
      description: "Ve todos los syllabus y programas analíticos subidos por los docentes, organizados por materia y nivel",
      icon: Users,
      href: "/dashboard/comision/documentos-docentes",
      color: "bg-teal-600",
      featured: true,
    },
    /*{
      title: "Extracción Programa Analítico",
      description: "Extrae y gestiona programas analíticos de archivos Excel/Word",
      icon: Upload,
      href: "/dashboard/comision/programa-analitico",
      color: "bg-blue-400",
    },
    {
      title: "Extracción Syllabus",
      description: "Extrae y organiza syllabus desde documentos",
      icon: Sparkles,
      href: "/dashboard/comision/syllabus",
      color: "bg-purple-500",
    },
    {
      title: "Comparar Documentos",
      description: "Compara títulos entre Programa Analítico y Syllabus",
      icon: GitCompare,
      href: "/dashboard/comision/comparar-documentos",
      color: "bg-orange-500",
    },
    {
      title: "Syllabus Extraídos",
      description: "Revisar y validar formularios de Syllabus extraídos",
      icon: FileCheck,
      href: "/dashboard/comision/syllabus-formularios",
      color: "bg-violet-500",
    },
    {
      title: "Asistente IA",
      description: "Consulta documentos curriculares con IA · Subir PDFs y hacer preguntas sobre mallas y syllabus",
      icon: Bot,
      href: "/dashboard/comision/asistente-ia",
      color: "bg-emerald-600",
    },*/
  ]

  return (
    <ProtectedRoute allowedRoles={["comision", "comision_academica"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="w-full px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Comisión Académica</h1>
            <p className="text-gray-600">Gestión, supervisión y edición de documentos académicos</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comisionModules.map((module) => {
              const IconComponent = module.icon
              const esDestacado = (module as any).destacado
              return (
                <Card
                  key={module.href}
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    esDestacado
                      ? 'border-indigo-300 bg-indigo-50 md:col-span-2 lg:col-span-3'
                      : 'border-2 border-emerald-100'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${module.color} text-white`}>
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
                        className={`w-full ${
                          esDestacado
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
