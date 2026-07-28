"use client"

// Pantalla del coordinador para reabrirle el syllabus a un docente cuya ventana
// del cronograma ya cerró. El coordinador NO habilita por su cuenta: crea una
// solicitud que debe autorizar el Decano/a o el Director/a Académico/a. Basta
// con que uno de los dos la apruebe para que el docente recupere el acceso.

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Hourglass,
  Inbox,
  Search,
  Send,
  ShieldCheck,
  Unlock,
  XCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  DocenteHabilitable,
  ETIQUETA_ROL_AUTORIZADOR,
  Habilitacion,
  ModuloHabilitable,
  fechaLimitePorDefecto,
  formatearFecha,
  habilitacionesFetch,
} from "@/lib/habilitaciones"

const MODULOS_PRESELECCIONADOS = ["/dashboard/docente/editor-syllabus"]

function EstadoDocente({ docente }: { docente: DocenteHabilitable }) {
  const h = docente.habilitacion
  if (!h) {
    return <Badge variant="outline" className="text-gray-500">Sin habilitación</Badge>
  }
  if (h.estado === "solicitada") {
    return (
      <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">
        <Inbox className="h-3 w-3 mr-1" /> Te la pidió el docente
      </Badge>
    )
  }
  if (h.estado === "pendiente") {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        <Hourglass className="h-3 w-3 mr-1" /> Esperando autorización
      </Badge>
    )
  }
  if (h.estado === "aprobada" && h.vigente) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <Unlock className="h-3 w-3 mr-1" /> Habilitado
      </Badge>
    )
  }
  if (h.estado === "aprobada") {
    return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Habilitación vencida</Badge>
  }
  if (h.estado === "rechazada") {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
        <XCircle className="h-3 w-3 mr-1" /> Rechazada
      </Badge>
    )
  }
  return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Revocada</Badge>
}

