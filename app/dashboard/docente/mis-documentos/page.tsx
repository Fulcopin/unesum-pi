'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MainHeader } from '@/components/layout/main-header';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, CheckCircle2, Clock, Edit, FileText, FileSpreadsheet,
  Loader2, Printer, RefreshCw, Search,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FirmasPanel, TipoDocumento } from '@/components/firmas/firmas-panel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ETAPA_LABELS: Record<string, string> = {
  docente: 'Docente',
  coordinador: 'Coordinador/a',
  decano: 'Decano/a',
  director_academico: 'Director/a Acad.',
};

interface Documento {
  tipo: TipoDocumento;
  id: number;
  nombre: string;
  periodo: string;
  asignatura: {
    id: number; nombre: string; codigo: string | null;
    carrera: { nombre: string } | null;
    nivel: { nombre: string } | null;
  } | null;
  profesor: { id: number; nombre: string } | null;
  firmas: { etapa: string; firmado: boolean; usuario_nombre: string | null; firmado_at: string | null }[];
  siguiente_etapa: string | null;
  completo?: boolean;
}

interface Periodo { id: number; nombre: string }

function MisDocumentosContent() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [syllabus, setSyllabus] = useState<Documento[]>([]);
  const [programas, setProgramas] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState('all');
  const [busqueda, setBusqueda] = useState('');
  const [docSeleccionado, setDocSeleccionado] = useState<Documento | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Cargar periodos
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/periodos`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const j = await res.json();
          const arr = Array.isArray(j) ? j : j.data || [];
          setPeriodos(arr.map((x: any) => ({ id: x.id, nombre: x.nombre || x.periodo })));
        }
      } catch {}
    })();
  }, []);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      if (filtroPeriodo !== 'all') params.set('periodo', filtroPeriodo);

      const [resS, resP] = await Promise.all([
        fetch(`${API_URL}/firmas/listar?tipo=syllabus&${params}`, { headers }),
        fetch(`${API_URL}/firmas/listar?tipo=programa_analitico&${params}`, { headers }),
      ]);

      const jsS = await resS.json();
      const jsP = await resP.json();

      if (resS.ok && jsS.success) {
        // Solo documentos del docente autenticado (si el backend ya filtra por rol, estos son los suyos)
        setSyllabus(jsS.data || []);
      }
      if (resP.ok && jsP.success) {
        setProgramas(jsP.data || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDocumentos();
  }, [filtroPeriodo]);

  const filtrar = (docs: Documento[]) => {
    if (!busqueda) return docs;
    const q = busqueda.toLowerCase();
    return docs.filter(
      (d) =>
        (d.asignatura?.nombre || d.nombre).toLowerCase().includes(q) ||
        (d.asignatura?.codigo || '').toLowerCase().includes(q) ||
        (d.periodo || '').toLowerCase().includes(q)
    );
  };

  const syllabusFiltrados = useMemo(() => filtrar(syllabus), [syllabus, busqueda]);
  const programasFiltrados = useMemo(() => filtrar(programas), [programas, busqueda]);

  const abrirDocumento = (doc: Documento) => {
    setDocSeleccionado(doc);
    setShowPrintModal(false);
  };

  const imprimirDocumento = () => {
    window.print();
  };

  const DocumentRow = ({ d }: { d: Documento }) => {
    const firmados = d.firmas.filter((f) => f.firmado).length;
    const total = d.firmas.length;
    return (
      <div className="rounded-xl border bg-white p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={d.tipo === 'syllabus' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}>
                {d.tipo === 'syllabus' ? <FileText className="h-3 w-3 mr-1" /> : <FileSpreadsheet className="h-3 w-3 mr-1" />}
                {d.tipo === 'syllabus' ? 'Syllabus' : 'Prog. Analítico'}
              </Badge>
              {d.completo ? (
                <Badge className="bg-green-600 text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Totalmente firmado
                </Badge>
              ) : (
                <Badge className="bg-amber-500 text-[10px]">
                  <Clock className="h-3 w-3 mr-1" />
                  {d.siguiente_etapa ? `Esperando: ${ETAPA_LABELS[d.siguiente_etapa] || d.siguiente_etapa}` : 'Pendiente'}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-slate-800">
              {d.asignatura?.nombre || d.nombre}
            </h3>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
              {d.asignatura?.codigo && <span>{d.asignatura.codigo}</span>}
              {d.asignatura?.carrera && <span>{d.asignatura.carrera.nombre}</span>}
              {d.asignatura?.nivel && <span>Nivel {d.asignatura.nivel.nombre}</span>}
              <span>{d.periodo}</span>
            </div>
            {/* Progreso firmas */}
            <div className="flex items-center gap-1 mt-2">
              {d.firmas.map((f) => (
                <span key={f.etapa} title={`${ETAPA_LABELS[f.etapa]}: ${f.firmado ? 'Firmado' : 'Pendiente'}`}
                  className={`h-2.5 w-6 rounded-full ${f.firmado ? 'bg-green-500' : d.siguiente_etapa === f.etapa ? 'bg-amber-400' : 'bg-slate-200'}`}
                />
              ))}
              <span className="text-xs text-slate-400 ml-1">{firmados}/{total} firmas</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Editar */}
            <Link href={d.tipo === 'syllabus' ? '/dashboard/docente/editor-syllabus' : '/dashboard/docente/editor-programa-analitico'}>
              <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                <Edit className="h-3 w-3 mr-1" /> Editar
              </Button>
            </Link>
            {/* Ver / Imprimir */}
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => abrirDocumento(d)}>
              <Printer className="h-3 w-3 mr-1" /> Ver e Imprimir
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Encabezado */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/docente')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Mis documentos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualiza, revisa el estado de firma e imprime tus syllabus y programas analíticos.
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Periodo</Label>
                <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los periodos</SelectItem>
                    {periodos.map((p) => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-8" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Asignatura, código..." />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full" onClick={cargarDocumentos} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>}
        {loading && <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" /></div>}

        {!loading && (
          <Tabs defaultValue="syllabus">
            <TabsList className="mb-4">
              <TabsTrigger value="syllabus" className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Mis Syllabus
                {syllabusFiltrados.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{syllabusFiltrados.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="programas" className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4" />
                Mis Programas Analíticos
                {programasFiltrados.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{programasFiltrados.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="syllabus">
              {syllabusFiltrados.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-slate-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No tienes syllabus registrados.</p>
                    <Link href="/dashboard/docente/editor-syllabus">
                      <Button className="mt-3 bg-blue-600 hover:bg-blue-700">Ir al editor de syllabus</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {syllabusFiltrados.map((d) => <DocumentRow key={d.id} d={d} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="programas">
              {programasFiltrados.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-slate-500">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No tienes programas analíticos registrados.</p>
                    <Link href="/dashboard/docente/editor-programa-analitico">
                      <Button className="mt-3 bg-purple-600 hover:bg-purple-700">Ir al editor de programa analítico</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {programasFiltrados.map((d) => <DocumentRow key={d.id} d={d} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Modal Ver e Imprimir */}
      <Dialog open={!!docSeleccionado} onOpenChange={(o) => !o && setDocSeleccionado(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {docSeleccionado?.tipo === 'syllabus' ? <FileText className="h-5 w-5 text-blue-600" /> : <FileSpreadsheet className="h-5 w-5 text-purple-600" />}
              {docSeleccionado?.asignatura?.nombre || docSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>
          {docSeleccionado && (
            <div className="space-y-4" id="print-area">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-3 text-sm rounded-lg bg-slate-50 border p-3">
                <div><p className="text-xs text-slate-500">Tipo</p><p className="font-medium">{docSeleccionado.tipo === 'syllabus' ? 'Syllabus' : 'Programa Analítico'}</p></div>
                <div><p className="text-xs text-slate-500">Periodo</p><p className="font-medium">{docSeleccionado.periodo || '-'}</p></div>
                <div><p className="text-xs text-slate-500">Carrera</p><p className="font-medium">{docSeleccionado.asignatura?.carrera?.nombre || '-'}</p></div>
                <div><p className="text-xs text-slate-500">Nivel</p><p className="font-medium">{docSeleccionado.asignatura?.nivel?.nombre || '-'}</p></div>
                {docSeleccionado.asignatura?.codigo && (
                  <div><p className="text-xs text-slate-500">Código</p><p className="font-medium">{docSeleccionado.asignatura.codigo}</p></div>
                )}
                {docSeleccionado.profesor && (
                  <div><p className="text-xs text-slate-500">Docente</p><p className="font-medium">{docSeleccionado.profesor.nombre}</p></div>
                )}
              </div>

              {/* Panel de firmas con QR */}
              <FirmasPanel
                tipo={docSeleccionado.tipo}
                documentoId={docSeleccionado.id}
                documentoNombre={docSeleccionado.asignatura?.nombre || docSeleccionado.nombre}
                onFirmado={cargarDocumentos}
              />

              {/* Botones de acción */}
              <div className="flex items-center gap-2 justify-end pt-2 border-t no-print">
                <Link href={docSeleccionado.tipo === 'syllabus' ? '/dashboard/docente/editor-syllabus' : '/dashboard/docente/editor-programa-analitico'}>
                  <Button variant="outline" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                    <Edit className="h-4 w-4 mr-1" /> Ver contenido completo / Editar
                  </Button>
                </Link>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={imprimirDocumento}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimir / Guardar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          [data-radix-dialog-overlay] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function DocenteMisDocumentosPage() {
  return (
    <ProtectedRoute allowedRoles={['docente', 'profesor', 'administrador']}>
      <MisDocumentosContent />
    </ProtectedRoute>
  );
}
