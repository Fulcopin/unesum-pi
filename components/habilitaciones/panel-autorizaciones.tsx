"use client"

// Bandeja de autorizaciones que ven el Decano/a y el Director/a Académico/a.
// Los dos resuelven exactamente lo mismo y basta con que UNO apruebe, así que
// la pantalla es la misma para ambos: solo cambia el alcance (el decano ve su
// facultad, dirección ve todo), y eso lo decide el backend según el rol.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle, ArrowLeft, CheckCircle2, Hourglass, ShieldCheck, Unlock, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  ETIQUETA_ROL_AUTORIZADOR,
  Habilitacion,
  formatearFecha,
  habilitacionesFetch,
} from "@/lib/habilitaciones"

interface Props {
  /** Ruta del panel del rol, para el enlace "Volver" */
  volverA: string
  /** Texto bajo el título, para matizar el alcance de cada rol */
  descripcion: string
}

export function PanelAutorizaciones({ volverA, descripcion }: Props) {
  const { token, getToken } = useAuth()
  const authToken = getToken?.() || token || ""

  const [solicitudes, setSolicitudes] = useState<Habilitacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [resolviendo, setResolviendo] = useState<{ solicitud: Habilitacion; accion: "aprobar" | "rechazar" } | null>(null)
  const [observacion, setObservacion] = useState("")
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    if (!authToken) return
    setCargando(true)
    try {
      const data = await habilitacionesFetch<Habilitacion[]>(authToken, "")
      setSolicitudes(data || [])
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

  const abrir = (solicitud: Habilitacion, accion: "aprobar" | "rechazar") => {
    setResolviendo({ solicitud, accion })
    setObservacion("")
    setError(null)
  }

  const confirmar = async () => {
    if (!resolviendo) return
    setEnviando(true)
    try {
      await habilitacionesFetch(authToken, `/${resolviendo.solicitud.id}/resolver`, {
        method: "PUT",
        body: JSON.stringify({ accion: resolviendo.accion, observacion }),
      })
      setAviso(
        resolviendo.accion === "aprobar"
          ? `Autorizado. ${resolviendo.solicitud.docente_nombre} ya puede editar hasta ${formatearFecha(resolviendo.solicitud.fecha_fin)}.`
          : "Solicitud rechazada."
      )
      setResolviendo(null)
      await cargar()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente")
  const resueltas = solicitudes.filter((s) => s.estado !== "pendiente")

  const badgeDe = (s: Habilitacion) => {
    if (s.estado === "aprobada") {
      return (
        <Badge className={s.vigente ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-700 hover:bg-gray-100"}>
          <Unlock className="h-3 w-3 mr-1" /> {s.vigente ? "Vigente" : "Vencida"}
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

  const detalle = (s: Habilitacion) => (
    <div className="min-w-0 space-y-1">
      <p className="font-semibold text-gray-900">{s.docente_nombre}</p>
      <p className="text-xs text-gray-500">
        {s.carrera_nombre || "Carrera sin nombre"} ·{" "}
        {s.origen === "docente"
          ? `pedida por el propio docente el ${formatearFecha(s.created_at)}, elevada por ${s.tramitado_por_nombre || "su coordinador"}`
          : `solicitada por ${s.solicitado_por_nombre || "—"} el ${formatearFecha(s.created_at)}`}
      </p>
      <p className="text-sm text-gray-700">
        <strong>Se le reabre:</strong> {s.modulos_labels.join(" · ")}
      </p>
      <p className="text-sm text-gray-700">
        <strong>Hasta:</strong> {formatearFecha(s.fecha_fin)}
      </p>
      {s.motivo && <p className="text-sm text-gray-600 italic">“{s.motivo}”</p>}
    </div>
  )

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <Link href={volverA} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver al panel
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Autorizar habilitaciones</h1>
        <p className="text-gray-500">{descripcion}</p>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6 flex gap-3">
        <ShieldCheck className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-900">
          El coordinador de carrera pide reabrir el syllabus a un docente fuera de plazo. Basta con que{" "}
          <strong>tú o el otro rol autorizado</strong> lo apruebe para que el docente recupere el acceso hasta la
          fecha indicada.
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

      <Card className="mb-8 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-amber-600" />
            Pendientes de tu autorización ({pendientes.length})
          </CardTitle>
          <CardDescription>Revisa el motivo y decide si se le reabre el plazo al docente.</CardDescription>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="py-10 text-center text-gray-500">Cargando solicitudes...</div>
          ) : pendientes.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">No hay solicitudes esperando tu autorización.</div>
          ) : (
            <div className="space-y-3">
              {pendientes.map((s) => (
                <div key={s.id} className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {detalle(s)}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-700 hover:bg-green-800"
                        onClick={() => abrir(s, "aprobar")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Autorizar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => abrir(s, "rechazar")}>
                        <XCircle className="h-4 w-4 mr-1" /> Rechazar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Historial ({resueltas.length})</CardTitle>
          <CardDescription>Solicitudes ya resueltas, por ti o por la otra autoridad.</CardDescription>
        </CardHeader>
        <CardContent>
          {resueltas.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">Todavía no hay solicitudes resueltas.</div>
          ) : (
            <div className="space-y-3">
              {resueltas.map((s) => (
                <div key={s.id} className="rounded-lg border p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {detalle(s)}
                    <div className="text-right shrink-0 space-y-1">
                      {badgeDe(s)}
                      {s.autorizado_por_nombre && (
                        <p className="text-[11px] text-gray-500">
                          {ETIQUETA_ROL_AUTORIZADOR[s.autorizado_por_rol || ""] || s.autorizado_por_rol}:{" "}
                          {s.autorizado_por_nombre}
                        </p>
                      )}
                      {s.observacion && <p className="text-[11px] text-gray-500 max-w-[220px]">{s.observacion}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!resolviendo} onOpenChange={(abierto) => !abierto && setResolviendo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {resolviendo?.accion === "aprobar" ? "Autorizar habilitación" : "Rechazar solicitud"}
            </DialogTitle>
            <DialogDescription>
              {resolviendo?.accion === "aprobar" ? (
                <>
                  <strong>{resolviendo?.solicitud.docente_nombre}</strong> podrá editar hasta{" "}
                  {formatearFecha(resolviendo?.solicitud.fecha_fin)}.
                </>
              ) : (
                <>La solicitud para <strong>{resolviendo?.solicitud.docente_nombre}</strong> quedará rechazada.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="observacion">Observación {resolviendo?.accion === "rechazar" ? "" : "(opcional)"}</Label>
            <Textarea
              id="observacion"
              rows={3}
              placeholder={
                resolviendo?.accion === "aprobar"
                  ? "Ej.: se autoriza por licencia médica justificada."
                  : "Explica por qué no se autoriza."
              }
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolviendo(null)} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              onClick={confirmar}
              disabled={enviando}
              className={resolviendo?.accion === "aprobar" ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800"}
            >
              {enviando ? "Guardando..." : resolviendo?.accion === "aprobar" ? "Confirmar autorización" : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
