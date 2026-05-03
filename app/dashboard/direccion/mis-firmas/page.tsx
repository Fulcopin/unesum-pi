'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MisDocumentosFirma from '@/components/firmas/mis-documentos-firma';

export default function MisFirmasDireccionPage() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) router.replace('/login');
  }, [isLoading, token, router]);

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return <MisDocumentosFirma token={token} />;
}
