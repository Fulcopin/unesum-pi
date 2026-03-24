"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileSpreadsheet, Image as ImageIcon, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

export default function SubirExcelPage() {
  const router = useRouter();
  const { token, getToken } = useAuth();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [escudoFile, setEscudoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['.xlsx', '.xls', '.docx'];
      const isValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (isValid) {
        setExcelFile(file);
        setError(null);
      } else {
        setError('Por favor seleccione un archivo válido (.xlsx, .xls o .docx)');
      }
    }
  };

  const handleEscudoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setEscudoFile(file);
        setError(null);
      } else {
        setError('Por favor seleccione un archivo de imagen');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!excelFile) {
      setError('Por favor seleccione un archivo (Excel o Word)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const currentToken = token || getToken();
      if (!currentToken) {
        throw new Error('No se encontró token de autenticación');
      }

      const formData = new FormData();
      formData.append('excel', excelFile);
      if (escudoFile) {
        formData.append('escudo', escudoFile);
      }

      const response = await fetch('http://localhost:4000/api/programas-analiticos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al subir el archivo');
      }

      if (data.success) {
        setSuccess(true);
        setExcelFile(null);
        setEscudoFile(null);
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push('/dashboard/admin/programa-analitico/lista');
        }, 2000);
      } else {
        throw new Error(data.message || 'Error desconocido');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir el archivo';
      setError(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4 border-[#00563F] text-[#00563F] hover:bg-[#00563F] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-4xl font-bold text-[#00563F] mb-2">
            Importar Programa Analítico
          </h1>
          <p className="text-gray-600">
            Sube un archivo Excel (.xlsx) o Word (.docx) con el formato UNESUM de programa analítico
          </p>
        </div>

        {/* Mensajes de estado */}
        {success && (
          <Card className="mb-6 border-2 border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">¡Archivo cargado exitosamente!</p>
                  <p className="text-sm">Redirigiendo a la lista de programas...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-2 border-red-500 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700">
                <XCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulario */}
        <Card className="border-2 border-emerald-200">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardTitle className="text-2xl text-[#00563F]">
              Cargar Archivo del Programa Analítico
            </CardTitle>
            <CardDescription>
              Formato UNESUM - Sube un archivo Excel (.xlsx) o Word (.docx). El sistema detectará automáticamente las secciones del programa
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Archivo Excel/Word */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Archivo del Programa Analítico (Excel o Word) *
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-emerald-500 transition-colors">
                      <div className="flex flex-col items-center">
                        <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          {excelFile ? excelFile.name : 'Haz clic para seleccionar archivo'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos: .xlsx, .xls, .docx
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.docx"
                      onChange={handleExcelChange}
                      className="hidden"
                      disabled={loading}
                    />
                  </label>
                </div>
              </div>

              {/* Archivo Escudo (Opcional) */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Escudo/Logo (Opcional)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
                      <div className="flex flex-col items-center">
                        <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          {escudoFile ? escudoFile.name : 'Haz clic para seleccionar imagen'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos: .jpg, .png, .gif
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEscudoChange}
                      className="hidden"
                      disabled={loading}
                    />
                  </label>
                </div>
              </div>

              {/* Vista previa de archivos seleccionados */}
              {(excelFile || escudoFile) && (
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-sm">Archivos seleccionados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {excelFile && (
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium">Excel:</span>
                          <span className="text-gray-600">{excelFile.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(excelFile.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                      )}
                      {escudoFile && (
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Escudo:</span>
                          <span className="text-gray-600">{escudoFile.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(escudoFile.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Botones */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={!excelFile || loading}
                  className="flex-1 bg-[#00563F] hover:bg-[#004830] text-white h-12"
                >
                  {loading ? (
                    <>
                      <Upload className="h-5 w-5 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      Cargar Programa Analítico
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="border-gray-300"
                >
                  Cancelar
                </Button>
              </div>

              {/* Instrucciones */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm text-blue-900">
                    💡 Instrucciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-800 space-y-2">
                  <p>• El archivo debe tener el formato UNESUM de programa analítico (.xlsx o .docx)</p>
                  <p>• Las secciones con títulos en MAYÚSCULAS/negrilla serán detectadas automáticamente</p>
                  <p>• El sistema creará una plantilla dinámica basada en la estructura del archivo</p>
                  <p>• Los datos se guardarán en tablas relacionales para consulta eficiente</p>
                </CardContent>
              </Card>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
