"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, Activity, BarChart3, Calendar, FileText, ScrollText, ClipboardSignature, PenLine, QrCode, Pen, Unlock } from "lucide-react"
import Link from "next/link"

export default function DecanosDashboard() {
  const decanoModules = [
    {
      title: "Mis Documentos para Firmar",
      description: "Ve todos los documentos pendientes de tu firma (syllabus y programas analíticos) y fírmalos de inmediato",
      icon: Pen,
      href: "/dashboard/decano/mis-firmas",
      color: "bg-indigo-700",
      destacado: true,
    },
    {
      title: "Autorizar Habilitaciones de Docentes",
      description: "Aprueba o rechaza las solicitudes de los coordinadores para reabrirle el syllabus a un docente fuera de plazo",
      icon: Unlock,
      href: "/dashboard/decano/autorizaciones",
      color: "bg-amber-600",
    },
    {
      title: "Firmar documentos (masivo)",
      description: "Selecciona y firma todos los syllabus y programas analíticos pendientes de una sola vez",
      icon: PenLine,
      href: "/dashboard/decano/firmar-documentos",
      color: "bg-blue-700",
    },
    {
      title: "Mi QR personal",
      description: "Ver y descargar tu sello digital personal para firmar documentos",
      icon: QrCode,
      href: "/dashboard/decano/mi-qr",
      color: "bg-emerald-600",
    },
    {
      title: "Firmar Syllabus",
      description: "Revisar y firmar con QR los syllabus por nivel",
      icon: ClipboardSignature,
      href: "/dashboard/decano/syllabus",
      color: "bg-blue-600",
    },
    {
      title: "Firmar Programas Analíticos",
      description: "Revisar y firmar con QR los programas analíticos por nivel",
      icon: ScrollText,
      href: "/dashboard/decano/programa-analitico",
      color: "bg-indigo-600",
    },
    {
      title: "Gestión de Docentes",
      description: "Administrar docentes de la facultad",
      icon: Users,
      href: "/dashboard/decano/docentes",
      color: "bg-blue-500",
    },
    {
      title: "Funciones Sustantivas",
      description: "Supervisar funciones sustantivas de la facultad",
      icon: BookOpen,
      href: "/dashboard/decano/funciones-sustantivas",
      color: "bg-emerald-500",
    },
    {
      title: "Actividades Académicas",
      description: "Gestionar actividades extracurriculares",
      icon: Activity,
      href: "/dashboard/decano/actividades",
      color: "bg-purple-500",
    },
    {
      title: "Reportes de Facultad",
      description: "Reportes y estadísticas de la facultad",
      icon: BarChart3,
      href: "/dashboard/decano/reportes",
      color: "bg-orange-500",
    },
    {
      title: "Planificación Académica",
      description: "Planificar períodos y actividades académicas",
      icon: Calendar,
      href: "/dashboard/decano/planificacion",
      color: "bg-red-500",
    },
    {
      title: "Documentos Oficiales",
      description: "Gestionar documentación oficial de la facultad",
      icon: FileText,
      href: "/dashboard/decano/documentos",
      color: "bg-green-500",
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["decano"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Decanato</h1>
            <p className="text-gray-600">Gestión integral de la facultad y sus recursos académicos</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decanoModules.map((module) => {
              const IconComponent = module.icon
              const esDestacado = (module as any).destacado
              return (
                <Card key={module.href} className={`hover:shadow-lg transition-shadow cursor-pointer ${esDestacado ? 'border-indigo-300 bg-indigo-50 md:col-span-2 lg:col-span-3' : ''}`}>
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
                      <Button className={`w-full ${esDestacado ? 'bg-indigo-700 hover:bg-indigo-800 text-base py-5' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
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
