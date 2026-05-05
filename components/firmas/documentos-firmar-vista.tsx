'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Loader2,
  PenLine,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FirmasPanel, TipoDocumento } from './firmas-panel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ETAPA_LABELS: Record<string, string> = {
  docente: 'Docente',
  coordinador: 'Coordinador/a de Carrera',
  decano: 'Decano/a de Facultad',
  director_academico: 'Director/a Académico/a',
};

interface DocumentoListado {
  tipo: TipoDocumento;
  id: number;
  nombre: string;
  periodo: string;
  asignatura: {
    id: number;
    nombre: string;
    codigo: string | null;
    carrera: { id: number; nombre: string } | null;
    facultad: { id: number; nombre: string } | null;
    nivel: { id: number; nombre: string } | null;
  } | null;
  profesor: { id: number; nombre: string } | null;
  firmas: {
    etapa: string;
    firmado: boolean;
    usuario_nombre: string | null;
    firmado_at: string | null;
  }[];
  siguiente_etapa: string | null;
  completo?: boolean;
}

interface Periodo {
  id: number;
  nombre: string;
}

interface Carrera {
  id: number;
  nombre: string;
}

interface Nivel {
  id: number;
  nombre: string;
}

interface Props {
  tipo: TipoDocumento;
  etapaUsuario: 'comision_academica' | 'direccion' | 'decano' | 'docente';
  rolDashboard: 'decano' | 'direccion' | 'comision' | 'docente';
}

