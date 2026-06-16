"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { MainHeader } from "@/components/layout/main-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComentariosPanel } from "@/components/comision/ComentariosPanel";
import { ArrowLeft, AlertCircle, User, GraduationCap, Calendar, RefreshCw, PanelRight, PanelRightClose, Printer } from "lucide-react";
import Link from "next/link";
// PDF export via browser print window (no canvas conversion needed)

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

interface ProgramaData {
  id: number;
  estado: string;
  periodo: string;
  nombre?: string;
  datos_programa: { tabs?: Tab[]; [key: string]: any } | null;
  profesor: { id: number; nombres: string; apellidos: string; email: string } | null;
  asignatura: { id: number; nombre: string; codigo: string } | null;
  created_at: string;
  updated_at: string;
}

function escapeHtml(value: string) {
  const escaped = String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  return escaped
    .replace(/(programaci[oó]n\s*(?:1|i+|ii+)?)/gi, '<span style="font-weight: normal !important; font-style: normal !important;">$1</span>')
    .replace(/((?:Primer\s+Periodo\s+)?PII?\s+2026)/gi, '<span style="font-weight: normal !important; font-style: normal !important;">$1</span>');
}

function getCellLayout(cell: TabCell, cellIndex: number, visibleCells: TabCell[], isFirstSection = false) {
  const bg = cell.styles?.backgroundColor || cell.backgroundColor;
  const color = cell.styles?.textColor || cell.textColor;
  const orientation = cell.styles?.textOrientation || cell.textOrientation;
  const trimmed = (cell.content || "").trim();
  const isVertical = orientation === "vertical" && !isFirstSection && !trimmed.includes("-") && trimmed.length <= 14;
  const isSeparator = trimmed === ":" || (trimmed.length <= 2 && !/[a-zA-Z0-9]/.test(trimmed) && trimmed.length > 0);
  const isSimpleRow = visibleCells.length <= 4;
  const shouldCenterV = !!cell.isHeader || ((cell.rowSpan ?? 1) > 1) || visibleCells.length >= 3;

  const colWidth = (() => {
    if (isFirstSection && isSimpleRow) {
      if (isSeparator) return { width: "18px", minWidth: "18px", maxWidth: "18px" };
      if (cellIndex === 0) return { minWidth: "200px", maxWidth: "300px" };
      return {};
    }
    if (isVertical) return { width: "28px", minWidth: "28px", maxWidth: "28px" };
    if (isSeparator) return { width: "20px", minWidth: "20px", maxWidth: "20px" };
    if (trimmed.length <= 4 && cellIndex > 1 && !cell.isHeader) {
      return { width: "35px", minWidth: "35px", maxWidth: "45px" };
    }
    return {};
  })();

  return {
    bg,
    color,
    isVertical,
    isSimpleRow,
    shouldCenterV,
    colWidth,
    fontSize: isFirstSection && isSimpleRow && cellIndex === 0 ? "13px" : isVertical ? "9px" : "12px",
    lineHeight: isFirstSection ? "1.4" : "1.3",
    padding: isFirstSection && isSimpleRow ? "4px 8px" : "2px 4px",
    fontWeight: cell.fontWeight || (cell.isHeader ? "700" : undefined),
  };
}

