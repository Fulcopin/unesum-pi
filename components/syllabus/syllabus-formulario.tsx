"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Save, Edit3, BookOpen, Users, Clock, Target, FileText } from "lucide-react"

interface ProfesorContext {
  nombres?: string
  apellidos?: string
  carrera?: { nombre: string; codigo?: string }
  facultad?: { nombre: string }
  asignatura?: { nombre: string; codigo?: string }
  nivel?: { nombre: string }
  paralelo?: { nombre: string }
}

interface CatalogosData {
  facultades?: Array<{ id: number; nombre: string }>
  carreras?: Array<{ id: number; nombre: string; facultad_id?: number }>
  asignaturas?: Array<{ id: number; nombre: string; codigo: string }>
  niveles?: Array<{ id: number; nombre: string }>
  paralelos?: Array<{ id: number; nombre: string }>
  modalidades?: Array<{ nombre: string }>
}

interface SyllabusFormularioProps {
  titulos: string[]
  camposPorSeccion?: Record<string, string[]>
  formData: Record<string, string>
  onFormChange: (field: string, value: string) => void
  onSave: () => void
  onCancel?: () => void
  onReset?: () => void
  isSaving: boolean
  error: string | null
  totalCampos: number
  showCancelButtons?: boolean
  profesorContext?: ProfesorContext
  catalogos?: CatalogosData
}

