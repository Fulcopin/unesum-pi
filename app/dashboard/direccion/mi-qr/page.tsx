'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';

export default function DireccionMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['direccion', 'administrador']}>
      <MiQRPersonal dashboardHref="/dashboard/direccion" allowedRoles={['direccion']} />
    </ProtectedRoute>
  );
}
