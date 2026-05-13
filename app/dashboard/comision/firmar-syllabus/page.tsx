'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function ComisionFirmarSyllabusPage() {
  return (
    <ProtectedRoute allowedRoles={['coordinador', 'comision', 'comision_academica', 'administrador']}>
      <DocumentosFirmarVista
        tipo="syllabus"
        etapaUsuario="coordinador"
        rolDashboard="comision"
      />
    </ProtectedRoute>
  );
}