export function SyllabusFormulario({ 
  titulos, 
  camposPorSeccion,
  formData, 
  onFormChange, 
  onSave, 
  onCancel, 
  onReset,
  isSaving, 
  error,
  totalCampos,
  showCancelButtons = true,
  profesorContext,
  catalogos
}: SyllabusFormularioProps) {
  // Usar las secciones del documento si están disponibles
  const seccionesOrganizadas = camposPorSeccion && Object.keys(camposPorSeccion).length > 0 
    ? camposPorSeccion 
    : { 'Todos los campos': titulos };
  
  const totalCamposMostrados = titulos.length
  const seccionesKeys = Object.keys(seccionesOrganizadas);

  const renderField = (titulo: string, index: number) => {
    // No renderizar títulos de sección vacíos
    if (!titulo || titulo.trim() === '') return null;
    
    const tituloLower = titulo.toLowerCase();
    
    // Detectar si el campo debe ser un Select basado en el nombre
    const isFacultad = tituloLower.includes('facultad');
    const isCarrera = tituloLower.includes('carrera') && !tituloLower.includes('malla') && !tituloLower.includes('unidad');
    const isAsignatura = tituloLower.includes('asignatura') || tituloLower.includes('materia');
    const isNivel = tituloLower.includes('nivel') && !tituloLower.includes('inter');
    const isParalelo = tituloLower.includes('paralelo');
    const isModalidad = tituloLower.includes('modalidad');
    
    const isLongField = tituloLower.includes('descripción') || 
                       tituloLower.includes('objetivo') ||
                       tituloLower.includes('contenido') ||
                       tituloLower.includes('resultado') ||
                       tituloLower.includes('criterio') ||
                       tituloLower.includes('metodología') ||
                       tituloLower.includes('perfil') ||
                       tituloLower.includes('unidad');

    // Renderizar como Select si coincide con un catálogo
    if (catalogos && (isFacultad || isCarrera || isAsignatura || isNivel || isParalelo || isModalidad)) {
      let opciones: Array<{ value: string; label: string }> = [];
      
      if (isFacultad && catalogos.facultades) {
        opciones = catalogos.facultades.map(f => ({ value: f.nombre, label: f.nombre }));
      } else if (isCarrera && catalogos.carreras) {
        opciones = catalogos.carreras.map(c => ({ value: c.nombre, label: c.nombre }));
      } else if (isAsignatura && catalogos.asignaturas) {
        opciones = catalogos.asignaturas.map(a => ({ value: a.nombre, label: `${a.nombre} (${a.codigo})` }));
      } else if (isNivel && catalogos.niveles) {
        opciones = catalogos.niveles.map(n => ({ value: n.nombre, label: n.nombre }));
      } else if (isParalelo && catalogos.paralelos) {
        opciones = catalogos.paralelos.map(p => ({ value: p.nombre, label: p.nombre }));
      } else if (isModalidad && catalogos.modalidades) {
        opciones = catalogos.modalidades.map(m => ({ value: m.nombre, label: m.nombre }));
      }

      return (
        <div key={`${titulo}-${index}`} className="space-y-2">
          <Label htmlFor={`field-${index}`} className="text-sm font-medium text-gray-700">
            {titulo}
          </Label>
          <Select 
            value={formData[titulo] || ''} 
            onValueChange={(value) => onFormChange(titulo, value)}
          >
            <SelectTrigger id={`field-${index}`}>
              <SelectValue placeholder={`Seleccione ${titulo.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((opcion, idx) => (
                <SelectItem key={idx} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={`${titulo}-${index}`} className="space-y-2">
        <Label htmlFor={`field-${index}`} className="text-sm font-medium text-gray-700">
          {titulo}
        </Label>
        {isLongField ? (
          <Textarea
            id={`field-${index}`}
            value={formData[titulo] || ''}
            onChange={(e) => onFormChange(titulo, e.target.value)}
            placeholder={`Ingrese ${titulo.toLowerCase()}`}
            rows={3}
            className="w-full resize-none"
          />
        ) : (
          <Input
            id={`field-${index}`}
            value={formData[titulo] || ''}
            onChange={(e) => onFormChange(titulo, e.target.value)}
            placeholder={`Ingrese ${titulo.toLowerCase()}`}
            className="w-full"
          />
        )}
      </div>
    )
  }

  const getTabIcon = (seccion: string) => {
    const seccionUpper = seccion.toUpperCase();
    if (seccionUpper.includes('DATOS') || seccionUpper.includes('GENERALES')) return <BookOpen className="h-4 w-4" />;
    if (seccionUpper.includes('ESTRUCTURA') || seccionUpper.includes('CONTENIDO')) return <Clock className="h-4 w-4" />;
    if (seccionUpper.includes('RESULTADOS') || seccionUpper.includes('EVALUACIÓN') || seccionUpper.includes('EVALUACION')) return <Target className="h-4 w-4" />;
    if (seccionUpper.includes('VISADO') || seccionUpper.includes('FIRMA')) return <Users className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getTabLabel = (seccion: string) => {
    // Para hojas de Excel, usar el nombre completo si es corto
    if (seccion.length <= 20) return seccion;
    // Si es largo, abreviar inteligentemente
    return seccion.substring(0, 18) + '...';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Completar Información del Syllabus
        </CardTitle>
        <CardDescription>
          Complete los campos extraídos del documento ({totalCamposMostrados} de {totalCampos} campos)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información del Contexto del Profesor */}
        {profesorContext && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-emerald-900 mb-3">Información del Syllabus</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {profesorContext.nombres && (
                <div>
                  <span className="font-medium text-gray-700">Docente: </span>
                  <span className="text-gray-900">{profesorContext.nombres} {profesorContext.apellidos}</span>
                </div>
              )}
              {profesorContext.facultad && (
                <div>
                  <span className="font-medium text-gray-700">Facultad: </span>
                  <span className="text-gray-900">{profesorContext.facultad.nombre}</span>
                </div>
              )}
              {profesorContext.carrera && (
                <div>
                  <span className="font-medium text-gray-700">Carrera: </span>
                  <span className="text-gray-900">{profesorContext.carrera.nombre}</span>
                </div>
              )}
              {profesorContext.asignatura && (
                <div>
                  <span className="font-medium text-gray-700">Asignatura: </span>
                  <span className="text-gray-900">
                    {profesorContext.asignatura.nombre}
                    {profesorContext.asignatura.codigo && ` (${profesorContext.asignatura.codigo})`}
                  </span>
                </div>
              )}
              {profesorContext.nivel && (
                <div>
                  <span className="font-medium text-gray-700">Nivel: </span>
                  <span className="text-gray-900">{profesorContext.nivel.nombre}</span>
                </div>
              )}
              {profesorContext.paralelo && (
                <div>
                  <span className="font-medium text-gray-700">Paralelo: </span>
                  <span className="text-gray-900">{profesorContext.paralelo.nombre}</span>
                </div>
              )}
            </div>
          </div>
        )}
        <Tabs defaultValue={seccionesKeys[0]?.replace(/\s+/g, '-')} className="w-full">
          <TabsList className={`grid w-full grid-cols-${Math.min(seccionesKeys.length, 4)}`}>
            {seccionesKeys.map((seccion, idx) => (
              <TabsTrigger key={idx} value={seccion.replace(/\s+/g, '-')} className="flex items-center gap-2">
                {getTabIcon(seccion)}
                <span className="hidden sm:inline">{getTabLabel(seccion)}</span>
                <span className="sm:hidden">{getTabLabel(seccion).substring(0, 5)}</span>
                <span className="ml-1 text-xs bg-[#00563F] text-white rounded-full px-2">
                  {seccionesOrganizadas[seccion]?.length || 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {seccionesKeys.map((seccion, secIdx) => (
            <TabsContent key={secIdx} value={seccion.replace(/\s+/g, '-')} className="mt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[#00563F]">{seccion}</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {seccionesOrganizadas[seccion]?.map((titulo: string, idx: number) => 
                  renderField(titulo, secIdx * 100 + idx)
                )}
              </div>
              {(!seccionesOrganizadas[seccion] || seccionesOrganizadas[seccion].length === 0) && (
                <p className="text-center text-muted-foreground py-8">No hay campos en esta sección</p>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Se están mostrando TODOS los {totalCamposMostrados} campos extraídos del documento organizados por categorías.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 bg-[#00563F] hover:bg-[#00563F]/90"
          >
            {isSaving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-pulse" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Información
              </>
            )}
          </Button>
          {showCancelButtons && onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={isSaving}
              className="sm:w-auto"
            >
              Volver
            </Button>
          )}
          {showCancelButtons && onReset && (
            <Button
              onClick={onReset}
              variant="destructive"
              disabled={isSaving}
              className="sm:w-auto"
            >
              Cancelar Todo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
