// Sincroniza la columna "Contenidos" desde la pestaña ESTRUCTURA DE LA ASIGNATURA
// hacia la pestaña RESULTADOS Y EVALUACIÓN. La estructura es la fuente de verdad:
// los contenidos de cada unidad temática se agrupan y se escriben en la celda
// "Contenidos" de la misma unidad en la pestaña de resultados.

interface SyncCell {
  id: string
  content: string
  rowSpan: number
  colSpan: number
}
interface SyncRow {
  id: string
  cells: SyncCell[]
}
export interface SyncTab {
  id: string
  title: string
  rows: SyncRow[]
}

// Normaliza texto: mayúsculas y sin tildes, para comparar títulos/encabezados
// (NFD separa la tilde como caracter combinante en el rango 0x300-0x36F y se filtra)
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
    .trim()

export const esTabEstructura = (title: string): boolean => {
  const t = norm(title)
  if (t.includes("RESULTADOS")) return false
  if (t.includes("ESTRUCTURA")) return true
  return (
    ["ASIGNATURA", "CONTENIDO", "UNIDAD"].some((k) => t.includes(k)) &&
    !t.includes("DATOS") &&
    !t.includes("GENERAL") &&
    !t.includes("INFORMACION") &&
    !t.includes("VISADO")
  )
}

export const esTabResultados = (title: string): boolean => {
  const t = norm(title)
  return t.includes("RESULTADOS")
}

// Rejilla de ocupación: grid[fila][columnaVisual] = celda propietaria,
// teniendo en cuenta rowSpan/colSpan (las celdas con span 0 están ocultas por un merge)
const buildGrid = (rows: SyncRow[]): (SyncCell | undefined)[][] => {
  const grid: (SyncCell | undefined)[][] = rows.map(() => [])
  rows.forEach((row, rIdx) => {
    let col = 0
    for (const c of row.cells) {
      if ((c.rowSpan ?? 1) <= 0 || (c.colSpan ?? 1) <= 0) continue
      while (grid[rIdx][col]) col++
      for (let i = 0; i < (c.rowSpan || 1); i++) {
        for (let j = 0; j < (c.colSpan || 1); j++) {
          if (rIdx + i < grid.length) grid[rIdx + i][col + j] = c
        }
      }
      col += c.colSpan || 1
    }
  })
  return grid
}

// Busca en las primeras filas la columna visual cuyo encabezado contiene la palabra clave.
// Devuelve la columna y la fila donde terminan los encabezados de esa celda.
const findHeaderCol = (
  rows: SyncRow[],
  grid: (SyncCell | undefined)[][],
  keyword: string,
  exclude: string[] = []
): { col: number; headerEnd: number } | null => {
  const maxScan = Math.min(6, rows.length)
  for (let r = 0; r < maxScan; r++) {
    for (let col = 0; col < grid[r].length; col++) {
      const cell = grid[r][col]
      if (!cell) continue
      // Se comparan sin espacios para tolerar encabezados como "C ontenidos"
      const t = norm(cell.content).replace(/\s+/g, "")
      if (t.includes(keyword) && !exclude.some((e) => t.includes(e))) {
        return { col, headerEnd: r + (cell.rowSpan || 1) - 1 }
      }
    }
  }
  return null
}

const numeroDeUnidad = (label: string): string | null => {
  const m = (label || "").match(/\d+/)
  return m ? m[0] : null
}

interface Grupo {
  label: string
  contenidos: string[]
}

// Recorre la pestaña estructura y agrupa los contenidos por unidad temática
const extraerUnidades = (tab: SyncTab): Grupo[] | null => {
  const grid = buildGrid(tab.rows)
  const uCol = findHeaderCol(tab.rows, grid, "UNIDAD")
  const cCol = findHeaderCol(tab.rows, grid, "CONTENIDO")
  if (!uCol || !cCol || uCol.col === cCol.col) return null

  const dataStart = Math.max(uCol.headerEnd, cCol.headerEnd) + 1
  const grupos: Grupo[] = []
  let actual: Grupo | null = null

  for (let r = dataStart; r < tab.rows.length; r++) {
    const uCell = grid[r][uCol.col]
    const cCell = grid[r][cCol.col]
    if (norm(uCell?.content).startsWith("TOTAL") || norm(cCell?.content).startsWith("TOTAL")) continue

    const esNuevaUnidad = uCell && (r === dataStart || uCell !== grid[r - 1]?.[uCol.col])
    if (esNuevaUnidad) {
      actual = { label: (uCell!.content || "").trim(), contenidos: [] }
      grupos.push(actual)
    }
    const esNuevaCeldaContenido = cCell && (r === dataStart || cCell !== grid[r - 1]?.[cCol.col])
    if (actual && esNuevaCeldaContenido) {
      const txt = (cCell!.content || "").trim()
      if (txt) actual.contenidos.push(txt)
    }
  }
  return grupos
}

