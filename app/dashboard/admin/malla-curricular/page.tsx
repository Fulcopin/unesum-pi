"use client";

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
import { Loader2, CheckCircle, XCircle, BookOpen, Grid3x3, Eye } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

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
}

interface Asignatura {
  id: number;
  nombre: string;
  codigo: string;
  nivel_id: number;
  carrera_id: number;
  organizacion_id: number;
  prerrequisito_codigo?: string | null;
  correquisito_codigo?: string | null;
  horas?: {
    horasDocencia: number;
    horasPractica: number;
    horasAutonoma: number;
    horasVinculacion: number;
    horasPracticaPreprofesional: number;
  };
  nivel?: { nombre: string; codigo: string };
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
  const { token, getToken } = useAuth();

  // Estados
  const [facultades, setFacultades] = useState<Facultad[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [carrerasFiltradas, setCarrerasFiltradas] = useState<Carrera[]>([]);
  const [mallas, setMallas] = useState<Malla[]>([]);
  const [mallasFiltradas, setMallasFiltradas] = useState<Malla[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacultad, setSelectedFacultad] = useState("");
  const [selectedCarrera, setSelectedCarrera] = useState("");
  const [selectedMalla, setSelectedMalla] = useState("");
  const [asignaturasDeMalla, setAsignaturasDeMalla] = useState<Asignatura[]>([]);
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false);

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
      const [facultadesData, carrerasData, mallasData, nivelesData] = await Promise.all([
        apiRequest("/datos-academicos/facultades"),
        apiRequest("/datos-academicos/carreras"),
        apiRequest("/mallas"),
        apiRequest("/niveles")
      ]);
      
