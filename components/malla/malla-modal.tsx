"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface MallaModalProps {
  open: boolean;
  onClose: () => void;
  onMallaSelected: (mallaData: MallaData) => void;
}

interface MallaData {
  codigo_malla: string;
  facultad_id: number;
  carrera_id: number;
  facultad_nombre?: string;
  carrera_nombre?: string;
  esNueva: boolean;
}

interface Facultad {
  id: number;
  nombre: string;
}

interface Carrera {
  id: number;
  nombre: string;
  facultad_id: number;
}

const API_BASE_URL = 'http://localhost:4000/api';

export default function MallaModal({ open, onClose, onMallaSelected }: MallaModalProps) {
  const router = useRouter();
  const { token, getToken } = useAuth();
  const [mallasExistentes, setMallasExistentes] = useState<any[]>([]);
  const [mallaSeleccionadaId, setMallaSeleccionadaId] = useState("");
  const [modoCrear, setModoCrear] = useState(false);
  const [nuevoCodigoMalla, setNuevoCodigoMalla] = useState("");
  
  // Estados para crear nueva malla
  const [facultades, setFacultades] = useState<Facultad[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [carrerasFiltradas, setCarrerasFiltradas] = useState<Carrera[]>([]);
  const [selectedFacultad, setSelectedFacultad] = useState("");
  const [selectedCarrera, setSelectedCarrera] = useState("");
  const [loading, setLoading] = useState(false);

  const apiRequest = async (url: string, options = {}) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    const currentToken = token || getToken();
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentToken}`,
    };

    try {
      const response = await fetch(fullUrl, { ...options, headers });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Error en la petición`);
      }
      return data;
    } catch (error) {
      console.error("Error en la petición:", error);
      return null;
    }
  };

  // Cargar facultades, carreras y mallas existentes al abrir el modal
  useEffect(() => {
    if (open) {
      const cargarDatos = async () => {
        const [facRes, carRes, mallasRes] = await Promise.all([
          apiRequest("/datos-academicos/facultades"),
          apiRequest("/datos-academicos/carreras"),
          apiRequest("/mallas"),
        ]);
        if (facRes) setFacultades(facRes.data || facRes);
        if (carRes) setCarreras(carRes.data || carRes);
        if (mallasRes) setMallasExistentes(mallasRes.data || []);
      };
      cargarDatos();
    }
  }, [open]);

  // Filtrar carreras por facultad
  useEffect(() => {
    if (selectedFacultad) {
      const filtradas = carreras.filter(
        (c) => c.facultad_id.toString() === selectedFacultad
      );
      setCarrerasFiltradas(filtradas);
      setSelectedCarrera("");
    } else {
      setCarrerasFiltradas([]);
    }
  }, [selectedFacultad, carreras]);

  const handleCrearMalla = async () => {
    if (!nuevoCodigoMalla.trim() || !selectedFacultad || !selectedCarrera) {
      alert("Complete todos los campos");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("/mallas", {
        method: "POST",
        body: JSON.stringify({
          codigo_malla: nuevoCodigoMalla,
          facultad_id: parseInt(selectedFacultad),
          carrera_id: parseInt(selectedCarrera),
        }),
      });

      if (response && response.data) {
        const facultad = facultades.find((f) => f.id.toString() === selectedFacultad);
        const carrera = carreras.find((c) => c.id.toString() === selectedCarrera);

        onMallaSelected({
          codigo_malla: nuevoCodigoMalla,
          facultad_id: parseInt(selectedFacultad),
          carrera_id: parseInt(selectedCarrera),
          facultad_nombre: facultad?.nombre,
          carrera_nombre: carrera?.nombre,
          esNueva: true,
        });
        handleClose();
      }
    } catch (error) {
      alert("Error al crear la malla");
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarMallaExistente = () => {
    if (!mallaSeleccionadaId) {
      alert("Por favor seleccione una malla");
      return;
    }

    const malla = mallasExistentes.find((m) => m.id.toString() === mallaSeleccionadaId);
    if (malla) {
      onMallaSelected({
        codigo_malla: malla.codigo_malla,
        facultad_id: malla.facultad_id,
        carrera_id: malla.carrera_id,
        facultad_nombre: malla.facultad?.nombre,
        carrera_nombre: malla.carrera?.nombre,
        esNueva: false,
      });
      handleClose();
    }
  };

  const handleCancelar = () => {
    // Resetear campos pero mantener el modal abierto
    setMallaSeleccionadaId("");
    setNuevoCodigoMalla("");
    setModoCrear(false);
    setSelectedFacultad("");
    setSelectedCarrera("");
    // NO llamar a onClose() - mantener el modal abierto
  };

  const handleClose = () => {
    setMallaSeleccionadaId("");
    setNuevoCodigoMalla("");
    setModoCrear(false);
    setSelectedFacultad("");
    setSelectedCarrera("");
    onClose();
  };

  // Prevenir el cierre del modal - solo permitir cuando se ha seleccionado una malla
  const handleOpenChange = (isOpen: boolean) => {
    // No hacer nada si intentan cerrar - el modal es obligatorio
    if (!isOpen) {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <style jsx global>{`
          [data-radix-dialog-content] > button[aria-label="Close"] {
            display: none !important;
          }
        `}</style>
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#00563F]">
            Código de Malla Curricular
          </DialogTitle>
          <DialogDescription>
            Seleccione una malla existente o cree una nueva
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
          <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-red-800">
            <strong>⚠️ SELECCIÓN OBLIGATORIA:</strong> Debe seleccionar o crear una malla curricular para continuar. No puede cerrar esta ventana sin completar este paso.
          </div>
        </div>

        <div className="space-y-6 py-4">
          {!modoCrear ? (
            <>
              {/* Seleccionar malla existente */}
              <div className="space-y-2">
                <Label htmlFor="mallaSelect">Seleccione una Malla Existente</Label>
                <Select value={mallaSeleccionadaId} onValueChange={setMallaSeleccionadaId}>
                  <SelectTrigger id="mallaSelect">
                    <SelectValue placeholder="Seleccione código de malla" />
                  </SelectTrigger>
                  <SelectContent>
                    {mallasExistentes.map((malla) => (
                      <SelectItem key={malla.id} value={malla.id.toString()}>
                        {malla.codigo_malla} - {malla.facultad?.nombre} - {malla.carrera?.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mostrar detalles de la malla seleccionada */}
              {mallaSeleccionadaId && mallasExistentes.find((m) => m.id.toString() === mallaSeleccionadaId) && (
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-semibold text-green-800 mb-3">
                    ✅ Malla Seleccionada
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Código:</span>
                      <span className="font-semibold">
                        {mallasExistentes.find((m) => m.id.toString() === mallaSeleccionadaId)?.codigo_malla}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Facultad:</span>
                      <span className="font-semibold">
                        {mallasExistentes.find((m) => m.id.toString() === mallaSeleccionadaId)?.facultad?.nombre}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carrera:</span>
                      <span className="font-semibold">
                        {mallasExistentes.find((m) => m.id.toString() === mallaSeleccionadaId)?.carrera?.nombre}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setModoCrear(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Nueva Malla
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Crear nueva malla */}
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Plus className="h-5 w-5" />
                  <h4 className="font-semibold">Crear Nueva Malla</h4>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Código de Malla *</Label>
                    <Input
                      value={nuevoCodigoMalla}
                      onChange={(e) => setNuevoCodigoMalla(e.target.value.toUpperCase())}
                      placeholder="Ej: MALLA-ING-2024"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Facultad *</Label>
                    <Select value={selectedFacultad} onValueChange={setSelectedFacultad}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione facultad" />
                      </SelectTrigger>
                      <SelectContent>
                        {facultades.map((f) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Carrera *</Label>
                    <Select
                      value={selectedCarrera}
                      onValueChange={setSelectedCarrera}
                      disabled={!selectedFacultad || carrerasFiltradas.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione carrera" />
                      </SelectTrigger>
                      <SelectContent>
                        {carrerasFiltradas.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setModoCrear(false);
                  setNuevoCodigoMalla("");
                  setSelectedFacultad("");
                  setSelectedCarrera("");
                }}
                className="w-full"
              >
                Volver a Seleccionar Malla Existente
              </Button>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Menú
          </Button>
          <div className="flex gap-2 flex-1 justify-end">
            <Button variant="outline" onClick={handleCancelar}>
              Cancelar
            </Button>
            {!modoCrear ? (
              <Button
                onClick={handleSeleccionarMallaExistente}
                disabled={!mallaSeleccionadaId}
                className="bg-[#00563F] hover:bg-[#004830]"
              >
                Continuar con esta Malla
              </Button>
            ) : (
              <Button
                onClick={handleCrearMalla}
                disabled={
                  !nuevoCodigoMalla || !selectedFacultad || !selectedCarrera || loading
                }
                className="bg-[#00563F] hover:bg-[#004830]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear y Continuar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
