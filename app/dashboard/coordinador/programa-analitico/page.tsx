'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function CoordinadorProgramaAnaliticoPage() {
  return (
    <ProtectedRoute allowedRoles={['coordinador', 'administrador']}>
      <DocumentosFirmarVista
        tipo="programa_analitico"
        etapaUsuario="coordinador"
        rolDashboard="coordinador"
      />
    </ProtectedRoute>
  );
}
