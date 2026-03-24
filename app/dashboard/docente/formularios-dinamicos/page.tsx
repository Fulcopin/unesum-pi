'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { MainHeader } from '@/components/layout/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, FileText, Calendar, CheckCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { FormularioDinamico } from '@/components/programa-analitico/formulario-dinamico';

interface TituloExtraido {
  id: number;
  titulo: string;
  tipo: string;
  fila: number;
  columna: number;
  columna_letra: string;
  puntuacion: number;
}

interface AgrupacionTitulo {
  id: number;
  nombre_pestana: string;
  descripcion?: string;
  orden: number;
  titulo_ids: number[];
  color: string;
  icono: string;
}

interface SesionExtraccion {
  session_id: string;
  nombre_archivo: string;
  tipo_archivo: string;
  total_titulos: number;
  created_at: string;
  fecha_extraccion?: string;
  periodo_academico?: string;
  periodo_id?: number;
  titulos: TituloExtraido[];
  agrupaciones?: AgrupacionTitulo[];
  agrupadosPorTipo: {
    cabecera: TituloExtraido[];
    titulo_seccion: TituloExtraido[];
    campo: TituloExtraido[];
  };
}

interface FormularioGuardado {
  id: number;
  nombre: string;
  sessionId: string;
  fechaCreacion: string;
  contenido: any;
}

