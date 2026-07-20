"use client";

import { useState, useEffect, useMemo } from "react";
import { MainHeader } from "@/components/layout/main-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ModuloGuard } from "@/components/auth/modulo-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ArrowLeft, Users, GraduationCap, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Eye, Search, AlertCircle,
  FileText, FileSpreadsheet, RefreshCw, QrCode, CheckSquare, Square, Loader2,
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface DocenteEstado {
  profesor_id: number;
  nombres: string;
  apellidos: string;
  email: string;
  tiene_syllabus: boolean;
  syllabus_id: number | null;
  estado_syllabus: string | null;
  tiene_programa: boolean;
  programa_id: number | null;
  estado_programa: string | null;
}

interface AsignaturaConDocentes {
  id: number;
  nombre: string;
  codigo: string;
  nivel: string;
  docentes: DocenteEstado[];
  stats: { total_docentes: number; con_syllabus: number; con_programa: number };
}

interface SeguimientoData {
  facultad: { id: number; nombre: string };
  carrera: { id: number; nombre: string };
  periodo: { id: string | number; nombre: string };
  asignaturas: AsignaturaConDocentes[];
}

// Key for a selection entry: "syllabus-{id}" or "programa-{id}"
type SelKey = string;

function estadoBadge(estado: string | null) {
  if (!estado) return null;
  const map: Record<string, string> = {
    borrador: "bg-yellow-100 text-yellow-800 border-yellow-300",
    enviado: "bg-blue-100 text-blue-800 border-blue-300",
    aprobado: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${map[estado] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}>
      {estado}
    </span>
  );
}

