"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trash2, Edit, Save, Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"

// --- (Componentes y Hooks simulados no necesitan cambios) ---
function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      alert(props.variant === "destructive" ? `Error: ${props.description}` : `${props.title}: ${props.description}`);
    }
  };
}

// --- INTERFACES (sin cambios) ---
interface Facultad { id: number; nombre: string; }
interface Carrera { id: number; nombre: string; facultad_id: number; }
interface RegistroCine {
    id: number;
    carrera_id: number;
    campo_amplio?: string;
    campo_especifico?: string;
    campo_detallado?: string;
    carrera?: {
        nombre: string;
        facultad_id: number;
        facultad?: { nombre: string; }
    };
}

const API_BASE_URL = 'http://localhost:4000/api';

export default function RegistroClasificacionPage() {
    const { token, getToken } = useAuth()
    const { toast } = useToast()

    // --- ESTADOS ---
    const [facultades, setFacultades] = useState<Facultad[]>([])
    const [carreras, setCarreras] = useState<Carrera[]>([])
    const [registros, setRegistros] = useState<RegistroCine[]>([]);
    
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false);
    const [loadingRegistros, setLoadingRegistros] = useState(false);

    // --- ESTADOS DEL FORMULARIO ---
    const [editingId, setEditingId] = useState<number | null>(null);
    const [facultad, setFacultad] = useState("")
    const [carrera, setCarrera] = useState("")
    const [campoAmplio, setCampoAmplio] = useState("")
    const [campoEspecifico, setCampoEspecifico] = useState("")
    const [campoDetallado, setCampoDetallado] = useState("")

    // --- FUNCIÓN DE API (sin cambios) ---
    const apiRequest = useCallback(async (url: string, options = {}) => {
        const fullUrl = `${API_BASE_URL}${url}`;
        const currentToken = token || getToken();
        const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` }
        try {
            const response = await fetch(fullUrl, { ...options, headers });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || `Error: ${response.statusText}`);
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            console.error("Error API:", error);
            toast({ title: "Error", description: errorMessage, variant: "destructive" });
            return null;
        }
    }, [token, getToken]);

    // --- CARGA DE DATOS INICIAL ---
    useEffect(() => {
        const cargarCatalogos = async () => {
            setLoading(true);
            try {
                const [facRes, carRes] = await Promise.all([
                    apiRequest("/datos-academicos/facultades"),
                    apiRequest("/datos-academicos/carreras")
                ]);
                if (facRes) setFacultades(facRes.data || []);
                if (carRes) setCarreras(carRes.data || []);
            } finally {
                setLoading(false);
            }
        };
        cargarCatalogos();
    }, [apiRequest]);

    // --- CARGA DE REGISTROS AL CAMBIAR LA FACULTAD ---
    const cargarRegistrosPorFacultad = useCallback(async () => {
        if (!facultad) {
            setRegistros([]);
            return;
        }
        setLoadingRegistros(true);
        try {
            // ----- CORRECCIÓN AQUÍ -----
            // Se cambió "/asignaturas" por "/clasifica" para que coincida con el backend
            const response = await apiRequest(`/clasifica?facultad_id=${facultad}`);
            setRegistros(response?.data || []);
        } finally {
            setLoadingRegistros(false);
        }
    }, [facultad, apiRequest]);

    useEffect(() => {
        cargarRegistrosPorFacultad();
    }, [cargarRegistrosPorFacultad]);

    const carrerasFiltradas = facultad ? carreras.filter(c => c.facultad_id.toString() === facultad) : [];

    // --- LÓGICA DEL FORMULARIO ---
    const resetForm = useCallback(() => {
        setCarrera("");
        setCampoAmplio("");
        setCampoEspecifico("");
        setCampoDetallado("");
        setEditingId(null);
    }, []);

    const handleNuevo = () => {
        setFacultad("");
        resetForm();
        setRegistros([]);
        toast({ title: "Formulario Limpio", description: "Puede crear un nuevo registro." });
    };

    const handleFacultadChange = (newFacultadId: string) => {
        setFacultad(newFacultadId);
        resetForm();
    };

    const handleSave = async () => {
        if (!facultad || !carrera || !campoAmplio || !campoEspecifico || !campoDetallado) {
            toast({ title: "Campos Vacíos", description: "Por favor complete todos los campos.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const endpoint = editingId ? `/clasifica/${editingId}` : "/clasifica";
            const payload = {
                carrera_id: parseInt(carrera),
                campo_amplio: campoAmplio,
                campo_especifico: campoEspecifico,
                campo_detallado: campoDetallado,
            };
            const response = await apiRequest(endpoint, { method, body: JSON.stringify(payload) });
            if (response && response.success) {
                toast({ title: "Éxito", description: `Registro ${editingId ? 'actualizado' : 'guardado'} correctamente.` });
            }
            // Limpiar todo después de guardar (exitoso o con error)
            setFacultad("");
            resetForm();
            setRegistros([]);
        } catch (error) {
            // En caso de excepción, también limpiar todo
            setFacultad("");
            resetForm();
            setRegistros([]);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (registro: RegistroCine) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const facultadId = carreras.find(c => c.id === registro.carrera_id)?.facultad_id.toString() || "";
        setEditingId(registro.id);
        setFacultad(facultadId); 
        setCarrera(registro.carrera_id.toString());
        setCampoAmplio(registro.campo_amplio || "");
        setCampoEspecifico(registro.campo_especifico || "");
        setCampoDetallado(registro.campo_detallado || "");
        toast({ title: "Modo Edición", description: "Modifique los campos y guarde los cambios." });
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("¿Está seguro de que desea eliminar este registro?")) {
            // ----- CORRECCIÓN AQUÍ -----
            // Se cambió "/asignaturas" por "/clasifica" para que coincida con el backend
            const res = await apiRequest(`/clasifica/${id}`, { method: 'DELETE' });
            if (res) {
                toast({ title: "Eliminado", description: res.message });
                // Resetear todo el formulario incluyendo la facultad
                setFacultad("");
                resetForm();
                setRegistros([]);
            }
        }
    };

    const getNombreCarrera = (carreraId: number): string => {
        const carreraEncontrada = carreras.find(c => c.id === carreraId);
        return carreraEncontrada?.nombre || "Carrera Desconocida";
    };

    // --- (El resto del componente JSX no necesita cambios) ---
    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            {/* ... El resto del JSX permanece igual ... */}
            <div className="mb-8 flex justify-between items-center">
                 <div>
                    <h1 className="text-3xl font-bold text-[#00563F]">Registro de Campos de Formación</h1>
                    <p className="text-muted-foreground">Clasificación Amplia, Específica y Detallada por Carrera</p>
                </div>
                {editingId && (
                    <Button variant="outline" onClick={resetForm}>Cancelar Edición</Button>
                )}
            </div>
            <Card className="mb-8 border-t-4 border-t-[#00563F]">
                <CardHeader>
                    <CardTitle>{editingId ? "Editando Registro" : "Crear Nuevo Registro"}</CardTitle>
                    <CardDescription>Seleccione la facultad y carrera para asociar la clasificación CINE.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Facultad</Label>
                            <Select value={facultad} onValueChange={handleFacultadChange}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione una Facultad" /></SelectTrigger>
                                <SelectContent>
                                    {facultades.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Carrera</Label>
                            <Select value={carrera} onValueChange={setCarrera} disabled={!facultad}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione una Carrera" /></SelectTrigger>
                                <SelectContent>
                                    {carrerasFiltradas.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[#00563F] font-semibold">Campo Amplio</Label>
                            <Input value={campoAmplio} onChange={e => setCampoAmplio(e.target.value)} placeholder="Ej: Educación" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#00563F] font-semibold">Campo Específico</Label>
                            <Input value={campoEspecifico} onChange={e => setCampoEspecifico(e.target.value)} placeholder="Ej: Formación de docentes" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#00563F] font-semibold">Campo Detallado</Label>
                            <Input value={campoDetallado} onChange={e => setCampoDetallado(e.target.value)} placeholder="Ej: Educación primaria" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleSave} disabled={isSaving || !carrera} className="flex-1 bg-[#00563F] hover:bg-[#00563F]/90 text-lg h-12">
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                            {editingId ? "Actualizar Registro" : "Guardar Registro"}
                        </Button>
                        <Button onClick={handleNuevo} variant="outline" className="flex-1 text-lg h-12 border-[#00563F] text-[#00563F] hover:bg-[#00563F]/10">
                            <Plus className="mr-2" />
                            Nuevo
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4 text-gray-700">Registros Existentes</h2>
                <div className="rounded-md border shadow-sm bg-white overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-100 hover:bg-gray-200">
                                <TableHead>Carrera</TableHead>
                                <TableHead>Campo Amplio</TableHead>
                                <TableHead>Campo Específico</TableHead>
                                <TableHead>Campo Detallado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingRegistros ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin inline mr-2" />Cargando...</TableCell></TableRow>
                            ) : !facultad ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Seleccione una facultad para ver sus registros.</TableCell></TableRow>
                            ) : registros.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay registros para la facultad seleccionada.</TableCell></TableRow>
                            ) : (
                                registros.map((reg) => (
                                    <TableRow key={reg.id} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">{reg.carrera?.nombre || getNombreCarrera(reg.carrera_id)}</TableCell>
                                        <TableCell>{reg.campo_amplio}</TableCell>
                                        <TableCell>{reg.campo_especifico}</TableCell>
                                        <TableCell>{reg.campo_detallado}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(reg)}><Edit className="h-4 w-4 text-blue-600" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(reg.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}