// Cliente de las habilitaciones excepcionales de docentes.
//
// Flujo: se pide reabrir un módulo a un docente cuya ventana del cronograma ya
// cerró. Lo puede iniciar el propio docente (queda 'solicitada' hasta que su
// coordinador la eleve) o directamente el coordinador (nace 'pendiente'). En
// ambos casos la autoriza el decano O el director académico —basta uno de los
// dos— y ahí el módulo vuelve a estar visible hasta la fecha límite.

export type EstadoHabilitacion = "solicitada" | "pendiente" | "aprobada" | "rechazada" | "revocada"

export interface Habilitacion {
  id: number
  docente_id: number
  docente_nombre: string | null
  carrera_id: number | null
  carrera_nombre: string | null
  facultad_id: number | null
  modulos: string[]
  modulos_labels: string[]
  motivo: string | null
  fecha_fin: string
  estado: EstadoHabilitacion
  /** quién arrancó el trámite */
  origen: "docente" | "coordinador"
  solicitado_por: number | null
  solicitado_por_nombre: string | null
  tramitado_por: number | null
  tramitado_por_nombre: string | null
  tramitado_en: string | null
  autorizado_por: number | null
  autorizado_por_nombre: string | null
  autorizado_por_rol: string | null
  observacion: string | null
  resuelto_en: string | null
  created_at: string
  /** aprobada y todavía dentro de la fecha límite */
  vigente?: boolean
}

export interface DocenteHabilitable {
  id: number
  nombres: string
  apellidos: string
  nombre_completo: string
  email: string | null
  activo: boolean
  carrera_id: number | null
  carrera_nombre: string | null
  habilitacion: (Habilitacion & { vigente: boolean }) | null
}

export interface ModuloHabilitable {
  key: string
  label: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

/** Fetch autenticado contra /api/habilitaciones; lanza con el mensaje del backend. */
export async function habilitacionesFetch<T = any>(
  token: string,
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}/habilitaciones${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Error ${res.status}`)
  }
  return data?.data as T
}

export const ETIQUETA_ESTADO: Record<EstadoHabilitacion, string> = {
  solicitada: "Esperando a tu coordinador",
  pendiente: "Pendiente de autorización",
  aprobada: "Autorizada",
  rechazada: "Rechazada",
  revocada: "Revocada",
}

/** Quién autorizó, en el lenguaje del sistema de firmas. */
export const ETIQUETA_ROL_AUTORIZADOR: Record<string, string> = {
  decano: "Decano/a de Facultad",
  subdecano: "Subdecano/a",
  direccion: "Director/a Académico/a",
  administrador: "Administrador",
}

export function formatearFecha(valor?: string | null): string {
  if (!valor) return "—"
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Valor por defecto del campo datetime-local: dentro de 7 días. */
export function fechaLimitePorDefecto(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(23, 59, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