function getPrintableCellLayout(cell: TabCell, cellIndex: number, visibleCells: TabCell[], isFirstSection = false) {
  const bg = cell.styles?.backgroundColor || cell.backgroundColor;
  const color = cell.styles?.textColor || cell.textColor;
  const trimmed = (cell.content || "").trim();
  const normalized = trimmed.toLowerCase();
  const isSeparator = trimmed === ":" || (trimmed.length <= 2 && !/[a-zA-Z0-9]/.test(trimmed) && trimmed.length > 0);
  const isSimpleRow = visibleCells.length <= 4;
  const shouldCenterV = !!cell.isHeader || ((cell.rowSpan ?? 1) > 1) || visibleCells.length >= 3;
  const isDateLike = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(trimmed) || /^[A-Z]\s*:\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(trimmed);
  const isShortMetric = !!trimmed && trimmed.length <= 4 && /^[0-9a-z.]+$/i.test(trimmed) && !cell.isHeader;
  const isLongText = trimmed.length > 90;
  const isMediumText = trimmed.length > 36;
  const isBibliografia = normalized.includes("bibliograf") || normalized.includes("fuentes");
  const isRecursos = normalized.includes("recursos");
  const isMetodologia = normalized.includes("metodolog");
  const isEscenario = normalized.includes("escenario");
  const isFecha = normalized.includes("fecha") || isDateLike;
  const isUnidad = normalized.includes("unidad") || normalized.includes("tematic");

  let colWidth: Record<string, string> = {};
  if (isFirstSection && isSimpleRow) {
    if (isSeparator) {
      colWidth = { width: "24px", minWidth: "24px", maxWidth: "24px" };
    } else if (cellIndex === 0) {
      colWidth = { minWidth: "240px", maxWidth: "340px" };
    }
  } else if (isFecha) {
    colWidth = { minWidth: "130px", width: "130px", maxWidth: "150px" };
  } else if (isBibliografia) {
    colWidth = { minWidth: "220px" };
  } else if (isRecursos || isMetodologia) {
    colWidth = { minWidth: "260px" };
  } else if (isEscenario) {
    colWidth = { minWidth: "120px" };
  } else if (isUnidad) {
    colWidth = { minWidth: "150px" };
  } else if (isLongText) {
    colWidth = { minWidth: "220px" };
  } else if (isMediumText) {
    colWidth = { minWidth: "150px" };
  } else if (isSeparator) {
    colWidth = { width: "24px", minWidth: "24px", maxWidth: "24px" };
  } else if (isShortMetric) {
    colWidth = { width: "64px", minWidth: "64px", maxWidth: "80px" };
  }

  return {
    bg,
    color,
    shouldCenterV,
    colWidth,
    fontSize: cell.isHeader ? "13px" : isFirstSection && isSimpleRow && cellIndex === 0 ? "14px" : "12px",
    lineHeight: isFirstSection ? "1.4" : "1.35",
    padding: isFirstSection && isSimpleRow ? "6px 10px" : "6px 8px",
    fontWeight: cell.fontWeight || (cell.isHeader ? "700" : undefined),
  };
}

