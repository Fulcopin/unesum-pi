"use client"

import { useState, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Bot, Send, Upload, FileText, BarChart3,
  RefreshCw, AlertCircle, CheckCircle, Loader2, X, File, Database
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface Mensaje {
  id: string
  role: "user" | "assistant"
  content: string
  fuentes?: Array<{ nombre: string; pagina?: number; tipo?: string }>
  timestamp: Date
}

interface Estadisticas {
  totalChunks: number
  documentosIndexados: number
  listaDocumentos: Array<{ nombre: string; id: string; chunks: number }>
}

function ComisionEstadisticasContenido({ estadisticas }: Readonly<{ estadisticas: Estadisticas | null }>) {
  if (!estadisticas) {
    return <p className="text-sm text-gray-400">No se pudo cargar la información.</p>
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-700">{estadisticas.totalChunks ?? 0}</div>
          <div className="text-xs text-gray-500">Chunks indexados</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{estadisticas.listaDocumentos?.length ?? 0}</div>
          <div className="text-xs text-gray-500">Documentos</div>
        </div>
      </div>
      {estadisticas.listaDocumentos?.length > 0 && (
        <div className="space-y-2">
          {estadisticas.listaDocumentos.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 truncate">{doc.nombre}</span>
              {Boolean(doc.chunks) && <Badge variant="secondary" className="text-xs ml-auto">{doc.chunks} chunks</Badge>}
            </div>
          ))}
        </div>
      )}
      {estadisticas.listaDocumentos?.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No hay documentos indexados aún.</p>
      )}
    </div>
  )
}

