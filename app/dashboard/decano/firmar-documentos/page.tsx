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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft, CheckCircle2, Clock, FileText, Filter, Loader2,
  PenLine, QrCode, RefreshCw, Search, ShieldCheck, XCircle,
} from 'lucide-react';
import { FirmasPanel, TipoDocumento } from '@/components/firmas/firmas-panel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ETAPA_LABELS: Record<string, string> = {
  decano: 'Decano',
  direccion: 'Dirección',
  docente: 'Docente',
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
  completo?: boolean;
}

interface Periodo { id: number; nombre: string }

// ─────────────────────────────────────────────────────────────────────────
function DecanoBulkFirmaContent() {
  const { user, getToken } = useAuth();
  const router = useRouter();

  const [docs, setDocs] = useState<DocPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);

  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('all');
  const [filtroTipo, setFiltroTipo] = useState<'all' | 'syllabus' | 'programa_analitico'>('all');
  const [busqueda, setBusqueda] = useState('');

  // Selección para firma masiva
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [firmandoMasivo, setFirmandoMasivo] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultadoMasivo, setResultadoMasivo] = useState<{ firmados: number; omitidos: number } | null>(null);

  // Modal individual
  const [docSeleccionado, setDocSeleccionado] = useState<DocPendiente | null>(null);

  // QR personal del decano
  const [miQR, setMiQR] = useState<{ qr_data_url: string; url_verificacion: string } | null>(null);

  const rolActivo = user?.rol || '';
  const etapaUsuario = rolActivo === 'decano' ? 'decano' : rolActivo === 'direccion' ? 'direccion' : null;
  const etiLabel = ETAPA_LABELS[etapaUsuario || ''] || rolActivo;

  // ── Cargar periodos ────────────────────────────────────────────────
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

  // ── Cargar QR personal ────────────────────────────────────────────
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

  // ── Cargar documentos pendientes ──────────────────────────────────
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
      if (!res.ok || !json.success) throw new Error(json.message || 'Error');
      // Solo los que le toca firmar a esta etapa
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
    if (etapaUsuario) cargarDocs();
  }, [filtroPeriodo, filtroTipo, etapaUsuario]);

  // ── Filtro local ──────────────────────────────────────────────────
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

  // ── Selección ─────────────────────────────────────────────────────
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

  // ── Firma masiva ──────────────────────────────────────────────────
  const ejecutarFirmaMasiva = async () => {
    try {
      setFirmandoMasivo(true);
      setShowConfirm(false);
      const token = getToken();

      // Separar por tipo
      const syllabuIds = visibles
        .filter((d) => d.tipo === 'syllabus' && seleccionados.has(clave(d)))
        .map((d) => d.id);
      const paIds = visibles
        .filter((d) => d.tipo === 'programa_analitico' && seleccionados.has(clave(d)))
        .map((d) => d.id);

      let totalFirmados = 0;
      let totalOmitidos = 0;

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

  if (!etapaUsuario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-slate-500">Tu rol no tiene permisos para firmar documentos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Encabezado */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/decano')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <PenLine className="h-6 w-6 text-blue-600" />
              Firma de documentos — {etiLabel}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Selecciona los documentos pendientes y fírmalos todos de una vez.
            </p>
          </div>

          {/* QR personal del decano */}
          {miQR && (
            <div className="flex-shrink-0 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={miQR.qr_data_url}
                alt="Mi QR"
                className="h-20 w-20 border-2 border-blue-300 rounded-lg mx-auto"
              />
              <p className="text-[9px] text-slate-500 mt-0.5">Mi sello digital</p>
            </div>
          )}
        </div>

        {/* Resultado firma masiva */}
        {resultadoMasivo && (
          <div className="rounded-xl bg-green-50 border border-green-300 p-4 mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-800">
                ¡Firma masiva completada! {resultadoMasivo.firmados} documento(s) firmado(s).
              </p>
              {resultadoMasivo.omitidos > 0 && (
                <p className="text-sm text-green-700">{resultadoMasivo.omitidos} omitido(s) (ya firmados o sin turno).</p>
              )}
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setResultadoMasivo(null)}>
              Cerrar
            </Button>
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
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barra de acción masiva */}
        {visibles.length > 0 && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
            <Checkbox
              checked={todosSeleccionados}
              onCheckedChange={(c) => (c ? seleccionarTodos() : deseleccionarTodos())}
              id="select-all"
            />
            <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Seleccionar todos ({visibles.length})
            </Label>

            {seleccionados.size > 0 && (
              <>
                <Badge className="bg-blue-600 hover:bg-blue-700">
                  {seleccionados.size} seleccionado(s)
                </Badge>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowConfirm(true)}
                    disabled={firmandoMasivo}
                  >
                    {firmandoMasivo ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <PenLine className="h-4 w-4 mr-1" />
                    )}
                    Firmar {seleccionados.size} seleccionado(s)
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-10">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
          </div>
        )}

        {/* Sin pendientes */}
        {!loading && visibles.length === 0 && !error && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <CheckCircle2 className="h-14 w-14 mx-auto mb-3 text-green-500 opacity-60" />
              <p className="font-semibold text-lg">¡No hay documentos pendientes!</p>
              <p className="text-sm mt-1 text-slate-400">
                Todos los documentos que te corresponden ya están firmados o aún no son tu turno.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lista de documentos */}
        {!loading && visibles.length > 0 && (
          <div className="space-y-2">
            {visibles.map((d) => {
              const key = clave(d);
              const sel = seleccionados.has(key);
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-3 bg-white flex items-center gap-3 cursor-pointer transition-all ${
                    sel ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => toggleSeleccion(d)}
                >
                  <Checkbox
                    checked={sel}
                    onCheckedChange={() => toggleSeleccion(d)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          d.tipo === 'syllabus' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'
                        }`}
                      >
                        {d.tipo === 'syllabus' ? 'Syllabus' : 'Prog. Analítico'}
                      </Badge>
                      <span className="font-semibold text-sm text-slate-800 truncate">
                        {d.asignatura?.nombre || d.nombre}
                      </span>
                      {d.asignatura?.codigo && (
                        <span className="text-xs text-slate-500">{d.asignatura.codigo}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                      {d.asignatura?.carrera && <span>{d.asignatura.carrera.nombre}</span>}
                      {d.asignatura?.nivel && <span>{d.asignatura.nivel.nombre}</span>}
                      {d.profesor && <span>Docente: {d.profesor.nombre}</span>}
                      <span>{d.periodo}</span>
                    </div>
                  </div>

                  {/* Progreso firmas */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {['decano', 'direccion', 'docente'].map((e) => {
                      const f = d.firmas.find((x) => x.etapa === e);
                      return (
                        <span
                          key={e}
                          title={`${ETAPA_LABELS[e]}: ${f?.firmado ? 'Firmado' : 'Pendiente'}`}
                          className={`h-3 w-5 rounded-sm ${
                            f?.firmado ? 'bg-green-500' : e === etapaUsuario ? 'bg-amber-400' : 'bg-slate-200'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); setDocSeleccionado(d); }}
                  >
                    <QrCode className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Modal: Confirmar firma masiva ── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-blue-600" />
              Confirmar firma masiva
            </DialogTitle>
            <DialogDescription>
              Vas a firmar <strong>{seleccionados.size}</strong> documento(s) como <strong>{etiLabel}</strong>.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* QR personal */}
            {miQR && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={miQR.qr_data_url} alt="Mi QR" className="h-16 w-16 border rounded" />
                <div>
                  <p className="text-xs font-semibold text-blue-800">Tu sello digital será registrado</p>
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    Este QR quedará como constancia de tu firma en cada documento.
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Observaciones (opcional — aplica a todos)</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Revisado y aprobado en sesión de consejo académico..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={ejecutarFirmaMasiva}
                disabled={firmandoMasivo}
              >
                {firmandoMasivo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PenLine className="h-4 w-4 mr-2" />
                )}
                Firmar todos ahora
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: detalle individual ── */}
      <Dialog open={!!docSeleccionado} onOpenChange={(o) => !o && setDocSeleccionado(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              {docSeleccionado?.asignatura?.nombre || docSeleccionado?.nombre}
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
                  <p className="font-medium">{docSeleccionado.periodo}</p>
                </div>
              </div>
              <FirmasPanel
                tipo={docSeleccionado.tipo}
                documentoId={docSeleccionado.id}
                onFirmado={cargarDocs}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DecanoBulkFirmaPage() {
  return (
    <ProtectedRoute allowedRoles={['decano', 'direccion', 'administrador']}>
      <DecanoBulkFirmaContent />
    </ProtectedRoute>
  );
}
