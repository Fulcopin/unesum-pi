"use client"

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainHeader } from '@/components/layout/main-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Upload, Search, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ComisionSyllabusPage() {
  const [searchTerm, setSearchTerm] = useState('')
  
  const [syllabusList] = useState([
    {
      id: 1,
      codigo: 'TI-03',
      asignatura: 'Fundamentos de Programación',
      carrera: 'Tecnologías de la Información',
      periodo: 'PI 2025',
      nivel: 'I',
      profesor: 'Lcdo. Fulco Pincay Ponce, Msig',
      estado: 'Aprobado',
      fechaCreacion: '2025-05-12',
    },
  ])

  const filteredSyllabus = syllabusList.filter(
    (s) =>
      s.asignatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.profesor.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <ProtectedRoute allowedRoles={['comision', 'comision_academica']}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard/comision">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-purple-800 mb-2">Gestión de Syllabus</h1>
            <p className="text-gray-600">Administra los syllabus de todas las asignaturas</p>
          </div>

          <Tabs defaultValue="lista" className="space-y-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger
                value="lista"
                className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Lista de Syllabus
              </TabsTrigger>
              <TabsTrigger
                value="subir"
                className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Documento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lista" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Syllabus Registrados</CardTitle>
                      <CardDescription>Visualiza y gestiona todos los syllabus del sistema</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Link href="/dashboard/comision/syllabus/extraer-titulos">
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          <Upload className="h-4 w-4 mr-2" />
                          Extraer Títulos de Syllabus
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por asignatura, código o profesor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {filteredSyllabus.map((syllabus) => (
                      <Card key={syllabus.id} className="border-l-4 border-l-purple-500">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">{syllabus.asignatura}</h3>
                                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                                  {syllabus.estado}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Código:</span> {syllabus.codigo}
                                </div>
                                <div>
                                  <span className="font-medium">Carrera:</span> {syllabus.carrera}
                                </div>
                                <div>
                                  <span className="font-medium">Período:</span> {syllabus.periodo}
                                </div>
                                <div>
                                  <span className="font-medium">Nivel:</span> {syllabus.nivel}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Profesor:</span> {syllabus.profesor}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 bg-transparent"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subir" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subir Documento de Syllabus</CardTitle>
                  <CardDescription>Sube un archivo Word (.docx) y el sistema extraerá automáticamente los títulos y contenido</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center py-12">
                    <Upload className="h-16 w-16 mx-auto text-purple-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Extracción Automática de Títulos
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Nuestro sistema lee documentos Word y extrae automáticamente los títulos y secciones del syllabus
                    </p>
                    <Link href="/dashboard/comision/syllabus/extraer-titulos">
                      <Button className="bg-purple-600 hover:bg-purple-700" size="lg">
                        <Upload className="h-5 w-5 mr-2" />
                        Ir a Subir Documento
                      </Button>
                    </Link>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Características:</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Extracción automática de títulos y secciones</li>
                      <li>Compatible con documentos Word (.docx)</li>
                      <li>Guarda el contenido de forma estructurada</li>
                      <li>Asocia el documento con periodo y materias</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  )
}
