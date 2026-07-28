"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { PanelAutorizaciones } from "@/components/habilitaciones/panel-autorizaciones"

export default function DecanoAutorizacionesPage() {
  return (
    <ProtectedRoute allowedRoles={["decano", "subdecano"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <PanelAutorizaciones
          volverA="/dashboard/decano"
          descripcion="Solicitudes de los coordinadores de las carreras de tu facultad para reabrirle el plazo a un docente."
        />
      </div>
    </ProtectedRoute>
  )
}
