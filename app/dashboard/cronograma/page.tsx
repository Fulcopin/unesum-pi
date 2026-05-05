"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft, List, CalendarDays } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"

interface Evento {
  id: number
  titulo: string
  descripcion?: string
  fecha_inicio: string
  fecha_fin: string
  color: string
  tipo: string
  para_roles: string
}

const TIPOS: Record<string, string> = {
  reunion: "Reunión",
  entrega: "Fecha de Entrega",
  capacitacion: "Capacitación",
  feriado: "Feriado / Asueto",
  academico: "Actividad Académica",
  general: "General",
}

const ROLES: Record<string, string> = {
  todos: "Todos",
  docente: "Docentes",
  administrador: "Administradores",
  comision: "Comisión Académica",
  coordinador: "Coordinadores",
  decano: "Decanos",
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function CronogramaPublicoPage() {
  const { token, getToken, user } = useAuth()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

  useEffect(() => {
    const load = async () => {
      try {
        const authToken = getToken() || token
        const res = await fetch(`${API}/cronograma`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        const data = await res.json()
        setEventos(data.data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const eventosDelMes = eventos.filter(ev => {
    const d = new Date(ev.fecha_inicio)
    return d.getUTCFullYear() === year && d.getUTCMonth() === month
  })

  const eventosEnDia = (day: number) =>
    eventosDelMes.filter(ev => new Date(ev.fecha_inicio).getUTCDate() === day)

  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)
  const proximosEventos = eventos
    .filter(ev => new Date(ev.fecha_fin) >= hace30Dias)
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())
    .slice(0, 8)

  return (
    <ProtectedRoute allowedRoles={["administrador", "profesor", "docente", "comision", "comision_academica", "coordinador", "decano", "subdecano", "direccion"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-blue-600" /> Cronograma Institucional
                </h1>
                <p className="text-sm text-gray-500">Calendario de actividades académicas e institucionales</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={view === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("calendar")}
                className={view === "calendar" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <CalendarDays className="h-4 w-4 mr-1" />Calendario
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
                className={view === "list" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <List className="h-4 w-4 mr-1" />Próximos eventos
              </Button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-20 text-gray-500">Cargando cronograma...</div>
          )}

          {!loading && view === "calendar" && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Main calendar */}
              <div className="xl:col-span-3">
                <Card className="shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-xl font-bold">{MONTHS[month]} {year}</h2>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-7 border-b bg-gray-50">
                      {DAYS.map(d => (
                        <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`e-${i}`} className="min-h-[96px] border-r border-b bg-gray-50/60" />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const evs = eventosEnDia(day)
                        const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
                        return (
                          <div
                            key={day}
                            className={`min-h-[96px] border-r border-b p-1.5 transition-colors ${isToday ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                          >
                            <div className={`text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}>
                              {day}
                            </div>
                            <div className="space-y-0.5">
                              {evs.slice(0, 3).map(ev => (
                                <button
                                  key={ev.id}
                                  className="w-full text-left text-[10px] px-1.5 py-0.5 rounded text-white font-medium truncate hover:opacity-80 transition-opacity"
                                  style={{ backgroundColor: ev.color }}
                                  onClick={() => setSelectedEvento(ev)}
                                >
                                  {ev.titulo}
                                </button>
                              ))}
                              {evs.length > 3 && (
                                <div className="text-[10px] text-blue-600 pl-1 cursor-pointer font-medium"
                                  onClick={() => setSelectedEvento(evs[3])}>
                                  +{evs.length - 3} más
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: selected event detail + upcoming */}
              <div className="space-y-4">
                {selectedEvento ? (
                  <Card className="border-l-4 shadow-md" style={{ borderLeftColor: selectedEvento.color }}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge className="text-xs text-white" style={{ backgroundColor: selectedEvento.color }}>
                          {TIPOS[selectedEvento.tipo] || selectedEvento.tipo}
                        </Badge>
                        <button className="text-gray-400 hover:text-gray-600 text-lg leading-none" onClick={() => setSelectedEvento(null)}>×</button>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base mb-1">{selectedEvento.titulo}</h3>
                      {selectedEvento.descripcion && (
                        <p className="text-sm text-gray-600 mb-3">{selectedEvento.descripcion}</p>
                      )}
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>🗓 Inicio: {formatShort(selectedEvento.fecha_inicio)}</p>
                        <p>🏁 Fin: {formatShort(selectedEvento.fecha_fin)}</p>
                        <p>👥 Para: {ROLES[selectedEvento.para_roles] || selectedEvento.para_roles}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center text-sm text-blue-700">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                      Haz clic en un evento para ver los detalles
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <h3 className="font-semibold text-gray-800 text-sm">Próximos eventos</h3>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {proximosEventos.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">Sin próximos eventos</p>
                    )}
                    {proximosEventos.map(ev => (
                      <button
                        key={ev.id}
                        className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        onClick={() => { setSelectedEvento(ev); setCurrentDate(new Date(ev.fecha_inicio)) }}
                      >
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ev.color }} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{ev.titulo}</p>
                          <p className="text-[10px] text-gray-400">{formatShort(ev.fecha_inicio)}</p>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {!loading && view === "list" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proximosEventos.length === 0 && (
                <div className="md:col-span-2 text-center py-16 text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No hay eventos próximos</p>
                </div>
              )}
              {proximosEventos.map(ev => (
                <Card key={ev.id} className="hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: ev.color }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-center bg-gray-100 rounded-lg p-2 min-w-[48px]">
                        <div className="text-lg font-bold text-gray-800 leading-none">
                          {new Date(ev.fecha_inicio).getDate()}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase">
                          {MONTHS[new Date(ev.fecha_inicio).getMonth()].slice(0, 3)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900">{ev.titulo}</span>
                          <Badge className="text-[10px] text-white py-0" style={{ backgroundColor: ev.color }}>
                            {TIPOS[ev.tipo] || ev.tipo}
                          </Badge>
                        </div>
                        {ev.descripcion && <p className="text-sm text-gray-500 line-clamp-2 mb-1">{ev.descripcion}</p>}
                        <div className="text-xs text-gray-400 space-x-2">
                          <span>⏰ {formatShort(ev.fecha_inicio)}</span>
                          <span>→ {formatShort(ev.fecha_fin)}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          👥 {ROLES[ev.para_roles] || ev.para_roles}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
