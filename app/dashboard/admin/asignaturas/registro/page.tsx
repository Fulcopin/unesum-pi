"use client"

import { useState, useEffect, useMemo, useCallback } from "react" // <--- AÑADIDO: useCallback
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Lock, Loader2, Trash2, Edit, AlertTriangle, BookOpen, ArrowLeft, Plus } from "lucide-react" 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"
import MallaModal from "@/components/malla/malla-modal"

type Section = "basica" | "asignatura" | "horas" | "unidades"

function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      alert(props.variant === "destructive" ? `Error: ${props.description}` : `${props.title}: ${props.description}`);
    }
  };
}

// --- INTERFACES (SIN CAMBIOS) ---
interface Facultad { id: number; nombre: string; }
interface Carrera { id: number; nombre: string; facultad_id: number; }
interface Nivel { id: number; nombre: string; codigo: string; }
interface Organizacion { id: number; nombre: string; }
interface UnidadData { unidad: string; descripcion: string; resultados: string; }
interface HorasData { horasDocencia: number; horasPractica: number; horasAutonoma: number; horasVinculacion: number; horasPracticaPreprofesional: number; }
interface AsignaturaCompleta {
    id: number;
    nombre: string;
    codigo: string;
    carrera_id: number;
    nivel_id: number;
    organizacion_id: number;
    prerrequisito_codigo: string | null;
    correquisito_codigo: string | null;
    unidades: UnidadData[];
    horas: HorasData;
    carrera: { facultad_id: number; };
}

// <--- AJUSTE: Mover la URL base fuera para fácil configuración ---
const API_BASE_URL = 'http://localhost:4000/api';

