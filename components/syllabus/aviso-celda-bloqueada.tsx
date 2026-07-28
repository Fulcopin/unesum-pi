"use client"

// Aviso flotante que aparece cuando alguien intenta escribir en una celda
// bloqueada. Sin esto el doble clic simplemente no hacía nada y parecía que la
// aplicación estaba fallando, en vez de que la celda estuviera protegida.
//
// Se cierra solo a los 4 segundos, o al hacer clic en la X.

import { useEffect } from "react"
import { Lock, X } from "lucide-react"

interface Props {
  /** Texto a mostrar. Si es null, no se renderiza nada. */
  mensaje: string | null
  onCerrar: () => void
}

export function AvisoCeldaBloqueada({ mensaje, onCerrar }: Props) {
  useEffect(() => {
    if (!mensaje) return
    const t = setTimeout(onCerrar, 4000)
    return () => clearTimeout(t)
  }, [mensaje, onCerrar])

  if (!mensaje) return null

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 shadow-xl max-w-md animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="bg-amber-500 rounded-lg p-1.5 shrink-0">
        <Lock className="h-4 w-4 text-white" />
      </div>
      <p className="text-sm text-amber-900 leading-snug">{mensaje}</p>
      <button
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className="text-amber-700 hover:text-amber-900 shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
