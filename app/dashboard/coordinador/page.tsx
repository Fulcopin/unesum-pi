"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, CheckSquare, ListChecks, PenLine, QrCode, Unlock } from "lucide-react"
import Link from "next/link"

export default function CoordinadorDashboard() {
  return (
    <ProtectedRoute allowedRoles={["coordinador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-5xl mx-auto px-6 py-8">

          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Panel del Coordinador/a</h1>
            <p className="text-gray-500">Gestión y firma de documentos académicos de tu carrera</p>
          </div>

          {/* === SECCIÓN PRINCIPAL: FIRMAR DOCUMENTOS === */}
          <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-700 rounded-xl p-3">
                <PenLine className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-indigo-900">Firma de Documentos</h2>
                <p className="text-sm text-indigo-700">Solo ves los documentos de tu carrera que esperan tu firma</p>
              </div>
              <Badge className="ml-auto bg-indigo-700">Mi Acción Pendiente</Badge>
            </div>

            <p className="text-sm text-indigo-800 mb-5 mt-2 bg-white/60 rounded-lg px-4 py-2 border border-indigo-200">
              Puedes <strong>firmar todos los documentos pendientes de una vez</strong> (más rápido) o <strong>seleccionar cuáles firmar</strong> uno por uno.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Firmar Todo */}
              <Link href="/dashboard/coordinador/firmar-documentos?accion=todos">
                <div className="rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white p-5 cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center gap-4 group">
                  <div className="bg-white/20 rounded-xl p-3 flex-shrink-0 group-hover:bg-white/30 transition-colors">
                    <CheckSquare className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight">Firmar Todo</p>
                    <p className="text-indigo-200 text-sm mt-0.5">Firmar todos los documentos pendientes de tu carrera de una sola vez</p>
                  </div>
                </div>
              </Link>

              {/* Seleccionar cuáles firmar */}
              <Link href="/dashboard/coordinador/firmar-documentos">
                <div className="rounded-xl bg-white border-2 border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 p-5 cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center gap-4 group">
                  <div className="bg-indigo-100 group-hover:bg-indigo-200 rounded-xl p-3 flex-shrink-0 transition-colors">
                    <ListChecks className="h-8 w-8 text-indigo-700" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-indigo-900 leading-tight">Seleccionar cuáles firmar</p>
                    <p className="text-indigo-500 text-sm mt-0.5">Revisa cada documento y elige cuáles quieres firmar</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* === HABILITAR DOCENTES (requiere visto bueno de decanato o dirección) === */}
          <Link href="/dashboard/coordinador/habilitar-docentes">
            <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 p-6 mb-6 shadow-sm hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="bg-amber-600 rounded-xl p-3 flex-shrink-0">
                  <Unlock className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-amber-900">Habilitar Docentes</h2>
                  <p className="text-sm text-amber-800">
                    Reabre el syllabus a un docente de tu carrera cuyo plazo ya cerró. Lo autoriza el Decano/a o el
                    Director/a Académico/a.
                  </p>
                </div>
                <Badge className="ml-auto bg-amber-600 shrink-0">Requiere autorización</Badge>
              </div>
            </div>
          </Link>

          {/* === OTRAS HERRAMIENTAS === */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center mb-2">
                  <QrCode className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base">Mi QR personal</CardTitle>
                <CardDescription className="text-xs">Ver y descargar tu sello digital personal</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/coordinador/mi-qr">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm">Ver mi QR</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center mb-2">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base">Funciones Sustantivas</CardTitle>
                <CardDescription className="text-xs">Supervisar las funciones sustantivas de la carrera</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/coordinador/funciones-sustantivas">
                  <Button className="w-full bg-slate-600 hover:bg-slate-700" size="sm">Ir al módulo</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

        </main>
      </div>
    </ProtectedRoute>
  )
}

