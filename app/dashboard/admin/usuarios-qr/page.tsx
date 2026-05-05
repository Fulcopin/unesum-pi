'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MainHeader } from '@/components/layout/main-header';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Download, Loader2, Printer, QrCode, Search, ShieldCheck, User,
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
  coordinador: 'Coordinador/a de Carrera',
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
  subdecano: 'bg-orange-600',
  coordinador: 'bg-indigo-600',
  estudiante: 'bg-teal-700',
};

interface UsuarioQR {
  id: number;
  nombres: string;
  apellidos: string;
  correo_electronico: string;
  rol: string;
  roles: string[];
  facultad: string | null;
  carrera: string | null;
  cedula_identidad: string | null;
  hash_qr: string;
  url_verificacion: string;
  qr_data_url: string;
}

// ── Tarjeta de usuario con QR ─────────────────────────────────────────────
function TarjetaUsuario({ u }: { u: UsuarioQR }) {
  const color = ROL_COLORES[u.rol] || 'bg-slate-600';
  const rolLabel = ROL_LABELS[u.rol] || u.rol;

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden print:break-inside-avoid print:shadow-none print:border-gray-300">
      {/* Cabecera con color de rol */}
      <div className={`${color} text-white px-3 py-2`}>
        <p className="text-xs font-bold uppercase tracking-wide">{rolLabel}</p>
      </div>

      <div className="p-3 flex gap-3 items-start">
        {/* QR */}
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={u.qr_data_url}
            alt={`QR de ${u.nombres}`}
            className="h-28 w-28 border rounded bg-white"
          />
        </div>

        {/* Datos */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-bold text-slate-800 text-sm leading-tight">
            {u.apellidos}, {u.nombres}
          </p>
          {u.cedula_identidad && (
            <p className="text-[10px] text-slate-500">CI: {u.cedula_identidad}</p>
          )}
          <p className="text-[10px] text-slate-500 truncate">{u.correo_electronico}</p>
          {u.carrera && <p className="text-[10px] text-slate-500 truncate">{u.carrera}</p>}
          {u.facultad && <p className="text-[10px] text-slate-400 truncate">{u.facultad}</p>}

          {/* Roles adicionales */}
          {u.roles && u.roles.length > 1 && (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {u.roles.map((r) => (
                <span
                  key={r}
                  className="text-[8px] bg-slate-100 text-slate-600 rounded px-1 py-0.5"
                >
                  {ROL_LABELS[r] || r}
                </span>
              ))}
            </div>
          )}

          <p className="text-[8px] text-slate-300 mt-1">
            Sello digital · UNESUM
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Contenido ─────────────────────────────────────────────────────────────
function UsuariosQRContent() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<UsuarioQR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generado, setGenerado] = useState(false);

  const [filtroRol, setFiltroRol] = useState<string>('all');
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    try {
      setLoading(true);
      setError(null);
      setGenerado(false);
      const token = getToken();
      const params = new URLSearchParams();
      if (filtroRol !== 'all') params.set('rol', filtroRol);
      const res = await fetch(`${API_URL}/firmas/qr-todos-usuarios?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Error');
      setUsuarios(json.data || []);
      setGenerado(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const visibles = useMemo(() => {
    if (!busqueda) return usuarios;
    const q = busqueda.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.nombres.toLowerCase().includes(q) ||
        u.apellidos.toLowerCase().includes(q) ||
        (u.cedula_identidad || '').includes(q) ||
        u.correo_electronico.toLowerCase().includes(q) ||
        (u.carrera || '').toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  // Agrupar por rol
  const porRol = useMemo(() => {
    const map = new Map<string, UsuarioQR[]>();
    const orden = ['decano', 'direccion', 'coordinador', 'comision_academica', 'comision', 'docente', 'profesor', 'subdecano', 'administrador', 'estudiante'];
    for (const u of visibles) {
      const key = u.rol;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    const result: { rol: string; label: string; items: UsuarioQR[] }[] = [];
    const seen = new Set<string>();
    for (const r of orden) {
      if (map.has(r) && !seen.has(r)) {
        result.push({ rol: r, label: ROL_LABELS[r] || r, items: map.get(r)! });
        seen.add(r);
      }
    }
    for (const [rol, items] of map) {
      if (!seen.has(rol)) result.push({ rol, label: ROL_LABELS[rol] || rol, items });
    }
    return result;
  }, [visibles]);

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />

      <main className="max-w-7xl mx-auto px-4 py-6 print:px-2 print:py-2">
        {/* Encabezado */}
        <div className="print:hidden mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver al panel
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-emerald-600" />
            QR Personal de Usuarios
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Cada usuario tiene un QR único que representa su identidad y sello digital para firmar documentos.
          </p>
        </div>

        {/* Título de impresión */}
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-xl font-bold">UNESUM — Sellos Digitales de Usuarios</h1>
          <p className="text-sm text-gray-500">Generado el {new Date().toLocaleDateString('es-EC')}</p>
        </div>

        {/* Controles */}
        <div className="print:hidden">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Generar QR personales</CardTitle>
              <CardDescription>
                Genera los códigos QR de todos los usuarios. Cada QR es único e identifica a la persona
                en el sistema. Úsalo como sello personal en documentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Filtrar por rol</Label>
                  <Select value={filtroRol} onValueChange={setFiltroRol}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los roles</SelectItem>
                      <SelectItem value="decano">Decano</SelectItem>
                      <SelectItem value="direccion">Dirección de Carrera</SelectItem>
                      <SelectItem value="coordinador">Coordinador/a de Carrera</SelectItem>
                      <SelectItem value="comision_academica">Comisión Académica</SelectItem>
                      <SelectItem value="docente">Docentes</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Buscar usuario</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-8"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Nombre, CI, correo..."
                    />
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={cargar}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4 mr-2" />
                    )}
                    Generar QR
                  </Button>
                  {generado && (
                    <Button variant="outline" onClick={() => window.print()}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instrucción */}
          {!generado && !loading && (
            <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 p-6 text-center mb-4">
              <QrCode className="h-14 w-14 mx-auto mb-3 text-emerald-500 opacity-60" />
              <p className="font-bold text-emerald-800 mb-2 text-lg">Sellos Digitales por Usuario</p>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Cada usuario del sistema tiene su propio <strong>QR único</strong>. Este QR
                funciona como su <strong>sello digital personal</strong>.
                Cuando firman un documento, su QR queda registrado como constancia de su identidad.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-500 max-w-sm mx-auto">
                <div className="bg-white rounded-lg p-2 border">
                  <div className="h-4 w-4 bg-red-600 rounded mx-auto mb-1" />
                  Decano
                </div>
                <div className="bg-white rounded-lg p-2 border">
                  <div className="h-4 w-4 bg-blue-700 rounded mx-auto mb-1" />
                  Dirección
                </div>
                <div className="bg-white rounded-lg p-2 border">
                  <div className="h-4 w-4 bg-emerald-700 rounded mx-auto mb-1" />
                  Docentes
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-emerald-600" />
            <p className="font-semibold text-lg">Generando sellos digitales...</p>
            <p className="text-sm text-slate-400 mt-1">Un QR único por cada usuario registrado.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4 print:hidden">
            {error}
          </div>
        )}

        {/* Resultado */}
        {generado && !loading && (
          <>
            <div className="print:hidden flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                <span className="font-bold text-slate-900">{visibles.length}</span> usuario(s) con QR generado
              </p>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir todos
              </Button>
            </div>

            {visibles.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-slate-500">
                  <User className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  No hay usuarios que coincidan con los filtros.
                </CardContent>
              </Card>
            )}

            {/* Por rol */}
            {porRol.map((grupo) => (
              <div key={grupo.rol} className="mb-6">
                <div className="flex items-center gap-2 mb-3 print:mb-2">
                  <div
                    className={`${ROL_COLORES[grupo.rol] || 'bg-slate-600'} rounded-full w-3 h-3 flex-shrink-0`}
                  />
                  <h2 className="font-bold text-slate-800">{grupo.label}</h2>
                  <span className="text-xs text-slate-500 print:hidden">
                    ({grupo.items.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2 print:gap-2">
                  {grupo.items.map((u) => (
                    <TarjetaUsuario key={u.id} u={u} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

export default function UsuariosQRPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador']}>
      <UsuariosQRContent />
    </ProtectedRoute>
  );
}
