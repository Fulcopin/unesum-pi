"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { UserPlus, Loader2 } from "lucide-react"

// --- DATOS DE EJEMPLO (En una aplicación real, vendrían de una API) ---
const facultades = [
  { id: "faci", nombre: "Facultad de Ciencias de la Ingeniería" },
  { id: "facae", nombre: "Facultad de Ciencias Administrativas y Económicas" },
  { id: "facs", nombre: "Facultad de Ciencias de la Salud" },
]

const carreras = [
  { id: "ing-software", nombre: "Ingeniería de Software", facultadId: "faci" },
  { id: "ing-telecom", nombre: "Ingeniería en Telecomunicaciones", facultadId: "faci" },
  { id: "admin-empresas", nombre: "Administración de Empresas", facultadId: "facae" },
  { id: "contabilidad", nombre: "Contabilidad y Auditoría", facultadId: "facae" },
  { id: "enfermeria", nombre: "Enfermería", facultadId: "facs" },
  { id: "medicina", nombre: "Medicina", facultadId: "facs" },
]

// --- COMPONENTE DE LA VISTA ---
export default function RegistrarProfesorPage() {
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    facultad: "",
    carrera: "",
    activo: true, // Por defecto, el profesor se registra como activo
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Memoizamos las carreras filtradas para que solo se recalculen cuando cambie la facultad
  const carrerasFiltradas = useMemo(() => {
    if (!formData.facultad) return []
    return carreras.filter(c => c.facultadId === formData.facultad)
  }, [formData.facultad])

  // --- MANEJADORES DE EVENTOS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: 'facultad' | 'carrera', value: string) => {
    setFormData(prev => {
        // Si cambia la facultad, reseteamos la carrera
        const newState = { ...prev, [name]: value };
        if (name === 'facultad') {
            newState.carrera = '';
        }
        return newState;
    });
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, activo: checked }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    console.log("Datos a enviar:", formData)
    
    // Simulación de una llamada a la API
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    alert(`Profesor ${formData.nombres} ${formData.apellidos} registrado exitosamente!`)
    
    // Aquí podrías resetear el formulario si lo deseas
    // setFormData({ nombres: "", apellidos: "", email: "", facultad: "", carrera: "", activo: true });

    setIsSubmitting(false)
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Registrar Nuevo Profesor</CardTitle>
          <CardDescription>Complete el formulario para añadir un nuevo docente al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="nombres">Nombres</Label>
                <Input
                  id="nombres"
                  name="nombres"
                  placeholder="Ej: Juan Carlos"
                  value={formData.nombres}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  name="apellidos"
                  placeholder="Ej: Pérez González"
                  value={formData.apellidos}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico Institucional</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="juan.perez@universidad.edu"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="facultad">Facultad</Label>
                  <Select
                    name="facultad"
                    value={formData.facultad}
                    onValueChange={(value) => handleSelectChange('facultad', value)}
                    required
                  >
                    <SelectTrigger id="facultad">
                      <SelectValue placeholder="Seleccione una facultad" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultades.map((facultad) => (
                        <SelectItem key={facultad.id} value={facultad.id}>
                          {facultad.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="carrera">Carrera Principal</Label>
                  <Select
                    name="carrera"
                    value={formData.carrera}
                    onValueChange={(value) => handleSelectChange('carrera', value)}
                    disabled={!formData.facultad} // Se deshabilita si no hay facultad
                    required
                  >
                    <SelectTrigger id="carrera">
                      <SelectValue placeholder="Seleccione una carrera" />
                    </SelectTrigger>
                    <SelectContent>
                      {carrerasFiltradas.map((carrera) => (
                        <SelectItem key={carrera.id} value={carrera.id}>
                          {carrera.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <div className="flex items-center space-x-4 rounded-md border p-4">
                <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Estado del Profesor</p>
                    <p className="text-sm text-muted-foreground">
                        Define si el profesor estará activo o inactivo en el sistema.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="estado-switch" className={!formData.activo ? "text-red-600" : "text-gray-500"}>
                        Inactivo
                    </Label>
                    <Switch
                        id="estado-switch"
                        checked={formData.activo}
                        onCheckedChange={handleSwitchChange}
                    />
                    <Label htmlFor="estado-switch" className={formData.activo ? "text-green-600" : "text-gray-500"}>
                        Activo
                    </Label>
                </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registrar Profesor
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}