      if (facultadesData) setFacultades(facultadesData);
      if (carrerasData) setCarreras(carrerasData);
      if (mallasData) setMallas(mallasData);
      if (nivelesData) setNiveles(nivelesData);
      
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
    return (
      asig.horas.horasDocencia +
      asig.horas.horasPractica +
      asig.horas.horasAutonoma +
      asig.horas.horasVinculacion +
      asig.horas.horasPracticaPreprofesional
    );
  };

  // Buscar asignatura por código
  const buscarAsignaturaPorCodigo = (codigo: string) => {
    return asignaturasDeMalla.find(a => a.codigo === codigo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[#00563F] mb-2">Gestión de Malla Curricular</h1>
          <p className="text-gray-600">Visualización de mallas curriculares registradas y sus asignaturas</p>
        </div>

        {/* Filtros */}
        <Card className="mb-8 border-2 border-emerald-200 shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-[#00563F]">Buscar Mallas Curriculares</CardTitle>
            <CardDescription>Seleccione facultad, carrera y malla para visualizar el detalle completo</CardDescription>
          </CardHeader>
          {loading ? (
            <CardContent className="flex h-40 items-center justify-center text-emerald-700">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Cargando datos...</span>
            </CardContent>
          ) : (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Combo 1: Facultad */}
                <div className="space-y-2">
                  <Label htmlFor="filtro-facultad">Facultad *</Label>
                  <Select value={selectedFacultad} onValueChange={setSelectedFacultad}>
                    <SelectTrigger className="w-full" id="filtro-facultad">
                      <SelectValue placeholder="Seleccione facultad..." />
                    </SelectTrigger>
                    <SelectContent>
                      {facultades.map((f) => (
                        <SelectItem key={f.id} value={f.id.toString()}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Combo 2: Carrera */}
                <div className="space-y-2">
                  <Label htmlFor="filtro-carrera">Carrera *</Label>
                  <Select 
                    value={selectedCarrera} 
                    onValueChange={setSelectedCarrera}
                    disabled={!selectedFacultad || carrerasFiltradas.length === 0}
                  >
                    <SelectTrigger className="w-full" id="filtro-carrera">
                      <SelectValue placeholder={!selectedFacultad ? "Primero seleccione facultad" : "Seleccione carrera..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {carrerasFiltradas.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedFacultad && carrerasFiltradas.length === 0 && (
                    <p className="text-xs text-amber-600">⚠️ No hay carreras</p>
                  )}
                </div>

                {/* Combo 3: Malla */}
                <div className="space-y-2">
                  <Label htmlFor="filtro-malla">Códigos de Malla Curriculares *</Label>
                  <Select 
                    value={selectedMalla} 
                    onValueChange={setSelectedMalla}
                    disabled={!selectedCarrera || mallasFiltradas.length === 0}
                  >
                    <SelectTrigger className="w-full" id="filtro-malla">
                      <SelectValue placeholder={!selectedCarrera ? "Primero seleccione carrera" : "Seleccione malla..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {mallasFiltradas.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.codigo_malla}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCarrera && mallasFiltradas.length === 0 && (
                    <p className="text-xs text-amber-600">⚠️ No hay mallas</p>
                  )}
                  {selectedCarrera && mallasFiltradas.length > 0 && (
                    <p className="text-xs text-emerald-600">✓ {mallasFiltradas.length} {mallasFiltradas.length === 1 ? 'malla disponible' : 'mallas disponibles'}</p>
                  )}
                </div>
              </div>

              {selectedFacultad && (
                <div className="mt-6 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {selectedMalla && mallaActual && (
                      <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <span className="font-semibold text-emerald-800">
                          Malla seleccionada: {mallaActual.codigo_malla}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedFacultad("");
                      setSelectedCarrera("");
                      setSelectedMalla("");
                      setAsignaturasDeMalla([]);
                    }}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{mallaActual.codigo_malla}</CardTitle>
                  <CardDescription className="text-emerald-100">
                    {mallaActual.facultad?.nombre} - {mallaActual.carrera?.nombre}
                  </CardDescription>
                  <p className="text-xs text-emerald-200 mt-1">
                    Creada: {new Date(mallaActual.fecha_creacion).toLocaleDateString()}
                  </p>
                </div>
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
                <Accordion type="multiple" defaultValue={nivelesOrdenados.slice(0, 2)} className="space-y-3">
                  {nivelesOrdenados.map((nivelNombre, index) => {
                    const totalHorasNivel = asignaturasPorNivel[nivelNombre].reduce((sum, asig) => sum + calcularTotalHoras(asig), 0);
                    const nivelCodigo = niveles.find(n => n.nombre === nivelNombre)?.codigo || index + 1;
                    
                    return (
                      <AccordionItem key={nivelNombre} value={nivelNombre} className="border-2 border-emerald-300 rounded-lg overflow-hidden shadow-sm">
                        <AccordionTrigger className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 hover:no-underline hover:bg-emerald-100 transition-all">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-emerald-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                                {nivelCodigo}
                              </div>
                              <div className="text-left">
                                <div className="text-lg font-bold text-[#00563F]">{nivelNombre}</div>
                                <div className="text-sm text-gray-600 font-normal flex items-center gap-3">
                                  <span>{asignaturasPorNivel[nivelNombre].length} {asignaturasPorNivel[nivelNombre].length === 1 ? 'asignatura' : 'asignaturas'}</span>
                                  <span className="text-emerald-700 font-semibold">• {totalHorasNivel}h totales</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 bg-gradient-to-b from-white to-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {asignaturasPorNivel[nivelNombre].map((asig) => (
                            <Card key={asig.id} className="border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
                              <CardHeader className="p-3 pb-2">
                                <div className="space-y-1">
                                  <div className="font-bold text-emerald-700 text-xs">{asig.codigo}</div>
                                  <div className="font-semibold text-gray-800 text-xs leading-tight line-clamp-2">
                                    {asig.nombre}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 space-y-2">
                                {/* Prerrequisitos y Correquisitos */}
                                <div className="space-y-1">
                                  {asig.prerrequisito_codigo ? (
                                    <div className="bg-orange-50 border border-orange-200 rounded p-1.5">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <span className="font-bold text-orange-700 text-[9px]">PRERREQUISITO:</span>
                                      </div>
                                      <div className="text-[10px] text-gray-700 font-semibold">
                                        {asig.prerrequisito_codigo}
                                      </div>
                                      <div className="text-[9px] text-gray-600 line-clamp-1">
                                        {buscarAsignaturaPorCodigo(asig.prerrequisito_codigo)?.nombre || 'Nivel anterior'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-gray-50 border border-gray-200 rounded p-1.5 text-center">
                                      <span className="text-[9px] text-gray-500">Sin prerrequisito</span>
                                    </div>
                                  )}
                                  
                                  {asig.correquisito_codigo ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <span className="font-bold text-blue-700 text-[9px]">CORREQUISITO:</span>
                                      </div>
                                      <div className="text-[10px] text-gray-700 font-semibold">
                                        {asig.correquisito_codigo}
                                      </div>
                                      <div className="text-[9px] text-gray-600 line-clamp-1">
                                        {buscarAsignaturaPorCodigo(asig.correquisito_codigo)?.nombre || 'Mismo nivel'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-gray-50 border border-gray-200 rounded p-1.5 text-center">
                                      <span className="text-[9px] text-gray-500">Sin correquisito</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Horas Compactas */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-600">Docencia:</span>
                                    <span className="font-bold text-emerald-700">{asig.horas?.horasDocencia || 0}h</span>
                                  </div>
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-600">Práctica:</span>
                                    <span className="font-bold text-emerald-700">{asig.horas?.horasPractica || 0}h</span>
                                  </div>
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-600">Autónoma:</span>
                                    <span className="font-bold text-emerald-700">{asig.horas?.horasAutonoma || 0}h</span>
                                  </div>
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-600">Vinculación:</span>
                                    <span className="font-bold text-emerald-700">{asig.horas?.horasVinculacion || 0}h</span>
                                  </div>
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-600">Preprofes.:</span>
                                    <span className="font-bold text-emerald-700">{asig.horas?.horasPracticaPreprofesional || 0}h</span>
                                  </div>
                                </div>
                                
                                {/* Total */}
                                <div className="bg-emerald-600 text-white p-1.5 rounded text-center">
                                  <div className="text-[10px] font-medium">Total</div>
                                  <div className="text-sm font-bold">{calcularTotalHoras(asig)}h</div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
