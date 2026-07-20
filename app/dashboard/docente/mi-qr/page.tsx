'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';
import { ModuloGuard } from '@/components/auth/modulo-guard';

export default function DocenteMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['docente', 'profesor', 'administrador']}>
      <ModuloGuard>
        <MiQRPersonal dashboardHref="/dashboard/docente" allowedRoles={['docente', 'profesor']} />
      </ModuloGuard>
    </ProtectedRoute>
  );
}
