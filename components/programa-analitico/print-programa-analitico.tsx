'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface TableCell {
  id?: string;
  content: string;
  isHeader?: boolean;
  rowSpan?: number;
  colSpan?: number;
  backgroundColor?: string;
  textColor?: string;
  textOrientation?: 'horizontal' | 'vertical';
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    textAlign?: string;
    textOrientation?: string;
  };
}

interface TableRow {
  id?: string;
  cells: TableCell[];
}

interface TabData {
  id?: string;
  title: string;
  rows: TableRow[];
}

interface ProgramaData {
  tabs?: TabData[];
  secciones?: any[];
  datos_generales?: {
    asignatura?: string;
    carrera?: string;
    nivel?: string;
    periodo_academico?: string;
    docente?: string;
  };
  unidades_tematicas?: any[];
  name?: string;
  nombre?: string;
  metadata?: { subject?: string; period?: string; level?: string };
}

interface EtapaFirma {
  etapa: string;
  firmado: boolean;
  firma?: {
    usuario_nombre?: string;
    usuario_titulo?: string;
    firmado_at?: string;
    qr_data_url?: string;
    url_verificacion?: string;
  } | null;
}

interface Props {
  programaData: ProgramaData | null;
  asignaturaNombre?: string;
  periodoNombre?: string;
  docenteNombre?: string;
  nivelNombre?: string;
  firmasData?: { etapas?: EtapaFirma[] } | null;
  programa_comision_id?: number | null;
  apiUrl?: string;
  token?: string;
  buttonLabel?: string;
  buttonClassName?: string;
}

const ETAPA_LABELS: Record<string, string> = {
  docente: 'DOCENTE',
  coordinador: 'COORDINADOR/A DE CARRERA',
  decano: 'DECANO/A DE FACULTAD',
  director_academico: 'DIRECTOR/A ACADÉMICO/A',
};

const VISADO_ETAPAS = ['decano', 'director_academico', 'coordinador', 'docente'] as const;

// ─── Convertir Nivel a Ordinal en Español ────────────────────────────────────
function formatearNivelOrdinal(val: string | number): string {
  if (!val) return '';
  const originalVal = String(val).trim();
  const valStr = originalVal.toUpperCase();

  const ordinalsMap: Record<string, string> = {
    'PRIMERO': 'Primero',
    'SEGUNDO': 'Segundo',
    'TERCERO': 'Tercero',
    'CUARTO': 'Cuarto',
    'QUINTO': 'Quinto',
    'SEXTO': 'Sexto',
    'SÉPTIMO': 'Séptimo',
    'OCTAVO': 'Octavo',
    'NOVENO': 'Noveno',
    'DÉCIMO': 'Décimo',
    'PRIMER': 'Primer',
    'TERCER': 'Tercer',
    'DÉCIMO PRIMERO': 'Décimo Primero',
    'DÉCIMO SEGUNDO': 'Décimo Segundo'
  };

  const ordinalsList = Object.keys(ordinalsMap);
  if (ordinalsList.includes(valStr)) {
    return ordinalsMap[valStr];
  }

  const mapaOrdinales: Record<string, string> = {
    '1': 'Primero',
    '2': 'Segundo',
    '3': 'Tercero',
    '4': 'Cuarto',
    '5': 'Quinto',
    '6': 'Sexto',
    '7': 'Séptimo',
    '8': 'Octavo',
    '9': 'Noveno',
    '10': 'Décimo',
    '11': 'Décimo Primero',
    '12': 'Décimo Segundo'
  };

  const mapaAbreviaturas: Record<string, string> = {
    '1RO': 'Primero', '1RA': 'Primero', '1°': 'Primero', '1.º': 'Primero', '1ER': 'Primero', '1º': 'Primero',
    '2DO': 'Segundo', '2DA': 'Segundo', '2°': 'Segundo', '2.º': 'Segundo', '2º': 'Segundo',
    '3RO': 'Tercero', '3RA': 'Tercero', '3°': 'Tercero', '3.º': 'Tercero', '3º': 'Tercero', '3ER': 'Tercero',
    '4TO': 'Cuarto', '4TA': 'Cuarto', '4°': 'Cuarto', '4.º': 'Cuarto', '4º': 'Cuarto',
    '5TO': 'Quinto', '5TA': 'Quinto', '5°': 'Quinto', '5.º': 'Quinto', '5º': 'Quinto',
    '6TO': 'Sexto', '6TA': 'Sexto', '6°': 'Sexto', '6.º': 'Sexto', '6º': 'Sexto',
    '7MO': 'Séptimo', '7MA': 'Séptimo', '7°': 'Séptimo', '7.º': 'Séptimo', '7º': 'Séptimo',
    '8VO': 'Octavo', '8VA': 'Octavo', '8°': 'Octavo', '8.º': 'Octavo', '8º': 'Octavo',
    '9NO': 'Noveno', '9NA': 'Noveno', '9°': 'Noveno', '9.º': 'Noveno', '9º': 'Noveno',
    '10MO': 'Décimo', '10MA': 'Décimo', '10°': 'Décimo', '10.º': 'Décimo', '10º': 'Décimo'
  };

  if (mapaOrdinales[valStr]) {
    return mapaOrdinales[valStr];
  }

  const cleanVal = valStr.replace(/[\.\s]/g, '');
  if (mapaAbreviaturas[cleanVal]) {
    return mapaAbreviaturas[cleanVal];
  }

  for (const [num, word] of Object.entries(mapaOrdinales)) {
    const regex = new RegExp(`\\b${num}\\b|\\b${num}(?:do|er|ro|to|mo|vo|no|º|°|._º)\\b`, 'i');
    if (regex.test(valStr)) {
      return originalVal.replace(new RegExp(`\\b${num}\\b|\\b${num}(?:do|er|ro|to|mo|vo|no|º|°|._º)?\\b`, 'i'), word);
    }
  }

  return originalVal;
}

