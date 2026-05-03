'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function DecanoSyllabusPage() {
  return (
    <ProtectedRoute allowedRoles={['decano', 'administrador']}>
      <DocumentosFirmarVista
        tipo="syllabus"
        etapaUsuario="decano"
        rolDashboard="decano"
      />
    </ProtectedRoute>
  );
}
