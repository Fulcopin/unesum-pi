'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';

export default function DocenteMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['docente', 'profesor', 'administrador']}>
      <MiQRPersonal dashboardHref="/dashboard/docente" allowedRoles={['docente', 'profesor']} />
    </ProtectedRoute>
  );
}
