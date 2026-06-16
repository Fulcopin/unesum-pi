"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { MainHeader } from "@/components/layout/main-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, Loader2, Lock, Unlock, FileDown, CheckCircle2, AlertCircle, Check, X, Home, Printer } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { FirmasPanel } from "@/components/firmas/firmas-panel"
import Link from "next/link"


// --- INTERFACES ---
interface TableCell {
  id: string; content: string; isHeader: boolean; rowSpan: number; colSpan: number;
  isEditable: boolean; isLocked?: boolean; backgroundColor?: string; textColor?: string; fontSize?: string;
  fontWeight?: string; textAlign?: string; textOrientation?: 'horizontal' | 'vertical'; fontFamily?: string;
}
interface TableRow { id: string; cells: TableCell[]; }
interface TabData { id: string; title: string; rows: TableRow[]; }
interface SyllabusData {
  id?: string | number; name?: string; description?: string; tabs: TabData[];
  metadata?: { subject?: string; period?: string; level?: string; createdAt: string; updatedAt: string; };
  version?: string;
}

// Campos que el docente PUEDE editar en el syllabus
const DOCENTE_EDITABLE_LABELS = [
  "PARALELO", "PARALELOS", "PARALELO/S",
  "HORARIO DE CLASES", "HORARIO DE CLASE", "HORARIO CLASES",
  "HORARIO PARA TUTORÍAS", "HORARIO TUTORÍAS", "HORARIO TUTORIAS", "HORARIO PARA TUTORIAS",
  "PERFIL DEL PROFESOR", "PERFIL PROFESOR", "PERFIL DOCENTE", "PROFESOR",
  "HD. PRESENCIAL", "HD PRESENCIAL", "HORAS PRESENCIAL",
  "HD. SINCRÓNICA", "HD SINCRONICA", "HD. SINCRONICA", "HORAS SINCRONICA",
  "PFAE", "PRÁCTICAS DE APLICACIÓN",
  "TA", "TRABAJO AUTÓNOMO",
  "METODOLOGÍAS DE ENSEÑANZA-APRENDIZAJE A APLICAR", "METODOLOGÍAS", "METODOLOGIA", "METODOLOGÍAS DE ENSEÑANZA",
  "RECURSOS DIDÁCTICOS", "RECURSOS DIDACTICOS", "RECURSOS",
  "ESCENARIO DE APRENDIZAJE", "ESCENARIO", "ESCENARIOS DE APRENDIZAJE",
  "BIBLIOGRAFÍAS/FUENTES DE CONSULTA", "BIBLIOGRAFÍA", "BIBLIOGRAFIA", "BIBLIOGRAFIAS", "FUENTES DE CONSULTA",
  "FECHA/PARALELO", "FECHA", "FECHA / PARALELO",
  "CRITERIOS DE EVALUACIÓN", "CRITERIOS EVALUACION", "CRITERIOS DE EVALUACION",
  "INSTRUMENTOS DE EVALUACIÓN", "INSTRUMENTOS EVALUACION", "INSTRUMENTOS DE EVALUACION",
  "CONTENIDOS", "CONTENIDO",
]

// Headers de columnas editables (para tablas con headers)
const DOCENTE_EDITABLE_HEADERS = [
  "HD. PRESENCIAL", "HD PRESENCIAL",
  "HD. SINCRÓNICA", "HD SINCRONICA", "HD. SINCRONICA",
  "PFAE", "TA",
  "METODOLOGÍAS DE ENSEÑANZA-APRENDIZAJE A APLICAR", "METODOLOGÍAS",
  "RECURSOS DIDÁCTICOS", "RECURSOS",
  "ESCENARIO DE APRENDIZAJE", "ESCENARIO",
  "BIBLIOGRAFÍAS/FUENTES DE CONSULTA", "BIBLIOGRAFÍA",
  "FECHA/PARALELO", "FECHA",
  "CRITERIOS DE EVALUACIÓN", "CRITERIOS",
  "INSTRUMENTOS DE EVALUACIÓN", "INSTRUMENTOS",
  "CONTENIDOS", "CONTENIDO",
]

