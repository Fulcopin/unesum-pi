'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { MainHeader } from '@/components/layout/main-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  QrCode,
  ShieldCheck,
  User,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ROL_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  decano: 'Decano',
  direccion: 'Dirección de Carrera',
  docente: 'Docente',
  profesor: 'Docente',
  comision: 'Comisión Académica',
  comision_academica: 'Comisión Académica',
  subdecano: 'Subdecano',
  estudiante: 'Estudiante',
};

const ROL_COLORES: Record<string, string> = {
  decano: 'bg-red-600',
  direccion: 'bg-blue-700',
  docente: 'bg-emerald-700',
  profesor: 'bg-emerald-700',
  comision: 'bg-purple-700',
  comision_academica: 'bg-purple-700',
  administrador: 'bg-slate-700',
};

interface MiQRData {
  hash: string;
  url_verificacion: string;
  qr_data_url: string;
  usuario: {
    id: number;
    nombres: string;
    apellidos: string;
    correo_electronico: string;
    rol: string;
  };
}

interface Props {
  dashboardHref: string;
  allowedRoles: string[];
}

export function MiQRPersonal({ dashboardHref, allowedRoles }: Props) {
  const { user, getToken } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<MiQRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = getToken();
        const res = await fetch(`${API_URL}/firmas/mi-qr`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Error');
        setData(json.data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const descargarQR = () => {
    if (!data) return;
    const a = document.createElement('a');
    a.href = data.qr_data_url;
    a.download = `qr-sello-${user?.apellidos || 'usuario'}.png`;
    a.click();
  };

  const rolColor = ROL_COLORES[user?.rol || ''] || 'bg-slate-700';
  const rolLabel = ROL_LABELS[user?.rol || ''] || user?.rol || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => router.push(dashboardHref)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>

        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <QrCode className="h-6 w-6 text-emerald-600" />
          Mi Sello Digital Personal
        </h1>

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-emerald-600" />
            <p className="text-slate-500">Generando tu QR personal...</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && data && (
          <div className="space-y-4">
            {/* Tarjeta principal */}
            <Card className="shadow-lg border-0 overflow-hidden">
              {/* Header de color */}
              <div className={`${rolColor} text-white px-6 py-4`}>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">
                      {data.usuario.nombres} {data.usuario.apellidos}
                    </p>
                    <p className="text-white/80 text-sm">{rolLabel}</p>
                  </div>
                </div>
              </div>

              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* QR grande */}
                  <div className="flex-shrink-0 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.qr_data_url}
                      alt="Mi QR personal"
                      className="h-52 w-52 border-4 border-slate-200 rounded-xl mx-auto"
                    />
                    <p className="text-xs text-slate-400 mt-2">Sello digital · UNESUM</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">Nombre:</span>
                        <span className="font-semibold">{data.usuario.nombres} {data.usuario.apellidos}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">Correo:</span>
                        <span className="font-semibold">{data.usuario.correo_electronico}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">Rol:</span>
                        <Badge className={`${rolColor} hover:opacity-90`}>{rolLabel}</Badge>
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                      <p className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        ¿Para qué sirve este QR?
                      </p>
                      <ul className="text-xs text-emerald-700 space-y-0.5 list-disc pl-4">
                        <li>Es tu <strong>sello digital personal</strong> en el sistema UNESUM.</li>
                        <li>Al firmar un documento, este QR queda registrado como constancia.</li>
                        <li>Cualquiera puede escanearlo para verificar tu identidad.</li>
                        <li>Es único e irrepetible para tu usuario.</li>
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={descargarQR}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar QR
                      </Button>
                      <Button variant="outline" onClick={() => window.print()}>
                        Imprimir
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verificación */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Enlace de verificación</CardTitle>
                <CardDescription>
                  Este enlace es público. Cualquier persona puede verificar tu identidad escaneando el QR.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs break-all text-slate-700">
                  {data.url_verificacion}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
