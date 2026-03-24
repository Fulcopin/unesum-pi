"use client"

import type React from "react"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, FileText, Upload, Search, Edit, Trash2, Eye, Loader2, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function SyllabusManagementPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [syllabusList, setSyllabusList] = useState([
    {
      id: 1,
      codigo: "TI-03",
      asignatura: "Fundamentos de Programación",
      carrera: "Tecnologías de la Información",
      periodo: "PI 2025",
      nivel: "I",
      profesor: "Lcdo. Fulco Pincay Ponce, Msig",
      estado: "Aprobado",
      fechaCreacion: "2025-05-12",
    },
  ])

  const filteredSyllabus = syllabusList.filter(
    (s) =>
      s.asignatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.profesor.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[v0] Evento de selección de archivo disparado")
    const file = e.target.files?.[0]
    console.log("[v0] Archivo seleccionado:", file)

    if (file) {
      // Validar tipo de archivo
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ]

      console.log("[v0] Tipo de archivo:", file.type)

      if (!validTypes.includes(file.type)) {
        setUploadStatus({
          type: "error",
          message: "Tipo de archivo no válido. Solo se permiten PDF y Word.",
        })
        return
      }

      // Validar tamaño (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadStatus({
          type: "error",
          message: "El archivo es demasiado grande. El tamaño máximo es 10 MB.",
        })
        return
      }

      setSelectedFile(file)
      setUploadStatus({ type: null, message: "" })
      console.log("[v0] Archivo válido y listo para subir")
    }
  }

  const handleUpload = () => {
    // Redirigir a la página dedicada de subir documento
    router.push('/dashboard/admin/syllabus/subir-documento')
  }

  const handleDelete = async (id: number, fileUrl?: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este syllabus?")) return

    try {
      // Si hay un archivo asociado, eliminarlo de Blob
      if (fileUrl) {
        await fetch("/api/syllabus/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fileUrl }),
        })
      }

      // Eliminar de la lista
      setSyllabusList(syllabusList.filter((s) => s.id !== id))
    } catch (error) {
      console.error("[v0] Error al eliminar:", error)
      alert("Error al eliminar el syllabus")
    }
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-emerald-800 mb-2">Gestión de Syllabus</h1>
            <p className="text-gray-600">Administra los syllabus de todas las asignaturas</p>
          </div>

          <Tabs defaultValue="lista" className="space-y-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger
                value="lista"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Lista de Syllabus
              </TabsTrigger>
              <TabsTrigger
                value="subir"
                className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
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
                      <Link href="/dashboard/admin/syllabus/extraer-titulos">
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          <Upload className="h-4 w-4 mr-2" />
                          Extraer Títulos de Syllabus
                        </Button>
                      </Link>
                      <Link href="/dashboard/admin/syllabus/subir-documento">
                        <Button variant="outline" className="border-[#00563F] text-[#00563F] hover:bg-[#00563F] hover:text-white">
                          <Upload className="h-4 w-4 mr-2" />
                          Subir Documento Word
                        </Button>
                      </Link>
                      <Link href="/dashboard/admin/syllabus/nuevo">
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Nuevo Syllabus
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
                      <Card key={syllabus.id} className="border-l-4 border-l-emerald-500">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">{syllabus.asignatura}</h3>
                                <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
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
                              <Link href={`/dashboard/admin/syllabus/${syllabus.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-transparent"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/dashboard/admin/syllabus/${syllabus.id}/editar`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 bg-transparent"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                                onClick={() => handleDelete(syllabus.id, (syllabus as any).fileUrl)}
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
                    <Upload className="h-16 w-16 mx-auto text-emerald-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Extracción Automática de Títulos
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Nuestro sistema lee documentos Word y extrae automáticamente los títulos y secciones del syllabus
                    </p>
                    <Link href="/dashboard/admin/syllabus/subir-documento">
                      <Button className="bg-emerald-600 hover:bg-emerald-700" size="lg">
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
