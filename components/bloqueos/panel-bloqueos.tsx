"use client"

// Menú unificado de bloqueos: una sola pantalla para bloquear celdas del
// SYLLABUS y del PROGRAMA ANALÍTICO, con la opción de aplicar esos mismos
// bloqueos a todos los documentos de la carrera de una sola vez.
//
// Los dos paneles (administración y comisión) trabajan sobre los MISMOS
// documentos: los de comisión, que son los que el docente realmente abre. La
// plantilla en blanco del admin no se toca desde aquí — bloquear ahí no le
// llega a nadie por sí solo. Los dos paneles listan TODO (todas las facultades
// y carreras) y filtran en pantalla; `modo` solo matiza el texto de cabecera.
//
// A diferencia de los editores completos, aquí el contenido de las celdas es
// de solo lectura: se hace clic para bloquear/liberar, nada más. Eso evita el
// riesgo de tocar el contenido sin querer mientras se configuran los permisos.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, ArrowLeft, CheckCircle2, Layers, Lock, LockOpen, Save, Unlock } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export type ModoBloqueos = "admin" | "comision"

type TipoDoc = "syllabus" | "programa"
type EstadoCelda = "libre" | "bloqueada" | "liberada"

type Alcance = "seleccion" | "periodo" | "carrera" | "facultad" | "todos"

const TIPOS: { value: TipoDoc; label: string }[] = [
  { value: "syllabus", label: "Syllabus de comisión" },
  { value: "programa", label: "Programa Analítico de comisión" },
]

interface Props {
  modo: ModoBloqueos
  /** Ruta del panel del rol, para el enlace "Volver" */
  volverA: string
}

interface DocumentoResumen {
  id: number
  nombre: string
  periodo: string | null
  asignatura_id: number | null
  asignatura_nombre: string | null
  carrera_id: number | null
  carrera_nombre: string | null
  facultad_id: number | null
  facultad_nombre: string | null
  pestanas: number
  bloqueadas: number
  liberadas: number
}

