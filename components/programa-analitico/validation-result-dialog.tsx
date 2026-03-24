import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResultadoValidacion {
  success: boolean;
  porcentaje_coincidencia: number;
  total_requeridos: number;
  encontrados: number;
  faltantes: string[];
  extras: string[];
}

interface ValidationResultDialogProps {
  open: boolean;
  onClose: () => void;
  result: {
    success: boolean;
    validacion?: ResultadoValidacion;
    message?: string;
  };
}

export function ValidationResultDialog({ open, onClose, result }: ValidationResultDialogProps) {
  const { success, validacion, message } = result;
  
  if (!validacion) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {success ? 'Éxito' : 'Error'}
            </DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {success ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                ¡Validación Exitosa!
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-yellow-500" />
                Validación Incompleta
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Resultados de la comparación contra la plantilla maestra
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[500px] overflow-y-auto pr-4">
          <div className="space-y-4">
            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {validacion.porcentaje_coincidencia}%
                </div>
                <div className="text-sm text-blue-600">Coincidencia</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {validacion.encontrados}/{validacion.total_requeridos}
                </div>
                <div className="text-sm text-green-600">Secciones</div>
              </div>
              <div className={`p-4 rounded-lg border ${
                success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className={`text-2xl font-bold ${
                  success ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {success ? '✓' : '✗'}
                </div>
                <div className={`text-sm ${
                  success ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {success ? 'Aprobado' : 'Requiere ajustes'}
                </div>
              </div>
            </div>

            {/* Secciones Faltantes */}
            {validacion.faltantes && validacion.faltantes.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4" />
                  Secciones Obligatorias Faltantes ({validacion.faltantes.length})
                </h3>
                <ul className="space-y-1">
                  {validacion.faltantes.map((seccion, idx) => (
                    <li key={idx} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">✗</span>
                      <span>{seccion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Secciones Extra */}
            {validacion.extras && validacion.extras.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-700 flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4" />
                  Secciones Adicionales Detectadas ({validacion.extras.length})
                </h3>
                <ul className="space-y-1">
                  {validacion.extras.slice(0, 10).map((seccion, idx) => (
                    <li key={idx} className="text-sm text-blue-600 flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{seccion}</span>
                    </li>
                  ))}
                  {validacion.extras.length > 10 && (
                    <li className="text-sm text-blue-500 italic ml-4">
                      ... y {validacion.extras.length - 10} más
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Mensaje de Éxito */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  ✅ El documento ha sido procesado correctamente. Los campos de cabecera 
                  (ASIGNATURA, PERIODO, NIVEL) se han llenado automáticamente con datos 
                  oficiales, y el contenido del docente se ha preservado tal como está.
                </p>
              </div>
            )}

            {/* Mensaje de Error */}
            {!success && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-700 mb-2">💡 Cómo resolver:</h3>
                <ol className="text-sm text-yellow-700 space-y-1 ml-4 list-decimal">
                  <li>Descargue la plantilla oficial del administrador</li>
                  <li>Asegúrese de incluir todas las secciones obligatorias</li>
                  <li>Mantenga los títulos exactos de la plantilla</li>
                  <li>Vuelva a subir el documento corregido</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={onClose}
            variant={success ? 'default' : 'secondary'}
          >
            {success ? 'Continuar' : 'Entendido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
