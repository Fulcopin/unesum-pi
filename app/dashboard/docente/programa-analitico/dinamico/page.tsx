"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function CrearProgramaAnaliticoDinamicoPage() {
  const { token, getToken } = useAuth();
  const [activeTab, setActiveTab] = useState("datos-generales");
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Estados para estructura del formulario
  const [camposDatosGenerales, setCamposDatosGenerales] = useState<string[]>([]);
  const [camposUnidades, setCamposUnidades] = useState<string[]>([]);
  const [seccionesTablas, setSeccionesTablas] = useState<Array<{titulo: string, tipo: string, campos: string[], encabezados?: string[]}>>([]);

  // Estados para datos de los catálogos
  const [organizaciones, setOrganizaciones] = useState<any[]>([]);
  const [niveles, setNiveles] = useState<any[]>([]);
  const [paralelos, setParalelos] = useState<any[]>([]);
  const [asignaturas, setAsignaturas] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [profesores, setProfesores] = useState<any[]>([]);

  // Estados dinámicos para datos generales
  const [datosGenerales, setDatosGenerales] = useState<Record<string, any>>({});

  // Estados para unidades temáticas
  const [unidades, setUnidades] = useState<Array<Record<string, any>>>([
    { id: 1 }
  ]);

  // Estados para tablas adicionales (secciones)
  const [tablasAdicionales, setTablasAdicionales] = useState<Record<string, Array<Record<string, any>>>>({});

  // Cargar estructura y catálogos desde la base de datos
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const currentToken = token || getToken();
        const headers = {
          Authorization: `Bearer ${currentToken}`,
        };

        // Cargar estructura del formulario
        const estructuraRes = await fetch("http://localhost:4000/api/programa-analitico/estructura-formulario", { headers });
        if (estructuraRes.ok) {
          const estructuraData = await estructuraRes.json();
          console.log('📋 Estructura recibida:', estructuraData);
          
          if (estructuraData.success) {
            setCamposDatosGenerales(estructuraData.data.campos_datos_generales || []);
            setCamposUnidades(estructuraData.data.campos_unidades || []);
            setSeccionesTablas(estructuraData.data.secciones_tablas || []);
            
            // Inicializar datos generales con campos vacíos
            const datosIniciales: Record<string, any> = {};
            estructuraData.data.campos_datos_generales.forEach((campo: string) => {
              datosIniciales[campo] = '';
            });
            setDatosGenerales(datosIniciales);

            // Inicializar primera unidad con campos vacíos
            const unidadInicial: Record<string, any> = { id: 1 };
            estructuraData.data.campos_unidades.forEach((campo: string) => {
              unidadInicial[campo] = '';
            });
            setUnidades([unidadInicial]);

            // Inicializar tablas adicionales
            const tablasInit: Record<string, Array<Record<string, any>>> = {};
            (estructuraData.data.secciones_tablas || []).forEach((seccion: any) => {
              const filaInicial: Record<string, any> = { id: 1 };
              seccion.campos.forEach((campo: string) => {
                filaInicial[campo] = '';
              });
              tablasInit[seccion.titulo] = [filaInicial];
            });
            setTablasAdicionales(tablasInit);
          }
        }

        // Cargar organizaciones
        const orgRes = await fetch("http://localhost:4000/api/organizacion", { headers });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganizaciones(orgData.data || orgData);
        }

        // Cargar niveles
        const nivRes = await fetch("http://localhost:4000/api/nivel", { headers });
        if (nivRes.ok) {
          const nivData = await nivRes.json();
          setNiveles(nivData.data || nivData);
        }

        // Cargar paralelos
        const parRes = await fetch("http://localhost:4000/api/paralelo", { headers });
        if (parRes.ok) {
          const parData = await parRes.json();
          setParalelos(parData.data || parData);
        }

        // Cargar asignaturas
        const asigRes = await fetch("http://localhost:4000/api/asignaturas", { headers });
        if (asigRes.ok) {
          const asigData = await asigRes.json();
          setAsignaturas(asigData.data || asigData);
        }

        // Cargar periodos
        const perRes = await fetch("http://localhost:4000/api/periodo", { headers });
        if (perRes.ok) {
          const perData = await perRes.json();
          setPeriodos(perData.data || perData);
        }

        // Cargar profesores
        const profRes = await fetch("http://localhost:4000/api/profesor", { headers });
        if (profRes.ok) {
          const profData = await profRes.json();
          setProfesores(profData.data || profData);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [token, getToken]);

  const handleDatosGeneralesChange = (campo: string, value: any) => {
    setDatosGenerales((prev) => ({ ...prev, [campo]: value }));
  };

  const handleUnidadChange = (id: number, campo: string, value: any) => {
    setUnidades((prev) =>
      prev.map((unidad) =>
        unidad.id === id ? { ...unidad, [campo]: value } : unidad
      )
    );
  };

  const agregarUnidad = () => {
    const newId = Math.max(...unidades.map((u) => u.id), 0) + 1;
    const nuevaUnidad: Record<string, any> = { id: newId };
    camposUnidades.forEach(campo => {
      nuevaUnidad[campo] = '';
    });
    setUnidades((prev) => [...prev, nuevaUnidad]);
  };

  const eliminarUnidad = (id: number) => {
    if (unidades.length > 1) {
      setUnidades((prev) => prev.filter((unidad) => unidad.id !== id));
    } else {
      alert("Debe haber al menos una unidad temática");
    }
  };

  // Funciones para tablas adicionales
  const handleTablaChange = (titulo: string, id: number, campo: string, value: any) => {
    setTablasAdicionales((prev) => ({
      ...prev,
      [titulo]: prev[titulo].map((fila) =>
        fila.id === id ? { ...fila, [campo]: value } : fila
      )
    }));
  };

  const agregarFilaTabla = (titulo: string, campos: string[]) => {
    setTablasAdicionales((prev) => {
      const filas = prev[titulo] || [];
      const newId = Math.max(...filas.map((f) => f.id), 0) + 1;
      const nuevaFila: Record<string, any> = { id: newId };
      campos.forEach(campo => {
        nuevaFila[campo] = '';
      });
      return {
        ...prev,
        [titulo]: [...filas, nuevaFila]
      };
    });
  };

  const eliminarFilaTabla = (titulo: string, id: number) => {
    setTablasAdicionales((prev) => {
      const filas = prev[titulo] || [];
      if (filas.length > 1) {
        return {
          ...prev,
          [titulo]: filas.filter((fila) => fila.id !== id)
        };
      }
      alert("Debe haber al menos una fila");
      return prev;
    });
  };

  const obtenerLabelCampo = (campo: string): string => {
    const labels: Record<string, string> = {
      carrera: 'Carrera',
      nivel: 'Nivel',
      paralelo: 'Paralelo',
      asignatura: 'Asignatura',
      codigo: 'Código',
      creditos: 'Créditos',
      horas_semanales: 'Horas Semanales',
      periodo_academico: 'Periodo Académico',
      docente: 'Docente',
      unidad_tematica: 'Unidad Temática',
      contenidos: 'Contenidos',
      horas_clase: 'Horas Clase',
      horas_practicas: 'Horas Prácticas',
      horas_autonomas: 'Horas Autónomas',
      estrategias_metodologicas: 'Estrategias Metodológicas',
      recursos_didacticos: 'Recursos Didácticos',
      evaluacion: 'Evaluación',
      bibliografia: 'Bibliografía'
    };
    return labels[campo] || campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const esNumerico = (campo: string): boolean => {
    return ['creditos', 'horas_semanales', 'horas_clase', 'horas_practicas', 'horas_autonomas'].includes(campo);
  };

  const esTextoLargo = (campo: string): boolean => {
    return ['contenidos', 'estrategias_metodologicas', 'recursos_didacticos', 'evaluacion', 'bibliografia'].includes(campo);
  };

  const esCombo = (campo: string): boolean => {
    return ['carrera', 'nivel', 'paralelo', 'asignatura', 'periodo_academico', 'docente'].includes(campo);
  };

  const obtenerOpcionesCombo = (campo: string) => {
    switch(campo) {
      case 'carrera': return organizaciones;
      case 'nivel': return niveles;
      case 'paralelo': return paralelos;
      case 'asignatura': return asignaturas;
      case 'periodo_academico': return periodos;
      case 'docente': return profesores;
      default: return [];
    }
  };

  const obtenerValorOpcion = (campo: string, item: any): string => {
    if (campo === 'docente') {
      return `${item.nombres} ${item.apellidos}`;
    }
    return item.nombre || item.toString();
  };

  const renderCampoDatosGenerales = (campo: string) => {
    const label = obtenerLabelCampo(campo);
    const esRequerido = ['carrera', 'asignatura', 'codigo'].includes(campo);

    if (esCombo(campo)) {
      const opciones = obtenerOpcionesCombo(campo);
      return (
        <div key={campo} className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {label} {esRequerido && '*'}
          </Label>
          <Select
            value={datosGenerales[campo]}
            onValueChange={(value) => handleDatosGeneralesChange(campo, value)}
            disabled={cargando}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder={`Seleccione ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((item, idx) => (
                <SelectItem key={item.id || idx} value={obtenerValorOpcion(campo, item)}>
                  {obtenerValorOpcion(campo, item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={campo} className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          {label} {esRequerido && '*'}
        </Label>
        <Input
          type={esNumerico(campo) ? 'number' : 'text'}
          value={datosGenerales[campo]}
          onChange={(e) => handleDatosGeneralesChange(campo, esNumerico(campo) ? parseFloat(e.target.value) || 0 : e.target.value)}
          placeholder={label}
          className="h-11"
        />
      </div>
    );
  };

  const renderCampoUnidad = (unidad: Record<string, any>, campo: string) => {
    const label = obtenerLabelCampo(campo);

    if (esTextoLargo(campo)) {
      return (
        <div key={campo} className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">{label}</Label>
          <Textarea
            value={unidad[campo] || ''}
            onChange={(e) => handleUnidadChange(unidad.id, campo, e.target.value)}
            placeholder={label}
            rows={3}
          />
        </div>
      );
    }

    return (
      <div key={campo} className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">{label}</Label>
        <Input
          type={esNumerico(campo) ? 'number' : 'text'}
          value={unidad[campo] || ''}
          onChange={(e) => handleUnidadChange(unidad.id, campo, esNumerico(campo) ? parseFloat(e.target.value) || 0 : e.target.value)}
          placeholder={label}
          className="h-11"
        />
      </div>
    );
  };

  const renderCampoTabla = (seccion: any, fila: Record<string, any>, campo: string) => {
    const label = obtenerLabelCampo(campo);
    
    // Si la sección es tipo texto_largo y el campo es "contenido", usar textarea grande
    if (seccion.tipo === 'texto_largo' && campo === 'contenido') {
      return (
        <div key={campo} className="space-y-2 col-span-2">
          <Label className="text-sm font-medium text-gray-700">
            {seccion.titulo}
          </Label>
          <Textarea
            value={fila[campo] || ''}
            onChange={(e) => handleTablaChange(seccion.titulo, fila.id, campo, e.target.value)}
            placeholder={`Escriba el contenido de ${seccion.titulo.toLowerCase()}`}
            rows={6}
            className="w-full"
          />
        </div>
      );
    }

    const esLargo = campo.toLowerCase().includes('descripcion') || 
                    campo.toLowerCase().includes('contenido') || 
                    campo.toLowerCase().includes('observacion') ||
                    campo === 'contenido';

    if (esLargo) {
      return (
        <div key={campo} className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">{label}</Label>
          <Textarea
            value={fila[campo] || ''}
            onChange={(e) => handleTablaChange(seccion.titulo, fila.id, campo, e.target.value)}
            placeholder={label}
            rows={3}
          />
        </div>
      );
    }

    return (
      <div key={campo} className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">{label}</Label>
        <Input
          value={fila[campo] || ''}
          onChange={(e) => handleTablaChange(seccion.titulo, fila.id, campo, e.target.value)}
          placeholder={label}
          className="h-11"
        />
      </div>
    );
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setGuardadoExitoso(false);

    try {
      const currentToken = token || getToken();
      
      // Preparar tablas adicionales sin el campo id
      const tablasDatos = seccionesTablas.map(seccion => ({
        titulo: seccion.titulo,
        datos: (tablasAdicionales[seccion.titulo] || []).map(fila => {
          const { id, ...rest } = fila;
          return rest;
        })
      }));

      const payload = {
        nombre: datosGenerales.asignatura || 'Programa Analítico',
        datos_tabla: {
          datos_generales: datosGenerales,
          unidades_tematicas: unidades.map(u => {
            const { id, ...rest } = u;
            return rest;
          }),
          tablas_datos: tablasDatos,
          fecha_creacion: new Date().toISOString(),
        },
      };

      const response = await fetch("http://localhost:4000/api/programas-analiticos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGuardadoExitoso(true);
        alert("Programa analítico guardado exitosamente");
        window.location.reload();
      } else {
        alert(data.message || "Error al guardar el programa analítico");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión al servidor");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#00563F] mx-auto mb-4" />
          <p className="text-gray-600">Cargando estructura del formulario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[#00563F] mb-2">
            Crear Programa Analítico
          </h1>
          <p className="text-gray-600">
            Formulario generado dinámicamente desde la base de datos
          </p>
        </div>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-white pb-4">
            <CardDescription className="text-sm text-gray-600">
              Complete la información en pestañas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`w-full grid grid-cols-${2 + seccionesTablas.length} rounded-none border-b bg-white h-auto p-0`}>
                <TabsTrigger 
                  value="datos-generales" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00563F] data-[state=active]:bg-white text-sm py-3 font-medium"
                >
                  1. Datos Generales
                </TabsTrigger>
                <TabsTrigger 
                  value="unidades" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00563F] data-[state=active]:bg-white text-sm py-3 font-medium"
                >
                  2. Unidades Temáticas
                </TabsTrigger>
                {seccionesTablas.map((seccion, idx) => (
                  <TabsTrigger 
                    key={seccion.titulo}
                    value={`seccion-${idx}`}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00563F] data-[state=active]:bg-white text-sm py-3 font-medium"
                  >
                    {idx + 3}. {seccion.titulo}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="datos-generales" className="p-8 space-y-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {camposDatosGenerales.map(campo => renderCampoDatosGenerales(campo))}
                </div>

                <div className="flex justify-end pt-8 mt-8 border-t">
                  <Button
                    onClick={() => setActiveTab("unidades")}
                    className="bg-[#00563F] hover:bg-[#004830] h-11 px-8"
                  >
                    Siguiente: Unidades Temáticas →
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="unidades" className="p-8 space-y-6">
                {unidades.map((unidad, index) => (
                  <Card key={unidad.id} className="border-2 border-gray-200">
                    <CardHeader className="bg-gray-50">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-[#00563F]">
                          Unidad {index + 1}
                        </h3>
                        {unidades.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => eliminarUnidad(unidad.id)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {camposUnidades.map(campo => renderCampoUnidad(unidad, campo))}
                    </CardContent>
                  </Card>
                ))}

                <Button
                  onClick={agregarUnidad}
                  variant="outline"
                  className="w-full border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Otra Unidad Temática
                </Button>

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    onClick={() => setActiveTab("datos-generales")}
                    variant="outline"
                  >
                    ← Volver a Datos Generales
                  </Button>
                  {seccionesTablas.length > 0 ? (
                    <Button
                      onClick={() => setActiveTab("seccion-0")}
                      className="bg-[#00563F] hover:bg-[#004830]"
                    >
                      Siguiente: {seccionesTablas[0].titulo} →
                    </Button>
                  ) : (
                    <Button
                      onClick={handleGuardar}
                      disabled={guardando}
                      className="bg-[#00563F] hover:bg-[#004830] px-8"
                    >
                      {guardando ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Programa Analítico
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Tabs dinámicas para secciones adicionales */}
              {seccionesTablas.map((seccion, seccionIdx) => {
                const filas = tablasAdicionales[seccion.titulo] || [];
                return (
                  <TabsContent key={`seccion-${seccionIdx}`} value={`seccion-${seccionIdx}`} className="p-8 space-y-6">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-[#00563F] mb-2">{seccion.titulo}</h2>
                      <p className="text-gray-600">Complete la información de esta sección</p>
                    </div>

                    {seccion.tipo === 'texto_largo' ? (
                      /* Para secciones de texto largo, mostrar sin card ni botón eliminar */
                      <div className="space-y-4">
                        {filas.map((fila, index) => (
                          <div key={fila.id} className="space-y-4">
                            {seccion.campos.map(campo => renderCampoTabla(seccion, fila, campo))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Para tablas normales, mostrar con cards y botones */
                      <>
                        {filas.map((fila, index) => (
                          <Card key={fila.id} className="border-2 border-gray-200">
                            <CardHeader className="bg-gray-50">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-[#00563F]">
                                  Registro {index + 1}
                                </h3>
                                {filas.length > 1 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => eliminarFilaTabla(seccion.titulo, fila.id)}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Eliminar
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {seccion.campos.map(campo => renderCampoTabla(seccion, fila, campo))}
                            </CardContent>
                          </Card>
                        ))}

                        <Button
                          onClick={() => agregarFilaTabla(seccion.titulo, seccion.campos)}
                          variant="outline"
                          className="w-full border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Registro
                        </Button>
                      </>
                    )}

                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        onClick={() => setActiveTab(seccionIdx === 0 ? "unidades" : `seccion-${seccionIdx - 1}`)}
                        variant="outline"
                      >
                        ← Volver
                      </Button>
                      {seccionIdx < seccionesTablas.length - 1 ? (
                        <Button
                          onClick={() => setActiveTab(`seccion-${seccionIdx + 1}`)}
                          className="bg-[#00563F] hover:bg-[#004830]"
                        >
                          Siguiente: {seccionesTablas[seccionIdx + 1].titulo} →
                        </Button>
                      ) : (
                        <Button
                          onClick={handleGuardar}
                          disabled={guardando}
                          className="bg-[#00563F] hover:bg-[#004830] px-8"
                        >
                          {guardando ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Guardar Programa Analítico
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>

            {guardadoExitoso && (
              <div className="m-6 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">¡Guardado exitoso!</p>
                  <p className="text-sm text-green-700">
                    El programa analítico se ha guardado correctamente
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
