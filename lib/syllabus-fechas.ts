// Genera las fechas de clase por paralelo para la columna "Fecha/paralelo" del
// syllabus. Combina el rango del periodo (fecha_inicio → fecha_fin) con los días
// de la semana de cada paralelo, parseados del campo "Horario de clases".
//
// Ejemplo de horario:
//   "Paralelo A: jueves 11:30–13:30; viernes 07:30–10:30
//    Paralelo B: lunes 11:30–13:30; martes 09:30–12:30
//    Paralelo C: lunes 15:30–18:30; martes 15:30–17:30"

const sinTildes = (s: string): string =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

// Nombre de día en español → número de día JS (domingo = 0)
const DIAS_NUM: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
}
const NUM_DIA: Record<number, string> = {
  0: "domingo", 1: "lunes", 2: "martes", 3: "miércoles", 4: "jueves", 5: "viernes", 6: "sábado",
}

const extraerDias = (segmentoNorm: string): number[] => {
  const dias: number[] = []
  for (const [nombre, num] of Object.entries(DIAS_NUM)) {
    if (segmentoNorm.includes(nombre)) dias.push(num)
  }
  return Array.from(new Set(dias)).sort((a, b) => a - b)
}

// Parsea el horario → { A: [4,5], B: [1,2], C: [1,2] } (letra de paralelo → días JS)
export function parseHorarioParalelos(texto: string): Record<string, number[]> {
  const result: Record<string, number[]> = {}
  if (!texto) return result
  const norm = sinTildes(texto)

  // Requiere espacio entre "paralelo" y la letra para no capturar la "s" de "paralelos".
  // Captura cualquier letra/número: A, B, C, D, E… o 1, 2, 3…
  const regex = /paralelo\s+([a-z0-9])/g
  const matches: { letra: string; index: number }[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(norm)) !== null) {
    matches.push({ letra: m[1].toUpperCase(), index: m.index })
  }

  if (matches.length === 0) {
    // Sin "Paralelo": tratar todo el texto como un único paralelo "A"
    const dias = extraerDias(norm)
    if (dias.length) result["A"] = dias
    return result
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : norm.length
    const dias = extraerDias(norm.slice(start, end))
    const letra = matches[i].letra
    if (dias.length) {
      result[letra] = Array.from(new Set([...(result[letra] || []), ...dias])).sort((a, b) => a - b)
    }
  }
  return result
}

// "2026-05-04" (o Date ISO) → Date local sin desfase de zona horaria
const parseFecha = (s: string): Date | null => {
  if (!s) return null
  const iso = String(s).slice(0, 10)
  const [y, mo, da] = iso.split("-").map(Number)
  if (!y || !mo || !da) return null
  return new Date(y, mo - 1, da)
}

const fmt = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}/${d.getFullYear()}`
}

// Todas las fechas (dd/mm/yyyy) en [inicio, fin] cuyo día de la semana esté en `weekdays`
export function generarFechas(inicio: string, fin: string, weekdays: number[]): string[] {
  if (!inicio || !fin || !weekdays || weekdays.length === 0) return []
  const start = parseFecha(inicio)
  const end = parseFecha(fin)
  if (!start || !end || start > end) return []
  const out: string[] = []
  const d = new Date(start)
  let guard = 0
  while (d <= end && guard < 2000) {
    if (weekdays.includes(d.getDay())) out.push(fmt(d))
    d.setDate(d.getDate() + 1)
    guard++
  }
  return out
}

export interface FechasParalelo {
  paralelo: string
  weekdays: number[]
  dias: string[] // nombres de días, p.ej. ["jueves","viernes"]
  fechas: string[] // dd/mm/yyyy
}

// Devuelve, por paralelo, las fechas candidatas dentro del periodo
export function buildFechasPorParalelo(horario: string, inicio: string, fin: string): FechasParalelo[] {
  const map = parseHorarioParalelos(horario)
  return Object.keys(map)
    .sort()
    .map((p) => ({
      paralelo: p,
      weekdays: map[p],
      dias: map[p].map((n) => NUM_DIA[n]),
      fechas: generarFechas(inicio, fin, map[p]),
    }))
}

// Nombre del día de la semana para una fecha "dd/mm/yyyy"
export function nombreDia(fecha: string): string {
  const mm = (fecha || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!mm) return ""
  const d = new Date(Number(mm[3]), Number(mm[2]) - 1, Number(mm[1]))
  return NUM_DIA[d.getDay()] || ""
}

// Parsea una celda "A: 14/05/2026\nB: 11/05/2026" → { A: "14/05/2026", B: "11/05/2026" }
export function parseFechasCell(text: string): Record<string, string> {
  const res: Record<string, string> = {}
  ;(text || "").split(/[\n;,]+/).forEach((linea) => {
    const mm = linea.match(/([A-Za-z0-9])\s*[:\-]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/)
    if (mm) res[mm[1].toUpperCase()] = mm[2]
  })
  return res
}

// Reconstruye el texto de la celda a partir de las fechas seleccionadas por paralelo,
// respetando el orden de `paralelos`.
export function formatFechasCell(seleccion: Record<string, string>, paralelos: string[]): string {
  return paralelos
    .map((p) => (seleccion[p] ? `${p}: ${seleccion[p]}` : null))
    .filter(Boolean)
    .join("\n")
}

// Busca el texto del "Horario de clases" en cualquier pestaña del syllabus.
export function extraerHorarioClases(tabs: any[] | undefined | null): string {
  if (!Array.isArray(tabs)) return ""
  for (const tab of tabs) {
    for (const row of tab?.rows || []) {
      const cells = row?.cells || []
      const idx = cells.findIndex((c: any) => {
        const t = sinTildes(c?.content || "")
        return t.includes("horario de clase")
      })
      if (idx >= 0) {
        // El valor es la celda de la fila con más texto que menciona "paralelo" o un día
        const candidatas = cells
          .filter((_: any, i: number) => i !== idx)
          .map((c: any) => (c?.content || "").trim())
          .filter((txt: string) => {
            const t = sinTildes(txt)
            return t.includes("paralelo") || Object.keys(DIAS_NUM).some((d) => t.includes(d))
          })
        if (candidatas.length) {
          return candidatas.sort((a: string, b: string) => b.length - a.length)[0]
        }
      }
    }
  }
  return ""
}
