"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, Save, Loader2, UserPlus, ChevronDown, ChevronUp, FileText, BookOpen, GraduationCap, X } from "lucide-react"

import { useAuth } from "@/contexts/auth-context"

// --- Tipos de Datos que vienen de la API ---
interface Facultad { id: number; nombre: string }
interface Carrera { id: number; nombre: string; facultad_id: number }
interface Nivel { id: number; nombre: string; codigo: string }
interface Asignatura { id: number; nombre: string; codigo: string; carrera_id: number }
interface Paralelo { id: number; nombre: string; codigo: string }
interface Profesor {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  activo: boolean;
  carrera_id: number;
  asignatura_id?: number;
  nivel_id?: number;
  paralelo_id?: number;
  carrera?: {
    id: number;
    nombre: string;
    facultad?: {
        id: number;
        nombre: string;
    };
    mallas?: {
        id: number;
        codigo_malla: string;
    }[];
  };
  carreras?: {
    id: number;
    nombre: string;
    facultad?: {
        id: number;
        nombre: string;
    };
  }[];
  asignatura?: {
    id: number;
    nombre: string;
    codigo: string;
    programasAnaliticos?: {
      id: number;
      nombre: string;
      periodo: string;
    }[];
    syllabi?: {
      id: number;
      nombre: string;
      periodo: string;
    }[];
  };
  asignaturas?: {
    id: number;
    nombre: string;
    codigo: string;
    programasAnaliticos?: {
      id: number;
      nombre: string;
      periodo: string;
    }[];
    syllabi?: {
      id: number;
      nombre: string;
      periodo: string;
    }[];
    syllabusComision?: {
      id: number;
      nombre: string;
      periodo: string;
      estado: string;
    }[];
  }[];
  nivel?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  paralelo?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  syllabusDocente?: {
    id: number;
    nombre: string;
    periodo: string;
    estado: string;
    asignatura_id: number;
  }[];
  programasDocente?: {
    id: number;
    nombre: string;
    periodo: string;
    estado: string;
    asignatura_id: number;
  }[];
}

// Hook de toast simulado (igual al que ya usas)
function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      alert(props.variant === "destructive" ? `Error: ${props.description}` : `${props.title}: ${props.description}`);
    }
  };
}

