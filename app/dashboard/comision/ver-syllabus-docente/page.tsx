"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { MainHeader } from "@/components/layout/main-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComentariosPanel } from "@/components/comision/ComentariosPanel";
import { ArrowLeft, AlertCircle, User, GraduationCap, Calendar, RefreshCw, PanelRight, PanelRightClose } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface TabCell {
  id: string;
  content: string;
  isHeader?: boolean;
  rowSpan?: number;
  colSpan?: number;
  backgroundColor?: string;
}
interface TabRow { id: string; cells: TabCell[] }
interface Tab { id: string; title: string; rows: TabRow[] }

interface SyllabusData {
  id: number;
  estado: string;
  periodo: string;
  datos_syllabus: { tabs: Tab[] } | null;
  profesor: { id: number; nombres: string; apellidos: string; email: string } | null;
  asignatura: { id: number; nombre: string; codigo: string } | null;
  created_at: string;
  updated_at: string;
}

function ReadOnlyTable({ rows }: { rows: TabRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              {row.cells.map(cell => {
                const Tag = cell.isHeader ? "th" : "td";
                return (
                  <Tag
                    key={cell.id}
                    rowSpan={cell.rowSpan || 1}
                    colSpan={cell.colSpan || 1}
                    style={{ backgroundColor: cell.backgroundColor || undefined }}
                    className={`border border-gray-300 px-3 py-2 align-top whitespace-pre-wrap ${
                      cell.isHeader
                        ? "font-semibold bg-opacity-90 text-center"
                        : "text-gray-800"
                    }`}
                  >
                    {cell.content || ""}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function estadoColor(estado: string) {
  const m: Record<string, string> = {
    borrador: "bg-yellow-100 text-yellow-800 border-yellow-300",
    enviado: "bg-blue-100 text-blue-800 border-blue-300",
    aprobado: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  return m[estado] ?? "bg-gray-100 text-gray-700 border-gray-300";
}

function VisorContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [data, setData] = useState<SyllabusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabActivo, setTabActivo] = useState(0);
  const [showComentarios, setShowComentarios] = useState(true);

  const cargar = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/comision-academica/syllabus-docente/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error al cargar el syllabus (${res.status})`);
      const json = await res.json();
      setData(json.data);
      setTabActivo(0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  if (!id) return (
    <div className="flex items-center gap-2 text-red-600 p-6">
      <AlertCircle className="h-5 w-5" /> ID de syllabus no especificado.
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3" />
      <p className="text-gray-400">Cargando syllabus...</p>
    </div>
  );

  if (error) return (
    <Card className="border-red-200 bg-red-50 m-6">
      <CardContent className="flex items-center gap-3 py-5 text-red-700 text-sm">
        <AlertCircle className="h-5 w-5 flex-shrink-0" /> {error}
        <Button size="sm" variant="outline" onClick={cargar} className="ml-auto gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </Button>
      </CardContent>
    </Card>
  );

  if (!data) return null;

  const tabs = data.datos_syllabus?.tabs ?? [];
  const tabActual = tabs[tabActivo];

  return (
    <div className="flex gap-4 h-[calc(100vh-11rem)]">
      {/* ── Panel del documento ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Info cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 flex-shrink-0">
          {[
            { icon: User, label: "Docente", value: data.profesor ? `${data.profesor.nombres} ${data.profesor.apellidos}` : "—", sub: data.profesor?.email, color: "text-blue-700" },
            { icon: GraduationCap, label: "Asignatura", value: data.asignatura?.nombre ?? "—", sub: data.asignatura?.codigo, color: "text-emerald-700" },
            { icon: Calendar, label: "Periodo", value: data.periodo ?? "—", color: "text-indigo-700" },
            { icon: null, label: "Estado", value: <span className={`text-xs px-2 py-0.5 rounded border font-medium ${estadoColor(data.estado)}`}>{data.estado}</span>, color: "" },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">{item.icon && <item.icon className={`h-3 w-3 ${item.color}`} />}{item.label}</p>
              <div className={`font-semibold text-xs ${item.color}`}>{item.value}</div>
              {(item as any).sub && <p className="text-[10px] text-gray-400">{(item as any).sub}</p>}
            </div>
          ))}
        </div>

        {/* Documento con pestañas */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-auto flex flex-col">
          <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 flex-shrink-0 items-center">
            {tabs.map((tab, idx) => (
              <button key={tab.id} onClick={() => setTabActivo(idx)}
                className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${idx === tabActivo ? "border-emerald-600 text-emerald-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
                {tab.title || `Pestaña ${idx + 1}`}
              </button>
            ))}
            <div className="ml-auto flex-shrink-0 px-2">
              <button onClick={() => setShowComentarios(v => !v)} className="p-1.5 rounded hover:bg-gray-200 transition-colors" title={showComentarios ? "Ocultar comentarios" : "Mostrar comentarios"}>
                {showComentarios ? <PanelRightClose className="h-4 w-4 text-gray-500" /> : <PanelRight className="h-4 w-4 text-indigo-600" />}
              </button>
            </div>
          </div>
          <div className="p-4 overflow-auto flex-1">
            {tabs.length === 0 ? <p className="text-center text-gray-400 py-8">Este syllabus no tiene contenido.</p>
              : tabActual?.rows?.length ? <ReadOnlyTable rows={tabActual.rows} />
                : <p className="text-center text-gray-400 py-8">Esta pestaña está vacía.</p>}
          </div>
        </div>
      </div>

      {/* ── Panel de comentarios ── */}
      {showComentarios && (
        <div className="w-80 xl:w-96 flex-shrink-0">
          <ComentariosPanel
            tipo="syllabus"
            documentoId={parseInt(id!)}
            usuarioId={user?.id}
            usuarioRol={user?.rol}
            marcarLeido={false}
          />
        </div>
      )}
    </div>
  );
}

export default function VerSyllabusDocentePage() {
  return (
    <ProtectedRoute allowedRoles={["comision", "comision_academica", "administrador"]}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-full px-4 py-5 space-y-4">
          <div>
            <Link href="/dashboard/comision/documentos-docentes">
              <Button variant="ghost" size="sm" className="-ml-2 text-gray-600 mb-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Documentos de Docentes
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">
              Syllabus del Docente
              <span className="text-sm font-normal text-gray-400 ml-2">Solo lectura · con comentarios</span>
            </h1>
          </div>
          <Suspense fallback={<div className="text-center py-20 text-gray-400">Cargando...</div>}>
            <VisorContent />
          </Suspense>
        </main>
      </div>
    </ProtectedRoute>
  );
}