export default function DocumentosDocentesPage() {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");
  const [data, setData] = useState<SeguimientoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [nivelesExpandidos, setNivelesExpandidos] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "con_syllabus" | "sin_syllabus" | "con_programa" | "sin_programa">("todos");

  // Selection for firma
  const [seleccionados, setSeleccionados] = useState<Set<SelKey>>(new Set());
  const [habilitando, setHabilitando] = useState(false);
  const [resultadoFirma, setResultadoFirma] = useState<string | null>(null);

  useEffect(() => { cargarPeriodos(); }, []);
  useEffect(() => { if (periodoSeleccionado) cargarDatos(); }, [periodoSeleccionado]);

  const cargarPeriodos = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/datos-academicos/periodos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setPeriodos(json.data || []);
        const actual = (json.data || []).find((p: any) => p.estado === "actual");
        if (actual) setPeriodoSeleccionado(actual.id.toString());
        else if (json.data?.length) setPeriodoSeleccionado(json.data[0].id.toString());
      }
    } catch { /* no-op */ }
  };

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    setSeleccionados(new Set());
    setResultadoFirma(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/comision-academica/docentes-por-asignatura?periodo=${periodoSeleccionado}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Error al cargar los datos");
      setData(json.data);
      if (json.data?.asignaturas?.length <= 8) {
        setExpandidos(new Set(json.data.asignaturas.map((a: AsignaturaConDocentes) => a.id)));
      }
      const tempGrupos: Record<string, boolean> = {};
      (json.data?.asignaturas || []).forEach((a: AsignaturaConDocentes) => {
        tempGrupos[a.nivel || "Sin nivel"] = true;
      });
      setNivelesExpandidos(Object.keys(tempGrupos));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: number) =>
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const expandirTodas = () => {
    if (!data) return;
    setExpandidos(new Set(data.asignaturas.map(a => a.id)));
    setNivelesExpandidos(nivelesOrdenados);
  };
  const colapsarTodas = () => {
    setExpandidos(new Set());
    setNivelesExpandidos([]);
  };

  // ── Selección ──
  const toggleSel = (key: SelKey) =>
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Toggle todos los docs de una asignatura (que sí tienen syllabus/programa)
  const toggleAsignatura = (asig: AsignaturaConDocentes) => {
    const keys: SelKey[] = [];
    asig.docentes.forEach(d => {
      if (d.syllabus_id) keys.push(`syllabus-${d.syllabus_id}`);
      if (d.programa_id) keys.push(`programa-${d.programa_id}`);
    });
    if (keys.length === 0) return;
    const allSelected = keys.every(k => seleccionados.has(k));
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  // Toggle seleccionar TODO
  const toggleTodo = () => {
    if (!data) return;
    const allKeys: SelKey[] = [];
    data.asignaturas.forEach(asig =>
      asig.docentes.forEach(d => {
        if (d.syllabus_id) allKeys.push(`syllabus-${d.syllabus_id}`);
        if (d.programa_id) allKeys.push(`programa-${d.programa_id}`);
      })
    );
    if (allKeys.length === 0) return;
    const allSel = allKeys.every(k => seleccionados.has(k));
    setSeleccionados(allSel ? new Set() : new Set(allKeys));
  };

  // Habilitar firma para los seleccionados
  const habilitarFirma = async () => {
    if (seleccionados.size === 0) return;
    setHabilitando(true);
    setResultadoFirma(null);
    try {
      const token = localStorage.getItem("token");
      const syllabus_ids: number[] = [];
      const programa_ids: number[] = [];
      seleccionados.forEach(key => {
        const [tipo, idStr] = key.split("-");
        const id = parseInt(idStr, 10);
        if (tipo === "syllabus") syllabus_ids.push(id);
        else if (tipo === "programa") programa_ids.push(id);
      });

      const res = await fetch(`${API_URL}/comision-academica/habilitar-firma`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ syllabus_ids, programa_ids, estado: "enviado" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Error al habilitar firma");
      setResultadoFirma(`✅ ${json.message}`);
      setSeleccionados(new Set());
      // Recargar para reflejar el nuevo estado
      await cargarDatos();
    } catch (e: any) {
      setResultadoFirma(`❌ ${e.message}`);
    } finally {
      setHabilitando(false);
    }
  };

  // Totales globales
  const totales = useMemo(() => {
    if (!data) return null;
    const docUnicos = new Set(data.asignaturas.flatMap(a => a.docentes.map(d => d.profesor_id))).size;
    const totalAsig = data.asignaturas.length;
    const asigConDocentes = data.asignaturas.filter(a => a.stats.total_docentes > 0).length;
    const totalAsignaciones = data.asignaturas.reduce((s, a) => s + a.stats.total_docentes, 0);
    const syllabus = data.asignaturas.reduce((s, a) => s + a.stats.con_syllabus, 0);
    const programas = data.asignaturas.reduce((s, a) => s + a.stats.con_programa, 0);
    return { docUnicos, totalAsig, asigConDocentes, totalAsignaciones, syllabus, programas };
  }, [data]);

  // Filtrar asignaturas
  const asignaturasFiltradas = useMemo(() => {
    if (!data) return [];
    return data.asignaturas
      .filter(a => {
        if (busqueda) {
          const q = busqueda.toLowerCase();
          if (!a.nombre.toLowerCase().includes(q) && !a.codigo.toLowerCase().includes(q)) {
            if (!a.docentes.some(d => `${d.nombres} ${d.apellidos}`.toLowerCase().includes(q))) return false;
          }
        }
        if (filtro === "con_syllabus") return a.stats.con_syllabus > 0;
        if (filtro === "sin_syllabus") return a.stats.con_syllabus < a.stats.total_docentes && a.stats.total_docentes > 0;
        if (filtro === "con_programa") return a.stats.con_programa > 0;
        if (filtro === "sin_programa") return a.stats.con_programa < a.stats.total_docentes && a.stats.total_docentes > 0;
        return true;
      })
      .sort((a, b) => {
        const romanos: Record<string, number> = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
        const num = (s: string) => { const m = s.match(/(\d+|[IVX]+)/i); if (!m) return 0; const v = m[1].toUpperCase(); return romanos[v] ?? (Number.parseInt(v) || 0); };
        return num(a.nivel) - num(b.nivel) || a.nombre.localeCompare(b.nombre);
      });
  }, [data, busqueda, filtro]);

  // Agrupar por nivel
  const grupos = useMemo(() => {
    const m: Record<string, AsignaturaConDocentes[]> = {};
    for (const a of asignaturasFiltradas) {
      const k = a.nivel || "Sin nivel";
      if (!m[k]) m[k] = [];
      m[k].push(a);
    }
    return m;
  }, [asignaturasFiltradas]);

  const nivelesOrdenados = Object.keys(grupos).sort((a, b) => {
    if (a === "Sin nivel") return 1;
    if (b === "Sin nivel") return -1;
    const romanos: Record<string, number> = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
    const num = (s: string) => { const m = s.match(/(\d+|[IVX]+)/i); if (!m) return 0; const v = m[1].toUpperCase(); return romanos[v] ?? (Number.parseInt(v) || 0); };
    return num(a) - num(b);
  });

  // Calcular si toda una asignatura está seleccionada
  const asigAllSelected = (asig: AsignaturaConDocentes) => {
    const keys: SelKey[] = [];
    asig.docentes.forEach(d => {
      if (d.syllabus_id) keys.push(`syllabus-${d.syllabus_id}`);
      if (d.programa_id) keys.push(`programa-${d.programa_id}`);
    });
    return keys.length > 0 && keys.every(k => seleccionados.has(k));
  };
  const asigSomeSelected = (asig: AsignaturaConDocentes) =>
    asig.docentes.some(d =>
      (d.syllabus_id && seleccionados.has(`syllabus-${d.syllabus_id}`)) ||
      (d.programa_id && seleccionados.has(`programa-${d.programa_id}`))
    );

  return (
    <ProtectedRoute allowedRoles={["coordinador", "comision", "comision_academica", "administrador"]}>
      <ModuloGuard>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

          {/* ── Header ── */}
          <div>
            <Link href="/dashboard/comision">
              <Button variant="ghost" size="sm" className="-ml-2 text-gray-600 mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver al panel
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-7 w-7 text-emerald-700" />
              Documentos de Docentes por Materia
            </h1>
            {data && (
              <p className="text-gray-500 text-sm mt-1">
                {data.facultad.nombre} — {data.carrera.nombre}
              </p>
            )}
          </div>

          {/* ── Selector de periodo ── */}
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div className="flex items-center gap-2 text-emerald-800 font-medium text-sm">
                <GraduationCap className="h-4 w-4" /> Periodo académico:
              </div>
              <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                <SelectTrigger className="w-64 bg-white border-emerald-300">
                  <SelectValue placeholder="Seleccione un periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nombre} {p.estado === "actual" && "(Actual)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {periodoSeleccionado && (
                <Button size="sm" variant="outline" onClick={cargarDatos} className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Actualizar
                </Button>
              )}
            </CardContent>
          </Card>

          {!periodoSeleccionado && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="flex items-center gap-3 py-5 text-orange-700 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                Seleccione un periodo académico para ver los documentos de los docentes.
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
                <p className="text-gray-500">Cargando documentos...</p>
              </div>
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-3 py-5 text-red-700 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" /> {error}
              </CardContent>
            </Card>
          )}

          {resultadoFirma && (
            <Card className={resultadoFirma.startsWith("✅") ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
              <CardContent className="py-3 px-4 text-sm font-medium">
                {resultadoFirma}
              </CardContent>
            </Card>
          )}

          {!loading && data && (
            <>
              {/* ── Estadísticas globales ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Docentes únicos", value: totales?.docUnicos, color: "text-blue-700 bg-blue-50 border-blue-200" },
                  { label: "Total asignaturas", value: totales?.totalAsig, color: "text-gray-700 bg-white border-gray-200" },
                  { label: "Con docentes", value: totales?.asigConDocentes, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
                  { label: "Asignaciones", value: totales?.totalAsignaciones, color: "text-gray-700 bg-white border-gray-200" },
                  { label: "Syllabus entregados", value: `${totales?.syllabus}/${totales?.totalAsignaciones}`, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                  { label: "Programas entregados", value: `${totales?.programas}/${totales?.totalAsignaciones}`, color: "text-purple-700 bg-purple-50 border-purple-200" },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-xl border p-3 ${stat.color}`}>
                    <p className="text-xs font-medium opacity-70 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Barra de búsqueda y filtros ── */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar materia o docente..."
                    className="pl-9"
                  />
                </div>
                <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las materias</SelectItem>
                    <SelectItem value="con_syllabus">Con algún syllabus</SelectItem>
                    <SelectItem value="sin_syllabus">Syllabus pendiente</SelectItem>
                    <SelectItem value="con_programa">Con algún programa</SelectItem>
                    <SelectItem value="sin_programa">Programa pendiente</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={expandirTodas}>Expandir todo</Button>
                <Button size="sm" variant="outline" onClick={colapsarTodas}>Colapsar todo</Button>
              </div>

              {/* ── Barra de acciones de firma ── */}
              <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <button
                  onClick={toggleTodo}
                  className="flex items-center gap-2 text-sm text-blue-800 font-medium hover:text-blue-900 transition-colors"
                >
                  {seleccionados.size > 0 ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4 text-blue-400" />
                  )}
                  {seleccionados.size > 0 ? `${seleccionados.size} seleccionado(s)` : "Seleccionar todo"}
                </button>

                {seleccionados.size > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-500 text-xs h-7"
                    onClick={() => setSeleccionados(new Set())}
                  >
                    Limpiar selección
                  </Button>
                )}

                <div className="flex-1" />

                <Button
                  onClick={habilitarFirma}
                  disabled={seleccionados.size === 0 || habilitando}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  size="sm"
                >
                  {habilitando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  {habilitando ? "Habilitando..." : `Habilitar firma QR${seleccionados.size > 0 ? ` (${seleccionados.size})` : ""}`}
                </Button>
              </div>

              {/* ── Lista por nivel → materia → docentes ── */}
              <div className="space-y-4">
                <Accordion type="multiple" className="space-y-4" value={nivelesExpandidos} onValueChange={setNivelesExpandidos}>
                  {nivelesOrdenados.map(nivel => (
                    <AccordionItem key={nivel} value={nivel} className="border-none bg-[#f1fdf7] rounded-xl overflow-hidden shadow-sm">
                      {/* Cabecera de nivel */}
                      <AccordionTrigger className="flex items-center justify-between px-5 py-4 hover:no-underline hover:bg-[#e7f9f0] transition-colors">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="h-5 w-5 text-emerald-600" />
                          <h2 className="font-semibold text-emerald-800 text-base">{nivel}</h2>
                          <span className="text-sm font-normal text-emerald-600/70">({grupos[nivel].length} materias)</span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="pt-2 pb-5 px-5">
                        <div className="space-y-3">
                      {grupos[nivel].map(asig => {
                        const expanded = expandidos.has(asig.id);
                        const completo = asig.stats.total_docentes > 0
                          && asig.stats.con_syllabus === asig.stats.total_docentes
                          && asig.stats.con_programa === asig.stats.total_docentes;
                        const pendiente = asig.stats.total_docentes > 0
                          && (asig.stats.con_syllabus < asig.stats.total_docentes || asig.stats.con_programa < asig.stats.total_docentes);
                        const sinDocentes = asig.stats.total_docentes === 0;

                        const barColor = completo ? "bg-emerald-100 border-emerald-200"
                          : pendiente ? "bg-amber-50 border-amber-200"
                            : "bg-gray-50 border-gray-200";

                        const allSel = asigAllSelected(asig);
                        const someSel = asigSomeSelected(asig);

                        return (
                          <Card key={asig.id} className={`border overflow-hidden ${barColor}`}>
                            {/* Fila de materia */}
                            <div className="px-5 py-4 flex items-center gap-3">
                              {/* Checkbox de asignatura completa */}
                              {!sinDocentes && (
                                <button
                                  onClick={() => toggleAsignatura(asig)}
                                  className="flex-shrink-0 text-blue-500 hover:text-blue-700"
                                  title="Seleccionar todos los docs de esta materia"
                                >
                                  {allSel ? (
                                    <CheckSquare className="h-4 w-4 text-blue-600" />
                                  ) : someSel ? (
                                    <CheckSquare className="h-4 w-4 text-blue-300" />
                                  ) : (
                                    <Square className="h-4 w-4 text-gray-300" />
                                  )}
                                </button>
                              )}

                              {/* Toggle expand — click en el resto de la fila */}
                              <button
                                onClick={() => toggle(asig.id)}
                                className="flex-1 flex items-center gap-4 text-left hover:brightness-95 transition-all"
                              >
                                {/* Nombre & código */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-900">{asig.nombre}</span>
                                    <Badge variant="outline" className="text-xs">{asig.codigo}</Badge>
                                    {sinDocentes && <Badge variant="outline" className="text-xs text-gray-400">Sin docentes</Badge>}
                                  </div>
                                  {!sinDocentes && (
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                                      <span className="flex items-center gap-1 text-blue-700">
                                        <Users className="h-3.5 w-3.5" />
                                        {asig.stats.total_docentes} doc.
                                      </span>
                                      <span className={`flex items-center gap-1 font-medium ${asig.stats.con_syllabus === asig.stats.total_docentes ? "text-emerald-700" : "text-orange-600"}`}>
                                        <FileText className="h-3.5 w-3.5" />
                                        Syllabus {asig.stats.con_syllabus}/{asig.stats.total_docentes}
                                      </span>
                                      <span className={`flex items-center gap-1 font-medium ${asig.stats.con_programa === asig.stats.total_docentes ? "text-purple-700" : "text-orange-600"}`}>
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                        Programa {asig.stats.con_programa}/{asig.stats.total_docentes}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Mini barras de progreso */}
                                {asig.stats.total_docentes > 0 && (
                                  <div className="hidden sm:flex flex-col gap-1.5 w-32 flex-shrink-0">
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                      <span className="w-3">S</span>
                                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all"
                                          style={{ width: `${(asig.stats.con_syllabus / asig.stats.total_docentes) * 100}%` }} />
                                      </div>
                                      <span>{Math.round((asig.stats.con_syllabus / asig.stats.total_docentes) * 100)}%</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                      <span className="w-3">P</span>
                                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full transition-all"
                                          style={{ width: `${(asig.stats.con_programa / asig.stats.total_docentes) * 100}%` }} />
                                      </div>
                                      <span>{Math.round((asig.stats.con_programa / asig.stats.total_docentes) * 100)}%</span>
                                    </div>
                                  </div>
                                )}

                                {expanded
                                  ? <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  : <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                              </button>
                            </div>

                            {/* Panel expandido */}
                            {expanded && (
                              <div className="bg-white border-t divide-y divide-gray-100">
                                {sinDocentes ? (
                                  <div className="flex items-center gap-2 px-8 py-4 text-sm text-gray-400">
                                    <Users className="h-4 w-4" /> No hay docentes asignados a esta materia
                                  </div>
                                ) : (
                                  asig.docentes.map(doc => {
                                    const sylKey = doc.syllabus_id ? `syllabus-${doc.syllabus_id}` : null;
                                    const progKey = doc.programa_id ? `programa-${doc.programa_id}` : null;
                                    const sylSel = sylKey ? seleccionados.has(sylKey) : false;
                                    const progSel = progKey ? seleccionados.has(progKey) : false;
                                    const anyDocSel = sylSel || progSel;

                                    return (
                                      <div
                                        key={doc.profesor_id}
                                        className={`flex flex-wrap items-center gap-4 px-6 py-3 transition-colors ${anyDocSel ? "bg-blue-50/60" : ""}`}
                                      >
                                        {/* Checkboxes por documento */}
                                        <div className="flex gap-1.5 flex-shrink-0">
                                          {/* Syllabus checkbox */}
                                          <button
                                            onClick={() => sylKey && toggleSel(sylKey)}
                                            disabled={!doc.tiene_syllabus}
                                            title={doc.tiene_syllabus ? "Seleccionar syllabus" : "No hay syllabus"}
                                            className={`rounded p-0.5 transition-colors ${doc.tiene_syllabus ? "text-emerald-600 hover:text-emerald-800 cursor-pointer" : "text-gray-200 cursor-not-allowed"}`}
                                          >
                                            {sylSel ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                          </button>
                                          {/* Programa checkbox */}
                                          <button
                                            onClick={() => progKey && toggleSel(progKey)}
                                            disabled={!doc.tiene_programa}
                                            title={doc.tiene_programa ? "Seleccionar programa" : "No hay programa"}
                                            className={`rounded p-0.5 transition-colors ${doc.tiene_programa ? "text-purple-600 hover:text-purple-800 cursor-pointer" : "text-gray-200 cursor-not-allowed"}`}
                                          >
                                            {progSel ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                                          </button>
                                        </div>

                                        {/* Info docente */}
                                        <div className="flex-1 min-w-48">
                                          <p className="font-medium text-gray-900 text-sm">
                                            {doc.nombres} {doc.apellidos}
                                          </p>
                                          <p className="text-xs text-gray-400">{doc.email}</p>
                                        </div>

                                        {/* Syllabus */}
                                        <div className="flex items-center gap-2">
                                          {doc.tiene_syllabus ? (
                                            <>
                                              <Badge className={`gap-1 border ${doc.estado_syllabus === "enviado" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"}`}>
                                                <CheckCircle2 className="h-3 w-3" /> Syllabus
                                              </Badge>
                                              {estadoBadge(doc.estado_syllabus)}
                                              {doc.estado_syllabus === "enviado" && (
                                                <Badge className="bg-blue-100 text-blue-700 border border-blue-300 gap-1 text-[10px]">
                                                  <QrCode className="h-2.5 w-2.5" /> Firma habilitada
                                                </Badge>
                                              )}
                                              <Link href={`/dashboard/comision/ver-syllabus-docente?id=${doc.syllabus_id}`}>
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                                                  <Eye className="h-3 w-3" /> Ver
                                                </Button>
                                              </Link>
                                            </>
                                          ) : (
                                            <Badge variant="outline" className="gap-1 text-gray-400">
                                              <XCircle className="h-3 w-3" /> Sin syllabus
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Separador */}
                                        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                                        {/* Programa analítico */}
                                        <div className="flex items-center gap-2">
                                          {doc.tiene_programa ? (
                                            <>
                                              <Badge className={`gap-1 border ${doc.estado_programa === "enviado" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-purple-100 text-purple-800 border-purple-300"}`}>
                                                <CheckCircle2 className="h-3 w-3" /> Prog. Analítico
                                              </Badge>
                                              {estadoBadge(doc.estado_programa)}
                                              {doc.estado_programa === "enviado" && (
                                                <Badge className="bg-blue-100 text-blue-700 border border-blue-300 gap-1 text-[10px]">
                                                  <QrCode className="h-2.5 w-2.5" /> Firma habilitada
                                                </Badge>
                                            )}
                                              <Link href={`/dashboard/comision/ver-programa-docente?id=${doc.programa_id}`}>
                                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 text-purple-700 border-purple-300 hover:bg-purple-50">
                                                  <Eye className="h-3 w-3" /> Ver
                                                </Button>
                                              </Link>
                                            </>
                                          ) : (
                                            <Badge variant="outline" className="gap-1 text-gray-400">
                                              <XCircle className="h-3 w-3" /> Sin programa
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

                {asignaturasFiltradas.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12 text-gray-400">
                      <Search className="h-10 w-10 mx-auto mb-3" />
                      <p>No se encontraron materias con ese criterio</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </main>
      </div>
      </ModuloGuard>
    </ProtectedRoute>
  );
}
