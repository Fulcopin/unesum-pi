"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Calendar, User, BookOpen, Award } from "lucide-react"
import Link from "next/link"

export default function EstudianteDashboard() {
  const estudianteModules = [
    {
      title: "Actividades Disponibles",
      description: "Explorar actividades extracurriculares disponibles",
      icon: Activity,
      href: "/dashboard/estudiante/actividades",
      color: "bg-emerald-500",
    },
    {
      title: "Mi Horario Académico",
      description: "Consultar horarios de clases y actividades",
      icon: Calendar,
      href: "/dashboard/estudiante/horario",
      color: "bg-blue-500",
    },
    {
      title: "Mi Perfil Estudiantil",
      description: "Actualizar información personal y académica",
      icon: User,
      href: "/dashboard/estudiante/perfil",
      color: "bg-purple-500",
    },
    {
      title: "Información Académica",
      description: "Consultar información sobre programas y carreras",
      icon: BookOpen,
      href: "/dashboard/estudiante/informacion",
      color: "bg-orange-500",
    },
    {
      title: "Mis Participaciones",
      description: "Ver historial de actividades y certificaciones",
      icon: Award,
      href: "/dashboard/estudiante/participaciones",
      color: "bg-red-500",
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["estudiante"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Portal Estudiantil</h1>
            <p className="text-gray-600">Accede a información académica y actividades extracurriculares</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {estudianteModules.map((module) => {
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
