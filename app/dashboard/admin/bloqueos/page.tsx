"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { ModuloGuard } from "@/components/auth/modulo-guard"
import { PanelBloqueos } from "@/components/bloqueos/panel-bloqueos"

export default function AdminBloqueosPage() {
  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <ModuloGuard href="/dashboard/admin/bloqueos">
          <PanelBloqueos modo="admin" volverA="/dashboard/admin" />
        </ModuloGuard>
      </div>
    </ProtectedRoute>
  )
}
