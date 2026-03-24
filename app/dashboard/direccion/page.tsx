"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, FileText, Calendar, TrendingUp, Settings } from "lucide-react"
import Link from "next/link"

export default function DireccionDashboard() {
  const direccionModules = [
    {
      title: "Dashboard Ejecutivo",
      description: "Resumen general de indicadores institucionales",
      icon: BarChart3,
      href: "/dashboard/direccion/executive",
      color: "bg-blue-500",
    },
    {
      title: "Gestión de Personal",
      description: "Supervisión del personal académico y administrativo",
      icon: Users,
      href: "/dashboard/direccion/personal",
      color: "bg-emerald-500",
    },
    {
      title: "Reportes Institucionales",
      description: "Reportes y análisis institucionales",
      icon: FileText,
      href: "/dashboard/direccion/reportes",
      color: "bg-purple-500",
    },
    {
      title: "Planificación Académica",
      description: "Planificación y seguimiento académico",
      icon: Calendar,
      href: "/dashboard/direccion/planificacion",
      color: "bg-orange-500",
    },
    {
      title: "Indicadores de Gestión",
      description: "Métricas y KPIs institucionales",
      icon: TrendingUp,
      href: "/dashboard/direccion/indicadores",
      color: "bg-red-500",
    },
    {
      title: "Configuración Institucional",
      description: "Configuraciones y políticas institucionales",
      icon: Settings,
      href: "/dashboard/direccion/configuracion",
      color: "bg-gray-500",
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["direccion"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Dirección</h1>
            <p className="text-gray-600">Supervisión estratégica y toma de decisiones institucionales</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {direccionModules.map((module) => {
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
