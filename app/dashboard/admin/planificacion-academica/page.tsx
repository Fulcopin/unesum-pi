"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Save, Download } from "lucide-react"
import { useState } from "react"

interface PlanificacionItem {
  id: string
  nivel: string
  periodo: string
  unidadOrganizacion: string
  resultadoAprendizaje: string
  contenidosMinimos: string
  horas: string
}

export default function PlanificacionAcademica() {
  const [items, setItems] = useState<PlanificacionItem[]>([
    {
      id: "1",
      nivel: "I",
      periodo: "PI 2025",
      unidadOrganizacion: "Unidad 1: Fundamentos de Programación",
      resultadoAprendizaje:
        "Interpreta la metodología y el desarrollo de programas aplicando el análisis y el diseño de algoritmos",
      contenidosMinimos:
        "Introducción a los Algoritmos, Fase para la resolución de problemas, Diseño del Algoritmo, Desarrollo lógico de Algoritmos",
      horas: "8",
    },
    {
      id: "2",
      nivel: "I",
      periodo: "PI 2025",
      unidadOrganizacion: "Unidad 2: Variables y Tipos de Datos",
      resultadoAprendizaje: "Elabora diagramas de flujo aplicando variables, tipos de datos y operadores",
      contenidosMinimos:
        "Tipos de datos, Identificadores: Constantes y Variables, Operaciones Matemáticas, Expresiones Lógicas",
      horas: "16",
    },
  ])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<PlanificacionItem>>({})

  const handleAdd = () => {
    const newItem: PlanificacionItem = {
      id: Date.now().toString(),
      nivel: "",
      periodo: "",
      unidadOrganizacion: "",
      resultadoAprendizaje: "",
      contenidosMinimos: "",
      horas: "",
    }
    setItems([...items, newItem])
    setEditingId(newItem.id)
    setFormData(newItem)
  }

  const handleEdit = (item: PlanificacionItem) => {
    setEditingId(item.id)
    setFormData(item)
  }

  const handleSave = () => {
    if (editingId) {
      setItems(items.map((item) => (item.id === editingId ? ({ ...item, ...formData } as PlanificacionItem) : item)))
      setEditingId(null)
      setFormData({})
    }
  }

  const handleDelete = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleExport = () => {
    // Exportar a CSV
    const headers = [
      "Nivel",
      "Periodo",
      "Unidad de Organización",
      "Resultado de Aprendizaje",
      "Contenidos Mínimos",
      "Horas",
    ]
    const csvContent = [
      headers.join(","),
      ...items.map((item) =>
        [
          item.nivel,
          item.periodo,
          `"${item.unidadOrganizacion}"`,
          `"${item.resultadoAprendizaje}"`,
          `"${item.contenidosMinimos}"`,
          item.horas,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "planificacion-academica.csv"
    a.click()
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-[1400px] mx-auto px-6 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Planificación Académica</h1>
              <p className="text-gray-600">Gestiona la planificación por nivel, periodo y unidades de organización</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleExport} variant="outline" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Plus className="h-4 w-4" />
                Agregar Registro
              </Button>
            </div>
          </div>

          {editingId && (
            <Card className="mb-6 border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-900">Editar Registro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="nivel">Nivel</Label>
                    <Input
                      id="nivel"
                      value={formData.nivel || ""}
                      onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                      placeholder="Ej: I, II, III"
                    />
                  </div>
                  <div>
                    <Label htmlFor="periodo">Periodo</Label>
                    <Input
                      id="periodo"
                      value={formData.periodo || ""}
                      onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                      placeholder="Ej: PI 2025"
                    />
                  </div>
                  <div>
                    <Label htmlFor="horas">Horas</Label>
                    <Input
                      id="horas"
                      type="number"
                      value={formData.horas || ""}
                      onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                      placeholder="Ej: 16"
                    />
                  </div>
                </div>
                <div className="grid gap-4 mb-4">
                  <div>
                    <Label htmlFor="unidadOrganizacion">Unidad de Organización</Label>
                    <Input
                      id="unidadOrganizacion"
                      value={formData.unidadOrganizacion || ""}
                      onChange={(e) => setFormData({ ...formData, unidadOrganizacion: e.target.value })}
                      placeholder="Ej: Unidad 1: Fundamentos de Programación"
                    />
                  </div>
                  <div>
                    <Label htmlFor="resultadoAprendizaje">Resultado de Aprendizaje</Label>
                    <Textarea
                      id="resultadoAprendizaje"
                      value={formData.resultadoAprendizaje || ""}
                      onChange={(e) => setFormData({ ...formData, resultadoAprendizaje: e.target.value })}
                      placeholder="Describe el resultado de aprendizaje esperado"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contenidosMinimos">Contenidos Mínimos</Label>
                    <Textarea
                      id="contenidosMinimos"
                      value={formData.contenidosMinimos || ""}
                      onChange={(e) => setFormData({ ...formData, contenidosMinimos: e.target.value })}
                      placeholder="Lista los contenidos mínimos separados por comas"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingId(null)
                      setFormData({})
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-emerald-50">
                      <TableHead className="font-bold text-emerald-900 w-[80px]">Nivel</TableHead>
                      <TableHead className="font-bold text-emerald-900 w-[120px]">Periodo</TableHead>
                      <TableHead className="font-bold text-emerald-900 w-[200px]">Unidad de Organización</TableHead>
                      <TableHead className="font-bold text-emerald-900 w-[250px]">Resultado de Aprendizaje</TableHead>
                      <TableHead className="font-bold text-emerald-900 w-[300px]">Contenidos Mínimos</TableHead>
                      <TableHead className="font-bold text-emerald-900 w-[80px]">Horas</TableHead>
                      <TableHead className="font-bold text-emerald-900 w-[120px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No hay registros. Haz clic en "Agregar Registro" para comenzar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{item.nivel}</TableCell>
                          <TableCell>{item.periodo}</TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="line-clamp-2">{item.unidadOrganizacion}</div>
                          </TableCell>
                          <TableCell className="max-w-[250px]">
                            <div className="line-clamp-3">{item.resultadoAprendizaje}</div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="line-clamp-3">{item.contenidosMinimos}</div>
                          </TableCell>
                          <TableCell className="font-semibold">{item.horas}h</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                onClick={() => handleEdit(item)}
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                Editar
                              </Button>
                              <Button
                                onClick={() => handleDelete(item.id)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Información</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Los registros se organizan por nivel y periodo académico</li>
              <li>• Cada unidad de organización debe tener resultados de aprendizaje claros</li>
              <li>• Los contenidos mínimos deben estar alineados con los resultados de aprendizaje</li>
              <li>• Las horas representan la carga horaria total de la unidad</li>
            </ul>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
