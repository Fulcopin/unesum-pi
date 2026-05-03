'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';

export default function DecanoMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['decano', 'administrador']}>
      <MiQRPersonal dashboardHref="/dashboard/decano" allowedRoles={['decano']} />
    </ProtectedRoute>
  );
}
