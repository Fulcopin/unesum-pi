"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// Agregamos 'Pencil' a las importaciones
import { Plus, Trash2, Save, Upload, Printer, Info, AlertCircle, CheckCircle, X, Pencil,Home, Loader2 } from "lucide-react"
import { useState, useRef, useMemo, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

// --- COMPONENTES UI SIMPLES ---
const AlertBanner = ({ type, title, message }: { type: 'info' | 'error', title: string, message: string }) => (
  <div className={`p-4 rounded-md border flex items-start gap-3 mb-4 ${
    type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-800'
  }`}>
    {type === 'info' ? <Info className="h-5 w-5 mt-0.5 shrink-0" /> : <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />}
    <div>
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-sm opacity-90">{message}</p>
    </div>
  </div>
);

const ModalDialog = ({ isOpen, onClose, title, message }: { isOpen: boolean, onClose: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-gray-500">{message}</p>
          <Button onClick={onClose} className="w-full mt-2 bg-gray-900 hover:bg-gray-800">Entendido</Button>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, onClose }: { message: string | null, onClose: () => void }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5">
      <CheckCircle className="h-4 w-4 text-emerald-400" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-75"><X className="h-4 w-4" /></button>
    </div>
  );
};
// --- FIN COMPONENTES UI ---

interface PlanificacionSemanalItem {
  id: string
  periodo: string
  semana: string
  fechaInicio: string
  fechaFin: string
  actividades: string
}