export default function GestionDocentesPage() {
  const { token, getToken } = useAuth() 
  const { toast } = useToast()

  // --- Estados del Componente ---
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [paralelos, setParalelos] = useState<Paralelo[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [mallas, setMallas] = useState<any[]>([])
  
  // --- Estados de Filtros ---
  const [filtros, setFiltros] = useState({
    periodo: "",
    facultad: "",
    carrera: "",
    malla: ""
  })
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    message: string;
    errors?: string[];
    summary?: { total: number; creados: number; errores: number };
    type: 'success' | 'warning' | 'error';
  } | null>(null);
  const [mounted, setMounted] = useState(false)
  const [expandedProfesorId, setExpandedProfesorId] = useState<number | null>(null)
  const [selectedCarrerasIds, setSelectedCarrerasIds] = useState<number[]>([])
  const [selectedAsignaturasIds, setSelectedAsignaturasIds] = useState<number[]>([])
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    asignatura: "", // Almacenará el ID de la asignatura
    nivel: "", // Almacenará el ID del nivel
    paralelo: "", // Almacenará el ID del paralelo
    activo: true,
  })

  // --- Lógica de API ---
  const apiRequest = async (url: string, options = {}) => {
    const BASE_URL = 'http://localhost:4000/api';
    const fullUrl = `${BASE_URL}${url}`;
    const currentToken = token || getToken();
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` }
    return fetch(fullUrl, { ...options, headers });
  }
    // ... (después de tu función handleSubmit)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadResult(null); // Limpiar resultado anterior
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Por favor, seleccione un archivo CSV o Excel para subir.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadResult(null);
    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:4000/api/profesores/upload', {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token || getToken()}`
        },
        body: uploadFormData,
      });
      
      const result = await response.json();

      if (response.status === 201) {
        // Todos creados exitosamente
        setUploadResult({
          message: result.message,
          summary: result.summary,
          type: 'success'
        });
        fetchData();
      } else if (response.status === 207) {
        // Parcialmente exitoso
        setUploadResult({
          message: result.message,
          errors: result.errors,
          summary: result.summary,
          type: 'warning'
        });
        fetchData();
      } else {
        // Error completo
        setUploadResult({
          message: result.message,
          errors: result.errors,
          summary: result.summary,
          type: 'error'
        });
      }

      setSelectedFile(null);
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error: any) {
      setUploadResult({
        message: error.message || 'Error de conexión al servidor.',
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "nombres,apellidos,email,carrera_nombre,asignaturas,nivel_nombre,paralelo_nombre,carreras_adicionales,activo\n" +
      "Juan Carlos,Pérez González,juan.perez@universidad.edu,Ingeniería en Sistemas,Matemáticas I;Física I,Primer Nivel,A,,true\n" +
      "María Elena,López Ruiz,maria.lopez@universidad.edu,Medicina,Anatomía I,Primer Nivel,B,Enfermería,true";
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_docentes.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  const fetchData = async () => {
    try {
      setLoading(true);
      const [profesoresRes, facultadesRes, carrerasRes, nivelesRes, asignaturasRes, paralelosRes, periodosRes, mallasRes] = await Promise.all([
        apiRequest('/profesores'),
        apiRequest('/datos-academicos/facultades'),
        apiRequest('/datos-academicos/carreras'),
        apiRequest('/datos-academicos/niveles'),
        apiRequest('/datos-academicos/asignaturas'),
        apiRequest('/datos-academicos/paralelos'),
        apiRequest('/periodo'),
        apiRequest('/mallas')
      ]);

      if (!profesoresRes.ok || !facultadesRes.ok || !carrerasRes.ok || !nivelesRes.ok || !asignaturasRes.ok || !paralelosRes.ok) {
        throw new Error("Error al cargar los datos iniciales.");
      }

      const [profesoresData, facultadesData, carrerasData, nivelesData, asignaturasData, paralelosData, periodosData, mallasData] = await Promise.all([
        profesoresRes.json(), facultadesRes.json(), carrerasRes.json(), nivelesRes.json(), asignaturasRes.json(), paralelosRes.json(), periodosRes.json(), mallasRes.json()
      ]);

      const profesoresArray = Array.isArray(profesoresData?.data) ? profesoresData.data : (Array.isArray(profesoresData) ? profesoresData : []);
      const facultadesArray = Array.isArray(facultadesData?.data) ? facultadesData.data : (Array.isArray(facultadesData) ? facultadesData : []);
      const carrerasArray = Array.isArray(carrerasData?.data) ? carrerasData.data : (Array.isArray(carrerasData) ? carrerasData : []);
      const nivelesArray = Array.isArray(nivelesData?.data) ? nivelesData.data : (Array.isArray(nivelesData) ? nivelesData : []);
      const asignaturasArray = Array.isArray(asignaturasData?.data) ? asignaturasData.data : (Array.isArray(asignaturasData) ? asignaturasData : []);
      const paralelosArray = Array.isArray(paralelosData?.data) ? paralelosData.data : (Array.isArray(paralelosData) ? paralelosData : []);
      const periodosArray = Array.isArray(periodosData?.data) ? periodosData.data : (Array.isArray(periodosData) ? periodosData : []);
      const mallasArray = Array.isArray(mallasData?.data) ? mallasData.data : (Array.isArray(mallasData) ? mallasData : []);

      setProfesores(profesoresArray);
      setFacultades(facultadesArray);
      setCarreras(carrerasArray);
      setNiveles(nivelesArray);
      setAsignaturas(asignaturasArray);
      setParalelos(paralelosArray);
      setPeriodos(periodosArray);
      setMallas(mallasArray);

      console.log('✅ Datos cargados:', {
        profesores: profesoresArray.length,
        facultades: facultadesArray.length,
        carreras: carrerasArray.length,
        niveles: nivelesArray.length,
        asignaturas: asignaturasArray.length,
        paralelos: paralelosArray.length,
        periodos: periodosArray.length,
        mallas: mallasArray.length
      });

    } catch (error: any) {
      console.error('❌ Error al cargar datos:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (token && mounted) fetchData();
  }, [token, mounted]);

  const asignaturasFiltradas = useMemo(() => {
    if (!filtros.malla || filtros.malla === "todas") return asignaturas;
    const mallaSeleccionada = mallas.find(m => m.id === parseInt(filtros.malla, 10));
    if (!mallaSeleccionada) return asignaturas;
    return asignaturas.filter(a => a.carrera_id === mallaSeleccionada.carrera_id);
  }, [filtros.malla, asignaturas, mallas]);

  const carrerasFiltradasPorFiltro = useMemo(() => {
    if (!filtros.facultad) return [];
    return carreras.filter(c => c.facultad_id === parseInt(filtros.facultad, 10));
  }, [filtros.facultad, carreras]);

  const mallasFiltradasPorCarrera = useMemo(() => {
    if (!filtros.carrera) return [];
    return mallas.filter(m => m.carrera_id === parseInt(filtros.carrera, 10));
  }, [filtros.carrera, mallas]);

  const profesoresFiltrados = useMemo(() => {
    return profesores.filter(profesor => {
      let cumpleFiltros = true;
      
      if (filtros.facultad && filtros.facultad !== "todas") {
        const facId = parseInt(filtros.facultad, 10);
        const carreraPrincipalMatch = profesor.carrera?.facultad?.id === facId;
        const carrerasAdicionalesMatch = profesor.carreras?.some(c => c.facultad?.id === facId) || false;
        cumpleFiltros = cumpleFiltros && (carreraPrincipalMatch || carrerasAdicionalesMatch);
      }
      
      if (filtros.carrera && filtros.carrera !== "todas") {
        const carId = parseInt(filtros.carrera, 10);
        const carreraPrincipalMatch = profesor.carrera_id === carId;
        const carrerasAdicionalesMatch = profesor.carreras?.some(c => c.id === carId) || false;
        cumpleFiltros = cumpleFiltros && (carreraPrincipalMatch || carrerasAdicionalesMatch);
      }
      
      return cumpleFiltros;
    });
  }, [profesores, filtros]);
  
  // --- Manejadores de Eventos ---
  const handleSelectChange = (name: 'asignatura' | 'nivel' | 'paralelo', value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNew = () => {
    setFormData({ nombres: "", apellidos: "", email: "", asignatura: "", nivel: "", paralelo: "", activo: true });
    setSelectedCarrerasIds([]);
    setSelectedAsignaturasIds([]);
    setEditingId(null);
  };

  const handleEdit = (profesor: Profesor) => {
    setEditingId(profesor.id);
    setFormData({
      nombres: profesor.nombres,
      apellidos: profesor.apellidos,
      email: profesor.email,
      asignatura: profesor.asignatura_id ? profesor.asignatura_id.toString() : "",
      nivel: profesor.nivel_id ? profesor.nivel_id.toString() : "",
      paralelo: profesor.paralelo_id ? profesor.paralelo_id.toString() : "",
      activo: profesor.activo,
    });
    // Cargar las carreras asociadas
    const carrerasProf = profesor.carreras?.map(c => c.id) || [];
    if (carrerasProf.length === 0 && profesor.carrera_id) {
      carrerasProf.push(profesor.carrera_id);
    }
    setSelectedCarrerasIds(carrerasProf);
    // Cargar las asignaturas asociadas
    const asignaturasProf = profesor.asignaturas?.map(a => a.id) || [];
    if (asignaturasProf.length === 0 && profesor.asignatura_id) {
      asignaturasProf.push(profesor.asignatura_id);
    }
    setSelectedAsignaturasIds(asignaturasProf);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar a este docente? Esta acción no se puede deshacer.")) {
      try {
        const response = await apiRequest(`/profesores/${id}`, { method: "DELETE" });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "No se pudo eliminar al docente.");
        }
        toast({ title: "Éxito", description: "Docente eliminado correctamente." });
        fetchData(); // Recargar la lista
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
  };

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Obtener carrera_id de la asignatura seleccionada o del filtro activo
    const asignaturaSeleccionada = asignaturas.find(a => a.id === parseInt(formData.asignatura, 10));
    const carreraId = selectedCarrerasIds.length > 0
      ? selectedCarrerasIds[0]
      : (asignaturaSeleccionada 
          ? asignaturaSeleccionada.carrera_id 
          : (filtros.carrera && filtros.carrera !== "todas" ? parseInt(filtros.carrera, 10) : null));
    
    if (!carreraId) {
      toast({ title: "Error", description: "Debe seleccionar una carrera en los filtros o una asignatura para asignar al docente.", variant: "destructive" });
      setSubmitting(false);
      return;
    }
    
    const payload = {
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      email: formData.email,
      activo: formData.activo,
      carrera: carreraId,
      carreras_ids: selectedCarrerasIds.length > 0 ? selectedCarrerasIds : [carreraId],
      asignatura_id: selectedAsignaturasIds.length > 0 ? selectedAsignaturasIds[0] : (formData.asignatura ? parseInt(formData.asignatura, 10) : null),
      asignaturas_ids: selectedAsignaturasIds.length > 0 ? selectedAsignaturasIds : (formData.asignatura ? [parseInt(formData.asignatura, 10)] : []),
      nivel_id: formData.nivel ? parseInt(formData.nivel, 10) : null,
      paralelo_id: formData.paralelo ? parseInt(formData.paralelo, 10) : null
    };
    
    const url = editingId ? `/profesores/${editingId}` : '/profesores';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await apiRequest(url, { method, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al guardar los datos.");
      
      // --- CAMBIO AQUÍ ---
      // Mensaje más descriptivo para la creación de un nuevo docente
      const successMessage = editingId 
        ? 'Docente actualizado correctamente.' 
        : 'Docente creado. Se ha enviado un email para que establezca su contraseña.';
        
      toast({ title: "Éxito", description: successMessage });
      // --- FIN DEL CAMBIO ---

      fetchData();
      handleNew();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      {!mounted ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : (
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">GESTIÓN DE DOCENTES</h1>
          </div>
          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Sección de Filtros */}
            <Card className="mb-8 border-2 border-emerald-500">
              <CardHeader className="bg-emerald-50">
                <CardTitle className="text-emerald-900">Filtros de Búsqueda</CardTitle>
                <CardDescription>Seleccione los criterios para filtrar los docentes en la tabla</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="filtro-periodo">Periodo Académico</Label>
                    <Select 
                      value={filtros.periodo} 
                      onValueChange={(v) => setFiltros(prev => ({ ...prev, periodo: v }))}
                    >
                      <SelectTrigger id="filtro-periodo">
                        <SelectValue placeholder="Todos los periodos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los periodos</SelectItem>
                        {periodos.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="filtro-facultad">Facultad</Label>
                    <Select 
                      value={filtros.facultad} 
                      onValueChange={(v) => setFiltros(prev => ({ ...prev, facultad: v, carrera: "", malla: "" }))}
                    >
                      <SelectTrigger id="filtro-facultad">
                        <SelectValue placeholder="Todas las facultades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las facultades</SelectItem>
                        {facultades.map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="filtro-carrera">Carrera</Label>
                    <Select 
                      value={filtros.carrera} 
                      onValueChange={(v) => setFiltros(prev => ({ ...prev, carrera: v, malla: "" }))}
                      disabled={!filtros.facultad || filtros.facultad === "todas"}
                    >
                      <SelectTrigger id="filtro-carrera">
                        <SelectValue placeholder="Todas las carreras" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las carreras</SelectItem>
                        {carrerasFiltradasPorFiltro.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="filtro-malla">Malla Curricular</Label>
                    <Select 
                      value={filtros.malla} 
                      onValueChange={(v) => setFiltros(prev => ({ ...prev, malla: v }))}
                      disabled={!filtros.carrera || filtros.carrera === "todas"}
                    >
                      <SelectTrigger id="filtro-malla">
                        <SelectValue placeholder="Todas las mallas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las mallas</SelectItem>
                        {mallasFiltradasPorCarrera.map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.codigo_malla}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setFiltros({ periodo: "", facultad: "", carrera: "", malla: "" })}
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="mb-8">
               <CardHeader>
                <CardTitle>
                  {editingId ? "Editar Docente" : "Gestión de Docentes"}
                </CardTitle>
                <CardDescription>
                  {editingId 
                    ? "Actualice los datos del docente." 
                    : "Registre un nuevo docente individualmente o importe múltiples desde un archivo CSV."
                  }
                </CardDescription>
              </CardHeader>

              {/* =========== INICIO DE LA CORRECCIÓN =========== */}
              <CardContent>
                {/* --- SECCIÓN DE CARGA MASIVA --- */}
                <div className="mb-8 p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/30">
                  <Label className="text-lg font-semibold text-blue-900">Carga Masiva de Docentes</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Suba un archivo CSV o Excel (.xlsx) para crear múltiples docentes a la vez.
                  </p>
                  
                  {/* Estructura de columnas */}
                  <div className="bg-white rounded-md border p-3 mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Columnas del archivo:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div><Badge className="bg-red-100 text-red-800 mr-1">Obligatorio</Badge> <code>nombres</code> — Nombres del docente</div>
                      <div><Badge className="bg-red-100 text-red-800 mr-1">Obligatorio</Badge> <code>apellidos</code> — Apellidos del docente</div>
                      <div><Badge className="bg-red-100 text-red-800 mr-1">Obligatorio</Badge> <code>email</code> — Correo electrónico</div>
                      <div><Badge className="bg-red-100 text-red-800 mr-1">Obligatorio</Badge> <code>carrera_nombre</code> — Nombre de la carrera principal</div>
                      <div><Badge className="bg-blue-100 text-blue-800 mr-1">Opcional</Badge> <code>asignaturas</code> — Asignaturas separadas por <code>;</code></div>
                      <div><Badge className="bg-blue-100 text-blue-800 mr-1">Opcional</Badge> <code>nivel_nombre</code> — Nombre o código del nivel</div>
                      <div><Badge className="bg-blue-100 text-blue-800 mr-1">Opcional</Badge> <code>paralelo_nombre</code> — Nombre o código del paralelo</div>
                      <div><Badge className="bg-blue-100 text-blue-800 mr-1">Opcional</Badge> <code>carreras_adicionales</code> — Carreras extra separadas por <code>;</code></div>
                      <div><Badge className="bg-blue-100 text-blue-800 mr-1">Opcional</Badge> <code>activo</code> — true/false (default: true)</div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <Input id="csv-file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleUpload} 
                        disabled={uploading || !selectedFile} 
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {uploading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> PROCESANDO...</>
                        ) : (
                          <><UserPlus className="mr-2 h-4 w-4" /> IMPORTAR</>
                        )}
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={handleDownloadTemplate}
                        className="border-blue-400 text-blue-700 hover:bg-blue-50"
                      >
                        📥 DESCARGAR PLANTILLA CSV
                      </Button>
                    </div>
                  </div>
                  {selectedFile && <p className="text-sm text-muted-foreground mt-2">Archivo seleccionado: <strong>{selectedFile.name}</strong></p>}
                  
                  {/* Resultado de la carga */}
                  {uploadResult && (
                    <div className={`mt-4 rounded-lg border p-4 ${
                      uploadResult.type === 'success' ? 'bg-green-50 border-green-300' :
                      uploadResult.type === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                      'bg-red-50 border-red-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{uploadResult.type === 'success' ? '✅' : uploadResult.type === 'warning' ? '⚠️' : '❌'}</span>
                        <p className={`font-semibold text-sm ${
                          uploadResult.type === 'success' ? 'text-green-800' :
                          uploadResult.type === 'warning' ? 'text-yellow-800' :
                          'text-red-800'
                        }`}>
                          {uploadResult.message}
                        </p>
                      </div>
                      
                      {uploadResult.summary && (
                        <div className="flex gap-4 mb-2 text-sm">
                          <span className="text-gray-600">Total filas: <strong>{uploadResult.summary.total}</strong></span>
                          <span className="text-green-700">Creados: <strong>{uploadResult.summary.creados}</strong></span>
                          <span className="text-red-700">Errores: <strong>{uploadResult.summary.errores}</strong></span>
                        </div>
                      )}
                      
                      {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm cursor-pointer text-gray-600 hover:text-gray-800">
                            Ver detalle de errores ({uploadResult.errors.length})
                          </summary>
                          <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {uploadResult.errors.map((err, idx) => (
                              <li key={idx} className="text-xs text-red-700 bg-red-100 rounded px-2 py-1">{err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      
                      <button 
                        onClick={() => setUploadResult(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 mt-2 underline"
                      >
                        Cerrar
                      </button>
                    </div>
                  )}
                </div>

                <hr className="my-6" />

                {/* --- FORMULARIO DE REGISTRO INDIVIDUAL --- */}
                <Label className="text-lg font-semibold">
                  {editingId ? "Editar Docente" : "Registrar Nuevo Docente"}
                </Label>
                <form onSubmit={handleSubmit} className="grid gap-6 mt-4">
                    {/* El resto de tus inputs (Nombres, Apellidos, etc.) va aquí SIN CAMBIOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2"><Label htmlFor="nombres">Nombres</Label><Input id="nombres" name="nombres" placeholder="Ej: Juan Carlos" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} required /></div>
                        <div className="grid gap-2"><Label htmlFor="apellidos">Apellidos</Label><Input id="apellidos" name="apellidos" placeholder="Ej: Pérez González" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} required /></div>
                    </div>
                    <div className="grid gap-2"><Label htmlFor="email">Correo Electrónico</Label><Input id="email" name="email" type="email" placeholder="juan.perez@universidad.edu" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required /></div>
                    
                    {/* --- SELECTOR MÚLTIPLE DE CARRERAS --- */}
                    <div className="grid gap-2">
                      <Label>Carreras Asignadas</Label>
                      <p className="text-sm text-muted-foreground">Seleccione una o más carreras para este docente. La primera será la carrera principal.</p>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(v) => {
                            const id = parseInt(v, 10);
                            if (!selectedCarrerasIds.includes(id)) {
                              setSelectedCarrerasIds(prev => [...prev, id]);
                            }
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Agregar carrera..." />
                          </SelectTrigger>
                          <SelectContent>
                            {carreras
                              .filter(c => !selectedCarrerasIds.includes(c.id))
                              .map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  {c.nombre}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedCarrerasIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedCarrerasIds.map((cid, idx) => {
                            const car = carreras.find(c => c.id === cid);
                            return (
                              <Badge key={cid} variant="outline" className={`text-sm py-1 px-3 ${idx === 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                {car?.nombre || `Carrera #${cid}`}
                                {idx === 0 && <span className="ml-1 text-xs">(principal)</span>}
                                <button
                                  type="button"
                                  onClick={() => setSelectedCarrerasIds(prev => prev.filter(id => id !== cid))}
                                  className="ml-2 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      {selectedCarrerasIds.length === 0 && (
                        <p className="text-xs text-amber-600">Si no selecciona carreras, se usará la carrera del filtro activo.</p>
                      )}
                    </div>
                    
                    {/* --- SELECTOR MÚLTIPLE DE ASIGNATURAS --- */}
                    <div className="grid gap-2">
                      <Label>Asignaturas Asignadas</Label>
                      <p className="text-sm text-muted-foreground">Seleccione una o más asignaturas. La primera será la asignatura principal.</p>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(v) => {
                            const id = parseInt(v, 10);
                            if (!selectedAsignaturasIds.includes(id)) {
                              setSelectedAsignaturasIds(prev => [...prev, id]);
                            }
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Agregar asignatura..." />
                          </SelectTrigger>
                          <SelectContent>
                            {asignaturasFiltradas
                              .filter(a => !selectedAsignaturasIds.includes(a.id))
                              .map((a) => (
                                <SelectItem key={a.id} value={a.id.toString()}>
                                  {a.nombre}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedAsignaturasIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedAsignaturasIds.map((aid, idx) => {
                            const asig = asignaturas.find(a => a.id === aid);
                            return (
                              <Badge key={aid} variant="outline" className={`text-sm py-1 px-3 ${idx === 0 ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                                {asig?.nombre || `Asignatura #${aid}`}
                                {idx === 0 && <span className="ml-1 text-xs">(principal)</span>}
                                <button
                                  type="button"
                                  onClick={() => setSelectedAsignaturasIds(prev => prev.filter(id => id !== aid))}
                                  className="ml-2 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      {selectedAsignaturasIds.length === 0 && (
                        <p className="text-xs text-amber-600">Seleccione al menos una asignatura para el docente.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2"><Label htmlFor="nivel">Nivel</Label><Select name="nivel" value={formData.nivel} onValueChange={(v) => handleSelectChange('nivel', v)}><SelectTrigger id="nivel"><SelectValue placeholder="Seleccione nivel" /></SelectTrigger><SelectContent>{niveles.map((n) => (<SelectItem key={n.id} value={n.id.toString()}>{n.nombre}</SelectItem>))}</SelectContent></Select></div>
                        <div className="grid gap-2"><Label htmlFor="paralelo">Paralelo</Label><Select name="paralelo" value={formData.paralelo} onValueChange={(v) => handleSelectChange('paralelo', v)}><SelectTrigger id="paralelo"><SelectValue placeholder="Seleccione paralelo" /></SelectTrigger><SelectContent>{paralelos.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>))}</SelectContent></Select></div>
                    </div>
                    <div className="flex items-center space-x-4 rounded-md border p-4">
                        <div className="flex-1 space-y-1"><p className="text-sm font-medium">Estado</p><p className="text-sm text-muted-foreground">Define si el docente está activo.</p></div>
                        <div className="flex items-center space-x-2"><Label className={!formData.activo ? "text-red-600" : "text-gray-500"}>Inactivo</Label><Switch checked={formData.activo} onCheckedChange={(c) => setFormData(p => ({ ...p, activo: c }))} /><Label className={formData.activo ? "text-green-600" : "text-gray-500"}>Activo</Label></div>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />GUARDANDO...</> : <><Save className="mr-2 h-4 w-4" />GUARDAR</>}</Button>
                        <Button type="button" onClick={handleNew} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={submitting}><Plus className="mr-2 h-4 w-4" />NUEVO</Button>
                    </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Docentes Registrados</CardTitle></CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
                  ) : !filtros.carrera ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="bg-gray-100 rounded-full p-4 mb-4">
                        <UserPlus className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium mb-2">Seleccione una carrera</p>
                      <p className="text-sm text-gray-500">Por favor, seleccione una carrera en los filtros para ver los docentes registrados.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-8">N.</TableHead>
                          <TableHead>Docente</TableHead>
                          <TableHead>Carrera</TableHead>
                          <TableHead>Malla</TableHead>
                          <TableHead>Asignatura</TableHead>
                          <TableHead>Nivel</TableHead>
                          <TableHead>Paralelo</TableHead>
                          <TableHead className="text-center">P. Analítico</TableHead>
                          <TableHead className="text-center">Syllabus</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profesoresFiltrados.map((profesor, index) => {
                          const isExpanded = expandedProfesorId === profesor.id;
                          const mallasProf = profesor.carrera?.mallas || [];
                          
                          // Combinar asignaturas: usar la relación muchos-a-muchos si existe, si no la singular
                          const todasAsignaturas = profesor.asignaturas && profesor.asignaturas.length > 0
                            ? profesor.asignaturas
                            : profesor.asignatura ? [profesor.asignatura] : [];
                          
                          // Contar documentos sumando de TODAS las asignaturas
                          const programasDocente = profesor.programasDocente || [];
                          const syllabusDocente = profesor.syllabusDocente || [];
                          
                          let totalProgramas = programasDocente.length;
                          let totalSyllabus = syllabusDocente.length;
                          todasAsignaturas.forEach(asig => {
                            totalProgramas += (asig.programasAnaliticos?.length || 0);
                            totalSyllabus += (asig.syllabi?.length || 0);
                          });
                          
                          return (
                            <>
                              <TableRow key={profesor.id} className={isExpanded ? "bg-emerald-50 border-b-0" : ""}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  <div className="font-medium">{profesor.nombres} {profesor.apellidos}</div>
                                  <div className="text-sm text-muted-foreground">{profesor.email}</div>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const todasCarreras = profesor.carreras && profesor.carreras.length > 0
                                      ? profesor.carreras
                                      : profesor.carrera ? [profesor.carrera] : [];
                                    return todasCarreras.length > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        {todasCarreras.map((c, idx) => (
                                          <Badge key={c.id} variant="outline" className={`text-xs ${idx === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {c.nombre}
                                            {idx === 0 && todasCarreras.length > 1 && <span className="ml-1 opacity-60">(P)</span>}
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : "N/A";
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {mallasProf.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      {mallasProf.map(m => (
                                        <Badge key={m.id} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          <GraduationCap className="h-3 w-3 mr-1" />
                                          {m.codigo_malla}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : <span className="text-muted-foreground text-sm">Sin malla</span>}
                                </TableCell>
                                <TableCell>
                                  {todasAsignaturas.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      {todasAsignaturas.map((a, idx) => (
                                        <Badge key={a.id} variant="outline" className={`text-xs ${idx === 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                                          {a.nombre}
                                          {idx === 0 && todasAsignaturas.length > 1 && <span className="ml-1 opacity-60">(P)</span>}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : <span className="text-muted-foreground text-sm">No asignado</span>}
                                </TableCell>
                                <TableCell>{profesor.nivel?.nombre || <span className="text-muted-foreground text-sm">N/A</span>}</TableCell>
                                <TableCell>{profesor.paralelo?.nombre || <span className="text-muted-foreground text-sm">N/A</span>}</TableCell>
                                <TableCell className="text-center">
                                  {totalProgramas > 0 ? (
                                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer" onClick={() => setExpandedProfesorId(isExpanded ? null : profesor.id)}>
                                      <FileText className="h-3 w-3 mr-1" />{totalProgramas}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-gray-400 border-gray-200">0</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {totalSyllabus > 0 ? (
                                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer" onClick={() => setExpandedProfesorId(isExpanded ? null : profesor.id)}>
                                      <BookOpen className="h-3 w-3 mr-1" />{totalSyllabus}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-gray-400 border-gray-200">0</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={profesor.activo ? "default" : "secondary"} className={profesor.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                    {profesor.activo ? "Activo" : "Inactivo"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => setExpandedProfesorId(isExpanded ? null : profesor.id)} 
                                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                      title="Ver documentos"
                                    >
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(profesor)} className="text-blue-600 border-blue-200 hover:bg-blue-50"><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(profesor.id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                              
                              {/* Fila expandible con detalles de documentos */}
                              {isExpanded && (
                                <TableRow key={`${profesor.id}-detail`} className="bg-emerald-50/50">
                                  <TableCell colSpan={11} className="p-4">
                                    <div className="space-y-4">
                                      {/* Mallas */}
                                      <div className="bg-white rounded-lg border p-4">
                                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-blue-800">
                                          <GraduationCap className="h-4 w-4" /> Mallas Curriculares
                                        </h4>
                                        {mallasProf.length > 0 ? (
                                          <ul className="flex flex-wrap gap-2">
                                            {mallasProf.map(m => (
                                              <li key={m.id} className="flex items-center gap-2 text-sm bg-blue-50 rounded p-2">
                                                <GraduationCap className="h-3 w-3 text-blue-600" />
                                                <span>{m.codigo_malla}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <p className="text-sm text-gray-500">No hay mallas para esta carrera.</p>
                                        )}
                                      </div>

                                      {/* Documentos por Asignatura */}
                                      {todasAsignaturas.length > 0 ? (
                                        todasAsignaturas.map((asig, asigIdx) => {
                                          const paAsig = asig.programasAnaliticos || [];
                                          const sylAsig = asig.syllabi || [];
                                          // Filtrar los documentos del docente para esta asignatura
                                          const pdAsig = (profesor.programasDocente || []).filter(pd => pd.asignatura_id === asig.id);
                                          const sdAsig = (profesor.syllabusDocente || []).filter(sd => sd.asignatura_id === asig.id);
                                          
                                          return (
                                            <div key={asig.id} className="bg-white rounded-lg border p-4">
                                              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-gray-800 border-b pb-2">
                                                <Badge variant="outline" className={`${asigIdx === 0 ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                                                  {asig.nombre}
                                                </Badge>
                                                {asig.codigo && <span className="text-xs text-gray-500">({asig.codigo})</span>}
                                              </h4>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Programas Analíticos de esta asignatura */}
                                                <div className="bg-purple-50/50 rounded-lg p-3">
                                                  <h5 className="font-semibold text-xs flex items-center gap-2 mb-2 text-purple-800">
                                                    <FileText className="h-3 w-3" /> Programas Analíticos
                                                  </h5>
                                                  {(paAsig.length > 0 || pdAsig.length > 0) ? (
                                                    <ul className="space-y-2">
                                                      {paAsig.map(pa => (
                                                        <li key={`pa-${pa.id}`} className="flex items-center justify-between text-sm bg-purple-50 rounded p-2">
                                                          <div>
                                                            <div className="font-medium">{pa.nombre}</div>
                                                            <div className="text-xs text-gray-500">{pa.periodo || 'Sin periodo'}</div>
                                                          </div>
                                                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">Asignatura</Badge>
                                                        </li>
                                                      ))}
                                                      {pdAsig.map(pd => (
                                                        <li key={`pd-${pd.id}`} className="flex items-center justify-between text-sm bg-purple-50 rounded p-2">
                                                          <div>
                                                            <div className="font-medium">{pd.nombre}</div>
                                                            <div className="text-xs text-gray-500">{pd.periodo || 'Sin periodo'}</div>
                                                          </div>
                                                          <Badge className={
                                                            pd.estado === 'aprobado' ? 'bg-green-100 text-green-800' : 
                                                            pd.estado === 'enviado' ? 'bg-yellow-100 text-yellow-800' : 
                                                            'bg-gray-100 text-gray-800'
                                                          }>
                                                            {pd.estado}
                                                          </Badge>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  ) : (
                                                    <p className="text-sm text-gray-500">Sin programas analíticos.</p>
                                                  )}
                                                </div>
                                                
                                                {/* Syllabus de esta asignatura */}
                                                <div className="bg-orange-50/50 rounded-lg p-3">
                                                  <h5 className="font-semibold text-xs flex items-center gap-2 mb-2 text-orange-800">
                                                    <BookOpen className="h-3 w-3" /> Syllabus
                                                  </h5>
                                                  {(sylAsig.length > 0 || sdAsig.length > 0) ? (
                                                    <ul className="space-y-2">
                                                      {sylAsig.map(s => (
                                                        <li key={`s-${s.id}`} className="flex items-center justify-between text-sm bg-orange-50 rounded p-2">
                                                          <div>
                                                            <div className="font-medium">{s.nombre}</div>
                                                            <div className="text-xs text-gray-500">{s.periodo || 'Sin periodo'}</div>
                                                          </div>
                                                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">Asignatura</Badge>
                                                        </li>
                                                      ))}
                                                      {sdAsig.map(sd => (
                                                        <li key={`sd-${sd.id}`} className="flex items-center justify-between text-sm bg-orange-50 rounded p-2">
                                                          <div>
                                                            <div className="font-medium">{sd.nombre}</div>
                                                            <div className="text-xs text-gray-500">{sd.periodo || 'Sin periodo'}</div>
                                                          </div>
                                                          <Badge className={
                                                            sd.estado === 'aprobado' ? 'bg-green-100 text-green-800' : 
                                                            sd.estado === 'enviado' ? 'bg-yellow-100 text-yellow-800' : 
                                                            'bg-gray-100 text-gray-800'
                                                          }>
                                                            {sd.estado}
                                                          </Badge>
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  ) : (
                                                    <p className="text-sm text-gray-500">Sin syllabus.</p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div className="bg-white rounded-lg border p-4">
                                          <p className="text-sm text-gray-500">No hay asignaturas asignadas a este docente.</p>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                        {profesoresFiltrados.length === 0 && (
                          <TableRow><TableCell colSpan={11} className="text-center py-8 text-gray-500">
                            No se encontraron docentes para esta carrera.
                          </TableCell></TableRow>
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
      )}
    </ProtectedRoute>
  )
}