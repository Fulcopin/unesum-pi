"use client"

// Panel de administración de las opciones de menú gobernadas por el cronograma.
// Muestra todas las opciones del catálogo agrupadas por rol, su estado actual y
// permite al administrador forzar el bloqueo o el desbloqueo:
//
//   auto      → manda el cronograma (visible solo dentro del rango del evento)
//   bloqueado → oculto siempre, aunque esté dentro del rango
//   siempre   → visible siempre, aunque esté fuera del rango

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Lock, Unlock, CalendarClock, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { MODULOS_POR_ROL } from "@/lib/cronograma-modulos"

type EstadoModulo = "auto" | "bloqueado" | "siempre"

interface EstadoApi {
  modulo: string
  estado: EstadoModulo
  visible: boolean
  titulo: string | null
  para_roles: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  tiene_evento: boolean
}

const ETIQUETA_ROL: Record<string, string> = {
  docente: "Docentes",
  comision: "Comisión Académica",
  administrador: "Administradores",
}

const OPCIONES_ESTADO: { value: EstadoModulo; label: string }[] = [
  { value: "auto", label: "Automático (según fechas)" },
  { value: "bloqueado", label: "Bloqueado siempre" },
  { value: "siempre", label: "Visible siempre" },
]

function formatearFecha(valor: string | null): string {
  if (!valor) return ""
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function GestionMenus({ onClose }: { onClose: () => void }) {
  const { token, getToken } = useAuth()
  const [estados, setEstados] = useState<Record<string, EstadoApi>>({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

  const apiRequest = async (url: string, opts: RequestInit = {}) => {
    const authToken = getToken?.() || token
    const res = await fetch(`${API}${url}`, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}`, ...opts.headers },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
    return data
  }

  const cargar = async () => {
    try {
      const res = await apiRequest("/cronograma/modulos-estado")
      const mapa: Record<string, EstadoApi> = {}
      for (const fila of res.data || []) mapa[fila.modulo] = fila
      setEstados(mapa)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cambiarEstado = async (modulo: string, estado: EstadoModulo) => {
    setGuardando(modulo)
    try {
      await apiRequest("/cronograma/modulos-estado", {
        method: "PUT",
        body: JSON.stringify({ modulo, estado }),
      })
      // Recargamos para que el badge refleje la visibilidad recalculada
      await cargar()
    } catch (e: any) {
      setError(`No se pudo guardar: ${e.message}`)
    } finally {
      setGuardando(null)
    }
  }

  const badgeDe = (info?: EstadoApi) => {
    if (!info || (info.estado === "auto" && !info.tiene_evento)) {
      return <Badge variant="outline" className="text-gray-600">Sin evento — visible</Badge>
    }
    if (info.estado === "bloqueado") {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><Lock className="h-3 w-3 mr-1" />Bloqueado</Badge>
    }
    if (info.estado === "siempre") {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Unlock className="h-3 w-3 mr-1" />Visible siempre</Badge>
    }
    return info.visible ? (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Habilitado ahora</Badge>
    ) : (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Fuera de fecha</Badge>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-blue-800">Gestión de menús</CardTitle>
            <p className="text-xs text-gray-600 mt-1">
              Bloquea o desbloquea opciones del menú. El estado manual tiene prioridad sobre las fechas del cronograma.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-5 overflow-y-auto">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          {cargando ? (
            <div className="py-12 text-center text-gray-500">Cargando menús...</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(MODULOS_POR_ROL).map(([rol, modulos]) => (
                <div key={rol}>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 pb-1 border-b">
                    {ETIQUETA_ROL[rol] || rol}
                  </h3>
                  <div className="space-y-2">
                    {modulos.map((m) => {
                      const info = estados[m.key]
                      const inicio = formatearFecha(info?.fecha_inicio ?? null)
                      const fin = formatearFecha(info?.fecha_fin ?? null)
                      return (
                        <div
                          key={m.key}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-gray-50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{m.label}</p>
                            {info?.tiene_evento && inicio && fin && (
                              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <CalendarClock className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {info.titulo}: {inicio} → {fin}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="shrink-0">{badgeDe(info)}</div>
                          <Select
                            value={info?.estado || "auto"}
                            onValueChange={(v) => cambiarEstado(m.key, v as EstadoModulo)}
                            disabled={guardando === m.key}
                          >
                            <SelectTrigger className="w-[190px] shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPCIONES_ESTADO.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="border-t p-4 flex justify-end bg-gray-50">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </Card>
    </div>
  )
}
