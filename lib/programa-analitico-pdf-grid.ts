/**
 * Aplana filas del editor (merges, celdas fantasma por rowspan/colspan 0) a una
 * matriz rectangular para jspdf-autotable (rowSpan/colSpan siempre 1 por celda),
 * evitando desalineación al borrar columnas o al combinar celdas.
 */

export interface PdfSrcCell {
  /** Identificador estable de la celda en el editor (tabla HTML) */
  id?: string;
  content?: string;
  rowSpan?: number;
  colSpan?: number;
  isHeader?: boolean;
  textOrientation?: string;
  textAlign?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface PdfSrcRow {
  cells: PdfSrcCell[];
}

const MAX_COLS = 48;

function clash(occ: boolean[][], r: number, c: number, rs: number, cs: number, rowCount: number): boolean {
  for (let ur = r; ur < r + rs && ur < rowCount; ur++) {
    for (let uc = c; uc < c + cs && uc < MAX_COLS; uc++) {
      if (occ[ur]?.[uc]) return true;
    }
  }
  return false;
}

function occupy(occ: boolean[][], r: number, c: number, rs: number, cs: number, rowCount: number) {
  for (let ur = r; ur < r + rs && ur < rowCount; ur++) {
    if (!occ[ur]) occ[ur] = Array(MAX_COLS).fill(false);
    for (let uc = c; uc < c + cs && uc < MAX_COLS; uc++) {
      occ[ur][uc] = true;
    }
  }
}

function nextVacant(occ: boolean[][], r: number, fromC: number): number {
  let c = fromC;
  while (c < MAX_COLS && occ[r]?.[c]) c++;
  return c;
}

export function flattenTabRowsForPdfAutoTable<TBodyCell extends Record<string, unknown>>(
  tabRows: PdfSrcRow[],
  mapCellToBodyEntry: (
    cell: PdfSrcCell,
    rowIdx: number,
    colSlot: number,
    isContinuation: boolean
  ) => TBodyCell | string
): TBodyCell[][] {
  const rowCount = tabRows.length;
  if (rowCount === 0) return [];

  const occ: boolean[][] = Array.from({ length: rowCount }, () => Array(MAX_COLS).fill(false));
  const grid: (TBodyCell | null)[][] = Array.from({ length: rowCount }, () => Array(MAX_COLS).fill(null));

  for (let r = 0; r < rowCount; r++) {
    let colPtr = nextVacant(occ, r, 0);

    for (const cell of tabRows[r].cells) {
      const rsRaw = cell.rowSpan ?? 1;
      const csRaw = cell.colSpan ?? 1;
      if (rsRaw <= 0 || csRaw <= 0) continue;

      let rs = Math.max(1, rsRaw);
      let cs = Math.max(1, csRaw);
      rs = Math.min(rs, rowCount - r);

      colPtr = nextVacant(occ, r, colPtr);
      if (colPtr >= MAX_COLS) break;

      cs = Math.min(cs, MAX_COLS - colPtr);

      while (rs > 0 && cs > 0 && clash(occ, r, colPtr, rs, cs, rowCount)) {
        colPtr++;
        colPtr = nextVacant(occ, r, colPtr);
        if (colPtr >= MAX_COLS) break;
        cs = Math.min(Math.max(1, csRaw), MAX_COLS - colPtr);
      }
      if (colPtr >= MAX_COLS) break;

      occupy(occ, r, colPtr, rs, cs, rowCount);

      for (let ur = r; ur < r + rs && ur < rowCount; ur++) {
        for (let uc = colPtr; uc < colPtr + cs && uc < MAX_COLS; uc++) {
          const isCont = !(ur === r && uc === colPtr);
          const raw = mapCellToBodyEntry(cell, ur, uc, isCont);
          const entry =
            typeof raw === 'string'
              ? ({ content: raw } as unknown as TBodyCell)
              : raw;
          grid[ur][uc] = entry;
        }
      }

      colPtr += cs;
    }
  }

  let lastCol = 0;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < MAX_COLS; c++) {
      if (occ[r]?.[c]) lastCol = Math.max(lastCol, c + 1);
    }
  }
  lastCol = Math.max(lastCol, 1);

  const trimmed: TBodyCell[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const rowOut: TBodyCell[] = [];
    for (let c = 0; c < lastCol; c++) {
      rowOut.push((grid[r][c] ?? ({ content: '' } as unknown)) as TBodyCell);
    }
    trimmed.push(rowOut);
  }

  return trimmed;
}
