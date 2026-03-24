"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MainHeader } from "@/components/layout/main-header"
import { AlertTriangle, Bug } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"

export default function UnauthorizedPage() {
  const { user } = useAuth()
  const [showDebug, setShowDebug] = useState(false)
  
  // Analizar el rol del usuario para diagnóstico
  let roleDiagnosis = "No se pudo determinar el problema";
  let possibleSolution = "Contacta al administrador del sistema";
  
  if (user) {
    const userRole = user.rol?.toString().toLowerCase().trim() || "";
    
    // Casos específicos de diagnóstico
    if (!user.rol) {
      roleDiagnosis = "No tienes ningún rol asignado en la base de datos";
      possibleSolution = "Solicita que te asignen el rol 'administrador'";
    } else if (userRole !== "administrador") {
      roleDiagnosis = `Tu rol '${user.rol}' no coincide exactamente con 'administrador'`;
      possibleSolution = "La comparación es estricta. El rol debe ser exactamente 'administrador'";
    } else if (user.rol !== "administrador") {
      roleDiagnosis = "Tu rol tiene diferencias de mayúsculas/minúsculas con 'administrador'";
      possibleSolution = "El rol debe ser exactamente 'administrador' (todo en minúsculas)";
    } else if (user.rol.includes(" ")) {
      roleDiagnosis = "Tu rol contiene espacios adicionales";
      possibleSolution = "El rol debe ser 'administrador' sin espacios";
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />

      <main className="flex items-center justify-center px-6 py-20">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600">Acceso Denegado</CardTitle>
            <CardDescription>No tienes permisos para acceder a esta página</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Tu rol actual no tiene los permisos necesarios para ver este contenido. Contacta al administrador si crees
              que esto es un error.
            </p>
            
            {/* Información de diagnóstico */}
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 text-left mt-2">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Bug className="h-4 w-4 text-amber-600" />
                  <span>Diagnóstico del problema:</span>
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex">
                    <span className="font-medium w-24">Usuario:</span>
                    <span>{user.nombres} {user.apellidos}</span>
                  </div>
                  
                  <div className="flex">
                    <span className="font-medium w-24">Email:</span>
                    <span>{user.correo_electronico}</span>
                  </div>
                  
                  <div className="flex">
                    <span className="font-medium w-24">Rol exacto:</span>
                    <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">{JSON.stringify(user.rol)}</code>
                  </div>
                  
                  <div className="flex">
                    <span className="font-medium w-24">Tipo de rol:</span>
                    <span>{typeof user.rol}</span>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="font-medium text-amber-700 mb-1">Posible problema:</p>
                    <p className="text-gray-700">{roleDiagnosis}</p>
                  </div>
                  
                  <div className="mt-1">
                    <p className="font-medium text-emerald-700 mb-1">Solución recomendada:</p>
                    <p className="text-gray-700">{possibleSolution}</p>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-gray-500">
                  <p>Nota: En el archivo <code>protected-route.tsx</code> la verificación espera que el rol sea exactamente "administrador".</p>
                  <p>En el archivo <code>auth.middleware.js</code> del backend, la autorización también es estricta.</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  Ir al Dashboard
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Ir al Inicio</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}