export default function HabilitarDocentesPage() {
  const { token, getToken } = useAuth()

  const [docentes, setDocentes] = useState<DocenteHabilitable[]>([])
  const [solicitudes, setSolicitudes] = useState<Habilitacion[]>([])
  const [modulos, setModulos] = useState<ModuloHabilitable[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Diálogo de solicitud
  const [docenteSel, setDocenteSel] = useState<DocenteHabilitable | null>(null)
  const [modulosSel, setModulosSel] = useState<string[]>(MODULOS_PRESELECCIONADOS)
  const [fechaFin, setFechaFin] = useState(fechaLimitePorDefecto())
  const [motivo, setMotivo] = useState("")
  const [enviando, setEnviando] = useState(false)

  // Diálogo para tramitar lo que pidió un docente
  const [tramitando, setTramitando] = useState<Habilitacion | null>(null)
  const [tramiteModulos, setTramiteModulos] = useState<string[]>([])
  const [tramiteFecha, setTramiteFecha] = useState("")
  const [tramiteObs, setTramiteObs] = useState("")
  const [tramiteEnviando, setTramiteEnviando] = useState(false)

  const authToken = getToken?.() || token || ""

  const cargar = useCallback(async () => {
    if (!authToken) return
    setCargando(true)
    try {
      const [ds, ss, ms] = await Promise.all([
        habilitacionesFetch<DocenteHabilitable[]>(authToken, "/docentes"),
        habilitacionesFetch<Habilitacion[]>(authToken, ""),
        habilitacionesFetch<ModuloHabilitable[]>(authToken, "/modulos"),
      ])
      setDocentes(ds || [])
      setSolicitudes(ss || [])
      setModulos(ms || [])
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

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return docentes
    return docentes.filter(
      (d) =>
        d.nombre_completo.toLowerCase().includes(q) ||
        (d.email || "").toLowerCase().includes(q)
    )
  }, [docentes, busqueda])

  const pedidasPorDocentes = solicitudes.filter((s) => s.estado === "solicitada")
  const pendientes = solicitudes.filter((s) => s.estado === "pendiente")
  const vigentes = solicitudes.filter((s) => s.vigente)

  // datetime-local necesita 'YYYY-MM-DDTHH:mm' en hora local, no un ISO en UTC
  const aInputLocal = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return fechaLimitePorDefecto()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const abrirTramite = (s: Habilitacion) => {
    setTramitando(s)
    setTramiteModulos(s.modulos)
    setTramiteFecha(aInputLocal(s.fecha_fin))
    setTramiteObs("")
    setError(null)
  }

  const alternarTramiteModulo = (key: string) => {
    setTramiteModulos((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]))
  }

  const resolverTramite = async (accion: "enviar" | "descartar") => {
    if (!tramitando) return
    setTramiteEnviando(true)
    try {
      await habilitacionesFetch(authToken, `/${tramitando.id}/tramitar`, {
        method: "PUT",
        body: JSON.stringify({
          accion,
          modulos: tramiteModulos,
          fecha_fin: new Date(tramiteFecha).toISOString(),
          observacion: tramiteObs,
        }),
      })
      setTramitando(null)
      setAviso(
        accion === "enviar"
          ? "Solicitud elevada. Ahora la debe autorizar el Decano/a o el Director/a Académico/a."
          : "Solicitud descartada. El docente verá tu respuesta."
      )
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTramiteEnviando(false)
    }
  }

  const abrirSolicitud = (docente: DocenteHabilitable) => {
    setDocenteSel(docente)
    setModulosSel(MODULOS_PRESELECCIONADOS)
    setFechaFin(fechaLimitePorDefecto())
    setMotivo("")
    setError(null)
  }

  const alternarModulo = (key: string) => {
    setModulosSel((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]))
  }

  const enviarSolicitud = async () => {
    if (!docenteSel) return
    setEnviando(true)
    try {
      await habilitacionesFetch(authToken, "", {
        method: "POST",
        body: JSON.stringify({
          docente_id: docenteSel.id,
          modulos: modulosSel,
          // datetime-local entrega hora local sin zona: la convertimos a ISO
          fecha_fin: new Date(fechaFin).toISOString(),
          motivo,
        }),
      })
      setDocenteSel(null)
      setAviso(
        "Solicitud enviada. El Decano/a o el Director/a Académico/a debe autorizarla para que el docente quede habilitado."
      )
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const revocar = async (id: number) => {
    if (!confirm("¿Cerrar esta habilitación antes de su fecha límite?")) return
    try {
      await habilitacionesFetch(authToken, `/${id}/revocar`, { method: "PUT", body: JSON.stringify({}) })
      setAviso("Habilitación revocada.")
      await cargar()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["coordinador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <Link
            href="/dashboard/coordinador"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al panel
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Habilitar docentes</h1>
            <p className="text-gray-500">
              Reabre el syllabus a un docente de tu carrera cuando su plazo ya cerró.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-900">
              El trámite lo puede iniciar el <strong>propio docente</strong> (te llega abajo, en “Solicitudes de mis
              docentes”) o puedes iniciarlo tú desde la tabla. En los dos casos la habilitación{" "}
              <strong>no se aplica sola</strong>: la debe autorizar el <strong>Decano/a de Facultad</strong> o el{" "}
              <strong>Director/a Académico/a</strong> — basta con que uno de los dos la apruebe.
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">{docentes.length}</div>
                <div className="text-sm text-gray-500">Docentes de mi carrera</div>
              </CardContent>
            </Card>
            <Card className={pedidasPorDocentes.length > 0 ? "border-sky-300 bg-sky-50" : ""}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-sky-600">{pedidasPorDocentes.length}</div>
                <div className="text-sm text-gray-500">Pedidas por docentes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{pendientes.length}</div>
                <div className="text-sm text-gray-500">Esperando autorización</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{vigentes.length}</div>
                <div className="text-sm text-gray-500">Habilitaciones vigentes</div>
              </CardContent>
            </Card>
          </div>

          {/* === LO QUE PIDIERON LOS DOCENTES: paso previo del flujo === */}
          <Card className="mb-8 border-sky-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Inbox className="h-5 w-5 text-sky-600" />
                Solicitudes de mis docentes ({pedidasPorDocentes.length})
              </CardTitle>
              <CardDescription>
                Tus docentes pidieron que les reabran el plazo. Revisa el motivo y elévalo a la autoridad, o descártalo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cargando ? (
                <div className="py-8 text-center text-gray-500">Cargando...</div>
              ) : pedidasPorDocentes.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Ningún docente te ha pedido habilitación por ahora.
                </div>
              ) : (
                <div className="space-y-3">
                  {pedidasPorDocentes.map((s) => (
                    <div key={s.id} className="rounded-lg border border-sky-200 bg-sky-50/40 p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold text-gray-900">{s.docente_nombre}</p>
                          <p className="text-xs text-gray-500">Pedida el {formatearFecha(s.created_at)}</p>
                          <p className="text-sm text-gray-700">
                            <strong>Pide:</strong> {s.modulos_labels.join(" · ")} — hasta {formatearFecha(s.fecha_fin)}
                          </p>
                          {s.motivo && <p className="text-sm text-gray-600 italic">“{s.motivo}”</p>}
                        </div>
                        <Button
                          size="sm"
                          className="bg-sky-700 hover:bg-sky-800 shrink-0"
                          onClick={() => abrirTramite(s)}
                        >
                          <Send className="h-4 w-4 mr-1" /> Revisar y elevar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Docentes de mi carrera ({filtrados.length})</CardTitle>
              <CardDescription>Elige a quién quieres habilitar y envía la solicitud.</CardDescription>
              <div className="relative pt-2 max-w-sm">
                <Search className="absolute left-3 top-5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o correo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {cargando ? (
                <div className="py-12 text-center text-gray-500">Cargando docentes...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Docente</TableHead>
                        <TableHead className="font-semibold">Correo</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="font-semibold">Habilitado hasta</TableHead>
                        <TableHead className="font-semibold">Autorizó</TableHead>
                        <TableHead className="font-semibold text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtrados.map((d) => {
                        const h = d.habilitacion
                        return (
                          <TableRow key={d.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{d.nombre_completo}</TableCell>
                            <TableCell className="text-gray-600">{d.email || "—"}</TableCell>
                            <TableCell><EstadoDocente docente={d} /></TableCell>
                            <TableCell className="text-gray-600">
                              {h?.vigente ? formatearFecha(h.fecha_fin) : "—"}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {h?.autorizado_por_nombre
                                ? `${h.autorizado_por_nombre} (${
                                    ETIQUETA_ROL_AUTORIZADOR[h.autorizado_por_rol || ""] || h.autorizado_por_rol
                                  })`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {h?.estado === "solicitada" ? (
                                <Button
                                  size="sm"
                                  className="bg-sky-700 hover:bg-sky-800"
                                  onClick={() => abrirTramite(h)}
                                >
                                  <Send className="h-4 w-4 mr-1" /> Revisar y elevar
                                </Button>
                              ) : h?.vigente ? (
                                <Button size="sm" variant="outline" onClick={() => revocar(h.id)}>
                                  Revocar
                                </Button>
                              ) : h?.estado === "pendiente" ? (
                                <span className="text-xs text-amber-600 inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> En espera
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  className="bg-indigo-700 hover:bg-indigo-800"
                                  onClick={() => abrirSolicitud(d)}
                                >
                                  Solicitar habilitación
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {filtrados.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No hay docentes que coincidan con la búsqueda.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Historial de solicitudes</CardTitle>
              <CardDescription>Todas las habilitaciones pedidas para tu carrera.</CardDescription>
            </CardHeader>
            <CardContent>
              {solicitudes.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">Todavía no has solicitado ninguna habilitación.</div>
              ) : (
                <div className="space-y-3">
                  {solicitudes.map((s) => (
                    <div key={s.id} className="rounded-lg border p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800">
                            {s.docente_nombre}
                            {s.origen === "docente" && (
                              <span className="ml-2 text-[11px] font-normal text-sky-700 bg-sky-100 rounded px-1.5 py-0.5">
                                la pidió el docente
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {s.modulos_labels.join(" · ")} — hasta {formatearFecha(s.fecha_fin)}
                          </p>
                          {s.motivo && <p className="text-sm text-gray-600 mt-1 italic">“{s.motivo}”</p>}
                          {s.observacion && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Respuesta:</strong> {s.observacion}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {s.estado === "solicitada" && (
                            <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Esperando tu trámite</Badge>
                          )}
                          {s.estado === "pendiente" && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendiente</Badge>
                          )}
                          {s.estado === "aprobada" && (
                            <Badge className={s.vigente ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-700 hover:bg-gray-100"}>
                              {s.vigente ? "Autorizada" : "Vencida"}
                            </Badge>
                          )}
                          {s.estado === "rechazada" && (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rechazada</Badge>
                          )}
                          {s.estado === "revocada" && (
                            <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Revocada</Badge>
                          )}
                          {s.autorizado_por_nombre && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              {ETIQUETA_ROL_AUTORIZADOR[s.autorizado_por_rol || ""] || s.autorizado_por_rol}:{" "}
                              {s.autorizado_por_nombre}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Trámite de lo que pidió un docente: el coordinador lo eleva o lo descarta */}
        <Dialog open={!!tramitando} onOpenChange={(abierto) => !abierto && setTramitando(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Revisar solicitud del docente</DialogTitle>
              <DialogDescription>
                <strong>{tramitando?.docente_nombre}</strong> pidió que le reabran el plazo. Puedes ajustar lo que
                pidió antes de elevarlo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {tramitando?.motivo && (
                <div className="rounded-lg bg-gray-50 border p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Motivo del docente</p>
                  <p className="text-sm text-gray-700 italic">“{tramitando.motivo}”</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>¿Qué se le reabre?</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {modulos.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={tramiteModulos.includes(m.key)}
                        onCheckedChange={() => alternarTramiteModulo(m.key)}
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tramiteFecha">Habilitado hasta</Label>
                <Input
                  id="tramiteFecha"
                  type="datetime-local"
                  value={tramiteFecha}
                  onChange={(e) => setTramiteFecha(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tramiteObs">Observación (la verá el docente)</Label>
                <Textarea
                  id="tramiteObs"
                  rows={3}
                  placeholder="Ej.: aval con el certificado médico adjunto."
                  value={tramiteObs}
                  onChange={(e) => setTramiteObs(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => resolverTramite("descartar")}
                disabled={tramiteEnviando}
                className="text-red-700 hover:text-red-800"
              >
                <XCircle className="h-4 w-4 mr-1" /> Descartar
              </Button>
              <Button
                onClick={() => resolverTramite("enviar")}
                disabled={tramiteEnviando || tramiteModulos.length === 0 || !tramiteFecha}
                className="bg-sky-700 hover:bg-sky-800"
              >
                <Send className="h-4 w-4 mr-1" />
                {tramiteEnviando ? "Enviando..." : "Elevar a autorización"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!docenteSel} onOpenChange={(abierto) => !abierto && setDocenteSel(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Solicitar habilitación</DialogTitle>
              <DialogDescription>
                Para <strong>{docenteSel?.nombre_completo}</strong>. La autorizará el Decano/a o el Director/a
                Académico/a.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>¿Qué se le reabre?</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {modulos.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={modulosSel.includes(m.key)}
                        onCheckedChange={() => alternarModulo(m.key)}
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFin">Habilitado hasta</Label>
                <Input
                  id="fechaFin"
                  type="datetime-local"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
                <p className="text-xs text-gray-500">Pasada esta fecha, el acceso se cierra automáticamente.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo</Label>
                <Textarea
                  id="motivo"
                  placeholder="Ej.: el docente estuvo con licencia médica durante el plazo de carga."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDocenteSel(null)} disabled={enviando}>
                Cancelar
              </Button>
              <Button
                onClick={enviarSolicitud}
                disabled={enviando || modulosSel.length === 0 || !fechaFin}
                className="bg-indigo-700 hover:bg-indigo-800"
              >
                {enviando ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
