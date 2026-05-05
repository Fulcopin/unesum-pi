"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, ArrowLeft, Calendar, ChevronLeft, ChevronRight, Eye } from "lucide-react"
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

const TIPOS = [
  { value: "reunion", label: "Reunión" },
  { value: "entrega", label: "Fecha de Entrega" },
  { value: "capacitacion", label: "Capacitación" },
  { value: "feriado", label: "Feriado / Asueto" },
  { value: "academico", label: "Actividad Académica" },
  { value: "general", label: "General" },
]

const ROLES = [
  { value: "todos", label: "Todos" },
  { value: "docente", label: "Docentes" },
  { value: "administrador", label: "Administradores" },
  { value: "comision", label: "Comisión Académica" },
  { value: "coordinador", label: "Coordinadores" },
  { value: "decano", label: "Decanos" },
]

const COLORES = [
  "#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2", "#be185d", "#854d0e",
]

const COLOR_LABELS: Record<string, string> = {
  "#2563eb": "Azul",
  "#16a34a": "Verde",
  "#dc2626": "Rojo",
  "#9333ea": "Morado",
  "#ea580c": "Naranja",
  "#0891b2": "Cian",
  "#be185d": "Rosa",
  "#854d0e": "Marrón",
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function formatDateLocal(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function toInputDatetime(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const da = String(d.getDate()).padStart(2, "0")
  const h = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${mo}-${da}T${h}:${mi}`
}

const emptyForm = (): Omit<Evento, "id"> => ({
  titulo: "",
  descripcion: "",
  fecha_inicio: "",
  fecha_fin: "",
  color: "#2563eb",
  tipo: "general",
  para_roles: "todos",
})

export default function AdminCronogramaPage() {
  const { token, getToken } = useAuth()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"calendar" | "list">("list")

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

  const apiRequest = async (url: string, opts: RequestInit = {}) => {
    const authToken = getToken() || token
    const res = await fetch(`${API}${url}`, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}`, ...opts.headers },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
    return data
  }

  const loadEventos = async () => {
    try {
      const res = await apiRequest("/cronograma")
      setEventos(res.data || [])
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEventos() }, [])

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.fecha_inicio || !form.fecha_fin) {
      alert("Título, fecha de inicio y fecha de fin son obligatorios.")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await apiRequest(`/cronograma/${editingId}`, { method: "PUT", body: JSON.stringify(form) })
      } else {
        await apiRequest("/cronograma", { method: "POST", body: JSON.stringify(form) })
      }
      await loadEventos()
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm())
    } catch (e: any) {
      alert(`Error al guardar: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (ev: Evento) => {
    setForm({
      titulo: ev.titulo,
      descripcion: ev.descripcion || "",
      fecha_inicio: toInputDatetime(ev.fecha_inicio),
      fecha_fin: toInputDatetime(ev.fecha_fin),
      color: ev.color,
      tipo: ev.tipo,
      para_roles: ev.para_roles,
    })
    setEditingId(ev.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este evento del cronograma?")) return
    try {
      await apiRequest(`/cronograma/${id}`, { method: "DELETE" })
      setEventos(prev => prev.filter(e => e.id !== id))
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    }
  }

  // ── Calendar helpers ──
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

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/admin">
                <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-blue-600" /> Cronograma Institucional
                </h1>
                <p className="text-sm text-gray-500">Crea y gestiona el calendario de actividades para docentes y personal</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/cronograma">
                <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" />Vista pública</Button>
              </Link>
              <Button
                variant={view === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("calendar")}
                className={view === "calendar" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >Calendario</Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
                className={view === "list" ? "bg-blue-600 hover:bg-blue-700" : ""}
              >Lista</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true) }}
              >
                <Plus className="h-4 w-4 mr-1" /> Nuevo evento
              </Button>
            </div>
          </div>

          {/* Form modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="text-blue-800">{editingId ? "Editar Evento" : "Nuevo Evento"}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Título *</label>
                    <Input
                      value={form.titulo}
                      onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                      placeholder="Ej: Entrega de Syllabus"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                    <Textarea
                      value={form.descripcion}
                      onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      placeholder="Detalles del evento..."
                      className="min-h-[70px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Fecha inicio *</label>
                      <Input
                        type="datetime-local"
                        value={form.fecha_inicio}
                        onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Fecha fin *</label>
                      <Input
                        type="datetime-local"
                        value={form.fecha_fin}
                        onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
                      <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Para</label>
                      <Select value={form.para_roles} onValueChange={v => setForm(f => ({ ...f, para_roles: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORES.map(c => (
                        <button
                          key={c}
                          title={COLOR_LABELS[c]}
                          onClick={() => setForm(f => ({ ...f, color: c }))}
                          className={`w-7 h-7 rounded-full transition-all border-2 ${form.color === c ? "border-gray-700 scale-125" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancelar</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
                      {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear evento"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {loading && (
            <div className="text-center py-20 text-gray-500">Cargando cronograma...</div>
          )}

          {!loading && view === "calendar" && (
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={prevMonth}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-xl font-bold">{MONTHS[month]} {year}</h2>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={nextMonth}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2 border-r last:border-r-0">{d}</div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[90px] border-r border-b bg-gray-50/50" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const evs = eventosEnDia(day)
                    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
                    return (
                      <div key={day} className={`min-h-[90px] border-r border-b p-1 ${isToday ? "bg-blue-50" : "bg-white hover:bg-gray-50"}`}>
                        <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {evs.slice(0, 3).map(ev => (
                            <div
                              key={ev.id}
                              className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium truncate cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: ev.color }}
                              title={ev.titulo}
                              onClick={() => handleEdit(ev)}
                            >
                              {ev.titulo}
                            </div>
                          ))}
                          {evs.length > 3 && (
                            <div className="text-[10px] text-gray-500 pl-1">+{evs.length - 3} más</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && view === "list" && (
            <div className="space-y-3">
              {eventos.length === 0 && (
                <Card>
                  <CardContent className="py-16 text-center text-gray-400">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No hay eventos. Crea el primero.</p>
                  </CardContent>
                </Card>
              )}
              {eventos.map(ev => (
                <Card key={ev.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-3 h-full min-h-[40px] rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: ev.color, width: "4px" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-gray-900">{ev.titulo}</span>
                            <Badge variant="outline" className="text-xs" style={{ borderColor: ev.color, color: ev.color }}>
                              {TIPOS.find(t => t.value === ev.tipo)?.label || ev.tipo}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-gray-500">
                              {ROLES.find(r => r.value === ev.para_roles)?.label || ev.para_roles}
                            </Badge>
                          </div>
                          {ev.descripcion && <p className="text-sm text-gray-500 mb-1 line-clamp-2">{ev.descripcion}</p>}
                          <p className="text-xs text-gray-400">
                            {formatDateLocal(ev.fecha_inicio)} → {formatDateLocal(ev.fecha_fin)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(ev)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(ev.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
