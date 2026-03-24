'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'

// Mapeo de roles a nombres amigables
const rolNames: Record<string, string> = {
  'administrador': 'Administrador',
  'comision': 'Comisión Académica',
  'comision_academica': 'Comisión Académica',
  'direccion': 'Dirección',
  'decano': 'Decano',
  'subdecano': 'Subdecano',
  'docente': 'Docente',
  'profesor': 'Profesor',
  'estudiante': 'Estudiante'
}

export function MainHeader() {
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getRoleName = (rol: string) => {
    return rolNames[rol] || rol
  }

  // Evitar error de hidratación
  if (!mounted) {
    return (
      <header className="bg-emerald-700 text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <h1 className="text-xl font-bold cursor-pointer">UNESUM</h1>
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-emerald-700 text-white px-6 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo y título */}
          <Link href="/dashboard">
            <h1 className="text-xl font-bold cursor-pointer">UNESUM</h1>
          </Link>
        </div>
        
        {/* Información de usuario y botón de logout */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="opacity-80">Bienvenido, </span>
              <span className="font-medium">{getRoleName(user.rol)}</span>
            </div>
            
            {/* BOTÓN DE CERRAR SESIÓN */}
            <Button 
              onClick={logout} 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-emerald-600 flex items-center gap-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Cerrar Sesión</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}