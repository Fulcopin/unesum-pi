"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

// Interfaz para el objeto de Campo de Formación
interface CampoFormacion {
  id: number;
  nombre: string;
  // Añade aquí otros campos si son necesarios en el futuro
}

const API_BASE_URL = 'http://localhost:4000/api';

export default function CamposFormacionPage() {
  const [campos, setCampos] = useState<CampoFormacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCampo, setEditingCampo] = useState<CampoFormacion | null>(null);
  const [newCampoNombre, setNewCampoNombre] = useState("");
  const { token, getToken } = useAuth();

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    const currentToken = token || getToken();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${currentToken}`,
      ...options.headers,
    };

    try {
      const response = await fetch(fullUrl, { ...options, headers });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error en la petición a la API");
      }
      return data;
    } catch (error) {
      console.error("Error en apiRequest:", error);
      // Aquí podrías usar un sistema de notificaciones (toast)
      throw error;
    }
  };

  useEffect(() => {
    const fetchCampos = async () => {
      setLoading(true);
      try {
        // Asumiendo que el endpoint es '/campos-formacion'. ¡Ajusta si es diferente!
        const response = await apiRequest("/organizacion_curricular"); 
        setCampos(response.data || response);
      } catch (error) {
        console.error("Error al cargar los campos de formación:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampos();
  }, []);

  const handleSave = async () => {
    if (!newCampoNombre.trim()) {
      alert("El nombre no puede estar vacío.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = { nombre: newCampoNombre };
      let updatedCampos;

      if (editingCampo) {
        // Actualizar (PUT)
        const response = await apiRequest(`/organizacion_curricular/${editingCampo.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        updatedCampos = campos.map(c => c.id === editingCampo.id ? response.data : c);
      } else {
        // Crear (POST)
        const response = await apiRequest('/organizacion_curricular', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        updatedCampos = [...campos, response.data];
      }
      setCampos(updatedCampos);
      handleCancel();
    } catch (error) {
      console.error("Error al guardar el campo de formación:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (campo: CampoFormacion) => {
    setEditingCampo(campo);
    setNewCampoNombre(campo.nombre);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Está seguro de que desea eliminar este campo?")) {
      try {
        await apiRequest(`/organizacion_curricular/${id}`, { method: 'DELETE' });
        setCampos(campos.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error al eliminar el campo de formación:", error);
        alert("No se pudo eliminar el campo. Es posible que esté en uso.");
      }
    }
  };

  const handleCancel = () => {
    setEditingCampo(null);
    setNewCampoNombre("");
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Campos de Formación</CardTitle>
          <CardDescription>
            Añada, edite o elimine los campos de formación (o unidades de organización curricular) que se usarán en las asignaturas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Nombre del nuevo campo"
              value={newCampoNombre}
              onChange={(e) => setNewCampoNombre(e.target.value)}
              disabled={isSaving}
            />
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingCampo ? "Actualizar" : <Plus className="h-4 w-4" />)}
              <span className="ml-2 hidden sm:inline">{editingCampo ? "Actualizar Campo" : "Agregar Campo"}</span>
            </Button>
            {editingCampo && (
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancelar
              </Button>
            )}
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : (
                  campos.map((campo) => (
                    <TableRow key={campo.id}>
                      <TableCell>{campo.id}</TableCell>
                      <TableCell>{campo.nombre}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(campo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(campo.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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
  );
}
