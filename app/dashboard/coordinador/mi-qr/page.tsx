'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';

export default function CoordinadorMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['coordinador', 'administrador']}>
      <MiQRPersonal dashboardHref="/dashboard/coordinador" allowedRoles={['coordinador']} />
    </ProtectedRoute>
  );
}
