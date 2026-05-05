'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MainHeader } from '@/components/layout/main-header';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft, CheckCircle2, Loader2, PenLine, QrCode, RefreshCw, Search,
} from 'lucide-react';
import { FirmasPanel, TipoDocumento } from '@/components/firmas/firmas-panel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ETAPA_LABELS: Record<string, string> = {
  docente: 'Docente',
  coordinador: 'Coordinador/a',
  decano: 'Decano/a',
  director_academico: 'Director/a Acad.',
};

interface DocPendiente {
  tipo: TipoDocumento;
  id: number;
  nombre: string;
  periodo: string;
  asignatura: { id: number; nombre: string; codigo: string | null; carrera: { nombre: string } | null; nivel: { nombre: string } | null } | null;
  profesor: { id: number; nombre: string } | null;
  firmas: { etapa: string; firmado: boolean; usuario_nombre: string | null; firmado_at: string | null }[];
  siguiente_etapa: string | null;
}

interface Periodo { id: number; nombre: string }

function CoordinadorBulkFirmaContent() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accionInicial = searchParams.get('accion'); // 'todos' → pre-seleccionar todo

  const [docs, setDocs] = useState<DocPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('all');
  const [filtroTipo, setFiltroTipo] = useState<'all' | 'syllabus' | 'programa_analitico'>('all');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [firmandoMasivo, setFirmandoMasivo] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultadoMasivo, setResultadoMasivo] = useState<{ firmados: number; omitidos: number } | null>(null);
  const [docSeleccionado, setDocSeleccionado] = useState<DocPendiente | null>(null);
  const [miQR, setMiQR] = useState<{ qr_data_url: string; url_verificacion: string } | null>(null);

  const etapaUsuario = 'coordinador';

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/periodos`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const j = await res.json();
          const arr = Array.isArray(j) ? j : j.data || [];
          setPeriodos(arr.map((x: any) => ({ id: x.id, nombre: x.nombre || x.periodo })));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_URL}/firmas/mi-qr`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const j = await res.json();
          if (j.success) setMiQR(j.data);
        }
      } catch {}
    })();
  }, []);

  const cargarDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      setSeleccionados(new Set());
      const token = getToken();
      const params = new URLSearchParams();
      if (filtroTipo !== 'all') params.set('tipo', filtroTipo);
      if (filtroPeriodo !== 'all') params.set('periodo', filtroPeriodo);
      const res = await fetch(`${API_URL}/firmas/listar?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Error al cargar documentos');
      // Solo los que le toca firmar al coordinador
      const pendientes = (json.data || []).filter(
        (d: DocPendiente) => d.siguiente_etapa === etapaUsuario
      );
      setDocs(pendientes);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDocs();
  }, [filtroPeriodo, filtroTipo]);

  const visibles = useMemo(() => {
    if (!busqueda) return docs;
    const q = busqueda.toLowerCase();
    return docs.filter(
      (d) =>
        (d.asignatura?.nombre || '').toLowerCase().includes(q) ||
        (d.profesor?.nombre || '').toLowerCase().includes(q) ||
        (d.asignatura?.codigo || '').toLowerCase().includes(q)
    );
  }, [docs, busqueda]);

  // Si vino con ?accion=todos, seleccionar todo y abrir confirmación automáticamente
  useEffect(() => {
    if (accionInicial === 'todos' && visibles.length > 0 && seleccionados.size === 0) {
      seleccionarTodos();
      setShowConfirm(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accionInicial, visibles.length]);

  const clave = (d: DocPendiente) => `${d.tipo}-${d.id}`;
  const toggleSeleccion = (d: DocPendiente) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(clave(d))) next.delete(clave(d));
      else next.add(clave(d));
      return next;
    });
  };
  const seleccionarTodos = () => setSeleccionados(new Set(visibles.map(clave)));
  const deseleccionarTodos = () => setSeleccionados(new Set());
  const todosSeleccionados = visibles.length > 0 && visibles.every((d) => seleccionados.has(clave(d)));

  const ejecutarFirmaMasiva = async () => {
    try {
      setFirmandoMasivo(true);
      setShowConfirm(false);
      const token = getToken();
      const syllabuIds = visibles.filter((d) => d.tipo === 'syllabus' && seleccionados.has(clave(d))).map((d) => d.id);
      const paIds = visibles.filter((d) => d.tipo === 'programa_analitico' && seleccionados.has(clave(d))).map((d) => d.id);
      let totalFirmados = 0, totalOmitidos = 0;
      if (syllabuIds.length > 0) {
        const res = await fetch(`${API_URL}/firmas/firmar-masivo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tipo: 'syllabus', ids: syllabuIds, observaciones }),
        });
        const json = await res.json();
        totalFirmados += json.data?.firmados?.length || 0;
        totalOmitidos += json.data?.omitidos?.length || 0;
      }
      if (paIds.length > 0) {
        const res = await fetch(`${API_URL}/firmas/firmar-masivo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tipo: 'programa_analitico', ids: paIds, observaciones }),
        });
        const json = await res.json();
        totalFirmados += json.data?.firmados?.length || 0;
        totalOmitidos += json.data?.omitidos?.length || 0;
      }
      setResultadoMasivo({ firmados: totalFirmados, omitidos: totalOmitidos });
      setObservaciones('');
      await cargarDocs();
    } catch (e: any) {
      alert('Error al firmar: ' + e.message);
    } finally {
      setFirmandoMasivo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/coordinador')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <PenLine className="h-6 w-6 text-indigo-600" />
              Firma de documentos — Coordinador/a de Carrera
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Solo ves los documentos de tu carrera pendientes de tu firma.
            </p>
          </div>
          {miQR && (
            <div className="flex-shrink-0 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={miQR.qr_data_url} alt="Mi QR" className="h-20 w-20 border-2 border-indigo-300 rounded-lg mx-auto" />
              <p className="text-[9px] text-slate-500 mt-0.5">Mi sello digital</p>
            </div>
          )}
        </div>

        {/* Resultado firma masiva */}
        {resultadoMasivo && (
          <div className="rounded-xl bg-green-50 border border-green-300 p-4 mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800">¡Firma masiva completada! {resultadoMasivo.firmados} documento(s) firmado(s).</p>
              {resultadoMasivo.omitidos > 0 && <p className="text-sm text-green-700">{resultadoMasivo.omitidos} omitido(s).</p>}
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setResultadoMasivo(null)}>Cerrar</Button>
          </div>
        )}

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
                    {periodos.map((p) => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
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
                    <SelectItem value="programa_analitico">Programa Analítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-8" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Asignatura, docente..." />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full" onClick={cargarDocs} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barra de acciones rápidas */}
        {visibles.length > 0 && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
            <Checkbox checked={todosSeleccionados} onCheckedChange={(c) => (c ? seleccionarTodos() : deseleccionarTodos())} id="select-all" />
            <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">Seleccionar todos ({visibles.length})</Label>
            {seleccionados.size > 0 && (
              <Badge className="bg-indigo-600 hover:bg-indigo-700">{seleccionados.size} seleccionado(s)</Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              {/* Firmar Solo los Seleccionados */}
              {seleccionados.size > 0 && seleccionados.size < visibles.length && (
                <Button size="sm" variant="outline" className="border-indigo-400 text-indigo-700 hover:bg-indigo-100" onClick={() => setShowConfirm(true)} disabled={firmandoMasivo}>
                  <PenLine className="h-4 w-4 mr-1" />
                  Firmar {seleccionados.size} seleccionado(s)
                </Button>
              )}
              {/* Firmar Todo */}
              <Button
                size="sm"
                className="bg-indigo-700 hover:bg-indigo-800 font-semibold"
                onClick={() => { seleccionarTodos(); setShowConfirm(true); }}
                disabled={firmandoMasivo}
              >
                {firmandoMasivo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PenLine className="h-4 w-4 mr-1" />}
                Firmar Todo ({visibles.length})
              </Button>
            </div>
          </div>
        )}

        {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>}
        {loading && <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></div>}

        {!loading && visibles.length === 0 && !error && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <CheckCircle2 className="h-14 w-14 mx-auto mb-3 text-green-500 opacity-60" />
              <p className="font-semibold text-lg">¡No hay documentos pendientes en tu carrera!</p>
              <p className="text-sm mt-1 text-slate-400">Todos los documentos de tu carrera ya están firmados o aún no es tu turno.</p>
            </CardContent>
          </Card>
        )}

        {!loading && visibles.length > 0 && (
          <div className="space-y-2">
            {visibles.map((d) => {
              const key = clave(d);
              const sel = seleccionados.has(key);
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-3 bg-white flex items-center gap-3 cursor-pointer transition-all ${sel ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => toggleSeleccion(d)}
                >
                  <Checkbox checked={sel} onCheckedChange={() => toggleSeleccion(d)} onClick={(e) => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${d.tipo === 'syllabus' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}`}>
                        {d.tipo === 'syllabus' ? 'Syllabus' : 'Prog. Analítico'}
                      </Badge>
                      <span className="font-semibold text-sm text-slate-800 truncate">{d.asignatura?.nombre || d.nombre}</span>
                      {d.asignatura?.codigo && <span className="text-xs text-slate-500">{d.asignatura.codigo}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                      {d.asignatura?.carrera && <span>{d.asignatura.carrera.nombre}</span>}
                      {d.asignatura?.nivel && <span>{d.asignatura.nivel.nombre}</span>}
                      {d.profesor && <span>Docente: {d.profesor.nombre}</span>}
                      <span>{d.periodo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {['docente', 'coordinador', 'decano', 'director_academico'].map((e) => {
                      const f = d.firmas.find((x) => x.etapa === e);
                      return (
                        <span key={e} title={`${ETAPA_LABELS[e]}: ${f?.firmado ? 'Firmado' : 'Pendiente'}`}
                          className={`h-3 w-5 rounded-sm ${f?.firmado ? 'bg-green-500' : e === etapaUsuario ? 'bg-amber-400' : 'bg-slate-200'}`}
                        />
                      );
                    })}
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDocSeleccionado(d); }}>
                    <QrCode className="h-3 w-3 mr-1" /> Ver
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal confirmar firma masiva */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PenLine className="h-5 w-5 text-indigo-600" />Confirmar firma masiva</DialogTitle>
            <DialogDescription>Vas a firmar <strong>{seleccionados.size}</strong> documento(s) como <strong>Coordinador/a de Carrera</strong>. Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {miQR && (
              <div className="flex items-center gap-3 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={miQR.qr_data_url} alt="Mi QR" className="h-16 w-16 border rounded" />
                <p className="text-xs font-semibold text-indigo-800">Tu sello digital será registrado en cada documento.</p>
              </div>
            )}
            <div>
              <Label className="text-xs">Observaciones (opcional)</Label>
              <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Ej: Revisado en sesión de coordinación..." rows={3} className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={ejecutarFirmaMasiva} disabled={firmandoMasivo}>
                {firmandoMasivo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenLine className="h-4 w-4 mr-2" />}
                Firmar ahora
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal detalle individual */}
      <Dialog open={!!docSeleccionado} onOpenChange={(o) => !o && setDocSeleccionado(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-indigo-600" />
              {docSeleccionado?.asignatura?.nombre || docSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>
          {docSeleccionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Docente</p><p className="font-medium">{docSeleccionado.profesor?.nombre || '-'}</p></div>
                <div><p className="text-xs text-slate-500">Periodo</p><p className="font-medium">{docSeleccionado.periodo}</p></div>
              </div>
              <FirmasPanel tipo={docSeleccionado.tipo} documentoId={docSeleccionado.id} onFirmado={cargarDocs} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CoordinadorBulkFirmaPage() {
  return (
    <ProtectedRoute allowedRoles={['coordinador', 'administrador']}>
      <CoordinadorBulkFirmaContent />
    </ProtectedRoute>
  );
}
