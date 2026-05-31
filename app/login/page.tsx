"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { MainHeader } from "@/components/layout/main-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Eye, EyeOff, Shield, GraduationCap, BookOpen, Users, Building2,
  User, ChevronRight, Loader2, ArrowLeft,
} from "lucide-react"

interface RoleOption {
  rol: string
  nombre: string
  descripcion: string
  rolNombre?: string
}

// Configuración visual de cada rol
const ROL_CONFIG: Record<string, {
  icono: React.ElementType
  color: string
  bg: string
  border: string
  etiqueta: string
  destino: string
}> = {
  administrador:    { icono: Shield,       color: "text-red-700",     bg: "bg-red-100",     border: "border-red-300",    etiqueta: "Administrador",      destino: "/dashboard/admin" },
  comision_academica:{ icono: Users,       color: "text-blue-700",    bg: "bg-blue-100",    border: "border-blue-300",   etiqueta: "Comisión Académica",  destino: "/dashboard/comision" },
  comision:         { icono: Users,        color: "text-blue-700",    bg: "bg-blue-100",    border: "border-blue-300",   etiqueta: "Comisión",           destino: "/dashboard/comision" },
  direccion:        { icono: Building2,    color: "text-indigo-700",  bg: "bg-indigo-100",  border: "border-indigo-300", etiqueta: "Dirección",          destino: "/dashboard/direccion" },
  decano:           { icono: Building2,    color: "text-purple-700",  bg: "bg-purple-100",  border: "border-purple-300", etiqueta: "Decano",             destino: "/dashboard/decano" },
  subdecano:        { icono: Building2,    color: "text-violet-700",  bg: "bg-violet-100",  border: "border-violet-300", etiqueta: "Sub Decano",         destino: "/dashboard/subdecano" },
  docente:          { icono: GraduationCap,color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300",etiqueta: "Docente",            destino: "/dashboard/docente" },
  profesor:         { icono: GraduationCap,color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-300",etiqueta: "Profesor/Docente",   destino: "/dashboard/docente" },
  estudiante:       { icono: BookOpen,     color: "text-cyan-700",    bg: "bg-cyan-100",    border: "border-cyan-300",   etiqueta: "Estudiante",         destino: "/dashboard/estudiante" },
}

const defaultConfig = {
  icono: User, color: "text-gray-700", bg: "bg-gray-100", border: "border-gray-300",
  etiqueta: "Usuario", destino: "/dashboard",
}

export default function LoginPage() {
  const [email, setEmail]               = useState("")
  const [password, setPassword]         = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [loadingRol, setLoadingRol]     = useState<string | null>(null)
  const [error, setError]               = useState("")
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [availableRoles, setAvailableRoles]     = useState<RoleOption[]>([])
  const [userName, setUserName]         = useState("")

  const { login } = useAuth()
  const router    = useRouter()

  // ── Enviar credenciales ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const result = await login(email, password)

      if (result === "multiple_roles") {
        const rolesData: RoleOption[] = JSON.parse(localStorage.getItem("pending_roles") || "[]")
        setAvailableRoles(rolesData)
        setUserName(rolesData[0]?.nombre || "")
        setShowRoleSelector(true)
        setIsLoading(false)
        return
      }

      if (result === true || result === "success") {
        redirectByRole()
      } else {
        setError("Credenciales inválidas. Verifica tu correo y contraseña.")
        setIsLoading(false)
      }
    } catch {
      setError("Error al iniciar sesión. Intenta nuevamente.")
      setIsLoading(false)
    }
  }

  // ── Seleccionar rol y entrar ────────────────────────────────────
  const handleRoleSelect = async (selectedRole: string) => {
    setLoadingRol(selectedRole)
    setError("")
    try {
      const result = await login(email, password, selectedRole)
      if (result === true || result === "success") {
        // Redirigir directamente al destino del rol seleccionado
        const destino = ROL_CONFIG[selectedRole]?.destino || "/dashboard"
        router.push(destino)
      } else {
        setError("Error al ingresar con ese rol. Intenta nuevamente.")
        setLoadingRol(null)
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
      setLoadingRol(null)
    }
  }

  const redirectByRole = () => {
    const userData = JSON.parse(localStorage.getItem("user_data") || "{}")
    const destino = ROL_CONFIG[userData.rol]?.destino || "/dashboard"
    router.push(destino)
  }

  // ══════════════════════════════════════════════════════════════════
  // PANTALLA DE SELECCIÓN DE ROL
  // ══════════════════════════════════════════════════════════════════
  if (showRoleSelector) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="fixed inset-0 z-0">
          <Image
            src="/images/campus-aerial-unesum.png"
            alt="Campus UNESUM"
            fill
            priority
            unoptimized
            quality={100}
            className="object-cover object-[center_30%]"
            style={{ filter: 'contrast(1.1) brightness(1.05) saturate(1.1)' }}
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-teal-900/5 to-emerald-950/5"
            aria-hidden
          />
        </div>

        <div className="relative z-20">
          <MainHeader />
        </div>
        <main className="relative z-10 flex min-h-[calc(100dvh-4.25rem)] items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/95 p-8 shadow-2xl">

            {/* Bienvenida */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 mb-4">
                <User className="h-8 w-8 text-emerald-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                ¡Bienvenido{userName ? `, ${userName.split(" ")[0]}` : ""}!
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                {availableRoles.length === 1
                  ? "Confirma con qué rol deseas ingresar al sistema."
                  : `Tu cuenta tiene ${availableRoles.length} roles. Selecciona con cuál deseas ingresar.`}
              </p>
            </div>

            {/* Tarjetas de rol */}
            <div className="space-y-3">
              {availableRoles.map((role) => {
                const cfg = ROL_CONFIG[role.rol] || defaultConfig
                const IconComponent = cfg.icono
                const isThisLoading = loadingRol === role.rol
                const anyLoading    = loadingRol !== null

                return (
                  <button
                    key={role.rol}
                    onClick={() => handleRoleSelect(role.rol)}
                    disabled={anyLoading}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left
                      ${anyLoading ? "opacity-60 cursor-not-allowed" : "hover:shadow-md hover:scale-[1.01] cursor-pointer"}
                      ${isThisLoading ? `${cfg.bg} ${cfg.border}` : "bg-white border-gray-200 hover:border-emerald-400"}`}
                  >
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                      {isThisLoading
                        ? <Loader2 className={`h-6 w-6 animate-spin ${cfg.color}`} />
                        : <IconComponent className={`h-6 w-6 ${cfg.color}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-base">
                        {role.rolNombre || cfg.etiqueta}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {cfg.destino.replace("/dashboard/", "Panel de ").replace("/dashboard", "Panel principal")}
                        {" — "}
                        <span className="text-xs text-gray-400">{role.descripcion}</span>
                      </p>
                    </div>
                    {!anyLoading && (
                      <ChevronRight className="flex-shrink-0 h-5 w-5 text-gray-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              variant="ghost"
              className="w-full mt-5 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setShowRoleSelector(false)
                setAvailableRoles([])
                setLoadingRol(null)
                setError("")
              }}
              disabled={loadingRol !== null}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver e ingresar con otra cuenta
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // FORMULARIO DE LOGIN
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100">
      <MainHeader />
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-0 shadow-2xl rounded-2xl overflow-hidden">

          {/* ── Lado izquierdo: imagen campus con escudo ── */}
          <div className="hidden md:flex relative overflow-hidden min-h-[520px]">
            {/* Imagen campus+escudo de fondo */}
            <Image
              src="/images/campus-escudo-unesum.png"
              alt="Campus UNESUM"
              fill
              className="object-cover object-center"
              priority
              unoptimized
              quality={100}
              style={{ filter: 'contrast(1.15) brightness(1.1) saturate(1.15)' }}
            />
            {/* Overlay muy suave solo en la parte inferior para el texto */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 via-emerald-900/5 to-transparent" />

            {/* Texto en la parte inferior (caja semitransparente para legibilidad) */}
            <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
              <div className="max-w-3xl mx-auto bg-black/40 rounded-2xl p-6">
                <p className="text-lg font-black text-white mb-4 tracking-wide uppercase" style={{textShadow: '0 2px 10px rgba(0,0,0,0.85)'}}>
                  Sistema de{" "}
                  <span className="text-emerald-200">Gestión Académica</span>
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    "Mallas Curriculares",
                    "Syllabus Docente",
                    "Gestión de Firmas",
                    "Control de Roles",
                    "Programas Analíticos",
                  ].map((tag) => (
                    <span key={tag} className="text-[11px] bg-white/10 border border-white/20 text-white px-2.5 py-1 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-emerald-200/90">© {new Date().getFullYear()} UNESUM — Todos los derechos reservados</p>
              </div>
            </div>
          </div>

          {/* ── Lado derecho: formulario ── */}
          <div className="bg-white flex items-center justify-center p-10">
            <div className="w-full max-w-sm">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4">
                  <Shield className="h-7 w-7 text-emerald-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
                <p className="text-sm text-gray-500 mt-1">Accede con tu cuenta institucional</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@unesum.edu.ec"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(p => !p)}
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

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verificando...</>
                    : "Ingresar →"}
                </Button>
              </form>

              {/* Indicador de pasos */}
              <div className="mt-7 flex items-center justify-center gap-2 text-xs text-gray-400">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">1</span>
                <span>Credenciales</span>
                <ChevronRight className="h-3 w-3" />
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-semibold">2</span>
                <span>Seleccionar rol</span>
                <ChevronRight className="h-3 w-3" />
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-semibold">3</span>
                <span>Panel</span>
              </div>
              <p className="mt-5 text-center text-xs text-gray-300">by apf</p>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
