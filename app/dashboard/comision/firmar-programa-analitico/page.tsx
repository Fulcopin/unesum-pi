'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function ComisionFirmarProgramaAnaliticoPage() {
  return (
    <ProtectedRoute allowedRoles={['comision', 'comision_academica', 'administrador']}>
      <DocumentosFirmarVista
        tipo="programa_analitico"
        etapaUsuario="comision_academica"
        rolDashboard="comision"
      />
    </ProtectedRoute>
  );
}
