'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Eye, Trash2, Loader2, Calendar, User, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SesionExtraccion {
  session_id: string;
  nombre_archivo: string;
  tipo_archivo: string;
  total_titulos: number;
  created_at: string;
  usuario: {
    nombres: string;
    apellidos: string;
    email: string;
  };
}

interface TituloDetallado {
  id: number;
  titulo: string;
  tipo: string;
  fila: number;
  columna: number;
  columna_letra: string;
  puntuacion: number;
  caracteristicas: string;
  texto_original: string;
}

export function SesionesExtraidasList() {
  const [loading, setLoading] = useState(true);
  const [sesiones, setSesiones] = useState<SesionExtraccion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [titulos, setTitulos] = useState<TituloDetallado[]>([]);
  const [loadingTitulos, setLoadingTitulos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetchSesiones();
  }, []);

  const fetchSesiones = async () => {
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
      setError('Error de conexión con el servidor');
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (sessionId: string) => {
    try {
      setLoadingTitulos(true);
      setSelectedSession(sessionId);
      setModalOpen(true);

      const response = await fetch(`http://localhost:4000/api/programa-analitico/titulos/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setTitulos(data.data.titulos || []);
      } else {
        setError(data.message || 'Error al cargar títulos');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar detalles');
    } finally {
      setLoadingTitulos(false);
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'cabecera':
        return 'default';
      case 'titulo_seccion':
        return 'secondary';
      case 'campo':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (sesiones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extracciones Guardadas</CardTitle>
          <CardDescription>
            Historial de títulos extraídos de archivos Excel/Word
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay extracciones guardadas</p>
            <p className="text-sm">Usa el botón "Extraer Títulos" para comenzar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Extracciones Guardadas
          </CardTitle>
          <CardDescription>
            {sesiones.length} sesión(es) de extracción guardada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sesiones.map((sesion) => (
              <div
                key={sesion.session_id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold">{sesion.nombre_archivo}</h4>
                      <Badge variant="outline">{sesion.tipo_archivo}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{sesion.total_titulos} títulos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(sesion.created_at).toLocaleDateString('es-ES')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">{sesion.usuario?.nombres} {sesion.usuario?.apellidos}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {sesion.session_id}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verDetalle(sesion.session_id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalle */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Títulos Extraídos</DialogTitle>
            <DialogDescription>
              Sesión: {selectedSession}
            </DialogDescription>
          </DialogHeader>

          {loadingTitulos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {titulos.map((titulo) => (
                <div
                  key={titulo.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{titulo.titulo}</h4>
                        <Badge variant={getTipoBadgeVariant(titulo.tipo)}>
                          {titulo.tipo}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>📍 Fila {titulo.fila}</span>
                        <span>📊 Col {titulo.columna_letra}</span>
                        <span>⭐ {titulo.puntuacion} pts</span>
                      </div>
                      {titulo.caracteristicas && (
                        <p className="text-xs text-muted-foreground">
                          🔍 {titulo.caracteristicas}
                        </p>
                      )}
                      {titulo.texto_original && titulo.texto_original !== titulo.titulo && (
                        <p className="text-xs text-muted-foreground italic">
                          Original: "{titulo.texto_original}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
