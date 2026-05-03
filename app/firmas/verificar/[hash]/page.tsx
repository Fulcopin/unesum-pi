'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  User,
  FileText,
  Hash,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ETAPA_LABELS: Record<string, string> = {
  docente: 'Docente',
  comision_academica: 'Comisión Académica',
  direccion: 'Dirección de Carrera',
  decano: 'Decano',
};

interface VerificacionData {
  firma: {
    id: number;
    etapa: string;
    usuario_nombre: string | null;
    usuario_rol: string | null;
    firmado_at: string;
    observaciones: string | null;
    hash_firma: string;
  };
  documento: {
    tipo: string;
    id: number;
    nombre: string;
    periodo: string;
    asignatura: { id: number; nombre: string; codigo: string | null } | null;
  } | null;
}

export default function VerificarFirmaPage() {
  const params = useParams<{ hash: string }>();
  const hash = params?.hash;

  const [valido, setValido] = useState<boolean | null>(null);
  const [data, setData] = useState<VerificacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/firmas/verificar/${hash}`);
        const json = await res.json();
        setValido(!!json.valido);
        if (json.valido) {
          setData(json.data);
        } else {
          setError(json.message || 'Firma no válida');
        }
      } catch (e: any) {
        setValido(false);
        setError(e.message || 'Error al verificar');
      } finally {
        setLoading(false);
      }
    })();
  }, [hash]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="text-center pb-3">
          {loading ? (
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-2 animate-spin" />
          ) : valido ? (
            <ShieldCheck className="h-14 w-14 text-green-600 mx-auto mb-2" />
          ) : (
            <ShieldAlert className="h-14 w-14 text-red-600 mx-auto mb-2" />
          )}
          <CardTitle className="text-2xl">
            {loading
              ? 'Verificando firma...'
              : valido
              ? 'Firma válida'
              : 'Firma no válida'}
          </CardTitle>
          <CardDescription>
            {loading
              ? 'Comprobando autenticidad del comprobante'
              : valido
              ? 'Este código QR corresponde a una firma registrada en el sistema UNESUM.'
              : error || 'No se pudo verificar la firma.'}
          </CardDescription>
        </CardHeader>

        {valido && data && (
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <Badge className="bg-green-600 hover:bg-green-700 mb-2">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Firma auténtica
              </Badge>

              <div className="space-y-2 text-sm">
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="Firmado por"
                  value={data.firma.usuario_nombre || '-'}
                />
                <InfoRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Rol / Etapa"
                  value={
                    ETAPA_LABELS[data.firma.etapa] || data.firma.etapa
                  }
                />
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Fecha"
                  value={new Date(data.firma.firmado_at).toLocaleString(
                    'es-EC'
                  )}
                />
                {data.firma.observaciones && (
                  <div className="text-xs italic text-slate-600 mt-2 pl-6">
                    "{data.firma.observaciones}"
                  </div>
                )}
              </div>
            </div>

            {data.documento && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs uppercase text-slate-500 mb-2 font-semibold">
                  Documento firmado
                </p>
                <div className="space-y-2 text-sm">
                  <InfoRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Tipo"
                    value={
                      data.documento.tipo === 'syllabus'
                        ? 'Syllabus'
                        : 'Programa Analítico'
                    }
                  />
                  {data.documento.asignatura && (
                    <InfoRow
                      icon={<FileText className="h-4 w-4" />}
                      label="Asignatura"
                      value={data.documento.asignatura.nombre}
                    />
                  )}
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Periodo"
                    value={data.documento.periodo}
                  />
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-400 pt-2 border-t flex items-start gap-1">
              <Hash className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="break-all">{data.firma.hash_firma}</span>
            </div>
          </CardContent>
        )}

        {!loading && !valido && (
          <CardContent>
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
              <p className="font-semibold">Posibles causas:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                <li>El código QR no fue generado por este sistema.</li>
                <li>La firma fue revocada o el documento eliminado.</li>
                <li>El enlace está corrupto o incompleto.</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-500 mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-[10px] uppercase text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
