"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, FileText, Calendar, TrendingUp, Settings, ScrollText, ClipboardSignature, Pen, ShieldCheck } from "lucide-react"
import Link from "next/link"

export default function DireccionDashboard() {
  const direccionModules = [
    {
      title: "Documentos Finales — Todos Firmados",
      description: "Consulta todos los syllabus y programas analíticos que ya tienen las firmas completas: docente, coordinador, decano y director de carrera.",
      icon: ShieldCheck,
      href: "/dashboard/direccion/documentos-firmados",
      color: "bg-green-700",
      destacado2: true,
    },
    {
      title: "Mis Documentos para Firmar",
      description: "Ve todos los documentos pendientes de tu firma (syllabus y programas analíticos) y fírmalos de inmediato",
      icon: Pen,
      href: "/dashboard/direccion/mis-firmas",
      color: "bg-indigo-700",
      destacado: true,
    },
    {
      title: "Firmar Syllabus",
      description: "Revisar y firmar con QR los syllabus por nivel de la carrera",
      icon: ClipboardSignature,
      href: "/dashboard/direccion/syllabus",
      color: "bg-blue-600",
    },
    {
      title: "Firmar Programas Analíticos",
      description: "Revisar y firmar con QR los programas analíticos por nivel",
      icon: ScrollText,
      href: "/dashboard/direccion/programa-analitico",
      color: "bg-indigo-600",
    },
    {
      title: "Firma Masiva de Documentos",
      description: "Firmar en lote todos los programas analíticos pendientes de tu firma como Director/a Académico/a",
      icon: ClipboardSignature,
      href: "/dashboard/direccion/firmar-documentos",
      color: "bg-emerald-700",
    },
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
              const esDestacado = (module as any).destacado
              const esDestacado2 = (module as any).destacado2
              return (
                <Card key={module.href} className={`hover:shadow-lg transition-shadow cursor-pointer ${esDestacado ? 'border-indigo-300 bg-indigo-50 md:col-span-2 lg:col-span-3' : ''} ${esDestacado2 ? 'border-green-300 bg-green-50 md:col-span-2 lg:col-span-3' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${module.color} text-white`}>
                        <IconComponent className={(esDestacado || esDestacado2) ? "h-8 w-8" : "h-6 w-6"} />
                      </div>
                      <div>
                        <CardTitle className={(esDestacado || esDestacado2) ? "text-xl" : "text-lg"}>{module.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{module.description}</CardDescription>
                    <Link href={module.href}>
                      <Button className={`w-full ${esDestacado ? 'bg-indigo-700 hover:bg-indigo-800 text-base py-5' : esDestacado2 ? 'bg-green-700 hover:bg-green-800 text-base py-5' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        {esDestacado ? 'Ver mis documentos pendientes →' : esDestacado2 ? 'Ver documentos finales firmados →' : 'Acceder'}
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
