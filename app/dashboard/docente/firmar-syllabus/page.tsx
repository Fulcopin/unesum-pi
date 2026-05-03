'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function DocenteFirmarSyllabusPage() {
  return (
    <ProtectedRoute allowedRoles={['docente', 'profesor', 'administrador']}>
      <DocumentosFirmarVista
        tipo="syllabus"
        etapaUsuario="docente"
        rolDashboard="docente"
      />
    </ProtectedRoute>
  );
}
