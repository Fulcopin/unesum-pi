// Catálogo de opciones de menú que el admin puede gobernar desde el cronograma.
// La clave de cada módulo es su `href` (única), que es lo que se guarda en la
// columna `modulo` de cronograma_eventos y lo que los paneles comparan para
// ocultar la opción cuando la fecha actual está fuera del rango del evento.

export interface ModuloMenu {
  key: string // href de la opción
  label: string
}

export const MODULOS_POR_ROL: Record<string, ModuloMenu[]> = {
  docente: [
    { key: "/dashboard/docente/mis-documentos", label: "Ver e Imprimir mis documentos" },
    { key: "/dashboard/docente/mis-revisiones", label: "Revisiones y Comentarios" },
    { key: "/dashboard/docente/editor-syllabus", label: "Editar Syllabus" },
    { key: "/dashboard/docente/editor-programa-analitico", label: "Editar Programa Analítico" },
    { key: "/dashboard/docente/mis-firmas", label: "Firmar mis documentos" },
    { key: "/dashboard/docente/mi-qr", label: "Mi QR Personal" },
  ],
  comision: [
    { key: "/dashboard/comision/editor-syllabus", label: "Editor de Syllabus" },
    { key: "/dashboard/comision/editor-programa-analitico", label: "Editor de Programa Analítico" },
    { key: "/dashboard/comision/asignaturas", label: "Gestión de Asignaturas" },
    { key: "/dashboard/comision/documentos-docentes", label: "Documentos de Docentes" },
    { key: "/dashboard/comision/programa-analitico", label: "Extracción Programa Analítico" },
    { key: "/dashboard/comision/syllabus", label: "Extracción Syllabus" },
    { key: "/dashboard/comision/comparar-documentos", label: "Comparar Documentos" },
    { key: "/dashboard/comision/syllabus-formularios", label: "Syllabus Extraídos" },
    { key: "/dashboard/comision/mis-firmas", label: "Mis Documentos para Firmar" },
    { key: "/dashboard/comision/mi-qr", label: "Mi QR Personal" },
  ],
  administrador: [
    { key: "/dashboard/admin/editor-syllabus", label: "Editor de Syllabus" },
    { key: "/dashboard/admin/programa-analitico", label: "Programa Analítico" },
    { key: "/dashboard/admin/metodologia", label: "Metodologías" },
    { key: "/dashboard/admin/escenario", label: "Escenarios de Aprendizaje" },
    { key: "/dashboard/admin/planificacion-academica", label: "Planificación Académica" },
    { key: "/dashboard/admin/malla-curricular", label: "Malla Curricular" },
    { key: "/dashboard/admin/mis-firmas", label: "Mis Documentos para Firmar" },
  ],
}

// Módulos seleccionables para un rol del cronograma.
// "todos" ofrece la unión de todos los módulos.
export function modulosDeRol(rol: string): ModuloMenu[] {
  if (rol && rol !== "todos" && MODULOS_POR_ROL[rol]) return MODULOS_POR_ROL[rol]
  const vistos = new Set<string>()
  const union: ModuloMenu[] = []
  Object.values(MODULOS_POR_ROL).forEach((lista) =>
    lista.forEach((m) => {
      if (!vistos.has(m.key)) {
        vistos.add(m.key)
        union.push(m)
      }
    })
  )
  return union
}

export function etiquetaModulo(key: string): string {
  for (const lista of Object.values(MODULOS_POR_ROL)) {
    const m = lista.find((x) => x.key === key)
    if (m) return m.label
  }
  return key
}