export default function DocenteEditorSyllabusPage() {
  const { token, getToken, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [modalCell, setModalCell] = useState<{id: string, content: string, isEditable: boolean} | null>(null)
  const [periodos, setPeriodos] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("")
  const [profesorInfo, setProfesorInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [syllabus_comision_id, setSyllabusComisionId] = useState<number | null>(null)
  const [hasDocenteVersion, setHasDocenteVersion] = useState(false)
  const [asignaturasDisponibles, setAsignaturasDisponibles] = useState<any[]>([])
  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<string>('')
  const [periodoAutoSyncMsg, setPeriodoAutoSyncMsg] = useState<string | null>(null)
  const isAutoSyncingPeriod = useRef(false)
  // Mapa de celdas bloqueadas por la comisión (cellId → true)
  const [lockedCells, setLockedCells] = useState<Record<string, boolean>>({})
  const [horasValidation, setHorasValidation] = useState<{ valid: boolean, message: string | null, details: any[] }>({ valid: true, message: null, details: [] });

  // ─── Función auxiliar: calcular sumas de horas por tipo de columna en la pestaña Estructura ───
  const calcColumnSums = (data: SyllabusData | null): Record<string, number> => {
    if (!data) return {};
    const sums: Record<string, number> = { presencial: 0, sincronica: 0, pfae: 0, ta: 0, vinc: 0, ppp: 0 };
    const tabEst = data.tabs.find(t => t.title.toUpperCase().includes('ESTRUCTURA')) ||
      data.tabs.find(t => ['ASIGNATURA', 'CONTENIDO', 'UNIDAD'].some(k => t.title.toUpperCase().includes(k)) && !t.title.toUpperCase().includes('DATOS') && !t.title.toUpperCase().includes('GENERAL'));
    if (!tabEst || !tabEst.rows) return sums;

    const visualColMap = new Map<string, number>();
    const grid: boolean[][] = Array(tabEst.rows.length).fill(null).map(() => []);
    tabEst.rows.forEach((r, rIdx) => {
      let col = 0;
      r.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).forEach(c => {
        while (grid[rIdx][col]) col++;
        visualColMap.set(c.id, col);
        for (let i = 0; i < (c.rowSpan || 1); i++) {
          for (let j = 0; j < (c.colSpan || 1); j++) {
            if (rIdx + i < grid.length) grid[rIdx + i][col + j] = true;
          }
        }
        col += (c.colSpan || 1);
      });
    });

    // Mapear columna → tipo de hora (con soporte de colSpan)
    const colMap: Record<number, string> = {};
    let hRowIndex = -1;
    for (let r = 0; r < Math.min(6, tabEst.rows.length); r++) {
      const row = tabEst.rows[r];

      const numberCells = row.cells.filter(c => {
        const val = parseInt((c.content || '').trim(), 10);
        return !isNaN(val) && val > 0;
      });
      if (numberCells.length >= 2 && r > 0) {
        break; // Llegamos a las filas de datos
      }

      let foundInRow = false;
      for (const c of row.cells) {
        const t = c.content.toUpperCase().trim();
        const span = c.colSpan || 1;
        let tipo = '';
        if (t.includes('PRESENCIAL')) tipo = 'presencial';
        else if (t.includes('SINCRÓN') || t.includes('SINCRONIC')) tipo = 'sincronica';
        else if (t.includes('PFAE') || t.includes('APLICACIÓN') || t.includes('EXPERIMENTAC')) tipo = 'pfae';
        else if ((t === 'TA' || t.includes('AUTÓNOM') || t.includes('AUTONOM')) && !t.includes('PRESENCIAL') && !t.includes('SINCRÓN')) tipo = 'ta';
        else if (t.includes('VINCULAC')) tipo = 'vinc';
        else if (t.includes('PPP') || t.includes('PREPROFES')) tipo = 'ppp';
        
        if (tipo) {
          const visualCol = visualColMap.get(c.id) ?? 0;
          for (let s = 0; s < span; s++) { colMap[visualCol + s] = tipo; }
          foundInRow = true;
        }
      }
      if (foundInRow) {
        hRowIndex = Math.max(hRowIndex, r);
      }
    }

    // Sumar valores de cada fila de datos (excluir cabeceras y fila de totales)
    tabEst.rows.forEach((row, rIdx) => {
      if (rIdx <= hRowIndex) return;
      const firstCellText = (row.cells[0]?.content || '').toUpperCase().trim();
      if (firstCellText.includes('TOTAL')) return; // saltar fila de totales
      for (const c of row.cells) {
        const span = c.colSpan || 1;
        const val = parseInt((c.content || '').trim(), 10);
        if (!isNaN(val) && val > 0) {
          const visualCol = visualColMap.get(c.id) ?? 0;
          for (let s = 0; s < span; s++) {
            const tipo = colMap[visualCol + s];
            if (tipo && tipo in sums) sums[tipo] += val;
          }
        }
      }
    });
    return sums;
  };

  // ─── Función auxiliar: leer objetivos de horas desde pestaña General/Datos ───
  const readHorasObjetivos = (data: SyllabusData | null): Record<string, number> => {
    const obj: Record<string, number> = { total: 0, presencial: 0, sincronica: 0, pfae: 0, ta: 0, vinc: 0, ppp: 0 };
    if (!data) return obj;
    const tabGen = data.tabs.find(t =>
      ['GENERAL', 'DATOS', 'INFORMACIÓN', 'INFORMACION', 'ESPECÍFICO', 'ESPECIFICO'].some(k => t.title.toUpperCase().includes(k))
    );
    if (!tabGen) return obj;

    tabGen.rows.forEach(row => {
      // Buscar en cada celda la etiqueta, y tomar el siguiente valor numérico
      row.cells.forEach((cell, i) => {
        const text = cell.content.toUpperCase().trim();
        let key = '';
        if (text.includes('TOTAL DE HORAS') || (text.includes('TOTAL') && text.includes('HORAS') && text.includes('CRÉDITO'))) key = 'total';
        else if (text.includes('PRESENCIAL') || text.includes('SINCRÓNICA') || text.includes('SINCRONICA')) key = 'presencial';
        else if (text.includes('PFAE') || (text.includes('APLICACIÓN') && text.includes('EXPERIMENTAC'))) key = 'pfae';
        else if (text.includes('TRABAJO AUTÓNOMO') || text.includes('TRABAJO AUTONOMO') || (text.includes('TA') && text.length < 5)) key = 'ta';
        else if (text.includes('VINCULAC')) key = 'vinc';
        else if (text.includes('PPP') || text.includes('PREPROFES')) key = 'ppp';

        if (key) {
          // Buscar número en la misma celda primero
          const m = cell.content.match(/\d+/);
          if (m) { obj[key] = parseInt(m[0], 10); }
          else {
            // Buscar en las celdas siguientes de la misma fila
            for (let j = i + 1; j < row.cells.length; j++) {
              const m2 = row.cells[j].content.match(/\d+/);
              if (m2) { obj[key] = parseInt(m2[0], 10); break; }
            }
          }
        }
      });
    });
    return obj;
  };

  useEffect(() => {
    if (!syllabusData) return;

    const sums = calcColumnSums(syllabusData);
    const objetivos = readHorasObjetivos(syllabusData);

    // Consolidar: presencial + sincronica = docencia total
    const docenciaSum = sums.presencial + sums.sincronica;
    const totalSum = docenciaSum + sums.pfae + sums.ta + sums.vinc + sums.ppp;
    const docenciaObj = objetivos.presencial || objetivos.sincronica || 0;

    type ColResult = { label: string; sum: number; target: number; ok: boolean | null };
    const cols: ColResult[] = [
      { label: 'HD. Presencial/Sincrónica', sum: docenciaSum, target: docenciaObj, ok: docenciaObj > 0 ? docenciaSum === docenciaObj : null },
      { label: 'PFAE', sum: sums.pfae, target: objetivos.pfae, ok: objetivos.pfae > 0 ? sums.pfae === objetivos.pfae : null },
      { label: 'Trabajo Autónomo (TA)', sum: sums.ta, target: objetivos.ta, ok: objetivos.ta > 0 ? sums.ta === objetivos.ta : null },
    ];
    if (sums.vinc > 0 || objetivos.vinc > 0)
      cols.push({ label: 'Vinculación', sum: sums.vinc, target: objetivos.vinc, ok: objetivos.vinc > 0 ? sums.vinc === objetivos.vinc : null });
    if (sums.ppp > 0 || objetivos.ppp > 0)
      cols.push({ label: 'PPP', sum: sums.ppp, target: objetivos.ppp, ok: objetivos.ppp > 0 ? sums.ppp === objetivos.ppp : null });

    const hasTargets = cols.some(c => c.target > 0);
    const hasSums = cols.some(c => c.sum > 0);
    const allOk = cols.every(c => c.ok !== false);
    const anyError = cols.some(c => c.ok === false);

    let message: string | null = null;
    if (hasSums && hasTargets) {
      if (anyError) {
        const errMsgs = cols
          .filter(c => c.ok === false)
          .map(c => `${c.label}: suma=${c.sum}h ≠ declarado=${c.target}h`);
        message = `❌ Error en horas: ${errMsgs.join(' | ')}`;
      } else if (allOk) {
        message = `✅ Horas correctas — Total: ${totalSum}h`;
      }
    } else if (hasSums && !hasTargets) {
      message = `ℹ️ Suma actual: Docencia=${docenciaSum}h, PFAE=${sums.pfae}h, TA=${sums.ta}h — Total=${totalSum}h`;
    }

    setHorasValidation({
      valid: !anyError,
      message,
      details: cols.map(c => ({
        label: c.label,
        total: c.sum,
        target: c.target,
        ok: c.ok,
        sums,
        totalSum,
      }))
    });
  }, [syllabusData]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const authToken = getToken() || token
    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, ...options.headers }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
    return data
  }

  const getCellPositionKey = (tabIndex: number, rowIndex: number, cellIndex: number) =>
    `${tabIndex}:${rowIndex}:${cellIndex}`

  const buildComisionLockState = (datos: any) => {
    const lockById: Record<string, boolean> = {}
    const lockByPosition: Record<string, boolean> = {}
    const tabs = Array.isArray(datos?.tabs)
      ? datos.tabs
      : Array.isArray(datos?.rows)
        ? [{ rows: datos.rows }]
        : []

    tabs.forEach((tab: any, tabIndex: number) => {
      ;(tab.rows || []).forEach((row: any, rowIndex: number) => {
        ;(row.cells || []).forEach((cell: any, cellIndex: number) => {
          const locked = !!cell.isLocked
          if (cell.id) lockById[cell.id] = locked
          lockByPosition[getCellPositionKey(tabIndex, rowIndex, cellIndex)] = locked
        })
      })
    })

    return { lockById, lockByPosition }
  }

  const applyComisionLocks = (
    datos: any,
    comisionDatos: any,
    lockState: { lockById: Record<string, boolean>; lockByPosition: Record<string, boolean> }
  ) => {
    if (Array.isArray(datos?.tabs) && Array.isArray(comisionDatos?.tabs)) {
      return {
        ...datos,
        tabs: datos.tabs.map((tab: any, tabIndex: number) => {
          const comisionTab = comisionDatos.tabs[tabIndex] || comisionDatos.tabs.find((t: any) => t.title === tab.title);
          return {
            ...tab,
            rows: (tab.rows || []).map((row: any, rowIndex: number) => {
              const comisionRow = comisionTab?.rows?.[rowIndex];
              return {
                ...row,
                cells: (row.cells || []).map((cell: any, cellIndex: number) => {
                  const comisionCell = comisionRow?.cells?.[cellIndex] || {};
                  const positionKey = getCellPositionKey(tabIndex, rowIndex, cellIndex)
                  const locked = cell.id in lockState.lockById
                    ? lockState.lockById[cell.id]
                    : (lockState.lockByPosition[positionKey] ?? false)

                  // Check if this cell is editable by teacher using comisionCell to respect explicit comision overrides
                  const mergedCellForPerms = { ...cell, ...comisionCell, id: cell.id };
                  const editable = isDocenteEditable(mergedCellForPerms, rowIndex, cellIndex, tab.rows, lockState.lockById) && !locked;
                  
                  let content = cell.content;
                  if (!editable) {
                    let comisionContent = comisionRow?.cells?.[cellIndex]?.content;

                    // FIX: Recuperar horas reales desde comisión o calcular suma de componentes
                    const rowLabelText = (row.cells[0]?.content || '').trim().toUpperCase();
                    const isTotalAsignaturaRow = rowLabelText.includes('TOTAL HORAS DE LA ASIGNATURA') || rowLabelText.includes('TOTAL HORAS ASIGNATURA');
                    const isHorasComponenteRow = rowLabelText.includes('HORAS DE LA ASIGNATURA') || 
                                                  rowLabelText.includes('DOCENCIA') ||
                                                  rowLabelText.includes('PRÁCTIC') ||
                                                  rowLabelText.includes('PRACTIC') ||
                                                  rowLabelText.includes('AUTÓNOM') ||
                                                  rowLabelText.includes('AUTONOM') ||
                                                  rowLabelText.includes('VINCULACI');
                    const isTotalHorasRow = isTotalAsignaturaRow || isHorasComponenteRow;

                    // Caso especial: Total horas de la asignatura = suma de Total horas por componente
                    if (cellIndex > 0 && isTotalAsignaturaRow) {
                      let sumFromComponentes = 0;
                      
                      // Primero buscar en el MISMO tab (tab.rows) — donde siempre está la fila componente
                      for (const dr of (tab.rows || [])) {
                        const lbl = (dr.cells?.[0]?.content || '').trim().toUpperCase();
                        if (lbl.includes('TOTAL HORAS POR COMPONENTE') || lbl.includes('TOTAL HORA POR COMPONENTE')) {
                          for (let ci = 1; ci < dr.cells.length; ci++) {
                            const v = parseInt((dr.cells[ci]?.content || '').trim(), 10);
                            if (!isNaN(v) && v > 0) sumFromComponentes += v;
                          }
                          break;
                        }
                      }
                      
                      // Fallback: buscar en todos los tabs de datos
                      if (sumFromComponentes === 0 && datos?.tabs) {
                        for (const t of datos.tabs) {
                          for (const dr of (t.rows || [])) {
                            const lbl = (dr.cells?.[0]?.content || '').trim().toUpperCase();
                            if (lbl.includes('TOTAL HORAS POR COMPONENTE') || lbl.includes('TOTAL HORA POR COMPONENTE')) {
                              for (let ci = 1; ci < dr.cells.length; ci++) {
                                const v = parseInt((dr.cells[ci]?.content || '').trim(), 10);
                                if (!isNaN(v) && v > 0) sumFromComponentes += v;
                              }
                              break;
                            }
                          }
                          if (sumFromComponentes > 0) break;
                        }
                      }
                      
                      // Fallback: buscar en comisionDatos
                      if (sumFromComponentes === 0) {
                        const comRows: any[] = [];
                        if (comisionDatos?.tabs) comisionDatos.tabs.forEach((t:any) => (t.rows||[]).forEach((r:any) => comRows.push(r)));
                        else if (comisionDatos?.rows) comisionDatos.rows.forEach((r:any) => comRows.push(r));
                        for (const cr of comRows) {
                          const lbl = (cr.cells?.[0]?.content || '').trim().toUpperCase();
                          if (lbl.includes('TOTAL HORAS POR COMPONENTE') || lbl.includes('TOTAL HORA POR COMPONENTE')) {
                            for (let ci = 1; ci < cr.cells.length; ci++) {
                              const v = parseInt((cr.cells[ci]?.content || '').trim(), 10);
                              if (!isNaN(v) && v > 0) sumFromComponentes += v;
                            }
                            break;
                          }
                          const cLbl = (cr.cells?.[0]?.content || '').trim().toUpperCase();
                          if (cLbl.includes('TOTAL HORAS DE LA ASIGNATURA') || cLbl.includes('TOTAL HORAS ASIGNATURA')) {
                            for (let ci = 1; ci < cr.cells.length; ci++) {
                              const v = parseInt((cr.cells[ci]?.content || '').trim(), 10);
                              if (!isNaN(v) && v > 0) { sumFromComponentes = v; break; }
                            }
                          }
                        }
                      }
                      
                      // Forzar el valor calculado (incluso si comision tiene 0)
                      if (sumFromComponentes > 0) {
                        content = sumFromComponentes.toString();
                        return { ...cell, content, isLocked: locked };
                      }
                    } else if (cellIndex > 0 && isTotalHorasRow) {
                      // 1. Buscar en formato de tabs
                      if (comisionDatos.tabs) {
                        for (const t of comisionDatos.tabs) {
                          for (const cr of t.rows || []) {
                            const cIsTotalHorasRow = cr.cells.some((c:any) => {
                              const text = (c.content || '').trim().toUpperCase();
                              return text.includes('HORAS DE LA ASIGNATURA') || 
                                     text.includes('HORAS ASIGNATURA') ||
                                     text.includes('DOCENCIA') ||
                                     text.includes('PRÁCTIC') ||
                                     text.includes('PRACTIC') ||
                                     text.includes('AUTÓNOM') ||
                                     text.includes('AUTONOM') ||
                                     text.includes('VINCULACI');
                            });
                            
                            if (cIsTotalHorasRow) {
                              const cVal = cr.cells.find((c:any, idx:number) => {
                                if (idx === 0) return false;
                                const text = (c.content || '').trim().toUpperCase();
                                return text !== '' && text !== '0' && text !== ':' && 
                                       !text.includes('HORAS') && 
                                       !text.includes('DOCENCIA') && 
                                       !text.includes('PRÁCTIC') && 
                                       !text.includes('PRACTIC') && 
                                       !text.includes('AUTÓNOM') && 
                                       !text.includes('AUTONOM') && 
                                       !text.includes('VINCULACI');
                              });
                              if (cVal) comisionContent = cVal.content;
                            }
                          }
                        }
                      } 
                      // 2. Buscar en formato de rows simples
                      else if (comisionDatos.rows) {
                        for (const cr of comisionDatos.rows) {
                          const cIsTotalHorasRow = cr.cells.some((c:any) => {
                            const text = (c.content || '').trim().toUpperCase();
                            return text.includes('HORAS DE LA ASIGNATURA') || 
                                   text.includes('HORAS ASIGNATURA') ||
                                   text.includes('DOCENCIA') ||
                                   text.includes('PRÁCTIC') ||
                                   text.includes('PRACTIC') ||
                                   text.includes('AUTÓNOM') ||
                                   text.includes('AUTONOM') ||
                                   text.includes('VINCULACI');
                          });
                          
                          if (cIsTotalHorasRow) {
                            const cVal = cr.cells.find((c:any, idx:number) => {
                              if (idx === 0) return false;
                              const text = (c.content || '').trim().toUpperCase();
                              return text !== '' && text !== '0' && text !== ':' && 
                                     !text.includes('HORAS') && 
                                     !text.includes('DOCENCIA') && 
                                     !text.includes('PRÁCTIC') && 
                                     !text.includes('PRACTIC') && 
                                     !text.includes('AUTÓNOM') && 
                                     !text.includes('AUTONOM') && 
                                     !text.includes('VINCULACI');
                            });
                            if (cVal) comisionContent = cVal.content;
                          }
                        }
                      }
                      // 3. Buscar en formato contenido (Documentos Word extraídos vía Mammoth)
                      else if (comisionDatos.contenido) {
                        for (const key of Object.keys(comisionDatos.contenido)) {
                          const kNorm = key.trim().toUpperCase();
                          const rText = row.cells[0]?.content?.trim()?.toUpperCase() || '';
                          
                          if (rText && (kNorm.includes(rText) || rText.includes(kNorm))) {
                            const val = comisionDatos.contenido[key];
                            if (val && val.toString().trim() !== '' && val.toString().trim() !== '0' && val.toString().trim() !== ':') {
                              comisionContent = val;
                              break;
                            }
                          }
                        }
                      }
                    }

                    if (comisionContent !== undefined && comisionContent !== null && comisionContent.toString().trim() !== '' && comisionContent.toString().trim() !== '0') {
                      content = comisionContent;
                    }
                  }

                  return { ...cell, content, isLocked: locked }
                })
              };
            })
          };
        })
      }
    }

    if (Array.isArray(datos?.rows) && Array.isArray(comisionDatos?.rows)) {
      return {
        ...datos,
        rows: (datos.rows || []).map((row: any, rowIndex: number) => {
          const comisionRow = comisionDatos.rows[rowIndex];
          return {
            ...row,
            cells: (row.cells || []).map((cell: any, cellIndex: number) => {
              const comisionCell = comisionRow?.cells?.[cellIndex] || {};
              const positionKey = getCellPositionKey(0, rowIndex, cellIndex)
              const locked = cell.id in lockState.lockById
                ? lockState.lockById[cell.id]
                : (lockState.lockByPosition[positionKey] ?? false)

              const mergedCellForPerms = { ...cell, ...comisionCell, id: cell.id };
              const editable = isDocenteEditable(mergedCellForPerms, rowIndex, cellIndex, datos.rows, lockState.lockById) && !locked;

              let content = cell.content;
              if (!editable) {
                let comisionContent = comisionRow?.cells?.[cellIndex]?.content;

                // FIX: Recuperar horas reales o calcular suma de componentes
                const rowLabelText2 = (row.cells[0]?.content || '').trim().toUpperCase();
                const isTotalAsignaturaRow2 = rowLabelText2.includes('TOTAL HORAS DE LA ASIGNATURA') || rowLabelText2.includes('TOTAL HORAS ASIGNATURA');
                const isHorasComponenteRow2 = rowLabelText2.includes('HORAS DE LA ASIGNATURA') ||
                                              rowLabelText2.includes('DOCENCIA') ||
                                              rowLabelText2.includes('PRÁCTIC') ||
                                              rowLabelText2.includes('PRACTIC') ||
                                              rowLabelText2.includes('AUTÓNOM') ||
                                              rowLabelText2.includes('AUTONOM') ||
                                              rowLabelText2.includes('VINCULACI');
                const isTotalHorasRow = isTotalAsignaturaRow2 || isHorasComponenteRow2;

                // Caso especial: Total horas de la asignatura = suma de Total horas por componente
                if (cellIndex > 0 && isTotalAsignaturaRow2) {
                  let sumFromComponentes = 0;
                  for (const dr of (datos.rows || [])) {
                    const lbl = (dr.cells?.[0]?.content || '').trim().toUpperCase();
                    if (lbl.includes('TOTAL HORAS POR COMPONENTE') || lbl.includes('TOTAL HORA POR COMPONENTE')) {
                      for (let ci = 1; ci < dr.cells.length; ci++) {
                        const v = parseInt((dr.cells[ci]?.content || '').trim(), 10);
                        if (!isNaN(v) && v > 0) sumFromComponentes += v;
                      }
                      break;
                    }
                  }
                  if (sumFromComponentes === 0) {
                    for (const cr of (comisionDatos.rows || [])) {
                      const lbl = (cr.cells?.[0]?.content || '').trim().toUpperCase();
                      if (lbl.includes('TOTAL HORAS POR COMPONENTE') || lbl.includes('TOTAL HORA POR COMPONENTE')) {
                        for (let ci = 1; ci < cr.cells.length; ci++) {
                          const v = parseInt((cr.cells[ci]?.content || '').trim(), 10);
                          if (!isNaN(v) && v > 0) sumFromComponentes += v;
                        }
                        break;
                      }
                      const cLbl = (cr.cells?.[0]?.content || '').trim().toUpperCase();
                      if (cLbl.includes('TOTAL HORAS DE LA ASIGNATURA') || cLbl.includes('TOTAL HORAS ASIGNATURA')) {
                        for (let ci = 1; ci < cr.cells.length; ci++) {
                          const v = parseInt((cr.cells[ci]?.content || '').trim(), 10);
                          if (!isNaN(v) && v > 0) { sumFromComponentes = v; break; }
                        }
                      }
                    }
                  }
                  if (sumFromComponentes > 0) comisionContent = sumFromComponentes.toString();
                } else if (cellIndex > 0 && isTotalHorasRow) {
                  // 1. Buscar en formato de rows simples
                  if (comisionDatos.rows) {
                    for (const cr of comisionDatos.rows) {
                      const cIsTotalHorasRow = cr.cells.some((c:any) => {
                        const text = (c.content || '').trim().toUpperCase();
                        return text.includes('HORAS DE LA ASIGNATURA') || 
                               text.includes('HORAS ASIGNATURA') ||
                               text.includes('DOCENCIA') ||
                               text.includes('PRÁCTIC') ||
                               text.includes('PRACTIC') ||
                               text.includes('AUTÓNOM') ||
                               text.includes('AUTONOM') ||
                               text.includes('VINCULACI');
                      });

                      if (cIsTotalHorasRow) {
                        const cVal = cr.cells.find((c:any, idx:number) => {
                          if (idx === 0) return false;
                          const text = (c.content || '').trim().toUpperCase();
                          return text !== '' && text !== '0' && text !== ':' && 
                                 !text.includes('HORAS') && 
                                 !text.includes('DOCENCIA') && 
                                 !text.includes('PRÁCTIC') && 
                                 !text.includes('PRACTIC') && 
                                 !text.includes('AUTÓNOM') && 
                                 !text.includes('AUTONOM') && 
                                 !text.includes('VINCULACI');
                        });
                        if (cVal) comisionContent = cVal.content;
                      }
                    }
                  }
                  // 2. Buscar en formato de tabs (raro aquí, pero por si acaso)
                  else if (comisionDatos.tabs) {
                    for (const t of comisionDatos.tabs) {
                      for (const cr of t.rows || []) {
                        const cIsTotalHorasRow = cr.cells.some((c:any) => {
                          const text = (c.content || '').trim().toUpperCase();
                          return text.includes('HORAS DE LA ASIGNATURA') || 
                                 text.includes('HORAS ASIGNATURA') ||
                                 text.includes('DOCENCIA') ||
                                 text.includes('PRÁCTIC') ||
                                 text.includes('PRACTIC') ||
                                 text.includes('AUTÓNOM') ||
                                 text.includes('AUTONOM') ||
                                 text.includes('VINCULACI');
                        });
                        
                        if (cIsTotalHorasRow) {
                          const cVal = cr.cells.find((c:any, idx:number) => {
                            if (idx === 0) return false;
                            const text = (c.content || '').trim().toUpperCase();
                            return text !== '' && text !== '0' && text !== ':' && 
                                   !text.includes('HORAS') && 
                                   !text.includes('DOCENCIA') && 
                                   !text.includes('PRÁCTIC') && 
                                   !text.includes('PRACTIC') && 
                                   !text.includes('AUTÓNOM') && 
                                   !text.includes('AUTONOM') && 
                                   !text.includes('VINCULACI');
                          });
                          if (cVal) comisionContent = cVal.content;
                        }
                      }
                    }
                  }
                  // 3. Buscar en formato contenido (Documentos Word extraídos vía Mammoth)
                  else if (comisionDatos.contenido) {
                    for (const key of Object.keys(comisionDatos.contenido)) {
                      const kNorm = key.trim().toUpperCase();
                      const rText = row.cells[0]?.content?.trim()?.toUpperCase() || '';
                      
                      if (rText && (kNorm.includes(rText) || rText.includes(kNorm))) {
                        const val = comisionDatos.contenido[key];
                        if (val && val.toString().trim() !== '' && val.toString().trim() !== '0' && val.toString().trim() !== ':') {
                          comisionContent = val;
                          break;
                        }
                      }
                    }
                  }
                }

                if (comisionContent !== undefined && comisionContent !== null && comisionContent.toString().trim() !== '' && comisionContent.toString().trim() !== '0') {
                  content = comisionContent;
                }
              }

              return { ...cell, ...comisionCell, id: cell.id, content, isLocked: locked }
            })
          };
        })
      }
    }

    return datos
  }

  // Cargar periodos
  useEffect(() => {
    const loadPeriodos = async () => {
      try {
        const res = await apiRequest('/periodo')
        const data = Array.isArray(res) ? res : (res.data || [])
        setPeriodos(data)
        if (data.length > 0) {
          let initialPeriod = String(data[0].id)
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const paramPeriod = params.get('periodo');
            if (paramPeriod) {
              const matched = data.find((x: any) => String(x.id) === String(paramPeriod) || String(x.nombre) === String(paramPeriod));
              if (matched) initialPeriod = String(matched.id);
            }
          }
          setSelectedPeriod(initialPeriod)
        }
      } catch (e) { console.error('Error cargando periodos:', e) }
    }
    loadPeriodos()
  }, [])

  // Cargar info del profesor
  useEffect(() => {
    const loadProfesor = async () => {
      try {
        const res = await apiRequest('/docente-editor/mi-info')
        if (res.success) {
          setProfesorInfo(res.data)
          
          // Construir lista de asignaturas disponibles (directa + M2M)
          const asigs: any[] = []
          if (res.data.asignatura) {
            asigs.push(res.data.asignatura)
          }
          if (res.data.asignaturas && Array.isArray(res.data.asignaturas)) {
            for (const a of res.data.asignaturas) {
              if (!asigs.find((x: any) => x.id === a.id)) {
                asigs.push(a)
              }
            }
          }
          setAsignaturasDisponibles(asigs)
          
          // Pre-seleccionar la primera asignatura (o la especificada en URL)
          let mainId = res.data.asignatura_id || res.data.asignatura?.id || (asigs.length > 0 ? asigs[0].id : null)
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const paramId = params.get('asignatura_id');
            if (paramId && asigs.some((x: any) => String(x.id) === String(paramId))) {
              mainId = paramId;
            }
          }
          if (mainId) setSelectedAsignaturaId(String(mainId))
        }
      } catch (e) { console.error('Error cargando info profesor:', e) }
    }
    loadProfesor()
  }, [])

  // Cargar syllabus cuando cambia el periodo o la asignatura seleccionada
  useEffect(() => {
    if (!selectedPeriod || !profesorInfo) return
    if (isAutoSyncingPeriod.current) return  // ignorar re-render causado por auto-sync de periodo
    loadSyllabus()
  }, [selectedPeriod, profesorInfo, selectedAsignaturaId])

  const loadSyllabus = async () => {
    setLoading(true)
    setError(null)
    setSyllabusData(null)
    setActiveTabId(null)
    setLockedCells({})

    const asignaturaId = selectedAsignaturaId || profesorInfo?.asignatura_id || profesorInfo?.asignatura?.id
    if (!asignaturaId) {
      setError("No tienes una asignatura asignada. Contacta al administrador para que te asignen una asignatura.")
      setLoading(false)
      return
    }

    try {
      // 1. Primero buscar si el docente ya tiene una versión guardada
      try {
        const docenteRes = await apiRequest(`/docente-editor/syllabus/mio?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
        if (docenteRes.success && docenteRes.data?.datos_syllabus) {
          let datos = docenteRes.data.datos_syllabus
          if (typeof datos === 'string') datos = JSON.parse(datos)

          let mergedDatos = datos
          let resolvedComisionId = docenteRes.data.syllabus_comision_id

          // La comisión es la fuente de verdad para bloquear y desbloquear.
          try {
            const comisionRes = await apiRequest(`/docente-editor/syllabus/comision?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
            if (comisionRes.success && comisionRes.data?.datos_syllabus) {
              let comisionDatos = comisionRes.data.datos_syllabus
              if (typeof comisionDatos === 'string') comisionDatos = JSON.parse(comisionDatos)

              const lockState = buildComisionLockState(comisionDatos)
              mergedDatos = applyComisionLocks(datos, comisionDatos, lockState)
              setLockedCells(lockState.lockById)
              resolvedComisionId = resolvedComisionId || comisionRes.data.id
            }
          } catch (e) {
            setLockedCells({})
          }

          processSyllabusData(mergedDatos)
          setSyllabusComisionId(resolvedComisionId)
          setHasDocenteVersion(true)

          setLoading(false)
          return
        }
      } catch (e) { 
        console.log('No hay versión propia del docente, buscando la de comisión...') 
      }

      // 2. Buscar syllabus de la comisión
      try {
        const comisionRes = await apiRequest(`/docente-editor/syllabus/comision?asignatura_id=${asignaturaId}&periodo=${selectedPeriod}`)
        if (comisionRes.success && comisionRes.data?.datos_syllabus) {
          let datos = comisionRes.data.datos_syllabus
          if (typeof datos === 'string') datos = JSON.parse(datos)

          const lockState = buildComisionLockState(datos)
          processSyllabusData(applyComisionLocks(datos, datos, lockState))
          setLockedCells(lockState.lockById)
          setSyllabusComisionId(comisionRes.data.id)
          setHasDocenteVersion(false)
          // Auto-sincronizar el selector de periodo con el periodo real del syllabus cargado
          const periodoCargado = comisionRes.data.periodo
          if (periodoCargado) {
            const matched = periodos.find((p: any) =>
              String(p.id) === String(periodoCargado) || p.nombre === periodoCargado
            )
            if (matched && String(matched.id) !== selectedPeriod) {
              isAutoSyncingPeriod.current = true
              setSelectedPeriod(String(matched.id))
              setPeriodoAutoSyncMsg(`Periodo ajustado a "${matched.nombre}" (periodo del syllabus subido para tu asignatura)`)
              setTimeout(() => { isAutoSyncingPeriod.current = false }, 200)
            } else {
              setPeriodoAutoSyncMsg(null)
            }
          }
          setLoading(false)
          return
        }
      } catch (e: any) {
        console.log('No se encontró syllabus de comisión:', e.message)
      }

      setError("La comisión académica aún no ha subido un syllabus para tu asignatura. Contacta a la comisión académica.")
    } catch (e: any) {
      setError(e.message || "Error al cargar syllabus")
    } finally {
      setLoading(false)
    }
  }

  const processSyllabusData = (datos: any) => {
    let parsed: SyllabusData

    // Función de deduplicación interna
    const deduplicateRows = (rows: any[]) => {
      const targetLabels = [
        'TOTAL HORAS DE LA ASIGNATURA',
        'TOTAL HORAS DE ASIGNATURA',
        'TOTAL HORAS ASIGNATURA'
      ];
      const processed: any[] = [];
      const seenLabels = new Set<string>();

      (rows || []).forEach((row: any) => {
        if (!row.cells || row.cells.length === 0) {
          processed.push(row);
          return;
        }

        // Buscar si alguna celda en la fila tiene una etiqueta de horas
        const labelCell = row.cells.find((c: any) => {
          const text = (c.content || '').trim().toUpperCase().replace(/:$/, '').trim();
          return targetLabels.includes(text);
        });

        if (labelCell) {
          const normLabel = (labelCell.content || '').trim().toUpperCase().replace(/:$/, '').trim();
          if (seenLabels.has(normLabel)) {
            // Ya existe esta fila de horas, fusionar valores
            const existingRow = processed.find(r => 
              r.cells.some((c: any) => ((c.content || '').trim().toUpperCase().replace(/:$/, '').trim()) === normLabel)
            );
            if (existingRow) {
              // Buscar el valor en la fila duplicada (cualquier celda index > 0 que no sea ":" y no esté vacía)
              const newValCell = row.cells.find((c: any, idx: number) => 
                idx > 0 && c.content?.trim() !== '' && c.content?.trim() !== ':'
              );
              if (newValCell && newValCell.content) {
                // Copiar el valor a la fila existente
                const targetValCell = existingRow.cells.find((c: any, idx: number) => 
                  idx > 0 && c.content?.trim() !== ':'
                );
                if (targetValCell && (!targetValCell.content?.trim() || targetValCell.content?.trim() === '0')) {
                  targetValCell.content = newValCell.content;
                }
              }
            }
            // Omitir agregar esta fila duplicada
            return;
          } else {
            seenLabels.add(normLabel);
          }
        }
        processed.push(row);
      });
      return processed;
    };

    // Función para limpiar filas completamente vacías y aisladas
    const cleanEmptyRows = (rows: any[]) => {
      return rows.filter(r => {
        if (!r.cells || r.cells.length === 0) return false;
        
        // 1. Todas las celdas están vacías
        const allEmpty = r.cells.every((c: any) => !(c.content || '').trim());
        if (!allEmpty) return true;

        // 2. Ninguna celda está absorbida por un rowspan superior (rowSpan === 0)
        const isEaten = r.cells.some((c: any) => c.rowSpan === 0 || c.colSpan === 0);
        if (isEaten) return true;

        // 3. Ninguna celda proyecta un rowspan hacia abajo (rowSpan > 1)
        const projectsDown = r.cells.some((c: any) => (c.rowSpan || 1) > 1);
        if (projectsDown) return true;

        return false; // Es segura de eliminar
      });
    };

    if (datos.tabs) {
      parsed = {
        ...datos,
        tabs: datos.tabs.map((t: any) => {
          const dedupedRows = cleanEmptyRows(deduplicateRows(t.rows || []));
          return {
            ...t,
            rows: dedupedRows.map((r: any) => ({
              ...r,
              cells: (r.cells || []).map((c: any) => ({
                ...c,
                backgroundColor: c.backgroundColor || c.styles?.backgroundColor,
                textOrientation: c.textOrientation || c.styles?.textOrientation || 'horizontal',
                isEditable: true
              }))
            }))
          };
        })
      }
    } else if (datos.rows) {
      // Formato antiguo: solo rows sin tabs, envolver en un tab
      const dedupedRows = cleanEmptyRows(deduplicateRows(datos.rows || []));
      parsed = {
        ...datos,
        tabs: [{
          id: 'tab-general',
          title: 'General',
          rows: dedupedRows.map((r: any) => ({
            ...r,
            cells: (r.cells || []).map((c: any) => ({
              ...c,
              backgroundColor: c.backgroundColor || c.styles?.backgroundColor,
              textOrientation: c.textOrientation || c.styles?.textOrientation || 'horizontal',
              isEditable: true
            }))
          }))
        }]
      }
    } else if (datos.campos_por_seccion || datos.hojas) {
      // Formato viejo de extracción (campos_por_seccion): convertir a tabs con filas
      const tabs: TabData[] = []
      const contenido = datos.contenido || {}
      const camposPorSeccion = datos.campos_por_seccion || {}
      
      Object.entries(camposPorSeccion).forEach(([seccion, campos]: [string, any], tabIdx: number) => {
        const rows: TableRow[] = []
        if (Array.isArray(campos)) {
          // Deduplicar campos
          const targetLabels = [
            'TOTAL HORAS DE LA ASIGNATURA',
            'TOTAL HORAS DE ASIGNATURA',
            'TOTAL HORAS ASIGNATURA'
          ];
          const seenFields = new Set<string>();
          const uniqueCampos: string[] = [];
          
          campos.forEach((campo: string) => {
            const norm = campo.trim().toUpperCase();
            if (targetLabels.includes(norm)) {
              if (seenFields.has(norm)) return;
              seenFields.add(norm);
            }
            uniqueCampos.push(campo);
          });

          uniqueCampos.forEach((campo: string, rowIdx: number) => {
            rows.push({
              id: `row-${tabIdx}-${rowIdx}`,
              cells: [
                {
                  id: `cell-${tabIdx}-${rowIdx}-0`,
                  content: campo,
                  isHeader: true,
                  rowSpan: 1,
                  colSpan: 1,
                  isEditable: false,
                  fontWeight: 'bold',
                  textAlign: 'left'
                },
                {
                  id: `cell-${tabIdx}-${rowIdx}-1`,
                  content: contenido[campo] || '',
                  isHeader: false,
                  rowSpan: 1,
                  colSpan: 1,
                  isEditable: true,
                  textAlign: 'left'
                }
              ]
            })
          })
        }
        tabs.push({
          id: `tab-${tabIdx}`,
          title: seccion,
          rows
        })
      })

      if (tabs.length === 0) {
        // Si no hay campos_por_seccion tampoco, crear tab vacío de hojas
        (datos.hojas || ['General']).forEach((hoja: string, idx: number) => {
          tabs.push({ id: `tab-${idx}`, title: hoja, rows: [] })
        })
      }

      parsed = { ...datos, tabs }
    } else {
      setError("No se encontró contenido en el syllabus. Contacta a la comisión académica para que suba el syllabus.")
      return
    }

    setSyllabusData(parsed)
    if (parsed.tabs.length > 0 && !activeTabId) {
      setActiveTabId(parsed.tabs[0].id)
    }
  }

  // Determinar si una celda es editable para el docente
  const isDocenteEditable = (cell: TableCell, rowIndex: number, cellIndex: number, allRows: TableRow[], currentLocks?: Record<string, boolean>): boolean => {
    if (!allRows || allRows.length === 0) return false
    const locks = currentLocks || lockedCells
    // Si la comisión configuró explícitamente el permiso, respetar esa configuración
    if ((cell as any).docenteEditable === true) return true
    if ((cell as any).docenteEditable === false) return false

    // Si el admin bloqueó la celda (en la versión propia o en el mapa de bloqueos de comisión), no puede editar
    if (cell.isLocked || locks[cell.id]) return false
    
    // Fallback: lógica automática por detección de etiquetas
    const currentRow = allRows[rowIndex]
    if (!currentRow) return false
    
    // Explicitamente bloquear campos de totales de horas para que tomen el valor de la comisión
    const isTotalHorasRow = currentRow.cells.some((c:any) => {
      const text = (c.content || '').toUpperCase().trim();
      return text.includes('TOTAL HORAS DE LA ASIGNATURA') || text.includes('TOTAL HORAS ASIGNATURA') || text.includes('TOTAL HORAS POR COMPONENTE');
    });
    if (isTotalHorasRow) {
      return false;
    }

    // Revisar si la celda de la izquierda (misma fila) es una etiqueta editable
    if (cellIndex > 0) {
      const leftCell = currentRow.cells[cellIndex - 1]
      if (leftCell) {
        const label = leftCell.content?.toUpperCase().trim() || ""
        if (DOCENTE_EDITABLE_LABELS.some(l => label.includes(l) || l.includes(label))) {
          return true
        }
      }
    }

    // Revisar si hay headers en las primeras filas que coincidan
    // Buscar la fila de headers (usualmente fila 0 o 1)
    for (let headerRow = 0; headerRow < Math.min(3, allRows.length); headerRow++) {
      const hRow = allRows[headerRow]
      if (!hRow) continue
      
      // Verificar si la celda en la misma columna del header es editable
      if (cellIndex < hRow.cells.length) {
        const headerCell = hRow.cells[cellIndex]
        if (headerCell) {
          const headerLabel = headerCell.content?.toUpperCase().trim() || ""
          if (DOCENTE_EDITABLE_HEADERS.some(h => headerLabel.includes(h) || h.includes(headerLabel))) {
            // Solo aplicar si estamos después de la fila de headers
            if (rowIndex > headerRow) return true
          }
        }
      }
    }

    // Permitir editar en celdas del "Contenidos" section (filas después de la header de contenidos)
    // Buscar si estamos en una sección de contenidos
    for (let r = rowIndex; r >= 0; r--) {
      const row = allRows[r]
      if (!row) continue
      for (const c of row.cells) {
        const label = c.content?.toUpperCase().trim() || ""
        if (label.includes("CONTENIDO") || label.includes("UNIDAD")) {
          // Estamos en la sección de contenidos, verificar columna
          if (cellIndex > 0) return true // Cualquier columna después de la primera en contenidos
        }
      }
    }

    return false
  }

  const activeTab = syllabusData?.tabs.find(t => t.id === activeTabId)
  const tableData = activeTab?.rows || []

  // Edición de celdas
  const startEdit = (cellId: string, content: string) => {
    setEditingCell(cellId)
    setEditContent(content)
  }

  const saveEdit = () => {
    if (!editingCell || !syllabusData) return
    setSyllabusData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tabs: prev.tabs.map(tab => ({
          ...tab,
          rows: tab.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell =>
              cell.id === editingCell ? { ...cell, content: editContent } : cell
            )
          }))
        }))
      }
    })
    setEditingCell(null)
    setEditContent("")
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditContent("")
  }

  const saveModalEdit = () => {
    if (!modalCell || !syllabusData) return
    setSyllabusData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tabs: prev.tabs.map(tab => ({
          ...tab,
          rows: tab.rows.map(row => ({
            ...row,
            cells: row.cells.map(cell =>
              cell.id === modalCell.id ? { ...cell, content: editContent } : cell
            )
          }))
        }))
      }
    })
    setModalCell(null)
    setEditContent("")
  }

  // Guardar
  const handleSave = async () => {
    if (!syllabusData) return alert("No hay syllabus para guardar.")
    if (!selectedPeriod) return alert("Seleccione un periodo.")

    // Validación de horas antes de guardar
    if (!horasValidation.valid) {
      if (!confirm(`${horasValidation.message}\n\n¿Desea continuar y guardar de todas formas?`)) {
        return;
      }
    }

    const asignaturaId = selectedAsignaturaId || profesorInfo?.asignatura_id || profesorInfo?.asignatura?.id
    setIsSaving(true)
    try {
      const datosParaGuardar = {
        version: "2.0-docente",
        metadata: syllabusData.metadata,
        tabs: syllabusData.tabs.map(tab => ({
          id: tab.id, title: tab.title,
          rows: tab.rows.map(row => ({
            id: row.id, cells: row.cells.map(cell => ({
              ...cell,
              styles: { backgroundColor: cell.backgroundColor, textColor: cell.textColor, textAlign: cell.textAlign, textOrientation: cell.textOrientation }
            }))
          }))
        }))
      }

      await apiRequest('/docente-editor/syllabus/guardar', {
        method: 'POST',
        body: JSON.stringify({
          asignatura_id: asignaturaId,
          periodo: selectedPeriod,
          nombre: syllabusData.name || 'Syllabus Docente',
          datos_syllabus: datosParaGuardar,
          syllabus_comision_id: syllabus_comision_id
        })
      })

      setHasDocenteVersion(true)
      alert("Syllabus guardado exitosamente!")
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Generar PDF — abre en otra ventana para mejor visualización y control
  const handlePrintToPdf = async () => {
    let newWindow: Window | null = null;
    newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert("Por favor, permita las ventanas emergentes para visualizar e imprimir el syllabus.");
      return;
    }
    newWindow.document.write('<p style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #4b5563; font-size: 16px;">Generando vista de impresión del syllabus...</p>');

    try {
      if (!syllabusData) {
        if (newWindow) newWindow.close();
        return;
      }

      // --- FIRMAS ---
      let firmasData: any = null
    if (syllabus_comision_id) {
      try {
        const fr = await Promise.race([
          apiRequest(`/firmas/syllabus/${syllabus_comision_id}`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ])
        if ((fr as any).success) firmasData = (fr as any).data
      } catch { /* sin firmas */ }
    }

    const escHtml = (v: string) => {
      const escaped = String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      return escaped
        .replace(/(programaci[oó]n\s*(?:1|i+|ii+)?)/gi, '<span style="font-weight: normal !important; font-style: normal !important;">$1</span>')
        .replace(/((?:Primer\s+Periodo\s+)?PII?\s+2026)/gi, '<span style="font-weight: normal !important; font-style: normal !important;">$1</span>');
    }

    const asignaturaNombre = asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || syllabusData.name || ''
    const periodoObj = periodos.find((p: any) => String(p.id) === String(selectedPeriod))
    const periodoNombre = periodoObj?.nombre || ''
    const docenteNombre = profesorInfo ? `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim() : ''
    const headerLine = [asignaturaNombre, periodoNombre ? `Periodo: ${periodoNombre}` : '', docenteNombre].filter(Boolean).join(' | ')
    const docTitle = `Syllabus - ${asignaturaNombre}`;
    const logoUrl = `${window.location.origin}/images/unesum-logo-official.png`

    const buildTabHtml = (tab: TabData) => {
      const isDatosGenerales = tab.title.toUpperCase().includes('GENERAL') || tab.title.toUpperCase().includes('DATOS');
      const isContenidos = tab.title.toUpperCase().includes('CONTENIDO') || tab.title.toUpperCase().includes('UNIDAD') || tab.title.toUpperCase().includes('ESTRUCTURA');
      const normalizedTitle = isContenidos ? 'ESTRUCTURA DE LA ASIGNATURA' : tab.title;
      const isRecursos = tab.title.toUpperCase().includes('RECURSOS');
      const sectionClass = `print-section ${isRecursos ? 'recursos-didacticos' : ''} ${isContenidos ? 'page-break' : ''}`;
      const tableStyle = (isRecursos || isContenidos) ? 'style="table-layout: fixed;"' : '';
      
      let colgroupHtml = '';
      const matrix: any[][] = [];
      const colWeights: number[] = [];
      const isCenteredCol: boolean[] = [];
      const cellVisualColMap = new Map<string, number>();

      if ((isContenidos || isRecursos) && tab.rows.length > 0) {
        for (let r = 0; r < tab.rows.length; r++) {
           matrix[r] = [];
        }
        for (let r = 0; r < tab.rows.length; r++) {
           const row = tab.rows[r];
           let cIdx = 0;
           for (const cell of row.cells) {
              if ((cell.rowSpan ?? 1) <= 0 || (cell.colSpan ?? 1) <= 0) continue;

              while (matrix[r][cIdx] !== undefined) cIdx++;
              cellVisualColMap.set(cell.id, cIdx);
              
              const rs = cell.rowSpan || 1;
              const cs = cell.colSpan || 1;
              for (let i = 0; i < rs; i++) {
                 for (let j = 0; j < cs; j++) {
                    if (r+i < tab.rows.length) {
                       matrix[r+i][cIdx+j] = cell;
                    }
                 }
              }
           }
        }
        
        const maxCols = matrix[0]?.length || 0;
        for (let j = 0; j < maxCols; j++) {
           colWeights.push(10);
           isCenteredCol.push(false);
        }
        
        for (let j = 0; j < maxCols; j++) {
           let w = 10;
           for (let r = tab.rows.length - 1; r >= 0; r--) {
              const cell = matrix[r][j];
              if (cell && cell.isHeader && (cell.colSpan || 1) === 1) {
                 const text = (cell.content || '').toUpperCase();
                 if (text.includes('UNIDAD')) w = 14;
                 else if (text.includes('CONTENIDO')) w = 24;
                 else if (text.includes('RESULTADO')) w = 16;
                 else if (text.includes('CRITERIO')) w = 12;
                 else if (text.includes('INSTRUMENTO')) w = 12;
                 else if (text.includes('METODOLOG')) { w = 16; isCenteredCol[j] = true; }
                 else if (text.includes('RECURSOS')) w = 14;
                 else if (text.includes('ESCENARIO')) { w = 12; isCenteredCol[j] = true; }
                 else if (text.includes('BIBLIO')) { w = 14; isCenteredCol[j] = true; }
                 else if (text.includes('PRESENCIAL')) w = 4;
                 else if (text.includes('SINCRONIC') || text.includes('SINCRÓNIC')) w = 4;
                 else if (text.includes('PFAE')) w = 4;
                 else if (text.includes('TA') && text.length < 15) w = 4;
                 else if (text.includes('PPP')) w = 4;
                 else if (text.includes('HORAS')) w = 4;
                 else if (text.includes('FECHA') || text.includes('PARALELO')) { w = 12; isCenteredCol[j] = true; }
                 
                 if (w !== 10) break;
              }
           }
           colWeights[j] = w;
        }
        
        const totalWeight = colWeights.reduce((a,b) => a+b, 0);
        const colHtmls = colWeights.map(w => `<col style="width: ${(w / totalWeight * 100).toFixed(2)}%;">`);
        colgroupHtml = `<colgroup>\n${colHtmls.join('\n')}\n</colgroup>`;
      }

      let headerRowCount = 0;
      if (tab.rows.length > 0) {
        const firstRowCells = tab.rows[0].cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
        if (firstRowCells.some(c => c.isHeader)) {
           headerRowCount = Math.max(1, ...firstRowCells.map(c => c.rowSpan ?? 1));
        }
      }

      let theadHtml = '';
      let tbodyHtml = '';
      tab.rows.forEach((row, ri) => {
        const cellsHtml = row.cells.map((cell, cIdx) => {
          if ((cell.rowSpan ?? 1) <= 0 || (cell.colSpan ?? 1) <= 0) return ''
          const bg = cell.backgroundColor || (cell.isHeader ? '#f8fafc' : '#ffffff')
          const fw = cell.fontWeight || ((cell.isHeader && ri === 0) ? '700' : 'normal')
          const isDatosGeneralesLabel = isDatosGenerales && cIdx === 0 && (cell.colSpan ?? 1) === 1;
          const isDatosGeneralesSeparator = isDatosGenerales && cell.content?.trim() === ':';
          const isDatosGeneralesValue = isDatosGenerales && cIdx > 0 && !isDatosGeneralesSeparator;
          const contentTrimmed = (cell.content || '').replace(/&nbsp;/g, ' ').trim();
          const upperText = contentTrimmed.toUpperCase();
          
          let ta = cell.textAlign || (cell.isHeader ? 'center' : 'left');
          if (isDatosGeneralesLabel || isDatosGeneralesValue) ta = 'left';
          else if (isDatosGeneralesSeparator) ta = 'center';
          else if (cIdx === 0 && (upperText.includes('TOTAL HORAS DE LA ASIGNATURA') || upperText.includes('TOTAL HORAS ASIGNATURA') || upperText.includes('VINCULACIÓN') || upperText.includes('VINCULACION') || upperText.includes('PRÁCTICAS PREPROFESIONALES'))) {
            ta = 'left';
          }
          else if (!isDatosGenerales && !cell.isHeader) {
            const vCol = cellVisualColMap.get(cell.id);
            if (vCol !== undefined && isCenteredCol[vCol]) {
              ta = 'center';
            } else if (contentTrimmed.length > 0 && contentTrimmed.length <= 5 && (/^[0-9]/.test(contentTrimmed) || contentTrimmed === '-' || upperText === 'N/A')) {
              ta = 'center';
            }
          }
          const matchesVert = ["AUTÓNOMO", "PRACTICO", "SINCRÓNICA", "SINCRONICA", "PFAE", "TA", "PRESENCIAL"].some(k => upperText.includes(k));
          let isVert = cell.textOrientation === 'vertical' || (cell as any).styles?.textOrientation === 'vertical';
          if (!isDatosGenerales && cell.isHeader && matchesVert && !contentTrimmed.includes('-') && contentTrimmed.length <= 22) {
            isVert = true;
          }
          if (normalizedTitle.includes('RESULTADOS')) {
            isVert = false;
          }
          const wm = isVert ? 'vertical-rl' : 'horizontal-tb'
          const transform = isVert ? 'transform:rotate(180deg);' : ''
          let widthStyle = '';
          
          if (isDatosGeneralesLabel) {
            widthStyle = 'width:33%;';
          } else if (isDatosGeneralesSeparator) {
            widthStyle = 'width:2%;';
          }
          
          let tdElem = cell.isHeader && !isDatosGenerales ? 'th' : 'td';
          const tdStyle = `background-color:${bg};font-weight:${fw};text-align:${ta};writing-mode:${wm};${transform}word-break:break-word;overflow-wrap:break-word;white-space:normal;${widthStyle}`
          
          let displayContent = cell.content || '';
          if (displayContent.trim() === 'CONTENIDOS') displayContent = 'Contenidos';
          
          // Auto-sumatoria para impresión
          if (cIdx > 0 && !isDatosGenerales && syllabusData) {
            const rowLabel = (row.cells[0]?.content || '').trim().toUpperCase();
            if (rowLabel.includes('TOTAL HORAS DE LA ASIGNATURA') || rowLabel.includes('TOTAL HORAS ASIGNATURA')) {
              const sums = calcColumnSums(syllabusData);
              const totalSum = Object.values(sums).reduce((a: number, b: number) => a + b, 0);
              if (totalSum > 0) displayContent = String(totalSum);
            } else if (rowLabel.includes('VINCULACIÓN') || rowLabel.includes('VINCULACION') || rowLabel.includes('PRÁCTICAS PREPROFESIONALES')) {
              const sums = calcColumnSums(syllabusData);
              const vincSum = (sums.vinc || 0) + (sums.ppp || 0);
              if (vincSum > 0) displayContent = String(vincSum);
            }
          }
          
          return `<${tdElem} rowspan="${cell.rowSpan ?? 1}" colspan="${cell.colSpan ?? 1}" style="${tdStyle}">${escHtml(displayContent).replace(/\n/g, '<br/>')}</${tdElem}>`
        }).join('')
        
        const tr = `<tr>${cellsHtml}</tr>`;
        if (!isDatosGenerales && ri < headerRowCount) {
           theadHtml += tr;
        } else {
           tbodyHtml += tr;
        }
      })
      const theadWrapped = theadHtml ? `<thead>${theadHtml}</thead>` : '';
      
      return `
        <section class="${sectionClass}">
          <div class="section-title">${escHtml(normalizedTitle || '')}</div>
          <div class="table-shell"><table ${tableStyle}>${colgroupHtml}${theadWrapped}<tbody>${tbodyHtml}</tbody></table></div>
        </section>`
    }

    let tabsHtml = '';
    let openedAvoidDiv = false;

    syllabusData.tabs
      .filter(t => t.rows?.length && t.title?.trim().toUpperCase() !== 'VISADO')
      .forEach(t => {
        const isBibliografia = t.title.toUpperCase().includes('BIBLIOGRAF') || t.title.toUpperCase().includes('FUENTES');
        if (isBibliografia && !openedAvoidDiv) {
          tabsHtml += '<div style="page-break-inside: avoid; break-inside: avoid-page; width: 100%;">';
          openedAvoidDiv = true;
        }
        tabsHtml += buildTabHtml(t);
      });

    const visadoHtml = `
      <section class="print-section visado-section" style="page-break-inside: avoid !important; break-inside: avoid-page !important;">
        <div class="section-title">VISADO</div>
        <div class="table-shell">
          <table style="table-layout: fixed;">
            <thead>
              <tr>
                <th style="text-align: center; padding: 6pt 8pt; background: #f8fafc;">DECANO/A DE FACULTAD</th>
                <th style="text-align: center; padding: 6pt 8pt; background: #f8fafc;">DIRECTOR/A ACADÉMICO/A</th>
                <th style="text-align: center; padding: 6pt 8pt; background: #f8fafc;">COORDINADOR/A DE CARRERA</th>
                <th style="text-align: center; padding: 6pt 8pt; background: #f8fafc;">DOCENTE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="min-height: 100pt; text-align: center; vertical-align: top; padding: 10pt 6pt;">
                  <div style="margin-bottom: 40pt;">_________________________</div>
                  <div style="font-size: 7pt;">Firma</div>
                  <div style="font-size: 7pt; margin-top: 4pt;">Fecha:</div>
                </td>
                <td style="min-height: 100pt; text-align: center; vertical-align: top; padding: 10pt 6pt;">
                  <div style="margin-bottom: 40pt;">_________________________</div>
                  <div style="font-size: 7pt;">Firma</div>
                  <div style="font-size: 7pt; margin-top: 4pt;">Fecha:</div>
                </td>
                <td style="min-height: 100pt; text-align: center; vertical-align: top; padding: 10pt 6pt;">
                  <div style="margin-bottom: 40pt;">_________________________</div>
                  <div style="font-size: 7pt;">Firma</div>
                  <div style="font-size: 7pt; margin-top: 4pt;">Fecha:</div>
                </td>
                <td style="min-height: 100pt; text-align: center; vertical-align: top; padding: 10pt 6pt;">
                  <div style="margin-bottom: 40pt;">_________________________</div>
                  <div style="font-size: 7pt;">Firma</div>
                  <div style="font-size: 7pt; margin-top: 4pt;">Fecha:</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      ${openedAvoidDiv ? '</div>' : ''}
    `;

    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Syllabus - ${escHtml(asignaturaNombre)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-size: 7pt; font-family: Arial, Helvetica, sans-serif; }
  body { color: #1f2937; background: #fff; }
  .export-header { margin-bottom: 6pt; border: 0.5pt solid #c7cdd6; border-radius: 4pt; overflow: hidden; }
  .page-header { display: flex; align-items: center; gap: 8pt; background: #ffffff; color: #1f2937; padding: 6pt 10pt; }
  .page-header img { width: 36pt; height: 36pt; object-fit: contain; }
  .page-header-text { flex: 1; text-align: center; }
  .page-header-text h1 { font-size: 12pt; font-weight: 700; color: #1f2937; }
  .page-header-text h2 { font-size: 9pt; font-weight: 700; margin-top: 2pt; color: #1f2937; }
  .page-subheader { display: none; background: transparent; color: #19325f; padding: 4pt 10pt; text-align: left; font-size: 8pt; font-weight: 700; border-top: none; }
  .print-section { margin-top: 6pt; }
  .recursos-didacticos { margin-top: 6pt; }
  .recursos-didacticos .section-title { padding: 4pt 6pt; font-size: 8pt; }
  .recursos-didacticos table td { padding: 2pt 3pt; font-size: 7pt; }
  .section-title { background: #0d7963; color: white; padding: 4pt 6pt; font-size: 8pt; font-weight: 700; border-radius: 2pt 2pt 0 0; border: 0.5pt solid #c7cdd6; border-bottom: none; }
  .table-shell { border: 0.5pt solid #c7cdd6; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; background: white; }
  th, td { border: 0.5pt solid #c7cdd6; vertical-align: middle; padding: 2pt 3pt; word-break: break-word; overflow-wrap: break-word; white-space: normal; }
  .visado-section { margin-top: 10pt; page-break-inside: avoid !important; break-inside: avoid-page !important; }
  .visado-table { table-layout: fixed; }
  .visado-cell { vertical-align: top; padding: 0 !important; }
  .visado-label { background: #dce5f2; color: #19325f; text-align: center; font-size: 8pt; font-weight: 700; padding: 5pt; display: block; }
  .visado-content { min-height: 80pt; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5pt; padding: 6pt; text-align: center; }
  .visado-nombre { font-size: 7pt; }
  .visado-fecha { font-size: 7pt; color: #4b5563; }
  .firma-qr { width: 54pt; height: 54pt; object-fit: contain; }
  .firma-pendiente { font-size: 7pt; color: #9ca3af; font-style: italic; }
  .page-break { page-break-before: always; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { page-break-inside: auto; }
    .visado-section { page-break-before: auto; page-break-inside: avoid !important; break-inside: avoid-page !important; }
  }
</style>
</head>
<body>
  <div class="export-header">
    <header class="page-header">
      <img src="${logoUrl}" alt="UNESUM" />
      <div class="page-header-text">
        <h1>UNIVERSIDAD ESTATAL DEL SUR DE MANABÍ</h1>
        <h2>SYLLABUS DE LA ASIGNATURA</h2>
      </div>
    </header>
    <div class="page-subheader">${escHtml(headerLine)}</div>
  </div>
  ${tabsHtml}
  ${visadoHtml}
</body>
</html>`

      if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(fullHtml);
        newWindow.document.close();
        
        const tryPrint = () => { 
          try { 
            newWindow.focus(); 
            newWindow.print(); 
          } catch { /* ignore */ } 
        };

        if (newWindow.document.readyState === 'complete') {
          setTimeout(tryPrint, 700);
        } else {
          newWindow.addEventListener('load', () => setTimeout(tryPrint, 700), { once: true });
        }
      }
    
    } catch (e: any) {
      if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(`<p style="color: red; font-family: sans-serif; text-align: center; margin-top: 50px;">Error al intentar generar la vista previa: ${e.message || String(e)}</p>`);
        newWindow.document.close();
      } else {
        alert("Error al intentar imprimir: " + (e.message || String(e)));
      }
      console.error(e);
    }
  }




  // Auto-fill content for profesor info
  const getAutoFilledContent = (cell: TableCell, rowIndex: number, cellIndex: number): string => {
    const activeTab = syllabusData?.tabs.find(t => t.id === activeTabId)
    const isFirstSection = activeTab && (activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS'))

    // NUNCA auto-rellenar celdas separadoras
    const rawContent = cell.content.trim()
    if (rawContent === ':' || rawContent === '::') return cell.content

    if (isFirstSection) {
      const currentRow = tableData[rowIndex]
      if (currentRow) {
        const rowVisibleCols = currentRow.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
        // Forzar separador si es una fila de formulario (<= 4 columnas visibles) y es la celda índice 1
        if (rowVisibleCols <= 4 && cellIndex === 1) return ':'
      }
    }

    if (isFirstSection && cellIndex > 0 && profesorInfo) {
      const currentRow = tableData[rowIndex]
      if (!currentRow) return cell.content || ""
      // Buscar la etiqueta real: saltando celdas separadoras (:)
      let labelCell: TableCell | undefined
      for (let i = cellIndex - 1; i >= 0; i--) {
        const c = currentRow.cells[i]
        const t = (c?.content || '').trim()
        if (t !== ':' && t !== '::' && t.length > 0) { labelCell = c; break; }
      }
      const etiqueta = labelCell?.content?.toUpperCase().replace(/:/g, '').trim() || ""
      
      if (etiqueta.includes("PARALELO") && profesorInfo.paralelo?.nombre) {
        return profesorInfo.paralelo.nombre
      }
      if ((etiqueta.includes("PROFESOR") || etiqueta.includes("DOCENTE")) && !etiqueta.includes("PERFIL")) {
        return `${profesorInfo.nombres || ''} ${profesorInfo.apellidos || ''}`.trim()
      }
      // Auto-relleno de Carrera y Facultad (solo celdas vacías, nunca separadores)
      const asigP = profesorInfo.asignatura || (profesorInfo.asignaturas?.[0])
      if (asigP?.carrera) {
        if (etiqueta.includes("FACULTAD") && asigP.carrera.facultad?.nombre) {
          if (!cell.content?.trim()) return asigP.carrera.facultad.nombre
        }
        if (etiqueta.includes("CARRERA") && !etiqueta.includes("FACULTAD") && asigP.carrera.nombre) {
          if (!cell.content?.trim()) return asigP.carrera.nombre
        }
      }
      // Auto-relleno de Prerrequisito, Correquisito y Código (solo celdas vacías)
      if (!cell.content?.trim()) {
        if ((etiqueta.includes("PRERREQUISITO") || etiqueta.includes("PRE-REQUISITO") || etiqueta.includes("PRE REQUISITO")) && asigP?.prerrequisito) {
          return asigP.prerrequisito
        }
        if ((etiqueta.includes("CORREQUISITO") || etiqueta.includes("CO-REQUISITO") || etiqueta.includes("CO REQUISITO")) && asigP?.correquisito) {
          return asigP.correquisito
        }
        if (etiqueta.includes("CÓDIGO") && !etiqueta.includes("ASIGNATURA") && asigP?.codigo) {
          return asigP.codigo
        }
      }
    }

    // Total horas de la asignatura = suma de "Total horas por componente"
    if (cellIndex > 0) {
      const currentRow2 = tableData[rowIndex];
      if (currentRow2) {
        const rowLabel = (currentRow2.cells[0]?.content || '').trim().toUpperCase();
        if (rowLabel.includes('TOTAL HORAS DE LA ASIGNATURA') || rowLabel.includes('TOTAL HORAS ASIGNATURA')) {
          let sum = 0;
          // Buscar en el tab activo primero
          const searchTabs = syllabusData?.tabs || [];
          for (const t of searchTabs) {
            for (const r of (t.rows || [])) {
              const lbl = (r.cells?.[0]?.content || '').trim().toUpperCase();
              if (lbl.includes('TOTAL HORAS POR COMPONENTE') || lbl.includes('TOTAL HORA POR COMPONENTE')) {
                for (let ci = 1; ci < r.cells.length; ci++) {
                  const v = parseInt((r.cells[ci]?.content || '').trim(), 10);
                  if (!isNaN(v) && v > 0) sum += v;
                }
                break;
              }
            }
            if (sum > 0) break;
          }
          if (sum > 0) return sum.toString();
        }
      }
    }

    // ─── Auto-sumatoria en tiempo real para filas de totales en la pestaña Estructura ───
    const isEstructuraTab = activeTab && (activeTab.title.toUpperCase().includes('ESTRUCTURA') || (['ASIGNATURA', 'CONTENIDO', 'UNIDAD'].some(k => activeTab.title.toUpperCase().includes(k)) && !activeTab.title.toUpperCase().includes('DATOS') && !activeTab.title.toUpperCase().includes('GENERAL')));
    const currentRow3 = tableData[rowIndex];
    if (isEstructuraTab && currentRow3) {
      const firstCellText = (currentRow3.cells[0]?.content || '').toUpperCase().trim();
      const isTotalComponenteRow = firstCellText.includes('TOTAL HORAS POR COMPONENTE') || firstCellText.includes('TOTAL HORA POR COMPONENTE') || (firstCellText.includes('TOTAL') && firstCellText.includes('COMPONENTE'));
      const isTotalAsignaturaRowAuto = firstCellText.includes('TOTAL HORAS DE LA ASIGNATURA') || firstCellText.includes('TOTAL HORAS ASIGNATURA');
      const isTotalVinculacionRowAuto = firstCellText.includes('VINCULACIÓN') || firstCellText.includes('VINCULACION') || firstCellText.includes('PRÁCTICAS PREPROFESIONALES');

      if ((isTotalComponenteRow || isTotalAsignaturaRowAuto || isTotalVinculacionRowAuto) && cellIndex > 0) {
        // Calcular sumas en tiempo real desde el estado actual del syllabusData
        const sums = calcColumnSums(syllabusData);

        // Usar visualColMap para evitar desalineación
        const visualColMap = new Map<string, number>();
        const grid: boolean[][] = Array(tableData.length).fill(null).map(() => []);
        tableData.forEach((r, rIdx) => {
          let col = 0;
          r.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).forEach(c => {
            while (grid[rIdx][col]) col++;
            visualColMap.set(c.id, col);
            for (let i = 0; i < (c.rowSpan || 1); i++) {
              for (let j = 0; j < (c.colSpan || 1); j++) {
                if (rIdx + i < grid.length) grid[rIdx + i][col + j] = true;
              }
            }
            col += (c.colSpan || 1);
          });
        });

        const visualCol = visualColMap.get(cell.id) ?? cellIndex;
        let colTipo = '';
        for (let hr = 0; hr < Math.min(6, tableData.length); hr++) {
          const hRow = tableData[hr];
          const vis = hRow.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
          const isHeaderLike = vis.some(c => c.isHeader) || hr < 3;
          if (!isHeaderLike) continue;

          for (const hc of vis) {
            const hcVisualCol = visualColMap.get(hc.id) ?? 0;
            const span = hc.colSpan || 1;
            if (visualCol >= hcVisualCol && visualCol < hcVisualCol + span) {
              const t = (hc.content || '').toUpperCase().trim();
              if (t.includes('PRESENCIAL')) colTipo = 'presencial';
              else if (t.includes('SINCRÓN') || t.includes('SINCRONIC')) colTipo = 'sincronica';
              else if (t.includes('PFAE') || t.includes('APLICACIÓN') || t.includes('EXPERIMENTAC')) colTipo = 'pfae';
              else if ((t === 'TA' || t.includes('AUTÓNOM') || t.includes('AUTONOM')) && !t.includes('PRESENCIAL') && !t.includes('SINCRÓN')) colTipo = 'ta';
              else if (t.includes('VINCULAC')) colTipo = 'vinc';
              else if (t.includes('PPP') || t.includes('PREPROFES')) colTipo = 'ppp';
            }
          }
        }

        if (isTotalComponenteRow && colTipo && colTipo in sums) {
          const val = sums[colTipo as keyof typeof sums];
          return val > 0 ? String(val) : (cell.content || '0');
        }

        if (isTotalVinculacionRowAuto) {
          if (cell.colSpan === 0) return cell.content || '';
          const vincSum = (sums.vinc || 0) + (sums.ppp || 0);
          return vincSum > 0 ? String(vincSum) : (cell.content || '0');
        }

        if (isTotalAsignaturaRowAuto) {
          if (cell.colSpan === 0) return cell.content || '';
          const totalSum = Object.values(sums).reduce((a: number, b: number) => a + b, 0);
          return totalSum > 0 ? String(totalSum) : (cell.content || '');
        }
      }

      // ─── Auto-sumatoria horizontal para filas de contenido (Suma de las columnas de horas) ───
      if (!isTotalComponenteRow && !isTotalAsignaturaRowAuto && !isTotalVinculacionRowAuto && cellIndex > 0) {
        let hRowIndex = -1;
        let colMap: Record<number, string> = {};
        for (let hr = 0; hr < Math.min(6, tableData.length); hr++) {
          const hRow = tableData[hr];
          if (hRow.cells.some(c => {
            const t = (c.content || '').toUpperCase();
            return t.includes('PRESENCIAL') || t.includes('PFAE') || t.includes('TA') || t.includes('AUTÓNOM') || t.includes('SINCRÓN') || t.includes('SINCRONIC');
          })) {
            hRowIndex = hr;
            let col = 0;
            for (const hc of hRow.cells) {
              const t = (hc.content || '').toUpperCase().trim();
              const span = hc.colSpan || 1;
              let tipo = '';
              if (t.includes('PRESENCIAL')) tipo = 'hora';
              else if (t.includes('SINCRÓN') || t.includes('SINCRONIC')) tipo = 'hora';
              else if (t.includes('PFAE') || t.includes('APLICACIÓN') || t.includes('EXPERIMENTAC')) tipo = 'hora';
              else if ((t === 'TA' || t.includes('AUTÓNOM') || t.includes('AUTONOM')) && !t.includes('PRESENCIAL') && !t.includes('SINCRÓN')) tipo = 'hora';
              else if (t.includes('VINCULAC')) tipo = 'hora';
              else if (t.includes('PPP') || t.includes('PREPROFES')) tipo = 'hora';
              else if (t.includes('TOTAL')) tipo = 'total_fila';

              for (let s = 0; s < span; s++) { if (tipo) colMap[col + s] = tipo; }
              col += span;
            }
            break;
          }
        }

        let currentCellCol = -1;
        let cCol = 0;
        for (let i = 0; i < currentRow3.cells.length; i++) {
          const span = currentRow3.cells[i].colSpan || 1;
          if (i === cellIndex) { currentCellCol = cCol; break; }
          cCol += span;
        }

        if (hRowIndex !== -1 && rowIndex > hRowIndex && colMap[currentCellCol] === 'total_fila') {
          let rowSum = 0;
          let rCol = 0;
          let hasHoras = false;
          for (const c of currentRow3.cells) {
            const span = c.colSpan || 1;
            const tipo = colMap[rCol];
            if (tipo === 'hora') {
              hasHoras = true;
              const val = parseInt((c.content || '').trim(), 10);
              if (!isNaN(val) && val > 0) rowSum += val;
            }
            rCol += span;
          }
          if (hasHoras) {
            return rowSum > 0 ? String(rowSum) : '0';
          }
        }
      }
    }

    return cell.content || ""
  }


  return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader />

        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Link href="/dashboard/docente">
                  <Button variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-50">
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Retroceder
                    </span>
                  </Button>
                </Link>
                <Link href="/dashboard/docente">
                  <Button variant="outline" size="sm" className="border-gray-400 text-gray-700 hover:bg-gray-50">
                    <Home className="h-4 w-4 mr-2" />
                    Menú Principal
                  </Button>
                </Link>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Editor de Syllabus</h1>
                <p className="text-sm text-gray-500">
                  {profesorInfo ? `${profesorInfo.nombres} ${profesorInfo.apellidos}` : 'Cargando...'}
                  {selectedAsignaturaId && asignaturasDisponibles.length > 0 && (
                    <> — {asignaturasDisponibles.find((a: any) => String(a.id) === selectedAsignaturaId)?.nombre || 'Sin asignatura'}</>
                  )}
                  {!selectedAsignaturaId && asignaturasDisponibles.length === 0 && profesorInfo && ' — Sin asignatura'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {asignaturasDisponibles.length > 1 && (
                <Select value={selectedAsignaturaId} onValueChange={setSelectedAsignaturaId}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Asignatura" /></SelectTrigger>
                  <SelectContent>
                    {asignaturasDisponibles.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.nombre} ({a.codigo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[250px]"><SelectValue placeholder="Periodo" /></SelectTrigger>
                <SelectContent>
                  {periodos.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={isSaving || !syllabusData || !horasValidation.valid}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</> : <><Save className="h-4 w-4 mr-2" /> Guardar</>}
              </Button>
              <Button onClick={handlePrintToPdf} variant="outline" size="sm" disabled={!syllabusData}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir
              </Button>
            </div>
          </div>

          {hasDocenteVersion && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              Estás editando tu versión guardada del syllabus.
            </div>
          )}

          {periodoAutoSyncMsg && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
              ⚠️ {periodoAutoSyncMsg}
            </div>
          )}

          {/* Legend */}
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            <div className="flex items-center gap-4 flex-wrap font-medium">
              <span className="flex items-center gap-1"><Unlock className="h-4 w-4 text-green-600" /> <span className="text-green-700">Editable (verde)</span></span>
              <span className="flex items-center gap-1"><Lock className="h-4 w-4 text-gray-400" /> <span className="text-gray-600">Solo lectura</span></span>
              <span className="flex items-center gap-1"><Lock className="h-4 w-4 text-amber-500" /> <span className="text-amber-700">Bloqueado por Admin</span></span>
              <span className="flex items-center gap-1"><Lock className="h-4 w-4 text-red-500" /> <span className="text-red-700">Bloqueado por Comisión</span></span>
            </div>
            <p className="mt-1.5 text-slate-600 text-xs">
              El Administrador y la Comisión Académica han definido la estructura y restricciones de este documento. Solo puedes editar el contenido de las celdas en color verde.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-600">Cargando syllabus...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadSyllabus} variant="outline">Reintentar</Button>
            </div>
          )}

          {!loading && !error && syllabusData && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2 border-b">
                {syllabusData.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-4 py-2 text-sm rounded-t-lg whitespace-nowrap transition-colors ${
                      activeTabId === tab.id
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>

              {/* ─── Banner de validación de horas (Prominente) ─── */}
              {horasValidation.message && (
                <div className={`mb-6 border-2 rounded-xl px-6 py-5 text-base shadow-lg ${
                  horasValidation.valid
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                    : 'bg-red-50 border-red-500 text-red-900 animate-pulse-border'
                }`}>
                  <div className="flex items-center gap-3 font-bold text-lg">
                    {horasValidation.valid
                      ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                      : <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />}
                    <span className={!horasValidation.valid ? 'text-red-700' : ''}>{horasValidation.message}</span>
                  </div>
                  {horasValidation.details && horasValidation.details.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {horasValidation.details.map((d: any, i: number) => (
                        <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border-2 ${
                          d.ok === true
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                            : d.ok === false
                            ? 'bg-red-100 border-red-500 text-red-800 shadow-sm'
                            : 'bg-gray-100 border-gray-300 text-gray-700'
                        }`}>
                          {d.ok === true ? '✅' : d.ok === false ? '❌' : 'ℹ️'}
                          {d.label}: {d.total}h {d.target > 0 ? `/ ${d.target}h` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Table */}
              {activeTab && (
                <Card className="border-emerald-100 shadow-md">
                  <CardContent className="p-4">
                    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white max-h-[75vh] overflow-y-auto custom-scrollbar">
                      <table className="border-collapse text-xs text-left" style={{ tableLayout: (activeTab && (activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS'))) ? 'fixed' : 'auto', width: '100%', maxWidth: '100%' }}>
                        <tbody className="divide-y divide-gray-200">
                          {tableData.length === 0 ? (
                            <tr><td className="p-12 text-center text-gray-500">La tabla está vacía.</td></tr>
                          ) : (
                            (() => {
                              const visualColMap = new Map<string, number>();
                              if (activeTab) {
                                const grid: boolean[][] = Array(tableData.length).fill(null).map(() => []);
                                tableData.forEach((r, rIdx) => {
                                  let col = 0;
                                  r.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).forEach(c => {
                                    while (grid[rIdx][col]) col++;
                                    visualColMap.set(c.id, col);
                                    for (let i = 0; i < (c.rowSpan || 1); i++) {
                                      for (let j = 0; j < (c.colSpan || 1); j++) {
                                        if (rIdx + i < grid.length) grid[rIdx + i][col + j] = true;
                                      }
                                    }
                                    col += (c.colSpan || 1);
                                  });
                                });
                              }
                              const brokenHeaders = tableData.length > 1 && tableData.slice(-1)[0].cells.some(c => c.isHeader);
                              return tableData.map((row, rowIndex) => {
                              const isFirstSectionRow = activeTab && (activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS'));
                              const rowVisibleCols = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                              const isFormRow = isFirstSectionRow && rowVisibleCols <= 4;
                              return (
                              <tr key={row.id} className={`transition-colors ${isFormRow ? 'hover:bg-slate-50/80' : 'hover:bg-blue-50/50'}`}>
                                {row.cells.map((cell, cellIndex) => {
                                  if (cell.rowSpan === 0 || cell.colSpan === 0) return null;

                                  const editable = isDocenteEditable(cell, rowIndex, cellIndex, tableData)
                                  const isAdminLocked = cell.isLocked || !!lockedCells[cell.id]
                                  const isComisionLocked = (cell as any).docenteEditable === false
                                  let displayContent = getAutoFilledContent(cell, rowIndex, cellIndex)
                                  if (displayContent.trim() === 'CONTENIDOS') {
                                    displayContent = 'Contenidos';
                                  }
                                  const contentTrimmed = (cell.content || '').trim();

                                  // Primera sección: nunca vertical; con guión o >14 chars: nunca vertical
                                  const isFirstSection = activeTab.title.toUpperCase().includes('GENERAL') || activeTab.title.toUpperCase().includes('INFORMACIÓN') || activeTab.title.toUpperCase().includes('DATOS');
                                  const isVisadoTab = activeTab.title.toUpperCase().includes('VISADO') || activeTab.title.toUpperCase().includes('LEGALIZACIÓN') || activeTab.title.toUpperCase().includes('LEGALIZACION');
                                  const isResultadosTab = activeTab.title.toUpperCase().includes('RESULTADOS');
                                  const isVertical = (() => {
                                    if (isFirstSection || isVisadoTab || isResultadosTab) return false;
                                    const contentTrimmedClean = contentTrimmed.replace(/&nbsp;/g, ' ');
                                    const upperText = contentTrimmedClean.toUpperCase();
                                    const matchesVert = ["AUTÓNOMO", "PRACTICO", "SINCRÓNICA", "SINCRONICA", "PFAE", "TA", "PRESENCIAL"].some(k => upperText.includes(k));
                                    if (matchesVert && !contentTrimmedClean.includes('-') && contentTrimmedClean.length <= 22) return true;
                                    
                                    if (cell.textOrientation !== 'vertical') return false;
                                    if (contentTrimmedClean.includes('-') || contentTrimmedClean.length > 22) return false;
                                    return true;
                                  })();

                                  const isSeparator = contentTrimmed === ':' || (contentTrimmed.length <= 2 && !/[a-zA-Z0-9]/.test(contentTrimmed) && contentTrimmed.length > 0);
                                  const totalVisibleCols = row.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0).length;
                                  const isSimpleRow = totalVisibleCols <= 4;

                                  // Column type detection from headers
                                  const getHeaderColType = () => {
                                    if (!activeTab || !activeTab.rows) return 'other';
                                    const visualCol = visualColMap.get(cell.id) ?? cellIndex;
                                    for (const hRow of activeTab.rows) {
                                      const vis = hRow.cells.filter(c => c.rowSpan > 0 && c.colSpan > 0);
                                      if (vis.length < 3 || !vis.every(c => c.isHeader)) continue;
                                      for (const hc of vis) {
                                        const hcVisualCol = visualColMap.get(hc.id) ?? 0;
                                        const span = hc.colSpan || 1;
                                        if (visualCol >= hcVisualCol && visualCol < hcVisualCol + span) {
                                          const t = (hc.content || '').trim().toUpperCase();
                                          if (t.includes('UNIDAD') || t.includes('TEMÁT') || t.includes('TEMAT')) return 'unidad';
                                          if (t.includes('CONTENIDO')) return 'contenido';
                                          if (t.includes('ESCENARIO')) return 'escenario';
                                          if (t.includes('METODOLOG') || t.includes('ENSEÑANZA')) return 'metodologia';
                                          if (t.includes('RECURSO') || t.includes('DIDÁCTICO')) return 'recursos';
                                          if (t.includes('CRITERIO')) return 'criterio';
                                          if (t.includes('INSTRUMENTO')) return 'instrumento';
                                          if (t.includes('RESULTADO')) return 'resultado';
                                          if (t.includes('BIBLIOGRAF') || t.includes('FUENTE')) return 'biblio';
                                          if (t.includes('FECHA') || t.includes('PARALELO')) return 'fecha';
                                          if (t.includes('PRESENCIAL') || t.includes('SINCRÓNIC') || t.includes('SINCRONIC')) return 'horas';
                                          if (t.includes('PFAE') || t.includes('APLICACIÓN') || t.includes('EXPERIMENTAC')) return 'pfae';
                                          if ((t === 'TA' || t.includes('AUTÓNOM') || t.includes('AUTONOM')) && !t.includes('PRESENCIAL') && !t.includes('SINCRÓN')) return 'ta';
                                          return 'other';
                                        }
                                      }
                                      break;
                                    }
                                    return 'other';
                                  };
                                  const colType = getHeaderColType();

                                  const colWidthConfig: Record<string, { w: string, min: string, max: string }> = {
                                    unidad: { w: 'auto', min: '100px', max: '160px' },
                                    contenido: { w: 'auto', min: '130px', max: '220px' },
                                    resultado: { w: 'auto', min: '130px', max: '250px' },
                                    criterio: { w: 'auto', min: '100px', max: '180px' },
                                    instrumento: { w: 'auto', min: '100px', max: '170px' },
                                    metodologia: { w: 'auto', min: '100px', max: '180px' },
                                    recursos: { w: 'auto', min: '120px', max: '200px' },
                                    escenario: { w: 'auto', min: '80px', max: '130px' },
                                    biblio: { w: 'auto', min: '100px', max: '170px' },
                                    fecha: { w: 'auto', min: '80px', max: '140px' },
                                    horas: { w: 'auto', min: '35px', max: '55px' },
                                    pfae: { w: 'auto', min: '30px', max: '45px' },
                                    ta: { w: 'auto', min: '30px', max: '45px' },
                                    other: { w: 'auto', min: '60px', max: 'none' },
                                  };

                                  const dims = (() => {
                                    if (isFirstSection && isSimpleRow) {
                                      if (isSeparator) return { w: '18px', min: '18px', max: '18px' };
                                      if (cellIndex === 0) return { w: '350px', min: '300px', max: '450px' };
                                      return { w: 'auto', min: '60px', max: 'none' };
                                    }
                                    if (isVisadoTab) return { w: 'auto', min: '150px', max: 'none' };
                                    if (isVertical) return { w: '28px', min: '28px', max: '28px' };
                                    if (isSeparator) return { w: '20px', min: '20px', max: '20px' };
                                    if (contentTrimmed.length <= 4 && cellIndex > 1 && !cell.isHeader) return { w: '35px', min: '35px', max: '45px' };
                                    if (colType !== 'other') return colWidthConfig[colType];
                                    if (cellIndex === 0) return { w: 'auto', min: '100px', max: '160px' };
                                    return { w: 'auto', min: '60px', max: 'none' };
                                  })();
                                  const cellWidth = dims.w;
                                  const cellMinW = dims.min;
                                  const cellMaxW = dims.max;

                                  const isFirstSectionLabel = isFirstSection && isSimpleRow && cellIndex === 0;


                                  const isFirstSectionValue = isFirstSection && isSimpleRow && cellIndex > 0 && !isSeparator;


                                  const rowHasLongText = row.cells.some(c => c.content.trim().length > 80);
                                  const rowHasNumberCell = row.cells.some(c => /^\s*\d+\s*$/.test(c.content));
                                  const baseIsHeader = brokenHeaders ? (rowIndex === 0 && !isFirstSectionValue) : (cell.isHeader && !isFirstSectionValue);
                                  const isHeaderForAlign = baseIsHeader && !rowHasLongText && !rowHasNumberCell;






                                  // Centrar verticalmente: headers, celdas con rowSpan grande, VISADO, y todas las celdas de tablas con muchas columnas


                                  const isTotalRow = row.cells[0]?.content?.toUpperCase().includes('TOTAL HORAS POR COMPONENTE');
                                  const isTotalAsignaturaRow = row.cells[0]?.content?.toUpperCase().includes('TOTAL HORAS DE LA ASIGNATURA');
                                  const isTotalVinculacionRow = row.cells[0]?.content?.toUpperCase().includes('TOTAL HORAS VINCULACIÓN') || row.cells[0]?.content?.toUpperCase().includes('TOTAL HORAS VINCULACION') || row.cells[0]?.content?.toUpperCase().includes('PRÁCTICAS PREPROFESIONALES');

                                  let shouldCenterHorizontally = colType === 'escenario' || colType === 'biblio' || colType === 'fecha' || colType === 'horas' || colType === 'pfae' || colType === 'ta' || colType === 'metodologia';
                                  if (isTotalVinculacionRow || isTotalAsignaturaRow) {
                                      shouldCenterHorizontally = false;
                                  }
                                  const shouldCenterVertically = isHeaderForAlign || (cell.rowSpan && cell.rowSpan > 1) || isVisadoTab || totalVisibleCols >= 3 || shouldCenterHorizontally;
                                  const vertAlign = shouldCenterVertically ? 'align-middle' : 'align-top';
                                  const hasError = (() => {
                                    if (horasValidation.valid || !horasValidation.details || cellIndex === 0) return false;
                                    
                                    if (isTotalRow) {
                                      if (colType === 'horas' && horasValidation.details.some((d:any) => d.label.includes('Presencial') && d.ok === false)) {
                                        const val = parseInt(displayContent || contentTrimmed || '0', 10);
                                        if (val === 0) return false;
                                        return true;
                                      }
                                      if (colType === 'pfae' && horasValidation.details.some((d:any) => d.label.includes('PFAE') && d.ok === false)) return true;
                                      if (colType === 'ta' && horasValidation.details.some((d:any) => d.label.includes('Autónomo') && d.ok === false)) return true;
                                    }
                                    
                                    if (isTotalAsignaturaRow) return true;
                                    
                                    return false;
                                  })();

                                  return (
                                    <td
                                      key={cell.id}
                                      className={`border relative ${vertAlign} ${(baseIsHeader && !isFirstSectionLabel) ? 'font-bold' : ''} ${
                                        hasError
                                          ? 'border-red-500 bg-red-100 shadow-[inset_0_0_0_2px_rgba(239,68,68,1)] text-red-900 font-bold z-10'
                                          : isAdminLocked
                                          ? 'border-yellow-400 bg-yellow-100/70 text-yellow-900'
                                          : isComisionLocked
                                          ? 'border-red-300 bg-red-50/70 text-red-900'
                                          : editable
                                          ? 'border-green-300 bg-green-50/50 cursor-cell hover:bg-green-100/50'
                                          : isVisadoTab && cell.isHeader
                                            ? 'border-[#a0aec0] bg-white text-[#19325f] text-center font-bold text-[11px]'
                                          : isVisadoTab && !cell.isHeader
                                            ? 'border-[#a0aec0] bg-white text-slate-700 text-center py-3'
                                          : isFirstSectionLabel
                                            ? 'border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 text-gray-700'
                                            : isFirstSectionValue
                                              ? 'border-gray-200 bg-white text-gray-800'
                                              : isHeaderForAlign
                                                ? 'border-gray-300 bg-gray-100/80 font-bold text-gray-800'
                                                : 'border-gray-300 bg-white text-gray-700'
                                      }`}
                                      style={{
                                        backgroundColor: isAdminLocked
                                           ? '#fef08a'
                                           : isComisionLocked
                                           ? '#fef2f2'
                                           : cell.backgroundColor || (isFirstSectionLabel ? undefined : isHeaderForAlign ? '#f8fafc' : undefined), fontFamily: "'Times New Roman', Times, serif",
                                        width: cellWidth,
                                        minWidth: cellMinW,
                                        maxWidth: cellMaxW,
                                        padding: 0,
                                        ...(isFirstSection && isSimpleRow ? { borderBottom: '1px solid #e2e8f0' } : {}),
                                      }}
                                      rowSpan={cell.rowSpan}
                                      colSpan={cell.colSpan}
                                      onDoubleClick={() => {
                                        if (editable) {
                                          setModalCell({ id: cell.id, content: displayContent, isEditable: true })
                                          setEditContent(displayContent)
                                        }
                                      }}
                                    >
                                      <div
                                        className={`w-full ${isHeaderForAlign || isVisadoTab || isFirstSectionLabel ? 'text-center' : `${shouldCenterHorizontally ? 'text-center' : 'text-left'}`} ${isFirstSectionLabel ? 'px-2 py-1' : isFirstSectionValue ? 'px-2 py-1' : isVisadoTab ? 'px-3 py-3' : 'px-1 py-0.5'}`}
                                        style={{
                                          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                                          transform: isVertical ? 'rotate(180deg)' : 'none',
                                          maxHeight: isVertical ? '100px' : 'none',
                                          whiteSpace: isVertical ? 'nowrap' : 'pre-wrap',
                                          overflow: isVertical ? 'hidden' : 'visible',
                                          lineHeight: isFirstSection ? '1.4' : '1.3',
                                          fontFamily: "'Times New Roman', Times, serif",
                                          fontSize: cell.fontSize || (isVertical ? '9px' : '11pt'),
                                        }}
                                      >
                                        {editingCell === cell.id ? (
                                          <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            autoFocus
                                            onBlur={saveEdit}
                                            className="w-full min-h-[50px] p-1 text-xs resize-y border-blue-400 focus-visible:ring-1 focus-visible:ring-blue-500"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                              if (e.key === "Escape") cancelEdit();
                                            }}
                                          />
                                        ) : (
                                          <div
                                            className={`whitespace-pre-wrap break-words w-full ${(isHeaderForAlign || isFirstSectionLabel) ? 'text-center' : ''}`}
                                            style={{ wordBreak: 'break-word', lineHeight: '1.3' }}
                                          >
                                            {displayContent.trim() || <span className="opacity-0">.</span>}
                                            {editable && !displayContent.trim() && (
                                              <span className="text-green-400 italic text-[9px]">Doble clic para editar</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {!editable && (
                                        <div className="absolute top-0 right-0 p-0.5">
                                          <Lock className={`h-2.5 w-2.5 ${isAdminLocked ? 'text-amber-400' : 'text-gray-300'}`} />
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            );})
                            })()
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          
          {/* Panel de firmas digitales */}
          {syllabus_comision_id && (
            <div className="mt-6">
              <FirmasPanel
                tipo="syllabus"
                documentoId={syllabus_comision_id}
                documentoNombre={syllabusData?.name || 'Syllabus'}
              />
            </div>
          )}
        </main>
        
        {/* Sticky Error Banner al pie */}
        {!horasValidation.valid && horasValidation.message && (
          <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom flex justify-center">
            <div className="max-w-7xl w-full flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-100" />
                <div>
                  <h3 className="font-bold text-lg leading-tight">No se puede guardar: Existen errores en la sumatoria de horas</h3>
                  <p className="text-red-100 text-sm mt-0.5">{horasValidation.message}</p>
                </div>
              </div>
              <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} variant="outline" className="bg-red-700 text-white border-red-500 hover:bg-red-800">
                Ver Detalles
              </Button>
            </div>
          </div>
        )}

        {/* Modal de edición */}
        {modalCell && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalCell(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
                <h3 className="text-lg font-bold text-emerald-800">Editar Celda</h3>
              </div>
              <div className="p-4">
                {modalCell.isEditable ? (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[300px] p-3 text-sm border-gray-300 rounded-lg"
                    autoFocus
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm text-gray-700 p-3 bg-gray-50 rounded-lg min-h-[200px]">
                    {modalCell.content}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
                <Button variant="outline" onClick={() => setModalCell(null)}>Cerrar</Button>
                {modalCell.isEditable && (
                  <Button className="bg-emerald-600 text-white" onClick={saveModalEdit}>
                    <Save className="h-4 w-4 mr-2" /> Guardar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  )
}
