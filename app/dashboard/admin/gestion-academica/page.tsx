"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Trash2, Plus, Save, Loader2 } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"

// --- Tipos de Datos que vienen de la API ---
interface Facultad {
  id: number;
  nombre: string;
}

interface Carrera {
  id: number;
  nombre: string;
  facultad_id: number;
  facultad?: Facultad; // La API puede incluir el objeto relacionado
}

// Hook de toast simulado (igual al que ya usas)
function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      alert(props.variant === "destructive" ? `Error: ${props.description}` : `${props.title}: ${props.description}`);
    }
  };
}

export default function GestionAcademicaPage() {
  const { token, getToken } = useAuth() 
  const { toast } = useToast()

  // --- Estados del Componente ---
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para el formulario de Facultades
  const [editingFacultadId, setEditingFacultadId] = useState<number | null>(null)
  const [nombreFacultad, setNombreFacultad] = useState("")
  const [submittingFacultad, setSubmittingFacultad] = useState(false)

  // Estados para el formulario de Carreras
  const [editingCarreraId, setEditingCarreraId] = useState<number | null>(null)
  const [nombreCarrera, setNombreCarrera] = useState("")
  const [selectedFacultadId, setSelectedFacultadId] = useState("")
  const [submittingCarrera, setSubmittingCarrera] = useState(false)


  // --- Lógica de API ---
  const apiRequest = async (url: string, options = {}) => {
    const BASE_URL = 'http://localhost:4000/api/datos-academicos'; // URL base para estos datos
    const fullUrl = `${BASE_URL}${url}`;
    const currentToken = token || getToken();
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` }
    return fetch(fullUrl, { ...options, headers });
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facultadesRes, carrerasRes] = await Promise.all([
        apiRequest('/facultades'),
        apiRequest('/carreras')
      ]);

      if (!facultadesRes.ok || !carrerasRes.ok) {
        throw new Error("Error al cargar los datos académicos.");
      }

      const [facultadesData, carrerasData] = await Promise.all([
        facultadesRes.json(), carrerasRes.json()
      ]);

      setFacultades(facultadesData.data || []);
      setCarreras(carrerasData.data || []);

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  // --- Manejadores para FACULTADES ---
  const handleNewFacultad = () => {
    setEditingFacultadId(null);
    setNombreFacultad("");
  };

  const handleEditFacultad = (facultad: Facultad) => {
    setEditingFacultadId(facultad.id);
    setNombreFacultad(facultad.nombre);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitFacultad = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFacultad(true);
    
    const url = editingFacultadId ? `/facultades/${editingFacultadId}` : '/facultades';
    const method = editingFacultadId ? 'PUT' : 'POST';

    try {
      const response = await apiRequest(url, { method, body: JSON.stringify({ nombre: nombreFacultad }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al guardar la facultad.");

      toast({ title: "Éxito", description: `Facultad ${editingFacultadId ? 'actualizada' : 'creada'} correctamente.` });
      handleNewFacultad(); // Limpiar campos
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      handleNewFacultad(); // Limpiar campos en caso de error (duplicado)
    } finally {
      setSubmittingFacultad(false);
    }
  };

  const handleDeleteFacultad = async (id: number) => {
    if (confirm("¿Seguro que deseas eliminar esta facultad? Se eliminarán todas sus carreras asociadas.")) {
      try {
        const response = await apiRequest(`/facultades/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("No se pudo eliminar la facultad.");
        toast({ title: "Éxito", description: "Facultad eliminada." });
        handleNewFacultad(); // Limpiar campos
        await fetchData();
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  };

  // --- Manejadores para CARRERAS ---
  const handleNewCarrera = () => {
    setEditingCarreraId(null);
    setNombreCarrera("");
    setSelectedFacultadId("");
  };

  const handleEditCarrera = (carrera: Carrera) => {
    setEditingCarreraId(carrera.id);
    setNombreCarrera(carrera.nombre);
    setSelectedFacultadId(carrera.facultad_id.toString());
  };

  const handleSubmitCarrera = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCarrera(true);

    const url = editingCarreraId ? `/carreras/${editingCarreraId}` : '/carreras';
    const method = editingCarreraId ? 'PUT' : 'POST';
    const body = JSON.stringify({ nombre: nombreCarrera, facultad_id: parseInt(selectedFacultadId) });

    try {
        const response = await apiRequest(url, { method, body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Error al guardar la carrera.");

        toast({ title: "Éxito", description: `Carrera ${editingCarreraId ? 'actualizada' : 'creada'} correctamente.` });
        handleNewCarrera(); // Limpiar campos
        await fetchData();
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        handleNewCarrera(); // Limpiar campos en caso de error (duplicado)
    } finally {
        setSubmittingCarrera(false);
    }
  };

  const handleDeleteCarrera = async (id: number) => {
    if (confirm("¿Seguro que deseas eliminar esta carrera?")) {
        try {
            const response = await apiRequest(`/carreras/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("No se pudo eliminar la carrera.");
            toast({ title: "Éxito", description: "Carrera eliminada." });
            handleNewCarrera(); // Limpiar campos
            await fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    }
  };


  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">FACULTAD - CARRERA</h1>
          </div>
          <div className="bg-white rounded-b-lg shadow-lg p-6 space-y-12">
            
            {/* SECCIÓN DE FACULTADES */}
            <Card>
              <CardHeader>
                <CardTitle>{editingFacultadId ? "Editar Facultad" : "Registrar Nueva Facultad"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitFacultad} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="grid gap-2 w-full"><Label htmlFor="nombreFacultad">Nombre de la Facultad</Label><Input id="nombreFacultad" value={nombreFacultad} onChange={(e) => setNombreFacultad(e.target.value)} required /></div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submittingFacultad}>{submittingFacultad ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}<span className="ml-2 hidden md:inline">GUARDAR</span></Button>
                    <Button type="button" onClick={handleNewFacultad} variant="outline"><Plus className="h-4 w-4" /><span className="ml-2 hidden md:inline">NUEVO</span></Button>
                  </div>
                </form>
                <div className="mt-6 overflow-x-auto">
                    {loading ? <div className="text-center p-4">Cargando...</div> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nombre</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {facultades.map(f => (
                                    <TableRow key={f.id}>
                                        <TableCell>{f.id}</TableCell>
                                        <TableCell className="font-medium">{f.nombre}</TableCell>
                                        <TableCell><div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEditFacultad(f)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="outline" size="sm" onClick={() => handleDeleteFacultad(f.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                        </div></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* SECCIÓN DE CARRERAS */}
            <Card>
              <CardHeader>
                <CardTitle>{editingCarreraId ? "Editar Carrera" : "Registrar Nueva Carrera"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitCarrera} className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2"><Label htmlFor="facultadCarrera">Facultad</Label><Select value={selectedFacultadId} onValueChange={setSelectedFacultadId} required><SelectTrigger><SelectValue placeholder="Seleccione una facultad" /></SelectTrigger><SelectContent>{facultades.map(f => (<SelectItem key={f.id} value={f.id.toString()}>{f.nombre}</SelectItem>))}</SelectContent></Select></div>
                    <div className="grid gap-2"><Label htmlFor="nombreCarrera">Nombre de la Carrera</Label><Input id="nombreCarrera" value={nombreCarrera} onChange={(e) => setNombreCarrera(e.target.value)} required /></div>
                    
                    <div className="md:col-span-2 flex gap-4">
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submittingCarrera}>{submittingCarrera ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />GUARDANDO...</> : <><Save className="mr-2 h-4 w-4" />GUARDAR</>}</Button>
                        <Button type="button" onClick={handleNewCarrera} variant="outline"><Plus className="mr-2 h-4 w-4" />NUEVO</Button>
                    </div>
                </form>
                <div className="mt-6 overflow-x-auto">
                    {loading ? <div className="text-center p-4">Cargando...</div> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nombre Carrera</TableHead><TableHead>Facultad</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {carreras.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell>{c.id}</TableCell>
                                        <TableCell className="font-medium">{c.nombre}</TableCell>
                                        <TableCell>{c.facultad?.nombre || facultades.find(f => f.id === c.facultad_id)?.nombre || "N/A"}</TableCell>
                                        <TableCell><div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEditCarrera(c)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="outline" size="sm" onClick={() => handleDeleteCarrera(c.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                        </div></TableCell>
                                    </TableRow>
                                ))}
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