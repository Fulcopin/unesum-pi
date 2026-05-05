"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

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
  entrega: "Entrega",
  capacitacion: "Capacitación",
  feriado: "Feriado",
  academico: "Académico",
  general: "General",
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

function formatShort(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  } catch { return dateStr }
}

export default function CalendarioPublico() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

  useEffect(() => {
    fetch(`${API}/cronograma/publico`)
      .then(r => r.json())
      .then(d => setEventos(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
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
    .slice(0, 6)

  return (
    <section id="cronograma" className="px-6 py-16 bg-white/70 backdrop-blur-md">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Calendar className="h-4 w-4" />
            Cronograma Institucional
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Calendario de Actividades</h2>
          <p className="text-gray-500">Fechas importantes, entregas y eventos académicos de UNESUM</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando calendario...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar grid */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
              {/* Nav */}
              <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
                <button
                  className="p-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h3 className="text-lg font-bold">{MONTHS[month]} {year}</h3>
                <button
                  className="p-1.5 rounded-lg hover:bg-emerald-600 transition-colors"
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              {/* Day headers */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
                ))}
              </div>
              {/* Days */}
              <div className="grid grid-cols-7 bg-white">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e-${i}`} className="min-h-[80px] border-r border-b border-gray-100 bg-gray-50/40" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const evs = eventosEnDia(day)
                  const isToday =
                    new Date().getDate() === day &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year
                  return (
                    <div
                      key={day}
                      className={`min-h-[80px] border-r border-b border-gray-100 p-1 transition-colors ${
                        isToday ? "bg-emerald-50" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? "bg-emerald-600 text-white" : "text-gray-700"
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {evs.slice(0, 2).map(ev => (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvento(ev)}
                            className="w-full text-left text-[9px] px-1 py-0.5 rounded text-white font-medium truncate hover:opacity-80 transition-opacity leading-tight"
                            style={{ backgroundColor: ev.color }}
                          >
                            {ev.titulo}
                          </button>
                        ))}
                        {evs.length > 2 && (
                          <div
                            className="text-[9px] text-emerald-600 pl-0.5 cursor-pointer font-medium"
                            onClick={() => setSelectedEvento(evs[2])}
                          >
                            +{evs.length - 2} más
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Selected event detail */}
              {selectedEvento ? (
                <div
                  className="rounded-2xl p-4 border-l-4 shadow-md bg-white"
                  style={{ borderLeftColor: selectedEvento.color }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: selectedEvento.color }}
                    >
                      {TIPOS[selectedEvento.tipo] || selectedEvento.tipo}
                    </span>
                    <button
                      className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-2"
                      onClick={() => setSelectedEvento(null)}
                    >×</button>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{selectedEvento.titulo}</h4>
                  {selectedEvento.descripcion && (
                    <p className="text-sm text-gray-600 mb-3">{selectedEvento.descripcion}</p>
                  )}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>🗓 {formatShort(selectedEvento.fecha_inicio)}</p>
                    <p>🏁 {formatShort(selectedEvento.fecha_fin)}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                  <Calendar className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-emerald-700 font-medium">Haz clic en un evento para ver los detalles</p>
                </div>
              )}

              {/* Upcoming events */}
              <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b px-4 py-3">
                  <h4 className="font-semibold text-gray-800 text-sm">Próximos eventos</h4>
                </div>
                <div className="divide-y">
                  {proximosEventos.length === 0 && (
                    <div className="px-4 py-6 text-center text-xs text-gray-400">Sin próximos eventos</div>
                  )}
                  {proximosEventos.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => {
                        setSelectedEvento(ev)
                        setCurrentDate(new Date(ev.fecha_inicio))
                      }}
                      className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0 text-center bg-gray-100 rounded-lg p-1.5 min-w-[40px]">
                        <div className="text-sm font-bold text-gray-800 leading-none">
                          {new Date(ev.fecha_inicio).getDate()}
                        </div>
                        <div className="text-[9px] text-gray-500 uppercase">
                          {MONTHS[new Date(ev.fecha_inicio).getMonth()].slice(0, 3)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                          <span className="text-xs font-semibold text-gray-800 truncate">{ev.titulo}</span>
                        </div>
                        <p className="text-[10px] text-gray-400">{formatShort(ev.fecha_inicio)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
