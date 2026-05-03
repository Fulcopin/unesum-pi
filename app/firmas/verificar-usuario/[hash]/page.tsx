'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  User,
  BookOpen,
  Hash,
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

interface UsuarioData {
  id: number;
  nombres: string;
  apellidos: string;
  correo_electronico: string;
  rol: string;
  roles: string[];
  facultad: string | null;
  carrera: string | null;
  cedula_identidad: string | null;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] uppercase text-slate-500 font-semibold">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function VerificarUsuarioPage() {
  const params = useParams<{ hash: string }>();
  const hash = params?.hash;

  const [estado, setEstado] = useState<'loading' | 'valido' | 'invalido'>('loading');
  const [usuario, setUsuario] = useState<UsuarioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/firmas/verificar-usuario/${hash}`);
        const json = await res.json();
        if (json.valido && json.data) {
          setUsuario(json.data);
          setEstado('valido');
        } else {
          setError(json.message || 'QR no válido');
          setEstado('invalido');
        }
      } catch (e: any) {
        setError(e.message || 'Error al verificar');
        setEstado('invalido');
      }
    })();
  }, [hash]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-bold">UNESUM · Firma Digital</span>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            {estado === 'loading' && <Loader2 className="h-16 w-16 animate-spin text-emerald-600 mx-auto mb-2" />}
            {estado === 'valido' && <ShieldCheck className="h-16 w-16 text-green-600 mx-auto mb-2" />}
            {estado === 'invalido' && <ShieldAlert className="h-16 w-16 text-red-600 mx-auto mb-2" />}

            <CardTitle className="text-xl">
              {estado === 'loading' && 'Verificando identidad...'}
              {estado === 'valido' && 'Identidad verificada'}
              {estado === 'invalido' && 'QR no válido'}
            </CardTitle>
            <CardDescription>
              {estado === 'loading' && 'Comprobando autenticidad del código QR'}
              {estado === 'valido' && 'Este QR corresponde a un miembro registrado en UNESUM.'}
              {estado === 'invalido' && (error || 'El código QR no pudo ser verificado.')}
            </CardDescription>
          </CardHeader>

          {estado === 'valido' && usuario && (
            <CardContent className="space-y-4 pt-2">
              {/* Rol destacado */}
              <div className="flex justify-center">
                <Badge className="text-sm px-4 py-1 bg-emerald-600 hover:bg-emerald-700">
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  {ROL_LABELS[usuario.rol] || usuario.rol}
                </Badge>
              </div>

              {/* Datos del usuario */}
              <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-3">
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="Nombre completo"
                  value={`${usuario.nombres} ${usuario.apellidos}`}
                />
                <InfoRow
                  icon={<Mail className="h-4 w-4" />}
                  label="Correo electrónico"
                  value={usuario.correo_electronico}
                />
                {usuario.cedula_identidad && (
                  <InfoRow
                    icon={<Hash className="h-4 w-4" />}
                    label="Cédula de identidad"
                    value={usuario.cedula_identidad}
                  />
                )}
                {usuario.facultad && (
                  <InfoRow
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Facultad"
                    value={usuario.facultad}
                  />
                )}
                {usuario.carrera && (
                  <InfoRow
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Carrera"
                    value={usuario.carrera}
                  />
                )}
                {usuario.roles && usuario.roles.length > 1 && (
                  <div>
                    <p className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Roles en el sistema</p>
                    <div className="flex flex-wrap gap-1">
                      {usuario.roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs">
                          {ROL_LABELS[r] || r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-slate-600 font-medium">
                  Este código QR es el sello digital oficial de este usuario en el sistema UNESUM.
                </p>
              </div>

              <p className="text-[10px] text-slate-400 text-center break-all">
                QR Hash: {hash}
              </p>
            </CardContent>
          )}

          {estado === 'invalido' && (
            <CardContent>
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                <p className="font-semibold mb-1">Posibles causas:</p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs">
                  <li>El QR no fue generado por este sistema.</li>
                  <li>El usuario fue eliminado del sistema.</li>
                  <li>El código QR está dañado o incompleto.</li>
                </ul>
              </div>
            </CardContent>
          )}
        </Card>

        <p className="text-center text-[10px] text-slate-400 mt-4">
          Universidad Nacional de Educación Superior de Machala — UNESUM · Sistema de Firma Digital
        </p>
      </div>
    </div>
  );
}
