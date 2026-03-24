"use client"

import { useState, useRef, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Bot, Send, Loader2, File, Sparkles } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface Mensaje {
  id: string
  role: "user" | "assistant"
  content: string
  fuentes?: Array<{ nombre: string; pagina?: number; tipo?: string }>
  timestamp: Date
}

const PREGUNTAS_RAPIDAS = [
  "¿Cuáles son los prerequisitos de mi materia?",
  "¿Cuántos créditos tiene mi carrera?",
  "¿Qué materias hay en el 3er nivel?",
  "¿Qué contenidos tiene el syllabus de Cálculo I?",
  "¿Cuántas horas tiene la asignatura de Física?",
  "¿Cuál es la distribución de créditos por semestre?",
]

export default function AsistenteIADocente() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "¡Hola, docente! 👋 Soy el asistente académico de UNESUM.\n\nPuedo ayudarte a consultar información sobre:\n• Programas de estudio y mallas curriculares\n• Syllabus y contenidos de asignaturas\n• Créditos, horas y prerequisitos\n• Distribución de materias por nivel\n\n¿En qué te puedo ayudar hoy?",
      timestamp: new Date(),
    },
  ])
  const [pregunta, setPregunta] = useState("")
  const [cargando, setCargando] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensajes])

  async function enviarPregunta(e: React.FormEvent) {
    e.preventDefault()
    if (!pregunta.trim() || cargando) return
    await enviar(pregunta.trim())
  }

  async function enviar(texto: string) {
    const userMsg: Mensaje = {
      id: Date.now().toString(),
      role: "user",
      content: texto,
      timestamp: new Date(),
    }
    setMensajes(prev => [...prev, userMsg])
    setPregunta("")
    setCargando(true)

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : ""
      const res = await fetch(`${API}/api/rag/consultar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pregunta: texto, topK: 5 }),
      })
      const data = await res.json()

      if (data.success) {
        setMensajes(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.data.respuesta || "No encontré información relevante en los documentos disponibles.",
            fuentes: data.data.fuentes || [],
            timestamp: new Date(),
          },
        ])
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
          content: `⚠️ ${msg}\n\nVerifica que el sistema RAG esté activo o consulta con el administrador.`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setCargando(false)
    }
  }

  function limpiarChat() {
    setMensajes([{
      id: "welcome-new",
      role: "assistant",
      content: "Chat reiniciado. ¿En qué te puedo ayudar?",
      timestamp: new Date(),
    }])
  }

  return (
    <ProtectedRoute allowedRoles={["profesor", "docente", "comision"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-xl text-white">
                <Bot className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Asistente Académico IA</h1>
                <p className="text-gray-500 text-sm flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  Powered by Llama 3.3 70B · Documentos UNESUM
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={limpiarChat} className="text-gray-500">
              Nuevo chat
            </Button>
          </div>

          <div className="grid lg:grid-cols-4 gap-4">
            {/* Chat */}
            <div className="lg:col-span-3">
              <Card className="flex flex-col h-[600px]">
                <CardContent className="flex flex-col h-full p-0">
                  {/* Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {mensajes.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                            <Bot className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                        <div className="max-w-[82%]">
                          <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user"
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-white border shadow-sm text-gray-800 rounded-tl-sm"
                          }`}>
                            {msg.content}
                          </div>
                          {msg.fuentes && msg.fuentes.length > 0 && (
                            <div className="mt-2 bg-gray-50 border rounded-lg px-3 py-2 space-y-1">
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Fuentes consultadas</p>
                              {msg.fuentes.map((f, i) => (
                                <div key={`fuente-${f.nombre}-${i}`} className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <File className="h-3 w-3 text-blue-400 shrink-0" />
                                  <span>{f.nombre}</span>
                                  {Boolean(f.pagina) && <span className="text-gray-400">· pág. {f.pagina}</span>}
                                  {f.tipo && <Badge variant="secondary" className="text-xs py-0 ml-1">{f.tipo}</Badge>}
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1 px-1">
                            {msg.timestamp.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {cargando && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="bg-white border rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                          <span className="text-sm text-gray-400">Buscando en documentos...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t p-4 bg-white rounded-b-xl">
                    <form onSubmit={enviarPregunta} className="flex gap-2">
                      <Input
                        value={pregunta}
                        onChange={e => setPregunta(e.target.value)}
                        placeholder="Escribe tu pregunta sobre el currículo..."
                        disabled={cargando}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={cargando || !pregunta.trim()} className="bg-blue-600 hover:bg-blue-700 px-4">
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panel lateral: preguntas rápidas */}
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-700">💡 Preguntas rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {PREGUNTAS_RAPIDAS.map((q) => (
                    <button
                      key={q}
                      onClick={() => enviar(q)}
                      disabled={cargando}
                      className="w-full text-left text-xs bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-700 border hover:border-blue-200 rounded-lg px-3 py-2.5 transition-all disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </CardContent>
              </Card>

              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">ℹ️ ¿No encuentra lo que busca?</p>
                <p className="text-xs text-blue-500">
                  El asistente solo puede responder sobre documentos que hayan sido indexados por el administrador o la comisión académica.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
