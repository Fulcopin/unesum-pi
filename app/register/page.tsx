"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, User, Mail, Lock, Phone, MapPin, Calendar, GraduationCap } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    cedula: "",
    email: "",
    telefono: "",
    fechaNacimiento: "",
    direccion: "",
    rol: "",
    facultad: "",
    carrera: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // CORREGIDO #1: Se añadió la palabra clave "async"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones básicas
    const newErrors: Record<string, string> = {}

    if (!formData.nombres) newErrors.nombres = "Los nombres son requeridos"
    if (!formData.apellidos) newErrors.apellidos = "Los apellidos son requeridos"
    if (!formData.cedula) newErrors.cedula = "La cédula es requerida"
    if (!formData.email) newErrors.email = "El email es requerido"
    if (!formData.password) newErrors.password = "La contraseña es requerida"
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
    }
    if (!formData.rol) newErrors.rol = "Debe seleccionar un rol"
    if (!formData.acceptTerms) newErrors.acceptTerms = "Debe aceptar los términos y condiciones"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const fechaNacimientoDate = formData.fechaNacimiento ? new Date(formData.fechaNacimiento) : undefined;
      const userData = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        cedula_identidad: formData.cedula,
        telefono: formData.telefono,
        correo_electronico: formData.email,
        fecha_nacimiento: fechaNacimientoDate,
        direccion: formData.direccion,
        rol: formData.rol,
        facultad: formData.facultad,
        carrera: formData.carrera,
        contraseña: formData.password,
        estado: true
        
      }
      const result = await register(userData)

      if (result.success) {
        router.push('/login?registered=true')
      } else {
        setErrors({ submit: result.error || 'Error al registrar usuario' })
      }
    } catch (error) {
      setErrors({ submit: 'Error al registrar usuario' })
    }
  }
  // CORREGIDO #2: Se eliminó la llave '}' extra que estaba aquí

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <Image src="/images/unesum-campus-aerial.png" alt="Campus UNESUM" fill className="object-cover" />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/images/unesum-logo-official.png"
              alt="UNESUM Logo"
              width={60}
              height={60}
              className="bg-white rounded-full p-2"
            />
            <div className="text-white">
              <h1 className="text-2xl font-bold">UNESUM</h1>
              <p className="text-sm opacity-90">Sistema de Gestión Académica</p>
            </div>
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-emerald-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-700">Crear Cuenta</CardTitle>
            <CardDescription className="text-gray-600">
              Complete el formulario para registrarse en el sistema académico
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Personal */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombres" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nombres *
                  </Label>
                  <Input
                    id="nombres"
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    className={errors.nombres ? "border-red-500" : ""}
                    placeholder="Ingrese sus nombres"
                  />
                  {errors.nombres && <p className="text-red-500 text-sm">{errors.nombres}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellidos" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Apellidos *
                  </Label>
                  <Input
                    id="apellidos"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    className={errors.apellidos ? "border-red-500" : ""}
                    placeholder="Ingrese sus apellidos"
                  />
                  {errors.apellidos && <p className="text-red-500 text-sm">{errors.apellidos}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cedula">Cédula de Identidad *</Label>
                  <Input
                    id="cedula"
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                    className={errors.cedula ? "border-red-500" : ""}
                    placeholder="1234567890"
                  />
                  {errors.cedula && <p className="text-red-500 text-sm">{errors.cedula}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Teléfono
                  </Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="0987654321"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Correo Electrónico *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errors.email ? "border-red-500" : ""}
                    placeholder="usuario@unesum.edu.ec"
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de Nacimiento
                  </Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Dirección
                </Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Ingrese su dirección completa"
                />
              </div>

              {/* Información Académica */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Información Académica
                </h3>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rol">Rol en el Sistema *</Label>
                    <Select onValueChange={(value: string) => setFormData({ ...formData, rol: value })}>
                      <SelectTrigger className={errors.rol ? "border-red-500" : ""}>
                        <SelectValue placeholder="Seleccione su rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estudiante">Estudiante</SelectItem>
                        <SelectItem value="docente">Docente</SelectItem>
                        <SelectItem value="subdecano">Subdecano</SelectItem>
                        <SelectItem value="decano">Decano</SelectItem>
                        <SelectItem value="direccion">Dirección</SelectItem>
                        <SelectItem value="comision">Comisión</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.rol && <p className="text-red-500 text-sm">{errors.rol}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facultad">Facultad</Label>
                    <Select
                      value={formData.facultad}
                      onValueChange={(value: string) => setFormData({ ...formData, facultad: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione facultad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ciencias-tecnicas">Ciencias Técnicas</SelectItem>
                        <SelectItem value="ciencias-economicas">Ciencias Económicas</SelectItem>
                        <SelectItem value="ciencias-salud">Ciencias de la Salud</SelectItem>
                        <SelectItem value="ciencias-sociales">Ciencias Sociales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carrera">Carrera</Label>
                    <Select
                      value={formData.carrera}
                      onValueChange={(value: string) => setFormData({ ...formData, carrera: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione carrera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sistemas">Ingeniería en Sistemas</SelectItem>
                        <SelectItem value="industrial">Ingeniería Industrial</SelectItem>
                        <SelectItem value="administracion">Administración de Empresas</SelectItem>
                        <SelectItem value="contabilidad">Contabilidad y Auditoría</SelectItem>
                        <SelectItem value="enfermeria">Enfermería</SelectItem>
                        <SelectItem value="medicina">Medicina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seguridad */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Seguridad
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={errors.password ? "border-red-500" : ""}
                      placeholder="Mínimo 8 caracteres"
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={errors.confirmPassword ? "border-red-500" : ""}
                      placeholder="Repita la contraseña"
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>

              {/* Términos y Condiciones */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked: boolean) => {
                    // El 'as boolean' ya no es necesario porque 'checked' ya es un booleano
                    setFormData({ ...formData, acceptTerms: checked })
                  }}
                />
                <Label htmlFor="acceptTerms" className="text-sm">
                  Acepto los{" "}
                  <Link href="/terms" className="text-emerald-700 hover:underline">
                    términos y condiciones
                  </Link>{" "}
                  del sistema académico UNESUM
                </Label>
              </div>
              {errors.acceptTerms && <p className="text-red-500 text-sm">{errors.acceptTerms}</p>}

              {/* Botones */}
              <div className="flex gap-4 pt-6">
                <Button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-3">
                  Crear Cuenta
                </Button>
                <Link href="/login" className="flex-1">
                  <Button type="button" variant="outline" className="w-full py-3 bg-transparent">
                    Ya tengo cuenta
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}