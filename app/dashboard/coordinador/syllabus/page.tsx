'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function CoordinadorSyllabusPage() {
  return (
    <ProtectedRoute allowedRoles={['coordinador', 'administrador']}>
      <DocumentosFirmarVista
        tipo="syllabus"
        etapaUsuario="coordinador"
        rolDashboard="coordinador"
      />
    </ProtectedRoute>
  );
}