export default function PlanificacionAcademica() {
  const { token, getToken } = useAuth()
  const [isAdding, setIsAdding] = useState(false)
  const router = useRouter()
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showFullDialog, setShowFullDialog] = useState(false);
  const [periodStatus, setPeriodStatus] = useState({ current: 0, missing: 16 });

  const [items, setItems] = useState<PlanificacionSemanalItem[]>([])
  
  // Estados para periodos dinámicos
  const [periodos, setPeriodos] = useState<any[]>([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Partial<PlanificacionSemanalItem>>({})
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtener el periodo seleccionado completo
  const periodoActual = useMemo(() => {
    return periodos.find(p => p.nombre === selectedPeriodo)
  }, [periodos, selectedPeriodo])

  // Cargar actividades cuando se selecciona un periodo
  useEffect(() => {
    const fetchActividades = async () => {
      if (!periodoActual?.id) {
        setItems([])
        return
      }

      try {
        const currentToken = token || getToken()
        const response = await fetch(`http://localhost:4000/api/actividades-extracurriculares/periodo/${periodoActual.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
          }
        })
        
        if (!response.ok) {
          console.error('Error al cargar actividades:', response.status)
          setItems([])
          return
        }
        
        const data = await response.json()
        const actividadesArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
        
        // Transformar datos de la BD al formato del componente
        const actividadesFormateadas = actividadesArray.map((a: any) => ({
          id: a.id.toString(),
          periodo: selectedPeriodo,
          semana: a.semana,
          fechaInicio: a.fecha_inicio,
          fechaFin: a.fecha_fin,
          actividades: a.actividades
        }))
        
        setItems(actividadesFormateadas)
      } catch (error) {
        console.error('Error al cargar actividades:', error)
        setItems([])
      }
    }

    if (token && periodoActual) {
      fetchActividades()
    }
  }, [periodoActual, token, getToken, selectedPeriodo])

  // Cargar periodos desde la API
  useEffect(() => {
    const fetchPeriodos = async () => {
      try {
        setLoadingPeriodos(true)
        const currentToken = token || getToken()
        const response = await fetch('http://localhost:4000/api/periodo', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
          }
        })
        
        if (!response.ok) {
          console.error('Error al cargar periodos:', response.status)
          setPeriodos([])
          return
        }
        
        const data = await response.json()
        const periodosArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
        setPeriodos(periodosArray)
        console.log('✅ Periodos cargados:', periodosArray)
      } catch (error) {
        console.error('❌ Error al cargar periodos:', error)
        setPeriodos([])
      } finally {
        setLoadingPeriodos(false)
      }
    }

    if (token) {
      fetchPeriodos()
    }
  }, [token, getToken])

  const handleShowAddForm = () => {
    if (!selectedPeriodo) return;
    setErrorMessage(null);

    const activitiesInPeriod = items.filter(item => item.periodo === selectedPeriodo);
    const totalActivities = activitiesInPeriod.length;
    
    setPeriodStatus({ current: totalActivities, missing: 0 });

    setFormData({ semana: "" })
    setIsAdding(true)
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({})
    setErrorMessage(null)
  }

  const handleEdit = (item: PlanificacionSemanalItem) => {
    setEditingId(item.id)
    setFormData({
      semana: item.semana,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      actividades: item.actividades
    })
    setIsAdding(true)
    setErrorMessage(null)
  }

  const handleSave = async () => {
    setErrorMessage(null);

    if (!selectedPeriodo || !formData.semana || !formData.fechaInicio || !formData.fechaFin || !formData.actividades) {
      setErrorMessage("Por favor, completa todos los campos obligatorios.");
      return;
    }

    if (!periodoActual?.id) {
      setErrorMessage("No se pudo identificar el periodo seleccionado.");
      return;
    }

    // Validar que la fecha final sea mayor que la fecha inicial
    const fechaInicio = new Date(formData.fechaInicio)
    const fechaFin = new Date(formData.fechaFin)
    
    if (fechaFin <= fechaInicio) {
      setErrorMessage("La fecha de fin debe ser posterior a la fecha de inicio.");
      return;
    }

    // Validar que las fechas estén dentro del rango del periodo
    if (periodoActual) {
      if (periodoActual.fecha_inicio && periodoActual.fecha_fin) {
        const periodoInicio = new Date(periodoActual.fecha_inicio)
        const periodoFin = new Date(periodoActual.fecha_fin)
        
        if (fechaInicio < periodoInicio || fechaInicio > periodoFin) {
          setErrorMessage(`La fecha de inicio debe estar entre ${new Date(periodoActual.fecha_inicio).toLocaleDateString()} y ${new Date(periodoActual.fecha_fin).toLocaleDateString()}`);
          return;
        }
        
        if (fechaFin < periodoInicio || fechaFin > periodoFin) {
          setErrorMessage(`La fecha de fin debe estar entre ${new Date(periodoActual.fecha_inicio).toLocaleDateString()} y ${new Date(periodoActual.fecha_fin).toLocaleDateString()}`);
          return;
        }
      }
    }

    const semanaNum = parseInt(formData.semana, 10)
    
    if (isNaN(semanaNum) || semanaNum < 1 || semanaNum > 16) {
      setErrorMessage("El número de semana debe estar estrictamente entre 1 y 16.");
      return;
    }

    // Verificar que no exista una actividad idéntica (mismo periodo, semana y actividad)
    // Si estamos editando, excluimos el item actual de la verificación
    const actividadDuplicada = items.some(i => 
      i.id !== editingId &&
      i.periodo === selectedPeriodo && 
      i.semana === formData.semana && 
      i.actividades.trim().toLowerCase() === formData.actividades?.trim().toLowerCase()
    );
    
    if (actividadDuplicada) {
        setErrorMessage(`Ya existe esta misma actividad registrada en la semana ${formData.semana} de este periodo.`);
        return;
    }

    // Guardar en la base de datos (crear o actualizar)
    try {
      setSaving(true)
      const currentToken = token || getToken()
      
      const payload = {
        periodo_id: periodoActual.id,
        semana: formData.semana,
        fecha_inicio: formData.fechaInicio,
        fecha_fin: formData.fechaFin,
        actividades: formData.actividades
      }

      // Si editingId existe, es una actualización; si no, es una creación
      const isEditing = !!editingId
      const url = isEditing 
        ? `http://localhost:4000/api/actividades-extracurriculares/${editingId}`
        : 'http://localhost:4000/api/actividades-extracurriculares'
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `Error al ${isEditing ? 'actualizar' : 'guardar'} la actividad`)
      }

      const result = await response.json()
      const savedActivity = result.data || result

      if (isEditing) {
        // Actualizar el item existente
        const updatedItems = items.map(item => 
          item.id === editingId 
            ? {
                id: item.id,
                periodo: selectedPeriodo,
                semana: savedActivity.semana,
                fechaInicio: savedActivity.fecha_inicio,
                fechaFin: savedActivity.fecha_fin,
                actividades: savedActivity.actividades
              }
            : item
        )
        
        updatedItems.sort((a, b) => {
          if (a.periodo !== b.periodo) return a.periodo.localeCompare(b.periodo);
          return parseInt(a.semana, 10) - parseInt(b.semana, 10);
        });
        
        setItems(updatedItems)
        setToastMessage("Actividad actualizada correctamente")
      } else {
        // Agregar nuevo item
        const newItem: PlanificacionSemanalItem = {
          id: savedActivity.id.toString(),
          periodo: selectedPeriodo,
          semana: savedActivity.semana,
          fechaInicio: savedActivity.fecha_inicio,
          fechaFin: savedActivity.fecha_fin,
          actividades: savedActivity.actividades
        }

        const updatedItems = [...items, newItem]
        
        updatedItems.sort((a, b) => {
          if (a.periodo !== b.periodo) return a.periodo.localeCompare(b.periodo);
          return parseInt(a.semana, 10) - parseInt(b.semana, 10);
        });
        
        setItems(updatedItems)
        setToastMessage("Actividad guardada correctamente en la base de datos")
      }
      
      handleCancel()
    } catch (error: any) {
      setErrorMessage(error.message || "Error al guardar la actividad")
      console.error('Error:', error)
    } finally {
      setSaving(false)
    } 
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta actividad?')) return;

    try {
      const currentToken = token || getToken()
      const response = await fetch(`http://localhost:4000/api/actividades-extracurriculares/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al eliminar la actividad')
      }

      setItems(items.filter((item) => item.id !== id))
      setToastMessage("Actividad eliminada correctamente")
    } catch (error: any) {
      setErrorMessage(error.message || "Error al eliminar la actividad")
      console.error('Error:', error)
    }
  };
  const handlePrint = () => window.print();
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setToastMessage(`Archivo importado: ${file.name}`);
    event.target.value = '';
  };

  const filteredItems = items.filter(item => item.periodo === selectedPeriodo);

  return (
    <ProtectedRoute allowedRoles={["administrador"]}>
      <style jsx global>{` @media print { .no-print { display: none !important; } .printable-card { box-shadow: none !important; border: 1px solid #dee2e6 !important; } body { background-color: #fff !important; } } `}</style>
      
      <ModalDialog 
        isOpen={showFullDialog} 
        onClose={() => setShowFullDialog(false)} 
        title="Planificación Completa" 
        message="El periodo académico seleccionado ya cuenta con las 16 semanas registradas. No es necesario agregar más actividades."
      />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Planificación de Actividades</h1>
            <div className="flex items-center gap-2">
                <Label htmlFor="periodo-select" className="text-gray-600">Periodo Académico:</Label>
                <Select 
                  value={selectedPeriodo} 
                  onValueChange={(value) => { setSelectedPeriodo(value); setIsAdding(false); }}
                  disabled={loadingPeriodos}
                >
                    <SelectTrigger id="periodo-select" className="w-[220px]">
                      <SelectValue placeholder={loadingPeriodos ? "Cargando..." : "Seleccione un periodo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {periodos.length === 0 ? (
                        <SelectItem value="sin-periodos" disabled>
                          {loadingPeriodos ? "Cargando..." : "No hay periodos disponibles"}
                        </SelectItem>
                      ) : (
                        periodos.map(p => (
                          <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                </Select>
                {loadingPeriodos && <Loader2 className="h-4 w-4 animate-spin text-emerald-600 ml-2" />}
            </div>
          </div>
          <div className="flex gap-3">
            
            <Button onClick={handleImportClick} variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Importar</Button>
            <Button onClick={handlePrint} variant="outline" className="gap-2"><Printer className="h-4 w-4" /> Imprimir PDF</Button>
            
            <Button 
                onClick={handleShowAddForm}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2 transition-colors"
                disabled={!selectedPeriodo || isAdding}
            >
              <Plus className="h-4 w-4" />
              Agregar Actividad
            </Button>
             <Button
                type="button"
                onClick={() => router.push('/dashboard/admin')}
                variant="outline"
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-6 bg-transparent"
                >
                <Home className="h-4 w-4 mr-2" />
                MENÚ
              </Button>
          </div>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".doc,.docx,.xls,.xlsx"/>

        {isAdding && (
          <Card className="mb-8 bg-white border-emerald-100 shadow-md no-print animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-100">
                <CardTitle className="text-emerald-900 flex justify-between items-center">
                    <span>{editingId ? 'Editar Actividad' : 'Nueva Actividad'} para {selectedPeriodo}</span>
                    <span className="text-xs font-normal bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                        Actividades registradas: {periodStatus.current}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                
                <AlertBanner 
                    type="info" 
                    title="Información" 
                    message={`Actualmente hay ${periodStatus.current} actividades registradas en este periodo. Puede agregar múltiples actividades por semana.${
                      periodoActual?.fecha_inicio && periodoActual?.fecha_fin 
                        ? ` Las fechas deben estar entre ${new Date(periodoActual.fecha_inicio).toLocaleDateString()} y ${new Date(periodoActual.fecha_fin).toLocaleDateString()}.`
                        : ''
                    }`} 
                />

                <div className="grid md:grid-cols-3 gap-6 mb-4">
                  <div>
                      <Label htmlFor="semana">Semana</Label>
                      <Input 
                        id="semana" 
                        type="number" 
                        min="1" 
                        max="16" 
                        value={formData.semana || ""} 
                        onChange={(e) => setFormData({ ...formData, semana: e.target.value })} 
                        placeholder="Ej: 4"
                        className="font-medium" 
                      />
                  </div>
                  <div>
                    <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                    <Input 
                      id="fechaInicio" 
                      type="date" 
                      value={formData.fechaInicio || ""} 
                      min={periodoActual?.fecha_inicio || undefined}
                      max={periodoActual?.fecha_fin || undefined}
                      onChange={(e) => {
                        setFormData({ ...formData, fechaInicio: e.target.value })
                        // Limpiar error si existe
                        if (errorMessage?.includes("fecha")) setErrorMessage(null)
                      }} 
                    />
                    {periodoActual?.fecha_inicio && periodoActual?.fecha_fin && (
                      <p className="text-xs text-gray-500 mt-1">
                        Rango: {new Date(periodoActual.fecha_inicio).toLocaleDateString()} - {new Date(periodoActual.fecha_fin).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="fechaFin">Fecha de Fin</Label>
                    <Input 
                      id="fechaFin" 
                      type="date" 
                      value={formData.fechaFin || ""} 
                      min={formData.fechaInicio || periodoActual?.fecha_inicio || undefined}
                      max={periodoActual?.fecha_fin || undefined}
                      onChange={(e) => {
                        setFormData({ ...formData, fechaFin: e.target.value })
                        // Limpiar error si existe
                        if (errorMessage?.includes("fecha")) setErrorMessage(null)
                      }} 
                    />
                    {formData.fechaInicio && formData.fechaFin && new Date(formData.fechaFin) <= new Date(formData.fechaInicio) && (
                      <p className="text-xs text-red-600 mt-1">La fecha de fin debe ser posterior a la de inicio</p>
                    )}
                  </div>
                </div>
                
                <div className="grid gap-2 mb-6">
                    <Label htmlFor="actividades">Actividades</Label>
                    <Textarea id="actividades" value={formData.actividades || ""} onChange={(e) => setFormData({ ...formData, actividades: e.target.value })} placeholder="Describe las actividades a realizar..." rows={4} className="resize-none"/>
                </div>

                {errorMessage && (
                    <AlertBanner type="error" title="Error de validación" message={errorMessage} />
                )}

                <div className="flex gap-3 justify-end pt-2 border-t mt-4">
                  <Button 
                    onClick={handleCancel} 
                    variant="ghost" 
                    className="hover:bg-gray-100 text-gray-600"
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-sm"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar Actividad
                      </>
                    )}
                  </Button>
                </div>
            </CardContent>
          </Card>
        )}

        <Card className="printable-card shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700 w-[100px]">Semana</TableHead>
                    <TableHead className="font-bold text-gray-700 w-[150px]">Fecha de Inicio</TableHead>
                    <TableHead className="font-bold text-gray-700 w-[150px]">Fecha de Fin</TableHead>
                    <TableHead className="font-bold text-gray-700">Actividades</TableHead>
                    <TableHead className="font-bold text-gray-700 w-[160px] text-center no-print">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPeriodo && filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => {
                        const isFirstInWeek = index === 0 || filteredItems[index - 1].semana !== item.semana;
                        const rowSpanWeek = isFirstInWeek ? filteredItems.filter(i => i.semana === item.semana).length : 1;
                        
                        return (
                        <TableRow key={item.id} className="border-b hover:bg-gray-50/50 transition-colors">
                            {isFirstInWeek && (
                                <TableCell className="font-medium text-center align-middle bg-white" rowSpan={rowSpanWeek}>
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-100">
                                        {item.semana}
                                    </span>
                                </TableCell>
                            )}
                            <TableCell className="text-gray-600">{item.fechaInicio}</TableCell>
                            <TableCell className="text-gray-600">{item.fechaFin}</TableCell>
                            <TableCell className="text-gray-800">{item.actividades}</TableCell>
                            <TableCell className="no-print">
                                {/* --- CAMBIO: Acciones con íconos mejorados --- */}
                                <div className="flex gap-1 justify-center">
                                    <Button 
                                        onClick={() => handleEdit(item)}
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                        title="Editar actividad"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        onClick={() => handleDelete(item.id)} 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                                        title="Eliminar actividad"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                {/* -------------------------------------------- */}
                            </TableCell>
                        </TableRow>
                        )
                    })
                  ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                                <Info className="h-8 w-8 text-gray-300" />
                                <p>{selectedPeriodo ? "No hay actividades registradas en este periodo." : "Seleccione un periodo académico para comenzar."}</p>
                            </div>
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </ProtectedRoute>
  )
}