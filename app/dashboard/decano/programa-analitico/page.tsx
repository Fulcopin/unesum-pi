'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function DecanoProgramaAnaliticoPage() {
  return (
    <ProtectedRoute allowedRoles={['decano', 'administrador']}>
      <DocumentosFirmarVista
        tipo="programa_analitico"
        etapaUsuario="decano"
        rolDashboard="decano"
      />
    </ProtectedRoute>
  );
}
