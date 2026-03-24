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
import { Pencil, Trash2, Plus, Save, Loader2 } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"
import type { Nivel } from "@/types"
function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      const { title, description, variant } = props;
      // Log to console
      if (variant === "destructive") {
        console.error(`${title}: ${description}`);
      } else {
        console.log(`${title}: ${description}`);
      }
      
      // Show alert
      alert(variant === "destructive" ? 
        `Error: ${description}` : 
        `${title}: ${description}`);
    }
  };
}

export default function FuncionesSustantivasPage() {
  const { token, getToken } = useAuth() 
  const { toast } = useToast()
  const [funciones, setFunciones] = useState<Nivel[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    estado: "activo" as "activo" | "inactivo",
  })

  // Función para hacer peticiones al API con el token
  // Función para hacer peticiones al API con el token - VERSIÓN CORREGIDA
const apiRequest = async (url: string, options = {}) => {
  // URL fija para garantizar que funcione
  const BASE_URL = 'http://localhost:4000/api';
  
  // Corregir la forma en que se construye la URL
  let cleanPath = url;
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1); // Quitar el slash inicial si existe
  }
  
  const fullUrl = `${BASE_URL}/${cleanPath}`;
  
  console.log("URL de petición:", fullUrl); // Para verificar que esté correcta
  
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

  const fetchFunciones = async () => {
    try {
      setLoading(true)
      const response = await apiRequest('/niveles') 
      
      if (!response.ok) {
        throw new Error("Error al cargar los niveles")
      }
      
      const data = await response.json()
      setFunciones(data.data || [])
    } catch (error) {
      console.error("Error al cargar los niveles:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los niveles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos al iniciar
  useEffect(() => {
    if (token) {
      fetchFunciones()
    }
  }, [token])
  const handleNew = () => {
    setFormData({
      codigo: "",
      nombre: "",
      estado: "activo",
    });
    setIsEditing(false);
    setEditingId(null);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre) {
      toast({
        title: "Error",
        description: "El nombre es un campo obligatorio",
        variant: "destructive",
      })
      return
    }
  
    try {
      setSubmitting(true)
      
      // Preparar datos sin el campo código (se genera automáticamente en el backend)
      const dataToSend = {
        nombre: formData.nombre,
        estado: formData.estado
      }
      
      if (editingId) {
        // Actualizar función existente - CORREGIDO
        const response = await apiRequest(
          `/niveles/${editingId}`, // Quitar process.env.NEXT_PUBLIC_API_URL
          {
            method: "PUT",
            body: JSON.stringify(dataToSend),
          }
        )
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Error al actualizar los niveles")
        }
        
        toast({
          title: "Éxito",
          description: "Nivel actualizado correctamente",
        })
      } else {
        // Crear nueva función - CORREGIDO
        const response = await apiRequest(
          `/niveles`, // Quitar process.env.NEXT_PUBLIC_API_URL
          {
            method: "POST",
            body: JSON.stringify(dataToSend),
          }
        )
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "Error al crear el nivel")
        }
        
        toast({
          title: "Éxito",
          description: "Nivel creado correctamente",
        })
      }
  
      // Recargar datos y limpiar formulario
      fetchFunciones()
      handleNew()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "Error al guardar el nivel",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este nivel?")) {
      try {
        setLoading(true)
        // CORREGIDO
        const response = await apiRequest(
          `/niveles/${id}`, // Quitar process.env.NEXT_PUBLIC_API_URL
          {
            method: "DELETE",
          }
        )
        
        if (!response.ok) {
          throw new Error("Error al eliminar el nivel")
        }
        
        toast({
          title: "Éxito",
          description: "Nivel eliminado correctamente",
        })
        
        fetchFunciones()
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar el nivel",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }
  // Agregar esta función en tu componente
const handleEdit = (funcion: Nivel) => {
  setFormData({
    codigo: "",
    nombre: funcion.nombre,
    estado: funcion.estado,
  });
  setIsEditing(true);
  setEditingId(funcion.id.toString());
};
  const handleToggleStatus = async (funcion: Nivel) => {
    try {
      setLoading(true)
      const newStatus = funcion.estado === "activo" ? "inactivo" : "activo"
      
      // CORREGIDO
      const response = await apiRequest(
        `/niveles/${funcion.id}/estado`, // Quitar process.env.NEXT_PUBLIC_API_URL
        {
          method: "PATCH",
          body: JSON.stringify({ estado: newStatus }),
        }
      )
      
      if (!response.ok) {
        throw new Error("Error al cambiar el estado")
      }
      
      toast({
        title: "Éxito",
        description: `Estado cambiado a ${newStatus}`,
      })
      
      fetchFunciones()
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
          {/* Header with green background like in the image */}
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">Niveles</h1>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Form Section */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="text-sm font-medium">
                        Nivel *
                      </Label>
                      <Input
                        id="nombre"
                        placeholder="Ingrese el Nivel"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        className="border-gray-300"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado" className="text-sm font-medium">
                        Opción
                      </Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value: "activo" | "inactivo") => setFormData({ ...formData, estado: value })}
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

                    <div className="flex gap-4 pt-4">
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
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Table Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Nivel Registrado</CardTitle>
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
                          <TableHead className="font-semibold">Código</TableHead>
                          <TableHead className="font-semibold">Nivel</TableHead>
                          <TableHead className="font-semibold">Estado</TableHead>
                          <TableHead className="font-semibold">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funciones.map((funcion, index) => (
                          <TableRow key={funcion.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{funcion.nombre}</TableCell>
                            
                            <TableCell>
                              <Badge
                                variant={funcion.estado === "activo" ? "default" : "secondary"}
                                className={
                                  funcion.estado === "activo"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {funcion.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(funcion)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  disabled={loading}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(funcion)}
                                  className={
                                    funcion.estado === "activo"
                                      ? "text-orange-600 border-orange-200 hover:bg-orange-50"
                                      : "text-green-600 border-green-200 hover:bg-green-50"
                                  }
                                  disabled={loading}
                                >
                                  {funcion.estado === "activo" ? "Desactivar" : "Activar"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(funcion.id.toString())}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={loading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {funciones.length === 0 && !loading && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No hay nivel registrados
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