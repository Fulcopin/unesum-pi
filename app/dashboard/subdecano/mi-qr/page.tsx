'use client';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MiQRPersonal } from '@/components/firmas/mi-qr-personal';

export default function SubdecanoMiQRPage() {
  return (
    <ProtectedRoute allowedRoles={['subdecano']}>
      <MiQRPersonal dashboardHref="/dashboard/subdecano" allowedRoles={['subdecano']} />
    </ProtectedRoute>
  );
}
