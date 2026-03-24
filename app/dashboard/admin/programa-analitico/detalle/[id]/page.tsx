"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface SeccionTabla {
  id?: number;
  nombre: string;
  tipo: string;
  contenido_texto?: string;
  encabezados?: string[];
  datos?: any[];
}

interface ProgramaDetalle {
  id: number;
  nombre: string;
  datos_tabla: {
    archivo_excel?: string;
    archivo_escudo?: string | null;
    datos_generales?: Record<string, any>;
    [key: string]: any; // Para capturar todas las demás secciones
  };
  createdAt: string;
  updatedAt: string;
  creador?: {
    nombres: string;
    apellidos: string;
    correo_electronico: string;
  };
  plantilla_id?: number;
  tiene_datos_tablas?: boolean;
  secciones_tablas_relacionales?: SeccionTabla[];
}

export default function DetalleProgramaAnaliticoPage() {
  const params = useParams();
  const router = useRouter();
  const { token, getToken } = useAuth();
  const [programa, setPrograma] = useState<ProgramaDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPrograma();
  }, [params.id]);

  const cargarPrograma = async () => {
    try {
      const currentToken = token || getToken();
      const response = await fetch(
        `http://localhost:4000/api/programas-analiticos/${params.id}`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        console.log("🔍 Respuesta completa del backend:", responseData);
        
        // El backend retorna { success: true, data: {...programa} }
        const programaData = responseData.data || responseData;
        
        console.log("🔍 Datos del programa:", programaData);
        console.log("🔍 tiene_datos_tablas:", programaData.tiene_datos_tablas);
        console.log("🔍 secciones_tablas_relacionales:", programaData.secciones_tablas_relacionales);
        console.log("🔍 datos_tabla:", programaData.datos_tabla);
        
        setPrograma(programaData);
      } else {
        console.error("❌ Error en respuesta:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("❌ Error al cargar programa:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderSeccionTabla = (seccion: any) => {
    return (
      <Card key={seccion.id} className="border-2 border-emerald-200">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardTitle className="text-lg text-[#00563F] uppercase font-bold">
            🔥 {seccion.nombre}
          </CardTitle>
          <CardDescription className="text-xs text-emerald-700">
            Datos guardados en tabla relacional
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {seccion.tipo === 'texto_largo' && seccion.contenido_texto ? (
            <div className="bg-white p-4 rounded border">
              <p className="whitespace-pre-wrap">{seccion.contenido_texto}</p>
            </div>
          ) : seccion.tipo === 'tabla' && seccion.datos && seccion.datos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-emerald-100">
                    {seccion.encabezados?.map((enc: string, idx: number) => (
                      <th key={idx} className="border border-emerald-300 px-3 py-2 text-left text-sm font-semibold text-[#00563F]">
                        {enc}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seccion.datos.map((fila: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.entries(fila)
                        .filter(([key]) => key !== '_orden')
                        .map(([key, value], colIdx) => (
                          <td key={colIdx} className="border border-gray-300 px-3 py-2 text-sm">
                            {String(value)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">Sin datos</p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Renderizar secciones del JSONB de forma SIMPLE (solo títulos y contenido legible)
  const renderSeccionSimple = (titulo: string, datos: any) => {
    if (!datos || (typeof datos === 'object' && Object.keys(datos).length === 0)) {
      return null;
    }

    // Si es un array (como unidades temáticas)
    if (Array.isArray(datos)) {
      return (
        <Card key={titulo} className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl text-blue-900 uppercase font-bold">
              {titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {datos.length === 0 ? (
              <p className="text-gray-500 italic">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {datos.map((item: any, index: number) => {
                  // Si es string, mostrarlo directamente
                  if (typeof item === 'string') {
                    return (
                      <div key={index} className="p-3 bg-white rounded border">
                        <p className="text-gray-800">{item}</p>
                      </div>
                    );
                  }
                  // Si es objeto con tipo='tabla', renderizar tabla
                  if (item.tipo === 'tabla' && item.encabezados && item.datos) {
                    return (
                      <div key={index} className="overflow-x-auto">
                        <h4 className="font-semibold text-blue-900 mb-2">{item.titulo || `Tabla ${index + 1}`}</h4>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-blue-100">
                              {item.encabezados.filter((h: string) => h.trim()).map((header: string, idx: number) => (
                                <th key={idx} className="border border-blue-300 px-3 py-2 text-left text-sm font-semibold">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {item.datos.map((fila: any, filaIdx: number) => (
                              <tr key={filaIdx} className="hover:bg-gray-50">
                                {Array.isArray(fila) ? (
                                  fila.filter((_, colIdx) => item.encabezados[colIdx]?.trim()).map((celda: any, colIdx: number) => (
                                    <td key={colIdx} className="border border-gray-300 px-3 py-2 text-sm">
                                      {celda || '-'}
                                    </td>
                                  ))
                                ) : (
                                  Object.entries(fila)
                                    .filter(([key]) => !key.startsWith('columna_'))
                                    .map(([key, value], colIdx) => (
                                      <td key={colIdx} className="border border-gray-300 px-3 py-2 text-sm">
                                        {String(value) || '-'}
                                      </td>
                                    ))
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  // Si es objeto normal, mostrar como texto
                  return (
                    <div key={index} className="p-3 bg-white rounded border">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // Si es un objeto simple con texto
    if (typeof datos === 'object') {
      return (
        <Card key={titulo} className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl text-blue-900 uppercase font-bold">
              {titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {Object.entries(datos).map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-4">
                  <span className="font-semibold text-gray-700 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="col-span-2 text-gray-900">
                    {value !== null && value !== undefined ? String(value) : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderCampos = (datos: Record<string, any>) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(datos).map(([key, value]) => {
          // Saltar propiedades de metadatos
          if (key === 'archivo_excel' || key === 'archivo_escudo') {
            return null;
          }

          return (
            <div key={key} className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 uppercase">
                {key.replace(/_/g, ' ')}
              </label>
              <p className="text-gray-900 bg-white p-2 rounded border">
                {value !== null && value !== undefined 
                  ? (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))
                  : 'N/A'}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center">
        <div className="text-2xl text-[#00563F]">Cargando detalles...</div>
      </div>
    );
  }

  if (!programa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600 mb-4">No se encontró el programa</p>
            <Button onClick={() => router.back()} className="w-full">
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const datosGenerales = programa.datos_tabla?.datos_generales || {};
  const fechaCreacion = new Date(programa.createdAt).toLocaleString('es-ES');
  const fechaActualizacion = new Date(programa.updatedAt).toLocaleString('es-ES');

  // Obtener todas las secciones excepto las especiales
  const seccionesDelExcel = Object.entries(programa.datos_tabla || {})
    .filter(([key]) => key !== 'archivo_excel' && key !== 'archivo_escudo' && key !== 'datos_generales');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div className="flex-1">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mb-4 border-[#00563F] text-[#00563F] hover:bg-[#00563F] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-4xl font-bold text-[#00563F] mb-2">
              {programa.nombre || 'Programa Analítico'}
            </h1>
            <div className="flex gap-4 flex-wrap mt-4">
              {programa.datos_tabla?.archivo_escudo && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  Con Escudo
                </Badge>
              )}
              {programa.plantilla_id && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <FileText className="h-3 w-3 mr-1" />
                  Plantilla ID: {programa.plantilla_id}
                </Badge>
              )}
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                Creado: {fechaCreacion}
              </Badge>
            </div>
          </div>
          <Button className="bg-[#00563F] hover:bg-[#004830] text-white">
            <Download className="h-4 w-4 mr-2" />
            Descargar Excel
          </Button>
        </div>

        {/* Información del creador */}
        {programa.creador && (
          <Card className="mb-6 border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-lg text-blue-900">Información del Creador</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nombre Completo</label>
                  <p className="text-gray-900">{programa.creador.nombres} {programa.creador.apellidos}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Correo Electrónico</label>
                  <p className="text-gray-900">{programa.creador.correo_electronico}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Última Actualización</label>
                  <p className="text-gray-900">{fechaActualizacion}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Archivos */}
        {programa.datos_tabla?.archivo_excel && (
          <Card className="mb-6 border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-lg text-purple-900">Archivos</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Archivo Excel</label>
                  <p className="text-gray-900 bg-white p-2 rounded border">{programa.datos_tabla.archivo_excel}</p>
                </div>
                {programa.datos_tabla.archivo_escudo && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Archivo Escudo</label>
                    <p className="text-gray-900 bg-white p-2 rounded border">{programa.datos_tabla.archivo_escudo}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PRIORIDAD: Datos de TABLAS RELACIONALES */}
        {programa.tiene_datos_tablas && programa.secciones_tablas_relacionales && programa.secciones_tablas_relacionales.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-4 mb-4">
              <p className="text-emerald-900 font-semibold flex items-center gap-2">
                <span className="text-2xl">✅</span>
                Mostrando datos de TABLAS RELACIONALES (nuevo formato)
              </p>
              <p className="text-sm text-emerald-700 mt-1">
                Total de secciones: {programa.secciones_tablas_relacionales.length}
              </p>
            </div>
            {programa.secciones_tablas_relacionales.map((seccion: any, idx: number) => 
              renderSeccionTabla(seccion)
            )}
          </div>
        ) : (
          <>
            {/* Fallback: Datos del JSONB (formato antiguo) */}
            {Object.keys(datosGenerales).length > 0 || seccionesDelExcel.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                  <p className="text-blue-900 font-semibold flex items-center gap-2">
                    <span className="text-2xl">ℹ️</span>
                    Mostrando datos del JSONB (formato antiguo)
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Este programa fue creado antes de las tablas relacionales. Considera volver a subirlo.
                  </p>
                </div>

                {/* Datos Generales */}
                {Object.keys(datosGenerales).length > 0 && renderSeccionSimple('Datos Generales', datosGenerales)}

                {/* Todas las demás secciones del Excel */}
                <div className="space-y-4 mt-4">
                  {seccionesDelExcel.map(([seccionNombre, seccionDatos]) => 
                    renderSeccionSimple(
                      seccionNombre.replace(/_/g, ' ').toUpperCase(),
                      seccionDatos
                    )
                  )}
                </div>
              </div>
            ) : (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    No hay datos disponibles
                  </h3>
                  <p className="text-gray-500">
                    Este programa analítico no tiene contenido guardado desde el Excel.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Por favor, sube un archivo Excel desde la opción "Subir Excel".
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
