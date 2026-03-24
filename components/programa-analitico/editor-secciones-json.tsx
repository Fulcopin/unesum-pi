"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  FileJson, 
  Table as TableIcon,
  FileText,
  ChevronDown,
  ChevronRight
} from "lucide-react"

interface Campo {
  id: string
  nombre: string
  etiqueta: string
  tipo: 'texto' | 'numero' | 'fecha' | 'textarea'
  valor: string
}

interface FilaTabla {
  id: string
  orden: number
  campos: Campo[]
}

interface Seccion {
  id: string
  nombre: string
  tipo: 'tabla' | 'texto_largo' | 'texto_corto'
  descripcion?: string
  orden: number
  // Para tipo tabla
  encabezados?: string[]
  filas?: FilaTabla[]
  // Para tipo texto
  contenido?: string
  collapsed?: boolean
}

interface EditorSeccionesJSONProps {
  datosIniciales: any
  onGuardar: (datos: Seccion[]) => Promise<void>
  titulo?: string
  modo?: 'programa-analitico' | 'syllabus'
}

export function EditorSeccionesJSON({ 
  datosIniciales, 
  onGuardar, 
  titulo = "Editor de Contenido",
  modo = 'programa-analitico'
}: EditorSeccionesJSONProps) {
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [guardando, setGuardando] = useState(false)
  const [editandoCelda, setEditandoCelda] = useState<{seccionId: string, filaId: string, campoId: string} | null>(null)
  const [valorTemporal, setValorTemporal] = useState("")

  useEffect(() => {
    // Parsear datos iniciales y convertir a estructura de secciones
    if (datosIniciales) {
      const seccionesParseadas = parsearDatosAJSON(datosIniciales)
      setSecciones(seccionesParseadas)
    }
  }, [datosIniciales])

  const parsearDatosAJSON = (datos: any): Seccion[] => {
    const secciones: Seccion[] = []
    
    try {
      // Si tiene estructura de programa analítico con secciones
      if (datos.secciones && Array.isArray(datos.secciones)) {
        datos.secciones.forEach((seccion: any, index: number) => {
          const seccionId = `seccion-${index}`
          
          if (seccion.tipo === 'tabla' && seccion.datos && Array.isArray(seccion.datos)) {
            // Tabla: crear filas con campos
            const encabezados = seccion.encabezados || []
            const filas: FilaTabla[] = seccion.datos.map((fila: any, filaIndex: number) => {
              const campos: Campo[] = Array.isArray(fila) 
                ? fila.map((valor: any, colIndex: number) => ({
                    id: `campo-${filaIndex}-${colIndex}`,
                    nombre: encabezados[colIndex] || `Columna ${colIndex + 1}`,
                    etiqueta: encabezados[colIndex] || `Columna ${colIndex + 1}`,
                    tipo: 'texto' as const,
                    valor: String(valor || '')
                  }))
                : []

              return {
                id: `fila-${filaIndex}`,
                orden: filaIndex + 1,
                campos
              }
            })

            secciones.push({
              id: seccionId,
              nombre: seccion.titulo || `Sección ${index + 1}`,
              tipo: 'tabla',
              orden: index + 1,
              encabezados: encabezados,
              filas: filas,
              collapsed: false
            })
          } else {
            // Texto largo o corto
            const contenido = Array.isArray(seccion.datos)
              ? seccion.datos.map((d: any) => Array.isArray(d) ? d.join(' ') : String(d)).join('\n')
              : String(seccion.contenido || seccion.datos || '')

            secciones.push({
              id: seccionId,
              nombre: seccion.titulo || `Sección ${index + 1}`,
              tipo: contenido.length > 200 ? 'texto_largo' : 'texto_corto',
              orden: index + 1,
              contenido: contenido,
              collapsed: false
            })
          }
        })
      }
      // Si es estructura plana con campos
      else if (datos.titulos && datos.contenido) {
        Object.keys(datos.contenido).forEach((titulo, index) => {
          secciones.push({
            id: `seccion-${index}`,
            nombre: titulo,
            tipo: 'texto_corto',
            orden: index + 1,
            contenido: datos.contenido[titulo],
            collapsed: false
          })
        })
      }
      // Estructura genérica: intentar parsear
      else {
        Object.keys(datos).forEach((key, index) => {
          const valor = datos[key]
          
          if (Array.isArray(valor) && valor.length > 0 && Array.isArray(valor[0])) {
            // Es una tabla
            secciones.push({
              id: `seccion-${index}`,
              nombre: key,
              tipo: 'tabla',
              orden: index + 1,
              encabezados: valor[0].map((_: any, i: number) => `Columna ${i + 1}`),
              filas: valor.map((fila: any, filaIndex: number) => ({
                id: `fila-${filaIndex}`,
                orden: filaIndex + 1,
                campos: fila.map((celda: any, colIndex: number) => ({
                  id: `campo-${filaIndex}-${colIndex}`,
                  nombre: `col${colIndex}`,
                  etiqueta: `Columna ${colIndex + 1}`,
                  tipo: 'texto' as const,
                  valor: String(celda || '')
                }))
              })),
              collapsed: false
            })
          } else {
            // Es texto
            secciones.push({
              id: `seccion-${index}`,
              nombre: key,
              tipo: 'texto_corto',
              orden: index + 1,
              contenido: typeof valor === 'object' ? JSON.stringify(valor, null, 2) : String(valor),
              collapsed: false
            })
          }
        })
      }
    } catch (error) {
      console.error('Error al parsear datos:', error)
    }

    return secciones
  }

  const toggleCollapse = (seccionId: string) => {
    setSecciones(secciones.map(s => 
      s.id === seccionId ? { ...s, collapsed: !s.collapsed } : s
    ))
  }

  const actualizarContenidoTexto = (seccionId: string, nuevoContenido: string) => {
    setSecciones(secciones.map(s => 
      s.id === seccionId ? { ...s, contenido: nuevoContenido } : s
    ))
  }

  const iniciarEdicionCelda = (seccionId: string, filaId: string, campoId: string, valorActual: string) => {
    setEditandoCelda({ seccionId, filaId, campoId })
    setValorTemporal(valorActual)
  }

  const guardarEdicionCelda = () => {
    if (!editandoCelda) return

    setSecciones(secciones.map(seccion => {
      if (seccion.id !== editandoCelda.seccionId) return seccion

      return {
        ...seccion,
        filas: seccion.filas?.map(fila => {
          if (fila.id !== editandoCelda.filaId) return fila

          return {
            ...fila,
            campos: fila.campos.map(campo => 
              campo.id === editandoCelda.campoId 
                ? { ...campo, valor: valorTemporal }
                : campo
            )
          }
        })
      }
    }))

    setEditandoCelda(null)
    setValorTemporal("")
  }

  const cancelarEdicionCelda = () => {
    setEditandoCelda(null)
    setValorTemporal("")
  }

  const agregarFila = (seccionId: string) => {
    setSecciones(secciones.map(seccion => {
      if (seccion.id !== seccionId || seccion.tipo !== 'tabla') return seccion

      const numColumnas = seccion.encabezados?.length || 0
      const nuevaFilaId = `fila-${Date.now()}`
      const nuevaFila: FilaTabla = {
        id: nuevaFilaId,
        orden: (seccion.filas?.length || 0) + 1,
        campos: Array.from({ length: numColumnas }, (_, i) => ({
          id: `campo-${nuevaFilaId}-${i}`,
          nombre: seccion.encabezados?.[i] || `col${i}`,
          etiqueta: seccion.encabezados?.[i] || `Columna ${i + 1}`,
          tipo: 'texto' as const,
          valor: ''
        }))
      }

      return {
        ...seccion,
        filas: [...(seccion.filas || []), nuevaFila]
      }
    }))
  }

  const eliminarFila = (seccionId: string, filaId: string) => {
    if (!confirm('¿Eliminar esta fila?')) return

    setSecciones(secciones.map(seccion => {
      if (seccion.id !== seccionId) return seccion

      return {
        ...seccion,
        filas: seccion.filas?.filter(f => f.id !== filaId)
      }
    }))
  }

  const handleGuardar = async () => {
    try {
      setGuardando(true)
      await onGuardar(secciones)
      alert('✅ Cambios guardados exitosamente')
    } catch (error) {
      console.error('Error al guardar:', error)
      alert('❌ Error al guardar cambios')
    } finally {
      setGuardando(false)
    }
  }

  const exportarJSON = () => {
    const dataStr = JSON.stringify(secciones, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${modo}-${Date.now()}.json`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{titulo}</h2>
          <p className="text-sm text-muted-foreground">
            {secciones.length} secciones • Formato JSON editable
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarJSON}>
            <FileJson className="mr-2 h-4 w-4" />
            Exportar JSON
          </Button>
          <Button onClick={handleGuardar} disabled={guardando}>
            {guardando ? (
              <>Guardando...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Secciones */}
      <div className="space-y-4">
        {secciones.map((seccion, index) => (
          <Card key={seccion.id} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleCollapse(seccion.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {seccion.collapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{seccion.nombre}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {seccion.tipo === 'tabla' ? (
                        <>
                          <TableIcon className="h-3 w-3" />
                          Tabla ({seccion.filas?.length || 0} filas)
                        </>
                      ) : (
                        <>
                          <FileText className="h-3 w-3" />
                          Texto
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={seccion.tipo === 'tabla' ? 'default' : 'secondary'}>
                  {seccion.tipo}
                </Badge>
              </div>
            </CardHeader>

            {!seccion.collapsed && (
              <CardContent className="pt-6">
                {seccion.tipo === 'tabla' ? (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            {seccion.encabezados?.map((enc, i) => (
                              <TableHead key={i}>{enc}</TableHead>
                            ))}
                            <TableHead className="w-24">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {seccion.filas?.map((fila, filaIndex) => (
                            <TableRow key={fila.id}>
                              <TableCell className="font-medium">{filaIndex + 1}</TableCell>
                              {fila.campos.map((campo) => (
                                <TableCell key={campo.id}>
                                  {editandoCelda?.seccionId === seccion.id && 
                                   editandoCelda?.filaId === fila.id && 
                                   editandoCelda?.campoId === campo.id ? (
                                    <div className="flex gap-1">
                                      <Input
                                        value={valorTemporal}
                                        onChange={(e) => setValorTemporal(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') guardarEdicionCelda()
                                          if (e.key === 'Escape') cancelarEdicionCelda()
                                        }}
                                        className="h-8"
                                        autoFocus
                                      />
                                      <Button size="icon" variant="ghost" onClick={guardarEdicionCelda} className="h-8 w-8">
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={cancelarEdicionCelda} className="h-8 w-8">
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div 
                                      className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[32px]"
                                      onClick={() => iniciarEdicionCelda(seccion.id, fila.id, campo.id, campo.valor)}
                                    >
                                      {campo.valor || <span className="text-muted-foreground italic">Vacío</span>}
                                    </div>
                                  )}
                                </TableCell>
                              ))}
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => eliminarFila(seccion.id, fila.id)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => agregarFila(seccion.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Fila
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Textarea
                      value={seccion.contenido || ''}
                      onChange={(e) => actualizarContenidoTexto(seccion.id, e.target.value)}
                      rows={seccion.tipo === 'texto_largo' ? 8 : 4}
                      className="font-mono text-sm"
                      placeholder="Contenido de la sección..."
                    />
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {secciones.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos para mostrar</p>
            <p className="text-sm mt-2">Importe un archivo Excel o Word para comenzar</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
