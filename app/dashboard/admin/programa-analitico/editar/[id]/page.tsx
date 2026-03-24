"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { EditorSeccionesJSON } from "@/components/programa-analitico/editor-secciones-json"

interface ProgramaAnalitico {
  id: number
  nombre: string
  datos_tabla: any
  createdAt: string
  updatedAt: string
}

export default function EditarProgramaPage({ params }: { params: { id: string } }) {
  const { token, getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [programa, setPrograma] = useState<ProgramaAnalitico | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPrograma()
  }, [params.id])

  const fetchPrograma = async () => {
    try {
      setLoading(true)
      setError(null)
      const currentToken = token || getToken()
      
      if (!currentToken) {
        throw new Error('No se encontró token de autenticación')
      }
      
      const response = await fetch(`http://localhost:4000/api/programa-analitico/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Error al obtener el programa analítico')
      }

      setPrograma(data.data)
      setError(null)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos'
      setError(errorMessage)
      console.error('Error al obtener programa:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGuardar = async (secciones: any[]) => {
    try {
      const currentToken = token || getToken()
      
      if (!currentToken) {
        throw new Error('No se encontró token de autenticación')
      }

      const response = await fetch(`http://localhost:4000/api/programas-analiticos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: programa?.nombre,
          datos_tabla: {
            ...programa?.datos_tabla,
            secciones: secciones,
            fecha_actualizacion: new Date().toISOString()
          }
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al guardar')
      }

      // Actualizar el estado local
      await fetchPrograma()

    } catch (error) {
      console.error('Error al guardar:', error)
      throw error // Re-lanzar para que el componente lo maneje
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["administrador", "comision_academica"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={["administrador", "comision_academica"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-6">
              <Link href="/dashboard/admin/programa-analitico">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
            </div>
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <h2 className="text-lg font-semibold mb-2">Error al cargar</h2>
              <p>{error}</p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (!programa) {
    return (
      <ProtectedRoute allowedRoles={["administrador", "comision_academica"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-6">
              <Link href="/dashboard/admin/programa-analitico">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
            </div>
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <p>No se encontró el programa analítico</p>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["administrador", "comision_academica"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard/admin/programa-analitico">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Programas Analíticos
              </Button>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#00563F] mb-2">
              Editar Programa Analítico
            </h1>
            <p className="text-gray-600">
              {programa.nombre}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Última actualización: {new Date(programa.updatedAt).toLocaleString('es-ES')}
            </p>
          </div>

          {/* Editor de Secciones JSON */}
          <EditorSeccionesJSON
            datosIniciales={programa.datos_tabla}
            onGuardar={handleGuardar}
            titulo={`Programa Analítico: ${programa.nombre}`}
            modo="programa-analitico"
          />
        </main>
      </div>
    </ProtectedRoute>
  )
}
