"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/contexts/auth-context";
import { MainHeader } from "@/components/layout/main-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComentariosPanel } from "@/components/comision/ComentariosPanel";
import {
  ArrowLeft, FileText, FileSpreadsheet, MessageSquare, CheckCircle2,
  Clock, Send, GraduationCap, AlertCircle, RefreshCw, X,
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface DocResumen {
  id: number;
  tipo: "syllabus" | "programa";
  asignatura: { id: number; nombre: string; codigo: string } | null;
  nombre: string | null;
  periodo: string | null;
  estado: string;
  updated_at: string;
  comentarios: { total: number; noLeidos: number };
}

function estadoBadge(estado: string) {
  const styles: Record<string, string> = {
    borrador: "bg-yellow-100 text-yellow-800 border-yellow-300",
    enviado: "bg-blue-100 text-blue-800 border-blue-300",
    aprobado: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  const icons: Record<string, any> = { borrador: Clock, enviado: Send, aprobado: CheckCircle2 };
  const Icon = icons[estado] ?? Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${styles[estado] ?? "bg-gray-100 text-gray-600 border-gray-300"}`}>
      <Icon className="h-3 w-3" /> {estado}
    </span>
  );
}

function formatFecha(iso: string) {
  try { return new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function RevisionsContent() {
  const { user } = useAuth();
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodoSel, setPeriodoSel] = useState("");
  const [syllabi, setSyllabi] = useState<DocResumen[]>([]);
  const [programas, setProgramas] = useState<DocResumen[]>([]);
  const [totalNoLeidos, setTotalNoLeidos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docActivo, setDocActivo] = useState<DocResumen | null>(null);

  useEffect(() => { cargarPeriodos(); }, []);
  useEffect(() => { if (periodoSel) cargarDocs(); }, [periodoSel]);

  const cargarPeriodos = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/datos-academicos/periodos`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setPeriodos(json.data || []);
        const actual = (json.data || []).find((p: any) => p.estado === "actual");
        if (actual) setPeriodoSel(actual.id.toString());
        else if (json.data?.length) setPeriodoSel(json.data[0].id.toString());
      }
    } catch { /* no-op */ }
  };

  const cargarDocs = async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/comentarios-documento/mis-documentos?periodo=${periodoSel}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar los documentos");
      const json = await res.json();
      setSyllabi(json.data?.syllabi ?? []);
      setProgramas(json.data?.programas ?? []);
      setTotalNoLeidos(json.data?.totalNoLeidos ?? 0);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const abrirDoc = (doc: DocResumen) => {
    setDocActivo(doc);
    // Al abrir, refrescar conteo después de marcar como leído
    setTimeout(cargarDocs, 1500);
  };

  const cerrarDoc = () => { setDocActivo(null); cargarDocs(); };

  const renderDocCard = (doc: DocResumen) => {
    const esSyllabus = doc.tipo === "syllabus";
    const Icon = esSyllabus ? FileText : FileSpreadsheet;
    const color = esSyllabus ? "text-blue-700 bg-blue-50 border-blue-200" : "text-purple-700 bg-purple-50 border-purple-200";
    const isActive = docActivo?.id === doc.id && docActivo?.tipo === doc.tipo;

    return (
      <button
        key={`${doc.tipo}-${doc.id}`}
        onClick={() => isActive ? cerrarDoc() : abrirDoc(doc)}
        className={`w-full text-left rounded-xl border-2 p-4 transition-all hover:shadow-md ${isActive ? (esSyllabus ? "border-blue-400 bg-blue-50" : "border-purple-400 bg-purple-50") : "border-gray-200 bg-white hover:border-gray-300"}`}
      >
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 flex-shrink-0 border ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">
                  {doc.asignatura?.nombre ?? doc.nombre ?? "Sin nombre"}
                </p>
                {doc.asignatura?.codigo && (
                  <p className="text-xs text-gray-400 mt-0.5">{doc.asignatura.codigo}</p>
                )}
              </div>
              {doc.comentarios.noLeidos > 0 && (
                <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 flex-shrink-0">
                  {doc.comentarios.noLeidos} nuevo{doc.comentarios.noLeidos > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {estadoBadge(doc.estado)}
              <span className="text-[10px] text-gray-400">{doc.periodo}</span>
              <span className="text-[10px] text-gray-400">Actualizado: {formatFecha(doc.updated_at)}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <MessageSquare className="h-3.5 w-3.5" />
              {doc.comentarios.total === 0
                ? "Sin comentarios aún"
                : `${doc.comentarios.total} comentario${doc.comentarios.total > 1 ? "s" : ""}`}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-10rem)]">
      {/* ── Lista de documentos ── */}
      <div className={`${docActivo ? "w-96 flex-shrink-0" : "flex-1"} flex flex-col overflow-hidden transition-all`}>
        {/* Selector periodo */}
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
          <Select value={periodoSel} onValueChange={setPeriodoSel}>
            <SelectTrigger className="flex-1 bg-white border-emerald-200">
              <SelectValue placeholder="Selecciona un periodo" />
            </SelectTrigger>
            <SelectContent>
              {periodos.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.nombre} {p.estado === "actual" && "(Actual)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={cargarDocs} className="gap-1 flex-shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Resumen */}
        {totalNoLeidos > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 mb-4 flex-shrink-0">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            <span className="text-sm text-indigo-800 font-medium">
              Tienes <strong>{totalNoLeidos}</strong> comentario{totalNoLeidos > 1 ? "s" : ""} nuevo{totalNoLeidos > 1 ? "s" : ""} de la comisión
            </span>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Cargando documentos...</p>
            </div>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50 flex-shrink-0">
            <CardContent className="flex items-center gap-2 py-4 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <div className="flex-1 overflow-y-auto space-y-5">
            {/* Syllabus */}
            {syllabi.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-blue-600" /> Mis Syllabus
                </h3>
                <div className="space-y-2">{syllabi.map(renderDocCard)}</div>
              </section>
            )}

            {/* Programas */}
            {programas.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-purple-600" /> Mis Programas Analíticos
                </h3>
                <div className="space-y-2">{programas.map(renderDocCard)}</div>
              </section>
            )}

            {syllabi.length === 0 && programas.length === 0 && periodoSel && (
              <div className="text-center py-16 text-gray-400">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No tienes documentos en este periodo</p>
                <p className="text-sm mt-1">Crea tu syllabus o programa analítico desde el panel de docente</p>
                <Link href="/dashboard/docente/editor-syllabus" className="inline-block mt-3">
                  <Button size="sm" variant="outline">Ir al editor</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Panel de comentarios del doc activo ── */}
      {docActivo && (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Cabecera del doc seleccionado */}
          <div className="flex items-center gap-3 mb-3 flex-shrink-0 bg-white rounded-xl border border-gray-200 px-4 py-3">
            {docActivo.tipo === "syllabus"
              ? <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
              : <FileSpreadsheet className="h-5 w-5 text-purple-600 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {docActivo.asignatura?.nombre ?? docActivo.nombre ?? "Sin nombre"}
              </p>
              <p className="text-xs text-gray-400">{docActivo.tipo === "syllabus" ? "Syllabus" : "Programa Analítico"} · {docActivo.periodo}</p>
            </div>
            {estadoBadge(docActivo.estado)}
            <button onClick={cerrarDoc} className="p-1.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Panel de comentarios */}
          <div className="flex-1 min-h-0">
            <ComentariosPanel
              tipo={docActivo.tipo}
              documentoId={docActivo.id}
              usuarioId={user?.id}
              usuarioRol={user?.rol}
              marcarLeido={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MisRevisionesPage() {
  return (
    <ProtectedRoute allowedRoles={["profesor", "docente", "comision"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-full px-5 py-6 space-y-4">
          <div>
            <Link href="/dashboard/docente">
              <Button variant="ghost" size="sm" className="-ml-2 text-gray-600 mb-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver al panel
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 rounded-xl p-2.5">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Revisiones y Comentarios</h1>
                <p className="text-sm text-gray-500">Ve los comentarios de la comisión sobre tus documentos y responde directamente</p>
              </div>
            </div>
          </div>
          <Suspense fallback={<div className="text-center py-20 text-gray-400">Cargando...</div>}>
            <RevisionsContent />
          </Suspense>
        </main>
      </div>
    </ProtectedRoute>
  );
}
