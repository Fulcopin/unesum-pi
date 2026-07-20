"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ModuloGuard } from "@/components/auth/modulo-guard"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Trash2, Plus, Save, Loader2, Home } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Escenario {
  id: number
  nombre: string
  descripcion?: string | null
  estado?: string
}

export default function EscenarioPage() {
  const router = useRouter()
  const { token, getToken } = useAuth()
  const [escenarios, setEscenarios] = useState<Escenario[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [nombre, setNombre] = useState("")
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

  const fetchEscenarios = async () => {
    try {
      setLoading(true)
      const res = await apiRequest("/escenarios")
      if (!res.ok) throw new Error("Error al cargar los escenarios")
      const data = await res.json()
      setEscenarios(data.data || [])
    } catch (error) {
      console.error(error)
      alert("No se pudieron cargar los escenarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchEscenarios()
  }, [token])

  const handleNew = () => {
    setNombre("")
    setDescripcion("")
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      alert("El nombre del escenario es obligatorio")
      return
    }
    try {
      setSubmitting(true)
      const body = JSON.stringify({ nombre, descripcion })
      const res = editingId
        ? await apiRequest(`/escenarios/${editingId}`, { method: "PUT", body })
        : await apiRequest(`/escenarios`, { method: "POST", body })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Error al guardar el escenario")
      }
      handleNew()
      fetchEscenarios()
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Error al guardar el escenario")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (e: Escenario) => {
    setNombre(e.nombre)
    setDescripcion(e.descripcion || "")
    setEditingId(e.id)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este escenario?")) return
    try {
      setLoading(true)
      const res = await apiRequest(`/escenarios/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar el escenario")
      if (editingId === id) handleNew()
      fetchEscenarios()
    } catch (error) {
      console.error(error)
      alert("No se pudo eliminar el escenario")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <ModuloGuard>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">Escenarios de Aprendizaje</h1>
            <p className="text-emerald-100 text-sm">
              Catálogo de escenarios (Áulico, Virtual, Laboratorio…) para la columna "Escenario de aprendizaje" del syllabus
            </p>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Formulario */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="text-sm font-medium">
                        Nombre del escenario *
                      </Label>
                      <Input
                        id="nombre"
                        placeholder="Ej: Áulico"
                        value={nombre}
                        onChange={(ev) => setNombre(ev.target.value)}
                        required
                        maxLength={150}
                        className="border-gray-300"
                      />
                      <p className="text-[11px] text-gray-500">Este es el texto que se colocará en la celda del syllabus.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="descripcion" className="text-sm font-medium">
                        Descripción (opcional)
                      </Label>
                      <Textarea
                        id="descripcion"
                        placeholder="Detalle del escenario de aprendizaje"
                        value={descripcion}
                        onChange={(ev) => setDescripcion(ev.target.value)}
                        className="border-gray-300 min-h-[80px]"
                      />
                    </div>
                  </div>

                  {editingId != null && (
                    <p className="text-xs text-gray-500">Editando el escenario #{editingId}</p>
                  )}

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
                <CardTitle className="text-lg font-semibold">Escenarios Registrados</CardTitle>
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
                          <TableHead className="font-semibold">Nombre</TableHead>
                          <TableHead className="font-semibold">Descripción</TableHead>
                          <TableHead className="font-semibold w-32">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {escenarios.map((e) => (
                          <TableRow key={e.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm text-gray-600">{e.id}</TableCell>
                            <TableCell className="font-medium">{e.nombre}</TableCell>
                            <TableCell className="whitespace-pre-wrap text-gray-600">{e.descripcion || "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(e)} className="text-blue-600 border-blue-200 hover:bg-blue-50" disabled={loading}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDelete(e.id)} className="text-red-600 border-red-200 hover:bg-red-50" disabled={loading}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {escenarios.length === 0 && !loading && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No hay escenarios registrados
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
      </ModuloGuard>
    </ProtectedRoute>
  )
}