export function DocumentosFirmarVista({ tipo, etapaUsuario, rolDashboard }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();

  const [docs, setDocs] = useState<DocumentoListado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);

  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('all');
  const [filtroCarrera, setFiltroCarrera] = useState<string>('all');
  const [filtroNivel, setFiltroNivel] = useState<string>('all');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendientes' | 'completos'>(
    'todos'
  );
  const [busqueda, setBusqueda] = useState('');

  const [docSeleccionado, setDocSeleccionado] = useState<DocumentoListado | null>(null);

  const cargarFiltros = async () => {
    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, cRes, nRes] = await Promise.all([
        fetch(`${API_URL}/periodos`, { headers }),
        fetch(`${API_URL}/carreras`, { headers }),
        fetch(`${API_URL}/niveles`, { headers }),
      ]);
      if (pRes.ok) {
        const j = await pRes.json();
        const arr = Array.isArray(j) ? j : j.data || [];
        setPeriodos(arr.map((x: any) => ({ id: x.id, nombre: x.nombre || x.periodo })));
      }
      if (cRes.ok) {
        const j = await cRes.json();
        const arr = Array.isArray(j) ? j : j.data || [];
        setCarreras(arr.map((x: any) => ({ id: x.id, nombre: x.nombre })));
      }
      if (nRes.ok) {
        const j = await nRes.json();
        const arr = Array.isArray(j) ? j : j.data || [];
        setNiveles(arr.map((x: any) => ({ id: x.id, nombre: x.nombre })));
      }
    } catch (e) {
      console.warn('No se pudieron cargar filtros', e);
    }
  };

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const params = new URLSearchParams();
      params.set('tipo', tipo);
      if (filtroPeriodo !== 'all') params.set('periodo', filtroPeriodo);
      if (filtroCarrera !== 'all') params.set('carrera_id', filtroCarrera);
      if (filtroNivel !== 'all') params.set('nivel_id', filtroNivel);

      const res = await fetch(`${API_URL}/firmas/listar?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Error al listar documentos');
      setDocs(json.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarFiltros();
  }, []);

  useEffect(() => {
    cargarDocumentos();
  }, [tipo, filtroPeriodo, filtroCarrera, filtroNivel]);

  const visibles = useMemo(() => {
    return docs.filter((d) => {
      if (filtroEstado === 'pendientes' && d.completo) return false;
      if (filtroEstado === 'completos' && !d.completo) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const t =
          (d.nombre || '') +
          ' ' +
          (d.asignatura?.nombre || '') +
          ' ' +
          (d.asignatura?.codigo || '') +
          ' ' +
          (d.profesor?.nombre || '');
        if (!t.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [docs, filtroEstado, busqueda]);

  const docsPorNivel = useMemo(() => {
    const grupos: Record<string, DocumentoListado[]> = {};
    for (const d of visibles) {
      const nivelKey = d.asignatura?.nivel?.nombre || 'Sin nivel';
      grupos[nivelKey] = grupos[nivelKey] || [];
      grupos[nivelKey].push(d);
    }
    return grupos;
  }, [visibles]);

  const stats = useMemo(() => {
    const total = docs.length;
    const completos = docs.filter((d) => d.completo).length;
    const meTocaFirmar = docs.filter((d) => d.siguiente_etapa === etapaUsuario).length;
    return { total, completos, meTocaFirmar };
  }, [docs, etapaUsuario]);

  const tituloPagina =
    tipo === 'syllabus' ? 'Syllabus' : 'Programas Analíticos';

  const dashboardHref = `/dashboard/${rolDashboard}`;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push(dashboardHref)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-2xl font-bold mt-2">{tituloPagina} por nivel</h1>
          <p className="text-sm text-slate-500">
            Revisa y firma con QR los documentos correspondientes a tu rol.
          </p>
        </div>
        <Button variant="outline" onClick={cargarDocumentos} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 uppercase">Total documentos</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-amber-700 uppercase">Pendientes de firma (tu rol)</p>
            <p className="text-2xl font-bold text-amber-700">{stats.meTocaFirmar}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-green-700 uppercase">Totalmente firmados</p>
            <p className="text-2xl font-bold text-green-700">{stats.completos}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Periodo</Label>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los periodos</SelectItem>
                  {periodos.map((p) => (
                    <SelectItem key={p.id} value={p.nombre}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Carrera</Label>
              <Select value={filtroCarrera} onValueChange={setFiltroCarrera}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las carreras</SelectItem>
                  {carreras.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Nivel</Label>
              <Select value={filtroNivel} onValueChange={setFiltroNivel}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  {niveles.map((n) => (
                    <SelectItem key={n.id} value={String(n.id)}>
                      {n.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Estado</Label>
              <Select
                value={filtroEstado}
                onValueChange={(v: any) => setFiltroEstado(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendientes">Pendientes</SelectItem>
                  <SelectItem value="completos">Totalmente firmados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-8"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Asignatura, código..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center py-10 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Cargando documentos...
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {!loading && visibles.length === 0 && !error && (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
            No hay documentos que coincidan con los filtros.
          </CardContent>
        </Card>
      )}

      {!loading &&
        Object.keys(docsPorNivel)
          .sort()
          .map((nivelKey) => (
            <Card key={nivelKey} className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Nivel: {nivelKey}</CardTitle>
                <CardDescription>
                  {docsPorNivel[nivelKey].length} documento(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asignatura</TableHead>
                      <TableHead>Carrera</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Docente</TableHead>
                      <TableHead>Progreso firmas</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsPorNivel[nivelKey].map((d) => {
                      const totalEt = d.firmas.length;
                      const firmados = d.firmas.filter((f) => f.firmado).length;
                      const meToca = d.siguiente_etapa === etapaUsuario;
                      return (
                        <TableRow key={`${d.tipo}-${d.id}`}>
                          <TableCell>
                            <div className="font-medium text-sm">
                              {d.asignatura?.nombre || d.nombre}
                            </div>
                            {d.asignatura?.codigo && (
                              <div className="text-xs text-slate-500">
                                {d.asignatura.codigo}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {d.asignatura?.carrera?.nombre || '-'}
                          </TableCell>
                          <TableCell className="text-xs">{d.periodo}</TableCell>
                          <TableCell className="text-xs">
                            {d.profesor?.nombre || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {d.firmas.map((f) => (
                                <span
                                  key={f.etapa}
                                  title={`${ETAPA_LABELS[f.etapa] || f.etapa}: ${
                                    f.firmado ? 'Firmado' : 'Pendiente'
                                  }`}
                                  className={`h-3 w-6 rounded-sm ${
                                    f.firmado
                                      ? 'bg-green-500'
                                      : d.siguiente_etapa === f.etapa
                                      ? 'bg-amber-400'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-slate-500 ml-1">
                                {firmados}/{totalEt}
                              </span>
                            </div>
                            {d.completo ? (
                              <Badge className="bg-green-600 hover:bg-green-700 mt-1 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Firmas completas
                              </Badge>
                            ) : meToca ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 mt-1 text-[10px]">
                                <Clock className="h-3 w-3 mr-1" /> Te toca firmar
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="mt-1 text-[10px]">
                                {ETAPA_LABELS[d.siguiente_etapa || ''] ||
                                  'En espera'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={meToca ? 'default' : 'outline'}
                              className={
                                meToca ? 'bg-blue-600 hover:bg-blue-700' : ''
                              }
                              onClick={() => setDocSeleccionado(d)}
                            >
                              {meToca ? (
                                <>
                                  <PenLine className="h-3 w-3 mr-1" /> Revisar y
                                  firmar
                                </>
                              ) : (
                                <>
                                  <FileText className="h-3 w-3 mr-1" /> Ver firmas
                                </>
                              )}
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

      <Dialog open={!!docSeleccionado} onOpenChange={(o) => !o && setDocSeleccionado(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {docSeleccionado?.asignatura?.nombre || docSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>
          {docSeleccionado && (
            <div className="space-y-3" id="print-area-firma">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Carrera</p>
                  <p className="font-medium">
                    {docSeleccionado.asignatura?.carrera?.nombre || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Periodo</p>
                  <p className="font-medium">{docSeleccionado.periodo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Nivel</p>
                  <p className="font-medium">
                    {docSeleccionado.asignatura?.nivel?.nombre || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Docente</p>
                  <p className="font-medium">
                    {docSeleccionado.profesor?.nombre || '-'}
                  </p>
                </div>
              </div>
              <FirmasPanel
                tipo={docSeleccionado.tipo}
                documentoId={docSeleccionado.id}
                documentoNombre={docSeleccionado.nombre}
                onFirmado={() => {
                  cargarDocumentos();
                }}
              />
              {/* Botón imprimir */}
              <div className="flex justify-end pt-2 border-t no-print">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
