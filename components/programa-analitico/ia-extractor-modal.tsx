'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Download
} from 'lucide-react';

interface Seccion {
  nombre: string;
  tipo: 'texto' | 'tabla';
  contenido?: string;
  encabezados?: string[];
  filas?: string[][];
}

interface DatosExtraidos {
  secciones?: Seccion[];
  metadatos?: {
    asignatura?: string;
    periodo?: string;
    docente?: string;
    carrera?: string;
  };
  textoPlano?: string;
  parseError?: boolean;
}

interface ArchivoInfo {
  nombre: string;
  tipo: string;
  tamaño: number;
}

export default function IAExtractorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<DatosExtraidos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivoInfo, setArchivoInfo] = useState<ArchivoInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'docx', 'doc'].includes(ext || '')) {
        setError('Formato no soportado. Use archivos Excel o Word.');
        return;
      }
      setArchivo(file);
      setError(null);
      setResultado(null);
    }
  };

  const handleExtraer = async () => {
    if (!archivo) {
      setError('Seleccione un archivo primero');
      return;
    }

    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/programa-analitico/ia/extraer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al extraer datos');
      }

      setResultado(data.datos);
      setArchivoInfo(data.archivo);

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  };

  const handleCopiar = () => {
    if (resultado) {
      navigator.clipboard.writeText(JSON.stringify(resultado, null, 2));
    }
  };

  const handleDescargar = () => {
    if (resultado) {
      const blob = new Blob([JSON.stringify(resultado, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datos-extraidos-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    setArchivo(null);
    setResultado(null);
    setError(null);
    setArchivoInfo(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const renderSeccion = (seccion: Seccion, index: number) => {
    return (
      <Card key={index} className="mb-4">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {seccion.tipo === 'tabla' ? (
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
            ) : (
              <FileText className="h-4 w-4 text-blue-600" />
            )}
            {seccion.nombre}
            <Badge variant={seccion.tipo === 'tabla' ? 'default' : 'secondary'} className="ml-2">
              {seccion.tipo}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {seccion.tipo === 'texto' && seccion.contenido && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{seccion.contenido}</p>
          )}
          {seccion.tipo === 'tabla' && seccion.encabezados && seccion.filas && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {seccion.encabezados.map((enc, i) => (
                      <th key={i} className="border px-2 py-1 text-left font-medium">
                        {enc}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seccion.filas.map((fila, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {fila.map((celda, j) => (
                        <td key={j} className="border px-2 py-1">
                          {celda}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-0">
          <Sparkles className="h-4 w-4" />
          Extraer con IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Extracción con Inteligencia Artificial
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel o Word y la IA extraerá automáticamente todas las secciones y datos del documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Área de subida de archivo */}
          <div className="space-y-2">
            <Label htmlFor="archivo-ia">Archivo Excel o Word</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="archivo-ia"
                type="file"
                accept=".xlsx,.xls,.docx,.doc"
                onChange={handleFileChange}
                disabled={cargando}
                className="flex-1"
              />
              {archivo && (
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Limpiar
                </Button>
              )}
            </div>
            {archivo && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {archivo.name.match(/\.xlsx?$/i) ? (
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                ) : (
                  <FileText className="h-4 w-4 text-blue-600" />
                )}
                <span>{archivo.name}</span>
                <Badge variant="outline">{(archivo.size / 1024).toFixed(1)} KB</Badge>
              </div>
            )}
          </div>

          {/* Botón de extracción */}
          <Button
            onClick={handleExtraer}
            disabled={!archivo || cargando}
            className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {cargando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extrayendo con IA...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Extraer Datos con Google AI
              </>
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Resultados */}
          {resultado && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">¡Datos extraídos exitosamente!</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopiar} className="gap-1">
                    <Copy className="h-3 w-3" />
                    Copiar JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDescargar} className="gap-1">
                    <Download className="h-3 w-3" />
                    Descargar
                  </Button>
                </div>
              </div>

              {/* Metadatos */}
              {resultado.metadatos && (
                <Card className="bg-blue-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {resultado.metadatos.asignatura && (
                        <div>
                          <span className="font-medium">Asignatura:</span> {resultado.metadatos.asignatura}
                        </div>
                      )}
                      {resultado.metadatos.periodo && (
                        <div>
                          <span className="font-medium">Período:</span> {resultado.metadatos.periodo}
                        </div>
                      )}
                      {resultado.metadatos.docente && (
                        <div>
                          <span className="font-medium">Docente:</span> {resultado.metadatos.docente}
                        </div>
                      )}
                      {resultado.metadatos.carrera && (
                        <div>
                          <span className="font-medium">Carrera:</span> {resultado.metadatos.carrera}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Secciones */}
              {resultado.secciones && resultado.secciones.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    Secciones Encontradas
                    <Badge>{resultado.secciones.length}</Badge>
                  </h4>
                  <div className="max-h-96 overflow-y-auto">
                    {resultado.secciones.map((seccion, i) => renderSeccion(seccion, i))}
                  </div>
                </div>
              )}

              {/* Texto plano (si no se pudo parsear) */}
              {resultado.textoPlano && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Respuesta de la IA (texto plano)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                      {resultado.textoPlano}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
