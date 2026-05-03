'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MainHeader } from '@/components/layout/main-header';
import { useAuth } from '@/contexts/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Loader2,
  PenLine,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { FirmasPanel, TipoDocumento } from '@/components/firmas/firmas-panel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ETAPA_LABELS: Record<string, string> = {
  docente: 'Docente',
  comision_academica: 'Comisión',
  direccion: 'Dirección',
  decano: 'Decano',
};
const ETAPAS = ['docente', 'comision_academica', 'direccion', 'decano'];

// ── Tipos ──────────────────────────────────────────────────────────────────
interface EtapaDoc {
  etapa: string;
  firmado: boolean;
  firma: { usuario_nombre: string | null; firmado_at: string; qr_data_url?: string } | null;
}

interface Documento {
  tipo: TipoDocumento;
  id: number;
  nombre: string;
  periodo: string;
  url_firma?: string;
  qr_data_url?: string;
  asignatura: {
    id: number;
    nombre: string;
    codigo: string | null;
    carrera: { id: number; nombre: string } | null;
    nivel: { id: number; nombre: string } | null;
  } | null;
  profesor: { id: number; nombre: string } | null;
  firmas?: EtapaDoc[];
  completo?: boolean;
  siguiente_etapa?: string | null;
  firmas_completadas?: number;
  total_etapas?: number;
}

interface DocenteGrupo {
  profesor: { id: number; nombre: string } | null;
  documentos: Documento[];
}

interface Periodo {
  id: number;
  nombre: string;
}

// ── Barra de progreso simple ────────────────────────────────────────────────
function ProgresoBar({ firmas }: { firmas: EtapaDoc[] }) {
  return (
    <div className="flex items-center gap-1">
      {ETAPAS.map((e) => {
        const f = firmas.find((x) => x.etapa === e);
        return (
          <span
            key={e}
            title={`${ETAPA_LABELS[e]}: ${f?.firmado ? 'Firmado' : 'Pendiente'}`}
            className={`h-3 w-6 rounded-sm ${f?.firmado ? 'bg-green-500' : 'bg-slate-200'}`}
          />
        );
      })}
      <span className="text-xs text-slate-500 ml-1">
        {firmas.filter((f) => f.firmado).length}/{firmas.length}
      </span>
    </div>
  );
}

// ── Tarjeta QR de un documento individual ─────────────────────────────────
function TarjetaQRDoc({ doc }: { doc: Documento }) {
  const firmados = doc.firmas_completadas ?? 0;
  const total = doc.total_etapas ?? 4;
  const sigEtapa = doc.siguiente_etapa;

  return (
    <div className="border rounded-xl p-3 bg-white shadow-sm text-center print:break-inside-avoid print:border-gray-300 print:shadow-none">
      {/* QR */}
      {doc.qr_data_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.qr_data_url}
          alt="QR firma"
          className="mx-auto h-32 w-32 border rounded bg-white mb-2"
        />
      ) : (
        <div className="h-32 w-32 mx-auto flex items-center justify-center bg-slate-100 rounded mb-2">
          <QrCode className="h-10 w-10 text-slate-300" />
        </div>
      )}

      {/* Info */}
      <p className="text-[10px] font-bold text-slate-800 leading-tight truncate px-1">
        {doc.asignatura?.nombre || doc.nombre}
      </p>
      {doc.asignatura?.codigo && (
        <p className="text-[9px] text-slate-500">{doc.asignatura.codigo}</p>
      )}
      <p
        className={`text-[9px] font-semibold mt-0.5 ${
          doc.tipo === 'syllabus' ? 'text-blue-600' : 'text-purple-600'
        }`}
      >
        {doc.tipo === 'syllabus' ? 'Syllabus' : 'Prog. Analítico'}
      </p>
      <p className="text-[9px] text-slate-500">{doc.periodo || '-'}</p>
      {doc.profesor && (
        <p className="text-[9px] text-slate-600 truncate px-1">{doc.profesor.nombre}</p>
      )}

      {/* Estado */}
      <div className="mt-1.5">
        {doc.completo ? (
          <span className="inline-flex items-center gap-0.5 text-[8px] bg-green-100 text-green-700 rounded-full px-2 py-0.5">
            <CheckCircle2 className="h-2.5 w-2.5" /> Completo
          </span>
        ) : sigEtapa ? (
          <span className="inline-flex items-center gap-0.5 text-[8px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
            <Clock className="h-2.5 w-2.5" /> Firma: {ETAPA_LABELS[sigEtapa] || sigEtapa}
          </span>
        ) : null}
        <p className="text-[8px] text-slate-400 mt-0.5">
          {firmados}/{total} firmas
        </p>
      </div>

      <p className="text-[7px] text-slate-300 mt-1">
        Escanea para firmar · UNESUM
      </p>
    </div>
  );
}

