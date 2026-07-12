"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Trash2, Plus, Save, Loader2, Home } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Metodologia {
  id: number
  descripcion: string
  estado?: string
}

export default function MetodologiaPage() {
  const router = useRouter()
  const { token, getToken } = useAuth()
  const [metodologias, setMetodologias] = useState<Metodologia[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [descripcion, setDescripcion] = useState("")

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

  const apiRequest = async (path: string, options: RequestInit = {}) => {
    const currentToken = token || getToken()
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
        ...options.headers,
      },
    })
  }

  const fetchMetodologias = async () => {
    try {
      setLoading(true)
      const res = await apiRequest("/metodologias")
      if (!res.ok) throw new Error("Error al cargar las metodologías")
      const data = await res.json()
      setMetodologias(data.data || [])
    } catch (error) {
      console.error(error)
      alert("No se pudieron cargar las metodologías")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchMetodologias()
  }, [token])

  const handleNew = () => {
    setDescripcion("")
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descripcion.trim()) {
      alert("La descripción es obligatoria")
      return
    }
    try {
      setSubmitting(true)
      const res = editingId
        ? await apiRequest(`/metodologias/${editingId}`, {
            method: "PUT",
            body: JSON.stringify({ descripcion }),
          })
        : await apiRequest(`/metodologias`, {
            method: "POST",
            body: JSON.stringify({ descripcion }),
          })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Error al guardar la metodología")
      }
      handleNew()
      fetchMetodologias()
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Error al guardar la metodología")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (m: Metodologia) => {
    setDescripcion(m.descripcion)
    setEditingId(m.id)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta metodología?")) return
    try {
      setLoading(true)
      const res = await apiRequest(`/metodologias/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar la metodología")
      if (editingId === id) handleNew()
      fetchMetodologias()
    } catch (error) {
      console.error(error)
      alert("No se pudo eliminar la metodología")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">Metodologías</h1>
            <p className="text-emerald-100 text-sm">Catálogo de metodologías de enseñanza-aprendizaje para el syllabus</p>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Formulario */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="descripcion" className="text-sm font-medium">
                      Descripción de la metodología *
                    </Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Ej: Aprendizaje basado en proyectos (ABP)"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      required
                      className="border-gray-300 min-h-[100px]"
                    />
                    {editingId != null && (
                      <p className="text-xs text-gray-500">Editando la metodología #{editingId}</p>
                    )}
                  </div>

                  <div className="flex gap-4 pt-2">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6" disabled={submitting}>
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> GUARDANDO...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" /> GUARDAR</>
                      )}
                    </Button>
                    <Button type="button" onClick={handleNew} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 bg-transparent" disabled={submitting}>
                      <Plus className="h-4 w-4 mr-2" /> NUEVO
                    </Button>
                    <Button type="button" onClick={() => router.push("/dashboard/admin")} variant="outline" className="border-gray-400 text-gray-700 hover:bg-gray-50 px-6">
                      <Home className="h-4 w-4 mr-2" /> MENÚ PRINCIPAL
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Tabla */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Metodologías Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold w-20">ID</TableHead>
                          <TableHead className="font-semibold">Descripción</TableHead>
                          <TableHead className="font-semibold w-32">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metodologias.map((m) => (
                          <TableRow key={m.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm text-gray-600">{m.id}</TableCell>
                            <TableCell className="whitespace-pre-wrap">{m.descripcion}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(m)} className="text-blue-600 border-blue-200 hover:bg-blue-50" disabled={loading}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDelete(m.id)} className="text-red-600 border-red-200 hover:bg-red-50" disabled={loading}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {metodologias.length === 0 && !loading && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                              No hay metodologías registradas
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
