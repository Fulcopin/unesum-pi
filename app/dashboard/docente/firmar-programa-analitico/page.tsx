'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function DocenteFirmarProgramaAnaliticoPage() {
  return (
    <ProtectedRoute allowedRoles={['docente', 'profesor', 'administrador']}>
      <DocumentosFirmarVista
        tipo="programa_analitico"
        etapaUsuario="docente"
        rolDashboard="docente"
      />
    </ProtectedRoute>
  );
}
