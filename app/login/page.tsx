"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { MainHeader } from "@/components/layout/main-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Shield, GraduationCap, BookOpen, Users } from "lucide-react"

interface RoleOption {
  rol: string;
  nombre: string;
  descripcion: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([])

  const { login } = useAuth()
  const router = useRouter()

  const roleIcons: Record<string, any> = {
    'administrador': Shield,
    'comision_academica': Users,
    'comision': Users,
    'profesor': GraduationCap,
    'docente': GraduationCap,
  }

  const roleColors: Record<string, string> = {
    'administrador': 'bg-red-500',
    'comision_academica': 'bg-blue-500',
    'comision': 'bg-blue-500',
    'profesor': 'bg-emerald-500',
    'docente': 'bg-emerald-500',
  }

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
  
    try {
      const result = await login(email, password);
      
      if (result === 'multiple_roles') {
        // El backend indicó múltiples roles — mostrar selector
        const rolesData = JSON.parse(localStorage.getItem('pending_roles') || '[]');
        setAvailableRoles(rolesData);
        setShowRoleSelector(true);
        setIsLoading(false);
        return;
      }
      
      if (result === true || result === 'success') {
        redirectByRole();
      } else {
        setError("Credenciales inválidas. Verifica tu email y contraseña.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      setError("Error al iniciar sesión. Intente nuevamente.");
      setIsLoading(false);
    }
  };

  const handleRoleSelect = async (selectedRole: string) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await login(email, password, selectedRole);
      if (result === true || result === 'success') {
        redirectByRole();
      } else {
        setError("Error al seleccionar rol. Intente nuevamente.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error al seleccionar rol:', error);
      setError("Error al iniciar sesión con el rol seleccionado.");
      setIsLoading(false);
    }
  };

  const redirectByRole = () => {
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    
    console.log('DEBUG - Usuario después del login:', userData);
    console.log('DEBUG - Rol detectado:', userData.rol);

    if (userData.rol === 'administrador') {
      router.push('/dashboard/admin');
    } else if (userData.rol === 'profesor' || userData.rol === 'docente') {
      router.push('/dashboard/docente');
    } else if (userData.rol === 'comision' || userData.rol === 'comision_academica') {
      router.push('/dashboard/comision');
    } else {
      setError("Rol de usuario no reconocido. Contacte al soporte.");
      setIsLoading(false);
    }
  };
  const demoUsers = [
    { email: "admin@unesum.edu.ec", password: "admin123", role: "Administrador" },
    { email: "docente@unesum.edu.ec", password: "docente123", role: "Docente" },
  { email: "decano@unesum.edu.ec", password: "decano123", role: "Decano" },
  { email: "comision@unesum.edu.ec", password: "comision123", role: "Comisión Académica" },
  ]

  // --- SELECTOR DE ROL ---
  if (showRoleSelector && availableRoles.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
        <MainHeader />
        <main className="flex items-center justify-center px-6 py-20">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-emerald-700">Seleccionar Rol</CardTitle>
              <CardDescription>
                Tu cuenta tiene múltiples roles. Selecciona con cuál deseas ingresar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableRoles.map((role, index) => {
                const IconComponent = roleIcons[role.rol] || BookOpen;
                const bgColor = roleColors[role.rol] || 'bg-gray-500';
                return (
                  <button
                    key={index}
                    onClick={() => handleRoleSelect(role.rol)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-4 p-4 border-2 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 text-left disabled:opacity-50"
                  >
                    <div className={`p-3 rounded-lg ${bgColor} text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{role.descripcion}</h3>
                      <p className="text-sm text-gray-500">Rol: {role.rol}</p>
                    </div>
                    <div className="text-emerald-600 font-medium text-sm">
                      Ingresar →
                    </div>
                  </button>
                );
              })}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setShowRoleSelector(false);
                  setAvailableRoles([]);
                  setError("");
                }}
              >
                ← Volver al login
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      <MainHeader />

      <main className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          {/* Login Form */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-emerald-700">Iniciar Sesión</CardTitle>
              <CardDescription>Accede al sistema de gestión académica</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@unesum.edu.ec"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                  {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Demo Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usuarios de Demostración</CardTitle>
              <CardDescription>Utiliza estas credenciales para probar el sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoUsers.map((user, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-emerald-700">{user.role}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmail(user.email)
                        setPassword(user.password)
                      }}
                    >
                      Usar
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>
                      <strong>Email:</strong> {user.email}
                    </p>
                    <p>
                      <strong>Contraseña:</strong> {user.password}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