export default function DocenteFormularioDinamicoPage() {
  const [loading, setLoading] = useState(true);
  const [sesiones, setSesiones] = useState<SesionExtraccion[]>([]);
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionExtraccion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [formulariosSaved, setFormulariosSaved] = useState<FormularioGuardado[]>([]);
  const [mostrarGuardados, setMostrarGuardados] = useState(false);
  const [formularioGuardadoSeleccionado, setFormularioGuardadoSeleccionado] = useState<FormularioGuardado | null>(null);
  const [prefillField, setPrefillField] = useState<Record<string, any> | null>(null);
  const [mostrarTabla, setMostrarTabla] = useState(true);
  const [campoSeleccionadoId, setCampoSeleccionadoId] = useState<number | null>(null);
  
  // Estados para filtro de periodo
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('');
  
  const { token } = useAuth();

  useEffect(() => {
    fetchSesiones();
    fetchFormulariosGuardados();
    fetchPeriodos();
  }, []);

  const fetchSesiones = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:4000/api/programa-analitico/sesiones-extraccion', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setSesiones(data.data || []);
      } else {
        setError(data.message || 'Error al cargar sesiones');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodos = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/periodo', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setPeriodos(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando periodos:', err);
    }
  };
    } finally {
      setLoading(false);
    }
  };

  const fetchFormulariosGuardados = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/programa-analitico/formulario-dinamico/mis-formularios', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setFormulariosSaved(data.data || []);
      }
    } catch (err) {
      console.error('Error al cargar formularios guardados:', err);
    }
  };

  const seleccionarSesion = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Cargar títulos de la sesión
      const responseTitulos = await fetch(`http://localhost:4000/api/programa-analitico/sesion-extraccion/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const dataTitulos = await responseTitulos.json();

      if (!dataTitulos.success) {
        setError(dataTitulos.message || 'Error al cargar títulos');
        return;
      }

      // Cargar agrupaciones de la sesión
      const responseAgrupaciones = await fetch(`http://localhost:4000/api/programa-analitico/sesion-extraccion/${sessionId}/agrupaciones`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const dataAgrupaciones = await responseAgrupaciones.json();
      
      console.log('🔍 Agrupaciones recibidas del backend:', dataAgrupaciones);
      
      const sesionConAgrupaciones = {
        ...dataTitulos.data,
        agrupaciones: dataAgrupaciones.success ? dataAgrupaciones.data : []
      };

      console.log('📦 Sesión con agrupaciones completa:', sesionConAgrupaciones);
      console.log('📊 Número de agrupaciones:', sesionConAgrupaciones.agrupaciones?.length || 0);

      setSesionSeleccionada(sesionConAgrupaciones);
      setMostrarTabla(true);
      setPrefillField(null);
      setCampoSeleccionadoId(null);

    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar detalles de la sesión');
    } finally {
      setLoading(false);
    }
  };

  const convertirASecciones = (sesion: SesionExtraccion) => {
    const secciones: any[] = [];

    // Crear una sección principal con campos individuales para cada título
    const todosTitulos = [
      ...(sesion.agrupadosPorTipo?.cabecera || []),
      ...(sesion.agrupadosPorTipo?.titulo_seccion || []),
      ...(sesion.agrupadosPorTipo?.campo || [])
    ];

    if (todosTitulos.length > 0) {
      // Crear campos individuales para cada título
      const campos = todosTitulos.map((titulo, idx) => ({
        id: titulo.id,
        etiqueta: titulo.titulo,
        nombre: `campo_${titulo.id}`,
        tipo_campo: 'text',
        orden: idx,
        requerido: false,
        placeholder: `Ingrese ${titulo.titulo.toLowerCase()}...`
      }));

      secciones.push({
        id: 'formulario_principal',
        titulo: 'Formulario del Programa Analítico',
        tipo: 'campos',
        orden: 0,
        descripcion: `${todosTitulos.length} campos detectados del archivo`,
        campos: campos
      });
    }

    return secciones;
  };

  const convertirAgrupacionesAFormulario = (sesion: SesionExtraccion) => {
    if (!sesion.agrupaciones || sesion.agrupaciones.length === 0) {
      return [];
    }

    return sesion.agrupaciones.map(agrupacion => ({
      id: agrupacion.id,
      nombre_pestana: agrupacion.nombre_pestana,
      descripcion: agrupacion.descripcion,
      orden: agrupacion.orden,
      // Convertir titulo_ids a seccion_ids
      // Cada título se convierte en una "sección" con id = `titulo_${tituloId}`
      seccion_ids: agrupacion.titulo_ids.map(tituloId => `titulo_${tituloId}`),
      color: agrupacion.color,
      icono: agrupacion.icono
    }));
  };

  const convertirASeccionesConAgrupaciones = (sesion: SesionExtraccion) => {
    const secciones: any[] = [];

    // Si hay agrupaciones, crear una sección individual por cada título
    if (sesion.agrupaciones && sesion.agrupaciones.length > 0) {
      const todosTitulos = sesion.titulos || [];
      
      todosTitulos.forEach((titulo) => {
        secciones.push({
          id: `titulo_${titulo.id}`,
          titulo: titulo.titulo,
          tipo: 'campos',
          orden: titulo.id,
          descripcion: '', // Eliminar la descripción que mostraba Fila y Columna
          campos: [{
            id: titulo.id,
            etiqueta: titulo.titulo,
            nombre: `campo_${titulo.id}`,
            tipo_campo: 'text',
            orden: 0,
            requerido: false,
            placeholder: `Ingrese ${titulo.titulo.toLowerCase()}...`
          }]
        });
      });
    } else {
      // Si no hay agrupaciones, usar la lógica anterior
      const todosTitulos = [
        ...(sesion.agrupadosPorTipo?.cabecera || []),
        ...(sesion.agrupadosPorTipo?.titulo_seccion || []),
        ...(sesion.agrupadosPorTipo?.campo || [])
      ];

      if (todosTitulos.length > 0) {
        const campos = todosTitulos.map((titulo, idx) => ({
          id: titulo.id,
          etiqueta: titulo.titulo,
          nombre: `campo_${titulo.id}`,
          tipo_campo: 'text',
          orden: idx,
          requerido: false,
          placeholder: `Ingrese ${titulo.titulo.toLowerCase()}...`
        }));

        secciones.push({
          id: 'formulario_principal',
          titulo: 'Formulario del Programa Analítico',
          tipo: 'campos',
          orden: 0,
          descripcion: `${todosTitulos.length} campos detectados del archivo`,
          campos: campos
        });
      }
    }

    return secciones;
  };

  const handleGuardar = async (contenido: Record<string, any>) => {
    try {
      setGuardando(true);
      setError(null);

      const nombreFormulario = sesionSeleccionada?.nombre_archivo 
        ? `Formulario: ${sesionSeleccionada.nombre_archivo.replace(/\.(xlsx|xls|docx|doc)$/i, '')}`
        : 'Formulario Dinámico';

      const response = await fetch('http://localhost:4000/api/programa-analitico/formulario-dinamico/guardar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sesionSeleccionada?.session_id,
          contenido: contenido,
          nombreFormulario: nombreFormulario
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        setSesionSeleccionada(null);
        fetchFormulariosGuardados(); // Recargar lista de guardados
      } else {
        setError(data.message || 'Error al guardar el formulario');
      }
      
    } catch (err) {
      console.error('Error:', err);
      setError('Error al guardar el contenido');
    } finally {
      setGuardando(false);
    }
  };

  const abrirFormularioGuardado = async (formulario: FormularioGuardado) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar la sesión original usando el sessionId
      const sesionOriginal = sesiones.find(s => s.session_id === formulario.sessionId);
      
      if (!sesionOriginal) {
        // Si no está en memoria, intentar cargar desde el backend
        const response = await fetch(`http://localhost:4000/api/programa-analitico/sesion-extraccion/${formulario.sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (data.success && data.data) {
          setSesionSeleccionada(data.data);
        } else {
          setError('No se pudo cargar la información de la sesión original');
        }
      } else {
        setSesionSeleccionada(sesionOriginal);
      }
      
      // Guardar el formulario seleccionado para pre-llenar los datos
      setFormularioGuardadoSeleccionado(formulario);
      setMostrarGuardados(false);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Error al abrir el formulario guardado');
    } finally {
      setLoading(false);
    }
  };

  const cerrarFormularioGuardado = () => {
    setFormularioGuardadoSeleccionado(null);
    setSesionSeleccionada(null);
    setPrefillField(null);
    setMostrarTabla(true);
    setCampoSeleccionadoId(null);
  };

  const handleSeleccionarCampo = (campo: TituloExtraido) => {
    // Preparar prefill para que el FormularioDinamico muestre este campo
    const key = `formulario_principal`;
    const fieldName = `campo_${campo.id}`;
    setPrefillField({ [key]: { [fieldName]: '' } });
    setCampoSeleccionadoId(campo.id);
    
    // Ocultar la tabla y mostrar el formulario
    setMostrarTabla(false);
    setFormularioGuardadoSeleccionado(null);
    
    // Scroll suave hacia el formulario después de un breve delay
    setTimeout(() => {
      const formularioElement = document.getElementById('formulario-dinamico');
      if (formularioElement) {
        formularioElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Intentar hacer focus en el campo específico
      setTimeout(() => {
        const inputElement = document.getElementById(`campo-${campo.id}`) as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
          inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }, 100);
  };

  return (
    <ProtectedRoute allowedRoles={['docente', 'profesor']}>
      <div className="min-h-screen bg-gray-50">
        <MainHeader />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/dashboard/docente">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
            </Link>
            
            <div className="flex gap-2">
              <Button 
                variant={!mostrarGuardados ? "default" : "outline"}
                size="sm"
                onClick={() => setMostrarGuardados(false)}
              >
                Formularios Disponibles
              </Button>
              <Button 
                variant={mostrarGuardados ? "default" : "outline"}
                size="sm"
                onClick={() => setMostrarGuardados(true)}
              >
                Mis Formularios ({formulariosSaved.length})
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#00563F] mb-2">
              📝 Formularios Dinámicos
            </h1>
            <p className="text-gray-600">
              Completa los formularios generados automáticamente desde archivos Excel/Word
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : mostrarGuardados ? (
            // VISTA DE FORMULARIOS GUARDADOS
            <Card>
              <CardHeader>
                <CardTitle>Mis Formularios Guardados</CardTitle>
                <CardDescription>
                  Formularios que has completado y guardado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mostrar pestañas si hay agrupaciones creadas por el admin */}
                {sesionSeleccionada && sesionSeleccionada.agrupaciones && sesionSeleccionada.agrupaciones.length > 0 ? (
                  <div className="mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800">
                        ✅ <strong>Pestañas organizadas por el administrador</strong> - Los campos están agrupados para facilitar el llenado del formulario.
                      </p>
                    </div>
                    <h3 className="text-lg font-medium mb-3">Campos organizados en pestañas</h3>
                    <Tabs defaultValue={sesionSeleccionada.agrupaciones[0]?.nombre_pestana || 'default'} className="w-full">
                      <TabsList className="w-full flex-wrap h-auto">
                        {sesionSeleccionada.agrupaciones
                          .sort((a, b) => a.orden - b.orden)
                          .map((agrupacion) => (
                            <TabsTrigger
                              key={agrupacion.id}
                              value={agrupacion.nombre_pestana}
                              className="flex items-center gap-2"
                            >
                              <span>{agrupacion.icono}</span>
                              <span>{agrupacion.nombre_pestana}</span>
                              <Badge variant="secondary" className="ml-1">
                                {agrupacion.titulo_ids.length}
                              </Badge>
                            </TabsTrigger>
                          ))}
                      </TabsList>

                      {sesionSeleccionada.agrupaciones.map((agrupacion) => (
                        <TabsContent key={agrupacion.id} value={agrupacion.nombre_pestana} className="mt-4">
                          {agrupacion.descripcion && (
                            <p className="text-sm text-muted-foreground mb-4">{agrupacion.descripcion}</p>
                          )}
                          <div className="overflow-x-auto">
                            <table className="w-full table-auto border-collapse">
                              <thead>
                                <tr className="text-left text-sm text-muted-foreground">
                                  <th className="p-3 border-b">#</th>
                                  <th className="p-3 border-b">Título</th>
                                  <th className="p-3 border-b">Fila</th>
                                  <th className="p-3 border-b">Columna</th>
                                  <th className="p-3 border-b">Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {agrupacion.titulo_ids.map((tituloId, idx) => {
                                  const titulo = sesionSeleccionada.titulos.find(t => t.id === tituloId);
                                  if (!titulo) return null;
                                  return (
                                    <tr key={titulo.id} className="hover:bg-muted/30">
                                      <td className="p-3 border-b align-top">{idx + 1}</td>
                                      <td className="p-3 border-b align-top">{titulo.titulo}</td>
                                      <td className="p-3 border-b align-top">{titulo.fila}</td>
                                      <td className="p-3 border-b align-top">{titulo.columna_letra}</td>
                                      <td className="p-3 border-b align-top">
                                        <Button size="sm" variant="ghost" onClick={() => {
                                          const key = `formulario_principal`;
                                          const fieldName = `campo_${titulo.id}`;
                                          setPrefillField({ [key]: { [fieldName]: '' } });
                                          setFormularioGuardadoSeleccionado(null);
                                          setSesionSeleccionada(sesionSeleccionada);
                                        }}>
                                          Prellenar
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                ) : (
                  /* Mostrar tabla simple si no hay agrupaciones */
                  sesionSeleccionada && sesionSeleccionada.agrupadosPorTipo?.campo && sesionSeleccionada.agrupadosPorTipo.campo.length > 0 ? (
                    <div className="mb-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-yellow-800">
                          ℹ️ <strong>Sin organización de pestañas</strong> - El administrador aún no ha organizado los campos en pestañas. Se muestran todos los campos en una lista.
                        </p>
                      </div>
                      <h3 className="text-lg font-medium mb-3">Campos detectados en la sesión</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto border-collapse">
                          <thead>
                            <tr className="text-left text-sm text-muted-foreground">
                              <th className="p-3 border-b">#</th>
                              <th className="p-3 border-b">Título</th>
                              <th className="p-3 border-b">Fila</th>
                              <th className="p-3 border-b">Columna</th>
                              <th className="p-3 border-b">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sesionSeleccionada!.agrupadosPorTipo!.campo.map((c, idx) => (
                              <tr key={c.id} className="hover:bg-muted/30">
                                <td className="p-3 border-b align-top">{idx + 1}</td>
                                <td className="p-3 border-b align-top">{c.titulo}</td>
                                <td className="p-3 border-b align-top">{c.fila}</td>
                                <td className="p-3 border-b align-top">{c.columna_letra}</td>
                                <td className="p-3 border-b align-top">
                                  <Button size="sm" variant="ghost" onClick={() => {
                                    const key = `formulario_principal`;
                                    const fieldName = `campo_${c.id}`;
                                    setPrefillField({ [key]: { [fieldName]: '' } });
                                    setFormularioGuardadoSeleccionado(null);
                                    setSesionSeleccionada(sesionSeleccionada);
                                  }}>
                                    Prellenar
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null
                )}
                
                {formulariosSaved.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No has guardado ningún formulario todavía</p>
                    <p className="text-sm">Completa un formulario disponible para verlo aquí</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formulariosSaved.map((form) => (
                      <div
                        key={form.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <h4 className="font-semibold">{form.nombre}</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(form.fechaCreacion).toLocaleDateString('es-ES')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span className="text-xs font-mono">{form.sessionId}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => abrirFormularioGuardado(form)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : !sesionSeleccionada ? (
            // VISTA DE SESIONES DISPONIBLES
            <Card>
              <CardHeader>
                <CardTitle>Formularios Disponibles</CardTitle>
                <CardDescription>
                  Selecciona un formulario para completar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtro de Periodo */}
                <div className="mb-6">
                  <Label htmlFor="periodoFiltro" className="mb-2 block">Filtrar por Periodo Académico</Label>
                  <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los periodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los periodos</SelectItem>
                      {periodos.map((periodo) => (
                        <SelectItem key={periodo.id} value={periodo.id.toString()}>
                          {periodo.nombre} ({periodo.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {sesiones.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay formularios disponibles</p>
                    <p className="text-sm">Contacta al administrador para que extraiga formularios</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sesiones
                      .filter(sesion => !periodoFiltro || sesion.periodo_id?.toString() === periodoFiltro)
                      .map((sesion) => (
                      <div
                        key={sesion.session_id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => seleccionarSesion(sesion.session_id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <h4 className="font-semibold">{sesion.nombre_archivo}</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>{sesion.total_titulos} títulos detectados</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(sesion.created_at).toLocaleDateString('es-ES')}</span>
                              </div>
                            </div>
                            {sesion.periodo_academico && (
                              <Badge variant="outline" className="text-xs">
                                📅 {sesion.periodo_academico}
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline">
                            Abrir Formulario
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {formularioGuardadoSeleccionado 
                          ? formularioGuardadoSeleccionado.nombre 
                          : sesionSeleccionada.nombre_archivo}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formularioGuardadoSeleccionado 
                          ? `Formulario guardado el ${new Date(formularioGuardadoSeleccionado.fechaCreacion).toLocaleDateString('es-ES')}`
                          : `${sesionSeleccionada.total_titulos} títulos detectados • ${sesionSeleccionada.tipo_archivo}`}
                      </CardDescription>
                    </div>
                    {formularioGuardadoSeleccionado && (
                      <Badge variant="secondary" className="ml-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Guardado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (formularioGuardadoSeleccionado) {
                        cerrarFormularioGuardado();
                      } else {
                        setSesionSeleccionada(null);
                        setPrefillField(null);
                        setMostrarTabla(true);
                        setCampoSeleccionadoId(null);
                      }
                    }}
                  >
                    ← Volver a la lista
                  </Button>
                </CardContent>
              </Card>

              {/* PESTAÑAS ORGANIZADAS POR EL ADMIN O TABLA SIMPLE */}
              {mostrarTabla && sesionSeleccionada && sesionSeleccionada.titulos && sesionSeleccionada.titulos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {sesionSeleccionada.agrupaciones && sesionSeleccionada.agrupaciones.length > 0
                        ? 'Campos organizados en pestañas'
                        : `Títulos detectados en esta sesión (${sesionSeleccionada.total_titulos})`}
                    </CardTitle>
                    <CardDescription>
                      Selecciona un título para completarlo en el formulario
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Mostrar pestañas si hay agrupaciones creadas por el admin */}
                    {sesionSeleccionada.agrupaciones && sesionSeleccionada.agrupaciones.length > 0 ? (
                      <div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-green-800">
                            ✅ <strong>Pestañas organizadas por el administrador</strong> - Los campos están agrupados para facilitar el llenado del formulario.
                          </p>
                        </div>
                        <Tabs defaultValue={sesionSeleccionada.agrupaciones[0]?.nombre_pestana || 'default'} className="w-full">
                          <TabsList className="w-full flex-wrap h-auto">
                            {sesionSeleccionada.agrupaciones
                              .sort((a, b) => a.orden - b.orden)
                              .map((agrupacion) => (
                                <TabsTrigger
                                  key={agrupacion.id}
                                  value={agrupacion.nombre_pestana}
                                  className="flex items-center gap-2"
                                >
                                  <span>{agrupacion.icono}</span>
                                  <span>{agrupacion.nombre_pestana}</span>
                                  <Badge variant="secondary" className="ml-1">
                                    {agrupacion.titulo_ids.length}
                                  </Badge>
                                </TabsTrigger>
                              ))}
                          </TabsList>

                          {sesionSeleccionada.agrupaciones.map((agrupacion) => (
                            <TabsContent key={agrupacion.id} value={agrupacion.nombre_pestana} className="mt-4">
                              {agrupacion.descripcion && (
                                <p className="text-sm text-muted-foreground mb-4">{agrupacion.descripcion}</p>
                              )}
                              <div className="overflow-x-auto">
                                <table className="w-full table-auto border-collapse">
                                  <thead>
                                    <tr className="bg-muted/50 text-left text-sm font-medium">
                                      <th className="p-3 border">#</th>
                                      <th className="p-3 border">Título</th>
                                      <th className="p-3 border">Tipo</th>
                                      <th className="p-3 border">Fila</th>
                                      <th className="p-3 border">Columna</th>
                                      <th className="p-3 border">Acción</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {agrupacion.titulo_ids.map((tituloId, idx) => {
                                      const titulo = sesionSeleccionada.titulos.find(t => t.id === tituloId);
                                      if (!titulo) return null;
                                      return (
                                        <tr 
                                          key={titulo.id} 
                                          className={`hover:bg-muted/30 transition-colors ${campoSeleccionadoId === titulo.id ? 'bg-emerald-50' : ''}`}
                                        >
                                          <td className="p-3 border text-center">{idx + 1}</td>
                                          <td className="p-3 border font-medium">{titulo.titulo}</td>
                                          <td className="p-3 border text-center">
                                            <Badge 
                                              variant={
                                                titulo.tipo === 'cabecera' ? 'default' : 
                                                titulo.tipo === 'titulo_seccion' ? 'secondary' : 
                                                'outline'
                                              }
                                              className={
                                                titulo.tipo === 'cabecera' ? 'bg-blue-500 text-white' :
                                                titulo.tipo === 'titulo_seccion' ? 'bg-purple-500 text-white' :
                                                'bg-green-500 text-white'
                                              }
                                            >
                                              {titulo.tipo === 'cabecera' ? '📋 Cabecera' :
                                               titulo.tipo === 'titulo_seccion' ? '📑 Sección' :
                                               '📝 Campo'}
                                            </Badge>
                                          </td>
                                          <td className="p-3 border text-center">{titulo.fila}</td>
                                          <td className="p-3 border text-center">{titulo.columna_letra}</td>
                                          <td className="p-3 border text-center">
                                            <Button 
                                              size="sm" 
                                              variant={campoSeleccionadoId === titulo.id ? "default" : "outline"}
                                              onClick={() => handleSeleccionarCampo(titulo)}
                                            >
                                              {campoSeleccionadoId === titulo.id ? '✓ Seleccionado' : 'Seleccionar'}
                                            </Button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </TabsContent>
                          ))}
                        </Tabs>
                      </div>
                    ) : (
                      /* Mostrar tabla simple si no hay agrupaciones */
                      <div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-yellow-800">
                            ℹ️ <strong>Sin organización de pestañas</strong> - El administrador aún no ha organizado los campos en pestañas. Se muestran todos los campos en una lista.
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full table-auto border-collapse">
                        <thead>
                          <tr className="bg-muted/50 text-left text-sm font-medium">
                            <th className="p-3 border">#</th>
                            <th className="p-3 border">Título</th>
                            <th className="p-3 border">Tipo</th>
                            <th className="p-3 border">Fila</th>
                            <th className="p-3 border">Columna</th>
                            <th className="p-3 border">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sesionSeleccionada.titulos.map((c, idx) => (
                            <tr 
                              key={c.id} 
                              className={`hover:bg-muted/30 transition-colors ${campoSeleccionadoId === c.id ? 'bg-emerald-50' : ''}`}
                            >
                              <td className="p-3 border text-center">{idx + 1}</td>
                              <td className="p-3 border font-medium">{c.titulo}</td>
                              <td className="p-3 border text-center">
                                <Badge 
                                  variant={
                                    c.tipo === 'cabecera' ? 'default' : 
                                    c.tipo === 'titulo_seccion' ? 'secondary' : 
                                    'outline'
                                  }
                                  className={
                                    c.tipo === 'cabecera' ? 'bg-blue-500 text-white' :
                                    c.tipo === 'titulo_seccion' ? 'bg-purple-500 text-white' :
                                    'bg-green-500 text-white'
                                  }
                                >
                                  {c.tipo === 'cabecera' ? '📋 Cabecera' :
                                   c.tipo === 'titulo_seccion' ? '📑 Sección' :
                                   '📝 Campo'}
                                </Badge>
                              </td>
                              <td className="p-3 border text-center">{c.fila}</td>
                              <td className="p-3 border text-center">{c.columna_letra}</td>
                              <td className="p-3 border text-center">
                                <Button 
                                  size="sm" 
                                  variant={campoSeleccionadoId === c.id ? "default" : "outline"}
                                  onClick={() => handleSeleccionarCampo(c)}
                                >
                                  {campoSeleccionadoId === c.id ? '✓ Seleccionado' : 'Seleccionar'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Formulario - Mostrar cuando mostrarTabla es false o cuando hay formulario guardado */}
              {(!mostrarTabla || formularioGuardadoSeleccionado) && (
                <div id="formulario-dinamico">
                  <FormularioDinamico
                    secciones={convertirASeccionesConAgrupaciones(sesionSeleccionada)}
                    agrupaciones={convertirAgrupacionesAFormulario(sesionSeleccionada)}
                    contenidoInicial={
                      prefillField
                        ? { ...(formularioGuardadoSeleccionado?.contenido || {}), ...prefillField }
                        : (formularioGuardadoSeleccionado?.contenido || {})
                    }
                    onGuardar={handleGuardar}
                    onCancelar={() => {
                      if (formularioGuardadoSeleccionado) {
                        cerrarFormularioGuardado();
                      } else {
                        setMostrarTabla(true);
                        setPrefillField(null);
                        setCampoSeleccionadoId(null);
                      }
                    }}
                    guardando={guardando}
                    error={error}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
