"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface DatosGenerales {
  carrera: string;
  nivel: string;
  paralelo: string;
  asignatura: string;
  codigo: string;
  creditos: number;
  horas_semanales: number;
  periodo_academico: string;
  docente: string;
}

interface UnidadTematica {
  id: number;
  unidad_tematica: string;
  contenidos: string;
  horas_clase: number;
  horas_practicas: number;
  horas_autonomas: number;
  estrategias_metodologicas: string;
  recursos_didacticos: string;
  evaluacion: string;
  bibliografia: string;
}

export default function CrearProgramaAnaliticoPage() {
  const { token, getToken } = useAuth();
  const [activeTab, setActiveTab] = useState("datos-generales");
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Estados para datos de los catálogos
  const [organizaciones, setOrganizaciones] = useState<any[]>([]);
  const [niveles, setNiveles] = useState<any[]>([]);
  const [paralelos, setParalelos] = useState<any[]>([]);
  const [asignaturas, setAsignaturas] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [profesores, setProfesores] = useState<any[]>([]);

  // Estados para datos generales
  const [datosGenerales, setDatosGenerales] = useState<DatosGenerales>({
    carrera: "",
    nivel: "",
    paralelo: "",
    asignatura: "",
    codigo: "",
    creditos: 0,
    horas_semanales: 0,
    periodo_academico: "",
    docente: "",
  });

  // Cargar datos desde la base de datos
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const currentToken = token || getToken();
        const headers = {
          Authorization: `Bearer ${currentToken}`,
        };

        // Cargar organizaciones (carreras/facultades)
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

  // Estados para unidades temáticas
  const [unidades, setUnidades] = useState<UnidadTematica[]>([
    {
      id: 1,
      unidad_tematica: "",
      contenidos: "",
      horas_clase: 0,
      horas_practicas: 0,
      horas_autonomas: 0,
      estrategias_metodologicas: "",
      recursos_didacticos: "",
      evaluacion: "",
      bibliografia: "",
    },
  ]);

  const handleDatosGeneralesChange = (field: keyof DatosGenerales, value: string | number) => {
    setDatosGenerales((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnidadChange = (id: number, field: keyof UnidadTematica, value: string | number) => {
    setUnidades((prev) =>
      prev.map((unidad) =>
        unidad.id === id ? { ...unidad, [field]: value } : unidad
      )
    );
  };

  const agregarUnidad = () => {
    const newId = Math.max(...unidades.map((u) => u.id), 0) + 1;
    setUnidades((prev) => [
      ...prev,
      {
        id: newId,
        unidad_tematica: "",
        contenidos: "",
        horas_clase: 0,
        horas_practicas: 0,
        horas_autonomas: 0,
        estrategias_metodologicas: "",
        recursos_didacticos: "",
        evaluacion: "",
        bibliografia: "",
      },
    ]);
  };

  const eliminarUnidad = (id: number) => {
    if (unidades.length > 1) {
      setUnidades((prev) => prev.filter((unidad) => unidad.id !== id));
    } else {
      alert("Debe haber al menos una unidad temática");
    }
  };

  const handleGuardar = async () => {
    // Validar datos generales
    if (!datosGenerales.asignatura || !datosGenerales.codigo) {
      alert("Por favor complete al menos la asignatura y el código");
      return;
    }

    setGuardando(true);
    setGuardadoExitoso(false);

    try {
      const currentToken = token || getToken();
      
      // Preparar datos para enviar
      const payload = {
        nombre: datosGenerales.asignatura,
        datos_tabla: {
          datos_generales: datosGenerales,
          unidades_tematicas: unidades,
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
        
        // Limpiar formulario
        setDatosGenerales({
          carrera: "",
          nivel: "",
          paralelo: "",
          asignatura: "",
          codigo: "",
          creditos: 0,
          horas_semanales: 0,
          periodo_academico: "",
          docente: "",
        });
        setUnidades([
          {
            id: 1,
            unidad_tematica: "",
            contenidos: "",
            horas_clase: 0,
            horas_practicas: 0,
            horas_autonomas: 0,
            estrategias_metodologicas: "",
            recursos_didacticos: "",
            evaluacion: "",
            bibliografia: "",
          },
        ]);
        setActiveTab("datos-generales");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[#00563F] mb-2">
            Crear Programa Analítico
          </h1>
          <p className="text-gray-600">
            Complete el formulario por pestañas para crear el programa analítico
          </p>
        </div>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="border-b bg-white pb-4">
            <CardDescription className="text-sm text-gray-600">
              Organice la información en pestañas para facilitar el llenado
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 rounded-none border-b bg-white h-auto p-0">
                <TabsTrigger 
                  value="datos-generales" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00563F] data-[state=active]:bg-white text-base py-4 font-medium"
                >
                  1. Datos Generales
                </TabsTrigger>
                <TabsTrigger 
                  value="unidades" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00563F] data-[state=active]:bg-white text-base py-4 font-medium"
                >
                  2. Unidades Temáticas
                </TabsTrigger>
              </TabsList>

              {/* PESTAÑA 1: DATOS GENERALES */}
              <TabsContent value="datos-generales" className="p-8 space-y-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="carrera" className="text-sm font-medium text-gray-700">
                      Carrera *
                    </Label>
                    <Select
                      value={datosGenerales.carrera}
                      onValueChange={(value) => handleDatosGeneralesChange("carrera", value)}
                      disabled={cargando}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccione una carrera" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizaciones.map((org) => (
                          <SelectItem key={org.id} value={org.nombre}>
                            {org.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nivel" className="text-sm font-medium text-gray-700">
                      Nivel *
                    </Label>
                    <Select
                      value={datosGenerales.nivel}
                      onValueChange={(value) => handleDatosGeneralesChange("nivel", value)}
                      disabled={cargando}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccione un nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        {niveles.map((nivel) => (
                          <SelectItem key={nivel.id} value={nivel.nombre}>
                            {nivel.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paralelo" className="text-sm font-medium text-gray-700">
                      Paralelo
                    </Label>
                    <Select
                      value={datosGenerales.paralelo}
                      onValueChange={(value) => handleDatosGeneralesChange("paralelo", value)}
                      disabled={cargando}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccione un paralelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {paralelos.map((paralelo) => (
                          <SelectItem key={paralelo.id} value={paralelo.nombre}>
                            {paralelo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asignatura" className="text-sm font-medium text-gray-700">
                      Asignatura *
                    </Label>
                    <Select
                      value={datosGenerales.asignatura}
                      onValueChange={(value) => {
                        handleDatosGeneralesChange("asignatura", value);
                        // Auto-llenar código si existe
                        const asignaturaSeleccionada = asignaturas.find(a => a.nombre === value);
                        if (asignaturaSeleccionada?.codigo) {
                          handleDatosGeneralesChange("codigo", asignaturaSeleccionada.codigo);
                        }
                      }}
                      disabled={cargando}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccione una asignatura" />
                      </SelectTrigger>
                      <SelectContent>
                        {asignaturas.map((asig) => (
                          <SelectItem key={asig.id} value={asig.nombre}>
                            {asig.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="codigo" className="text-sm font-medium text-gray-700">
                      Código *
                    </Label>
                    <Input
                      id="codigo"
                      value={datosGenerales.codigo}
                      onChange={(e) => handleDatosGeneralesChange("codigo", e.target.value)}
                      placeholder="PROG101"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="creditos" className="text-sm font-medium text-gray-700">
                      Créditos
                    </Label>
                    <Input
                      id="creditos"
                      type="number"
                      value={datosGenerales.creditos}
                      onChange={(e) => handleDatosGeneralesChange("creditos", parseInt(e.target.value) || 0)}
                      placeholder="4"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horas_semanales" className="text-sm font-medium text-gray-700">
                      Horas Semanales
                    </Label>
                    <Input
                      id="horas_semanales"
                      type="number"
                      value={datosGenerales.horas_semanales}
                      onChange={(e) =>
                        handleDatosGeneralesChange("horas_semanales", parseInt(e.target.value) || 0)
                      }
                      placeholder="5"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodo_academico" className="text-sm font-medium text-gray-700">
                      Periodo Académico
                    </Label>
                    <Select
                      value={datosGenerales.periodo_academico}
                      onValueChange={(value) =>
                        handleDatosGeneralesChange("periodo_academico", value)
                      }
                      disabled={cargando}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccione un periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem key={periodo.id} value={periodo.nombre}>
                            {periodo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="docente" className="text-sm font-medium text-gray-700">
                      Docente
                    </Label>
                    <Select
                      value={datosGenerales.docente}
                      onValueChange={(value) => handleDatosGeneralesChange("docente", value)}
                      disabled={cargando}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccione un docente" />
                      </SelectTrigger>
                      <SelectContent>
                        {profesores.map((profesor) => (
                          <SelectItem 
                            key={profesor.id} 
                            value={`${profesor.nombres} ${profesor.apellidos}`}
                          >
                            {profesor.nombres} {profesor.apellidos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

              {/* PESTAÑA 2: UNIDADES TEMÁTICAS */}
              <TabsContent value="unidades" className="p-8 space-y-6">
                {unidades.map((unidad, index) => (
                  <Card key={unidad.id} className="border-2 border-gray-200">
                    <CardHeader className="bg-gray-50">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg text-[#00563F]">
                          Unidad {index + 1}
                        </CardTitle>
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
                      <div className="space-y-2">
                        <Label>Nombre de la Unidad Temática *</Label>
                        <Input
                          value={unidad.unidad_tematica}
                          onChange={(e) =>
                            handleUnidadChange(unidad.id, "unidad_tematica", e.target.value)
                          }
                          placeholder="Unidad 1: Introducción a la Programación"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Contenidos *</Label>
                        <Textarea
                          value={unidad.contenidos}
                          onChange={(e) =>
                            handleUnidadChange(unidad.id, "contenidos", e.target.value)
                          }
                          placeholder="Variables, tipos de datos, operadores, estructuras de control..."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Horas Clase</Label>
                          <Input
                            type="number"
                            value={unidad.horas_clase}
                            onChange={(e) =>
                              handleUnidadChange(unidad.id, "horas_clase", parseInt(e.target.value) || 0)
                            }
                            placeholder="8"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Horas Prácticas</Label>
                          <Input
                            type="number"
                            value={unidad.horas_practicas}
                            onChange={(e) =>
                              handleUnidadChange(
                                unidad.id,
                                "horas_practicas",
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Horas Autónomas</Label>
                          <Input
                            type="number"
                            value={unidad.horas_autonomas}
                            onChange={(e) =>
                              handleUnidadChange(
                                unidad.id,
                                "horas_autonomas",
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="20"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Estrategias Metodológicas</Label>
                        <Textarea
                          value={unidad.estrategias_metodologicas}
                          onChange={(e) =>
                            handleUnidadChange(
                              unidad.id,
                              "estrategias_metodologicas",
                              e.target.value
                            )
                          }
                          placeholder="Clases magistrales, laboratorios prácticos, trabajo en equipo..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Recursos Didácticos</Label>
                        <Textarea
                          value={unidad.recursos_didacticos}
                          onChange={(e) =>
                            handleUnidadChange(unidad.id, "recursos_didacticos", e.target.value)
                          }
                          placeholder="Computadora, proyector, IDE, material didáctico..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Evaluación</Label>
                        <Textarea
                          value={unidad.evaluacion}
                          onChange={(e) =>
                            handleUnidadChange(unidad.id, "evaluacion", e.target.value)
                          }
                          placeholder="Examen parcial 30%, Laboratorios 40%, Proyecto 30%..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Bibliografía</Label>
                        <Textarea
                          value={unidad.bibliografia}
                          onChange={(e) =>
                            handleUnidadChange(unidad.id, "bibliografia", e.target.value)
                          }
                          placeholder="Deitel, P. (2020). Java How to Program. Pearson..."
                          rows={2}
                        />
                      </div>
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
                  <Button
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="bg-[#00563F] hover:bg-[#004830] px-8"
                  >
                    {guardando ? (
                      <>Guardando...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Programa Analítico
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {guardadoExitoso && (
              <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">¡Guardado exitoso!</p>
                  <p className="text-sm text-green-700">
                    El programa analítico se ha guardado correctamente en la base de datos
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
