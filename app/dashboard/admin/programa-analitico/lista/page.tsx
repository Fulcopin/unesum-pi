"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Trash2, Eye, Download, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface ProgramaAnalitico {
  id: number;
  nombre: string;
  datos_tabla: {
    archivo_excel: string;
    archivo_escudo: string | null;
    datos_generales: {
      carrera: string;
      nivel: string;
      asignatura: string;
      codigo: string;
      periodo_academico: string;
      docente: string;
    };
    unidades_tematicas: any[];
  };
  createdAt: string;
  creador?: {
    nombre: string;
    apellido: string;
  };
}

export default function ListaProgramasAnaliticosPage() {
  const { token, getToken } = useAuth();
  const [programas, setProgramas] = useState<ProgramaAnalitico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarProgramas();
  }, []);

  const cargarProgramas = async () => {
    try {
      const currentToken = token || getToken();
      const response = await fetch("http://localhost:4000/api/programas-analiticos", {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setProgramas(data.data);
      }
    } catch (error) {
      console.error("Error al cargar programas:", error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarPrograma = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este programa analítico?")) {
      return;
    }

    try {
      const currentToken = token || getToken();
      const response = await fetch(`http://localhost:4000/api/programas-analiticos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        alert("Programa eliminado exitosamente");
        cargarProgramas();
      } else {
        alert(data.message || "Error al eliminar");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión");
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center">
        <div className="text-2xl text-[#00563F]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-[#00563F] mb-2">Programas Analíticos</h1>
            <p className="text-gray-600">Lista de programas analíticos cargados en el sistema</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => window.location.href = "/dashboard/admin/programa-analitico/subir"}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Subir Excel
            </Button>
            <Button
              onClick={() => window.location.href = "/dashboard/admin/programa-analitico"}
              variant="outline"
              className="border-[#00563F] text-[#00563F] hover:bg-[#00563F] hover:text-white"
            >
              Volver
            </Button>
          </div>
        </div>

        {programas.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="p-12 text-center">
              <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No hay programas analíticos cargados
              </h3>
              <p className="text-gray-500 mb-4">Comience cargando su primer programa desde Excel</p>
              <Button
                onClick={() => window.location.href = "/dashboard/admin/programa-analitico"}
                className="bg-[#00563F] hover:bg-[#004830] text-white"
              >
                Cargar Programa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {programas.map((programa) => {
              // Obtener datos de forma segura
              const datosGenerales = programa.datos_tabla?.datos_generales || {}
              const asignatura = datosGenerales.asignatura || programa.nombre || 'Sin nombre'
              const codigo = datosGenerales.codigo || 'N/A'
              const carrera = datosGenerales.carrera || 'N/A'
              const nivel = datosGenerales.nivel || 'N/A'
              const periodo = datosGenerales.periodo_academico || 'N/A'
              const docente = datosGenerales.docente || 'No asignado'
              const fechaCreacion = new Date(programa.createdAt).toLocaleDateString('es-ES')
              const unidadesTematicas = programa.datos_tabla?.unidades_tematicas?.length || 0
              const archivoExcel = programa.datos_tabla?.archivo_excel || 'No disponible'

              return (
                <Card key={programa.id} className="border-2 border-emerald-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl text-[#00563F] mb-2">
                          {asignatura}
                        </CardTitle>
                        <CardDescription>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                            <div>
                              <span className="text-xs text-gray-500">Código:</span>
                              <p className="text-sm font-semibold text-gray-700">
                                {codigo}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Carrera:</span>
                              <p className="text-sm font-semibold text-gray-700">
                                {carrera}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Nivel:</span>
                              <p className="text-sm font-semibold text-gray-700">
                                {nivel}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Periodo:</span>
                              <p className="text-sm font-semibold text-gray-700">
                                {periodo}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Fecha:</span>
                              <p className="text-sm font-semibold text-gray-700">
                                {fechaCreacion}
                              </p>
                            </div>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {programa.datos_tabla?.archivo_escudo && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Con Escudo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Docente:</span>{" "}
                          {docente}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Unidades Temáticas:</span>{" "}
                          {unidadesTematicas}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Archivo:</span>{" "}
                          {archivoExcel}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Fecha de carga:</span>{" "}
                        {formatearFecha(programa.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/dashboard/admin/programa-analitico/detalle/${programa.id}`}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Descargar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => eliminarPrograma(programa.id)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
