"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Filter } from "lucide-react"
import type { Docente } from "@/types"

export default function DecanoDocentesPage() {
  const [docentes, setDocentes] = useState<Docente[]>([])
  const [filteredDocentes, setFilteredDocentes] = useState<Docente[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCarrera, setFilterCarrera] = useState("all")
  const [filterEstado, setFilterEstado] = useState("all")

  // Mock data - replace with real API calls
  useEffect(() => {
    const mockDocentes: Docente[] = [
      {
        id: "1",
        nombre: "Juan Carlos",
        apellido: "Pérez González",
        cedula: "1234567890",
        telefono: "0999999999",
        correo: "juan.perez@unesum.edu.ec",
        fechaNacimiento: new Date("1980-05-15"),
        direccion: "Av. Principal 123, Jipijapa",
        facultad: "Ingeniería",
        carrera: "Ingeniería en Sistemas",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        nombre: "María Elena",
        apellido: "García Rodríguez",
        cedula: "0987654321",
        telefono: "0988888888",
        correo: "maria.garcia@unesum.edu.ec",
        fechaNacimiento: new Date("1975-08-22"),
        direccion: "Calle Secundaria 456, Jipijapa",
        facultad: "Ingeniería",
        carrera: "Ingeniería Civil",
        estado: "activo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        nombre: "Carlos Alberto",
        apellido: "Mendoza Silva",
        cedula: "1122334455",
        telefono: "0977777777",
        correo: "carlos.mendoza@unesum.edu.ec",
        fechaNacimiento: new Date("1985-03-10"),
        direccion: "Barrio Central 789, Jipijapa",
        facultad: "Ingeniería",
        carrera: "Ingeniería en Sistemas",
        estado: "inactivo",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    setDocentes(mockDocentes)
    setFilteredDocentes(mockDocentes)
  }, [])

  // Filter docentes based on search and filters
  useEffect(() => {
    let filtered = docentes

    if (searchTerm) {
      filtered = filtered.filter(
        (docente) =>
          docente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          docente.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
          docente.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          docente.cedula.includes(searchTerm),
      )
    }

    if (filterCarrera !== "all") {
      filtered = filtered.filter((docente) => docente.carrera === filterCarrera)
    }

    if (filterEstado !== "all") {
      filtered = filtered.filter((docente) => docente.estado === filterEstado)
    }

    setFilteredDocentes(filtered)
  }, [docentes, searchTerm, filterCarrera, filterEstado])

  const carreras = Array.from(new Set(docentes.map((d) => d.carrera)))

  return (
    <ProtectedRoute allowedRoles={["decano"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">GESTIÓN DE DOCENTES - FACULTAD</h1>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Filters Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros de Búsqueda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar Docente</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Nombre, apellido, cédula o correo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filterCarrera">Filtrar por Carrera</Label>
                    <Select value={filterCarrera} onValueChange={setFilterCarrera}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las carreras" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las carreras</SelectItem>
                        {carreras.map((carrera) => (
                          <SelectItem key={carrera} value={carrera}>
                            {carrera}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filterEstado">Filtrar por Estado</Label>
                    <Select value={filterEstado} onValueChange={setFilterEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{docentes.length}</div>
                  <div className="text-sm text-gray-600">Total Docentes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {docentes.filter((d) => d.estado === "activo").length}
                  </div>
                  <div className="text-sm text-gray-600">Docentes Activos</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{carreras.length}</div>
                  <div className="text-sm text-gray-600">Carreras</div>
                </CardContent>
              </Card>
            </div>

            {/* Table Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Docentes de la Facultad ({filteredDocentes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">N.</TableHead>
                        <TableHead className="font-semibold">Nombre Completo</TableHead>
                        <TableHead className="font-semibold">Cédula</TableHead>
                        <TableHead className="font-semibold">Correo</TableHead>
                        <TableHead className="font-semibold">Teléfono</TableHead>
                        <TableHead className="font-semibold">Carrera</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="font-semibold">Fecha Registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocentes.map((docente, index) => (
                        <TableRow key={docente.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{`${docente.nombre} ${docente.apellido}`}</TableCell>
                          <TableCell>{docente.cedula}</TableCell>
                          <TableCell>{docente.correo}</TableCell>
                          <TableCell>{docente.telefono}</TableCell>
                          <TableCell>{docente.carrera}</TableCell>
                          <TableCell>
                            <Badge
                              variant={docente.estado === "activo" ? "default" : "secondary"}
                              className={
                                docente.estado === "activo"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {docente.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>{docente.createdAt.toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                      {filteredDocentes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            No se encontraron docentes con los filtros aplicados
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
