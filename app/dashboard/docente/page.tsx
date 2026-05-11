"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, User, Calendar, FileText, FileSpreadsheet, FileCheck, Bot, Pen, QrCode, Printer, Eye, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function DocenteDashboard() {
  return (
    <ProtectedRoute allowedRoles={["profesor", "docente", "comision"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Docente</h1>
            <p className="text-gray-600">Gestiona tus actividades académicas y funciones sustantivas</p>
          </div>

          {/* === SECCIÓN PRINCIPAL: MIS DOCUMENTOS === */}
          <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-700 rounded-xl p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900">Mis Syllabus y Programas Analíticos</h2>
                <p className="text-sm text-blue-700">Ve, imprime y revisa el estado de firmas de tus documentos</p>
              </div>
              <Badge className="ml-auto bg-blue-700">Mis Documentos</Badge>
            </div>

            <p className="text-sm text-blue-800 mb-5 mt-2 bg-white/60 rounded-lg px-4 py-2 border border-blue-200">
              Aquí puedes <strong>ver todos tus syllabus y programas analíticos</strong>, revisar cuántas firmas tienen, e <strong>imprimirlos con los sellos QR</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Ver e Imprimir mis documentos */}
              <Link href="/dashboard/docente/mis-documentos" className="sm:col-span-3">
                <div className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white p-5 cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center gap-4 group">
                  <div className="bg-white/20 rounded-xl p-3 flex-shrink-0 group-hover:bg-white/30 transition-colors">
                    <Printer className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight">Ver e Imprimir mis documentos</p>
                    <p className="text-blue-200 text-sm mt-0.5">Lista de todos mis syllabus y programas analíticos con sus firmas QR — listos para imprimir</p>
                  </div>
                </div>
              </Link>

              {/* Mis Revisiones */}
              <Link href="/dashboard/docente/mis-revisiones" className="sm:col-span-3">
                <div className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white p-4 cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center gap-4 group">
                  <div className="bg-white/20 rounded-xl p-3 flex-shrink-0 group-hover:bg-white/30 transition-colors">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-base leading-tight">Revisiones y Comentarios de la Comisión</p>
                    <p className="text-indigo-200 text-sm mt-0.5">Consulta los comentarios sobre tus syllabus y programas analíticos — y responde directamente</p>
                  </div>
                </div>
              </Link>

              {/* Editor Syllabus */}
              <Link href="/dashboard/docente/editor-syllabus">
                <div className="rounded-xl bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 p-4 cursor-pointer transition-all flex items-center gap-3 group">
                  <div className="bg-blue-100 group-hover:bg-blue-200 rounded-lg p-2 flex-shrink-0 transition-colors">
                    <FileText className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">Editar Syllabus</p>
                    <p className="text-blue-500 text-xs">Completar y guardar mi syllabus</p>
                  </div>
                </div>
              </Link>

              {/* Editor Programa Analítico */}
              <Link href="/dashboard/docente/editor-programa-analitico">
                <div className="rounded-xl bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 p-4 cursor-pointer transition-all flex items-center gap-3 group">
                  <div className="bg-indigo-100 group-hover:bg-indigo-200 rounded-lg p-2 flex-shrink-0 transition-colors">
                    <FileSpreadsheet className="h-6 w-6 text-indigo-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900">Editar Prog. Analítico</p>
                    <p className="text-indigo-500 text-xs">Completar y guardar mi programa</p>
                  </div>
                </div>
              </Link>

              {/* Mis Firmas */}
              <Link href="/dashboard/docente/mis-firmas">
                <div className="rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 p-4 cursor-pointer transition-all flex items-center gap-3 group">
                  <div className="bg-emerald-100 group-hover:bg-emerald-200 rounded-lg p-2 flex-shrink-0 transition-colors">
                    <Pen className="h-6 w-6 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900">Firmar mis documentos</p>
                    <p className="text-emerald-500 text-xs">Aplicar mi firma digital</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* === CRONOGRAMA === */}
          <Link href="/dashboard/cronograma" className="block mb-6">
            <div className="rounded-2xl border-2 border-sky-300 bg-gradient-to-r from-sky-50 to-blue-50 p-4 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-sky-600 rounded-xl p-3 flex-shrink-0">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-sky-900">Cronograma Institucional</h2>
                  <p className="text-sm text-sky-600">Ver el calendario de actividades, entregas y eventos académicos</p>
                </div>
              </div>
              <Button className="bg-sky-600 hover:bg-sky-700 flex-shrink-0">
                Ver Calendario →
              </Button>
            </div>
          </Link>

          {/* === OTRAS HERRAMIENTAS === */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Cronograma Institucional", desc: "Ver el calendario de actividades y eventos académicos", icon: Calendar, href: "/dashboard/cronograma", color: "bg-blue-600" },
              { title: "Mi QR Personal", desc: "Ver y descargar tu sello digital", icon: QrCode, href: "/dashboard/docente/mi-qr", color: "bg-emerald-600" },
              { title: "Horas Extracurriculares", desc: "Registrar y gestionar horas extracurriculares", icon: BookOpen, href: "/dashboard/docente/Horas_Extracurriculares", color: "bg-teal-500" },
              { title: "Mi Perfil", desc: "Actualizar información personal y académica", icon: User, href: "/dashboard/docente/perfil", color: "bg-purple-500" },
              { title: "Plan de Trabajo Docente", desc: "Planificación de trabajo docente", icon: Calendar, href: "/dashboard/docente/plan_trabajo", color: "bg-orange-500" },
              { title: "Planificación de Actividades", desc: "Generar reportes de mis actividades docentes", icon: FileText, href: "/dashboard/docente/reportes", color: "bg-red-500" },
              { title: "Asistente IA", desc: "Consulta información curricular con IA", icon: Bot, href: "/dashboard/docente/asistente-ia", color: "bg-blue-600" },
            ].map((mod) => {
              const Icon = mod.icon
              return (
                <Card key={mod.href} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className={`w-10 h-10 ${mod.color} rounded-lg flex items-center justify-center mb-2`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                    <CardDescription className="text-xs">{mod.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={mod.href}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm">Ir al módulo</Button>
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
