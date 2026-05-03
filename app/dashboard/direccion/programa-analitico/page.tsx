'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DocumentosFirmarVista } from '@/components/firmas/documentos-firmar-vista';

export default function DireccionProgramaAnaliticoPage() {
  return (
    <ProtectedRoute allowedRoles={['direccion', 'administrador']}>
      <DocumentosFirmarVista
        tipo="programa_analitico"
        etapaUsuario="direccion"
        rolDashboard="direccion"
      />
    </ProtectedRoute>
  );
}