interface Celda {
  indice: number
  contenido: string
  esEncabezado: boolean
  estado: EstadoCelda
}
interface Fila {
  indice: number
  celdas: Celda[]
}
interface Pestana {
  indice: number
  titulo: string
  filas: Fila[]
}
interface Documento {
  id: number
  tipo: TipoDoc
  nombre: string
  periodo: string | null
  carrera_id: number | null
  carrera_nombre: string | null
  facultad_id: number | null
  facultad_nombre: string | null
  tabs: Pestana[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

/** Un clic recorre los 3 estados: libre → bloqueada → liberada → libre */
const siguienteEstado = (estado: EstadoCelda): EstadoCelda =>
  estado === "libre" ? "bloqueada" : estado === "bloqueada" ? "liberada" : "libre"

const ESTILO_CELDA: Record<EstadoCelda, string> = {
  libre: "bg-white hover:bg-gray-100 border-gray-200",
  bloqueada: "bg-red-100 hover:bg-red-200 border-red-300 text-red-900",
  liberada: "bg-green-100 hover:bg-green-200 border-green-300 text-green-900",
}

export function PanelBloqueos({ modo, volverA }: Props) {
  const { token, getToken } = useAuth()
  const authToken = getToken?.() || token || ""

  const [tipo, setTipo] = useState<TipoDoc>("syllabus")
  const [documentos, setDocumentos] = useState<DocumentoResumen[]>([])
  const [docId, setDocId] = useState<string>("")
  const [documento, setDocumento] = useState<Documento | null>(null)
  const [tabActiva, setTabActiva] = useState(0)

  // Cambios pendientes, indexados por "tab:fila:celda"
  const [cambios, setCambios] = useState<Record<string, EstadoCelda>>({})
  const [aplicarATodos, setAplicarATodos] = useState(false)
  const [scope, setScope] = useState<Alcance>("carrera")
  // Documentos elegidos a mano cuando el alcance es "seleccion"
  const [seleccionados, setSeleccionados] = useState<number[]>([])
  const [filtroFacultad, setFiltroFacultad] = useState<string>("all")
  const [filtroCarrera, setFiltroCarrera] = useState<string>("all")

  const [cargandoLista, setCargandoLista] = useState(false)
  const [cargandoDoc, setCargandoDoc] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const pedir = useCallback(
    async (path: string, opts: RequestInit = {}) => {
      const res = await fetch(`${API_URL}/bloqueos${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}`, ...opts.headers },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) throw new Error(data?.message || `Error ${res.status}`)
      return data.data
    },
    [authToken]
  )

  // Al cambiar de tipo, la lista y el documento abierto dejan de ser válidos
  useEffect(() => {
    if (!authToken) return
    let cancelado = false
    setCargandoLista(true)
    setDocId("")
    setDocumento(null)
    setCambios({})
    setSeleccionados([])
    pedir(`/documentos?tipo=${tipo}`)
      .then((d) => {
        if (!cancelado) {
          setDocumentos(d || [])
          setError(null)
        }
      })
      .catch((e) => !cancelado && setError(e.message))
      .finally(() => !cancelado && setCargandoLista(false))
    return () => {
      cancelado = true
    }
  }, [tipo, authToken, pedir])

  const abrirDocumento = async (id: string) => {
    setDocId(id)
    setCambios({})
    setSeleccionados([])
    setTabActiva(0)
    if (!id) {
      setDocumento(null)
      return
    }
    setCargandoDoc(true)
    try {
      const d = await pedir(`/documento/${tipo}/${id}`)
      setDocumento(d)
      // El alcance por carrera es el que se usa normalmente, pero si el
      // documento no cuelga de una asignatura con carrera no aplica.
      setScope(d?.carrera_id ? "carrera" : "periodo")
      setError(null)
    } catch (e: any) {
      setError(e.message)
      setDocumento(null)
    } finally {
      setCargandoDoc(false)
    }
  }

  // Estado efectivo de una celda = lo pendiente si se tocó, si no lo guardado
  const estadoDe = (t: number, f: number, c: number, guardado: EstadoCelda): EstadoCelda =>
    cambios[`${t}:${f}:${c}`] ?? guardado

  const alternar = (t: number, f: number, c: number, guardado: EstadoCelda) => {
    const clave = `${t}:${f}:${c}`
    const nuevo = siguienteEstado(estadoDe(t, f, c, guardado))
    setCambios((prev) => {
      const copia = { ...prev }
      // Si vuelve a coincidir con lo guardado, deja de ser un cambio pendiente
      if (nuevo === guardado) delete copia[clave]
      else copia[clave] = nuevo
      return copia
    })
  }

  /** Bloquea o libera todas las celdas no vacías de la pestaña abierta. */
  const aplicarAPestana = (estado: EstadoCelda) => {
    const tab = documento?.tabs[tabActiva]
    if (!tab) return
    setCambios((prev) => {
      const copia = { ...prev }
      for (const fila of tab.filas) {
        for (const celda of fila.celdas) {
          const clave = `${tab.indice}:${fila.indice}:${celda.indice}`
          if (estado === celda.estado) delete copia[clave]
          else copia[clave] = estado
        }
      }
      return copia
    })
  }

  const totalCambios = Object.keys(cambios).length

  // Facultades y carreras presentes en la lista, para los filtros del selector
  const facultades = useMemo(() => {
    const mapa = new Map<number, string>()
    for (const d of documentos) {
      if (d.facultad_id) mapa.set(d.facultad_id, d.facultad_nombre || `Facultad ${d.facultad_id}`)
    }
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre }))
  }, [documentos])

  // Las carreras se acotan a la facultad elegida: no tiene sentido ofrecer
  // carreras que el filtro de arriba ya dejó fuera.
  const carreras = useMemo(() => {
    const mapa = new Map<number, string>()
    for (const d of documentos) {
      if (filtroFacultad !== "all" && String(d.facultad_id) !== filtroFacultad) continue
      if (d.carrera_id) mapa.set(d.carrera_id, d.carrera_nombre || `Carrera ${d.carrera_id}`)
    }
    return [...mapa.entries()].map(([id, nombre]) => ({ id, nombre }))
  }, [documentos, filtroFacultad])

  const documentosVisibles = useMemo(
    () =>
      documentos.filter(
        (d) =>
          (filtroFacultad === "all" || String(d.facultad_id) === filtroFacultad) &&
          (filtroCarrera === "all" || String(d.carrera_id) === filtroCarrera)
      ),
    [documentos, filtroFacultad, filtroCarrera]
  )

  // Candidatos a destino: todos los del mismo tipo menos el que estoy editando
  const candidatos = useMemo(
    () => (documento ? documentosVisibles.filter((d) => d.id !== documento.id) : []),
    [documentosVisibles, documento]
  )

  // Cuántos documentos alcanzaría el "aplicar a todos" según el alcance elegido
  const alcanceEstimado = useMemo(() => {
    if (!documento) return 0
    const otros = documentos.filter((d) => d.id !== documento.id)
    if (scope === "seleccion") return seleccionados.length
    if (scope === "todos") return otros.length
    if (scope === "carrera") {
      if (!documento.carrera_id) return 0
      return otros.filter((d) => d.carrera_id === documento.carrera_id).length
    }
    if (scope === "facultad") {
      if (!documento.facultad_id) return 0
      return otros.filter((d) => d.facultad_id === documento.facultad_id).length
    }
    return otros.filter((d) => d.periodo === documento.periodo).length
  }, [documento, documentos, scope, seleccionados])

  const resumen = useMemo(() => {
    if (!documento) return { bloqueadas: 0, liberadas: 0 }
    let bloqueadas = 0
    let liberadas = 0
    for (const tab of documento.tabs) {
      for (const fila of tab.filas) {
        for (const celda of fila.celdas) {
          const e = estadoDe(tab.indice, fila.indice, celda.indice, celda.estado)
          if (e === "bloqueada") bloqueadas++
          else if (e === "liberada") liberadas++
        }
      }
    }
    return { bloqueadas, liberadas }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documento, cambios])

  const guardar = async () => {
    if (!documento) return
    setGuardando(true)
    setError(null)
    try {
      const data = await pedir(`/documento/${tipo}/${documento.id}`, {
        method: "PUT",
        body: JSON.stringify({ cambios, aplicarATodos, scope, targetIds: seleccionados }),
      })
      const rep = data?.replicado
      setAviso(
        aplicarATodos && rep
          ? `Guardado. Bloqueos replicados a ${rep.afectados} de ${rep.destinos} documentos${
              rep.motivo ? ` (${rep.motivo})` : ""
            }.`
          : `Guardado: ${data?.celdasActualizadas ?? 0} celda(s) actualizada(s).`
      )
      setCambios({})
      await abrirDocumento(String(documento.id))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const tab = documento?.tabs[tabActiva]

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
            <Link
              href={volverA}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4" /> Volver al panel
            </Link>

            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Bloqueo de celdas</h1>
              <p className="text-gray-500">
                Define qué celdas puede editar el docente en los syllabus y programas analíticos de comisión
                {modo === "admin" ? " de todas las facultades y carreras" : ""}. Bloquea uno y, con el check, aplica el
                mismo bloqueo de forma masiva.
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

            {/* --- Selector de documento --- */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">1. Elige el documento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de documento</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDoc)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Facultad</Label>
                    <Select
                      value={filtroFacultad}
                      onValueChange={(v) => {
                        setFiltroFacultad(v)
                        setFiltroCarrera("all")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las facultades</SelectItem>
                        {facultades.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Carrera</Label>
                    <Select value={filtroCarrera} onValueChange={setFiltroCarrera}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las carreras</SelectItem>
                        {carreras.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Documento ({documentosVisibles.length} disponibles)</Label>
                    <Select value={docId} onValueChange={abrirDocumento} disabled={cargandoLista}>
                      <SelectTrigger>
                        <SelectValue placeholder={cargandoLista ? "Cargando..." : "Selecciona uno"} />
                      </SelectTrigger>
                      <SelectContent>
                        {documentosVisibles.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.nombre}
                            {d.carrera_nombre ? ` — ${d.carrera_nombre}` : ""}
                            {d.facultad_nombre ? ` (${d.facultad_nombre})` : ""}
                            {d.periodo ? ` — ${d.periodo}` : ""}
                            {d.bloqueadas > 0 ? ` · ${d.bloqueadas} bloqueadas` : ""}
                          </SelectItem>
                        ))}
                        {documentosVisibles.length === 0 && !cargandoLista && (
                          <div className="px-2 py-3 text-sm text-gray-500">No hay documentos con ese filtro.</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {cargandoDoc && (
              <div className="py-16 text-center text-gray-500">Cargando documento...</div>
            )}

            {documento && !cargandoDoc && (
              <>
                {/* --- Grilla de celdas --- */}
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="text-lg">2. Marca las celdas</CardTitle>
                        <CardDescription>
                          Haz clic en una celda para recorrer los estados:{" "}
                          <strong>libre → bloqueada → liberada</strong>.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          <Lock className="h-3 w-3 mr-1" /> {resumen.bloqueadas} bloqueadas
                        </Badge>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          <LockOpen className="h-3 w-3 mr-1" /> {resumen.liberadas} liberadas
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-lg bg-gray-50 border p-3 text-xs text-gray-600 mt-3 space-y-1">
                      <p>
                        <strong className="text-red-700">Bloqueada</strong>: el docente la ve pero no la puede escribir.
                      </p>
                      <p>
                        <strong className="text-green-700">Liberada</strong>: el docente la puede escribir aunque la
                        plantilla de administración la haya bloqueado — este estado gana sobre ese bloqueo.
                      </p>
                      <p>
                        <strong>Libre</strong>: sin opinión aquí; manda lo que haya definido la plantilla de
                        administración.
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Pestañas */}
                    <div className="flex gap-1 flex-wrap border-b mb-4 pb-2">
                      {documento.tabs.map((t) => (
                        <button
                          key={t.indice}
                          onClick={() => setTabActiva(t.indice)}
                          className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
                            t.indice === tabActiva
                              ? "bg-indigo-700 text-white font-medium"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {t.titulo}
                        </button>
                      ))}
                    </div>

                    {/* Acciones masivas de la pestaña */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => aplicarAPestana("bloqueada")}>
                        <Lock className="h-3.5 w-3.5 mr-1" /> Bloquear toda la pestaña
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => aplicarAPestana("liberada")}>
                        <LockOpen className="h-3.5 w-3.5 mr-1" /> Liberar toda la pestaña
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => aplicarAPestana("libre")}>
                        Quitar marcas de la pestaña
                      </Button>
                    </div>

                    {tab && (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full border-collapse">
                          <tbody>
                            {tab.filas.map((fila) => (
                              <tr key={fila.indice}>
                                {fila.celdas.map((celda) => {
                                  const estado = estadoDe(tab.indice, fila.indice, celda.indice, celda.estado)
                                  const pendiente = `${tab.indice}:${fila.indice}:${celda.indice}` in cambios
                                  return (
                                    <td
                                      key={celda.indice}
                                      onClick={() => alternar(tab.indice, fila.indice, celda.indice, celda.estado)}
                                      title={`${estado}${pendiente ? " (sin guardar)" : ""}`}
                                      className={`border p-2 text-xs cursor-pointer align-top transition-colors min-w-[110px] max-w-[260px] ${
                                        ESTILO_CELDA[estado]
                                      } ${celda.esEncabezado ? "font-semibold" : ""} ${
                                        pendiente ? "ring-2 ring-inset ring-indigo-400" : ""
                                      }`}
                                    >
                                      <div className="flex items-start gap-1">
                                        {estado === "bloqueada" && <Lock className="h-3 w-3 shrink-0 mt-0.5" />}
                                        {estado === "liberada" && <LockOpen className="h-3 w-3 shrink-0 mt-0.5" />}
                                        <span className="line-clamp-3 break-words">
                                          {celda.contenido || <span className="text-gray-300">(vacía)</span>}
                                        </span>
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* --- Guardar / aplicar a todos --- */}
                <Card className="border-indigo-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">3. Guardar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-start gap-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 cursor-pointer">
                      <Checkbox
                        checked={aplicarATodos}
                        onCheckedChange={(v) => setAplicarATodos(v === true)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-semibold text-amber-900 flex items-center gap-2">
                          <Layers className="h-4 w-4" /> Aplicar estos bloqueos de forma masiva
                        </p>
                        <p className="text-sm text-amber-800">
                          Copia estos mismos bloqueos a los demás{" "}
                          {tipo === "syllabus" ? "syllabus" : "programas analíticos"} de comisión con la misma
                          estructura, para que a todos los docentes les lleguen igual. Solo se copian las marcas de
                          bloqueo — el contenido de cada documento no se toca.
                        </p>
                      </div>
                    </label>

                    {aplicarATodos && (
                      <div className="space-y-2 pl-8">
                        <Label>¿Hasta dónde llega?</Label>
                        <Select value={scope} onValueChange={(v) => setScope(v as Alcance)}>
                          <SelectTrigger className="max-w-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="seleccion">
                              Solo los documentos que yo elija
                            </SelectItem>
                            <SelectItem value="carrera" disabled={!documento.carrera_id}>
                              Todas las de la carrera{" "}
                              {documento.carrera_nombre || "(este documento no tiene carrera)"}
                            </SelectItem>
                            <SelectItem value="facultad" disabled={!documento.facultad_id}>
                              Todas las de la facultad{" "}
                              {documento.facultad_nombre || "(este documento no tiene facultad)"}
                            </SelectItem>
                            <SelectItem value="periodo">
                              Solo las del periodo {documento.periodo || "de este documento"}
                            </SelectItem>
                            <SelectItem value="todos">Todas las carreras y facultades del sistema</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Alcanzaría a <strong>{alcanceEstimado}</strong>{" "}
                          {tipo.startsWith("syllabus") ? "syllabus" : "programa(s) analítico(s)"} además de este.
                        </p>

                        {/* Elección manual de los documentos destino */}
                        {scope === "seleccion" && (
                          <div className="rounded-lg border bg-white">
                            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                              <p className="text-xs text-gray-600">
                                {candidatos.length}{" "}
                                {tipo.startsWith("syllabus") ? "syllabus" : "programas"} disponibles
                                {filtroFacultad !== "all" || filtroCarrera !== "all"
                                  ? " (según los filtros de arriba)"
                                  : ""}
                              </p>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => setSeleccionados(candidatos.map((d) => d.id))}
                                >
                                  Todos
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => setSeleccionados([])}
                                >
                                  Ninguno
                                </Button>
                              </div>
                            </div>
                            <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                              {candidatos.map((d) => (
                                <label
                                  key={d.id}
                                  className="flex items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
                                >
                                  <Checkbox
                                    className="mt-0.5"
                                    checked={seleccionados.includes(d.id)}
                                    onCheckedChange={(v) =>
                                      setSeleccionados((prev) =>
                                        v === true ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                                      )
                                    }
                                  />
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium text-gray-800">{d.nombre}</span>
                                    <span className="block truncate text-xs text-gray-500">
                                      {[d.carrera_nombre, d.facultad_nombre, d.periodo].filter(Boolean).join(" · ")}
                                      {d.bloqueadas > 0 ? ` · ya tiene ${d.bloqueadas} bloqueadas` : ""}
                                    </span>
                                  </span>
                                </label>
                              ))}
                              {candidatos.length === 0 && (
                                <p className="px-2 py-4 text-center text-sm text-gray-500">
                                  No hay otros documentos de este tipo con los filtros actuales.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {((scope === "carrera" && !documento.carrera_id) ||
                          (scope === "facultad" && !documento.facultad_id)) && (
                          <p className="text-xs text-amber-700">
                            Este documento no está vinculado a una asignatura con {scope}, así que este alcance no se
                            puede usar. Elige por periodo.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4 flex-wrap pt-2 border-t">
                      <p className="text-sm text-gray-500">
                        {totalCambios === 0
                          ? "No hay cambios pendientes."
                          : `${totalCambios} celda(s) con cambios sin guardar.`}
                      </p>
                      <Button
                        onClick={guardar}
                        disabled={
                          guardando ||
                          (totalCambios === 0 && !aplicarATodos) ||
                          (aplicarATodos && scope === "seleccion" && seleccionados.length === 0)
                        }
                        className="bg-indigo-700 hover:bg-indigo-800"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {guardando
                          ? "Guardando..."
                          : aplicarATodos
                          ? scope === "seleccion"
                            ? `Guardar y aplicar a ${seleccionados.length} documento(s)`
                            : scope === "carrera"
                            ? "Guardar y aplicar a toda la carrera"
                            : scope === "facultad"
                            ? "Guardar y aplicar a toda la facultad"
                            : "Guardar y aplicar a todos"
                          : "Guardar bloqueos"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!documento && !cargandoDoc && (
              <Card>
                <CardContent className="py-16 text-center text-gray-500">
                  <Unlock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  Selecciona un documento para configurar sus bloqueos.
                </CardContent>
              </Card>
            )}
    </main>
  )
}
