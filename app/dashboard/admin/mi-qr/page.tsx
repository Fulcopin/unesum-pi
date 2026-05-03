'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';

export default function AdminMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador']}>
      <MiQRPersonal dashboardHref="/dashboard/admin" allowedRoles={['administrador']} />
    </ProtectedRoute>
  );
}
