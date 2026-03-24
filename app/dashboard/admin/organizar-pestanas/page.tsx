'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MainHeader } from '@/components/layout/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, FileText, Calendar, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { OrganizadorPestanas } from '@/components/programa-analitico/organizador-pestanas';

interface SesionExtraccion {
  session_id: string;
  nombre_archivo: string;
  tipo_archivo: string;
  total_titulos: number;
  created_at: string;
  titulos: any[];
  agrupadosPorTipo: {
    cabecera: any[];
    titulo_seccion: any[];
    campo: any[];
  };
}

export default function OrganizarTitulosPage() {
  const { user, token } = useAuth();
  const [sesiones, setSesiones] = useState<SesionExtraccion[]>([]);
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionExtraccion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      cargarSesiones();
    }
  }, [token]);

  const cargarSesiones = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:4000/api/programa-analitico/sesiones-extraccion', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setSesiones(data.data || []);
      } else {
        setError(data.message || 'Error al cargar sesiones');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar las sesiones de extracción');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarSesion = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:4000/api/programa-analitico/sesion-extraccion/${sessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setSesionSeleccionada(data.data);
      } else {
        setError(data.message || 'Error al cargar sesión');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar los detalles de la sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleVolverALista = () => {
    setSesionSeleccionada(null);
  };

  return (
    <ProtectedRoute>
      <MainHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard/admin" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al Dashboard
            </Link>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Settings className="h-8 w-8 text-purple-500" />
                  Organizar Formularios en Pestañas
                </h1>
                <p className="text-gray-600 mt-2">
                  Configura cómo se mostrarán los títulos extraídos en el formulario del docente
                </p>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && !sesionSeleccionada ? (
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando sesiones...</p>
                </div>
              </CardContent>
            </Card>
          ) : sesionSeleccionada ? (
            // Vista de organización
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {sesionSeleccionada.nombre_archivo}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {sesionSeleccionada.total_titulos} títulos detectados • {sesionSeleccionada.tipo_archivo}
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleVolverALista}>
                      ← Volver a la lista
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <OrganizadorPestanas
                sessionId={sesionSeleccionada.session_id}
                titulos={sesionSeleccionada.titulos}
                onGuardar={() => {
                  // Opcional: recargar datos o mostrar mensaje
                  console.log('Organización guardada');
                }}
              />
            </div>
          ) : (
            // Lista de sesiones
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sesiones de Extracción Disponibles</CardTitle>
                  <CardDescription>
                    Selecciona una sesión para organizar sus títulos en pestañas
                  </CardDescription>
                </CardHeader>
              </Card>

              {sesiones.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      No hay sesiones de extracción disponibles
                    </p>
                    <Link href="/dashboard/admin/programa-analitico">
                      <Button>
                        Extraer Títulos de Archivos
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {sesiones.map((sesion) => (
                    <Card 
                      key={sesion.session_id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => seleccionarSesion(sesion.session_id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <FileText className="h-5 w-5 text-blue-500" />
                              {sesion.nombre_archivo}
                            </CardTitle>
                            <CardDescription className="mt-2 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(sesion.created_at).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <Badge variant="outline">
                                {sesion.total_titulos} títulos
                              </Badge>
                              <Badge variant="secondary">
                                {sesion.tipo_archivo}
                              </Badge>
                            </CardDescription>
                          </div>
                          <Button 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              seleccionarSesion(sesion.session_id);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Organizar
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
