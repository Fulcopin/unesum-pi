'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MainHeader } from '@/components/layout/main-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  BookOpen,
  ScrollText,
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const ETAPA_LABELS: Record<string, string> = {
  docente: 'Docente',
  coordinador: 'Coordinador/a',
  decano: 'Decano/a',
  director_academico: 'Director/a Acad.',
};

const TIPO_LABELS: Record<string, string> = {
  syllabus: 'Syllabus',
  programa_analitico: 'Programa Analítico',
};

interface FirmaDoc {
  etapa: string;
  firmado: boolean;
  usuario_nombre: string | null;
  firmado_at: string | null;
}

interface DocFirmado {
  tipo: 'syllabus' | 'programa_analitico';
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
  firmas: FirmaDoc[];
  completo: boolean;
}

function DocumentosFirmadosContent() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [docs, setDocs] = useState<DocFirmado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<'all' | 'syllabus' | 'programa_analitico'>('all');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const params = new URLSearchParams();
      if (filtroTipo !== 'all') params.set('tipo', filtroTipo);
      if (filtroPeriodo.trim()) params.set('periodo', filtroPeriodo.trim());

      const res = await fetch(`${API_URL}/firmas/listar?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Error al cargar');

      // Filtrar solo los documentos completamente firmados
      const completados: DocFirmado[] = (json.data as DocFirmado[]).filter((d) => d.completo);
      setDocs(completados);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo]);

  // Filtrado local por búsqueda de texto
  const docsFiltrados = docs.filter((d) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      d.nombre?.toLowerCase().includes(q) ||
      d.asignatura?.nombre?.toLowerCase().includes(q) ||
      d.asignatura?.carrera?.nombre?.toLowerCase().includes(q) ||
      d.profesor?.nombre?.toLowerCase().includes(q) ||
      d.periodo?.toLowerCase().includes(q)
    );
  });

  const periodos = [...new Set(docs.map((d) => d.periodo).filter(Boolean))].sort().reverse();

  return (
    <ProtectedRoute allowedRoles={['direccion', 'administrador']}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Encabezado */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/direccion')}
              className="text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-green-600" />
                Documentos Finales con Todas las Firmas
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Solo se muestran documentos con el proceso de firma completamente finalizado.
              </p>
            </div>
            <Button
              onClick={cargar}
              variant="outline"
              disabled={loading}
              className="flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualizar
            </Button>
          </div>

          {/* Filtros */}
          <Card className="mb-6 border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Tipo */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de documento</label>
                  <Select
                    value={filtroTipo}
                    onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="syllabus">Syllabus</SelectItem>
                      <SelectItem value="programa_analitico">Programa Analítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Período */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Período académico</label>
                  <Select
                    value={filtroPeriodo || '_all'}
                    onValueChange={(v) => setFiltroPeriodo(v === '_all' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los períodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todos los períodos</SelectItem>
                      {periodos.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Búsqueda */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nombre, asignatura, docente..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contador */}
          {!loading && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                <span className="font-semibold text-green-700">{docsFiltrados.length}</span>{' '}
                documento{docsFiltrados.length !== 1 ? 's' : ''} con proceso de firma completo
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="h-7 w-7 animate-spin mr-3" />
              Cargando documentos firmados...
            </div>
          )}

          {/* Lista de documentos */}
          {!loading && !error && docsFiltrados.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">
                {docs.length === 0
                  ? 'No hay documentos con todas las firmas completadas aún.'
                  : 'No hay resultados para los filtros seleccionados.'}
              </p>
            </div>
          )}

          {!loading && docsFiltrados.length > 0 && (
            <div className="space-y-4">
              {docsFiltrados.map((doc) => (
                <Card
                  key={`${doc.tipo}-${doc.id}`}
                  className="border-green-200 bg-green-50/30 hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {doc.tipo === 'syllabus' ? (
                            <BookOpen className="h-5 w-5 text-blue-600" />
                          ) : (
                            <ScrollText className="h-5 w-5 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900 leading-tight">
                            {doc.nombre || doc.asignatura?.nombre || `Documento #${doc.id}`}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {TIPO_LABELS[doc.tipo] ?? doc.tipo}
                            </Badge>
                            {doc.periodo && (
                              <Badge variant="outline" className="text-xs">
                                {doc.periodo}
                              </Badge>
                            )}
                            {doc.asignatura?.carrera && (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                {doc.asignatura.carrera.nombre}
                              </Badge>
                            )}
                            {doc.asignatura?.nivel && (
                              <Badge variant="outline" className="text-xs text-gray-400">
                                {doc.asignatura.nivel.nombre}
                              </Badge>
                            )}
                          </div>
                          {doc.profesor && (
                            <p className="text-xs text-gray-500 mt-1">
                              Docente: <span className="font-medium text-gray-700">{doc.profesor.nombre}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Totalmente firmado
                        </Badge>
                        <Link
                          href={`/firmas/firmar/${doc.tipo}/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline" className="text-xs border-green-400 text-green-700 hover:bg-green-100">
                            Ver detalle
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-4">
                    {/* Línea de firmas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                      {doc.firmas.map((f, idx) => (
                        <div
                          key={f.etapa}
                          className={`rounded-lg border p-2.5 text-xs ${
                            f.firmado
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 bg-white opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <span className="font-mono text-gray-400">{idx + 1}.</span>
                            {f.firmado ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-full border border-gray-300 inline-block flex-shrink-0" />
                            )}
                            <span className="font-semibold text-gray-700 truncate">
                              {ETAPA_LABELS[f.etapa] ?? f.etapa}
                            </span>
                          </div>
                          {f.firmado && (
                            <>
                              {f.usuario_nombre && (
                                <p className="text-gray-600 truncate">{f.usuario_nombre}</p>
                              )}
                              {f.firmado_at && (
                                <p className="text-gray-400 text-[10px]">
                                  {new Date(f.firmado_at).toLocaleDateString('es-EC', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function DocumentosFirmadosPage() {
  return <DocumentosFirmadosContent />;
}
