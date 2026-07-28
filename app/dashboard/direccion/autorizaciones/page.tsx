"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { MainHeader } from "@/components/layout/main-header"
import { PanelAutorizaciones } from "@/components/habilitaciones/panel-autorizaciones"

export default function DireccionAutorizacionesPage() {
  return (
    <ProtectedRoute allowedRoles={["direccion"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <PanelAutorizaciones
          volverA="/dashboard/direccion"
          descripcion="Solicitudes de los coordinadores de todas las facultades para reabrirle el plazo a un docente."
        />
      </div>
    </ProtectedRoute>
  )
}
