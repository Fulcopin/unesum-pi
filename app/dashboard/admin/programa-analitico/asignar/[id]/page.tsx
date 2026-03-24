"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, UserPlus, Loader2, CheckCircle, Search } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useParams } from "next/navigation"

interface Profesor {
  id: number
  nombres: string
  apellidos: string
  email: string
}

interface Asignatura {
  id: number
  nombre: string
  codigo: string
}

interface Nivel {
  id: number
  nombre: string
}

interface Paralelo {
  id: number
  nombre: string
}

interface Periodo {
  id: number
  nombre: string
}

export default function AsignarProgramaAnaliticoPage() {
  const { token, getToken } = useAuth()
  const params = useParams()
  const programaId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [paralelos, setParalelos] = useState<Paralelo[]>([])
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")

  const [formData, setFormData] = useState({
    profesorId: "",
    asignaturaId: "",
    nivelId: "",
    paraleloId: "",
    periodoId: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const currentToken = token || getToken()

      const [profesoresRes, asignaturasRes, nivelesRes, paralelosRes, periodosRes] = await Promise.all([
        fetch('http://localhost:4000/api/profesores', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/asignaturas', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/niveles', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/paralelos', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        }),
        fetch('http://localhost:4000/api/datos-academicos/periodos', {
          headers: { 'Authorization': `Bearer ${currentToken}` }
        })
      ])

      const [profesoresData, asignaturasData, nivelesData, paralelosData, periodosData] = await Promise.all([
        profesoresRes.json(),
        asignaturasRes.json(),
        nivelesRes.json(),
        paralelosRes.json(),
        periodosRes.json()
      ])

      setProfesores(profesoresData.data || [])
      setAsignaturas(asignaturasData.data || [])
      setNiveles(nivelesData.data || [])
      setParalelos(paralelosData.data || [])
      setPeriodos(periodosData.data || [])

    } catch (err) {
      console.error('Error al cargar datos:', err)
      setError('Error al cargar los datos necesarios')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.profesorId) {
      setError('Debe seleccionar un profesor')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const currentToken = token || getToken()

      const response = await fetch('http://localhost:4000/api/programa-analitico/asignar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          programaAnaliticoId: parseInt(programaId),
          profesorId: parseInt(formData.profesorId),
          asignaturaId: formData.asignaturaId ? parseInt(formData.asignaturaId) : null,
          nivelId: formData.nivelId ? parseInt(formData.nivelId) : null,
          paraleloId: formData.paraleloId ? parseInt(formData.paraleloId) : null,
          periodoId: formData.periodoId ? parseInt(formData.periodoId) : null
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al asignar programa')
      }

      setSuccess('✅ Programa analítico asignado exitosamente al docente')
      
      // Limpiar formulario
      setFormData({
        profesorId: "",
        asignaturaId: "",
        nivelId: "",
        paraleloId: "",
        periodoId: ""
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al asignar'
      setError(errorMessage)
      console.error('Error:', err)
    } finally {
      setSaving(false)
    }
  }

  const profesoresFiltrados = profesores.filter(prof =>
    `${prof.nombres} ${prof.apellidos} ${prof.email}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["administrador"]}>
        <div className="min-h-screen bg-gray-50">
          <MainHeader />
          <main className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link href="/dashboard/admin/programa-analitico">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Programas Analíticos
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#00563F] mb-2">Asignar Programa Analítico</h1>
            <p className="text-gray-600">Asigne este programa analítico a un docente específico</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {success}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Información de Asignación
              </CardTitle>
              <CardDescription>
                Seleccione el docente y los datos académicos correspondientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Buscador y selector de profesor */}
                <div className="space-y-2">
                  <Label htmlFor="busqueda">Buscar Profesor</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="busqueda"
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profesor">Profesor *</Label>
                  <Select value={formData.profesorId} onValueChange={(value) => setFormData({ ...formData, profesorId: value })}>
                    <SelectTrigger id="profesor">
                      <SelectValue placeholder="Seleccione un profesor" />
                    </SelectTrigger>
                    <SelectContent>
                      {profesoresFiltrados.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No se encontraron profesores</div>
                      ) : (
                        profesoresFiltrados.map((profesor) => (
                          <SelectItem key={profesor.id} value={profesor.id.toString()}>
                            {profesor.nombres} {profesor.apellidos} - {profesor.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="asignatura">Asignatura</Label>
                    <Select value={formData.asignaturaId} onValueChange={(value) => setFormData({ ...formData, asignaturaId: value })}>
                      <SelectTrigger id="asignatura">
                        <SelectValue placeholder="Seleccione asignatura" />
                      </SelectTrigger>
                      <SelectContent>
                        {asignaturas.map((asignatura) => (
                          <SelectItem key={asignatura.id} value={asignatura.id.toString()}>
                            {asignatura.nombre} ({asignatura.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nivel">Nivel</Label>
                    <Select value={formData.nivelId} onValueChange={(value) => setFormData({ ...formData, nivelId: value })}>
                      <SelectTrigger id="nivel">
                        <SelectValue placeholder="Seleccione nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        {niveles.map((nivel) => (
                          <SelectItem key={nivel.id} value={nivel.id.toString()}>
                            {nivel.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paralelo">Paralelo</Label>
                    <Select value={formData.paraleloId} onValueChange={(value) => setFormData({ ...formData, paraleloId: value })}>
                      <SelectTrigger id="paralelo">
                        <SelectValue placeholder="Seleccione paralelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {paralelos.map((paralelo) => (
                          <SelectItem key={paralelo.id} value={paralelo.id.toString()}>
                            {paralelo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="periodo">Periodo Académico</Label>
                    <Select value={formData.periodoId} onValueChange={(value) => setFormData({ ...formData, periodoId: value })}>
                      <SelectTrigger id="periodo">
                        <SelectValue placeholder="Seleccione periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem key={periodo.id} value={periodo.id.toString()}>
                            {periodo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t flex gap-3">
                  <Button
                    type="submit"
                    disabled={saving || !formData.profesorId}
                    className="flex-1 bg-[#00563F] hover:bg-[#00563F]/90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Asignando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Asignar Programa
                      </>
                    )}
                  </Button>
                  <Link href="/dashboard/admin/programa-analitico">
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
