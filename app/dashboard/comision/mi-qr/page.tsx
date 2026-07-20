'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';
import { ModuloGuard } from '@/components/auth/modulo-guard';

export default function ComisionMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['comision', 'comision_academica']}>
      <ModuloGuard>
        <MiQRPersonal dashboardHref="/dashboard/comision" allowedRoles={['comision', 'comision_academica']} />
      </ModuloGuard>
    </ProtectedRoute>
  );
}
