"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { ModuloGuard } from "@/components/auth/modulo-guard"
import { PanelBloqueos } from "@/components/bloqueos/panel-bloqueos"

export default function ComisionBloqueosPage() {
  return (
    <ProtectedRoute allowedRoles={["comision", "comision_academica", "administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <ModuloGuard href="/dashboard/comision/bloqueos">
          <PanelBloqueos modo="comision" volverA="/dashboard/comision" />
        </ModuloGuard>
      </div>
    </ProtectedRoute>
  )
}
