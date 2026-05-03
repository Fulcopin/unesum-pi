/**
 * Convierte el periodo tal como viene de la BD (id numérico/string o nombre)
 * al value del Select (siempre id como string), para que coincida con SelectItem.
 */
export function periodoAlIdSelect(
  stored: string | number | null | undefined,
  periodos: { id?: number | string; nombre?: string | null }[]
): string {
  if (stored === null || stored === undefined) return "";
  const s = String(stored).trim();
  if (!s || !periodos?.length) return s;
  const byId = periodos.find((p) => String(p.id ?? "") === s);
  if (byId != null) return String(byId.id);
  const norm = (t: string) => t.trim().toLowerCase();
  const byName = periodos.find((p) => norm(String(p.nombre ?? "")) === norm(s));
  if (byName != null) return String(byName.id);
  return s;
}

export function periodoIdCoincideEnLista(
  idStr: string,
  periodos: { id?: number | string }[]
): boolean {
  return !!idStr && periodos.some((p) => String(p.id) === idStr);
}
