"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, Save, Loader2, Home } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

interface Rol {
  id: number
  nombre: string
  estado: boolean
}

function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      const { title, description, variant } = props
      if (variant === "destructive") {
        console.error(`${title}: ${description}`)
        alert(`Error: ${description}`)
      } else {
        console.log(`${title}: ${description}`)
        alert(`${title}: ${description}`)
      }
    },
  }
}

export default function RolesPage() {
  const router = useRouter()
  const { token, getToken } = useAuth()
  const { toast } = useToast()

  const [roles, setRoles] = useState<Rol[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    estado: "activo" as "activo" | "inactivo",
  })

  const apiRequest = async (path: string, options: RequestInit = {}) => {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path
    const fullUrl = `${API_URL}/${cleanPath}`
    const currentToken = token || getToken()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentToken}`,
      ...((options.headers as Record<string, string>) || {}),
    }
    return fetch(fullUrl, { ...options, headers })
  }

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await apiRequest("/roles")
      if (!response.ok) throw new Error("Error al cargar los roles")
      const data = await response.json()
      setRoles(data.data || [])
    } catch (error) {
      console.error("Error al cargar los roles:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los roles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchRoles()
  }, [token])

  const handleNew = () => {
    setFormData({
      nombre: "",
      estado: "activo",
    })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del rol es obligatorio",
        variant: "destructive",
      })
      return
    }

    const payload = {
      nombre: formData.nombre.trim(),
      estado: formData.estado === "activo",
    }

    try {
      setSubmitting(true)

      let response: Response
      if (editingId) {
        response = await apiRequest(`/roles/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        response = await apiRequest("/roles", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Error al guardar el rol")
      }

      toast({
        title: "Éxito",
        description: editingId ? "Rol actualizado correctamente" : "Rol creado correctamente",
      })

      handleNew()
      fetchRoles()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "Error al guardar el rol",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (rol: Rol) => {
    setFormData({
      nombre: rol.nombre,
      estado: rol.estado ? "activo" : "inactivo",
    })
    setEditingId(rol.id)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este rol?")) return
    try {
      setLoading(true)
      const response = await apiRequest(`/roles/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Error al eliminar el rol")
      }
      toast({ title: "Éxito", description: "Rol eliminado correctamente" })
      handleNew()
      fetchRoles()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el rol",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (rol: Rol) => {
    try {
      setLoading(true)
      const response = await apiRequest(`/roles/${rol.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: !rol.estado }),
      })
      if (!response.ok) throw new Error("Error al cambiar el estado")
      toast({
        title: "Éxito",
        description: `Rol ${!rol.estado ? "activado" : "desactivado"} correctamente`,
      })
      fetchRoles()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado",
        variant: "destructive",
      })
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
            <h1 className="text-2xl font-bold">GESTIÓN DE ROLES</h1>
            <p className="text-emerald-100 text-sm mt-1">
              Catálogo de roles del sistema
            </p>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {editingId ? "Editar rol" : "Nuevo rol"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="text-sm font-medium">
                        Nombre del rol *
                      </Label>
                      <Input
                        id="nombre"
                        placeholder="Ej. Administrador"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        className="border-gray-300"
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estado" className="text-sm font-medium">
                        Estado
                      </Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value: "activo" | "inactivo") =>
                          setFormData({ ...formData, estado: value })
                        }
                      >
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Seleccione una opción" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="inactivo">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <Button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          GUARDANDO...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          GUARDAR
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNew}
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 bg-transparent"
                      disabled={submitting}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      NUEVO
                    </Button>
                    <Button
                      type="button"
                      onClick={() => router.push("/dashboard/admin")}
                      variant="outline"
                      className="border-gray-400 text-gray-700 hover:bg-gray-50 px-6"
                      disabled={submitting}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      MENÚ PRINCIPAL
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Roles registrados</CardTitle>
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
                          <TableHead className="font-semibold">N.</TableHead>
                          <TableHead className="font-semibold">Nombre</TableHead>
                          <TableHead className="font-semibold">Estado</TableHead>
                          <TableHead className="font-semibold">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roles.map((rol, index) => (
                          <TableRow key={rol.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{rol.nombre}</TableCell>
                            <TableCell>
                              <Badge
                                variant={rol.estado ? "default" : "secondary"}
                                className={
                                  rol.estado
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {rol.estado ? "activo" : "inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(rol)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  disabled={loading}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(rol)}
                                  className={
                                    rol.estado
                                      ? "text-orange-600 border-orange-200 hover:bg-orange-50"
                                      : "text-green-600 border-green-200 hover:bg-green-50"
                                  }
                                  disabled={loading}
                                >
                                  {rol.estado ? "Desactivar" : "Activar"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(rol.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={loading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {roles.length === 0 && !loading && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No hay roles registrados
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
