// Preserva los bloqueos (isLocked / docenteEditable) de una versión previa del
// syllabus al subir un Word nuevo. Como al reimportar el documento las celdas se
// reconstruyen desde cero con ids nuevos (`cell-${Date.now()}-...`), el emparejamiento
// por id NO sobrevive a la subida. Por eso el merge se hace por POSICIÓN
// (tabIndex/rowIndex/cellIndex) con respaldo por CONTENIDO de la etiqueta, la misma
// técnica que usa el backend en applyAdminLocksToData.

interface LockCell {
  id?: string
  content?: string
  isLocked?: boolean
  docenteEditable?: boolean
  backgroundColor?: string
  textColor?: string
  [k: string]: any
}
interface LockRow { id?: string; cells?: LockCell[]; [k: string]: any }
interface LockTab { id?: string; title?: string; rows?: LockRow[]; [k: string]: any }

// Normaliza texto (mayúsculas, sin tildes) para comparar etiquetas de celda
const norm = (s: string | undefined | null): string =>
  (s || "")
    .toUpperCase()
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code < 0x300 || code > 0x36f
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Devuelve `newTabs` con los bloqueos de `oldTabs` reaplicados por posición.
 * Si no hay versión previa, devuelve `newTabs` sin cambios.
 * Reglas:
 *   1. Match por posición exacta: si la celda previa estaba bloqueada, se bloquea la nueva.
 *   2. Respaldo por contenido: si una etiqueta idéntica estaba bloqueada, se bloquea.
 *   3. Se respeta el desbloqueo explícito de la comisión (isLocked=false && docenteEditable=true).
 */
export function mergeLocksByPosition<T extends LockTab>(newTabs: T[], oldTabs: LockTab[] | undefined | null): T[] {
  if (!Array.isArray(newTabs) || !Array.isArray(oldTabs) || oldTabs.length === 0) return newTabs

  return newTabs.map((tab, tIdx) => {
    const oldTab = oldTabs.find((t) => t.title && tab.title && t.title === tab.title) || oldTabs[tIdx]
    if (!oldTab || !Array.isArray(oldTab.rows)) return tab

    // Índice de celdas bloqueadas por contenido (para el respaldo)
    const lockedByContent = new Map<string, LockCell>()
    oldTab.rows.forEach((r) =>
      (r.cells || []).forEach((c) => {
        if (c.isLocked === true) {
          const key = norm(c.content)
          if (key && !lockedByContent.has(key)) lockedByContent.set(key, c)
        }
      })
    )

    return {
      ...tab,
      rows: (tab.rows || []).map((row: LockRow, rIdx: number) => {
        const oldRow = oldTab.rows![rIdx]
        return {
          ...row,
          cells: (row.cells || []).map((cell: LockCell, cIdx: number) => {
            const oldCell = oldRow?.cells?.[cIdx]
            let isLocked = cell.isLocked
            let docenteEditable = cell.docenteEditable
            let backgroundColor = cell.backgroundColor
            let textColor = cell.textColor

            // 1. Match por posición exacta
            if (oldCell) {
              if (oldCell.isLocked === true) {
                isLocked = true
                if (oldCell.docenteEditable !== undefined) docenteEditable = oldCell.docenteEditable
                if (oldCell.backgroundColor) backgroundColor = oldCell.backgroundColor
                if (oldCell.textColor) textColor = oldCell.textColor
              } else if (oldCell.isLocked === false && oldCell.docenteEditable === true) {
                // Desbloqueo explícito de la comisión: se conserva
                isLocked = false
                docenteEditable = true
              }
            }

            // 2. Respaldo por contenido de etiqueta
            if (isLocked !== true && docenteEditable !== true) {
              const key = norm(cell.content)
              const matched = key ? lockedByContent.get(key) : undefined
              if (matched) {
                isLocked = true
                if (matched.backgroundColor) backgroundColor = matched.backgroundColor
                if (matched.textColor) textColor = matched.textColor
              }
            }

            return { ...cell, isLocked, docenteEditable, backgroundColor, textColor }
          }),
        }
      }),
    } as T
  })
}

// Cuenta cuántas celdas quedaron bloqueadas (para feedback al usuario)
export function contarBloqueos(tabs: LockTab[] | undefined | null): number {
  if (!Array.isArray(tabs)) return 0
  let n = 0
  tabs.forEach((t) => (t.rows || []).forEach((r) => (r.cells || []).forEach((c) => { if (c.isLocked === true) n++ })))
  return n
}
