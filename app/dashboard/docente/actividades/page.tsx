"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, FileWarning } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

// Interfaz para los datos que esperamos de la nueva API
interface SyllabusInfo {
  id: number;
  nombre: string;
  materias: string;
  periodo: string;
  updated_at: string;
}

interface ApiResponse {
  periodo: string;
  syllabi: SyllabusInfo[];
}

export default function MisSyllabusPage() {
  const { token, getToken } = useAuth()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para obtener la API URL de forma segura
  const getApiUrl = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error("La variable de entorno NEXT_PUBLIC_API_URL no está definida.");
    }
    return apiUrl;
  }

  useEffect(() => {
    const fetchMisSyllabus = async () => {
      try {
        const fullUrl = `${getApiUrl()}/api/syllabi/mine`
        const currentToken = token || getToken()
        if (!currentToken) return; // No hacer la petición si no hay token

        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` }
        const response = await fetch(fullUrl, { headers })
        
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.message || "Error al cargar los syllabus.")
        }

        const result = await response.json()
        setData(result.data)
      } catch (err: any) {
        setError(err.message)
        console.error("Error en fetchMisSyllabus:", err);
      } finally {
        setIsLoading(false)
      }
    }

    fetchMisSyllabus()
  }, [token, getToken])

  return (
    <ProtectedRoute allowedRoles={["administrador", "profesor"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Syllabus</h1>
              <p className="text-gray-600">Gestiona y edita tus syllabus del periodo académico actual.</p>
            </div>
            <Link href="/editor-syllabus">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <PlusCircle className="h-4 w-4 mr-2" />
                Subir Nuevo Syllabus
              </Button>
            </Link>
          </div>

          {isLoading && (
             <div className="text-center py-12">
                <p className="text-gray-500">Cargando tus syllabus...</p>
             </div>
          )}

          {error && (
             <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
                <FileWarning className="mx-auto h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-xl font-medium text-red-800">Ocurrió un error</h3>
                <p className="mt-1 text-red-700">{error}</p>
             </div>
          )}
          
          {!isLoading && !error && data && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Periodo Actual: <span className="text-emerald-700">{data.periodo || "No definido"}</span>
              </h2>
              {data.syllabi.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.syllabi.map((syllabus) => (
                    <Card key={syllabus.id} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="truncate">{syllabus.nombre}</CardTitle>
                        <CardDescription>{syllabus.materias}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-sm text-gray-500">
                          Última modificación: {new Date(syllabus.updated_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Link href={`/editor-syllabus?id=${syllabus.id}`} className="w-full">
                          <Button variant="outline" className="w-full">
                            <Edit className="h-4 w-4 mr-2" />
                            Modificar
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                   <FileWarning className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-xl font-medium text-gray-800">No se encontraron syllabus</h3>
                  <p className="text-gray-500 mt-2">No has subido ningún syllabus para el periodo {data.periodo}.</p>
                  <Link href="/editor-syllabus" className="mt-4 inline-block">
                     <Button>Comienza subiendo uno</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}