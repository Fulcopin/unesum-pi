'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function DireccionSyllabusPage() {
  return (
    <ProtectedRoute allowedRoles={['direccion', 'administrador']}>
      <DocumentosFirmarVista
        tipo="syllabus"
        etapaUsuario="director_academico"
        rolDashboard="direccion"
      />
    </ProtectedRoute>
  );
}