// ── Contenido principal ────────────────────────────────────────────────────
function GestionFirmasContent() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'qr-docs' | 'estado'>('qr-docs');

  // QR por documento
  const [grupos, setGrupos] = useState<DocenteGrupo[]>([]);
  const [loadingQR, setLoadingQR] = useState(false);
  const [errorQR, setErrorQR] = useState<string | null>(null);
  const [generado, setGenerado] = useState(false);

  // Estado de firmas
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [errorDocs, setErrorDocs] = useState<string | null>(null);

  // Filtros
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('all');
  const [filtroTipo, setFiltroTipo] = useState<'all' | 'syllabus' | 'programa_analitico'>('all');
  const [filtroEstado, setFiltroEstado] = useState<'all' | 'con_firmas' | 'completos' | 'sin_firmas'>('all');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaQR, setBusquedaQR] = useState('');

  // Modal
  const [docSeleccionado, setDocSeleccionado] = useState<Documento | null>(null);

  // ── Cargar periodos ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/periodos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const j = await res.json();
          const arr = Array.isArray(j) ? j : j.data || [];
          setPeriodos(arr.map((x: any) => ({ id: x.id, nombre: x.nombre || x.periodo })));
        }
      } catch {}
    })();
  }, []);

  // ── Generar QR por documento ─────────────────────────────────────────
  const generarQRDocs = async () => {
    try {
      setLoadingQR(true);
      setErrorQR(null);
      setGenerado(false);
      const token = getToken();
      const params = new URLSearchParams();
      if (filtroPeriodo !== 'all') params.set('periodo', filtroPeriodo);
      if (filtroTipo !== 'all') params.set('tipo', filtroTipo);
      const res = await fetch(`${API_URL}/firmas/qr-por-documento?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Error');
      setGrupos(json.data || []);
      setGenerado(true);
    } catch (e: any) {
      setErrorQR(e.message);
    } finally {
      setLoadingQR(false);
    }
  };

  // ── Cargar estado de firmas ──────────────────────────────────────────
  const cargarDocs = async () => {
    try {
      setLoadingDocs(true);
      setErrorDocs(null);
      const token = getToken();
      const params = new URLSearchParams();
      if (filtroPeriodo !== 'all') params.set('periodo', filtroPeriodo);
      if (filtroTipo !== 'all') params.set('tipo', filtroTipo);
      const res = await fetch(`${API_URL}/firmas/listar?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Error');
      setDocs(json.data || []);
    } catch (e: any) {
      setErrorDocs(e.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (tab === 'estado') cargarDocs();
  }, [tab, filtroPeriodo, filtroTipo]);

  // ── Filtros locales (estado) ─────────────────────────────────────────
  const visibles = useMemo(() => {
    return docs.filter((d) => {
      const tieneAlguna = d.firmas?.some((f) => f.firmado);
      if (filtroEstado === 'con_firmas' && !tieneAlguna) return false;
      if (filtroEstado === 'completos' && !d.completo) return false;
      if (filtroEstado === 'sin_firmas' && tieneAlguna) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const txt = (d.asignatura?.nombre || '') + ' ' + (d.profesor?.nombre || '') + ' ' + (d.asignatura?.codigo || '');
        if (!txt.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [docs, filtroEstado, busqueda]);

  const porDocenteEstado = useMemo(() => {
    const map = new Map<string, { nombre: string; docs: Documento[] }>();
    for (const d of visibles) {
      const key = d.profesor ? String(d.profesor.id) : 'sin-docente';
      if (!map.has(key)) map.set(key, { nombre: d.profesor?.nombre || 'Sin docente', docs: [] });
      map.get(key)!.docs.push(d);
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [visibles]);

  const stats = useMemo(() => ({
    total: docs.length,
    completos: docs.filter((d) => d.completo).length,
    conAlguna: docs.filter((d) => d.firmas?.some((f) => f.firmado)).length,
    sinFirma: docs.filter((d) => !d.firmas?.some((f) => f.firmado)).length,
    docentes: new Set(docs.map((d) => d.profesor?.id ?? 'none')).size,
  }), [docs]);

  // ── Filtro búsqueda en QR ─────────────────────────────────────────────
  const gruposFiltrados = useMemo(() => {
    if (!busquedaQR) return grupos;
    const q = busquedaQR.toLowerCase();
    return grupos
      .map((g) => ({
        ...g,
        documentos: g.documentos.filter(
          (d) =>
            (d.asignatura?.nombre || '').toLowerCase().includes(q) ||
            (d.profesor?.nombre || '').toLowerCase().includes(q) ||
            (d.asignatura?.codigo || '').toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.documentos.length > 0);
  }, [grupos, busquedaQR]);

  const totalDocsQR = gruposFiltrados.reduce((acc, g) => acc + g.documentos.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />

      <main className="max-w-7xl mx-auto px-4 py-6 print:px-2 print:py-2">
        {/* Encabezado — solo en pantalla */}
        <div className="print:hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin')} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver al panel
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                Gestión de Firmas con QR
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Genera QR por documento para que cualquier usuario pueda firmar escaneando.
              </p>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex gap-1 mb-6 border-b">
            <button
              onClick={() => setTab('qr-docs')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === 'qr-docs' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <QrCode className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Generar QR por documento
            </button>
            <button
              onClick={() => setTab('estado')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === 'estado' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Estado de firmas
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PESTAÑA: GENERAR QR POR DOCUMENTO
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'qr-docs' && (
          <>
            {/* Filtros — solo pantalla */}
            <div className="print:hidden">
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Configuración de QR
                  </CardTitle>
                  <CardDescription>
                    Selecciona los filtros y presiona "Generar QR". Cada documento tendrá su propio QR de firma directo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Periodo académico</Label>
                      <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los periodos</SelectItem>
                          {periodos.map((p) => (
                            <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Tipo de documento</Label>
                      <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="syllabus">Syllabus</SelectItem>
                          <SelectItem value="programa_analitico">Programa Analítico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Buscar</Label>
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          className="pl-8"
                          value={busquedaQR}
                          onChange={(e) => setBusquedaQR(e.target.value)}
                          placeholder="Docente, asignatura..."
                        />
                      </div>
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={generarQRDocs}
                        disabled={loadingQR}
                      >
                        {loadingQR ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4 mr-2" />
                        )}
                        Generar QR
                      </Button>
                      {generado && (
                        <Button variant="outline" onClick={() => window.print()} title="Imprimir QRs">
                          <Printer className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instrucción */}
              {!generado && !loadingQR && (
                <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 p-5 text-center mb-4">
                  <QrCode className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-70" />
                  <p className="font-semibold text-emerald-800 mb-1">
                    Genera QR individuales por documento
                  </p>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    Cada syllabus y programa analítico tendrá su propio código QR. El usuario lo escanea,
                    inicia sesión y puede firmar directamente ese documento.
                  </p>
                </div>
              )}
            </div>

            {/* Loading */}
            {loadingQR && (
              <div className="text-center py-16 text-slate-500">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-emerald-600" />
                <p className="font-semibold text-lg">Generando códigos QR...</p>
                <p className="text-sm mt-1 text-slate-400">
                  Procesando todos los documentos, por favor espera.
                </p>
              </div>
            )}

            {/* Error */}
            {errorQR && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4 print:hidden">
                {errorQR}
              </div>
            )}

            {/* Resultado */}
            {generado && !loadingQR && (
              <>
                {/* Resumen — solo pantalla */}
                <div className="print:hidden flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600">
                      <span className="font-bold text-slate-900">{totalDocsQR}</span> documento(s) ·{' '}
                      <span className="font-bold text-slate-900">{gruposFiltrados.length}</span> docente(s)
                    </p>
                    <p className="text-xs text-slate-400">
                      Cada QR lleva directamente a la página de firma del documento.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" /> Imprimir todos
                  </Button>
                </div>

                {gruposFiltrados.length === 0 ? (
                  <Card className="print:hidden">
                    <CardContent className="py-10 text-center text-slate-500">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      No hay documentos que coincidan.
                    </CardContent>
                  </Card>
                ) : (
                  gruposFiltrados.map((g) => (
                    <div key={g.profesor?.id ?? 'sin-docente'} className="mb-6">
                      {/* Nombre del docente */}
                      <div className="flex items-center gap-2 mb-3 print:mb-2">
                        <div className="bg-emerald-100 rounded-full p-1.5 print:hidden">
                          <User className="h-4 w-4 text-emerald-700" />
                        </div>
                        <h2 className="font-bold text-slate-800">
                          {g.profesor?.nombre || 'Sin docente asignado'}
                        </h2>
                        <Badge variant="outline" className="text-xs print:hidden">
                          {g.documentos.length} doc(s)
                        </Badge>
                      </div>

                      {/* Grid de QRs */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
                        {g.documentos.map((doc) => (
                          <TarjetaQRDoc key={`${doc.tipo}-${doc.id}`} doc={doc} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PESTAÑA: ESTADO DE FIRMAS
        ════════════════════════════════════════════════════════════════ */}
        {tab === 'estado' && (
          <div className="print:hidden">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {[
                { label: 'Total docs', value: stats.total, color: 'text-slate-800' },
                { label: 'Docentes', value: stats.docentes, color: 'text-blue-700' },
                { label: 'Con firmas', value: stats.conAlguna, color: 'text-amber-700' },
                { label: 'Completos', value: stats.completos, color: 'text-green-700' },
                { label: 'Sin firmas', value: stats.sinFirma, color: 'text-red-600' },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-slate-500 uppercase">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filtros */}
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Periodo</Label>
                    <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {periodos.map((p) => (
                          <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="syllabus">Syllabus</SelectItem>
                        <SelectItem value="programa_analitico">Prog. Analítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Estado</Label>
                    <Select value={filtroEstado} onValueChange={(v: any) => setFiltroEstado(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="con_firmas">Con firmas</SelectItem>
                        <SelectItem value="completos">Completos</SelectItem>
                        <SelectItem value="sin_firmas">Sin firmas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Buscar</Label>
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input className="pl-8" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Docente..." />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={cargarDocs} disabled={loadingDocs}>
                        <RefreshCw className={`h-4 w-4 ${loadingDocs ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {errorDocs && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                {errorDocs}
              </div>
            )}

            {loadingDocs && (
              <div className="text-center py-10">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
              </div>
            )}

            {!loadingDocs && porDocenteEstado.length === 0 && !errorDocs && (
              <Card>
                <CardContent className="py-10 text-center text-slate-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  No hay documentos que coincidan.
                </CardContent>
              </Card>
            )}

            {!loadingDocs &&
              porDocenteEstado.map((grupo) => (
                <Card key={grupo.nombre} className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-500" />
                      {grupo.nombre}
                      <Badge variant="outline" className="text-xs">{grupo.docs.length} doc(s)</Badge>
                      {grupo.docs.every((d) => d.completo) && grupo.docs.length > 0 && (
                        <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Todo firmado
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Asignatura</TableHead>
                          <TableHead>Periodo</TableHead>
                          <TableHead>Progreso</TableHead>
                          <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grupo.docs.map((d) => {
                          const firmados = d.firmas?.filter((f) => f.firmado).length ?? 0;
                          return (
                            <TableRow key={`${d.tipo}-${d.id}`}>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${d.tipo === 'syllabus' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}`}>
                                  {d.tipo === 'syllabus' ? 'Syllabus' : 'Prog. Analítico'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-sm">{d.asignatura?.nombre || d.nombre}</div>
                                {d.asignatura?.codigo && <div className="text-xs text-slate-500">{d.asignatura.codigo}</div>}
                              </TableCell>
                              <TableCell className="text-xs">{d.periodo || '-'}</TableCell>
                              <TableCell>
                                <ProgresoBar firmas={d.firmas || []} />
                                <div className="mt-1">
                                  {d.completo ? (
                                    <Badge className="bg-green-600 hover:bg-green-700 text-[10px]">
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Completo
                                    </Badge>
                                  ) : firmados > 0 ? (
                                    <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px]">
                                      <Clock className="h-3 w-3 mr-1" /> En proceso ({firmados}/{d.firmas?.length ?? 4})
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-slate-500">
                                      <XCircle className="h-3 w-3 mr-1" /> Sin firmas
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant={firmados > 0 ? 'default' : 'outline'}
                                  className={firmados > 0 ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                  onClick={() => setDocSeleccionado(d)}
                                >
                                  <QrCode className="h-3 w-3 mr-1" />
                                  Ver QR / Firmar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}

            {/* Leyenda */}
            {!loadingDocs && porDocenteEstado.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 mb-6 flex-wrap">
                <span className="font-semibold">Etapas:</span>
                {ETAPAS.map((e) => (
                  <span key={e} className="flex items-center gap-1">
                    <span className="h-3 w-6 rounded-sm bg-green-500 inline-block" />
                    {ETAPA_LABELS[e]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal: firmas detalle ── */}
      <Dialog open={!!docSeleccionado} onOpenChange={(o) => !o && setDocSeleccionado(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              {docSeleccionado?.asignatura?.nombre || docSeleccionado?.nombre}
              <Badge variant="outline" className="text-xs">
                {docSeleccionado?.tipo === 'syllabus' ? 'Syllabus' : 'Prog. Analítico'}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {docSeleccionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Docente</p>
                  <p className="font-medium">{docSeleccionado.profesor?.nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Periodo</p>
                  <p className="font-medium">{docSeleccionado.periodo || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Carrera</p>
                  <p className="font-medium">{docSeleccionado.asignatura?.carrera?.nombre || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Nivel</p>
                  <p className="font-medium">{docSeleccionado.asignatura?.nivel?.nombre || '-'}</p>
                </div>
              </div>

              {/* URL directa de firma */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs font-semibold text-emerald-800 mb-1">
                  Enlace directo de firma
                </p>
                <code className="text-xs text-emerald-700 break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/firmas/firmar/{docSeleccionado.tipo}/{docSeleccionado.id}
                </code>
              </div>

              <FirmasPanel
                tipo={docSeleccionado.tipo}
                documentoId={docSeleccionado.id}
                documentoNombre={docSeleccionado.nombre}
                onFirmado={cargarDocs}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GestionFirmasPage() {
  return (
    <ProtectedRoute allowedRoles={['administrador']}>
      <GestionFirmasContent />
    </ProtectedRoute>
  );
}
