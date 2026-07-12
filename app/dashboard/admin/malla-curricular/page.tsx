"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, CheckCircle, XCircle, BookOpen, Grid3x3, Eye, Home, Building2, GraduationCap, Network, FilterX, Search, FileDown } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Interfaces ---
interface Facultad {
  id: number;
  nombre: string;
}

interface Carrera {
  id: number;
  nombre: string;
  facultad_id: number;
}

interface Nivel {
  id: number;
  nombre: string;
  codigo: string;
  ordinal?: string;
}

interface Organizacion {
  id: number;
  nombre: string;
  codigo: string;
}

interface Asignatura {
  id: number;
  nombre: string;
  codigo: string;
  nivel_id: number;
  carrera_id: number;
  organizacion_id: number;
  organizacion?: { id: number; nombre: string; codigo: string };
  prerrequisitos_codigos?: string[];
  correquisitos_codigos?: string[];
  horas?: {
    horasDocencia: number;
    horasPractica: number;
    horasAutonoma: number;
    horasVinculacion: number;
    horasPracticaPreprofesional: number;
  };
  nivel?: { nombre: string; codigo: string; ordinal?: string };
}

interface Malla {
  id: number;
  codigo_malla: string;
  facultad_id: number;
  carrera_id: number;
  fecha_creacion: string;
  facultad?: { nombre: string };
  carrera?: { nombre: string };
}

const API_BASE_URL = 'http://localhost:4000/api';

