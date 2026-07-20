"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  School,
  GraduationCap,
  AlertCircle,
  Plus,
  Calendar,
  Trash2,
  Pencil,
  ArrowLeft,
  Users,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  ClipboardCheck,
  ClipboardList,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModuloGuard } from "@/components/auth/modulo-guard";

interface Asignatura {
  id: number;
  nombre: string;
  codigo: string;
  estado: string;
  nivel: string | null;
  organizacion: string | null;
  horas?: {
    horasDocencia: number;
    horasPractica: number;
    horasAutonoma: number;
    horasVinculacion: number;
    horasPracticaPreprofesional: number;
  } | null;
  tiene_syllabus: boolean;
  syllabus_id?: number;
  syllabus_source?: string;
  tiene_programa: boolean;
  programa_id?: number;
}

interface Carrera {
  id: number;
  nombre: string;
  asignaturas: Asignatura[];
  mallas: any[];
}

interface EstructuraFacultad {
  facultad: {
    id: number;
    nombre: string;
  };
  carreras: Carrera[];
}

type ConfirmEliminarState = {
  id: number;
  nombre: string;
  asignaturaId: number;
  tipo: 'syllabus' | 'programa';
  source?: string;
};

// ── Tipos para seguimiento de docentes ──────────────────────────────────────
interface DocenteEstado {
  profesor_id: number;
  nombres: string;
  apellidos: string;
  email: string;
  tiene_syllabus: boolean;
  syllabus_id: number | null;
  estado_syllabus: string | null;
  tiene_programa: boolean;
  programa_id: number | null;
  estado_programa: string | null;
}

interface AsignaturaConDocentes {
  id: number;
  nombre: string;
  codigo: string;
  nivel: string;
  horas?: {
    horasDocencia: number;
    horasPractica: number;
    horasAutonoma: number;
    horasVinculacion: number;
    horasPracticaPreprofesional: number;
  } | null;
  docentes: DocenteEstado[];
  stats: {
    total_docentes: number;
    con_syllabus: number;
    con_programa: number;
  };
}

interface SeguimientoData {
  facultad: { id: number; nombre: string };
  carrera: { id: number; nombre: string };
  periodo: { id: string | number; nombre: string };
  asignaturas: AsignaturaConDocentes[];
}

