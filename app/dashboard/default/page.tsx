"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home } from "lucide-react"
import Link from "next/link"

export default function DefaultDashboard() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="flex items-center justify-center px-6 py-20">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-yellow-600">Dashboard No Configurado</CardTitle>
              <CardDescription>Tu rol no tiene un dashboard específico configurado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Contacta al administrador del sistema para configurar el acceso apropiado para tu rol.
              </p>
              <Link href="/">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Home className="h-4 w-4 mr-2" />
                  Ir al Inicio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  )
}