export default function MallaCurricularPage() {
  const router = useRouter();
  const { token, getToken } = useAuth();

  // Estados
  const [facultades, setFacultades] = useState<Facultad[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [carrerasFiltradas, setCarrerasFiltradas] = useState<Carrera[]>([]);
  const [mallas, setMallas] = useState<Malla[]>([]);
  const [mallasFiltradas, setMallasFiltradas] = useState<Malla[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacultad, setSelectedFacultad] = useState("");
  const [selectedCarrera, setSelectedCarrera] = useState("");
  const [selectedMalla, setSelectedMalla] = useState("");
  const [tipoMalla, setTipoMalla] = useState<"nueva" | "antigua">("nueva");
  const [asignaturasDeMalla, setAsignaturasDeMalla] = useState<Asignatura[]>([]);
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  // Helper API
  const apiRequest = async (url: string) => {
    try {
      const currentToken = token || getToken();
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error");
      return data.data || data;
    } catch (error) {
      console.error(`Error cargando ${url}:`, error);
      return null;
    }
  };

  // Carga inicial de datos
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      const [facultadesData, carrerasData, mallasData, nivelesData, organizacionesData] = await Promise.all([
        apiRequest("/datos-academicos/facultades"),
        apiRequest("/datos-academicos/carreras"),
        apiRequest("/mallas"),
        apiRequest("/niveles"),
        apiRequest("/organizaciones")
      ]);
      
      if (facultadesData) setFacultades(facultadesData);
      if (carrerasData) setCarreras(carrerasData);
      if (mallasData) setMallas(mallasData);
      if (nivelesData) setNiveles(nivelesData);
      if (organizacionesData) setOrganizaciones(organizacionesData);
      
      setLoading(false);
    };
    cargarDatos();
  }, []);

  // Filtrar carreras cuando cambia la facultad
  useEffect(() => {
    if (selectedFacultad) {
      const filtradas = carreras.filter(c => c.facultad_id.toString() === selectedFacultad);
      setCarrerasFiltradas(filtradas);
      setSelectedCarrera("");
      setSelectedMalla("");
      setMallasFiltradas([]);
    } else {
      setCarrerasFiltradas([]);
      setSelectedCarrera("");
      setSelectedMalla("");
      setMallasFiltradas([]);
    }
  }, [selectedFacultad, carreras]);

  // Filtrar mallas cuando cambia la carrera
  useEffect(() => {
    if (selectedCarrera) {
      const filtradas = mallas.filter(m => m.carrera_id.toString() === selectedCarrera);
      setMallasFiltradas(filtradas);
      setSelectedMalla("");
    } else {
      setMallasFiltradas([]);
      setSelectedMalla("");
    }
  }, [selectedCarrera, mallas]);

  // Cargar asignaturas cuando se selecciona una malla
  useEffect(() => {
    const cargarAsignaturasDeMalla = async () => {
      if (selectedMalla) {
        setLoadingAsignaturas(true);
        const mallaSelec = mallas.find(m => m.id.toString() === selectedMalla);
        if (mallaSelec) {
          try {
            const asignaturasData = await apiRequest(`/asignaturas?carrera_id=${mallaSelec.carrera_id}`);
            if (asignaturasData) {
              setAsignaturasDeMalla(asignaturasData);
            }
          } catch (error) {
            console.error("Error cargando asignaturas:", error);
          } finally {
            setLoadingAsignaturas(false);
          }
        }
      } else {
        setAsignaturasDeMalla([]);
      }
    };
    cargarAsignaturasDeMalla();
  }, [selectedMalla, mallas]);

  // Obtener la malla actualmente seleccionada
  const mallaActual = mallas.find(m => m.id.toString() === selectedMalla);

  // Agrupar asignaturas por nivel
  const asignaturasPorNivel = asignaturasDeMalla.reduce((acc: Record<string, Asignatura[]>, asig) => {
    const nivelKey = asig.nivel?.nombre || `Nivel ${asig.nivel_id}`;
    if (!acc[nivelKey]) {
      acc[nivelKey] = [];
    }
    acc[nivelKey].push(asig);
    return acc;
  }, {});

  // Ordenar niveles por código
  const nivelesOrdenados = Object.keys(asignaturasPorNivel).sort((a, b) => {
    const nivelA = niveles.find(n => n.nombre === a);
    const nivelB = niveles.find(n => n.nombre === b);
    return parseInt(nivelA?.codigo || "0") - parseInt(nivelB?.codigo || "0");
  });

  const calcularTotalHoras = (asig: Asignatura) => {
    if (!asig.horas) return 0;
    const base =
      asig.horas.horasDocencia +
      asig.horas.horasPractica +
      asig.horas.horasAutonoma;
    if (tipoMalla === "nueva") {
      return base + asig.horas.horasVinculacion + asig.horas.horasPracticaPreprofesional;
    }
    return base;
  };

  // Buscar asignatura por código
  const buscarAsignaturaPorCodigo = (codigo: string) => {
    return asignaturasDeMalla.find(a => a.codigo === codigo);
  };

  // Totales generales de horas de toda la malla curricular
  const totalesMalla = asignaturasDeMalla.reduce((acc, asig) => {
    acc.docencia += asig.horas?.horasDocencia || 0;
    acc.practica += asig.horas?.horasPractica || 0;
    acc.autonoma += asig.horas?.horasAutonoma || 0;
    acc.vinculacion += asig.horas?.horasVinculacion || 0;
    acc.preprofesionales += asig.horas?.horasPracticaPreprofesional || 0;
    acc.total += calcularTotalHoras(asig);
    return acc;
  }, { docencia: 0, practica: 0, autonoma: 0, vinculacion: 0, preprofesionales: 0, total: 0 });

  // Colores institucionales de la carrera por Unidad de Organización Curricular
  const getUnidadEstilos = (asig: Asignatura) => {
    const orgObj = asig.organizacion || organizaciones.find(o => o.id === asig.organizacion_id);
    const nombre = orgObj?.nombre?.toLowerCase() || "";
    const id = asig.organizacion_id?.toString();

    // Unidad Básica -> Verde Esmeralda Institucional (#00563F)
    if (nombre.includes("básica") || nombre.includes("basica") || id === "10") {
      return {
        nombre: "Unidad Básica",
        borde: "border-[#00563F] hover:border-emerald-700",
        barraTop: "bg-gradient-to-r from-[#00563F] via-[#0B5345] to-[#1E8449]",
        badge: "bg-emerald-100 text-[#00563F] border-emerald-300 font-extrabold",
        texto: "text-[#00563F]",
        rgb: [0, 86, 63] as [number, number, number]
      };
    }
    // Unidad Profesional -> Rojo Institucional (#C0392B / #E74C3C)
    if (nombre.includes("profesional") || id === "11") {
      return {
        nombre: "Unidad Profesional",
        borde: "border-[#C0392B] hover:border-red-700",
        barraTop: "bg-gradient-to-r from-[#C0392B] via-[#E74C3C] to-[#D35400]",
        badge: "bg-red-100 text-[#C0392B] border-red-300 font-extrabold",
        texto: "text-[#C0392B]",
        rgb: [192, 57, 43] as [number, number, number]
      };
    }
    // Unidad de Titulación -> Gris Institucional / Plata (#566573)
    if (nombre.includes("titulación") || nombre.includes("titulacion") || id === "12") {
      return {
        nombre: "Unidad de Titulación",
        borde: "border-[#566573] hover:border-slate-700",
        barraTop: "bg-gradient-to-r from-[#566573] via-[#7F8C8D] to-[#95A5A6]",
        badge: "bg-slate-200 text-[#566573] border-slate-400 font-extrabold",
        texto: "text-[#566573]",
        rgb: [86, 101, 115] as [number, number, number]
      };
    }
    return {
      nombre: orgObj?.nombre || "Formación General",
      borde: "border-gray-300 hover:border-gray-400",
      barraTop: "bg-gradient-to-r from-gray-400 to-gray-500",
      badge: "bg-gray-100 text-gray-700 border-gray-200 font-bold",
      texto: "text-gray-700",
      rgb: [127, 140, 141] as [number, number, number]
    };
  };

  // Generación de PDF estructurado resaltando las unidades curriculares con sus colores
  const generarPDF = async () => {
    if (!selectedMalla || asignaturasDeMalla.length === 0) return;
    setGenerandoPDF(true);

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const carreraObj = carreras.find(c => c.id.toString() === selectedCarrera);
      const facultadObj = facultades.find(f => f.id.toString() === selectedFacultad);
      const mallaObj = mallas.find(m => m.id.toString() === selectedMalla);

      // --- LOGO UNESUM (ESCUDO) ---
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = () => reject();
            logoImg.src = '/images/escudo-unesum.png';
          }),
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
        // Ubicar el escudo del lado izquierdo (x: 20, y: 10, ancho: 22, alto: 27)
        doc.addImage(logoImg, 'PNG', 20, 10, 22, 27);
      } catch (err) {
        console.warn("Logo (escudo) no disponible o timeout:", err);
      }

      // Encabezado institucional
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 86, 63); // Verde institucional
      doc.text("UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ", 148, 16, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(86, 101, 115); // Gris
      doc.text(facultadObj?.nombre?.toUpperCase() || "FACULTAD", 148, 22, { align: "center" });

      doc.setFontSize(13);
      doc.setTextColor(192, 57, 43); // Rojo profesional
      doc.text(`CARRERA DE ${carreraObj?.nombre?.toUpperCase() || ""}`, 148, 28, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`MALLA CURRICULAR: ${mallaObj?.codigo_malla || ""} (${tipoMalla === "nueva" ? "MALLA NUEVA" : "MALLA ANTIGUA"})`, 148, 34, { align: "center" });

      // Leyenda de Colores
      let startY = 41;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Leyenda de Unidades Curriculares:", 14, startY);

      // Cuadro Verde - Básica
      doc.setFillColor(0, 86, 63);
      doc.rect(75, startY - 3, 4, 4, "F");
      doc.setTextColor(0, 86, 63);
      doc.text("Unidad Básica", 81, startY);

      // Cuadro Rojo - Profesional
      doc.setFillColor(192, 57, 43);
      doc.rect(115, startY - 3, 4, 4, "F");
      doc.setTextColor(192, 57, 43);
      doc.text("Unidad Profesional", 121, startY);

      // Cuadro Gris - Titulación
      doc.setFillColor(86, 101, 115);
      doc.rect(160, startY - 3, 4, 4, "F");
      doc.setTextColor(86, 101, 115);
      doc.text("Unidad de Titulación", 166, startY);

      startY = 47;

      // Cuadro Resumen Global de Totales de la Malla en el PDF
      autoTable(doc, {
        startY: startY,
        head: [["RESUMEN TOTAL DE HORAS DE LA MALLA", "Docencia", "Prácticas", "Autónoma", "Vinculación", "Preprofesionales", "TOTAL GENERAL"]],
        body: [["Total Horas", `${totalesMalla.docencia}h`, `${totalesMalla.practica}h`, `${totalesMalla.autonoma}h`, `${totalesMalla.vinculacion}h`, `${totalesMalla.preprofesionales}h`, `${totalesMalla.total}h`]],
        theme: "grid",
        headStyles: { fillColor: [0, 86, 63], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 9 },
        bodyStyles: { fontStyle: "bold", halign: "center", fontSize: 9, textColor: [44, 62, 80] },
        columnStyles: { 0: { halign: "left" }, 6: { fillColor: [240, 243, 244], textColor: [0, 86, 63], fontStyle: "bold" } },
        margin: { left: 14, right: 14 }
      });

      startY = (doc as any).lastAutoTable.finalY + 8;

      // Generar tablas por cada Nivel
      nivelesOrdenados.forEach((nivelNombre, idx) => {
        const asigsNivel = asignaturasPorNivel[nivelNombre] || [];
        if (asigsNivel.length === 0) return;

        const nivelObj = niveles.find(n => n.nombre === nivelNombre);
        let displayNivel = nivelNombre;
        if (nivelObj?.ordinal) {
          displayNivel = nivelObj.ordinal.toUpperCase();
        } else if (!isNaN(Number(nivelNombre))) {
          displayNivel = `NIVEL ${nivelNombre}`;
        }

        if (startY > 165) {
          doc.addPage();
          startY = 20;
        }

        const totNivPrac = asigsNivel.reduce((s, a) => s + (a.horas?.horasPractica || 0), 0);
        const totNivVinc = asigsNivel.reduce((s, a) => s + (a.horas?.horasVinculacion || 0), 0);
        const totNivPrep = asigsNivel.reduce((s, a) => s + (a.horas?.horasPracticaPreprofesional || 0), 0);
        const totNivTotal = asigsNivel.reduce((s, a) => s + calcularTotalHoras(a), 0);

        const tableBody = asigsNivel.map(asig => {
          const estilos = getUnidadEstilos(asig);
          const totalH = calcularTotalHoras(asig);
          
          // Resolver nombres de asignaturas a partir de sus códigos
          const resolverNombresRequisitos = (codigos: string[] | undefined) => {
            if (!codigos || codigos.length === 0) return "Ninguno";
            return codigos.map(codigo => {
              const encontrada = asignaturasDeMalla.find(a => a.codigo === codigo);
              return encontrada ? encontrada.nombre : codigo;
            }).join(", ");
          };

          const pres = resolverNombresRequisitos(asig.prerrequisitos_codigos);
          const cors = resolverNombresRequisitos(asig.correquisitos_codigos);

          return [
            asig.codigo,
            asig.nombre,
            estilos.nombre,
            `${totalH}h`,
            pres,
            cors
          ];
        });

        const nivelFooterContent = `Totales del Nivel (Prácticas: ${totNivPrac}h | Vinculación: ${totNivVinc}h | Preprofesionales: ${totNivPrep}h)`;

        autoTable(doc, {
          startY: startY,
          head: [[{ content: displayNivel, colSpan: 6, styles: { halign: "center", fontStyle: "bold", fillColor: [0, 86, 63], textColor: [255, 255, 255], fontSize: 10 } }],
                 ["Código", "Asignatura", "Unidad Curricular", "Horas", "Prerrequisitos", "Correquisitos"]],
          body: tableBody,
          foot: [[
            { content: nivelFooterContent, colSpan: 3, styles: { halign: "right", fontStyle: "bold", fillColor: [240, 243, 244], textColor: [0, 86, 63] } },
            { content: `${totNivTotal}h`, styles: { halign: "center", fontStyle: "bold", fillColor: [0, 86, 63], textColor: [255, 255, 255] } },
            { content: "", colSpan: 2, styles: { fillColor: [240, 243, 244] } }
          ]],
          theme: "grid",
          headStyles: { fillColor: [240, 243, 244], textColor: [44, 62, 80], fontStyle: "bold", fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2, textColor: [44, 62, 80] },
          columnStyles: {
            0: { cellWidth: 18, fontStyle: "bold" },
            1: { cellWidth: 85 },
            2: { cellWidth: 45, fontStyle: "bold" },
            3: { cellWidth: 18, halign: "center" },
            4: { cellWidth: 55 },
            5: { cellWidth: 55 }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const rowAsig = asigsNivel[data.row.index];
              if (rowAsig) {
                const est = getUnidadEstilos(rowAsig);
                data.cell.styles.textColor = est.rgb;
              }
            }
          },
          margin: { left: 14, right: 14 }
        });

        startY = (doc as any).lastAutoTable.finalY + 6;
      });

      const fileName = `Malla_Curricular_${carreraObj?.nombre?.replace(/\s+/g, '_') || "UNESUM"}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Error al generar PDF:", err);
    } finally {
      setGenerandoPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#00563F] mb-2">Gestión de Malla Curricular</h1>
            <p className="text-gray-600">Visualización de mallas curriculares registradas y sus asignaturas</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/admin')}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 self-start"
          >
            <Home className="mr-2 h-4 w-4" />
            MENÚ PRINCIPAL
          </Button>
        </div>

        {/* Filtros */}
        <Card className="mb-8 border-none shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden relative">
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <CardHeader className="pb-4 border-b border-gray-100 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shadow-sm">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-800 font-extrabold tracking-tight">Buscar Mallas Curriculares</CardTitle>
                <CardDescription className="text-gray-500 font-medium mt-1">
                  Seleccione facultad, carrera y malla para visualizar el detalle completo
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          {loading ? (
            <CardContent className="flex flex-col h-48 items-center justify-center text-emerald-600">
              <Loader2 className="h-10 w-10 animate-spin mb-3 text-emerald-500" />
              <span className="font-semibold text-gray-600">Cargando repositorios...</span>
            </CardContent>
          ) : (
            <CardContent className="pt-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Combo 1: Facultad */}
                <div className="space-y-3">
                  <Label htmlFor="filtro-facultad" className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    Facultad
                  </Label>
                  <Select value={selectedFacultad} onValueChange={setSelectedFacultad}>
                    <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl shadow-sm transition-all text-gray-700" id="filtro-facultad">
                      <SelectValue placeholder="Seleccione facultad..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-gray-100">
                      {facultades.map((f) => (
                        <SelectItem key={f.id} value={f.id.toString()} className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Combo 2: Carrera */}
                <div className="space-y-3">
                  <Label htmlFor="filtro-carrera" className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <GraduationCap className="w-4 h-4 text-emerald-500" />
                    Carrera
                  </Label>
                  <Select 
                    value={selectedCarrera} 
                    onValueChange={setSelectedCarrera}
                    disabled={!selectedFacultad || carrerasFiltradas.length === 0}
                  >
                    <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl shadow-sm transition-all disabled:opacity-60 text-gray-700" id="filtro-carrera">
                      <SelectValue placeholder={!selectedFacultad ? "Primero seleccione facultad" : "Seleccione carrera..."} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-gray-100">
                      {carrerasFiltradas.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedFacultad && carrerasFiltradas.length === 0 && (
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-2">
                      <XCircle className="w-3 h-3" /> No hay carreras
                    </p>
                  )}
                </div>

                {/* Combo 3: Malla */}
                <div className="space-y-3">
                  <Label htmlFor="filtro-malla" className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <Network className="w-4 h-4 text-emerald-500" />
                    Malla Curricular
                  </Label>
                  <Select 
                    value={selectedMalla} 
                    onValueChange={setSelectedMalla}
                    disabled={!selectedCarrera || mallasFiltradas.length === 0}
                  >
                    <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl shadow-sm transition-all disabled:opacity-60 text-gray-700" id="filtro-malla">
                      <SelectValue placeholder={!selectedCarrera ? "Primero seleccione carrera" : "Seleccione malla..."} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-gray-100">
                      {mallasFiltradas.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()} className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">
                          {m.codigo_malla}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCarrera && mallasFiltradas.length === 0 && (
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-2">
                      <XCircle className="w-3 h-3" /> No hay mallas registradas
                    </p>
                  )}
                  {selectedCarrera && mallasFiltradas.length > 0 && (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
                      <CheckCircle className="w-3 h-3" /> {mallasFiltradas.length} {mallasFiltradas.length === 1 ? 'malla disponible' : 'mallas disponibles'}
                    </p>
                  )}
                </div>

                {/* Combo 4: Tipo de Malla */}
                <div className="space-y-3">
                  <Label htmlFor="tipo-malla" className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <Grid3x3 className="w-4 h-4 text-emerald-500" />
                    Tipo de Malla
                  </Label>
                  <Select 
                    value={tipoMalla} 
                    onValueChange={(val: "nueva" | "antigua") => setTipoMalla(val)}
                  >
                    <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl shadow-sm transition-all text-gray-700" id="tipo-malla">
                      <SelectValue placeholder="Seleccione tipo..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-gray-100">
                      <SelectItem value="nueva" className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">
                        Malla Nueva (Con Prácticas/Vinc.)
                      </SelectItem>
                      <SelectItem value="antigua" className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">
                        Malla Antigua (Sin Prácticas/Vinc.)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botón de limpiar y estado */}
              {selectedFacultad && (
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-sm">
                    {selectedMalla && mallaActual ? (
                      <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 px-4 py-2.5 rounded-xl border border-emerald-200/50 text-emerald-800 shadow-sm transition-all">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <span className="font-bold">
                          Malla activa: {mallaActual.codigo_malla} ({tipoMalla === "nueva" ? "Nueva" : "Antigua"})
                        </span>
                      </div>
                    ) : (
                      <div className="text-gray-400 italic">Esperando selección completa...</div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setSelectedFacultad("");
                      setSelectedCarrera("");
                      setSelectedMalla("");
                      setTipoMalla("nueva");
                      setAsignaturasDeMalla([]);
                    }}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl px-5 h-11 transition-colors font-semibold"
                  >
                    <FilterX className="w-4 h-4 mr-2" />
                    Limpiar Filtros
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Visualización de la Malla Curricular */}
        {selectedMalla && mallaActual && (
          <Card className="mb-8 border-2 border-emerald-200 shadow-lg bg-white">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl">{mallaActual.codigo_malla}</CardTitle>
                  <CardDescription className="text-emerald-100">
                    {mallaActual.facultad?.nombre} - {mallaActual.carrera?.nombre}
                  </CardDescription>
                  <p className="text-xs text-emerald-200 mt-1">
                    Creada: {new Date(mallaActual.fecha_creacion).toLocaleDateString()}
                  </p>
                </div>
                {asignaturasDeMalla.length > 0 && (
                  <Button
                    onClick={generarPDF}
                    disabled={generandoPDF}
                    className="bg-white text-[#00563F] hover:bg-emerald-50 font-bold shadow-md rounded-xl px-5 h-11 flex items-center gap-2 border border-emerald-100 transition-all ml-auto"
                  >
                    {generandoPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5 text-red-600" />}
                    {generandoPDF ? "Generando PDF..." : "Exportar PDF de la Malla"}
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              {loadingAsignaturas ? (
                <div className="flex h-40 items-center justify-center text-emerald-700">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Cargando asignaturas de la malla...</span>
                </div>
              ) : asignaturasDeMalla.length === 0 ? (
                <div className="flex flex-col h-40 items-center justify-center text-gray-500">
                  <BookOpen className="h-12 w-12 mb-2 text-gray-300" />
                  <p>No hay asignaturas registradas en esta malla</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Leyenda Visual de Unidades Curriculares */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50/90 rounded-xl border border-gray-200 flex-wrap text-xs shadow-sm">
                    <span className="font-extrabold text-gray-800">Unidades de Organización Curricular:</span>
                    <div className="flex items-center gap-1.5 bg-emerald-100 text-[#00563F] border border-emerald-300 font-extrabold px-3 py-1 rounded-lg">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00563F]"></div>
                      <span>Unidad Básica</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-red-100 text-[#C0392B] border border-red-300 font-extrabold px-3 py-1 rounded-lg">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#C0392B]"></div>
                      <span>Unidad Profesional</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-200 text-[#566573] border border-slate-400 font-extrabold px-3 py-1 rounded-lg">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#566573]"></div>
                      <span>Unidad de Titulación</span>
                    </div>
                  </div>

                  {/* Tarjetas de Resumen Global Estadístico de Horas en Pantalla */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 p-4 bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-xl border border-emerald-100 shadow-sm">
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/60 text-center">
                      <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Docencia</div>
                      <div className="text-lg font-black text-emerald-900 mt-0.5">{totalesMalla.docencia}h</div>
                    </div>
                    <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/60 text-center">
                      <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Prácticas</div>
                      <div className="text-lg font-black text-blue-900 mt-0.5">{totalesMalla.practica}h</div>
                    </div>
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/60 text-center">
                      <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Autónoma</div>
                      <div className="text-lg font-black text-amber-900 mt-0.5">{totalesMalla.autonoma}h</div>
                    </div>
                    <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200/60 text-center">
                      <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Vinculación</div>
                      <div className="text-lg font-black text-purple-900 mt-0.5">{totalesMalla.vinculacion}h</div>
                    </div>
                    <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200/60 text-center">
                      <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Preprofesionales</div>
                      <div className="text-lg font-black text-indigo-900 mt-0.5">{totalesMalla.preprofesionales}h</div>
                    </div>
                    <div className="bg-gradient-to-br from-[#00563F] to-emerald-700 p-3 rounded-xl text-white text-center shadow-md">
                      <div className="text-[11px] text-emerald-100 font-extrabold uppercase tracking-wider">Total Malla</div>
                      <div className="text-lg font-black mt-0.5">{totalesMalla.total}h</div>
                    </div>
                  </div>

                  <Accordion type="multiple" className="space-y-6">
                    {nivelesOrdenados.map((nivelNombre, index) => {
                      const totalHorasNivel = asignaturasPorNivel[nivelNombre].reduce((sum, asig) => sum + calcularTotalHoras(asig), 0);
                      const totNivPrac = asignaturasPorNivel[nivelNombre].reduce((s, a) => s + (a.horas?.horasPractica || 0), 0);
                      const totNivVinc = asignaturasPorNivel[nivelNombre].reduce((s, a) => s + (a.horas?.horasVinculacion || 0), 0);
                      const totNivPrep = asignaturasPorNivel[nivelNombre].reduce((s, a) => s + (a.horas?.horasPracticaPreprofesional || 0), 0);
                      const nivelObj = niveles.find(n => n.nombre === nivelNombre);
                      const nivelCodigo = nivelObj?.codigo || index + 1;
                      
                      let displayNivelNombre = nivelNombre;
                      if (nivelObj?.ordinal) {
                        displayNivelNombre = nivelObj.ordinal.charAt(0).toUpperCase() + nivelObj.ordinal.slice(1).toLowerCase();
                      } else if (!isNaN(Number(nivelNombre))) {
                        displayNivelNombre = `Nivel ${nivelNombre}`;
                      }

                      return (
                        <AccordionItem key={nivelNombre} value={nivelNombre} className="bg-white border border-emerald-100 rounded-xl shadow-sm [&[data-state=open]]:shadow-md transition-all">
                          {/* Header del Nivel */}
                          <AccordionTrigger className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-3 hover:no-underline rounded-t-xl data-[state=closed]:rounded-b-xl border-b border-emerald-800/50 hover:brightness-105 transition-all text-white group">
                            <div className="flex items-center justify-between w-full pr-4 flex-wrap gap-2">
                              <div className="text-left text-white">
                                <div className="text-lg font-bold tracking-wide">{displayNivelNombre}</div>
                              </div>
                              <div className="flex items-center gap-2.5 text-xs font-semibold bg-black/25 px-3.5 py-1.5 rounded-lg border border-white/10 flex-wrap shadow-inner">
                                <span>Prácticas: <strong className="text-blue-200 font-extrabold">{totNivPrac}h</strong></span>
                                <span className="opacity-30">•</span>
                                <span>Vinculación: <strong className="text-purple-200 font-extrabold">{totNivVinc}h</strong></span>
                                <span className="opacity-30">•</span>
                                <span>Preprof: <strong className="text-indigo-200 font-extrabold">{totNivPrep}h</strong></span>
                                <span className="opacity-30">•</span>
                                <span className="bg-white text-[#00563F] font-black px-2 py-0.5 rounded shadow-sm">Total: {totalHorasNivel}h</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          
                          {/* Contenido (Tarjetas) */}
                          <AccordionContent className="p-5 bg-emerald-50/30 rounded-b-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {asignaturasPorNivel[nivelNombre].map((asig) => {
                                const estilos = getUnidadEstilos(asig);
                                return (
                                <Card key={asig.id} className={`relative overflow-hidden border-2 ${estilos.borde} shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col bg-white`}>
                                  <div className={`absolute top-0 left-0 w-full h-2 ${estilos.barraTop}`}></div>
                                  
                                  <CardHeader className="p-4 pb-3 flex-none pt-4">
                                    <div className="flex justify-between items-start mb-2 gap-1.5 flex-wrap">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="inline-block bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wider border border-gray-200 shadow-sm">
                                          {asig.codigo}
                                        </span>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border shadow-sm ${estilos.badge}`}>
                                          {estilos.nombre}
                                        </span>
                                      </div>
                                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm ml-auto">
                                        {calcularTotalHoras(asig)}h
                                      </div>
                                    </div>
                                    <div className="font-bold text-gray-800 text-sm leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2" title={asig.nombre}>
                                      {asig.nombre}
                                    </div>
                                  </CardHeader>
                                
                                <CardContent className="p-4 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                                  {/* Requisitos */}
                                  <div className="flex flex-col gap-2 mt-1">
                                    {asig.prerrequisitos_codigos && asig.prerrequisitos_codigos.length > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        {asig.prerrequisitos_codigos.map(pre => (
                                          <div key={pre} className="flex items-center gap-2 text-[10px] bg-orange-50/50 p-1 rounded border border-orange-100">
                                            <span className="bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded text-[9px] w-10 text-center shadow-sm">PRE</span>
                                            <span className="font-bold text-gray-700">{pre}</span>
                                            <span className="text-gray-500 truncate" title={buscarAsignaturaPorCodigo(pre)?.nombre || 'Nivel anterior'}>
                                              {buscarAsignaturaPorCodigo(pre)?.nombre || 'Nivel anterior'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-[10px] bg-gray-50 p-1 rounded border border-gray-100">
                                        <span className="bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded text-[9px] w-10 text-center">PRE</span>
                                        <span className="text-gray-400 italic">Ninguno</span>
                                      </div>
                                    )}

                                    {asig.correquisitos_codigos && asig.correquisitos_codigos.length > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        {asig.correquisitos_codigos.map(cor => (
                                          <div key={cor} className="flex items-center gap-2 text-[10px] bg-blue-50/50 p-1 rounded border border-blue-100">
                                            <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[9px] w-10 text-center shadow-sm">COR</span>
                                            <span className="font-bold text-gray-700">{cor}</span>
                                            <span className="text-gray-500 truncate" title={buscarAsignaturaPorCodigo(cor)?.nombre || 'Mismo nivel'}>
                                              {buscarAsignaturaPorCodigo(cor)?.nombre || 'Mismo nivel'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-[10px] bg-gray-50 p-1 rounded border border-gray-100">
                                        <span className="bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded text-[9px] w-10 text-center">COR</span>
                                        <span className="text-gray-400 italic">Ninguno</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Desglose de Horas */}
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] border-t border-gray-100 pt-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500 font-medium">Docencia:</span>
                                      <span className="font-bold text-gray-700 bg-gray-100 px-1.5 rounded">{asig.horas?.horasDocencia || 0}h</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500 font-medium">Práctica:</span>
                                      <span className="font-bold text-gray-700 bg-gray-100 px-1.5 rounded">{asig.horas?.horasPractica || 0}h</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500 font-medium">Autónoma:</span>
                                      <span className="font-bold text-gray-700 bg-gray-100 px-1.5 rounded">{asig.horas?.horasAutonoma || 0}h</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                       <span className="text-gray-500 font-medium">Vinculación:</span>
                                       <span className="font-bold text-gray-700 bg-gray-100 px-1.5 rounded">{asig.horas?.horasVinculacion || 0}h</span>
                                     </div>
                                     {(asig.horas?.horasPracticaPreprofesional || 0) > 0 && (
                                       <div className="flex justify-between items-center col-span-2">
                                         <span className="text-gray-500 font-medium">Preprofesionales:</span>
                                         <span className="font-bold text-gray-700 bg-gray-100 px-1.5 rounded">{asig.horas!.horasPracticaPreprofesional}h</span>
                                       </div>
                                     )}
                                  </div>
                                </CardContent>
                              </Card>
                                );
                              })}
                            </div>
                          </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