export default function AsignaturasComisionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [estructura, setEstructura] = useState<EstructuraFacultad | null>(null);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('');
  const [confirmEliminar, setConfirmEliminar] = useState<ConfirmEliminarState | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [tabActivo, setTabActivo] = useState<'documentos' | 'seguimiento'>('documentos');

  // Estado para seguimiento por docente
  const [seguimiento, setSeguimiento] = useState<SeguimientoData | null>(null);
  const [loadingSeguimiento, setLoadingSeguimiento] = useState(false);
  const [expandedAsignaturas, setExpandedAsignaturas] = useState<Set<number>>(new Set());
  const [nivelesExpandidosDocs, setNivelesExpandidosDocs] = useState<string[]>([]);

  useEffect(() => {
    if (estructura && carreraSeleccionada) {
      const carrera = estructura.carreras.find(c => c.id === carreraSeleccionada);
      if (carrera) {
        const grupos: { [key: string]: boolean } = {};
        carrera.asignaturas.forEach(a => { grupos[a.nivel || 'Sin nivel'] = true; });
        setNivelesExpandidosDocs(Object.keys(grupos));
      }
    }
  }, [estructura, carreraSeleccionada]);

  useEffect(() => {
    cargarPeriodos();
  }, []);

  // Recargar estructura cuando cambia el periodo seleccionado
  useEffect(() => {
    cargarEstructura();
  }, [periodoSeleccionado]);

  // Recargar seguimiento cuando cambia el periodo o el tab activo
  useEffect(() => {
    if (tabActivo === 'seguimiento' && periodoSeleccionado) {
      cargarSeguimiento();
    }
  }, [tabActivo, periodoSeleccionado]);

  const cargarPeriodos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/datos-academicos/periodos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPeriodos(data.data || []);
        
        // Seleccionar periodo actual por defecto
        const actual = data.data?.find((p: any) => p.estado === 'actual');
        if (actual) {
          setPeriodoSeleccionado(actual.id.toString());
        } else if (data.data && data.data.length > 0) {
          setPeriodoSeleccionado(data.data[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Error al cargar periodos:', err);
      // No bloqueamos la UI si falla esto
    }
  };

  const verificarYCrearSyllabus = async (asignaturaId: number, asignaturaNombre: string) => {
    if (!periodoSeleccionado) {
      alert('⚠️ Por favor seleccione un periodo académico primero');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // 1) Primero verificar en tabla comisión académica
      let existeEnComision = false;
      let syllabusComision: any = null;
      try {
        const resComision = await fetch(
          `${API_URL}/comision-academica/syllabus/buscar?asignatura_id=${asignaturaId}&periodo=${periodoSeleccionado}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (resComision.ok) {
          const dataComision = await resComision.json();
          if (dataComision?.data?.id) {
            existeEnComision = true;
            syllabusComision = dataComision.data;
          }
        }
      } catch(e) { /* no existe en comisión */ }

      if (existeEnComision && syllabusComision) {
        const confirmar = confirm(
          `⚠️ Ya existe un syllabus para "${asignaturaNombre}" en este periodo.\n\n` +
          `Syllabus existente: ${syllabusComision.nombre}\n` +
          `Fecha de creación: ${new Date(syllabusComision.createdAt || syllabusComision.created_at).toLocaleDateString()}\n\n` +
          `¿Desea editarlo?`
        );

        if (confirmar) {
          // Ver/editar el existente
          router.push(`/dashboard/comision/editor-syllabus?id=${syllabusComision.id}&asignatura=${asignaturaId}&periodo=${periodoSeleccionado}&source=comision`);
        }
        return;
      }

      // 2) Si no existe en comisión, ir directo al editor (cargará la plantilla del admin automáticamente si existe)
      router.push(`/dashboard/comision/editor-syllabus?asignatura=${asignaturaId}&periodo=${periodoSeleccionado}&nueva=true`);
    } catch (err: any) {
      console.error('Error al verificar:', err);
      alert('❌ Error al verificar syllabus: ' + err.message);
    }
  };

  const eliminarSyllabus = async (syllabusId: number, asignaturaId: number, source: string) => {
    setEliminando(true);
    try {
      const token = localStorage.getItem('token');
      // Usar el endpoint correcto según el origen del syllabus
      const endpoint = source === 'comision'
        ? `${API_URL}/comision-academica/syllabus/${syllabusId}`
        : `${API_URL}/syllabi/${syllabusId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setConfirmEliminar(null);
        await cargarEstructura();
      } else {
        throw new Error(data.message || 'Error al eliminar syllabus');
      }
    } catch (err: any) {
      console.error('Error:', err);
      alert('❌ Error al eliminar: ' + err.message);
    } finally {
      setEliminando(false);
    }
  };

  const eliminarPrograma = async (programaId: number) => {
    setEliminando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/programa-analitico/${programaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && (data.success ?? true)) {
        setConfirmEliminar(null);
        await cargarEstructura();
      } else {
        throw new Error(data.message || 'Error al eliminar programa analítico');
      }
    } catch (err: any) {
      console.error('Error:', err);
      alert('❌ Error al eliminar: ' + err.message);
    } finally {
      setEliminando(false);
    }
  };

  const cargarSeguimiento = async () => {
    if (!periodoSeleccionado) return;
    setLoadingSeguimiento(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/comision-academica/docentes-por-asignatura?periodo=${periodoSeleccionado}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (!res.ok) throw new Error('Error al cargar seguimiento');
      const data = await res.json();
      setSeguimiento(data.data);
    } catch (err: any) {
      console.error('Error seguimiento:', err);
    } finally {
      setLoadingSeguimiento(false);
    }
  };

  const toggleExpandAsignatura = (asigId: number) => {
    setExpandedAsignaturas(prev => {
      const next = new Set(prev);
      if (next.has(asigId)) next.delete(asigId);
      else next.add(asigId);
      return next;
    });
  };

  const cargarEstructura = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const urlParams = periodoSeleccionado ? `?periodo=${periodoSeleccionado}` : '';
      const response = await fetch(`${API_URL}/comision-academica/estructura-facultad${urlParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar la estructura');
      }

      const data = await response.json();
      setEstructura(data.data);
      
      // Debug: Ver qué niveles vienen
      console.log('🔍 DEBUG - Estructura recibida:', {
        facultad: data.data.facultad?.nombre,
        carreras: data.data.carreras?.length,
        primeraCarrera: data.data.carreras?.[0]?.nombre,
        totalAsignaturas: data.data.carreras?.[0]?.asignaturas?.length,
        ejemploAsignatura: data.data.carreras?.[0]?.asignaturas?.[0],
        niveles: [...new Set(data.data.carreras?.[0]?.asignaturas?.map((a: Asignatura) => a.nivel))]
      });
      
      // Seleccionar la primera carrera por defecto
      if (data.data.carreras.length > 0) {
        setCarreraSeleccionada(data.data.carreras[0].id);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCarreraActual = () => {
    return estructura?.carreras.find(c => c.id === carreraSeleccionada);
  };

  // Agrupar asignaturas por nivel
  const agruparPorNivel = (asignaturas: Asignatura[]) => {
    const grupos: { [key: string]: Asignatura[] } = {};
    
    asignaturas.forEach(asignatura => {
      const nivelKey = asignatura.nivel || 'Sin nivel';
      if (!grupos[nivelKey]) {
        grupos[nivelKey] = [];
      }
      grupos[nivelKey].push(asignatura);
    });
    
    // Ordenar niveles (I, II, III, etc.)
    const nivelesOrdenados = Object.keys(grupos).sort((a, b) => {
      if (a === 'Sin nivel') return 1;
      if (b === 'Sin nivel') return -1;
      
      // Extraer números romanos o números
      const getNumero = (nivel: string): number => {
        const romanos: { [key: string]: number } = {
          'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 
          'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10
        };
        
        // Buscar patrón "Nivel X" o "X"
        const match = nivel.match(/(\d+|[IVX]+)/i);
        if (match) {
          const valor = match[1].toUpperCase();
          return romanos[valor] || parseInt(valor) || 0;
        }
        return 0;
      };
      
      return getNumero(a) - getNumero(b);
    });
    
    return nivelesOrdenados.map(nivel => ({
      nivel,
      asignaturas: grupos[nivel]
    }));
  };

  const contarEstadisticas = (asignaturas: Asignatura[]) => {
    return {
      total: asignaturas.length,
      conSyllabus: asignaturas.filter(a => a.tiene_syllabus).length,
      conPrograma: asignaturas.filter(a => a.tiene_programa).length,
      completas: asignaturas.filter(a => a.tiene_syllabus && a.tiene_programa).length,
      pendientes: asignaturas.filter(a => !a.tiene_syllabus || !a.tiene_programa).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estructura de la facultad...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Error al cargar datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button onClick={cargarEstructura} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const carreraActual = getCarreraActual();
  const stats = carreraActual ? contarEstadisticas(carreraActual.asignaturas) : null;

  return (
    <ModuloGuard>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <Link href="/dashboard/comision">
          <Button variant="ghost" size="sm" className="-ml-2 text-gray-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al menú principal
          </Button>
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <School className="h-8 w-8 text-blue-600" />
            Gestión de Asignaturas
          </h1>
          <div className="mt-2 space-y-1">
            <p className="text-gray-600">
              Facultad: <span className="font-semibold text-blue-600">{estructura?.facultad.nombre}</span>
            </p>
            {estructura?.carreras.length === 1 && (
              <p className="text-gray-600">
                Tu Carrera: <span className="font-semibold text-green-600">{estructura.carreras[0].nombre}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Selección de Carrera - Solo mostrar si hay más de una */}
      {estructura && estructura.carreras.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Seleccionar Carrera
            </CardTitle>
            <CardDescription>
              Seleccione una carrera para ver sus asignaturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {estructura.carreras.map((carrera) => (
                <Button
                  key={carrera.id}
                  variant={carreraSeleccionada === carrera.id ? "default" : "outline"}
                  onClick={() => setCarreraSeleccionada(carrera.id)}
                  className="flex-1 min-w-[200px]"
                >
                  {carrera.nombre}
                  <Badge variant="secondary" className="ml-2">
                    {carrera.asignaturas.length}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selector de Periodo Académico */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Calendar className="h-5 w-5" />
            Periodo Académico
          </CardTitle>
          <CardDescription className="text-blue-700">
            Seleccione el periodo para gestionar syllabi y programas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
            <SelectTrigger className="w-full max-w-md bg-white">
              <SelectValue placeholder="Seleccione un periodo" />
            </SelectTrigger>
            <SelectContent>
              {periodos.map((periodo) => (
                <SelectItem key={periodo.id} value={periodo.id.toString()}>
                  {periodo.nombre} {periodo.estado === 'actual' && '(Actual)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!periodoSeleccionado && (
            <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Por favor seleccione un periodo para gestionar documentos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Asignaturas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Con Syllabus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.conSyllabus}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Con Programa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.conPrograma}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Completas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{stats.completas}</div>
            </CardContent>
          </Card>
          
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-700">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pendientes}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Asignaturas Agrupadas por Nivel */}
      <Tabs value={tabActivo} onValueChange={(v) => setTabActivo(v as 'documentos' | 'seguimiento')}>
        <TabsList className="mb-4">
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Plantillas Comisión
          </TabsTrigger>
          <TabsTrigger value="seguimiento" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Seguimiento por Docente
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Gestión de documentos comisión ── */}
        <TabsContent value="documentos">
          {carreraActual && (
        <div className="space-y-4">
          <div className="flex justify-end gap-3 mb-2">
            <Button variant="outline" size="sm" onClick={() => setNivelesExpandidosDocs(agruparPorNivel(carreraActual.asignaturas).map(g => g.nivel))}>
              Expandir todo
            </Button>
            <Button variant="outline" size="sm" className="border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={() => setNivelesExpandidosDocs([])}>
              Colapsar todo
            </Button>
          </div>
          <Accordion type="multiple" className="w-full space-y-4" value={nivelesExpandidosDocs} onValueChange={setNivelesExpandidosDocs}>
            {agruparPorNivel(carreraActual.asignaturas).map((grupo) => (
              <AccordionItem key={grupo.nivel} value={grupo.nivel} className="border border-white/50 rounded-xl bg-white/60 backdrop-blur-md overflow-hidden shadow-sm">
                <AccordionTrigger className="bg-emerald-50/40 hover:bg-emerald-100/50 px-5 py-4 hover:no-underline transition-all">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-lg">
                        <GraduationCap className="h-5 w-5 text-emerald-700" />
                        {grupo.nivel}
                      </div>
                      <span className="text-sm font-normal text-gray-500 text-left">
                        {grupo.asignaturas.length} asignatura{grupo.asignaturas.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-4 border-t border-gray-100 bg-white">
                  <div className="space-y-2">
                    {grupo.asignaturas.map((asignatura) => (
                      <div
                        key={asignatura.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900">
                                {asignatura.nombre}
                              </h3>
                              <Badge variant="outline">{asignatura.codigo}</Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                {asignatura.tiene_syllabus ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span>Syllabus</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {asignatura.tiene_programa ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-400" />
                                )}
                                <span>Programa Analítico</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            {asignatura.tiene_syllabus && asignatura.syllabus_source === 'comision' ? (
                              <>
                                <Link href={`/dashboard/comision/editor-syllabus?id=${asignatura.syllabus_id}&asignatura=${asignatura.id}&periodo=${periodoSeleccionado}&source=comision`}>
                                  <Button size="sm" variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Ver Syllabus
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => setConfirmEliminar({ id: asignatura.syllabus_id!, nombre: asignatura.nombre, asignaturaId: asignatura.id, tipo: 'syllabus', source: 'comision' })}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Eliminar Syllabus
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => verificarYCrearSyllabus(asignatura.id, asignatura.nombre)}
                                disabled={!periodoSeleccionado}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                {asignatura.tiene_syllabus ? 'Editar Syllabus' : 'Crear Syllabus'}
                              </Button>
                            )}
                            
                            {asignatura.tiene_programa ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => setConfirmEliminar({ id: asignatura.programa_id!, nombre: asignatura.nombre, asignaturaId: asignatura.id, tipo: 'programa' })}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Eliminar Programa
                                </Button>
                                <Link href={`/dashboard/comision/crear-programa-analitico?id=${asignatura.programa_id}&asignatura=${asignatura.id}&periodo=${periodoSeleccionado}`}>
                                  <Button size="sm" variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Ver Programa
                                  </Button>
                                </Link>
                              </>
                            ) : (
                              <Link href={`/dashboard/comision/crear-programa-analitico?asignatura=${asignatura.id}&periodo=${periodoSeleccionado}&nueva=true`}>
                                <Button size="sm" variant="default" disabled={!periodoSeleccionado}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Crear Programa
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {grupo.asignaturas.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                        <p>No hay asignaturas en este nivel</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {carreraActual.asignaturas.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay asignaturas registradas para esta carrera</p>
              </CardContent>
            </Card>
          )}
        </div>
          )}
        </TabsContent>

        {/* ── TAB 2: Seguimiento por docente ── */}
        <TabsContent value="seguimiento">
          {!periodoSeleccionado ? (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="flex items-center gap-3 py-6 text-orange-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                Seleccione un periodo académico para ver el seguimiento.
              </CardContent>
            </Card>
          ) : loadingSeguimiento ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
                <p className="text-gray-500">Cargando seguimiento de docentes...</p>
              </div>
            </div>
          ) : !seguimiento ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-gray-500">
                <Users className="h-12 w-12 text-gray-400" />
                <p>No se pudo cargar el seguimiento.</p>
                <Button onClick={cargarSeguimiento} variant="outline">Reintentar</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Resumen global */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {(() => {
                  const totalDocentes = seguimiento.asignaturas.reduce((s, a) => s + a.stats.total_docentes, 0);
                  const docUnicos = new Set(seguimiento.asignaturas.flatMap(a => a.docentes.map(d => d.profesor_id))).size;
                  const conSyllabus = seguimiento.asignaturas.reduce((s, a) => s + a.stats.con_syllabus, 0);
                  const conPrograma = seguimiento.asignaturas.reduce((s, a) => s + a.stats.con_programa, 0);
                  return (
                    <>
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-xs text-blue-600 font-medium mb-1">Docentes (únicos)</p>
                          <p className="text-3xl font-bold text-blue-700">{docUnicos}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-gray-200">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-xs text-gray-500 font-medium mb-1">Asignaciones totales</p>
                          <p className="text-3xl font-bold text-gray-700">{totalDocentes}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-emerald-200 bg-emerald-50">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-xs text-emerald-600 font-medium mb-1">Syllabus entregados</p>
                          <p className="text-3xl font-bold text-emerald-700">{conSyllabus}<span className="text-base font-normal text-emerald-500">/{totalDocentes}</span></p>
                        </CardContent>
                      </Card>
                      <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-xs text-purple-600 font-medium mb-1">Programas entregados</p>
                          <p className="text-3xl font-bold text-purple-700">{conPrograma}<span className="text-base font-normal text-purple-500">/{totalDocentes}</span></p>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>

              {/* Asignaturas agrupadas por nivel */}
              <div className="flex justify-end gap-3 mb-4 mt-6">
                <Button variant="outline" size="sm" onClick={() => {
                  if (seguimiento) {
                    setExpandedAsignaturas(new Set(seguimiento.asignaturas.map(a => a.id)));
                  }
                }}>
                  Expandir todo
                </Button>
                <Button variant="outline" size="sm" className="border-emerald-500 text-emerald-700 hover:bg-emerald-50" onClick={() => {
                  setExpandedAsignaturas(new Set());
                }}>
                  Colapsar todo
                </Button>
              </div>
              {(() => {
                // Agrupar asignaturas del seguimiento por nivel
                const grupos: Record<string, AsignaturaConDocentes[]> = {};
                for (const asig of seguimiento.asignaturas) {
                  const k = asig.nivel || 'Sin nivel';
                  if (!grupos[k]) grupos[k] = [];
                  grupos[k].push(asig);
                }
                const nivelesOrdenados = Object.keys(grupos).sort((a, b) => {
                  if (a === 'Sin nivel') return 1;
                  if (b === 'Sin nivel') return -1;
                  const romanos: Record<string, number> = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
                  const num = (s: string) => { const m = s.match(/(\d+|[IVX]+)/i); if (!m) return 0; const v = m[1].toUpperCase(); return romanos[v] || parseInt(v) || 0; };
                  return num(a) - num(b);
                });

                return nivelesOrdenados.map(nivel => (
                  <Card key={nivel} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 py-3">
                      <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
                        <GraduationCap className="h-4 w-4" />
                        {nivel}
                        <Badge variant="secondary" className="ml-1">{grupos[nivel].length} asignaturas</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {grupos[nivel].map((asig) => {
                        const expanded = expandedAsignaturas.has(asig.id);
                        const todosListo = asig.stats.con_syllabus === asig.stats.total_docentes && asig.stats.con_programa === asig.stats.total_docentes;
                        const ningunoDio = asig.stats.con_syllabus === 0 && asig.stats.con_programa === 0;
                        const headerBg = todosListo ? 'bg-emerald-50' : ningunoDio && asig.stats.total_docentes > 0 ? 'bg-red-50' : 'bg-amber-50';

                        return (
                          <div key={asig.id} className="border-t first:border-t-0">
                            {/* Fila-resumen de materia (clickeable para expandir) */}
                            <button
                              onClick={() => toggleExpandAsignatura(asig.id)}
                              className={`w-full text-left px-5 py-4 flex items-center gap-4 hover:brightness-95 transition-all ${headerBg}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-gray-900">{asig.nombre}</span>
                                  <Badge variant="outline" className="text-xs">{asig.codigo}</Badge>
                                </div>
                                <div className="flex items-center gap-5 mt-2 text-sm">
                                  <span className="flex items-center gap-1 text-blue-700">
                                    <Users className="h-3.5 w-3.5" />
                                    {asig.stats.total_docentes} docente{asig.stats.total_docentes !== 1 ? 's' : ''}
                                  </span>
                                  <span className={`flex items-center gap-1 ${asig.stats.con_syllabus === asig.stats.total_docentes && asig.stats.total_docentes > 0 ? 'text-emerald-700' : 'text-orange-600'}`}>
                                    <ClipboardCheck className="h-3.5 w-3.5" />
                                    Syllabus: {asig.stats.con_syllabus}/{asig.stats.total_docentes}
                                  </span>
                                  <span className={`flex items-center gap-1 ${asig.stats.con_programa === asig.stats.total_docentes && asig.stats.total_docentes > 0 ? 'text-purple-700' : 'text-orange-600'}`}>
                                    <ClipboardList className="h-3.5 w-3.5" />
                                    Programa: {asig.stats.con_programa}/{asig.stats.total_docentes}
                                  </span>
                                </div>
                              </div>
                              {/* Barra de progreso compacta */}
                              {asig.stats.total_docentes > 0 && (
                                <div className="hidden sm:flex flex-col gap-1 w-28 flex-shrink-0">
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <span>S</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(asig.stats.con_syllabus / asig.stats.total_docentes) * 100}%` }} />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <span>P</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(asig.stats.con_programa / asig.stats.total_docentes) * 100}%` }} />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {expanded ? <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" /> : <ChevronRightIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                            </button>

                            {/* Panel expandido: lista de docentes */}
                            {expanded && (
                              <div className="bg-white border-t divide-y divide-gray-100">
                                {asig.stats.total_docentes === 0 ? (
                                  <div className="flex items-center gap-2 px-8 py-4 text-sm text-gray-400">
                                    <Users className="h-4 w-4" />
                                    No hay docentes asignados a esta materia
                                  </div>
                                ) : (
                                  asig.docentes.map((doc) => (
                                    <div key={doc.profesor_id} className="flex items-center gap-4 px-8 py-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 text-sm">{doc.nombres} {doc.apellidos}</p>
                                        <p className="text-xs text-gray-400">{doc.email}</p>
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap justify-end">
                                        {/* Syllabus */}
                                        {doc.tiene_syllabus ? (
                                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Syllabus
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-gray-400 gap-1">
                                            <XCircle className="h-3 w-3" /> Sin syllabus
                                          </Badge>
                                        )}
                                        {/* Programa */}
                                        {doc.tiene_programa ? (
                                          <Badge className="bg-purple-100 text-purple-800 border border-purple-300 gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Programa
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-gray-400 gap-1">
                                            <XCircle className="h-3 w-3" /> Sin programa
                                          </Badge>
                                        )}
                                        {/* Link para ver el syllabus del docente si existe */}
                                        {doc.tiene_syllabus && doc.syllabus_id && (
                                          <Link href={`/dashboard/comision/ver-syllabus-docente?id=${doc.syllabus_id}&profesor=${doc.profesor_id}`}>
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800">
                                              <Eye className="h-3 w-3 mr-1" /> Ver syllabus
                                            </Button>
                                          </Link>
                                        )}
                                        {doc.tiene_programa && doc.programa_id && (
                                          <Link href={`/dashboard/comision/ver-programa-docente?id=${doc.programa_id}&profesor=${doc.profesor_id}`}>
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-purple-600 hover:text-purple-800">
                                              <Eye className="h-3 w-3 mr-1" /> Ver programa
                                            </Button>
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de confirmación de eliminación */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {confirmEliminar.tipo === 'programa' ? 'Eliminar Programa Analítico' : 'Eliminar Syllabus'}
              </h2>
            </div>
            <p className="text-gray-600 mb-2">
              ¿Está seguro de que desea eliminar {confirmEliminar.tipo === 'programa' ? 'el programa analítico de' : 'el syllabus de'}:
            </p>
            <p className="font-semibold text-gray-900 mb-4">"{confirmEliminar.nombre}"</p>
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-6">
              Esta acción no se puede deshacer. Podrá crear uno nuevo después.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  confirmEliminar.tipo === 'programa'
                    ? eliminarPrograma(confirmEliminar.id)
                    : eliminarSyllabus(confirmEliminar.id, confirmEliminar.asignaturaId, confirmEliminar.source!)
                }
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModuloGuard>
  );
}
