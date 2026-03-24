"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Calendar } from "lucide-react"
import type { ActividadExtracurricular, FuncionSustantiva } from "@/types"

export default function EstudianteActividadesPage() {
  const [actividades, setActividades] = useState<ActividadExtracurricular[]>([])
  const [funciones, setFunciones] = useState<FuncionSustantiva[]>([])
  const [filteredActividades, setFilteredActividades] = useState<ActividadExtracurricular[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterFuncion, setFilterFuncion] = useState("all")

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockFunciones: FuncionSustantiva[] = [
      {
        id: "1",
        codigo: "FS001",
        nombre: "Docencia",
        descripcion: "Actividades relacionadas con la enseñanza",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        codigo: "FS002",
        nombre: "Investigación",
        descripcion: "Proyectos de investigación científica",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        codigo: "FS003",
        nombre: "Vinculación con la Sociedad",
        descripcion: "Actividades de extensión universitaria",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    setFunciones(mockFunciones)

    const mockActividades: ActividadExtracurricular[] = [
      {
        id: "1",
        codigo: "ACT001",
        nombre: "Taller de Programación Avanzada",
        funcionSustantivaId: "1",
        descripcion: "Taller especializado en técnicas avanzadas de programación para estudiantes",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        codigo: "ACT002",
        nombre: "Proyecto de Investigación en IA",
        funcionSustantivaId: "2",
        descripcion: "Oportunidad de participar en investigación sobre inteligencia artificial",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        codigo: "ACT003",
        nombre: "Brigada de Salud Comunitaria",
        funcionSustantivaId: "3",
        descripcion: "Actividad de vinculación con la comunidad local - Área de salud",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "4",
        codigo: "ACT004",
        nombre: "Conferencia de Tecnología",
        funcionSustantivaId: "3",
        descripcion: "Conferencia sobre nuevas tecnologías y su impacto social",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    setActividades(mockActividades)
    setFilteredActividades(mockActividades)
  }, [])

  // Filter activities based on search and filters
  useEffect(() => {
    let filtered = actividades

    if (searchTerm) {
      filtered = filtered.filter(
        (actividad) =>
          actividad.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          actividad.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          actividad.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (filterFuncion !== "all") {
      filtered = filtered.filter((actividad) => actividad.funcionSustantivaId === filterFuncion)
    }

    setFilteredActividades(filtered)
  }, [actividades, searchTerm, filterFuncion])

  const getFuncionNombre = (funcionId: string) => {
    const funcion = funciones.find((f) => f.id === funcionId)
    return funcion ? funcion.nombre : "No asignada"
  }

  const handleInterest = (actividadId: string) => {
    alert("Funcionalidad de registro de interés será implementada próximamente")
  }

  return (
    <ProtectedRoute allowedRoles={["estudiante"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">ACTIVIDADES EXTRACURRICULARES DISPONIBLES</h1>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Filters Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Buscar Actividades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar por nombre o código</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Nombre de actividad, código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filterFuncion">Filtrar por Función Sustantiva</Label>
                    <select
                      id="filterFuncion"
                      value={filterFuncion}
                      onChange={(e) => setFilterFuncion(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">Todas las funciones</option>
                      {funciones.map((funcion) => (
                        <option key={funcion.id} value={funcion.id}>
                          {funcion.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{actividades.length}</div>
                  <div className="text-sm text-gray-600">Actividades Disponibles</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{funciones.length}</div>
                  <div className="text-sm text-gray-600">Funciones Sustantivas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{filteredActividades.length}</div>
                  <div className="text-sm text-gray-600">Resultados de Búsqueda</div>
                </CardContent>
              </Card>
            </div>

            {/* Activities Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredActividades.map((actividad) => (
                <Card key={actividad.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="text-xs">
                        {actividad.codigo}
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800">
                        {getFuncionNombre(actividad.funcionSustantivaId)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{actividad.nombre}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{actividad.descripcion}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                      <Calendar className="h-3 w-3" />
                      <span>Disponible ahora</span>
                    </div>
                    <Button
                      onClick={() => handleInterest(actividad.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      size="sm"
                    >
                      Mostrar Interés
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Lista Completa de Actividades ({filteredActividades.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Código</TableHead>
                        <TableHead className="font-semibold">Actividad</TableHead>
                        <TableHead className="font-semibold">Función Sustantiva</TableHead>
                        <TableHead className="font-semibold">Descripción</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="font-semibold">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActividades.map((actividad) => (
                        <TableRow key={actividad.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{actividad.codigo}</TableCell>
                          <TableCell>{actividad.nombre}</TableCell>
                          <TableCell>{getFuncionNombre(actividad.funcionSustantivaId)}</TableCell>
                          <TableCell>{actividad.descripcion}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Disponible
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleInterest(actividad.id)}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              Interés
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredActividades.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No se encontraron actividades con los filtros aplicados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
