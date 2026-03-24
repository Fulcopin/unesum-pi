"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, Save, Upload, Trash, Loader2 } from "lucide-react"
import type { ActividadExtracurricular, FuncionSustantiva } from "@/types"
import { useAuth } from "@/contexts/auth-context"

function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      const { title, description, variant } = props;
      if (variant === "destructive") {
        console.error(`${title}: ${description}`);
      } else {
        console.log(`${title}: ${description}`);
      }
      alert(variant === "destructive" ? `Error: ${description}` : `${title}: ${description}`);
    }
  };
}

export default function ActividadesPage() {
  const { token, getToken } = useAuth()
  const { toast } = useToast()
  const [actividades, setActividades] = useState<ActividadExtracurricular[]>([])
  const [funciones, setFunciones] = useState<FuncionSustantiva[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    funcionSustantivaId: "",
    nombre: "",
    descripcion: "",
    estado: "activo" as "activo" | "inactivo",
  })

  // Función para hacer peticiones al API con el token
  const apiRequest = async (url: string, options = {}) => {
    const BASE_URL = 'http://localhost:4000/api';
    let cleanPath = url;
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    const fullUrl = `${BASE_URL}/${cleanPath}`;
    
    const currentToken = token || getToken();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${currentToken}`,
    }

    return fetch(fullUrl, {
      ...options,
      headers,
    });
  }

  // Cargar funciones sustantivas y actividades al iniciar
  useEffect(() => {
    if (token) {
      fetchFunciones()
      fetchActividades()
    }
  }, [token])

  const fetchFunciones = async () => {
    try {
      const response = await apiRequest('/funciones-sustantivas')
      if (!response.ok) throw new Error("Error al cargar funciones sustantivas")
      const data = await response.json()
      setFunciones(data.data || [])
    } catch (error) {
      console.error("Error al cargar funciones:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las funciones sustantivas",
        variant: "destructive",
      })
    }
  }

  const fetchActividades = async () => {
    try {
      setLoading(true)
      const response = await apiRequest('/actividades')
      if (!response.ok) throw new Error("Error al cargar actividades")
      const data = await response.json()
      // Mapear los campos del backend (snake_case) a camelCase
      const actividadesMapeadas = (data.data || []).map((act: any) => ({
        ...act,
        funcionSustantivaId: act.funcion_sustantiva_id?.toString() || null
      }))
      setActividades(actividadesMapeadas)
      console.log('Actividades cargadas:', actividadesMapeadas)
    } catch (error) {
      console.error("Error al cargar actividades:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las actividades",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.funcionSustantivaId || !formData.nombre) {
      toast({
        title: "Error",
        description: "La función sustantiva y el nombre son campos obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      if (editingId) {
        // Actualizar actividad existente
        const response = await apiRequest(`/actividades/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            funcion_sustantiva_id: formData.funcionSustantivaId,
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            estado: formData.estado,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          // Si es error de duplicado, resetear los campos
          if (error.message && (error.message.includes("Ya existe") || error.message.includes("duplicado"))) {
            handleNew()
          }
          throw new Error(error.message || "Error al actualizar la actividad")
        }

        toast({
          title: "Éxito",
          description: "Actividad actualizada correctamente",
        })
      } else {
        // Crear nueva actividad (código autogenerado)
        const response = await apiRequest(`/actividades`, {
          method: "POST",
          body: JSON.stringify({
            funcion_sustantiva_id: formData.funcionSustantivaId,
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            estado: formData.estado,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          // Si es error de duplicado, resetear los campos
          if (error.message && (error.message.includes("Ya existe") || error.message.includes("duplicado"))) {
            handleNew()
          }
          throw new Error(error.message || "Error al crear la actividad")
        }

        toast({
          title: "Éxito",
          description: "Actividad creada correctamente",
        })
      }

      // Recargar datos y limpiar formulario
      fetchActividades()
      handleNew()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "Error al guardar la actividad",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleNew = () => {
    setFormData({
      funcionSustantivaId: "",
      nombre: "",
      descripcion: "",
      estado: "activo",
    })
    setIsEditing(false)
    setEditingId(null)
  }

  const handleEdit = (actividad: ActividadExtracurricular) => {
    setFormData({
      funcionSustantivaId: actividad.funcionSustantivaId,
      nombre: actividad.nombre,
      descripcion: actividad.descripcion || "",
      estado: actividad.estado,
    })
    setIsEditing(true)
    setEditingId(actividad.id)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta actividad?")) {
      try {
        setLoading(true)
        const response = await apiRequest(`/actividades/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) throw new Error("Error al eliminar la actividad")

        toast({
          title: "Éxito",
          description: "Actividad eliminada correctamente",
        })

        fetchActividades()
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar la actividad",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDeleteAll = () => {
    alert("Por seguridad, esta función requiere confirmación manual del administrador de base de datos")
  }

  const handleImportExcel = () => {
    alert("Funcionalidad de importación Excel será implementada próximamente")
  }

  const getFuncionNombre = (funcionId: string) => {
    if (!funcionId) return "No asignada"
    const funcion = funciones.find((f) => f.id.toString() === funcionId.toString())
    return funcion ? funcion.nombre : "No asignada"
  }

  // Filtrar actividades por función sustantiva seleccionada
  const actividadesFiltradas = formData.funcionSustantivaId
    ? actividades.filter((act) => act.funcionSustantivaId?.toString() === formData.funcionSustantivaId.toString())
    : actividades

  console.log('Filtro activo:', formData.funcionSustantivaId)
  console.log('Total actividades:', actividades.length)
  console.log('Actividades filtradas:', actividadesFiltradas.length)
  console.log('Actividades:', actividades.map(a => ({ id: a.id, funcion: a.funcionSustantivaId, nombre: a.nombre })))

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header with green background like in the image */}
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">ACTIVIDADES EXTRACURRICULARES</h1>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Form Section */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Function Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="funcionSustantiva" className="text-sm font-medium">
                      Funciones Sustantivas *
                    </Label>
                    <Select
                      value={formData.funcionSustantivaId}
                      onValueChange={(value) => setFormData({ ...formData, funcionSustantivaId: value })}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Seleccione una función sustantiva" />
                      </SelectTrigger>
                      <SelectContent>
                        {funciones.map((funcion) => (
                          <SelectItem key={funcion.id} value={funcion.id}>
                            {funcion.codigo} - {funcion.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Activities Field */}
                  <div className="space-y-2">
                    <Label htmlFor="actividades" className="text-sm font-medium">
                      Nombre de Actividad *
                    </Label>
                    <Input
                      id="actividades"
                      placeholder="Ingrese el nombre de la actividad"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                      className="border-gray-300"
                    />
                    
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <Label htmlFor="descripcion" className="text-sm font-medium">
                      Descripción
                    </Label>
                    <Input
                      id="descripcion"
                      placeholder="Ingrese una descripción (opcional)"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="border-gray-300"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Opción</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value: "activo" | "inactivo") => setFormData({ ...formData, estado: value })}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activado</SelectItem>
                        <SelectItem value="inactivo">Desactivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
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
                      onClick={handleDeleteAll}
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 px-6 bg-transparent"
                      disabled={submitting}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      ELIMINAR TODO
                    </Button>
                    <Button
                      type="button"
                      onClick={handleImportExcel}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                      disabled={submitting}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      IMPORTAR XLSX
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Table Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Actividades Extracurriculares Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">N.</TableHead>
                        <TableHead className="font-semibold">Código</TableHead>
                        <TableHead className="font-semibold">Actividad</TableHead>
                        <TableHead className="font-semibold">Función Sustantiva</TableHead>
                        <TableHead className="font-semibold">Descripción</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="font-semibold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                            <p className="mt-2 text-gray-500">Cargando actividades...</p>
                          </TableCell>
                        </TableRow>
                      ) : actividadesFiltradas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            {formData.funcionSustantivaId
                              ? "No hay actividades para esta función sustantiva"
                              : "No hay actividades extracurriculares registradas"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        actividadesFiltradas.map((actividad, index) => (
                          <TableRow key={actividad.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{actividad.codigo}</TableCell>
                            <TableCell>{actividad.nombre}</TableCell>
                            <TableCell>{getFuncionNombre(actividad.funcionSustantivaId)}</TableCell>
                            <TableCell>{actividad.descripcion || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={actividad.estado === "activo" ? "default" : "secondary"}
                                className={
                                  actividad.estado === "activo"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {actividad.estado === "activo" ? "Activado" : "Desactivado"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(actividad)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  disabled={loading}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(actividad.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={loading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
