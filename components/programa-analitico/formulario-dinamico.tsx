"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, Save, FileText, List, Table as TableIcon, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

interface Campo {
  id: number
  nombre?: string
  etiqueta: string
  tipo_campo: string
  orden: number
  requerido?: boolean
  placeholder?: string
  opciones_json?: any
  validacion_json?: any
}

interface SeccionFormulario {
  id?: number | string
  titulo: string
  descripcion?: string
  tipo: 'texto_largo' | 'tabla' | 'campos'
  orden?: number
  obligatoria?: boolean
  encabezados?: string[]
  campos?: Campo[]
  num_filas?: number
}

interface AgrupacionFormulario {
  id: number
  nombre_pestana: string
  descripcion?: string
  orden: number
  seccion_ids: (number | string)[]
  color: string
  icono: string
}

interface FormularioDinamicoProps {
  secciones: SeccionFormulario[]
  datosGenerales?: Record<string, any>
  contenidoInicial?: Record<string, any>
  onGuardar: (contenido: Record<string, any>) => Promise<void>
  onCancelar?: () => void
  guardando?: boolean
  error?: string | null
  agrupaciones?: AgrupacionFormulario[]
}

export function FormularioDinamico({
  secciones,
  datosGenerales = {},
  contenidoInicial = {},
  onGuardar,
  onCancelar,
  guardando = false,
  error = null,
  agrupaciones = []
}: FormularioDinamicoProps) {
  const [contenido, setContenido] = useState<Record<string, any>>(contenidoInicial)

  const handleCampoChange = (seccionId: string | number, campo: string, valor: any) => {
    setContenido(prev => ({
      ...prev,
      [seccionId]: {
        ...prev[seccionId],
        [campo]: valor
      }
    }))
  }

  const handleCampoIndividualChange = (seccionId: string | number, campoNombre: string, valor: string) => {
    setContenido(prev => ({
      ...prev,
      [seccionId]: {
        ...prev[seccionId],
        [campoNombre]: valor
      }
    }))
  }

  const handleTablaChange = (seccionId: string | number, filaIdx: number, campoId: number, valor: string) => {
    setContenido(prev => {
      const seccionActual = prev[seccionId] || { tipo: 'tabla', filas: [] }
      const filasActuales = seccionActual.filas || []
      
      // Asegurar que existe la fila
      while (filasActuales.length <= filaIdx) {
        filasActuales.push({ valores: {} })
      }
      
      // Actualizar el valor del campo
      if (!filasActuales[filaIdx].valores) {
        filasActuales[filaIdx].valores = {}
      }
      
      filasActuales[filaIdx].valores[campoId] = valor
      
      return {
        ...prev,
        [seccionId]: {
          tipo: 'tabla',
          filas: filasActuales
        }
      }
    })
  }

  const agregarFilaTabla = (seccionId: string | number) => {
    setContenido(prev => {
      const seccionActual = prev[seccionId] || { tipo: 'tabla', filas: [] }
      const filasActuales = seccionActual.filas || []
      
      return {
        ...prev,
        [seccionId]: {
          tipo: 'tabla',
          filas: [...filasActuales, { valores: {} }]
        }
      }
    })
  }

  const eliminarFilaTabla = (seccionId: string | number, filaIdx: number) => {
    setContenido(prev => {
      const seccionActual = prev[seccionId] || { tipo: 'tabla', filas: [] }
      const filasActuales = seccionActual.filas || []
      
      return {
        ...prev,
        [seccionId]: {
          tipo: 'tabla',
          filas: filasActuales.filter((_: any, idx: number) => idx !== filaIdx)
        }
      }
    })
  }

  const renderSeccionTextoLargo = (seccion: SeccionFormulario) => {
    const seccionId = seccion.id || seccion.titulo
    const valor = contenido[seccionId]?.contenido || contenido[seccionId] || ''
    
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">{seccion.titulo}</h4>
              <p className="text-sm text-blue-700">
                {seccion.descripcion || 'Complete la información solicitada en este campo de texto'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={`seccion-${seccionId}`} className="text-base font-medium">
            Contenido {seccion.obligatoria && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            id={`seccion-${seccionId}`}
            value={typeof valor === 'string' ? valor : ''}
            onChange={(e) => {
              // Guardar como texto directo para texto_largo
              setContenido(prev => ({
                ...prev,
                [seccionId]: {
                  tipo: 'texto_largo',
                  contenido: e.target.value
                }
              }))
            }}
            placeholder={`Ingrese el contenido para ${seccion.titulo}`}
            rows={8}
            className="w-full resize-y min-h-[200px]"
          />
          <p className="text-sm text-gray-500">
            {(typeof valor === 'string' ? valor : '').length} caracteres
          </p>
        </div>
      </div>
    )
  }

  const renderSeccionCampos = (seccion: SeccionFormulario) => {
    const seccionId = seccion.id || seccion.titulo
    const campos = seccion.campos || []
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campos.map((campo: Campo) => {
            const campoNombre = campo.nombre || `campo_${campo.id}`
            const valor = contenido[seccionId]?.[campoNombre] || ''
            
            return (
              <div key={campo.id} className="space-y-2">
                <Label htmlFor={`campo-${campo.id}`} className="text-sm font-medium text-gray-700">
                  {campo.etiqueta}
                  {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={`campo-${campo.id}`}
                  value={valor}
                  onChange={(e) => handleCampoIndividualChange(seccionId, campoNombre, e.target.value)}
                  placeholder={campo.placeholder || `Ingrese ${campo.etiqueta.toLowerCase()}`}
                  className="w-full bg-white"
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderSeccionTabla = (seccion: SeccionFormulario) => {
    const seccionId = seccion.id || seccion.titulo
    const seccionData = contenido[seccionId] || { tipo: 'tabla', filas: [] }
    const filas = seccionData.filas || []
    const campos = seccion.campos || []
    
    const handleAgregarFila = () => {
      agregarFilaTabla(seccionId)
    }
    
    const handleEliminarFila = (filaIdx: number) => {
      eliminarFilaTabla(seccionId, filaIdx)
    }
    
    const handleCampoTablaChange = (filaIdx: number, campoId: number, valor: string) => {
      handleTablaChange(seccionId, filaIdx, campoId, valor)
    }
    
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TableIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">
                {seccion.titulo} {seccion.obligatoria && <span className="text-red-500">*</span>}
              </h4>
              <p className="text-sm text-green-700">
                {seccion.descripcion || 'Complete la tabla con la información solicitada. Puede agregar o eliminar filas según sea necesario.'}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAgregarFila}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar Fila
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12">#</TableHead>
                {campos.map((campo) => (
                  <TableHead key={`campo-${campo.id}`} className="font-semibold">
                    {campo.etiqueta}
                    {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                  </TableHead>
                ))}
                <TableHead className="w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={campos.length + 2} className="text-center text-gray-500 py-8">
                    No hay filas. Haga clic en "Agregar Fila" para comenzar.
                  </TableCell>
                </TableRow>
              ) : (
                filas.map((fila: any, filaIdx: number) => (
                  <TableRow key={`fila-${seccionId}-${filaIdx}`}>
                    <TableCell className="font-medium text-gray-500">
                      {filaIdx + 1}
                    </TableCell>
                    {campos.map((campo) => (
                      <TableCell key={`celda-${campo.id}-${filaIdx}`}>
                        <Input
                          value={fila.valores?.[campo.id] || ''}
                          onChange={(e) => handleCampoTablaChange(filaIdx, campo.id, e.target.value)}
                          placeholder={campo.etiqueta}
                          className="w-full"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarFila(filaIdx)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <p className="text-sm text-gray-500">
          Total de filas: {filas.length}
        </p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onGuardar(contenido)
  }

  if (!secciones || secciones.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">No hay secciones definidas</p>
          <p className="text-gray-500 text-sm mt-2">
            Contacta al administrador para cargar un programa analítico
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Completar Programa Analítico
          </CardTitle>
          <CardDescription>
            Complete las secciones del programa analítico según la estructura definida ({secciones.length} secciones)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Renderizar sección de tipo 'campos' directamente si es el único tipo */}
          {secciones.length === 1 && secciones[0].tipo === 'campos' ? (
            renderSeccionCampos(secciones[0])
          ) : (
            <>
              {/* Renderizar la primera sección tipo tabla como Datos Generales (formulario simple) */}
              {secciones[0] && secciones[0].tipo === 'tabla' && secciones[0].campos && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <h4 className="font-semibold text-emerald-900 mb-4 text-lg">
                {secciones[0].titulo}
              </h4>
              {secciones[0].descripcion && (
                <p className="text-sm text-emerald-700 mb-4">{secciones[0].descripcion}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {secciones[0].campos.map((campo: Campo) => {
                  const seccionId = secciones[0].id || secciones[0].titulo
                  const valor = contenido[seccionId]?.filas?.[0]?.valores?.[campo.id] || ''
                  
                  return (
                    <div key={campo.id} className="space-y-2">
                      <Label htmlFor={`campo-${campo.id}`} className="text-sm font-medium text-gray-700">
                        {campo.etiqueta}
                        {campo.requerido && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        id={`campo-${campo.id}`}
                        value={valor}
                        onChange={(e) => {
                          const seccionId = secciones[0].id || secciones[0].titulo
                          handleTablaChange(seccionId, 0, campo.id, e.target.value)
                        }}
                        placeholder={campo.placeholder || campo.etiqueta}
                        className="w-full bg-white"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tabs para las secciones - CON AGRUPACIONES SI EXISTEN */}
          {(() => {
            const seccionesParaTabs = secciones[0]?.tipo === 'tabla' ? secciones.slice(1) : secciones
            
            if (seccionesParaTabs.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  <p>Solo hay una sección de datos generales</p>
                </div>
              )
            }

            // Si hay agrupaciones, mostrar pestañas organizadas
            if (agrupaciones && agrupaciones.length > 0) {
              return (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800">
                      ✅ <strong>Formulario organizado en pestañas</strong> - Complete los campos agrupados por categorías.
                    </p>
                  </div>
                  <Tabs defaultValue={agrupaciones[0]?.nombre_pestana || 'default'} className="w-full">
                    <TabsList className="w-full flex-wrap h-auto">
                      {agrupaciones
                        .sort((a, b) => a.orden - b.orden)
                        .map((agrupacion) => (
                          <TabsTrigger
                            key={agrupacion.id}
                            value={agrupacion.nombre_pestana}
                            className="flex items-center gap-2"
                          >
                            <span>{agrupacion.icono}</span>
                            <span>{agrupacion.nombre_pestana}</span>
                            <span className="ml-1 px-2 py-0.5 bg-secondary rounded-full text-xs">
                              {agrupacion.seccion_ids.length}
                            </span>
                          </TabsTrigger>
                        ))}
                    </TabsList>

                    {agrupaciones.map((agrupacion) => (
                      <TabsContent key={agrupacion.id} value={agrupacion.nombre_pestana} className="mt-6 space-y-4">
                        {agrupacion.descripcion && (
                          <p className="text-sm text-muted-foreground mb-4">{agrupacion.descripcion}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {agrupacion.seccion_ids.map((seccionId) => {
                            const seccion = seccionesParaTabs.find(s => (s.id || s.titulo) === seccionId);
                            if (!seccion) return null;
                            return (
                              <div key={seccionId}>
                                {seccion.tipo === 'texto_largo' 
                                  ? renderSeccionTextoLargo(seccion)
                                  : seccion.tipo === 'campos'
                                  ? renderSeccionCampos(seccion)
                                  : renderSeccionTabla(seccion)
                                }
                              </div>
                            );
                          })}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )
            }
            
            // Si NO hay agrupaciones, mostrar tabs normales
            return (
              <Tabs defaultValue={seccionesParaTabs[0]?.titulo.replace(/\s+/g, '-')} className="w-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(seccionesParaTabs.length, 4)}, 1fr)` }}>
                  {seccionesParaTabs.map((seccion, idx) => (
                    <TabsTrigger 
                      key={idx} 
                      value={seccion.titulo.replace(/\s+/g, '-')}
                      className="flex items-center gap-2"
                    >
                      {seccion.tipo === 'tabla' ? (
                        <TableIcon className="h-4 w-4" />
                      ) : seccion.tipo === 'campos' ? (
                        <List className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline truncate max-w-[150px]">
                        {idx + 2}. {seccion.titulo.length > 20 ? seccion.titulo.substring(0, 17) + '...' : seccion.titulo}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {seccionesParaTabs.map((seccion, idx) => (
                  <TabsContent 
                    key={idx} 
                    value={seccion.titulo.replace(/\s+/g, '-')}
                    className="mt-6"
                  >
                    {seccion.tipo === 'texto_largo' 
                      ? renderSeccionTextoLargo(seccion)
                      : seccion.tipo === 'campos'
                      ? renderSeccionCampos(seccion)
                      : renderSeccionTabla(seccion)
                    }
                  </TabsContent>
                ))}
              </Tabs>
            )
          })()}
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-[#00563F] hover:bg-[#00563F]/90"
            >
              {guardando ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-pulse" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Programa Analítico
                </>
              )}
            </Button>
            {onCancelar && (
              <Button
                type="button"
                onClick={onCancelar}
                variant="outline"
                disabled={guardando}
                className="sm:w-auto"
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