function styleObjectToCss(style: Record<string, string | undefined>) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}:${value}`)
    .join(";");
}

function buildPrintableTableHtml(tab: Tab, _isFirstSection: boolean) {
  const rowsHtml = tab.rows.map((row) => {
    const cellsHtml = row.cells.map((cell) => {
      if ((cell.rowSpan ?? 1) <= 0 || (cell.colSpan ?? 1) <= 0) return "";
      const bg = cell.styles?.backgroundColor || cell.backgroundColor || (cell.isHeader ? "#f8fafc" : "#ffffff");
      const fw = cell.fontWeight || (cell.isHeader ? "700" : "normal");
      const ta = cell.isHeader ? "center" : "left";
      const tdStyle = `background-color:${bg};font-weight:${fw};text-align:${ta};writing-mode:horizontal-tb;word-break:break-word;overflow-wrap:break-word;white-space:normal;`;
      return `<td rowspan="${cell.rowSpan ?? 1}" colspan="${cell.colSpan ?? 1}" style="${tdStyle}">${escapeHtml(cell.content || "")}</td>`;
    }).join("");
    return `<tr>${cellsHtml}</tr>`;
  }).join("");

  return `
    <section class="print-section">
      <div class="section-title">${escapeHtml(tab.title || "")}</div>
      <div class="table-shell">
        <table><tbody>${rowsHtml}</tbody></table>
      </div>
    </section>
  `;
}

function buildVisadoHtml(firmasData: any) {
  const etapas = [
    { etapa: "decano", label: "DECANO/A DE FACULTAD" },
    { etapa: "director_academico", label: "DIRECTOR/A ACADÉMICO/A" },
    { etapa: "coordinador", label: "COORDINADOR/A DE CARRERA" },
    { etapa: "docente", label: "DOCENTE" },
  ];

  const cols = etapas.map((cfg) => {
    const info = firmasData?.etapas?.find((item: any) => item.etapa === cfg.etapa);
    const fecha = info?.firma?.firmado_at
      ? new Date(info.firma.firmado_at).toLocaleDateString("es-EC")
      : "";
    const qrHtml = info?.firma?.qr_data_url
      ? `<img src="${info.firma.qr_data_url}" alt="QR ${escapeHtml(cfg.label)}" class="firma-qr" />`
      : '<div class="firma-pendiente">Pendiente de firma</div>';

    return `
      <td class="visado-cell">
        <div class="visado-label">${escapeHtml(cfg.label)}</div>
        <div class="visado-content">
          <div class="visado-nombre">${escapeHtml(info?.firma?.usuario_nombre || "")}</div>
          ${qrHtml}
          <div class="visado-fecha">${fecha ? `Fecha: ${escapeHtml(fecha)}` : ""}</div>
        </div>
      </td>
    `;
  }).join("");

  return `
    <section class="print-section visado-section" data-export-section="visado" style="page-break-inside: avoid !important; break-inside: avoid-page !important;">
      <div class="section-title">VISADO</div>
      <table class="visado-table">
        <tbody>
          <tr>${cols}</tr>
        </tbody>
      </table>
    </section>
  `;
}

/** Renders form-dynamic format (key-value map of sections) */
function FlatDataViewer({ data }: { data: Record<string, any> }) {
  return (
    <div className="space-y-4 p-2">
      {Object.entries(data).map(([key, value]) => {
        if (["version", "metadata"].includes(key)) return null;
        const label = key.replace(/_/g, " ");
        const renderedValue =
          typeof value === "object" && value !== null
            ? <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-48">{JSON.stringify(value, null, 2)}</pre>
            : <span className="text-gray-800 whitespace-pre-wrap">{String(value)}</span>;
        return (
          <div key={key} className="border-b border-gray-100 pb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            {renderedValue}
          </div>
        );
      })}
    </div>
  );
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
                          ? 'ring-2 ring-inset ring-purple-500 border-purple-300'
                          : onCellClick
                          ? 'border-gray-300 cursor-pointer hover:bg-purple-50/40'
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
  const [data, setData] = useState<ProgramaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabActivo, setTabActivo] = useState(0);
  const [showComentarios, setShowComentarios] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ id: string; content: string } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const cargar = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/comision-academica/programa-docente/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error al cargar el programa analítico (${res.status})`);
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
      <AlertCircle className="h-5 w-5" /> ID de programa no especificado.
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-3" />
      <p className="text-gray-400">Cargando programa analítico...</p>
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

  const datosProg = data.datos_programa;
  const hasTabs = datosProg?.tabs && Array.isArray(datosProg.tabs) && datosProg.tabs.length > 0;
  const tabs: Tab[] = hasTabs ? (datosProg!.tabs as Tab[]) : [];
  const tabActual = tabs[tabActivo];

  const handlePrintToPdf = async () => {
    if (!hasTabs || tabs.length === 0) return;
    setIsPrinting(true);
    try {
      // Fetch firmas
      let firmasData: any = null;
      try {
        const token = localStorage.getItem("token");
        const fr = await Promise.race([
          fetch(`${API_URL}/firmas/programa_analitico/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ]);
        if (fr.success) firmasData = fr.data;
      } catch { /* sin firmas */ }

      const asignaturaNombre = data.asignatura?.nombre || data.nombre || '';
      const periodoStr = data.periodo || '';
      const docenteNombre = data.profesor ? `${data.profesor.nombres} ${data.profesor.apellidos}`.trim() : '';
      const headerLine = [
        asignaturaNombre,
        periodoStr ? `Periodo: ${periodoStr}` : "",
        docenteNombre,
      ].filter(Boolean).join(" | ");

      const printableTabs = tabs
        .filter((tab) => tab.rows?.length && tab.title?.trim().toUpperCase() !== "VISADO")
        .map((tab, idx) => buildPrintableTableHtml(tab, idx === 0 || /GENERAL|INFORMACIÓN|INFORMACION|DATOS/i.test(tab.title || "")))
        .join("");
      const visadoHtml = buildVisadoHtml(firmasData);
      const logoUrl = `${window.location.origin}/images/unesum-logo-official.png`;

      const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Programa Analítico - ${escapeHtml(asignaturaNombre)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-size: 7pt; font-family: Arial, Helvetica, sans-serif; }
  body { color: #1f2937; background: #fff; }

  /* ── HEADER ── */
  .export-header { margin-bottom: 6pt; border: 0.5pt solid #c7cdd6; border-radius: 4pt; overflow: hidden; }
  .page-header { display: flex; align-items: center; gap: 8pt; background: #19325f; color: white; padding: 6pt 10pt; }
  .page-header img { width: 36pt; height: 36pt; object-fit: contain; }
  .page-header-text { flex: 1; text-align: center; }
  .page-header-text h1 { font-size: 12pt; font-weight: 700; color: white; }
  .page-header-text h2 { font-size: 9pt; font-weight: 700; margin-top: 2pt; color: white; }
  .page-subheader { background: #f0f4fa; color: #19325f; padding: 4pt 10pt; text-align: center; font-size: 8pt; font-weight: 700; border-top: 0.5pt solid #c7cdd6; }

  /* ── SECTIONS ── */
  .print-section { margin-top: 6pt; }
  .section-title { background: #3b64a0; color: white; padding: 4pt 6pt; font-size: 8pt; font-weight: 700; border-radius: 2pt 2pt 0 0; border: 0.5pt solid #c7cdd6; border-bottom: none; }
  .table-shell { border: 0.5pt solid #c7cdd6; }

  /* ── TABLES ── */
  table { width: 100%; border-collapse: collapse; table-layout: auto; background: white; }
  td { border: 0.5pt solid #c7cdd6; vertical-align: middle; padding: 2pt 3pt; word-break: break-word; overflow-wrap: break-word; white-space: normal; writing-mode: horizontal-tb !important; }

  /* ── VISADO ── */
  .visado-section { margin-top: 10pt; page-break-inside: avoid !important; break-inside: avoid-page !important; }
  .visado-table { table-layout: fixed; }
  .visado-label { background: #dce5f2; color: #19325f; text-align: center; font-size: 8pt; font-weight: 700; padding: 5pt; }
  .visado-content { min-height: 80pt; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5pt; padding: 6pt; text-align: center; }
  .visado-nombre { font-size: 7pt; }
  .visado-fecha { font-size: 7pt; color: #4b5563; }
  .firma-qr { width: 54pt; height: 54pt; object-fit: contain; }
  .firma-pendiente { font-size: 7pt; color: #9ca3af; font-style: italic; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-section { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    .visado-section { page-break-inside: avoid !important; break-inside: avoid-page !important; }
  }
</style>
</head>
<body>
  <div class="export-header">
    <header class="page-header">
      <img src="${logoUrl}" alt="UNESUM" />
      <div class="page-header-text">
        <h1>UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ</h1>
        <h2>PROGRAMA ANALÍTICO DE ASIGNATURA</h2>
      </div>
    </header>
    <div class="page-subheader">${escapeHtml(headerLine)}</div>
  </div>
  ${printableTabs}
  ${visadoHtml}
</body>
</html>`;

      const win = window.open('', '_blank', 'width=1280,height=900');
      if (!win) {
        alert('Permita las ventanas emergentes para exportar el PDF.');
        return;
      }
      win.document.open();
      win.document.write(fullHtml);
      win.document.close();
      const tryPrint = () => { try { win.focus(); win.print(); } catch { /* ignore */ } };
      if (win.document.readyState === 'complete') {
        setTimeout(tryPrint, 700);
      } else {
        win.addEventListener('load', () => setTimeout(tryPrint, 700), { once: true });
      }
    } finally {
      setIsPrinting(false);
    }
  };


  return (
    <div className="flex gap-4 h-[calc(100vh-11rem)]">
      {/* ── Panel del documento ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Info cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 flex-shrink-0">
          {[
            { icon: User, label: "Docente", value: data.profesor ? `${data.profesor.nombres} ${data.profesor.apellidos}` : "—", sub: data.profesor?.email, color: "text-blue-700" },
            { icon: GraduationCap, label: "Asignatura", value: data.asignatura?.nombre ?? data.nombre ?? "—", sub: data.asignatura?.codigo, color: "text-purple-700" },
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
                className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${idx === tabActivo ? "border-purple-600 text-purple-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
                {tab.title || `Pestaña ${idx + 1}`}
              </button>
            ))}
            <div className="ml-auto flex-shrink-0 px-2 flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-500 mr-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#fef08a] border border-yellow-300"></span>Bloq. Admin</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#fef2f2] border border-red-200"></span>Bloq. Comisión</span>
              </div>
              {hasTabs && (
                <button
                  onClick={handlePrintToPdf}
                  disabled={isPrinting}
                  className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                  title="Imprimir / Exportar PDF"
                >
                  <Printer className="h-4 w-4 text-gray-600" />
                </button>
              )}
              <button onClick={() => setShowComentarios(v => !v)} className="p-1.5 rounded hover:bg-gray-200 transition-colors" title={showComentarios ? "Ocultar comentarios" : "Mostrar comentarios"}>
                {showComentarios ? <PanelRightClose className="h-4 w-4 text-gray-500" /> : <PanelRight className="h-4 w-4 text-indigo-600" />}
              </button>
            </div>
          </div>
          <div className="p-4 overflow-auto flex-1">
            {hasTabs
              ? tabActual?.rows?.length
                ? <ReadOnlyTable
                    rows={tabActual.rows}
                    selectedCellId={selectedCell?.id}
                    isFirstSection={/GENERAL|INFORMACIÓN|INFORMACION|DATOS/i.test(tabActual?.title || '')}
                    onCellClick={cell => setSelectedCell(
                      selectedCell?.id === cell.id ? null : { id: cell.id, content: cell.content }
                    )}
                  />
                : <p className="text-center text-gray-400 py-8">Esta pestaña está vacía.</p>
              : datosProg
                ? <FlatDataViewer data={datosProg} />
                : <p className="text-center text-gray-400 py-8">Este programa analítico no tiene contenido.</p>}
          </div>
        </div>
      </div>

      {/* ── Panel de comentarios ── */}
      {showComentarios && (
        <div className="w-80 xl:w-96 flex-shrink-0">
          <ComentariosPanel
            tipo="programa"
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
  );
}

export default function VerProgramaDocentePage() {
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
              Programa Analítico del Docente
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