// ─── Normalizar datos a formato tabs ────────────────────────────────────────
function normalizarATabs(raw: ProgramaData): TabData[] {
  if (raw.tabs && Array.isArray(raw.tabs) && raw.tabs.length > 0) {
    return raw.tabs;
  }

  // Formato secciones
  if (raw.secciones && Array.isArray(raw.secciones)) {
    return raw.secciones.map((sec: any, idx: number) => ({
      title: sec.titulo || sec.title || sec.nombre || `Sección ${idx + 1}`,
      rows: (sec.filas || sec.rows || sec.datos || []).map((fila: any, rIdx: number) => ({
        cells: (Array.isArray(fila) ? fila : (fila.celdas || fila.cells || [fila])).map((celda: any, cIdx: number) => ({
          content: typeof celda === 'string' ? celda : (celda?.contenido || celda?.content || ''),
          isHeader: rIdx === 0 || celda?.esEncabezado || celda?.isHeader || false,
          rowSpan: celda?.rowSpan || 1,
          colSpan: celda?.colSpan || 1,
          backgroundColor: celda?.backgroundColor || celda?.styles?.backgroundColor,
          textColor: celda?.textColor || celda?.styles?.textColor,
          textOrientation: celda?.textOrientation || 'horizontal',
        })),
      })),
    }));
  }

  // Formato antiguo: datos_generales + unidades_tematicas
  if (raw.datos_generales || raw.unidades_tematicas) {
    const dg = raw.datos_generales || {};
    const utem = raw.unidades_tematicas || [];
    const rows: TableRow[] = [
      { cells: [{ content: 'ASIGNATURA', isHeader: true, colSpan: 1 }, { content: dg.asignatura || '', colSpan: 1 }, { content: 'PERIODO ACADÉMICO ORDINARIO (PAO)', isHeader: true, colSpan: 1 }, { content: dg.periodo_academico || '', colSpan: 1 }] },
      { cells: [{ content: 'CARRERA', isHeader: true }, { content: dg.carrera || '', colSpan: 3 }] },
      { cells: [{ content: 'NIVEL', isHeader: true }, { content: formatearNivelOrdinal(dg.nivel || ''), colSpan: 3 }] },
      { cells: [{ content: 'DOCENTE', isHeader: true }, { content: dg.docente || '', colSpan: 3 }] },
    ];
    if (utem.length > 0) {
      rows.push({ cells: [{ content: 'CONTENIDOS DE LA ASIGNATURA', isHeader: true }, { content: 'UNIDADES TEMÁTICAS', isHeader: true }, { content: 'DESCRIPCIÓN', isHeader: true }] });
      utem.forEach((u: any) => {
        rows.push({ cells: [{ content: '' }, { content: u.nombre || u.titulo || '' }, { content: u.descripcion || u.contenido || '' }] });
      });
    }
    return [{ title: 'SECCIÓN 1', rows }];
  }

  return [];
}

