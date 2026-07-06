"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import * as XLSX from "xlsx"
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

type Section = "basica" | "asignatura" | "unidades"

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
interface Nivel { id: number; nombre: string; codigo: string; ordinal?: string; }
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
    prerrequisitos_codigos: string[];
    correquisitos_codigos: string[];
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
  const [codigoBloqueado, setCodigoBloqueado] = useState(false);
  const [asignaturaSeleccionadaId, setAsignaturaSeleccionadaId] = useState<string>("NUEVA");

  // --- ESTADOS DE MALLA ---
  const [showMallaModal, setShowMallaModal] = useState(true);
  const [codigoMallaActual, setCodigoMallaActual] = useState("");
  const [mallaSeleccionada, setMallaSeleccionada] = useState(false);

  // --- ESTADO MODAL CARGA MASIVA ---
  const [showCargaMasivaModal, setShowCargaMasivaModal] = useState(false);
  const [cargaMasivaFile, setCargaMasivaFile] = useState<File | null>(null);
  const [cargaMasivaPreview, setCargaMasivaPreview] = useState<any[]>([]);
  const [cargaMasivaError, setCargaMasivaError] = useState("");
  const [isCargando, setIsCargando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [todasAsignaturasMalla, setTodasAsignaturasMalla] = useState<(AsignaturaCompleta & { nivelNombre?: string })[]>([]);
  const [cargandoMalla, setCargandoMalla] = useState(false);
  const [registroCompletado, setRegistroCompletado] = useState(false);
  const [isPersonalizada, setIsPersonalizada] = useState(false);

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
  const [prerequisitos, setPrerequisitos] = useState<string[]>([])
  const [correquisitos, setCorrequisitos] = useState<string[]>([])
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
            // Asignaturas del nivel actual (para correquisitos)
            const response = await apiRequest(`/asignaturas?nivel_id=${nivel}&carrera_id=${carrera}`);
            if (response && response.data) {
                setAsignaturasDelNivel(response.data);
                setAsignaturasNivelActual(response.data); // todas las del nivel actual
            }

            // Cargar asignaturas de TODOS los niveles anteriores (para prerrequisitos)
            const nivelActual = niveles.find(n => n.id.toString() === nivel);
            if (nivelActual) {
                const codigoActual = parseInt(nivelActual.codigo);
                // Buscar todos los niveles con código menor al actual
                const nivelesAnteriores = niveles.filter(n => parseInt(n.codigo) < codigoActual);
                
                if (nivelesAnteriores.length > 0) {
                    const promesas = nivelesAnteriores.map(n =>
                        apiRequest(`/asignaturas?nivel_id=${n.id}&carrera_id=${carrera}`)
                    );
                    const resultados = await Promise.all(promesas);
                    const todasAnteriores: AsignaturaCompleta[] = resultados
                        .filter(r => r && r.data)
                        .flatMap(r => r.data);
                    setAsignaturasNivelAnterior(todasAnteriores);
                } else {
                    setAsignaturasNivelAnterior([]);
                }
            }
        } catch (error) {
            console.error("Error al cargar asignaturas por nivel:", error);
            setAsignaturasDelNivel([]);
            setAsignaturasNivelAnterior([]);
            setAsignaturasNivelActual([]);
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
      setFacultad("");
      setCarrera("");
      setNivel("");
      setOrganizacion("");
      setCodigo("");
      setDescripcion("");
      setPrerequisitos([]);
      setCorrequisitos([]);
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
      setIsPersonalizada(false);
      setCodigoBloqueado(false);
      setAsignaturaSeleccionadaId("NUEVA");
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
    setPrerequisitos([]);
    setCorrequisitos([]);
    setOrganizacion("");
    setUnidades([{ unidad: "", descripcion: "", resultados: "" }]);
    setCompletedSections(["basica"]); // Mantener la sección básica completa
    setCurrentSection("asignatura");
    setEditingAsignaturaId(null);
    setNewAsignaturaId(null);  // IMPORTANTE: Limpiar el ID de la asignatura guardada
    setRegistroCompletado(false);
    setCodigoBloqueado(false);
    setAsignaturaSeleccionadaId("NUEVA");
    
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
    // Las secciones SOLO se desbloquean en modo personalizado o al editar una asignatura existente
    // Seleccionar una malla NO desbloquea las secciones automáticamente
    if (!isPersonalizada && !editingAsignaturaId) return false;
    
    const sections: Section[] = ["basica", "asignatura", "unidades"];
    const currentIndex = sections.indexOf(section);
    
    // Si estamos en la primera pestaña ("basica") o editando, la habilitamos
    if (currentIndex === 0 || editingAsignaturaId) return true;
    
    // Para las demás pestañas, verificamos que la anterior esté completada
    return isSectionCompleted(sections[currentIndex - 1]);
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
                codigo: codigo.trim(),
                prerrequisitos_codigos: prerequisitos,
                correquisitos_codigos: correquisitos,
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

        // Para unidades, el backend usa POST para crear y actualizar (destroy-create)
        if (section === "unidades" && asignaturaId) {
            const payload = { unidades };
            response = await apiRequest(`/asignaturas/${asignaturaId}/unidades`, { method: 'POST', body: JSON.stringify(payload) });
            if(response) {
                toast({ title: "Registro Completo", description: "La asignatura ha sido guardada." });
                await cargarAsignaturas();
                setRegistroCompletado(true);
            }
        }

        if (!completedSections.includes(section)) {
            setCompletedSections(prev => [...prev, section]);
        }
        const sections: Section[] = ["basica", "asignatura", "unidades"];
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
        setPrerequisitos(Array.isArray(asignatura.prerrequisitos_codigos) ? asignatura.prerrequisitos_codigos : []);
        setCorrequisitos(Array.isArray(asignatura.correquisitos_codigos) ? asignatura.correquisitos_codigos : []);
        setUnidades(asignatura.unidades.length > 0 ? asignatura.unidades : [{ unidad: "", descripcion: "", resultados: "" }]);
        setCompletedSections(["basica", "asignatura"]);
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
    const handlePersonalizadaSelected = () => {
    // 1. Activamos el modo personalizado - esto desbloquea "Información Básica"
    setIsPersonalizada(true);
    
    // 2. Mantenemos mallaSeleccionada para que Facultad y Carrera queden bloqueadas
    // con los valores ya elegidos en el modal de malla
    // (NO se limpia mallaSeleccionada ni codigoMallaActual)
    
    // 3. Cerramos el modal
    setShowMallaModal(false);
    
    // 4. Navegamos a la primera sección
    setCurrentSection("basica");
    
    // 5. Limpiamos secciones completadas para empezar desde cero
    setCompletedSections([]);
  };

  const eliminarUnidad = (index: number) => setUnidades(unidades.filter((_, i) => i !== index))

  // --- ORGANIZACIONES FILTRADAS POR NIVEL ---
  // Muestra solo las organizaciones que se usan en el nivel actual;
  // si no hay asignaturas aún, muestra todas
  const organizacionesFiltradas = useMemo(() => {
    if (asignaturasDelNivel.length === 0) return organizaciones;
    const orgIdsUsados = new Set(
      asignaturasDelNivel.map((a: any) => a.organizacion_id?.toString()).filter(Boolean)
    );
    if (orgIdsUsados.size === 0) return organizaciones;
    return organizaciones.filter((org) => orgIdsUsados.has(org.id.toString()));
  }, [asignaturasDelNivel, organizaciones]);

  // --- HELPER: determina si una asignatura está completamente llena ---
  // Se considera completa si tiene al menos 1 unidad temática con nombre
  // y al menos 1 resultado de aprendizaje con texto.
  // Los prerrequisitos/correquisitos son opcionales (pueden ser "No aplica").
  const esCompleta = (asig: AsignaturaCompleta): boolean => {
    const tieneUnidad =
      Array.isArray(asig.unidades) &&
      asig.unidades.length > 0 &&
      asig.unidades.some((u) => u.unidad && u.unidad.trim() !== "");
    const tieneResultados =
      Array.isArray(asig.unidades) &&
      asig.unidades.some((u) => u.resultados && u.resultados.trim() !== "");
    return tieneUnidad && tieneResultados;
  };

  const getNombreAsignaturaPorCodigo = (codigo: string) => {
    const allAsignaturas = [...asignaturasNivelAnterior, ...asignaturasNivelActual];
    const asignatura = allAsignaturas.find((a) => a.codigo === codigo);
    return asignatura ? asignatura.nombre : codigo;
  };

  // Asignaturas incompletas → se muestran en el combo (aún necesitan ser completadas)
  const asignaturasIncompletas = useMemo(
    () => asignaturasDelNivel.filter((a) => !esCompleta(a)),
    [asignaturasDelNivel]
  );

  // Asignaturas completas → se muestran en la tabla inferior
  const asignaturasCompletas = useMemo(
    () => asignaturasDelNivel.filter((a) => esCompleta(a)),
    [asignaturasDelNivel]
  );

  // --- HANDLER: SELECCIONAR ASIGNATURA EXISTENTE DEL NIVEL ---
  const handleAsignaturaSeleccionada = (value: string) => {
    setAsignaturaSeleccionadaId(value);
    if (value === "NUEVA") {
      // Modo nueva: limpiar y desbloquear
      setDescripcion("");
      setCodigo("");
      setOrganizacion("");
      setPrerequisitos([]);
      setCorrequisitos([]);
      setUnidades([{ unidad: "", descripcion: "", resultados: "" }]);
      setCodigoBloqueado(false);
      setCodigoError("");
      setDescripcionError("");
      setEditingAsignaturaId(null);
      return;
    }
    // Modo existente: rellenar TODOS los campos con los datos guardados y bloquear código
    const asig = asignaturasDelNivel.find((a) => a.id.toString() === value);
    if (asig) {
      setDescripcion(asig.nombre);
      setCodigo(asig.codigo);
      setOrganizacion(asig.organizacion_id.toString());
      // Prerrequisitos y correquisitos
      setPrerequisitos(Array.isArray(asig.prerrequisitos_codigos) ? asig.prerrequisitos_codigos : []);
      setCorrequisitos(Array.isArray(asig.correquisitos_codigos) ? asig.correquisitos_codigos : []);
      // Unidades temáticas
      setUnidades(asig.unidades && asig.unidades.length > 0 ? asig.unidades : [{ unidad: "", descripcion: "", resultados: "" }]);
      setCodigoBloqueado(true);
      setCodigoError("");
      setDescripcionError("");
      // Tratar como edición de asignatura existente
      setEditingAsignaturaId(asig.id);
      // Marcar secciones completadas para desbloquear las siguientes
      const tieneUnidades = asig.unidades && asig.unidades.length > 0 && !!asig.unidades[0].unidad;
      const sectionsCompleted: Section[] = ["basica", "asignatura"];
      if (tieneUnidades) sectionsCompleted.push("unidades");
      setCompletedSections(sectionsCompleted);
    }
  };

  // Resetear selección de asignatura cuando cambia el nivel
  useEffect(() => {
    setAsignaturaSeleccionadaId("NUEVA");
    setCodigoBloqueado(false);
    setOrganizacion("");
    setCodigo("");
    setDescripcion("");
  }, [nivel]);

  // --- CARGA MASIVA: obtener TODAS las asignaturas de la malla (todos los niveles) ---
  const cargarTodasAsignaturasMalla = async (): Promise<(AsignaturaCompleta & { nivelNombre: string })[]> => {
    if (!carrera) return [];
    setCargandoMalla(true);
    try {
      // Pedir todas las asignaturas de la carrera en una sola llamada (sin nivel_id)
      const res = await apiRequest(`/asignaturas?carrera_id=${carrera}`);
      const items: AsignaturaCompleta[] = Array.isArray(res) ? res : (res?.data ?? []);
      
      const resultado = items.map((a: any) => ({
        ...a,
        nivelNombre: a.nivel?.ordinal || a.nivel?.nombre || a.nivel?.codigo || ""
      }));
      
      setTodasAsignaturasMalla(resultado);
      setCargandoMalla(false);
      return resultado;
    } catch (error) {
      console.error("Error al cargar la malla completa para carga masiva:", error);
      setCargandoMalla(false);
      return [];
    }
  };

  // Cargar automáticamente cuando se abre el modal
  useEffect(() => {
    if (showCargaMasivaModal) {
      setTodasAsignaturasMalla([]);
      cargarTodasAsignaturasMalla();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCargaMasivaModal, carrera]);

  // --- CARGA MASIVA: generar plantilla Excel ---
  const descargarPlantilla = async () => {
    const headers = [
      "Codigo",
      "Asignatura",
      "Nivel",
      "Prerequisito",
      "Correquisito",
    ];

    for (let i = 1; i <= 10; i++) {
      headers.push(`Unidad_${i}_Temas`);
      headers.push(`Unidad_${i}_Resultados`);
    }

    // Usar datos del estado; si aún no están, solicitarlos ahora y esperar
    let fuente: (AsignaturaCompleta & { nivelNombre?: string })[] = todasAsignaturasMalla;
    if (fuente.length === 0 && carrera) {
      fuente = await cargarTodasAsignaturasMalla();
    }
    // Último fallback: asignaturas del nivel actual
    if (fuente.length === 0) {
      fuente = asignaturasDelNivel;
    }

    // Ordenar fuente por código alfanumérico (TI01, TI02...) para que aparezcan en secuencia ascendente
    const fuenteOrdenada = [...fuente].sort((a, b) => {
      return (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true, sensitivity: 'base' });
    });

    const NUMERO_A_ORDINAL: Record<string, string> = {
      "1": "Primero", "2": "Segundo", "3": "Tercero", "4": "Cuarto", "5": "Quinto",
      "6": "Sexto", "7": "Séptimo", "8": "Octavo", "9": "Noveno", "10": "Décimo",
    };

    const getNombresFromCodigos = (codigos: string[] | undefined) => {
      if (!codigos || codigos.length === 0) return "No aplica";
      return codigos.map((codigo) => {
        const asig = fuente.find((as) => as.codigo === codigo);
        return asig ? asig.nombre : codigo;
      }).join(", ");
    };

    const rows = fuenteOrdenada.map((a) => {
      const nivelEnEstado = niveles.find(n => n.id === a.nivel_id);
      let nivelRaw = nivelEnEstado?.ordinal || nivelEnEstado?.nombre || (a as any).nivelNombre || (a as any).nivel?.ordinal || (a as any).nivel?.nombre || (a as any).nivel?.codigo || "";
      let nivelFormateado = NUMERO_A_ORDINAL[nivelRaw.toString().trim()] || nivelRaw;
      
      if (typeof nivelFormateado === 'string' && nivelFormateado.length > 0 && !NUMERO_A_ORDINAL[nivelRaw.toString().trim()]) {
         nivelFormateado = nivelFormateado.charAt(0).toUpperCase() + nivelFormateado.slice(1).toLowerCase();
      }

      const baseRow: any = {
        Codigo: a.codigo,
        Asignatura: a.nombre,
        Nivel: nivelFormateado,
        Prerequisito: getNombresFromCodigos(a.prerrequisitos_codigos),
        Correquisito: getNombresFromCodigos(a.correquisitos_codigos),
      };

      for (let i = 1; i <= 10; i++) {
        baseRow[`Unidad_${i}_Temas`] = a.unidades?.[i - 1]?.descripcion || "";
        baseRow[`Unidad_${i}_Resultados`] = a.unidades?.[i - 1]?.resultados || "";
      }

      return baseRow;
    });

    // Si no hay datos reales, mostrar fila de ejemplo para guiar al usuario
    if (rows.length === 0) {
      const demoRow: any = {
        Codigo: "EJ001",
        Asignatura: "Ejemplo Asignatura",
        Nivel: "Primero",
        Prerequisito: "No aplica",
        Correquisito: "No aplica",
      };
      for (let i = 1; i <= 10; i++) {
        demoRow[`Unidad_${i}_Temas`] = i === 1 ? "Temas de la unidad 1" : "";
        demoRow[`Unidad_${i}_Resultados`] = i === 1 ? "El estudiante puede..." : "";
      }
      rows.push(demoRow);
    }

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 22) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unidades y Resultados");
    XLSX.writeFile(wb, `plantilla_${codigoMallaActual || "malla"}_unidades_resultados.xlsx`);
  };

  // --- CARGA MASIVA: leer archivo cargado ---
  const handleCargaMasivaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCargaMasivaError("");
    setCargaMasivaPreview([]);
    const file = e.target.files?.[0];
    if (!file) return;
    setCargaMasivaFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) {
          setCargaMasivaError("El archivo está vacío o no tiene el formato correcto.");
          return;
        }
        setCargaMasivaPreview(rows);
      } catch {
        setCargaMasivaError("No se pudo leer el archivo. Asegúrese de usar .xlsx o .xls.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- CARGA MASIVA: importar filas al backend ---
  const handleImportarCargaMasiva = async () => {
    if (cargaMasivaPreview.length === 0) return;
    setIsCargando(true);
    let exitosos = 0;
    let errores = 0;
    
    const fuenteAsignaturas = todasAsignaturasMalla.length > 0 ? todasAsignaturasMalla : asignaturasDelNivel;

    for (const row of cargaMasivaPreview) {
      try {
        const asig = fuenteAsignaturas.find(
          (a) => a.codigo?.toString().trim().toLowerCase() === row["Codigo"]?.toString().trim().toLowerCase()
        );
        if (!asig) { 
          console.warn(`Asignatura no encontrada para el código: ${row["Codigo"]}`);
          errores++; 
          continue; 
        }

        // Construir unidades desde las columnas (hasta 10)
        const unidades: UnidadData[] = [];
        for (let i = 1; i <= 10; i++) {
          const descripcion = row[`Unidad_${i}_Temas`]?.toString().trim() || "";
          const resultados = row[`Unidad_${i}_Resultados`]?.toString().trim() || "";
          if (descripcion || resultados) {
            unidades.push({
              unidad: row[`Unidad_${i}_Nombre`]?.toString().trim() || `Unidad ${i}`,
              descripcion: descripcion,
              resultados: resultados,
            });
          }
        }

        // Función para resolver prerrequisitos/correquisitos (convirtiendo nombres a códigos si el usuario escribió el nombre)
        // Si el valor es "No aplica" o está vacío, retorna null para indicar "sin cambio"
        const resolverCodigos = (inputVal: string | undefined): string[] | null => {
          if (!inputVal || inputVal.trim().toLowerCase() === "no aplica") return null; // null = no cambiar
          const items = inputVal.split(",").map(s => s.trim()).filter(Boolean);
          const codigosFinales: string[] = [];
          for (const item of items) {
            // 1. Buscar si coincide directamente con algún código
            let coincidencia = fuenteAsignaturas.find(a => a.codigo?.toLowerCase() === item.toLowerCase());
            // 2. Si no es un código, buscar si coincide con el nombre de la asignatura
            if (!coincidencia) {
              coincidencia = fuenteAsignaturas.find(a => a.nombre?.toLowerCase() === item.toLowerCase());
            }
            // 3. Añadir el código si se encontró, o mantener el texto original para que el backend lance el error exacto
            codigosFinales.push(coincidencia?.codigo ? coincidencia.codigo : item);
          }
          return codigosFinales;
        };

        // Si el Excel dice "No aplica", preservar los valores existentes en la BD (no borrarlos)
        const prereqDelExcel = resolverCodigos(row["Prerequisito"]?.toString());
        const correqDelExcel = resolverCodigos(row["Correquisito"]?.toString());
        const prereqCodigos = prereqDelExcel !== null ? prereqDelExcel : (Array.isArray(asig.prerrequisitos_codigos) ? asig.prerrequisitos_codigos : []);
        const correqCodigos = correqDelExcel !== null ? correqDelExcel : (Array.isArray(asig.correquisitos_codigos) ? asig.correquisitos_codigos : []);

        // Guardar asignatura (PUT) SOLO si el Excel especificó nuevos prereqs/correqs
        // Si ambos son null (== "No aplica"), no hay nada que actualizar → saltar el PUT
        // para evitar cualquier riesgo de borrar accidentalmente los requisitos existentes
        const requisitosCambiaron = prereqDelExcel !== null || correqDelExcel !== null;
        if (requisitosCambiaron) {
          await apiRequest(`/asignaturas/${asig.id}`, {
            method: "PUT",
            body: JSON.stringify({
              nombre: asig.nombre,
              codigo: asig.codigo,
              carrera_id: asig.carrera_id,
              nivel_id: asig.nivel_id,
              organizacion_id: asig.organizacion_id,
              prerrequisitos_codigos: prereqCodigos,
              correquisitos_codigos: correqCodigos,
            }),
          });
        }


        // Guardar horas (POST) SOLO si el Excel tiene columnas de horas definidas
        // La plantilla de "Unidades y Resultados" NO tiene estas columnas, por lo que
        // si están ausentes, se saltan para no sobreescribir los valores existentes con 0
        const tieneColumnasHoras = (
          row["Docencia"] !== undefined ||
          row["Practica"] !== undefined ||
          row["Autonoma"] !== undefined ||
          row["Vinculacion"] !== undefined ||
          row["Preprofesionales"] !== undefined
        );
        if (tieneColumnasHoras) {
          await apiRequest(`/asignaturas/${asig.id}/horas`, {
            method: "POST",
            body: JSON.stringify({
              horasDocencia: parseInt(row["Docencia"]?.toString() || "0"),
              horasPractica: parseInt(row["Practica"]?.toString() || "0"),
              horasAutonoma: parseInt(row["Autonoma"]?.toString() || "0"),
              horasVinculacion: parseInt(row["Vinculacion"]?.toString() || "0"),
              horasPracticaPreprofesional: parseInt(row["Preprofesionales"]?.toString() || "0"),
            }),
          });
        }


        // Guardar unidades (POST) solo si se definieron en el Excel
        if (unidades.length > 0) {
          await apiRequest(`/asignaturas/${asig.id}/unidades`, {
            method: "POST",
            body: JSON.stringify({ unidades }),
          });
        }

        exitosos++;
      } catch (err) {
        console.error(`Error al procesar la fila de la asignatura ${row["Codigo"] || "desconocida"}:`, err);
        errores++;
      }
    }
    setIsCargando(false);
    await cargarAsignaturas();
    setShowCargaMasivaModal(false);
    setCargaMasivaFile(null);
    setCargaMasivaPreview([]);
    toast({
      title: "Importación completada",
      description: `${exitosos} asignatura(s) importadas correctamente. ${errores > 0 ? `${errores} con error.` : ""}`,
    });
  };



  // --- RENDERIZADO JSX ---
  return (
    <>
      <MallaModal
        open={showMallaModal}
        onClose={() => setShowMallaModal(false)}
        onMallaSelected={handleMallaSelected}
        onPersonalizada={undefined}
      />

      {/* ========== MODAL CARGA MASIVA ========== */}
      {showCargaMasivaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Unidades y Resultados — Carga Masiva</h2>
                  <p className="text-sm text-gray-500">Descargue la plantilla, complétela y cárguela para importar datos.</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCargaMasivaModal(false); setCargaMasivaFile(null); setCargaMasivaPreview([]); setCargaMasivaError(""); }}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* Paso 1: Descargar plantilla */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700 mb-2">Paso 1 — Descargue la plantilla Excel</p>
                <p className="text-xs text-gray-500 mb-3">
                  La plantilla incluye: <strong>Nivel, Código, Asignatura, Prerrequisito, Correquisito, Unidad 1-3 (Nombre, Temas y Resultados)</strong> con la información ya almacenada.
                  {cargandoMalla ? (
                    <span className="ml-1 text-amber-600 font-medium">⏳ Cargando datos de la malla...</span>
                  ) : todasAsignaturasMalla.length > 0 ? (
                    <span className="ml-1 text-[#00563F] font-medium">
                      ✅ {todasAsignaturasMalla.length} asignatura(s) encontradas en todos los niveles de la malla.
                    </span>
                  ) : asignaturasDelNivel.length > 0 ? (
                    <span className="ml-1 text-[#00563F] font-medium">
                      Se exportarán las {asignaturasDelNivel.length} asignatura(s) del nivel seleccionado.
                    </span>
                  ) : null}
                </p>
                <button
                  onClick={descargarPlantilla}
                  disabled={cargandoMalla}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#00563F] text-white text-sm font-medium hover:bg-[#00563F]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cargandoMalla
                    ? <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Cargando...</>
                    : "⬇️ Descargar plantilla (.xlsx)"}
                </button>
              </div>

              {/* Paso 2: Cargar archivo */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-sm font-semibold text-gray-700 mb-1">Paso 2 — Cargue el archivo completado</p>
                <p className="text-xs text-gray-400 mb-4">Formatos aceptados: .xlsx, .xls</p>
                <div className="flex flex-col items-center gap-3">
                  <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4" />
                  </svg>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleCargaMasivaFile}
                    className="hidden"
                    id="cm-file-input"
                  />
                  <label
                    htmlFor="cm-file-input"
                    className="cursor-pointer px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition"
                  >
                    {cargaMasivaFile ? cargaMasivaFile.name : "Seleccionar archivo"}
                  </label>
                  {cargaMasivaError && (
                    <p className="text-sm text-red-600">{cargaMasivaError}</p>
                  )}
                </div>
              </div>

              {/* Previsualización */}
              {cargaMasivaPreview.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Vista previa ({cargaMasivaPreview.length} fila(s))</p>
                  <div className="overflow-x-auto overflow-y-auto border rounded-lg max-h-64">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {Object.keys(cargaMasivaPreview[0]).map((k) => (
                            <th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cargaMasivaPreview.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            {Object.values(row).map((v: any, j) => (
                              <td key={j} className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{v?.toString() || "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => { setShowCargaMasivaModal(false); setCargaMasivaFile(null); setCargaMasivaPreview([]); setCargaMasivaError(""); }}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportarCargaMasiva}
                disabled={cargaMasivaPreview.length === 0 || isCargando}
                className="px-5 py-2 rounded-md bg-[#00563F] text-white text-sm font-semibold hover:bg-[#00563F]/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {isCargando && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Importar Unidades y Resultados
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Código de Malla Banner — se oculta cuando se activa modo personalizado */}
        {mallaSeleccionada && !isPersonalizada && (
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMallaModal(true)}
                    className="border-emerald-300"
                  >
                    Cambiar Malla
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePersonalizadaSelected}
                    className="bg-[#00563F] hover:bg-[#00563F]/90 text-white"
                  >
                    Personalizada
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-[#00563F] hover:bg-[#00563F]/90 text-white"
                    onClick={() => { setShowCargaMasivaModal(true); cargarTodasAsignaturasMalla(); }}
                  >
                    Carga Masiva
                  </Button>
                </div>
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
        {(["basica", "asignatura", "unidades"] as Section[]).map((section) => (
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
                      <Label htmlFor="facultad">
                        Facultad{" "}
                        {mallaSeleccionada && (
                          <span className="text-xs text-gray-500">(bloqueado por malla)</span>
                        )}
                      </Label>
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
                      <Label htmlFor="carrera">
                        Carrera{" "}
                        {mallaSeleccionada && (
                          <span className="text-xs text-gray-500">(bloqueado por malla)</span>
                        )}
                      </Label>
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
                          {niveles.map((n) => {
                            const ordinalMap: Record<string, string> = {
                              "1": "Primero", "2": "Segundo", "3": "Tercero", "4": "Cuarto", "5": "Quinto",
                              "6": "Sexto", "7": "Séptimo", "8": "Octavo", "9": "Noveno", "10": "Décimo",
                            };
                            let label = n.ordinal || n.nombre;
                            if (ordinalMap[label?.toString().trim()]) {
                              label = ordinalMap[label.toString().trim()];
                            } else if (typeof label === 'string' && label.length > 0) {
                              label = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
                            }
                            return (
                              <SelectItem key={n.id} value={n.id.toString()}>
                                {label}
                              </SelectItem>
                            );
                          })}
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
                {/* Selector de asignatura existente + input para nueva */}
                <div className="space-y-2">
                  <Label>Asignatura</Label>
                  <Select value={asignaturaSeleccionadaId} onValueChange={handleAsignaturaSeleccionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una asignatura o registre nueva" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NUEVA">✏️ Nueva asignatura (ingresar manualmente)</SelectItem>
                      {asignaturasIncompletas.length === 0 && asignaturasDelNivel.length > 0 && (
                        <SelectItem value="__NONE__" disabled>
                          — Todas las asignaturas ya están completas —
                        </SelectItem>
                      )}
                      {asignaturasIncompletas.map((asig) => (
                        <SelectItem key={asig.id} value={asig.id.toString()}>
                          {asig.nombre} — {asig.codigo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {asignaturaSeleccionadaId === "NUEVA" && (
                    <>
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
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-1">
                        <Label htmlFor="organizacion">
                          Unidad de Organización Curricular
                          {asignaturasDelNivel.length > 0 && (
                            <span className="text-xs text-gray-500 ml-1">(filtrado por nivel)</span>
                          )}
                        </Label>
                        <Select value={organizacion} onValueChange={setOrganizacion}>
                            <SelectTrigger><SelectValue placeholder="Seleccione unidad" /></SelectTrigger>
                            <SelectContent>
                                {organizacionesFiltradas.map((org) => (
                                    <SelectItem key={org.id} value={org.id.toString()}>
                                        {org.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="codigo">
                          Código
                          {codigoBloqueado && (
                            <span className="text-xs text-gray-500 ml-1">(bloqueado)</span>
                          )}
                        </Label>
                        <Input
                            id="codigo"
                            value={codigo}
                            onChange={(e) => handleCodigoChange(e.target.value)}
                            placeholder="Código de Asignatura"
                            disabled={codigoBloqueado}
                            className={`${codigoError ? "border-red-500 focus:border-red-500" : ""} ${codigoBloqueado ? "bg-gray-100 cursor-not-allowed opacity-70" : ""}`}
                        />
                        {codigoError && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-md">
                                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800">{codigoError}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PRERREQUISITOS */}
                  <div className="space-y-2">
                    <Label>Prerrequisito</Label>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && val !== "NINGUNO" && !prerequisitos.includes(val)) {
                          setPrerequisitos([...prerequisitos, val]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={prerequisitos.length === 0 ? "No aplica" : "Agregar otro..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NINGUNO">— No aplica —</SelectItem>
                        {asignaturasNivelAnterior
                          .filter((asig) => !prerequisitos.includes(asig.codigo))
                          .map((asig) => (
                            <SelectItem key={asig.id} value={asig.codigo}>
                              {asig.nombre} ({asig.codigo})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {prerequisitos.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {prerequisitos.map((cod) => {
                          const asig = asignaturasNivelAnterior.find((a) => a.codigo === cod);
                          return (
                            <div key={cod} className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-2 py-1 rounded-full">
                              <span>{asig ? `${asig.nombre} (${cod})` : cod}</span>
                              <button
                                type="button"
                                onClick={() => setPrerequisitos(prerequisitos.filter((c) => c !== cod))}
                                className="ml-1 text-emerald-500 hover:text-red-600 font-bold leading-none"
                                title="Eliminar"
                              >×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CORREQUISITOS */}
                  <div className="space-y-2">
                    <Label>Correquisito</Label>
                    <Select
                      value=""
                      onValueChange={(val) => {
                        if (val && val !== "NINGUNO" && !correquisitos.includes(val)) {
                          setCorrequisitos([...correquisitos, val]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={correquisitos.length === 0 ? "No aplica" : "Agregar otro..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NINGUNO">— No aplica —</SelectItem>
                        {asignaturasNivelActual
                          .filter((asig) => asig.codigo !== codigo && !correquisitos.includes(asig.codigo))
                          .map((asig) => (
                            <SelectItem key={asig.id} value={asig.codigo}>
                              {asig.nombre} ({asig.codigo})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {correquisitos.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {correquisitos.map((cod) => {
                          const asig = asignaturasNivelActual.find((a) => a.codigo === cod);
                          return (
                            <div key={cod} className="flex items-center gap-1 bg-blue-50 border border-blue-300 text-blue-800 text-xs px-2 py-1 rounded-full">
                              <span>{asig ? `${asig.nombre} (${cod})` : cod}</span>
                              <button
                                type="button"
                                onClick={() => setCorrequisitos(correquisitos.filter((c) => c !== cod))}
                                className="ml-1 text-blue-500 hover:text-red-600 font-bold leading-none"
                                title="Eliminar"
                              >×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
          id="unidades"
          className={`transition-all duration-300 ${!isSectionUnlocked("unidades") ? "opacity-50" : ""} ${currentSection === 'unidades' && !isSectionCompleted('unidades') ? 'border-2 border-[#FDB71A]' : ''}`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSectionCompleted("unidades") ? ( <CheckCircle2 className="h-6 w-6 text-[#00563F]" /> ) : !isSectionUnlocked("unidades") ? ( <Lock className="h-6 w-6 text-gray-400" /> ) : ( <div className="h-6 w-6 rounded-full border-2 border-[#FDB71A]" /> )}
                <div>
                  <CardTitle>3. Unidades Temáticas y Resultados</CardTitle>
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
        <h2 className="text-2xl font-bold text-[#00563F]">Asignaturas Registradas</h2>
        <p className="text-muted-foreground mb-4">
            Lista de asignaturas registradas en el nivel seleccionado.
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
                <p className="text-muted-foreground">
                  No hay asignaturas registradas para este nivel.
                </p>
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
                                    <TableHead className="text-center">Prerrequisitos</TableHead>
                                    <TableHead className="text-center">Correquisitos</TableHead>
                                    <TableHead>Unidades Temáticas</TableHead>
                                    <TableHead>Resultados de Aprendizaje</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead>Opciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {asignaturasDelNivel.map((asig) => {
                                    const unidadesFiltradas = asig.unidades && asig.unidades.length > 0 ? asig.unidades.filter(u => u.unidad) : [];
                                    return (
                                        <TableRow key={asig.id}>
                                            <TableCell className="font-semibold text-[#00563F] align-middle">{asig.codigo}</TableCell>
                                            <TableCell className="font-medium align-middle">{asig.nombre}</TableCell>

                                            {/* Prerrequisitos: "No aplica" si vacío */}
                                            <TableCell className="text-sm align-middle text-center">
                                              {asig.prerrequisitos_codigos && asig.prerrequisitos_codigos.length > 0
                                                ? asig.prerrequisitos_codigos.map((cod, i) => (
                                                    <div key={i}>{getNombreAsignaturaPorCodigo(cod)}</div>
                                                  ))
                                                : <span className="text-gray-400 italic">No aplica</span>}
                                            </TableCell>

                                            {/* Correquisitos: "No aplica" si vacío */}
                                            <TableCell className="text-sm align-middle text-center">
                                              {asig.correquisitos_codigos && asig.correquisitos_codigos.length > 0
                                                ? asig.correquisitos_codigos.map((cod, i) => (
                                                    <div key={i}>{getNombreAsignaturaPorCodigo(cod)}</div>
                                                  ))
                                                : <span className="text-gray-400 italic">No aplica</span>}
                                            </TableCell>

                                            {/* Unidades: nombre + temas (descripción) */}
                                            <TableCell className="align-top w-64 min-w-[16rem] pr-6">
                                              <div className="space-y-3">
                                                {unidadesFiltradas.length > 0 ? unidadesFiltradas.map((u, i) => (
                                                  <div key={i}>
                                                    <div className="text-sm font-semibold text-[#00563F]">
                                                      {i + 1}. {u.unidad}
                                                    </div>
                                                    {u.descripcion && (
                                                      <div className="text-xs text-gray-600 mt-0.5 ml-3 leading-snug">
                                                        {u.descripcion}
                                                      </div>
                                                    )}
                                                  </div>
                                                )) : <span className="italic text-gray-400">Sin unidades</span>}
                                              </div>
                                            </TableCell>

                                            {/* Resultados: uno por unidad */}
                                            <TableCell className="align-top w-64 min-w-[16rem] pr-6">
                                              <div className="space-y-3">
                                                {unidadesFiltradas.length > 0 ? unidadesFiltradas.map((u, i) => (
                                                  <div key={i} className="text-sm text-gray-700">
                                                    <span className="font-semibold text-[#00563F]">{i + 1}.</span>{" "}
                                                    {u.resultados || <span className="italic text-gray-400">—</span>}
                                                  </div>
                                                )) : <span className="italic text-gray-400">Sin resultados</span>}
                                              </div>
                                            </TableCell>

                                            {/* Estado */}
                                            <TableCell className="align-middle text-center">
                                              {esCompleta(asig) ? (
                                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">Completa</span>
                                              ) : (
                                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full whitespace-nowrap">Incompleta</span>
                                              )}
                                            </TableCell>

                                            {/* Columna Opciones: centrada horizontal y verticalmente */}
                                            <TableCell className="align-middle text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(asig)} title="Editar">
                                                  <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(asig.id)} title="Eliminar">
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