"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { UserRole } from "@/types"

const rolDashboardPath: Record<string, string> = {
  administrador: '/dashboard/admin',
  comision: '/dashboard/comision',
  comision_academica: '/dashboard/comision',
  docente: '/dashboard/docente',
  profesor: '/dashboard/docente',
  direccion: '/dashboard/direccion',
  decano: '/dashboard/decano',
  subdecano: '/dashboard/subdecano',
  estudiante: '/dashboard/estudiante',
}

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({ children, allowedRoles, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const prevRol = useRef<string | null>(null)

  // Evitar error de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && isMounted) {
      if (!user) {
        console.log('❌ No hay usuario, redirigiendo a login')
        router.push(redirectTo)
        return
      }

      // Si el rol cambió, navegar al dashboard correcto en vez de /unauthorized
      if (allowedRoles && !allowedRoles.includes(user.rol as any)) {
        const destino = rolDashboardPath[user.rol] || '/dashboard'
        // Sólo redirigir si no estamos ya en camino al destino
        if (!pathname.startsWith(destino)) {
          console.log('🔄 Rol cambió a', user.rol, '- redirigiendo a', destino)
          router.push(destino)
        }
        // Mientras navega, mostrar spinner (isChecking sigue true)
        return
      }

      console.log('✅ Acceso permitido')
      prevRol.current = user.rol
      setIsChecking(false)
    }
  }, [user, isLoading, allowedRoles, redirectTo, router, isMounted, pathname])

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