export default function RegistroAsignaturaPage() {
  const router = useRouter()
  const [completedSections, setCompletedSections] = useState<Section[]>([])
  const [currentSection, setCurrentSection] = useState<Section>("basica")
  const { token, getToken } = useAuth()
  const { toast } = useToast()

  const [facultades, setFacultades] = useState<Facultad[]>([])
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([])
  const [carrerasFiltradas, setCarrerasFiltradas] = useState<Carrera[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false);
  
  const [newAsignaturaId, setNewAsignaturaId] = useState<number | null>(null);

  const [asignaturasDelNivel, setAsignaturasDelNivel] = useState<AsignaturaCompleta[]>([]);
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false);
  const [editingAsignaturaId, setEditingAsignaturaId] = useState<number | null>(null);
  const [asignaturasNivelAnterior, setAsignaturasNivelAnterior] = useState<AsignaturaCompleta[]>([]);
  const [asignaturasNivelActual, setAsignaturasNivelActual] = useState<AsignaturaCompleta[]>([]);
  const [codigoError, setCodigoError] = useState<string>("");
  const [descripcionError, setDescripcionError] = useState<string>("");

  // --- ESTADOS DE MALLA ---
  const [showMallaModal, setShowMallaModal] = useState(true);
  const [codigoMallaActual, setCodigoMallaActual] = useState("");
  const [mallaSeleccionada, setMallaSeleccionada] = useState(false);
  const [registroCompletado, setRegistroCompletado] = useState(false);

  // --- ESTADOS DEL FORMULARIO (SIN CAMBIOS) ---
  const [facultad, setFacultad] = useState("")
  const [carrera, setCarrera] = useState("")
  const [nivel, setNivel] = useState("")
  const [organizacion, setOrganizacion] = useState("")
  const [codigo, setCodigo] = useState("")
  
  const handleCodigoChange = (value: string) => {
    setCodigo(value);
    if (codigoError) setCodigoError(""); // Limpiar el error cuando el usuario cambia el código
  };
  
  const handleDescripcionChange = (value: string) => {
    setDescripcion(value);
    if (descripcionError) setDescripcionError(""); // Limpiar el error cuando el usuario cambia la asignatura
  };
  const [descripcion, setDescripcion] = useState("")
  const [adscrCedDE, setAdscrCedDE] = useState("")
  const [adscrCedCODE, setAdscrCedCODE] = useState("")
  const [horasDocencia, setHorasDocencia] = useState("")
  const [horasPractica, setHorasPractica] = useState("")
  const [horasAutonoma, setHorasAutonoma] = useState("")
  const [horasVinculacion, setHorasVinculacion] = useState("")
  const [horasPracticaPreprofesional, setHorasPracticaPreprofesional] = useState("")
  const [unidades, setUnidades] = useState([{ unidad: "", descripcion: "", resultados: "" }])
  

  const apiRequest = async (url: string, options = {}) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    const currentToken = token || getToken();
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` }

    try {
      const response = await fetch(fullUrl, { ...options, headers });
      
      // Intentar parsear el JSON
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error("Error al procesar la respuesta del servidor");
      }
      
      if (!response.ok || !data.success) {
        const errorMessage = data.message || `Error en la petición: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      return data;
    } catch (error) {
      // Si el error ya es un Error con mensaje, lo propagamos
      if (error instanceof Error) {
        throw error;
      }
      // Si es otro tipo de error, lo convertimos en un Error con mensaje genérico
      throw new Error("Error de conexión con el servidor");
    }
  }

  // --- USEEFFECT PARA CARGAR DATOS INICIALES (SIN CAMBIOS) ---
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      setLoading(true);
      try {
        const [facultadesRes, carrerasRes, nivelesRes, organizacionesRes] = await Promise.all([
          apiRequest("/datos-academicos/facultades"),
          apiRequest("/datos-academicos/carreras"),
          apiRequest("/niveles"),
          apiRequest("/organizacion_curricular")
        ]);
        if (facultadesRes) setFacultades(facultadesRes.data || facultadesRes);
        if (carrerasRes) setCarreras(carrerasRes.data || carrerasRes);
        if (nivelesRes) setNiveles(nivelesRes.data || nivelesRes);
        if (organizacionesRes) setOrganizaciones(organizacionesRes.data || organizacionesRes);
      } catch (error) {
        console.error("Fallo al cargar datos iniciales:", error);
        const errorMessage = error instanceof Error ? error.message : "Error al cargar datos iniciales";
        toast({
          title: "Error al cargar datos",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    cargarDatosIniciales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    // <--- AJUSTE: useCallback para evitar re-crear la función en cada render ---
    const cargarAsignaturas = useCallback(async () => {
        if (!nivel || !carrera) {
            setAsignaturasDelNivel([]);
            setAsignaturasNivelAnterior([]);
            setAsignaturasNivelActual([]);
            return;
        }
        setLoadingAsignaturas(true);
        try {
            const response = await apiRequest(`/asignaturas?nivel_id=${nivel}&carrera_id=${carrera}`);
            if (response && response.data) {
                setAsignaturasDelNivel(response.data);
                setAsignaturasNivelActual(response.data.slice(1)); // A partir de la segunda línea
            }

            // Cargar asignaturas del nivel anterior
            const nivelActual = niveles.find(n => n.id.toString() === nivel);
            if (nivelActual) {
                const nivelAnteriorNum = parseInt(nivelActual.codigo) - 1;
                const nivelAnterior = niveles.find(n => parseInt(n.codigo) === nivelAnteriorNum);
                
                if (nivelAnterior) {
                    const respuestaNivelAnterior = await apiRequest(`/asignaturas?nivel_id=${nivelAnterior.id}&carrera_id=${carrera}`);
                    if (respuestaNivelAnterior && respuestaNivelAnterior.data) {
                        setAsignaturasNivelAnterior(respuestaNivelAnterior.data.slice(1)); // A partir de la segunda línea
                    }
                }
            }
        } catch (error) {
            console.error("Error al cargar asignaturas por nivel:", error);
            setAsignaturasDelNivel([]);
            setAsignaturasNivelAnterior([]);
            setAsignaturasNivelActual([]);
            // No mostrar toast aquí ya que es una carga en segundo plano
        } finally {
            setLoadingAsignaturas(false);
        }
    }, [nivel, carrera, token, niveles]); // <--- Dependencias

    useEffect(() => {
        cargarAsignaturas();
    }, [cargarAsignaturas]); // Se ejecuta cuando la función (y sus dependencias) cambian

  // --- LÓGICA DE FILTROS Y SCROLL ---
  useEffect(() => {
    if (facultad && carreras.length > 0 && !mallaSeleccionada) {
      const carrerasDeFacultad = carreras.filter(c => c.facultad_id.toString() === facultad);
      setCarrerasFiltradas(carrerasDeFacultad);
      setCarrera("");
    } else if (facultad && carreras.length > 0 && mallaSeleccionada) {
      // Si hay malla seleccionada, solo filtrar sin limpiar la carrera
      const carrerasDeFacultad = carreras.filter(c => c.facultad_id.toString() === facultad);
      setCarrerasFiltradas(carrerasDeFacultad);
    } else {
      setCarrerasFiltradas([]);
    }
  }, [facultad, carreras, mallaSeleccionada]);

  useEffect(() => {
    setTimeout(() => {
      const sectionElement = document.getElementById(currentSection);
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [currentSection]);

  const handleMallaSelected = (mallaData: any) => {
    setCodigoMallaActual(mallaData.codigo_malla);
    setMallaSeleccionada(true);
    
    // Primero establecer la facultad
    setFacultad(mallaData.facultad_id.toString());
    
    // Filtrar las carreras de la facultad seleccionada
    const carrerasDeFacultad = carreras.filter(c => c.facultad_id === mallaData.facultad_id);
    setCarrerasFiltradas(carrerasDeFacultad);
    
    // Establecer la carrera
    setCarrera(mallaData.carrera_id.toString());
    
    setShowMallaModal(false);
  };

  const resetForm = () => {
      // Restablecer TODOS los campos del formulario al estado inicial
      setFacultad("");
      setCarrera("");
      setNivel("");
      setOrganizacion("");
      setCodigo("");
      setDescripcion("");
      setAdscrCedDE("");
      setAdscrCedCODE("");
      setHorasDocencia("");
      setHorasPractica("");
      setHorasAutonoma("");
      setHorasVinculacion("");
      setHorasPracticaPreprofesional("");
      setUnidades([{ unidad: "", descripcion: "", resultados: "" }]);
      setCompletedSections([]);
      setCurrentSection("basica");
      setEditingAsignaturaId(null);
      setNewAsignaturaId(null);
      setCarrerasFiltradas([]);
      setAsignaturasDelNivel([]);
      setAsignaturasNivelAnterior([]);
      setAsignaturasNivelActual([]);
      setRegistroCompletado(false);
      
      // Restablecer el modal de malla al estado inicial
      setCodigoMallaActual("");
      setMallaSeleccionada(false);
      setShowMallaModal(true);
  };

  const handleContinuarDesdeNivel = () => {
    // Limpiar el formulario pero mantener facultad, carrera y nivel
    const facultadActual = facultad;
    const carreraActual = carrera;
    const nivelActual = nivel;
    const mallaActual = codigoMallaActual;
    const mallaSelec = mallaSeleccionada;
    const carrerasFilt = carrerasFiltradas;
    
    setCodigo("");
    setDescripcion("");
    setAdscrCedDE("");
    setAdscrCedCODE("");
    setOrganizacion("");
    setHorasDocencia("");
    setHorasPractica("");
    setHorasAutonoma("");
    setHorasVinculacion("");
    setHorasPracticaPreprofesional("");
    setUnidades([{ unidad: "", descripcion: "", resultados: "" }]);
    setCompletedSections(["basica"]); // Mantener la sección básica completa
    setCurrentSection("asignatura");
    setEditingAsignaturaId(null);
    setNewAsignaturaId(null);  // IMPORTANTE: Limpiar el ID de la asignatura guardada
    setRegistroCompletado(false);
    
    // Restaurar los valores que queremos mantener
    setFacultad(facultadActual);
    setCarrera(carreraActual);
    setNivel(nivelActual);
    setCodigoMallaActual(mallaActual);
    setMallaSeleccionada(mallaSelec);
    setCarrerasFiltradas(carrerasFilt);
    
    console.log("🔄 Formulario reiniciado para nueva asignatura");
    console.log("📝 Estado limpiado - editingAsignaturaId: null, newAsignaturaId: null");
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({ title: "Éxito", description: "Puede agregar otra asignatura al mismo nivel." });
  };

  const handleOtraMalla = () => {
    resetForm();
    setShowMallaModal(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSectionCompleted = (section: Section) => completedSections.includes(section)
  const isSectionUnlocked = (section: Section) => {
    const sections: Section[] = ["basica", "asignatura", "horas", "unidades"]
    const currentIndex = sections.indexOf(section)
    if (currentIndex === 0 || editingAsignaturaId) return true
    return isSectionCompleted(sections[currentIndex - 1])
  }

  // <--- AJUSTE CLAVE: Lógica de guardado adaptada al backend ---
  const handleSaveSection = async (section: Section) => {
    setIsSaving(true);
    
    console.log("💾 Guardando sección:", section);
    console.log("🔍 Estado actual - editingAsignaturaId:", editingAsignaturaId, "newAsignaturaId:", newAsignaturaId);
    
    try {
        if (section === "basica") {
            if (!completedSections.includes(section)) setCompletedSections(prev => [...prev, section]);
            setCurrentSection("asignatura");
            return;
        }
      
        let response;
        const asignaturaId = editingAsignaturaId || newAsignaturaId;
        
        if (section === "asignatura") {
            // Validación adicional del código
            if (!codigo || codigo.trim() === "") {
                toast({
                    title: "Error de validación",
                    description: "El código de la asignatura es obligatorio",
                    variant: "destructive",
                });
                return;
            }
            
            // Validación local: verificar si el código ya existe en las asignaturas del nivel actual
            const codigoExistente = asignaturasDelNivel.find(
                asig => asig.codigo.toLowerCase() === codigo.trim().toLowerCase() && 
                        asig.id !== asignaturaId
            );
            
            if (codigoExistente) {
                const mensaje = `El código '${codigo}' ya está siendo usado por otra asignatura: ${codigoExistente.nombre}. Por favor, use un código diferente.`;
                setCodigoError(mensaje);
                toast({
                    title: "Código duplicado",
                    description: mensaje,
                    variant: "destructive",
                });
                return;
            }
            
            // Validación local: verificar si el nombre ya existe en las asignaturas del nivel actual
            const nombreExistente = asignaturasDelNivel.find(
                asig => asig.nombre.toLowerCase() === descripcion.trim().toLowerCase() && 
                        asig.id !== asignaturaId
            );
            
            if (nombreExistente) {
                const mensaje = `La asignatura '${descripcion}' ya existe en este nivel con el código: ${nombreExistente.codigo}. Por favor, use un nombre diferente.`;
                setDescripcionError(mensaje);
                toast({
                    title: "Asignatura duplicada",
                    description: mensaje,
                    variant: "destructive",
                });
                return;
            }
            
            // Para la asignatura base, sí distinguimos entre POST (crear) y PUT (actualizar)
            // Si existe editingAsignaturaId o newAsignaturaId, es una actualización (PUT)
            const isUpdate = !!(editingAsignaturaId || newAsignaturaId);
            const method = isUpdate ? 'PUT' : 'POST';
            const endpoint = isUpdate ? `/asignaturas/${asignaturaId}` : "/asignaturas";
            const payload = {
                carrera_id: parseInt(carrera),
                nivel_id: parseInt(nivel),
                organizacion_id: parseInt(organizacion),
                nombre: descripcion,
                codigo: codigo.trim(), // Eliminar espacios en blanco
                prerrequisito_codigo: (adscrCedDE && adscrCedDE !== "NINGUNO") ? adscrCedDE : null,
                correquisito_codigo: (adscrCedCODE && adscrCedCODE !== "NINGUNO") ? adscrCedCODE : null,
            };
            
            // Log para depuración - verificar qué código se está enviando
            console.log("📤 Enviando datos de asignatura:", payload);
            console.log("📝 Código actual en el estado:", codigo);
            console.log("🔑 Método HTTP:", method);
            console.log("🌐 Endpoint:", endpoint);
            console.log("🆔 Actualizando ID:", asignaturaId);
            
            response = await apiRequest(endpoint, { method, body: JSON.stringify(payload) });

            if (response && response.data.id) {
                if (!editingAsignaturaId) setNewAsignaturaId(response.data.id);
                toast({ title: "Éxito", description: response.message });
            } else {
                throw new Error("No se recibió el ID de la asignatura.");
            }
        }

        // Para horas y unidades, el backend usa POST para crear y actualizar (upsert/destroy-create)
        if (section === "horas" && asignaturaId) {
            const payload = {
                horasDocencia: parseInt(horasDocencia) || 0,
                horasPractica: parseInt(horasPractica) || 0,
                horasAutonoma: parseInt(horasAutonoma) || 0,
                horasVinculacion: parseInt(horasVinculacion) || 0,
                horasPracticaPreprofesional: parseInt(horasPracticaPreprofesional) || 0,
            };
            // Siempre usamos POST porque el backend lo maneja con 'upsert'
            response = await apiRequest(`/asignaturas/${asignaturaId}/horas`, { method: 'POST', body: JSON.stringify(payload) });
            if(response) toast({ title: "Éxito", description: response.message });
        }

        if (section === "unidades" && asignaturaId) {
            const payload = { unidades };
             // Siempre usamos POST porque el backend lo maneja con 'destroy' y 'bulkCreate'
            response = await apiRequest(`/asignaturas/${asignaturaId}/unidades`, { method: 'POST', body: JSON.stringify(payload) });
            if(response) {
                toast({ title: "Registro Completo", description: "La asignatura ha sido guardada." });
                await cargarAsignaturas(); // Recargar la tabla con los datos actualizados
                setRegistroCompletado(true); // Activar el estado de registro completado
                // No resetear el formulario aquí, dejar que el usuario elija qué hacer
            }
        }

        if (!completedSections.includes(section)) {
            setCompletedSections(prev => [...prev, section]);
        }
        const sections: Section[] = ["basica", "asignatura", "horas", "unidades"];
        const currentIndex = sections.indexOf(section);
        if (currentIndex < sections.length - 1) {
            setCurrentSection(sections[currentIndex + 1]);
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error al guardar";
        console.error("Error al guardar la sección:", error);
        console.error("🔴 Mensaje de error completo:", errorMessage);
        
        if (section === "asignatura") {
            const mensajeLower = errorMessage.toLowerCase();
            
            // Detectar error de código duplicado (más flexible)
            if (mensajeLower.includes("código") || mensajeLower.includes("codigo")) {
                if (mensajeLower.includes("duplicado") || 
                    mensajeLower.includes("ya está") || 
                    mensajeLower.includes("ya esta") ||
                    mensajeLower.includes("existe") ||
                    mensajeLower.includes("usado")) {
                    setCodigoError(errorMessage);
                }
            }
            
            // Detectar error de asignatura/nombre duplicado (más flexible)
            if (mensajeLower.includes("asignatura") || 
                mensajeLower.includes("nombre") ||
                mensajeLower.includes("descripcion") ||
                mensajeLower.includes("descripción")) {
                if (mensajeLower.includes("duplicado") || 
                    mensajeLower.includes("duplicada") ||
                    mensajeLower.includes("ya está") || 
                    mensajeLower.includes("ya esta") ||
                    mensajeLower.includes("existe") ||
                    mensajeLower.includes("usado") ||
                    mensajeLower.includes("usada")) {
                    setDescripcionError(errorMessage);
                }
            }
            
            // Si el error contiene referencias a ambos (código Y nombre), detectar ambos
            if ((mensajeLower.includes("código") || mensajeLower.includes("codigo")) && 
                !codigoError && 
                (mensajeLower.includes("duplicado") || mensajeLower.includes("existe"))) {
                setCodigoError("El código ya está en uso. Por favor, use un código diferente.");
            }
        }
        
        // Mostrar mensaje de error claro al usuario
        toast({
            title: "Error al guardar",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  };

    const handleEdit = (asignatura: AsignaturaCompleta) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setEditingAsignaturaId(asignatura.id);
        
        // Solo cambiar facultad/carrera si no hay malla seleccionada o si editar requiere cambio
        if (!mallaSeleccionada) {
            const facultadId = asignatura.carrera?.facultad_id?.toString() || "";
            setFacultad(facultadId);
            // Filtrar carreras antes de establecer la carrera
            const carrerasDeFacultad = carreras.filter(c => c.facultad_id === asignatura.carrera?.facultad_id);
            setCarrerasFiltradas(carrerasDeFacultad);
            setCarrera(asignatura.carrera_id.toString());
        }
        
        setNivel(asignatura.nivel_id.toString());
        setOrganizacion(asignatura.organizacion_id.toString());
        setCodigo(asignatura.codigo);
        setDescripcion(asignatura.nombre);
        setAdscrCedDE(asignatura.prerrequisito_codigo || "NINGUNO");
        setAdscrCedCODE(asignatura.correquisito_codigo || "NINGUNO");
        setHorasDocencia(asignatura.horas?.horasDocencia?.toString() || "0");
        setHorasPractica(asignatura.horas?.horasPractica?.toString() || "0");
        setHorasAutonoma(asignatura.horas?.horasAutonoma?.toString() || "0");
        setHorasVinculacion(asignatura.horas?.horasVinculacion?.toString() || "0");
        setHorasPracticaPreprofesional(asignatura.horas?.horasPracticaPreprofesional?.toString() || "0");
        setUnidades(asignatura.unidades.length > 0 ? asignatura.unidades : [{ unidad: "", descripcion: "", resultados: "" }]);
        setCompletedSections(["basica", "asignatura", "horas"]);
        setCurrentSection("basica");
        toast({ title: "Modo Edición", description: `Cargada la asignatura: ${asignatura.nombre}. Puede modificar los datos.` });
    };

    const handleDelete = async (asignaturaId: number) => {
        if (window.confirm("¿Está seguro de que desea eliminar esta asignatura? Esta acción no se puede deshacer.")) {
            try {
                const response = await apiRequest(`/asignaturas/${asignaturaId}`, { method: 'DELETE' });
                if (response) {
                    toast({ title: "Eliminado", description: response.message });
                    await cargarAsignaturas(); // Recargar la tabla para reflejar la eliminación
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Error al eliminar la asignatura";
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            }
        }
    };

  const agregarUnidad = () => setUnidades([...unidades, { unidad: "", descripcion: "", resultados: "" }])
  const actualizarUnidad = (index: number, campo: string, valor: string) => {
    const nuevasUnidades = [...unidades]
    nuevasUnidades[index] = { ...nuevasUnidades[index], [campo]: valor }
    setUnidades(nuevasUnidades)
  }
  const eliminarUnidad = (index: number) => setUnidades(unidades.filter((_, i) => i !== index))

  const totalHoras = useMemo(() => {
    const docencia = Number.parseInt(horasDocencia) || 0
    const practica = Number.parseInt(horasPractica) || 0
    const autonoma = Number.parseInt(horasAutonoma) || 0
    const vinculacion = Number.parseInt(horasVinculacion) || 0
    const practicaPrepro = Number.parseInt(horasPracticaPreprofesional) || 0
    //return docencia + practica + autonoma + vinculacion + practicaPrepro
    return docencia + practica + autonoma+ vinculacion + practicaPrepro 
  }, [horasDocencia, horasPractica, horasAutonoma, horasVinculacion, horasPracticaPreprofesional])

  // --- RENDERIZADO JSX ---
  return (
    <>
      <MallaModal
        open={showMallaModal}
        onClose={() => setShowMallaModal(false)}
        onMallaSelected={handleMallaSelected}
      />

      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Código de Malla Banner */}
        {mallaSeleccionada && (
          <Card className="mb-6 border-2 border-emerald-500 bg-emerald-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-emerald-700" />
                  <div>
                    <h3 className="font-semibold text-emerald-900">
                      Código de Malla: {codigoMallaActual}
                    </h3>
                    <p className="text-sm text-emerald-700">
                      Todas las asignaturas se registrarán bajo esta malla
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMallaModal(true)}
                  className="border-emerald-300"
                >
                  Cambiar Malla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#00563F]">
                  {editingAsignaturaId ? "Editando Asignatura" : "Registro de Asignatura"}
              </h1>
              <p className="text-muted-foreground mt-2">
                  {editingAsignaturaId ? "Modifique los datos necesarios y guarde cada sección." : "Complete cada sección para registrar una nueva asignatura en la malla curricular."}
              </p>
            </div>
            <Button
              onClick={() => router.push('/dashboard/admin')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Menú
            </Button>
          </div>
      </div>

      {/* ... (El resto de tu código JSX permanece igual) ... */}
      
       <div className="mb-8 flex gap-2">
        {(["basica", "asignatura", "horas", "unidades"] as Section[]).map((section) => (
          <div key={section} className="flex-1">
            <div
              className={`h-2 rounded-full ${isSectionCompleted(section) ? "bg-[#00563F]" : isSectionUnlocked(section) ? "bg-[#FDB71A]" : "bg-gray-200"}`}
            />
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <Card
          id="basica"
          className={`transition-all duration-300 ${!isSectionUnlocked("basica") ? "opacity-50" : ""} ${currentSection === 'basica' && !isSectionCompleted('basica') ? 'border-2 border-[#FDB71A]' : ''}`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSectionCompleted("basica") ? (<CheckCircle2 className="h-6 w-6 text-[#00563F]" />) : !isSectionUnlocked("basica") ? (<Lock className="h-6 w-6 text-gray-400" />) : (<div className="h-6 w-6 rounded-full border-2 border-[#FDB71A]" />)}
                <div>
                  <CardTitle>1. Información Básica</CardTitle>
                  <CardDescription>Facultad, Carrera y Nivel</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isSectionUnlocked("basica") ? (
              loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando datos académicos...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facultad">Facultad {mallaSeleccionada && <span className="text-xs text-gray-500">(bloqueado por malla)</span>}</Label>
                      <Select value={facultad} onValueChange={setFacultad} disabled={mallaSeleccionada}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione facultad" /></SelectTrigger >
                        <SelectContent>
                          {facultades.map((fac) => (
                            <SelectItem key={fac.id} value={fac.id.toString()}>
                              {fac.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carrera">Carrera {mallaSeleccionada && <span className="text-xs text-gray-500">(bloqueado por malla)</span>}</Label>
                      <Select value={carrera} onValueChange={setCarrera} disabled={mallaSeleccionada || !facultad || carrerasFiltradas.length === 0}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={!facultad ? "Seleccione una facultad" : "Seleccione carrera"} />
                        </SelectTrigger>
                        <SelectContent>
                          {carrerasFiltradas.map((carr) => (
                            <SelectItem key={carr.id} value={carr.id.toString()}>
                              {carr.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nivel">Nivel</Label>
                      <Select value={nivel} onValueChange={setNivel}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Seleccione nivel" /></SelectTrigger>
                        <SelectContent>
                          {niveles.map((n) => (
                            <SelectItem key={n.id} value={n.id.toString()}>
                              {n.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleSaveSection("basica")}
                      className="bg-[#00563F] hover:bg-[#00563F]/90"
                      disabled={!facultad || !carrera || !nivel || isSaving}
                    >
                      {isSaving && currentSection === 'basica' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continuar con Datos de Asignatura
                    </Button>
                    <Button
                      onClick={resetForm}
                      variant="outline"
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <p className="text-muted-foreground">Esta sección está bloqueada</p>
            )}
          </CardContent>
        </Card>

        <Card
          id="asignatura"
          className={`transition-all duration-300 ${!isSectionUnlocked("asignatura") ? "opacity-50" : ""} ${currentSection === 'asignatura' && !isSectionCompleted('asignatura') ? 'border-2 border-[#FDB71A]' : ''}`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSectionCompleted("asignatura") ? ( <CheckCircle2 className="h-6 w-6 text-[#00563F]" /> ) : !isSectionUnlocked("asignatura") ? ( <Lock className="h-6 w-6 text-gray-400" /> ) : ( <div className="h-6 w-6 rounded-full border-2 border-[#FDB71A]" /> )}
                <div>
                  <CardTitle>2. Datos de Asignatura</CardTitle>
                  <CardDescription>Unidad de Organización Curricular, Código, Asignatura, Prerrequisitos y Correquisitos</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isSectionUnlocked("asignatura") ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-1">
                        <Label htmlFor="organizacion">Unidad de Organización Curricular</Label>
                        <Select value={organizacion} onValueChange={setOrganizacion}>
                            <SelectTrigger><SelectValue placeholder="Seleccione unidad" /></SelectTrigger>
                            <SelectContent>
                                {organizaciones.map((org) => (
                                    <SelectItem key={org.id} value={org.id.toString()}>
                                        {org.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="codigo">Código</Label>
                        <Input 
                            id="codigo" 
                            value={codigo} 
                            onChange={(e) => handleCodigoChange(e.target.value)} 
                            placeholder="Código de Asignatura"
                            className={codigoError ? "border-red-500 focus:border-red-500" : ""}
                        />
                        {codigoError && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-md">
                                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800">{codigoError}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Asignatura</Label>
                  <Input 
                    id="descripcion" 
                    value={descripcion} 
                    onChange={(e) => handleDescripcionChange(e.target.value)} 
                    placeholder="Nombre de la Asignatura"
                    className={descripcionError ? "border-red-500 focus:border-red-500" : ""}
                  />
                  {descripcionError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-md">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{descripcionError}</p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prerrequisito">Prerrequisito</Label>
                    <Select value={adscrCedDE || "NINGUNO"} onValueChange={setAdscrCedDE}>
                      <SelectTrigger><SelectValue placeholder="Seleccione prerrequisito" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NINGUNO">Sin prerrequisito</SelectItem>
                        {asignaturasNivelAnterior.map((asig) => (
                          <SelectItem key={asig.id} value={asig.codigo}>
                            {asig.nombre} ({asig.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="correquisito">Correquisito</Label>
                    <Select value={adscrCedCODE || "NINGUNO"} onValueChange={setAdscrCedCODE}>
                      <SelectTrigger><SelectValue placeholder="Seleccione correquisito" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NINGUNO">Sin correquisito</SelectItem>
                        {asignaturasNivelActual.map((asig) => (
                          <SelectItem key={asig.id} value={asig.codigo}>
                            {asig.nombre} ({asig.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              
                <div className="flex gap-3">
                  <Button onClick={() => handleSaveSection("asignatura")} className="bg-[#00563F] hover:bg-[#00563F]/90" disabled={!organizacion || !codigo || !descripcion || isSaving}>
                    {isSaving && currentSection === 'asignatura' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continuar con la Distribución de Horas
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : ( <p className="text-muted-foreground">Complete la sección anterior para desbloquear</p> )}
          </CardContent>
        </Card>
        
        <Card
          id="horas"
          className={`transition-all duration-300 ${!isSectionUnlocked("horas") ? "opacity-50" : ""} ${currentSection === 'horas' && !isSectionCompleted('horas') ? 'border-2 border-[#FDB71A]' : ''}`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSectionCompleted("horas") ? ( <CheckCircle2 className="h-6 w-6 text-[#00563F]" /> ) : !isSectionUnlocked("horas") ? ( <Lock className="h-6 w-6 text-gray-400" /> ) : ( <div className="h-6 w-6 rounded-full border-2 border-[#FDB71A]" /> )}
                <div>
                  <CardTitle>3. Distribución de Horas</CardTitle>
                  <CardDescription>Horas de docencia, prácticas formativas de aplicación y experimentación y autónomas</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isSectionUnlocked("horas") ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="docencia">Horas de Docencia</Label>
                    <Input id="docencia" type="number" value={horasDocencia} onChange={(e) => setHorasDocencia(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practica">Horas para Prácticas Formativas de aplicación y Experimentación</Label>
                    <Input id="practica" type="number" value={horasPractica} onChange={(e) => setHorasPractica(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="autonoma">Horas de Trabajo Autónomo</Label>
                    <Input id="autonoma" type="number" value={horasAutonoma} onChange={(e) => setHorasAutonoma(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vinculacion">Horas de Vinculación</Label>
                    <Input id="vinculacion" type="number" value={horasVinculacion} onChange={(e) => setHorasVinculacion(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practicaPrepro">Horas de Práctica Preprofesional</Label>
                    <Input id="practicaPrepro" type="number" value={horasPracticaPreprofesional} onChange={(e) => setHorasPracticaPreprofesional(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Horas</Label>
                    <div className="h-10 flex items-center px-3 border rounded-md bg-muted font-semibold">
                      {totalHoras}
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleSaveSection("horas")} className="bg-[#00563F] hover:bg-[#00563F]/90" disabled={totalHoras === 0 || isSaving}>
                  {isSaving && currentSection === 'horas' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continuar con Unidades Temáticas, Contenidos y Resultados de Aprendizaje
                </Button>
              </div>
            ) : ( <p className="text-muted-foreground">Complete la sección anterior para desbloquear</p> )}
          </CardContent>
        </Card>
        
        <Card
          id="unidades"
          className={`transition-all duration-300 ${!isSectionUnlocked("unidades") ? "opacity-50" : ""} ${currentSection === 'unidades' && !isSectionCompleted('unidades') ? 'border-2 border-[#FDB71A]' : ''}`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSectionCompleted("unidades") ? ( <CheckCircle2 className="h-6 w-6 text-[#00563F]" /> ) : !isSectionUnlocked("unidades") ? ( <Lock className="h-6 w-6 text-gray-400" /> ) : ( <div className="h-6 w-6 rounded-full border-2 border-[#FDB71A]" /> )}
                <div>
                  <CardTitle>4. Unidades Temáticas y Resultados</CardTitle>
                  <CardDescription>Contenidos y resultados de aprendizaje</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isSectionUnlocked("unidades") ? (
              <div className="space-y-4">
                {unidades.map((unidad, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Unidad {index + 1}</h4>
                      {unidades.length > 1 && ( <Button variant="ghost" size="sm" onClick={() => eliminarUnidad(index)} className="text-red-600 hover:text-red-700"> Eliminar </Button> )}
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre de la Unidad</Label>
                      <Input value={unidad.unidad} onChange={(e) => actualizarUnidad(index, "unidad", e.target.value)} placeholder="Ej: Introducción a la Programación" />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea value={unidad.descripcion} onChange={(e) => actualizarUnidad(index, "descripcion", e.target.value)} placeholder="Descripción de los contenidos de la unidad" rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Resultados de Aprendizaje</Label>
                      <Textarea value={unidad.resultados} onChange={(e) => actualizarUnidad(index, "resultados", e.target.value)} placeholder="Resultados esperados al finalizar la unidad" rows={3} />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={agregarUnidad} className="w-full border-dashed bg-transparent">
                  + Agregar Unidad Temática
                </Button>
                <div className="pt-4 border-t">
                  {!registroCompletado ? (
                    <Button onClick={() => handleSaveSection("unidades")} className="bg-[#00563F] hover:bg-[#00563F]/90" disabled={unidades.some((u) => !u.unidad || !u.descripcion) || isSaving}>
                      {isSaving && currentSection === 'unidades' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingAsignaturaId ? "Actualizar Registro Completo" : "Guardar Registro Completo"}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800 mb-2">
                          <CheckCircle2 className="h-5 w-5" />
                          <h4 className="font-semibold">Registro Guardado Exitosamente</h4>
                        </div>
                        <p className="text-sm text-green-700">
                          La asignatura ha sido guardada correctamente. ¿Qué desea hacer a continuación?
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button 
                          onClick={handleContinuarDesdeNivel}
                          className="bg-[#00563F] hover:bg-[#004830] flex-1 min-w-[200px]"
                        >
                          <BookOpen className="mr-2 h-4 w-4" />
                          Continuar
                          <span className="ml-1 text-xs">(Agregar otra asignatura al nivel)</span>
                        </Button>
                        <Button 
                          onClick={handleOtraMalla}
                          variant="outline"
                          className="flex-1 min-w-[200px] border-[#00563F] text-[#00563F] hover:bg-[#00563F] hover:text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Otra Malla
                          <span className="ml-1 text-xs">(Cambiar de malla curricular)</span>
                        </Button>
                        <Button 
                          onClick={() => router.push('/dashboard/admin')}
                          variant="outline"
                          className="flex-1 min-w-[200px]"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Menú
                          <span className="ml-1 text-xs">(Volver al dashboard)</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : ( <p className="text-muted-foreground">Complete la sección anterior para desbloquear</p> )}
          </CardContent>
        </Card>
      </div>

      <div id="tabla-asignaturas" className="mt-12">
        <h2 className="text-2xl font-bold text-[#00563F]">Asignaturas registradas en el Nivel</h2>
        <p className="text-muted-foreground mb-4">
            Visualice, edite o elimine las asignaturas del nivel seleccionado para la carrera actual.
        </p>

        {!nivel || !carrera ? (
            <Card className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Por favor, seleccione una facultad, carrera y nivel en la sección 1 para ver las asignaturas registradas.</p>
            </Card>
        ) : loadingAsignaturas ? (
            <Card className="flex items-center justify-center p-8">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <p className="text-muted-foreground">Cargando asignaturas...</p>
            </Card>
        ) : asignaturasDelNivel.length === 0 ? (
            <Card className="flex items-center justify-center p-8">
                 <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
                <p className="text-muted-foreground">No hay asignaturas registradas para este nivel.</p>
            </Card>
        ) : (
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Asignatura</TableHead>
                                    <TableHead>Unidades Temáticas</TableHead>
                                    <TableHead>Resultados de Aprendizaje</TableHead>
                                    <TableHead className="text-center">H. Docencia</TableHead>
                                    <TableHead className="text-center">H. Práctica</TableHead>
                                    <TableHead className="text-center">H. Autónoma</TableHead>
                                    <TableHead className="text-center">H. Vinculación</TableHead>
                                    <TableHead className="text-center">H. Práctica Pre.</TableHead>
                                    <TableHead className="text-center">Total Horas</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {asignaturasDelNivel.map((asig) => {
                                    const total = (asig.horas?.horasDocencia || 0) +
                                                  (asig.horas?.horasPractica || 0) +
                                                  (asig.horas?.horasAutonoma || 0) +
                                                  (asig.horas?.horasVinculacion || 0) +
                                                  (asig.horas?.horasPracticaPreprofesional || 0);
                                    return (
                                        <TableRow key={asig.id}>
                                            <TableCell className="font-semibold text-[#00563F]">{asig.codigo}</TableCell>
                                            <TableCell className="font-medium">{asig.nombre}</TableCell>
                                            <TableCell className="max-w-xs">{asig.unidades.map(u => u.unidad).join(", ")}</TableCell>
                                            <TableCell className="max-w-xs">{asig.unidades.map(u => u.resultados).join(", ")}</TableCell>
                                            <TableCell className="text-center">{asig.horas?.horasDocencia || 0}</TableCell>
                                            <TableCell className="text-center">{asig.horas?.horasPractica || 0}</TableCell>
                                            <TableCell className="text-center">{asig.horas?.horasAutonoma || 0}</TableCell>
                                            <TableCell className="text-center">{asig.horas?.horasVinculacion || 0}</TableCell>
                                            <TableCell className="text-center">{asig.horas?.horasPracticaPreprofesional || 0}</TableCell>
                                            <TableCell className="text-center font-bold">{total}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(asig)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(asig.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
    </>
  )
}