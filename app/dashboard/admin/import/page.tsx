"use client"

import { useState } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExcelImportModal } from "@/components/excel/excel-import-modal"
import { FileSpreadsheet, Users, Activity, BookOpen, Download, Upload } from "lucide-react"

export default function ImportPage() {
  const [activeModal, setActiveModal] = useState<"docentes" | "actividades" | "funciones" | null>(null)

  const handleImportDocentes = (data: any[]) => {
    console.log("Importing docentes:", data)
    // Here you would integrate with your data management system
    alert(`Se importaron ${data.length} docentes exitosamente`)
  }

  const handleImportActividades = (data: any[]) => {
    console.log("Importing actividades:", data)
    alert(`Se importaron ${data.length} actividades exitosamente`)
  }

  const handleImportFunciones = (data: any[]) => {
    console.log("Importing funciones:", data)
    alert(`Se importaron ${data.length} funciones sustantivas exitosamente`)
  }

  const importModules = [
    {
      id: "docentes" as const,
      title: "Importar Docentes",
      description: "Importar información de docentes desde archivo Excel",
      icon: Users,
      color: "bg-blue-500",
      expectedColumns: [
        "nombre",
        "apellido",
        "cedula",
        "telefono",
        "correo",
        "fechaNacimiento",
        "direccion",
        "facultad",
        "carrera",
        "estado",
      ],
      sampleData: {
        nombre: "Juan Carlos",
        apellido: "Pérez González",
        cedula: "1234567890",
        telefono: "0999999999",
        correo: "juan.perez@unesum.edu.ec",
        fechaNacimiento: "1980-05-15",
        direccion: "Av. Principal 123",
        facultad: "Ingeniería",
        carrera: "Ingeniería en Sistemas",
        estado: "activo",
      },
      onImport: handleImportDocentes,
    },
    {
      id: "actividades" as const,
      title: "Importar Actividades",
      description: "Importar actividades extracurriculares desde archivo Excel",
      icon: Activity,
      color: "bg-emerald-500",
      expectedColumns: ["codigo", "nombre", "funcionSustantiva", "descripcion", "estado"],
      sampleData: {
        codigo: "ACT001",
        nombre: "Taller de Programación",
        funcionSustantiva: "Docencia",
        descripcion: "Taller especializado en programación",
        estado: "activo",
      },
      onImport: handleImportActividades,
    },
    {
      id: "funciones" as const,
      title: "Importar Funciones Sustantivas",
      description: "Importar funciones sustantivas desde archivo Excel",
      icon: BookOpen,
      color: "bg-purple-500",
      expectedColumns: ["codigo", "nombre", "descripcion", "estado"],
      sampleData: {
        codigo: "FS001",
        nombre: "Docencia",
        descripcion: "Actividades relacionadas con la enseñanza",
        estado: "activo",
      },
      onImport: handleImportFunciones,
    },
  ]

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-lg">
            <h1 className="text-2xl font-bold">MALLA CURRICULAR</h1>
          </div>

          <div className="bg-white rounded-b-lg shadow-lg p-6">
            {/* Instructions */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Instrucciones de Importación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Pasos para Importar:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                      <li>Descarga la plantilla Excel correspondiente</li>
                      <li>Completa los datos siguiendo el formato</li>
                      <li>Guarda el archivo en formato .xlsx o .xls</li>
                      <li>Selecciona el tipo de importación</li>
                      <li>Carga tu archivo y revisa la vista previa</li>
                      <li>Confirma la importación</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Formatos Soportados:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li>Microsoft Excel (.xlsx)</li>
                      <li>Microsoft Excel 97-2003 (.xls)</li>
                      <li>Tamaño máximo: 10MB</li>
                      <li>Máximo 1000 registros por archivo</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Import Modules */}
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {importModules.map((module) => {
                const IconComponent = module.icon
                return (
                  <Card key={module.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${module.color} text-white`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                      </div>
                      <p className="text-sm text-gray-600">{module.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-gray-500">
                        <p className="font-medium mb-1">Columnas requeridas:</p>
                        <p>{module.expectedColumns.join(", ")}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setActiveModal(module.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          size="sm"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Importar
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Plantilla
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Recent Imports */}
            <Card>
              <CardHeader>
                <CardTitle>Importaciones Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Docentes - Facultad de Ingeniería</p>
                        <p className="text-xs text-gray-500">25 registros importados</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Hace 2 horas</p>
                      <p className="text-xs text-green-600">Exitoso</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-sm font-medium">Actividades Extracurriculares</p>
                        <p className="text-xs text-gray-500">12 registros importados</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Ayer</p>
                      <p className="text-xs text-green-600">Exitoso</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Funciones Sustantivas</p>
                        <p className="text-xs text-gray-500">8 registros importados</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Hace 3 días</p>
                      <p className="text-xs text-green-600">Exitoso</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Import Modals */}
        {activeModal && (
          <ExcelImportModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={importModules.find((m) => m.id === activeModal)?.title || ""}
            expectedColumns={importModules.find((m) => m.id === activeModal)?.expectedColumns || []}
            sampleData={importModules.find((m) => m.id === activeModal)?.sampleData}
            importType={activeModal}
            onImport={importModules.find((m) => m.id === activeModal)?.onImport || (() => {})}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
