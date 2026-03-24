"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, 
  FileText, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  School,
  GraduationCap,
  List,
  AlertCircle,
  Plus,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Asignatura {
  id: number;
  nombre: string;
  codigo: string;
  estado: string;
  nivel: string | null;
  organizacion: string | null;
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

export default function AsignaturasComisionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [estructura, setEstructura] = useState<EstructuraFacultad | null>(null);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('');

  useEffect(() => {
    cargarPeriodos();
  }, []);

  // Recargar estructura cuando cambia el periodo seleccionado
  useEffect(() => {
    cargarEstructura();
  }, [periodoSeleccionado]);

  const cargarPeriodos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datos-academicos/periodos`, {
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
          `${process.env.NEXT_PUBLIC_API_URL}/comision-academica/syllabus/buscar?asignatura_id=${asignaturaId}&periodo=${periodoSeleccionado}`,
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

      // 2) Verificar en tabla general (admin)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/syllabi/verificar-existencia?periodo=${periodoSeleccionado}&asignatura_id=${asignaturaId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.existe) {
        const confirmar = confirm(
          `⚠️ Ya existe un syllabus para "${asignaturaNombre}" en este periodo.\n\n` +
          `Syllabus existente: ${data.syllabus.nombre}\n` +
          `Fecha de creación: ${new Date(data.syllabus.fecha_creacion).toLocaleDateString()}\n\n` +
          `¿Desea eliminarlo para subir uno nuevo?`
        );

        if (confirmar) {
          await eliminarSyllabus(data.syllabus.id);
          // Después de eliminar, redirigir a crear
          router.push(`/dashboard/comision/editor-syllabus?asignatura=${asignaturaId}&periodo=${periodoSeleccionado}&nueva=true`);
        } else {
          // Ver el existente
          router.push(`/dashboard/comision/editor-syllabus?id=${data.syllabus.id}&asignatura=${asignaturaId}&periodo=${periodoSeleccionado}&source=general`);
        }
      } else {
        // No existe en ninguna tabla, crear nuevo
        router.push(`/dashboard/comision/editor-syllabus?asignatura=${asignaturaId}&periodo=${periodoSeleccionado}&nueva=true`);
      }
    } catch (err: any) {
      console.error('Error al verificar:', err);
      alert('❌ Error al verificar syllabus: ' + err.message);
    }
  };

  const eliminarSyllabus = async (syllabusId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/syllabi/${syllabusId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('✅ Syllabus eliminado correctamente');
        await cargarEstructura(); // Recargar datos
      } else {
        throw new Error('Error al eliminar syllabus');
      }
    } catch (err: any) {
      console.error('Error:', err);
      alert('❌ Error al eliminar: ' + err.message);
    }
  };

  const cargarEstructura = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const urlParams = periodoSeleccionado ? `?periodo=${periodoSeleccionado}` : '';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/comision-academica/estructura-facultad${urlParams}`, {
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
    <div className="p-6 space-y-6">
      {/* Header */}
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
      {carreraActual && (
        <div className="space-y-4">
          {agruparPorNivel(carreraActual.asignaturas).map((grupo) => (
            <Card key={grupo.nivel}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <GraduationCap className="h-5 w-5" />
                  {grupo.nivel}
                </CardTitle>
                <CardDescription>
                  {grupo.asignaturas.length} asignatura{grupo.asignaturas.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
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
                        
                        <div className="flex gap-2">
                          {asignatura.tiene_syllabus ? (
                            <Link href={`/dashboard/comision/editor-syllabus?id=${asignatura.syllabus_id}&asignatura=${asignatura.id}&periodo=${periodoSeleccionado}&source=${asignatura.syllabus_source || 'comision'}`}>
                              <Button size="sm" variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Ver Syllabus
                              </Button>
                            </Link>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => verificarYCrearSyllabus(asignatura.id, asignatura.nombre)}
                              disabled={!periodoSeleccionado}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Crear Syllabus
                            </Button>
                          )}
                          
                          {asignatura.tiene_programa ? (
                            <Link href={`/dashboard/comision/crear-programa-analitico?id=${asignatura.programa_id}&asignatura=${asignatura.id}&periodo=${periodoSeleccionado}`}>
                              <Button size="sm" variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Ver Programa
                              </Button>
                            </Link>
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
              </CardContent>
            </Card>
          ))}
          
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
    </div>
  );
}