export default function AsistenteIAComision() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy el asistente académico de UNESUM. Puedo responder preguntas sobre programas de estudio, mallas curriculares, syllabus, créditos y prerequisitos. También puedes subir documentos para que los consulte.",
      timestamp: new Date(),
    },
  ])
  const [pregunta, setPregunta] = useState("")
  const [cargando, setCargando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [cargandoStats, setCargandoStats] = useState(false)
  const [error, setError] = useState("")
  const [exito, setExito] = useState("")
  const [tab, setTab] = useState<"chat" | "documentos">("chat")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = localStorage.getItem("token") ?? ""

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensajes])

  useEffect(() => {
    if (tab === "documentos") cargarEstadisticas()
  }, [tab])

  async function cargarEstadisticas() {
    setCargandoStats(true)
    try {
      const res = await fetch(`${API}/rag/estadisticas`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setEstadisticas(data.data)
    } catch {
      setError("No se pudo conectar con el sistema RAG.")
    } finally {
      setCargandoStats(false)
    }
  }

  async function enviarPregunta(e: React.FormEvent) {
    e.preventDefault()
    if (!pregunta.trim() || cargando) return

    const userMsg: Mensaje = {
      id: Date.now().toString(),
      role: "user",
      content: pregunta.trim(),
      timestamp: new Date(),
    }
    setMensajes(prev => [...prev, userMsg])
    setPregunta("")
    setCargando(true)
    setError("")

    try {
      const res = await fetch(`${API}/rag/consultar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pregunta: userMsg.content, topK: 5 }),
      })
      const data = await res.json()

      if (data.success) {
        const assistantMsg: Mensaje = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.data.respuesta || "No se encontró información relevante.",
          fuentes: data.data.fuentes || [],
          timestamp: new Date(),
        }
        setMensajes(prev => [...prev, assistantMsg])
      } else {
        throw new Error(data.message || "Error en la consulta")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con el asistente"
      setMensajes(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Error: ${msg}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setCargando(false)
    }
  }

  async function subirDocumento(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setSubiendo(true)
    setError("")
    setExito("")

    const formData = new FormData()
    formData.append("archivo", archivo)

    try {
      const res = await fetch(`${API}/rag/ingestar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        setExito(`✅ "${archivo.name}" indexado: ${data.data?.chunksCreados ?? 0} chunks creados`)
        if (tab === "documentos") cargarEstadisticas()
      } else {
        setError(data.message || "Error al subir el documento")
      }
    } catch {
      setError("Error de conexión al subir el documento")
    } finally {
      setSubiendo(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function sincronizarDesdeDB() {
    if (!confirm("¿Indexar automáticamente todos los programas analíticos y syllabi de la base de datos?")) return
    setSincronizando(true)
    setError("")
    setExito("")
    try {
      const res = await fetch(`${API}/rag/sincronizar-bd`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        const r = data.data
        setExito(`✅ Sincronización completada: ${r.programasAnaliticos.indexados} programas analíticos + ${r.syllabi.indexados} syllabi indexados`)
        cargarEstadisticas()
      } else {
        setError(data.message || "Error en la sincronización")
      }
    } catch {
      setError("Error de conexión al sincronizar")
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["comision", "comision_academica"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-emerald-600 rounded-xl text-white">
              <Bot className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Asistente IA — UNESUM</h1>
              <p className="text-gray-500 text-sm">
                Consulta documentos curriculares · Powered by Llama 3.3 70B + ChromaDB
              </p>
            </div>
          </div>

          {/* Notificaciones */}
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
              <button className="ml-auto" onClick={() => setError("")}><X className="h-4 w-4" /></button>
            </div>
          )}
          {exito && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />{exito}
              <button className="ml-auto" onClick={() => setExito("")}><X className="h-4 w-4" /></button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab("chat")}
              className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${tab === "chat" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}
            >
              <Bot className="inline h-4 w-4 mr-2" />Chat
            </button>
            <button
              onClick={() => setTab("documentos")}
              className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${tab === "documentos" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}
            >
              <FileText className="inline h-4 w-4 mr-2" />Documentos
            </button>
          </div>

          {/* TAB CHAT */}
          {tab === "chat" && (
            <div className="grid lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3">
                <Card className="flex flex-col h-[620px]">
                  <CardContent className="flex flex-col h-full p-0">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {mensajes.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <Bot className="h-4 w-4 text-emerald-600" />
                            </div>
                          )}
                          <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
                            <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-white border shadow-sm text-gray-800 rounded-tl-sm"}`}>
                              {msg.content}
                            </div>
                            {msg.fuentes && msg.fuentes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.fuentes.map((f, i) => (
                                  <div key={`fuente-${f.nombre}-${i}`} className="flex items-center gap-1 text-xs text-gray-400">
                                    <File className="h-3 w-3" />
                                    {f.nombre}{f.pagina ? ` · pág. ${f.pagina}` : ""}
                                    {f.tipo && <Badge variant="secondary" className="text-xs py-0">{f.tipo}</Badge>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {cargando && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="bg-white border rounded-2xl px-4 py-3 shadow-sm">
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="border-t p-4">
                      <form onSubmit={enviarPregunta} className="flex gap-2">
                        <Input
                          value={pregunta}
                          onChange={e => setPregunta(e.target.value)}
                          placeholder="Ej: ¿Cuántos créditos tiene Cálculo I?"
                          disabled={cargando}
                          className="flex-1"
                        />
                        <Button type="submit" disabled={cargando || !pregunta.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Subir Documento</CardTitle>
                    <CardDescription className="text-xs">PDF, Word o Excel (máx. 25MB)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls" onChange={subirDocumento} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={subiendo} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                      {subiendo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      {subiendo ? "Procesando..." : "Seleccionar archivo"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Preguntas rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      "¿Qué materias tiene el 4to nivel?",
                      "¿Prerequisitos de Física II?",
                      "¿Total de créditos de la malla?",
                    ].map((q) => (
                      <button key={q} onClick={() => setPregunta(q)} className="w-full text-left text-xs bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border rounded-lg px-3 py-2 transition-colors">
                        {q}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB DOCUMENTOS */}
          {tab === "documentos" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-emerald-600" />
                    Indexar Nuevo Documento
                  </CardTitle>
                  <CardDescription>Sube un PDF, Word o Excel para que el asistente pueda consultarlo</CardDescription>
                </CardHeader>
                <CardContent>
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls" onChange={subirDocumento} className="hidden" />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => fileInputRef.current?.click()} disabled={subiendo || sincronizando} className="bg-emerald-600 hover:bg-emerald-700">
                      {subiendo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      {subiendo ? "Procesando e indexando..." : "Subir documento"}
                    </Button>
                    <Button onClick={sincronizarDesdeDB} disabled={subiendo || sincronizando} variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                      {sincronizando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                      {sincronizando ? "Sincronizando BD..." : "Sincronizar desde BD"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                      Documentos Indexados
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={cargarEstadisticas} disabled={cargandoStats}>
                      <RefreshCw className={`h-4 w-4 ${cargandoStats ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {cargandoStats ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
                  ) : (
                    <ComisionEstadisticasContenido estadisticas={estadisticas} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
