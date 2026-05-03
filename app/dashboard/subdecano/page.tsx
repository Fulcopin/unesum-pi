"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Activity, FileCheck, Calendar, BarChart3, Pen, QrCode } from "lucide-react"
import Link from "next/link"

export default function SubdecanosDashboard() {
  const subdecanoModules = [
    {
      title: "Mis Documentos para Firmar",
      description: "Ve todos los documentos pendientes de tu firma y fírmalos de inmediato con tu QR personal",
      icon: Pen,
      href: "/dashboard/subdecano/mis-firmas",
      color: "bg-indigo-700",
      destacado: true,
    },
    {
      title: "Mi QR Personal",
      description: "Ver y descargar tu sello digital personal de identidad",
      icon: QrCode,
      href: "/dashboard/subdecano/mi-qr",
      color: "bg-emerald-600",
    },
    {
      title: "Apoyo a Docentes",
      description: "Asistir y coordinar con el personal docente",
      icon: Users,
      href: "/dashboard/subdecano/docentes",
      color: "bg-blue-500",
    },
    {
      title: "Coordinación de Actividades",
      description: "Coordinar actividades académicas y extracurriculares",
      icon: Activity,
      href: "/dashboard/subdecano/actividades",
      color: "bg-emerald-500",
    },
    {
      title: "Revisión de Funciones",
      description: "Revisar y validar funciones sustantivas",
      icon: FileCheck,
      href: "/dashboard/subdecano/funciones-revision",
      color: "bg-purple-500",
    },
    {
      title: "Programación Académica",
      description: "Asistir en la programación de actividades",
      icon: Calendar,
      href: "/dashboard/subdecano/programacion",
      color: "bg-orange-500",
    },
    {
      title: "Reportes Operativos",
      description: "Generar reportes operativos de la facultad",
      icon: BarChart3,
      href: "/dashboard/subdecano/reportes",
      color: "bg-red-500",
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["subdecano"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Subdecanato</h1>
            <p className="text-gray-600">Apoyo operativo y coordinación académica</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subdecanoModules.map((module) => {
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
