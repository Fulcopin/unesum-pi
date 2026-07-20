"use client"

// Bloquea el contenido de una página cuando la opción de menú que la gobierna
// está fuera del rango de fechas definido en el cronograma institucional.
// Ocultar la opción del menú no basta: sin esto, cualquiera que conozca la URL
// entraría igual. Se usa envolviendo el contenido de la página:
//
//   <ModuloGuard href="/dashboard/docente/editor-syllabus"> ... </ModuloGuard>

import { usePathname } from "next/navigation"
import Link from "next/link"
import { CalendarClock, ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useModulosOcultos } from "@/lib/use-modulos-ocultos"

function formatearFecha(valor?: string): string {
  if (!valor) return ""
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface ModuloGuardProps {
  /** href de la opción de menú. Si se omite, se usa la ruta actual. */
  href?: string
  children: React.ReactNode
}

export function ModuloGuard({ href, children }: ModuloGuardProps) {
  const pathname = usePathname()
  const clave = href || pathname
  const { estaOculto, ventanaDe, cargando } = useModulosOcultos()

  // Mientras no sabemos el estado, no mostramos el contenido: evita el parpadeo
  // en el que un módulo bloqueado se ve durante un instante.
  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        Verificando disponibilidad...
      </div>
    )
  }

  if (!estaOculto(clave)) return <>{children}</>

  const ventana = ventanaDe(clave)
  const inicio = formatearFecha(ventana?.fecha_inicio)
  const fin = formatearFecha(ventana?.fecha_fin)
  const yaPaso = ventana?.fecha_fin ? new Date(ventana.fecha_fin) < new Date() : false

  return (
    <div className="flex items-center justify-center p-6 min-h-[60vh]">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <CalendarClock className="h-7 w-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Módulo no disponible</h2>
          <p className="text-sm text-gray-600">
            {yaPaso
              ? "El periodo habilitado para esta actividad ya finalizó."
              : "Esta actividad aún no está habilitada."}
          </p>
          {inicio && fin && (
            <div className="rounded-lg bg-gray-50 border p-4 text-sm text-gray-700 space-y-1">
              {ventana?.titulo && <p className="font-medium text-gray-800">{ventana.titulo}</p>}
              <p>
                Disponible del <strong>{inicio}</strong>
              </p>
              <p>
                al <strong>{fin}</strong>
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Si crees que se trata de un error, comunícate con el administrador.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al panel
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
