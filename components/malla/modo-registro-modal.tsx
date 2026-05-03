"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ModoRegistroModalProps {
  open: boolean
  onClose: () => void
  onModoSelected: (modo: "personalizada" | "masiva") => void
  codigoMalla?: string
}

export default function ModoRegistroModal({
  open,
  onClose,
  onModoSelected,
  codigoMalla,
}: ModoRegistroModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccione modo de registro</DialogTitle>
          <DialogDescription>
            {codigoMalla
              ? `Malla seleccionada: ${codigoMalla}`
              : "Elija si desea registrar asignaturas manualmente o por carga masiva."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Button
            className="w-full bg-[#00563F] hover:bg-[#004832]"
            onClick={() => onModoSelected("personalizada")}
          >
            Registro personalizada
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onModoSelected("masiva")}
          >
            Carga masiva desde Excel
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
