'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, UserCog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export function MainHeader() {
  const { user, logout, cambiarRol } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getRoleName = (rol: string) => rolNames[rol] || rol

  const handleCambiarRol = async (nuevoRol: string) => {
    if (!nuevoRol || nuevoRol === user?.rol) return
    setSwitching(true)
    const ok = await cambiarRol(nuevoRol)
    if (ok) {
      const destino = rolDashboardPath[nuevoRol] || '/dashboard'
      router.push(destino)
    } else {
      alert('No se pudo cambiar el rol. Intente nuevamente.')
    }
    setSwitching(false)
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-700 text-white px-6 py-3 shadow-lg border-b border-emerald-600/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-white rounded-lg p-1 shadow-sm">
                <Image src="/images/escudo-unesum.png" alt="Escudo UNESUM" width={40} height={40} className="object-contain" />
              </div>
              <h1 className="text-base font-bold leading-tight cursor-pointer">
                Universidad Estatal del Sur de Manabí
              </h1>
            </Link>
          </div>
        </div>
      </header>
    )
  }

  const rolesDelUsuario: string[] = Array.isArray(user?.roles) && user!.roles!.length > 0
    ? (user!.roles as string[])
    : (user?.rol ? [user.rol] : [])
  const tieneVariosRoles = rolesDelUsuario.length > 1

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-700 text-white px-6 py-3 shadow-lg border-b border-emerald-600/20">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex-shrink-0 bg-white rounded-lg p-1 shadow-sm">
              <Image src="/images/escudo-unesum.png" alt="Escudo UNESUM" width={40} height={40} className="object-contain" />
            </div>
            <h1 className="text-base font-bold leading-tight cursor-pointer">
              Universidad Estatal del Sur de Manabí
            </h1>
          </Link>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="opacity-80">Bienvenido, </span>
              <span className="font-medium">{getRoleName(user.rol)}</span>
            </div>

            {tieneVariosRoles && (
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 opacity-80" />
                <Select
                  value={user.rol}
                  onValueChange={handleCambiarRol}
                  disabled={switching}
                >
                  <SelectTrigger className="h-8 min-w-[180px] bg-emerald-600 border-emerald-500 text-white text-sm">
                    <SelectValue placeholder="Cambiar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesDelUsuario.map(r => (
                      <SelectItem key={r} value={r}>
                        {getRoleName(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
