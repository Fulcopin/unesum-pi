'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';

export default function ComisionMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['comision', 'comision_academica']}>
      <MiQRPersonal dashboardHref="/dashboard/comision" allowedRoles={['comision', 'comision_academica']} />
    </ProtectedRoute>
  );
}
