"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { UserRole } from "@/types"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // Evitar error de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && isMounted) {
      console.log('🔐 ProtectedRoute - Verificando acceso:', {
        user: user?.rol,
        allowedRoles,
        isLoading,
        isMounted
      })

      if (!user) {
        console.log('❌ No hay usuario, redirigiendo a login')
        router.push(redirectTo)
        return
      }

      if (allowedRoles && !allowedRoles.includes(user.rol as any)) {
        console.log('❌ Rol no permitido:', user.rol, 'permitidos:', allowedRoles)
        router.push("/unauthorized")
        return
      }

      console.log('✅ Acceso permitido')
      setIsChecking(false)
    }
  }, [user, isLoading, allowedRoles, redirectTo, router, isMounted])

  // Mostrar loader mientras verifica
  if (!isMounted || isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (allowedRoles && !allowedRoles.includes(user.rol as any)) {
    return null
  }

  return <>{children}</>
}