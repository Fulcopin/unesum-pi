'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function ComisionFirmarSyllabusPage() {
  return (
    <ProtectedRoute allowedRoles={['comision', 'comision_academica', 'administrador']}>
      <DocumentosFirmarVista
        tipo="syllabus"
        etapaUsuario="comision_academica"
        rolDashboard="comision"
      />
    </ProtectedRoute>
  );
}
