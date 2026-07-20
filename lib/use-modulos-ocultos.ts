"use client"

// Hook que devuelve las opciones de menú que deben ocultarse AHORA para el
// usuario actual, según los eventos del cronograma (columna `modulo`).
// Una opción gobernada por el cronograma solo es visible dentro del rango
// [fecha_inicio, fecha_fin] del evento; fuera de él se oculta.

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

/** Ventana de disponibilidad de una opción gobernada por el cronograma */
export interface VentanaModulo {
  visible: boolean
  titulo: string
  fecha_inicio: string
  fecha_fin: string
}

export function useModulosOcultos() {
  const { token, getToken } = useAuth()
  const [ocultos, setOcultos] = useState<string[]>([])
  const [ventanas, setVentanas] = useState<Record<string, VentanaModulo>>({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
    let cancelado = false

    ;(async () => {
      try {
        const authToken = getToken?.() || token
        if (!authToken) {
          if (!cancelado) setCargando(false)
          return
        }
        const res = await fetch(`${API_URL}/cronograma/modulos-ocultos`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        if (!cancelado) {
          setOcultos(Array.isArray(data?.data?.ocultos) ? data.data.ocultos : [])
          setVentanas(data?.data?.ventanas && typeof data.data.ventanas === "object" ? data.data.ventanas : {})
        }
      } catch {
        // Ante un fallo no ocultamos nada (no dejar al usuario sin menú)
        if (!cancelado) {
          setOcultos([])
          setVentanas({})
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    })()

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const estaOculto = (href: string) => ocultos.includes(href)
  const ventanaDe = (href: string): VentanaModulo | undefined => ventanas[href]

  return { ocultos, ventanas, estaOculto, ventanaDe, cargando }
}