// ─── Escapa HTML ─────────────────────────────────────────────────────────────
function esc(s: string): string {
  const escaped = String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return escaped
    .replace(/(programaci[oó]n\s*(?:1|i+|ii+)?)/gi, '<span style="font-weight: normal !important; font-style: normal !important;">$1</span>')
    .replace(/((?:Primer\s+Periodo\s+)?PII?\s+2026)/gi, '<span style="font-weight: normal !important; font-style: normal !important;">$1</span>');
}

// ─── Detecta el número máximo de columnas en una pestaña (respetando colSpan) ─
function maxColumnas(tab: TabData): number {
  let max = 0;
  for (const row of tab.rows) {
    const total = row.cells.reduce((s, c) => s + (c.colSpan || 1), 0);
    if (total > max) max = total;
  }
  return max || 1;
}

// ─── Genera el HTML completo para imprimir ───────────────────────────────────
function generarHTML(
  tabs: TabData[],
  asignatura: string,
  periodo: string,
  docente: string,
  firmas: { etapas?: EtapaFirma[] } | null | undefined,
): string {
  const tHeader = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Programa Analítico – ${esc(asignatura)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9pt;
          color: #111;
          background: #fff;
          min-width: 240mm;
          width: 100%;
        }

        /* Contenedor de página */
        .page-wrap {
          width: 100%;
          min-width: 240mm;
          padding: 0 4mm;
        }

        /* ── Botón imprimir (no imprime) ── */
        .btn-print {
          display: block;
          margin: 8px auto 12px;
          padding: 8px 28px;
          background: #19325f;
          color: #fff;
          border: none;
          border-radius: 5px;
          font-size: 10pt;
          font-weight: bold;
          cursor: pointer;
          letter-spacing: 0.3px;
        }
        .btn-print:hover { background: #254a85; }

        /* ── Encabezado institucional ── */
        .inst-header {
          background: #fff;
          color: #111;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 6px 8px 6px 4mm;
          border-bottom: none;
          page-break-inside: avoid;
        }
        .inst-logo { height: 54px; width: auto; flex-shrink: 0; }
        .inst-text { text-align: center; flex: 1; }
        .inst-header .uni {
          font-size: 10pt;
          font-weight: bold;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          color: #111;
        }
        .inst-header .fundacion {
          font-size: 7.5pt;
          font-style: italic;
          color: #444;
          margin: 2px 0;
        }
        .inst-header .prog {
          font-size: 9pt;
          font-weight: bold;
          color: #111;
        }
        .inst-subline {
          background: #edf2fa;
          border-left: 5px solid #19325f;
          border-right: 5px solid #19325f;
          border-bottom: 3px solid #19325f;
          text-align: center;
          padding: 5px 10px;
          font-size: 9pt;
          font-weight: bold;
          color: #19325f;
          page-break-inside: avoid;
        }

        /* ── Título de sección ── */
        .section-title {
          background: #047857;
          color: #fff;
          border: 1px solid #a0aec0;
          border-bottom: none;
          padding: 4px 10px;
          font-size: 8.5pt;
          font-weight: bold;
          letter-spacing: 0.5px;
          margin-top: 8px;
          page-break-after: avoid;
        }
        .page-break {
          page-break-before: always !important;
          break-before: page !important;
        }

        /* ── Tabla general ── */
        table {
          width: 100%;
          min-width: 230mm;
          border-collapse: collapse;
          margin-bottom: 4px;
          page-break-inside: auto;
          table-layout: auto;
          border: 1px solid #a0aec0 !important;
        }
        td, th {
          border: 1px solid #a0aec0;
          padding: 5px 8px;
          vertical-align: top;
          font-size: 8.5pt;
          word-break: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          min-height: 24px;
        }

        /* Celda encabezado (isHeader=true en datos) */
        .cell-header {
          background: #fff !important;
          color: #111;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
          width: 130px;
          min-width: 120px;
          max-width: 150px;
        }

        .cell-header-periodo {
          width: 280px !important;
          min-width: 260px !important;
          max-width: 320px !important;
          white-space: nowrap !important;
        }

        .cell-header-nivel {
          width: 140px !important;
          min-width: 130px !important;
          max-width: 160px !important;
        }

        /* Celda de texto vertical (textOrientation=vertical) */
        .cell-vert {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          text-align: center;
          vertical-align: middle;
          font-weight: bold;
          font-size: 8.5pt;
          width: 32px;
          min-width: 28px;
          max-width: 40px;
          padding: 6px 4px;
          white-space: normal;
          background: #fff;
          color: #111;
        }

        /* ── Visado ── */
        .visado-section-container {
          page-break-inside: avoid !important;
          break-inside: avoid-page !important;
          width: 100%;
        }
        .visado-title {
          background: #fff;
          color: #19325f;
          border: 1px solid #a0aec0;
          border-bottom: 2px solid #19325f;
          padding: 5px 10px;
          font-size: 8.5pt;
          font-weight: bold;
          letter-spacing: 0.4px;
          margin-top: 10px;
          page-break-after: avoid;
          text-align: center;
        }
        .visado-wrap { 
          display: flex; 
          justify-content: center; 
          width: 100%;
          padding: 0;
        }
        /* Force visado table to ignore global table min-width and center itself */
        .visado-table {
          display: inline-table;
          width: auto !important;
          min-width: 0 !important;
          max-width: 95%;
          border-collapse: collapse;
          margin: 10px auto;
          page-break-inside: avoid;
          table-layout: auto;
        }
        .visado-table th {
          background: #fff;
          color: #19325f;
          text-align: center !important;
          padding: 6px 12px;
          font-size: 8.5pt;
          border: 1px solid #a0aec0;
          font-weight: bold;
          min-width: 100px;
        }
        .visado-table td {
          border: 1px solid #a0aec0;
          text-align: center !important;
          padding: 12px 8px;
          vertical-align: middle;
          min-width: 100px;
        }
        .qr-img { width: 70px; height: 70px; display: block; margin: 8px auto; }
        .qr-placeholder { font-size: 7.5pt; color: #aaa; font-style: italic; margin: 12px auto; text-align: center; padding: 8px 0; }
        .firma-titulo { font-size: 8.5pt; font-weight: bold; color: #19325f; text-align: center !important; margin-bottom: 3px; }
        .firma-titulo-blank { font-size: 8pt; color: #bbb; text-align: center !important; letter-spacing: 2px; margin-bottom: 6px; }
        .firma-nombre { font-size: 8.5pt; font-weight: bold; text-align: center !important; margin-top: 6px; word-wrap: break-word; }
        .firma-nombre-blank { font-size: 8pt; color: #bbb; text-align: center !important; letter-spacing: 2px; margin-top: 10px; }
        .firma-fecha { font-size: 7pt; color: #555; margin-top: 4px; text-align: center !important; }
        .pendiente { font-size: 8pt; color: #999; font-style: italic; text-align: center !important; }
        .visado-td-firma { border: 1px solid #a0aec0; text-align: center !important; padding: 12px 8px; vertical-align: top; min-width: 100px; }

        @page { margin: 8mm; size: landscape; }
        @media print {
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            min-width: 240mm;
            width: 100%;
          }
          .no-print { display: none !important; }
          .page-wrap { width: 100%; min-width: 240mm; padding: 0; }
          table { min-width: 230mm; border: 1px solid #a0aec0 !important; }
          /* Ensure visado table can shrink on print */
          .visado-table { min-width: 0 !important; width: auto !important; display: inline-table; }
        }
      </style>
    </head>
    <body>
      <button class="btn-print no-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
  `;

  const headerHTML = `
    <div class="page-wrap">
      <div class="inst-header">
        <img class="inst-logo" src="/images/unesum-logo-official.png" alt="UNESUM" onerror="this.style.display='none'"/>
        <div class="inst-text">
          <div class="uni">UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ</div>
          <div class="fundacion">Creada mediante registro Oficial 261 del 7 de febrero del 2001</div>
          <div class="prog">PROGRAMA ANALÍTICO</div>
        </div>
      </div>
  `;

  let contentHTML = '';
  let openedAvoidDiv = false;

  for (const tab of tabs) {
    if (!tab.rows || tab.rows.length === 0) continue;
    if (tab.title.trim().toUpperCase() === 'VISADO') continue;
    let displayTitle = tab.title.replace(/secci[óo]n\s*/gi, '').trim();
    if (/^\d+$/.test(displayTitle)) {
      displayTitle = '';
    }
    const isBibliografia = tab.title.trim().toUpperCase().includes('BIBLIOGRAF') || tab.title.trim().toUpperCase().includes('FUENTES');
    
    if (isBibliografia && !openedAvoidDiv) {
      contentHTML += '<div class="avoid-break-together" style="page-break-inside: avoid; break-inside: avoid-page; width: 100%;">';
      openedAvoidDiv = true;
    }

    contentHTML += `<div class="section-title">${displayTitle ? esc(displayTitle) : '&nbsp;'}</div>`;
    contentHTML += '<table>';

    for (const row of tab.rows) {
      const visibleCells = row.cells.filter(c => (c.rowSpan ?? 1) > 0 && (c.colSpan ?? 1) > 0);
      if (visibleCells.length === 0) continue;

      contentHTML += '<tr>';
      for (let i = 0; i < visibleCells.length; i++) {
        const cell = visibleCells[i];
        const rs = cell.rowSpan || 1;
        const cs = cell.colSpan || 1;
        const isHeader = cell.isHeader;
        const isVert = (cell.textOrientation || (cell.styles as any)?.textOrientation) === 'vertical';
        const bg = (cell.backgroundColor || (cell.styles as any)?.backgroundColor);
        const color = (cell.textColor || (cell.styles as any)?.textColor);

        let styleAttr = 'min-height:24px;';
        if (bg) styleAttr += `background:${bg};`;
        if (color) styleAttr += `color:${color};`;

        let isNivelValue = false;
        if (i > 0) {
          const prevCellText = (visibleCells[i - 1].content || '').toUpperCase().trim();
          if (prevCellText === 'NIVEL') {
            isNivelValue = true;
          } else if (i > 1 && prevCellText === ':' && (visibleCells[i - 2].content || '').toUpperCase().trim() === 'NIVEL') {
            isNivelValue = true;
          }
        }
        if (isNivelValue) {
          styleAttr += 'text-align:center !important;';
        }

        let extraCls = '';
        const upperContent = (cell.content || '').toUpperCase();
        if (isHeader) {
          if (upperContent.includes('PERIODO') || upperContent.includes('ORDINARIO') || upperContent.includes('PAO')) {
            extraCls = ' cell-header-periodo';
          } else if (upperContent.includes('NIVEL')) {
            extraCls = ' cell-header-nivel';
          }
        }

        const cls = [isHeader ? 'cell-header' : '', isVert ? 'cell-vert' : ''].filter(Boolean).join(' ') + extraCls;

        contentHTML += `<td rowspan="${rs}" colspan="${cs}" class="${cls}"${styleAttr ? ` style="${styleAttr}"` : ''}>${esc(cell.content || '&nbsp;')}</td>`;
      }
      contentHTML += '</tr>';
    }

    contentHTML += '</table>';
  }
  // Sección VISADO
  const etapas: EtapaFirma[] = firmas?.etapas || [];

  // Extrae el prefijo de título académico del nombre (Ing., Lic., Dr., Mgs., PhD, etc.)
  const extraerTitulo = (nombre: string): { titulo: string; nombreSolo: string } => {
    const prefijos = /^(Ing\.|Lic\.|Dr\.|Dra\.|Mgs\.|Mg\.|MSc\.|M\.Sc\.|Ph\.D\.|PhD\.?|MSIG|Tec\.|Arq\.|Econ\.)\s*/i;
    const match = nombre.match(prefijos);
    if (match) {
      return { titulo: match[0].trim(), nombreSolo: nombre.slice(match[0].length).trim() };
    }
    return { titulo: '', nombreSolo: nombre };
  };

  contentHTML += '<div class="visado-section-container">';
  contentHTML += '<div class="visado-title">VISADO</div>';
  contentHTML += '<div class="visado-wrap"><table class="visado-table"><thead><tr>';
  for (const e of VISADO_ETAPAS) {
    contentHTML += `<th>${esc(ETAPA_LABELS[e] || e)}</th>`;
  }
  contentHTML += '</tr></thead><tbody><tr>';

  for (const e of VISADO_ETAPAS) {
    const etapa = etapas.find(x => x.etapa === e);
    if (etapa?.firmado && etapa.firma) {
      const qr = etapa.firma.qr_data_url || '';
      const nombreCompleto = etapa.firma.usuario_nombre || '';
      const { titulo, nombreSolo } = extraerTitulo(nombreCompleto);
      const fecha = etapa.firma.firmado_at ? new Date(etapa.firma.firmado_at).toLocaleDateString('es-EC') : '';
      contentHTML += '<td class="visado-td-firma">';
      // Título académico (Ing., Lic., etc.) — si no existe, línea para escribir
      if (titulo) {
        contentHTML += `<div class="firma-titulo">${esc(titulo)}</div>`;
      } else {
        contentHTML += '<div class="firma-titulo-blank">______________</div>';
      }
      // QR al centro
      if (qr) {
        contentHTML += `<img class="qr-img" src="${qr}" alt="QR"/>`;
      } else {
        contentHTML += '<div class="qr-placeholder">QR no disponible</div>';
      }
      // Nombre bajo el QR
      contentHTML += `<div class="firma-nombre">${esc(nombreSolo || nombreCompleto)}</div>`;
      if (fecha) contentHTML += `<div class="firma-fecha">${esc(fecha)}</div>`;
      contentHTML += '</td>';
    } else {
      contentHTML += '<td class="visado-td-firma">';
      contentHTML += '<div class="firma-titulo-blank">______________</div>';
      contentHTML += '<div class="qr-placeholder">Pendiente de firma</div>';
      contentHTML += '<div class="firma-nombre-blank">______________________________</div>';
      contentHTML += '</td>';
    }
  }

  contentHTML += '</tr></tbody></table></div></div>';

  if (openedAvoidDiv) {
    contentHTML += '</div>';
  }

  const tFooter = `</div></body></html>`;
  return tHeader + headerHTML + contentHTML + tFooter;
}
// Componente principal
export function PrintProgramaAnalitico({
  programaData,
  asignaturaNombre = '',
  periodoNombre = '',
  docenteNombre = '',
  nivelNombre = '',
  firmasData,
  programa_comision_id,
  apiUrl,
  token,
  buttonLabel = 'Imprimir / PDF',
  buttonClassName = '',
}: Props) {
  const handlePrint = async () => {
    if (!programaData) {
      alert('No hay datos del programa analítico para imprimir.');
      return;
    }

    const tabs = normalizarATabs(programaData);
    if (tabs.length === 0) {
      alert('El programa analítico no tiene secciones con datos para imprimir.');
      return;
    }

    const asignatura = asignaturaNombre
      || programaData.datos_generales?.asignatura
      || programaData.metadata?.subject
      || programaData.name
      || programaData.nombre
      || '';
    let periodo = periodoNombre
      || programaData.datos_generales?.periodo_academico
      || programaData.metadata?.period
      || '';
    periodo = periodo.replace(/Primer\s+Periodo\s*/gi, '').trim();
    const docente = docenteNombre || programaData.datos_generales?.docente || '';
    const nivel = formatearNivelOrdinal(nivelNombre || programaData.datos_generales?.nivel || programaData.metadata?.level || '');

    // Auto-llenar celdas vacias junto a etiquetas conocidas (ASIGNATURA, PERIODO, DOCENTE)
    const autoFilledTabs = tabs.map(tab => ({
      ...tab,
      rows: tab.rows.map(row => {
        const cells = row.cells.map(c => ({ ...c }));
        for (let i = 1; i < cells.length; i++) {
          const label = (cells[i - 1].content || '').toUpperCase().trim();
          if (label === 'NIVEL') {
            const currentVal = cells[i].content?.trim() || nivel;
            if (currentVal) {
              cells[i] = { ...cells[i], content: formatearNivelOrdinal(currentVal) };
            }
          } else if (!cells[i].content?.trim()) { // solo si está vacío para otras etiquetas
            if (label.includes('ASIGNATURA') && asignatura)
              cells[i] = { ...cells[i], content: asignatura };
            else if ((label.includes('PERIODO') || label.includes('PAO')) && periodo)
              cells[i] = { ...cells[i], content: periodo };
            else if (label === 'DOCENTE' && docente)
              cells[i] = { ...cells[i], content: docente };
          }
        }
        return { ...row, cells };
      }),
    }));

    // Obtener firmas: prop o fetch automático
    let firmas = firmasData || null;
    if (!firmas && programa_comision_id) {
      try {
        const base = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${base}/firmas/programa_analitico/${programa_comision_id}`, { headers });
        const json = await res.json();
        if (json.success) firmas = json.data;
      } catch { /* firmas no disponibles */ }
    }

    const html = generarHTML(autoFilledTabs, asignatura, periodo, docente, firmas);

    const win = window.open('', '_blank', 'width=1280,height=900,scrollbars=yes');
    if (!win) {
      alert('No se pudo abrir la ventana de impresión. Permite ventanas emergentes e intenta de nuevo.');
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();

    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    };
  };

  return (
    <Button
      onClick={handlePrint}
      variant="outline"
      disabled={!programaData}
      className={`gap-2 ${buttonClassName}`}
    >
      <Printer className="h-4 w-4" />
      {buttonLabel}
    </Button>
  );
}