/**
 * Sincroniza los contenidos de la pestaña ESTRUCTURA hacia la pestaña RESULTADOS.
 * Devuelve las pestañas actualizadas y si hubo algún cambio.
 * Las unidades se emparejan por su número ("UT 1", "Unidad 2", ...) y,
 * si no hay número, por orden de aparición.
 */
export function syncContenidosEstructuraAResultados<T extends SyncTab>(
  tabs: T[]
): { tabs: T[]; changed: boolean } {
  const tabEst = tabs.find((t) => esTabEstructura(t.title))
  const tabRes = tabs.find((t) => esTabResultados(t.title))
  if (!tabEst || !tabRes || tabEst.id === tabRes.id) {
    console.debug("[sync-contenidos] omitido: pestañas no encontradas", {
      estructura: tabEst?.title ?? null,
      resultados: tabRes?.title ?? null,
      titulos: tabs.map((t) => t.title),
    })
    return { tabs, changed: false }
  }

  const grupos = extraerUnidades(tabEst)
  if (!grupos || grupos.length === 0) {
    console.debug("[sync-contenidos] omitido: no se detectaron columnas UNIDAD/CONTENIDO en la pestaña", tabEst.title)
    return { tabs, changed: false }
  }
  const conLabel = grupos.filter((g) => g.label)

  const grid = buildGrid(tabRes.rows)
  const uCol = findHeaderCol(tabRes.rows, grid, "UNIDAD")
  const cCol = findHeaderCol(tabRes.rows, grid, "CONTENIDO")
  if (!uCol || !cCol || uCol.col === cCol.col) {
    console.debug("[sync-contenidos] omitido: no se detectaron columnas UNIDAD/CONTENIDO en la pestaña", tabRes.title)
    return { tabs, changed: false }
  }

  const dataStart = Math.max(uCol.headerEnd, cCol.headerEnd) + 1
  const updates = new Map<string, string>()
  let ordinal = 0

  for (let r = dataStart; r < tabRes.rows.length; r++) {
    const uCell = grid[r][uCol.col]
    if (!uCell || (r > dataStart && uCell === grid[r - 1]?.[uCol.col])) continue // no es inicio de unidad
    const label = (uCell.content || "").trim()
    if (!label || norm(label).startsWith("TOTAL")) continue

    const cCell = grid[r][cCol.col]
    const num = numeroDeUnidad(label)
    let grupo = num ? conLabel.find((g) => numeroDeUnidad(g.label) === num) : undefined
    if (!grupo) grupo = conLabel[ordinal]
    ordinal++
    if (!grupo || !cCell) continue

    const texto = grupo.contenidos.join("\n")
    if (texto && texto !== (cCell.content || "")) updates.set(cCell.id, texto)
  }

  if (updates.size === 0) return { tabs, changed: false }
  console.debug(`[sync-contenidos] ${updates.size} celda(s) de Contenidos actualizada(s) en "${tabRes.title}"`)

  const newTabs = tabs.map((t) =>
    t.id !== tabRes.id
      ? t
      : {
          ...t,
          rows: t.rows.map((row) => ({
            ...row,
            cells: row.cells.map((c) =>
              updates.has(c.id) ? { ...c, content: updates.get(c.id)! } : c
            ),
          })),
        }
  ) as T[]
  return { tabs: newTabs, changed: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sincroniza la columna "Resultados de aprendizaje" de la pestaña RESULTADOS
// a partir de las unidades temáticas guardadas en la base de datos (tabla
// unidades_tematicas, filtradas por asignatura_id). Cada unidad de la tabla se
// empareja con la unidad del syllabus por su número; si no hay número, por orden.
// ─────────────────────────────────────────────────────────────────────────────

export interface UnidadTematicaBD {
  numero_unidad?: number | string | null
  nombre_unidad?: string | null
  resultados_aprendizaje?: string | null
}

// Igual que findHeaderCol pero exige que TODAS las palabras clave estén presentes
// en el encabezado (útil para distinguir "Resultados de aprendizaje" de otras
// columnas que también contienen "Resultados").
const findHeaderColAll = (
  rows: SyncRow[],
  grid: (SyncCell | undefined)[][],
  keywords: string[],
  exclude: string[] = []
): { col: number; headerEnd: number } | null => {
  const maxScan = Math.min(6, rows.length)
  for (let r = 0; r < maxScan; r++) {
    for (let col = 0; col < grid[r].length; col++) {
      const cell = grid[r][col]
      if (!cell) continue
      const t = norm(cell.content).replace(/\s+/g, "")
      if (keywords.every((k) => t.includes(k)) && !exclude.some((e) => t.includes(e))) {
        return { col, headerEnd: r + (cell.rowSpan || 1) - 1 }
      }
    }
  }
  return null
}

export function syncResultadosAprendizajeDesdeBD<T extends SyncTab>(
  tabs: T[],
  unidades: UnidadTematicaBD[]
): { tabs: T[]; changed: boolean } {
  const tabRes = tabs.find((t) => esTabResultados(t.title))
  if (!tabRes || !Array.isArray(unidades) || unidades.length === 0) {
    return { tabs, changed: false }
  }

  const grid = buildGrid(tabRes.rows)
  const uCol = findHeaderCol(tabRes.rows, grid, "UNIDAD")
  const rCol = findHeaderColAll(tabRes.rows, grid, ["RESULTADO", "APRENDIZAJE"])
  if (!uCol || !rCol || uCol.col === rCol.col) {
    console.debug("[sync-resultados] omitido: no se detectaron columnas UNIDAD/RESULTADOS en", tabRes.title)
    return { tabs, changed: false }
  }

  // Indexar las unidades de la BD por su número de unidad
  const porNumero = new Map<string, UnidadTematicaBD>()
  unidades.forEach((u) => {
    const num =
      u.numero_unidad != null && String(u.numero_unidad).trim() !== ""
        ? String(u.numero_unidad).match(/\d+/)?.[0] ?? null
        : numeroDeUnidad(u.nombre_unidad || "")
    if (num && !porNumero.has(num)) porNumero.set(num, u)
  })

  const dataStart = Math.max(uCol.headerEnd, rCol.headerEnd) + 1
  const updates = new Map<string, string>()
  let ordinal = 0

  for (let r = dataStart; r < tabRes.rows.length; r++) {
    const uCell = grid[r][uCol.col]
    if (!uCell || (r > dataStart && uCell === grid[r - 1]?.[uCol.col])) continue // no es inicio de unidad
    const label = (uCell.content || "").trim()
    if (!label || norm(label).startsWith("TOTAL")) continue

    const rCell = grid[r][rCol.col]
    const num = numeroDeUnidad(label)
    let unidad = num ? porNumero.get(num) : undefined
    if (!unidad) unidad = unidades[ordinal]
    ordinal++
    if (!unidad || !rCell) continue

    const texto = (unidad.resultados_aprendizaje || "").trim()
    if (texto && texto !== (rCell.content || "")) updates.set(rCell.id, texto)
  }

  if (updates.size === 0) return { tabs, changed: false }
  console.debug(`[sync-resultados] ${updates.size} celda(s) de Resultados de aprendizaje actualizada(s) en "${tabRes.title}"`)

  const newTabs = tabs.map((t) =>
    t.id !== tabRes.id
      ? t
      : {
          ...t,
          rows: t.rows.map((row) => ({
            ...row,
            cells: row.cells.map((c) =>
              updates.has(c.id) ? { ...c, content: updates.get(c.id)! } : c
            ),
          })),
        }
  ) as T[]
  return { tabs: newTabs, changed: true }
}
