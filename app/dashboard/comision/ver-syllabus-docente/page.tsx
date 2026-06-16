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
import { FirmasPanel } from "@/components/firmas/firmas-panel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface TabCell {
  id: string;
  content: string;
  isHeader?: boolean;
  rowSpan?: number;
  colSpan?: number;
  backgroundColor?: string;
  textColor?: string;
  textAlign?: string;
  textOrientation?: string;
  fontWeight?: string;
  fontSize?: string;
  isLocked?: boolean;
  docenteEditable?: boolean;
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    textAlign?: string;
    textOrientation?: string;
  };
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

function ReadOnlyTable({
  rows,
  onCellClick,
  selectedCellId,
  isFirstSection = false,
}: {
  rows: TabRow[];
  onCellClick?: (cell: TabCell) => void;
  selectedCellId?: string | null;
  isFirstSection?: boolean;
}) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
      <table
        className="border-collapse text-xs text-left w-full"
        style={{ tableLayout: isFirstSection ? 'fixed' : 'auto' }}
      >
        <tbody className="divide-y divide-gray-200">
          {rows.map((row, rowIndex) => {
            const visibleCells = row.cells.filter(c => (c.rowSpan ?? 1) > 0 && (c.colSpan ?? 1) > 0);
            const isSimpleRow = visibleCells.length <= 4;
            return (
              <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                {row.cells.map((cell, cellIndex) => {
                  // Skip ghost cells (cells covered by a rowSpan/colSpan from another cell)
                  if ((cell.rowSpan ?? 1) === 0 || (cell.colSpan ?? 1) === 0) return null;

                  const adminLocked = cell.isLocked === true && cell.docenteEditable !== false;
                  const comisionLocked = cell.docenteEditable === false;

                  const bg = adminLocked ? '#fef08a' : comisionLocked ? '#fef2f2' : (cell.styles?.backgroundColor || cell.backgroundColor);
                  const color = cell.styles?.textColor || cell.textColor;
                  const orientation = cell.styles?.textOrientation || cell.textOrientation;
                  const trimmed = (cell.content || '').trim();
                  const isVertical = orientation === 'vertical' && !isFirstSection && !trimmed.includes('-') && trimmed.length <= 14;
                  const isSeparator = trimmed === ':' || (trimmed.length <= 2 && !/[a-zA-Z0-9]/.test(trimmed) && trimmed.length > 0);
                  const isSelected = selectedCellId === cell.id;

                  const shouldCenterV = cell.isHeader || (cell.rowSpan && cell.rowSpan > 1) || visibleCells.length >= 3;

                  // Smart column widths matching docente widths
                  const colWidth = (() => {
                    if (isFirstSection && isSimpleRow) {
                      if (isSeparator) return { width: '18px', minWidth: '18px', maxWidth: '18px' };
                      if (cellIndex === 0) return { minWidth: '200px', maxWidth: '300px' };
                      return {};
                    }
                    if (isVertical) return { width: '28px', minWidth: '28px', maxWidth: '28px' };
                    if (isSeparator) return { width: '20px', minWidth: '20px', maxWidth: '20px' };
                    if (trimmed.length <= 4 && cellIndex > 1 && !cell.isHeader) return { width: '35px', minWidth: '35px', maxWidth: '45px' };
                    return {};
                  })();

                  return (
                    <td
                      key={cell.id}
                      rowSpan={cell.rowSpan ?? 1}
                      colSpan={cell.colSpan ?? 1}
                      onClick={() => onCellClick?.(cell)}
                      style={{
                        backgroundColor: bg || (cell.isHeader ? '#f8fafc' : undefined),
                        padding: 0,
                        ...colWidth,
                        ...(isFirstSection && isSimpleRow ? { borderBottom: '1px solid #e2e8f0' } : {}),
                      }}
                      className={`border relative transition-colors ${
                        isSelected
                          ? 'ring-2 ring-inset ring-indigo-500 border-indigo-300'
                          : onCellClick
                          ? 'border-gray-300 cursor-pointer hover:bg-indigo-50/40'
                          : 'border-gray-300'
                      } ${
                        cell.isHeader
                          ? 'bg-gray-100/80 font-bold text-gray-800'
                          : adminLocked || comisionLocked
                          ? 'text-gray-800'
                          : isFirstSection && isSimpleRow && cellIndex === 0
                          ? 'bg-gradient-to-r from-slate-50 to-gray-50 font-semibold text-gray-700'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      <div
                        className={`w-full h-full flex ${
                          cell.isHeader
                            ? 'justify-center text-center items-center'
                            : shouldCenterV
                            ? 'justify-start text-left items-center'
                            : 'justify-start text-left items-start'
                        } ${
                          isFirstSection && isSimpleRow ? 'px-2 py-1' : 'px-1 py-0.5'
                        }`}
                        style={{
                          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                          transform: isVertical ? 'rotate(180deg)' : 'none',
                          maxHeight: isVertical ? '100px' : 'none',
                          whiteSpace: isVertical ? 'nowrap' : 'pre-wrap',
                          overflow: 'hidden',
                          lineHeight: isFirstSection ? '1.4' : '1.3',
                          fontSize: isFirstSection && isSimpleRow && cellIndex === 0 ? '13px' : isVertical ? '9px' : '12px',
                          color: color || undefined,
                          fontWeight: cell.fontWeight || (cell.isHeader ? '700' : undefined),
                        }}
                      >
                        <div className="whitespace-pre-wrap break-words w-full" style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>
                          {cell.content || ''}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
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
  const [selectedCell, setSelectedCell] = useState<{ id: string; content: string } | null>(null);

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
      
      const cleanedData = json.data;
      if (cleanedData && cleanedData.datos_syllabus && Array.isArray(cleanedData.datos_syllabus.tabs)) {
        const targetLabels = [
          'TOTAL HORAS DE LA ASIGNATURA',
          'TOTAL HORAS DE ASIGNATURA',
          'TOTAL HORAS ASIGNATURA'
        ];
        cleanedData.datos_syllabus.tabs = cleanedData.datos_syllabus.tabs.map((tab: any) => {
          if (!Array.isArray(tab.rows)) return tab;
          const processedRows: any[] = [];
          const seenLabels = new Set<string>();
          tab.rows.forEach((row: any) => {
            if (!row.cells || row.cells.length === 0) {
              processedRows.push(row);
              return;
            }
            const labelCell = row.cells.find((c: any) => {
              const text = (c.content || '').trim().toUpperCase().replace(/:$/, '').trim();
              return targetLabels.includes(text);
            });
            if (labelCell) {
              const normLabel = (labelCell.content || '').trim().toUpperCase().replace(/:$/, '').trim();
              if (seenLabels.has(normLabel)) {
                // Merge value into the existing row
                const existingRow = processedRows.find(r => 
                  r.cells.some((c: any) => ((c.content || '').trim().toUpperCase().replace(/:$/, '').trim()) === normLabel)
                );
                if (existingRow) {
                  const newValCell = row.cells.find((c: any, idx: number) => 
                    idx > 0 && c.content?.trim() !== '' && c.content?.trim() !== ':'
                  );
                  if (newValCell && newValCell.content) {
                    const targetValCell = existingRow.cells.find((c: any, idx: number) => 
                      idx > 0 && c.content?.trim() !== ':'
                    );
                    if (targetValCell && (!targetValCell.content?.trim() || targetValCell.content?.trim() === '0')) {
                      targetValCell.content = newValCell.content;
                    }
                  }
                }
                return;
              } else {
                seenLabels.add(normLabel);
              }
            }
            processedRows.push(row);
          });
          return { ...tab, rows: processedRows };
        });
      }

      setData(cleanedData);
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
    <div className="flex flex-col gap-4">
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
              <button key={tab.id} onClick={() => { setTabActivo(idx); setSelectedCell(null); }}
                className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${idx === tabActivo ? "border-emerald-600 text-emerald-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
                {tab.title || `Pestaña ${idx + 1}`}
              </button>
            ))}
            <div className="ml-auto flex-shrink-0 px-2 flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-500 mr-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#fef08a] border border-yellow-300"></span>Bloq. Admin</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#fef2f2] border border-red-200"></span>Bloq. Comisión</span>
              </div>
              <button onClick={() => setShowComentarios(v => !v)} className="p-1.5 rounded hover:bg-gray-200 transition-colors" title={showComentarios ? "Ocultar comentarios" : "Mostrar comentarios"}>
                {showComentarios ? <PanelRightClose className="h-4 w-4 text-gray-500" /> : <PanelRight className="h-4 w-4 text-indigo-600" />}
              </button>
            </div>
          </div>
          <div className="p-4 overflow-auto flex-1">
            {tabs.length === 0 ? <p className="text-center text-gray-400 py-8">Este syllabus no tiene contenido.</p>
              : tabActual?.rows?.length ? <ReadOnlyTable
                    rows={tabActual.rows}
                    selectedCellId={selectedCell?.id}
                    isFirstSection={/GENERAL|INFORMACIÓN|INFORMACION|DATOS/i.test(tabActual.title || '')}
                    onCellClick={cell => setSelectedCell(
                      selectedCell?.id === cell.id ? null : { id: cell.id, content: cell.content }
                    )}
                  />
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
            celdaRef={selectedCell ? selectedCell.content : null}
            onClearCeldaRef={() => setSelectedCell(null)}
          />
        </div>
      )}
    </div>

    {/* ── Panel de firmas digitales ── */}
    <div className="max-w-2xl">
      <FirmasPanel
        tipo="syllabus"
        documentoId={Number((data as any).syllabus_comision_id || parseInt(id!))}
        documentoNombre={data?.asignatura?.nombre || 'Syllabus'}
        onFirmado={cargar}
      />
    </div>
    </div>
  );
}

export default function VerSyllabusDocentePage() {
  return (
    <ProtectedRoute allowedRoles={["coordinador", "comision", "comision_academica", "administrador"]}>
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
