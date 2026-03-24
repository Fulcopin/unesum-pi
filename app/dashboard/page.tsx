"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      console.log("Dashboard redirect - User:", user)
      console.log("Dashboard redirect - Role:", user.rol)
      
      // Redirect based on user role - CAMBIO: user.rol en lugar de user.role
      switch (user.rol) {
        case "administrador":
          router.push("/dashboard/admin")
          break
        case "comision":
        case "comision_academica":
          router.push("/dashboard/comision")
          break
        case "direccion":
          router.push("/dashboard/direccion")
          break
        case "decano":
          router.push("/dashboard/decano")
          break
        case "subdecano":
          router.push("/dashboard/subdecano")
          break
        case "docente":
          router.push("/dashboard/docente")
          break
        case "estudiante":
          router.push("/dashboard/estudiante")
          break
        default:
          console.log("Unknown role, redirecting to default:", user.rol)
          router.push("/dashboard/default")
      }
    }
  }, [user, router])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirigiendo a tu dashboard...</p>
            {user && <p className="text-xs text-gray-400 mt-2">Rol: {user.rol}</p>}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}