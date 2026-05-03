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
import ModoRegistroModal from "@/components/malla/modo-registro-modal"
import ExcelAsignaturasImport, { type AsignaturaImportada } from "@/components/malla/excel-asignaturas-import"

type Section = "basica" | "asignatura" | "horas" | "unidades"

function useToast() {
  return {
    toast: (props: { title: string; description: string; variant?: string }) => {
      alert(props.variant === "destructive" ? `Error: ${props.description}` : `${props.title}: ${props.description}`);
    }
  };
}

function nivelToOrdinalShort(nivel: Nivel | null | undefined) {
  if (!nivel) return "";
  return nivel.ordinal?.toString().trim() || nivel.nombre?.toString().trim() || nivel.codigo?.toString().trim() || "";
}

// --- INTERFACES (SIN CAMBIOS) ---
interface Facultad { id: number; nombre: string; }
interface Carrera { id: number; nombre: string; facultad_id: number; }
interface Nivel { id: number; nombre: string; codigo: string; ordinal?: string | null; romano?: string | null; }
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
  const [showMallaModal, setShowMallaModal] = useState(false);
  const [codigoMallaActual, setCodigoMallaActual] = useState("");
  const [mallaSeleccionada, setMallaSeleccionada] = useState(false);
  const [registroCompletado, setRegistroCompletado] = useState(false);

  // --- ESTADOS PARA MODO DE REGISTRO ---
  const [mostrarModoRegistro, setMostrarModoRegistro] = useState(false);
  const [modoRegistroActual, setModoRegistroActual] = useState<"personalizada" | "masiva" | null>(null);
  const [mostrarImportExcel, setMostrarImportExcel] = useState(false);

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
    
    // Mostrar modal para seleccionar modo de registro
    setMostrarModoRegistro(true);
  };

  // Limpieza por sección para modo personalizada
  const limpiarBasica = () => {
    setNivel("");
  };
  const limpiarAsignatura = () => {
    setOrganizacion("");
    setCodigo("");
    setDescripcion("");
    setAdscrCedDE("");
    setAdscrCedCODE("");
    setCodigoError("");
    setDescripcionError("");
  };
  const limpiarHoras = () => {
    setHorasDocencia("");
    setHorasPractica("");
    setHorasAutonoma("");
    setHorasVinculacion("");
    setHorasPracticaPreprofesional("");
  };
  const limpiarUnidades = () => {
    setUnidades([{ unidad: "", descripcion: "", resultados: "" }]);
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
    setShowMallaModal(false);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSectionCompleted = (section: Section) => completedSections.includes(section)
  const isSectionUnlocked = (section: Section) => {
    // Si NO es personalizada (p.ej. carga masiva), bloquear las secciones del formulario.
    // Permitimos desbloqueo solo cuando se está editando una asignatura existente.
    if (modoRegistroActual !== "personalizada") {
      return !!editingAsignaturaId
    }

    if (section === "basica") {
      return true
    }

    const sections: Section[] = ["basica", "asignatura", "horas"]
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
          if(response) {
            toast({ title: "Éxito", description: response.message });
            await cargarAsignaturas();
            setRegistroCompletado(true);
          }
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
        const sections: Section[] = ["basica", "asignatura", "horas"];
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
      <ModoRegistroModal
        open={mostrarModoRegistro}
        onClose={() => setMostrarModoRegistro(false)}
        onModoSelected={(modo: "personalizada" | "masiva") => {
          setModoRegistroActual(modo);
          if (modo === "masiva") {
            setMostrarImportExcel(true);
          } else {
            setCurrentSection("basica");
          }
          setMostrarModoRegistro(false);
        }}
        codigoMalla={codigoMallaActual}
      />

      <ExcelAsignaturasImport
        open={mostrarImportExcel}
        onClose={() => setMostrarImportExcel(false)}
        facultades={facultades}
        carreras={carreras}
        facultadValue={facultad}
        carreraValue={carrera}
        onFacultadChange={(value) => {
          setFacultad(value)
          setCarrera("")
        }}
        onCarreraChange={setCarrera}
        onRequestTemplateRows={async () => {
          if (!facultad || !carrera) return []

          const carreraSeleccionada = carreras.find((c) => c.id.toString() === carrera)
          if (!carreraSeleccionada || carreraSeleccionada.facultad_id.toString() !== facultad) {
            return []
          }

          let data: AsignaturaCompleta[] = []
          try {
            const responseAsignaturas = await apiRequest(`/asignaturas?carrera_id=${carrera}`)
            data = responseAsignaturas?.data || []
          } catch (error) {
            console.warn("No se pudieron obtener asignaturas para la plantilla dinámica:", error)
            return []
          }

          return data.map((asig) => {
            const nivelObj = niveles.find((n) => n.id === asig.nivel_id)
            const organizacionObj = organizaciones.find((o) => o.id === asig.organizacion_id)

            return {
              Código: asig.codigo || "",
              Asignatura: asig.nombre || "",
              Nivel: nivelObj?.codigo || nivelToOrdinalShort(nivelObj) || "",
              "Unidad de Organización": organizacionObj?.nombre || "",
              "Horas Docencia": asig.horas?.horasDocencia ?? 0,
              "Horas Práctica": asig.horas?.horasPractica ?? 0,
              "Horas Autónoma": asig.horas?.horasAutonoma ?? 0,
              "Horas Vinculación": asig.horas?.horasVinculacion ?? 0,
              "Horas Práctica Preprofesional": asig.horas?.horasPracticaPreprofesional ?? 0,
            }
          })
        }}
        onImport={async (rows: AsignaturaImportada[]) => {
          setIsSaving(true)
          try {
            console.log("Iniciando importación masiva...", rows)

            const carreraId = parseInt(carrera, 10)
            if (isNaN(carreraId)) {
              throw new Error("Por favor, seleccione una carrera válida antes de importar.")
            }

            const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase()
            const parseExcelNumber = (value: unknown) => {
              const raw = String(value ?? "").trim()
              if (!raw) return 0
              const number = Number.parseFloat(raw.replace(",", "."))
              return Number.isFinite(number) ? number : 0
            }

            // Cache de asignaturas existentes por nivel usando el endpoint que ya funciona
            const existentesPorCodigo = new Map<string, AsignaturaCompleta>()
            const nivelesCargados = new Set<number>()

            const ensureExistentesNivel = async (nivelId: number) => {
              if (nivelesCargados.has(nivelId)) return

              const response = await apiRequest(`/asignaturas?nivel_id=${nivelId}&carrera_id=${carreraId}`)
              const list = Array.isArray(response?.data) ? (response.data as any[]) : []

              for (const item of list) {
                if (!item || typeof item !== "object") continue
                const codigoItem = String((item as any).codigo ?? "").trim()
                const idItem = (item as any).id
                if (!codigoItem || typeof idItem !== "number") continue
                existentesPorCodigo.set(codigoItem, item as AsignaturaCompleta)
              }

              nivelesCargados.add(nivelId)
            }

            let creadas = 0
            let actualizadas = 0
            const errores: string[] = []

            for (const row of rows) {
              const codigoNormalizado = String(row["Código"] ?? "").trim()
              if (!codigoNormalizado) continue

              const nivelExcel = String(row["Nivel"] ?? "").trim()
              const organizacionExcel = String(row["Unidad de Organización"] ?? "").trim()
              const nombreExcel = String(row["Asignatura"] ?? "").trim()

              const nivelNorm = normalizeText(nivelExcel)
              const nivelEncontrado = niveles.find((n) => {
                const candidates = [n.ordinal, n.nombre, n.codigo, n.romano]
                  .filter((v) => v !== undefined && v !== null)
                  .map((v) => normalizeText(v))
                return candidates.includes(nivelNorm)
              })

              if (!nivelEncontrado) {
                errores.push(`Código ${codigoNormalizado}: No se encontró el nivel '${nivelExcel}'.`)
                continue
              }

              const orgNorm = normalizeText(organizacionExcel)
              const organizacionEncontrada = organizaciones.find(
                (o) => normalizeText(o.nombre) === orgNorm
              )
              if (!organizacionEncontrada) {
                errores.push(
                  `Código ${codigoNormalizado}: No se encontró la organización curricular '${organizacionExcel}'.`
                )
                continue
              }

              const dataPayload = {
                carrera_id: carreraId,
                nivel_id: nivelEncontrado.id,
                organizacion_id: organizacionEncontrada.id,
                codigo: codigoNormalizado,
                nombre: nombreExcel,
              }

              // Backend: las horas se guardan en /asignaturas/:id/horas (tabla asignatura_horas)
              const horasPayload = {
                horasDocencia: parseExcelNumber(row["Horas Docencia"]),
                horasPractica: parseExcelNumber(row["Horas Práctica"]),
                horasAutonoma: parseExcelNumber(row["Horas Autónoma"]),
                horasVinculacion: parseExcelNumber(row["Horas Vinculación"]),
                horasPracticaPreprofesional: parseExcelNumber(row["Horas Práctica Preprofesional"]),
              }

              try {
                await ensureExistentesNivel(nivelEncontrado.id)
                const existente = existentesPorCodigo.get(codigoNormalizado)

                if (existente) {
                  await apiRequest(`/asignaturas/${existente.id}`, {
                    method: "PUT",
                    body: JSON.stringify(dataPayload),
                  })

                  await apiRequest(`/asignaturas/${existente.id}/horas`, {
                    method: "POST",
                    body: JSON.stringify(horasPayload),
                  })

                  actualizadas += 1
                } else {
                  const created = await apiRequest("/asignaturas", {
                    method: "POST",
                    body: JSON.stringify(dataPayload),
                  })

                  const createdId = created?.data?.id || created?.id;
                  if (!createdId) {
                    throw new Error("No se pudo obtener el ID de la asignatura creada para guardar las horas.")
                  }

                  await apiRequest(`/asignaturas/${createdId}/horas`, {
                    method: "POST",
                    body: JSON.stringify(horasPayload),
                  })

                  creadas += 1
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Error desconocido"
                errores.push(`Código ${codigoNormalizado}: ${errorMessage}`)
              }
            }

            if (errores.length > 0) {
              // Lanzar error para que el modal NO se cierre y muestre el detalle
              throw new Error(errores.join("\n"))
            }

            await cargarAsignaturas()

            toast({
              title: "Éxito",
              description: `Información cargada correctamente. Creadas: ${creadas}, Actualizadas: ${actualizadas}.`,
            })
          } finally {
            setIsSaving(false)
          }
        }}
        codigoMalla={codigoMallaActual}
        facultadId={facultad ? parseInt(facultad) : undefined}
        carreraId={carrera ? parseInt(carrera) : undefined}
      />

      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Código de Malla Banner */}
        {mallaSeleccionada && (
          <Card className="mb-6 border-2 border-emerald-500 bg-emerald-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <BookOpen className="h-6 w-6 text-emerald-700 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-emerald-900">
                      Código de Malla: {codigoMallaActual}
                    </h3>
                    <p className="text-sm text-emerald-700">
                      {modoRegistroActual === "masiva" ? "Modo: Carga Masiva desde Excel" : "Modo: Registro Personalizado"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-[#00563F]">
                  {editingAsignaturaId ? "Editando Asignatura" : "Registro de Asignatura"}
              </h1>
              <p className="text-muted-foreground mt-2">
                  {editingAsignaturaId ? "Modifique los datos necesarios y guarde cada sección." : "Complete cada sección para registrar una nueva asignatura en la malla curricular."}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                variant={modoRegistroActual === "personalizada" ? "default" : "outline"}
                onClick={() => {
                  setModoRegistroActual("personalizada")
                  setCurrentSection("basica")
                }}
                className={modoRegistroActual === "personalizada" ? "bg-[#00563F] hover:bg-[#004836]" : "border-[#00563F] text-[#00563F]"}
              >
                Personalizada
              </Button>
              <Button
                variant={modoRegistroActual === "masiva" ? "default" : "outline"}
                onClick={() => {
                  setModoRegistroActual("masiva")
                  setMostrarImportExcel(true)
                }}
                className={modoRegistroActual === "masiva" ? "bg-emerald-600 hover:bg-emerald-700" : "border-emerald-600 text-emerald-700"}
              >
                Carga Masiva
              </Button>
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
      </div>

      {/* ... (El resto de tu código JSX permanece igual) ... */}
      
       <div className="mb-8 flex gap-2">
        {(["basica", "asignatura", "horas"] as Section[]).map((section) => (
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
                      <Select value={facultad} onValueChange={setFacultad}>
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
                      <Select value={carrera} onValueChange={setCarrera} disabled={!facultad || carrerasFiltradas.length === 0}>
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
                              {nivelToOrdinalShort(n)}
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
                      onClick={() => {
                        if (modoRegistroActual === "personalizada") {
                          limpiarBasica();
                        } else {
                          resetForm();
                        }
                      }}
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
                  <CardDescription>Unidad de Organización Curricular, Código y Asignatura</CardDescription>
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
                      disabled={!!editingAsignaturaId}
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
              
                <div className="flex gap-3">
                  <Button onClick={() => handleSaveSection("asignatura")} className="bg-[#00563F] hover:bg-[#00563F]/90" disabled={!organizacion || !codigo || !descripcion || isSaving}>
                    {isSaving && currentSection === 'asignatura' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continuar a Distribución de Horas
                  </Button>
                  <Button
                    onClick={() => {
                      if (modoRegistroActual === "personalizada") {
                        limpiarAsignatura();
                      } else {
                        resetForm();
                      }
                    }}
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
                  <CardDescription>Horas de Docencia, Práctica Experimentales, Autónoma, Vinculación y Práctica Preprofesionales</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isSectionUnlocked("horas") ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horas-docencia">Horas de Docencia</Label>
                    <Input id="horas-docencia" type="number" value={horasDocencia} onChange={(e) => setHorasDocencia(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horas-practica">Horas de Práctica Experimentales</Label>
                    <Input id="horas-practica" type="number" value={horasPractica} onChange={(e) => setHorasPractica(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horas-autonoma">Horas Autónoma</Label>
                    <Input id="horas-autonoma" type="number" value={horasAutonoma} onChange={(e) => setHorasAutonoma(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horas-vinculacion">Horas de Vinculación</Label>
                    <Input id="horas-vinculacion" type="number" value={horasVinculacion} onChange={(e) => setHorasVinculacion(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horas-preprof">Horas de Práctica Preprofesionales</Label>
                    <Input id="horas-preprof" type="number" value={horasPracticaPreprofesional} onChange={(e) => setHorasPracticaPreprofesional(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Total de Horas</Label>
                    <div className="h-10 flex items-center px-3 border rounded-md bg-muted font-semibold">{totalHoras}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => handleSaveSection("horas")} className="bg-[#00563F] hover:bg-[#00563F]/90" disabled={isSaving}>
                    {isSaving && currentSection === 'horas' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Asignatura
                  </Button>
                  <Button
                    onClick={() => {
                      if (modoRegistroActual === "personalizada") {
                        limpiarHoras();
                      } else {
                        resetForm();
                      }
                    }}
                    variant="outline"
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Complete la sección anterior para desbloquear</p>
            )}
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
                                  <TableHead>Nivel</TableHead>
                                  <TableHead>Organización</TableHead>
                                  <TableHead>H. Docencia</TableHead>
                                  <TableHead>H. Práctica</TableHead>
                                  <TableHead>H. Autónoma</TableHead>
                                  <TableHead>H. Vinculación</TableHead>
                                  <TableHead>H. Práctica Pre.</TableHead>
                                  <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {[...asignaturasDelNivel]
                              .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: "base" }))
                              .map((asig) => {
                              const totalHoras = 
                                (asig.horas?.horasDocencia ?? 0) +
                                (asig.horas?.horasPractica ?? 0) +
                                (asig.horas?.horasAutonoma ?? 0) +
                                (asig.horas?.horasVinculacion ?? 0) +
                                (asig.horas?.horasPracticaPreprofesional ?? 0);

                              return (
                                  <TableRow key={asig.id}>
                                    <TableCell>{asig.codigo}</TableCell>
                                    <TableCell>{asig.nombre}</TableCell>
                                    <TableCell>{nivelToOrdinalShort(niveles.find((n) => n.id === asig.nivel_id)) || 'N/A'}</TableCell>
                                    <TableCell>{organizaciones.find((o) => o.id === asig.organizacion_id)?.nombre || 'N/A'}</TableCell>
                                    <TableCell>{asig.horas?.horasDocencia ?? 0}</TableCell>
                                    <TableCell>{asig.horas?.horasPractica ?? 0}</TableCell>
                                    <TableCell>{asig.horas?.horasAutonoma ?? 0}</TableCell>
                                    <TableCell>{asig.horas?.horasVinculacion ?? 0}</TableCell>
                                    <TableCell>{asig.horas?.horasPracticaPreprofesional ?? 0}</TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="icon" onClick={() => handleEdit(asig)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDelete(asig.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
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