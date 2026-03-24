'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface TituloDetectado {
  numero: number;
  titulo: string;
  tipo: string;
  fila: number;
  columna: number;
  columnaLetra: string;
  textoOriginal: string;
  textoLimpio: string;
}

interface ResultadoExtraccion {
  sessionId?: string;
  tipoArchivo: string;
  nombreArchivo: string;
  totalFilas: number;
  totalTitulos: number;
  titulos: TituloDetectado[];
  guardadoEnBD?: boolean;
}

export function ExtractorTitulosModal() {
  const [open, setOpen] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoExtraccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setResultado(null);
      setError(null);
    }
  };

  const handleExtraer = async () => {
    if (!archivo) {
      setError('Selecciona un archivo primero');
      return;
    }

    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);

      const response = await fetch('http://localhost:4000/api/programa-analitico/extraer-titulos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setResultado(data.data);
      } else {
        setError(data.message || 'Error al extraer títulos');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'cabecera':
        return 'default';
      case 'datos_generales':
        return 'secondary';
      case 'texto_largo':
        return 'outline';
      case 'tabla':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Extraer Títulos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 Extractor de Títulos - Excel/Word</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de archivo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Selecciona un archivo Excel (.xlsx) o Word (.docx)
            </label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls,.docx,.doc"
                onChange={handleFileChange}
                disabled={loading}
              />
              <Button
                onClick={handleExtraer}
                disabled={!archivo || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extrayendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Extraer
                  </>
                )}
              </Button>
            </div>
            {archivo && (
              <p className="text-xs text-muted-foreground">
                Archivo seleccionado: {archivo.name} ({(archivo.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Resultado */}
          {resultado && (
            <div className="space-y-4">
              {/* Mensaje de éxito con guardado en BD */}
              {resultado.guardadoEnBD && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✅ <strong>¡Guardado exitosamente!</strong> Se detectaron y guardaron <strong>{resultado.totalTitulos}</strong> títulos en {resultado.totalFilas} filas.
                    {resultado.sessionId && (
                      <span className="block mt-1 text-xs">
                        ID de sesión: <code className="bg-green-100 px-1 py-0.5 rounded">{resultado.sessionId}</code>
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!resultado.guardadoEnBD && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ✅ Se detectaron <strong>{resultado.totalTitulos}</strong> títulos en {resultado.totalFilas} filas
                  </AlertDescription>
                </Alert>
              )}

              {/* Información del archivo */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{resultado.tipoArchivo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Archivo</p>
                  <p className="font-medium text-sm truncate">{resultado.nombreArchivo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Títulos detectados</p>
                  <p className="font-medium">{resultado.totalTitulos}</p>
                </div>
              </div>

              {/* Lista de títulos */}
              <div className="space-y-2">
                <h3 className="font-semibold">Títulos detectados:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {resultado.titulos.map((titulo) => (
                    <div
                      key={titulo.numero}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              #{titulo.numero}
                            </span>
                            <h4 className="font-semibold">{titulo.titulo}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>📍 Fila {titulo.fila}</span>
                            <span>📊 Columna {titulo.columnaLetra} ({titulo.columna})</span>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            <strong>Original:</strong> "{titulo.textoOriginal}"
                          </p>
                          {titulo.textoLimpio && titulo.textoLimpio !== titulo.textoOriginal && (
                            <p className="text-xs text-muted-foreground italic">
                              <strong>Limpio:</strong> "{titulo.textoLimpio}"
                            </p>
                          )}
                        </div>
                        <Badge variant={getTipoBadgeVariant(titulo.tipo)}>
                          {titulo.tipo}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen por tipo */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Resumen por tipo:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['cabecera', 'datos_generales', 'texto_largo', 'tabla'].map((tipo) => {
                    const count = resultado.titulos.filter(t => t.tipo === tipo).length;
                    return count > 0 ? (
                      <div key={tipo} className="flex items-center gap-2">
                        <Badge variant={getTipoBadgeVariant(tipo)} className="text-xs">
                          {tipo}
                        </Badge>
                        <span className="text-sm">{count}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
