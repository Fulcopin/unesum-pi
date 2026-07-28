"use client"

// Pantalla donde el docente pide que le reabran el syllabus cuando su plazo ya
// cerró. La solicitud va primero a su coordinador de carrera; si este la eleva,
// la autoriza el Decano/a o el Director/a Académico/a.
//
// Ojo: esta página NO se envuelve en <ModuloGuard>. Es a propósito — el docente
// entra aquí justamente cuando sus módulos ya están fuera de plazo, así que
// bloquearla por cronograma la volvería inútil.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Hourglass,
  Send,
  ShieldCheck,
  Unlock,
  UserCheck,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  Habilitacion,
  ModuloHabilitable,
  fechaLimitePorDefecto,
  formatearFecha,
  habilitacionesFetch,
} from "@/lib/habilitaciones"

const MODULOS_PRESELECCIONADOS = ["/dashboard/docente/editor-syllabus"]

/** Los 3 pasos del trámite, para que el docente vea dónde está el suyo. */
function Pasos({ estado }: { estado: Habilitacion["estado"] }) {
  const pasoActual =
    estado === "solicitada" ? 1 : estado === "pendiente" ? 2 : estado === "aprobada" ? 3 : 0

  const pasos = [
    { n: 1, label: "Tu coordinador la revisa" },
    { n: 2, label: "El Decano/a o Director/a la autoriza" },
    { n: 3, label: "Se te reabre el acceso" },
  ]

  if (estado === "rechazada" || estado === "revocada") {
    return (
      <p className="text-sm text-red-700 flex items-center gap-1.5">
        <XCircle className="h-4 w-4" />
        {estado === "rechazada" ? "No fue aprobada." : "La habilitación fue revocada."}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {pasos.map((p, i) => (
        <span key={p.n} className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              p.n < pasoActual
                ? "bg-green-100 text-green-800"
                : p.n === pasoActual
                ? "bg-amber-100 text-amber-800 font-medium"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {p.n < pasoActual ? <CheckCircle2 className="h-3 w-3" /> : <span className="font-semibold">{p.n}</span>}
            {p.label}
          </span>
          {i < pasos.length - 1 && <span className="text-gray-300">→</span>}
        </span>
      ))}
    </div>
  )
}

export default function SolicitarHabilitacionPage() {
  const { token, getToken } = useAuth()
  const authToken = getToken?.() || token || ""

  const [solicitudes, setSolicitudes] = useState<Habilitacion[]>([])
  const [modulos, setModulos] = useState<ModuloHabilitable[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [modulosSel, setModulosSel] = useState<string[]>(MODULOS_PRESELECCIONADOS)
  const [fechaFin, setFechaFin] = useState(fechaLimitePorDefecto())
  const [motivo, setMotivo] = useState("")
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    if (!authToken) return
    setCargando(true)
    try {
      const [ms, ss] = await Promise.all([
        habilitacionesFetch<ModuloHabilitable[]>(authToken, "/modulos"),
        habilitacionesFetch<Habilitacion[]>(authToken, "/mias"),
      ])
      setModulos(ms || [])
      setSolicitudes(ss || [])
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [authToken])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Mientras haya un trámite abierto no dejamos pedir otro: el backend lo
  // rechaza igual, pero es mejor no ofrecer un botón que va a fallar.
  const enCurso = solicitudes.find((s) => s.estado === "solicitada" || s.estado === "pendiente")
  const vigente = solicitudes.find((s) => s.vigente)

  const alternarModulo = (key: string) => {
    setModulosSel((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]))
  }

  const enviar = async () => {
    setEnviando(true)
    setError(null)
    try {
      await habilitacionesFetch(authToken, "/solicitar", {
        method: "POST",
        body: JSON.stringify({
          modulos: modulosSel,
          fecha_fin: new Date(fechaFin).toISOString(),
          motivo,
        }),
      })
      setAviso("Solicitud enviada a tu coordinador de carrera. Te avisará cuando haya respuesta.")
      setMotivo("")
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const badgeDe = (s: Habilitacion) => {
    if (s.estado === "solicitada") {
      return (
        <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">
          <UserCheck className="h-3 w-3 mr-1" /> Con tu coordinador
        </Badge>
      )
    }
    if (s.estado === "pendiente") {
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          <Hourglass className="h-3 w-3 mr-1" /> Esperando autorización
        </Badge>
      )
    }
    if (s.estado === "aprobada") {
      return (
        <Badge className={s.vigente ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-700 hover:bg-gray-100"}>
          <Unlock className="h-3 w-3 mr-1" /> {s.vigente ? "Habilitado" : "Vencida"}
        </Badge>
      )
    }
    if (s.estado === "rechazada") {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" /> Rechazada
        </Badge>
      )
    }
    return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Revocada</Badge>
  }

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-4xl mx-auto px-6 py-8">
          <Link
            href="/dashboard/docente"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al panel
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Pedir habilitación</h1>
            <p className="text-gray-500">
              Si tu plazo para editar el syllabus ya cerró, puedes pedir que te lo reabran.
            </p>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 mb-6 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
            <p className="text-sm text-sky-900">
              Tu solicitud va primero a tu <strong>coordinador/a de carrera</strong>. Si él la eleva, la autoriza el{" "}
              <strong>Decano/a</strong> o el <strong>Director/a Académico/a</strong> — basta con que uno de los dos la
              apruebe.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {aviso && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{aviso}</span>
            </div>
          )}

          {vigente && (
            <Card className="mb-6 border-green-300 bg-green-50">
              <CardContent className="p-4 flex items-start gap-3">
                <Unlock className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Ya tienes el acceso reabierto</p>
                  <p className="text-sm text-green-800">
                    {vigente.modulos_labels.join(" · ")} — hasta {formatearFecha(vigente.fecha_fin)}. Después de esa
                    fecha se cierra automáticamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulario: solo si no hay un trámite abierto */}
          {enCurso ? (
            <Card className="mb-8 border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hourglass className="h-5 w-5 text-amber-600" />
                  Tu solicitud está en trámite
                </CardTitle>
                <CardDescription>
                  No puedes enviar otra hasta que se resuelva esta. Así va tu solicitud:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Pasos estado={enCurso.estado} />
                <p className="text-sm text-gray-700">
                  <strong>Pediste:</strong> {enCurso.modulos_labels.join(" · ")} — hasta{" "}
                  {formatearFecha(enCurso.fecha_fin)}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Nueva solicitud</CardTitle>
                <CardDescription>Cuéntale a tu coordinador qué necesitas y por qué.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>¿Qué necesitas que te reabran?</Label>
                  <div className="space-y-2 rounded-lg border p-3">
                    {modulos.map((m) => (
                      <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={modulosSel.includes(m.key)} onCheckedChange={() => alternarModulo(m.key)} />
                        <span>{m.label}</span>
                      </label>
                    ))}
                    {modulos.length === 0 && !cargando && (
                      <p className="text-sm text-gray-500">No hay módulos disponibles.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaFin">¿Hasta cuándo lo necesitas?</Label>
                  <Input
                    id="fechaFin"
                    type="datetime-local"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Tu coordinador puede ajustar esta fecha antes de enviarla a la autoridad.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivo">Motivo</Label>
                  <Textarea
                    id="motivo"
                    rows={4}
                    placeholder="Ej.: estuve con licencia médica del 3 al 20 y no alcancé a subir el syllabus."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Obligatorio: es lo que van a leer para decidir.
                  </p>
                </div>

                <Button
                  onClick={enviar}
                  disabled={enviando || cargando || modulosSel.length === 0 || !motivo.trim() || !fechaFin}
                  className="w-full bg-sky-700 hover:bg-sky-800"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {enviando ? "Enviando..." : "Enviar a mi coordinador"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Mis solicitudes</CardTitle>
              <CardDescription>Historial de todo lo que has pedido.</CardDescription>
            </CardHeader>
            <CardContent>
              {cargando ? (
                <div className="py-8 text-center text-gray-500">Cargando...</div>
              ) : solicitudes.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">Todavía no has pedido ninguna habilitación.</div>
              ) : (
                <div className="space-y-3">
                  {solicitudes.map((s) => (
                    <div key={s.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800">{s.modulos_labels.join(" · ")}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Pedida el {formatearFecha(s.created_at)} — hasta {formatearFecha(s.fecha_fin)}
                          </p>
                        </div>
                        {badgeDe(s)}
                      </div>
                      <Pasos estado={s.estado} />
                      {s.motivo && <p className="text-sm text-gray-600 italic mt-2">“{s.motivo}”</p>}
                      {s.observacion && (
                        <p className="text-sm text-gray-700 mt-2 rounded bg-gray-50 border p-2">
                          <strong>Respuesta:</strong> {s.observacion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
