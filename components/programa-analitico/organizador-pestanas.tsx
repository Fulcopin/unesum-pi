'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Save, 
  Trash2, 
  GripVertical, 
  Eye,
  ChevronUp,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface Titulo {
  id: number;
  titulo: string;
  tipo: string;
  fila: number;
  columna_letra: string;
}

interface Pestana {
  id?: number;
  nombre_pestana: string;
  descripcion?: string;
  orden: number;
  titulo_ids: number[];
  color: string;
  icono: string;
}

interface OrganizadorPestanasProps {
  sessionId: string;
  titulos: Titulo[];
  onGuardar?: () => void;
  apiBaseUrl?: string; // URL base de la API (por defecto: programa-analitico)
}

const ICONOS_DISPONIBLES = [
  { value: '📋', label: '📋 Formulario' },
  { value: '🎯', label: '🎯 Objetivos' },
  { value: '📚', label: '📚 Contenidos' },
  { value: '✍️', label: '✍️ Metodología' },
  { value: '📊', label: '📊 Evaluación' },
  { value: '📖', label: '📖 Bibliografía' },
  { value: '👥', label: '👥 Datos Generales' },
  { value: '📝', label: '📝 Descripción' },
  { value: '🔬', label: '🔬 Laboratorio' },
  { value: '💼', label: '💼 Práctica' }
];

const COLORES_DISPONIBLES = [
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'purple', label: 'Morado', class: 'bg-purple-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'orange', label: 'Naranja', class: 'bg-orange-500' },
  { value: 'red', label: 'Rojo', class: 'bg-red-500' },
  { value: 'teal', label: 'Turquesa', class: 'bg-teal-500' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  { value: 'indigo', label: 'Índigo', class: 'bg-indigo-500' }
];

export function OrganizadorPestanas({ 
  sessionId, 
  titulos, 
  onGuardar,
  apiBaseUrl = 'http://localhost:4000/api/programa-analitico' 
}: OrganizadorPestanasProps) {
  const [pestanas, setPestanas] = useState<Pestana[]>([]);
  const [titulosSinAsignar, setTitulosSinAsignar] = useState<Titulo[]>(titulos);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [nuevoTituloTexto, setNuevoTituloTexto] = useState('');

  // Filtrar nombres de personas (títulos que empiezan con Ing., Lic., Mg., Dr., etc.)
  const esNombrePersona = (texto: string): boolean => {
    const patronesNombres = /^(Ing\.|Lic\.|Mg\.|Dr\.|Dra\.|MSc\.|PhD\.|Prof\.|Profesor|Profesora|MSIG|Mgs\.|Mgtr\.)/i;
    return patronesNombres.test(texto.trim());
  };

  useEffect(() => {
    cargarAgrupaciones();
  }, [sessionId]);

  const cargarAgrupaciones = async () => {
    try {
      setCargando(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('No se encontró token de autenticación');
        crearPestanaPorDefecto();
        setCargando(false);
        return;
      }

      const response = await fetch(
        `${apiBaseUrl}/sesion-extraccion/${sessionId}/agrupaciones`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 403) {
        setError('No tienes permisos para acceder a esta funcionalidad. Debes ser administrador.');
        crearPestanaPorDefecto();
        setCargando(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        setPestanas(data.data);
        actualizarTitulosSinAsignar(data.data);
      } else {
        // Si no hay agrupaciones, crear una pestaña por defecto
        crearPestanaPorDefecto();
      }
    } catch (error) {
      console.error('Error al cargar agrupaciones:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar agrupaciones');
      crearPestanaPorDefecto();
    } finally {
      setCargando(false);
    }
  };

  const crearPestanaPorDefecto = () => {
    const pestanaDefault: Pestana = {
      nombre_pestana: 'Datos Generales',
      descripcion: 'Información básica del programa analítico',
      orden: 0,
      titulo_ids: [],
      color: 'blue',
      icono: '📋'
    };
    setPestanas([pestanaDefault]);
  };

  const actualizarTitulosSinAsignar = (pestanasActuales: Pestana[]) => {
    const idsAsignados = pestanasActuales.flatMap(p => p.titulo_ids);
    const sinAsignar = titulos.filter(t => 
      !idsAsignados.includes(t.id) && !esNombrePersona(t.titulo)
    );
    setTitulosSinAsignar(sinAsignar);
  };

  const agregarPestana = () => {
    const nuevaPestana: Pestana = {
      nombre_pestana: `Pestaña ${pestanas.length + 1}`,
      descripcion: '',
      orden: pestanas.length,
      titulo_ids: [],
      color: COLORES_DISPONIBLES[pestanas.length % COLORES_DISPONIBLES.length].value,
      icono: ICONOS_DISPONIBLES[pestanas.length % ICONOS_DISPONIBLES.length].value
    };
    setPestanas([...pestanas, nuevaPestana]);
  };

  const eliminarPestana = (index: number) => {
    if (pestanas.length === 1) {
      setError('Debe haber al menos una pestaña');
      return;
    }
    const nuevasPestanas = pestanas.filter((_, i) => i !== index);
    setPestanas(nuevasPestanas);
    actualizarTitulosSinAsignar(nuevasPestanas);
  };

  const moverPestana = (index: number, direccion: 'up' | 'down') => {
    const nuevasPestanas = [...pestanas];
    const nuevoIndex = direccion === 'up' ? index - 1 : index + 1;
    
    if (nuevoIndex < 0 || nuevoIndex >= nuevasPestanas.length) return;
    
    [nuevasPestanas[index], nuevasPestanas[nuevoIndex]] = 
    [nuevasPestanas[nuevoIndex], nuevasPestanas[index]];
    
    // Actualizar orden
    nuevasPestanas.forEach((p, i) => p.orden = i);
    setPestanas(nuevasPestanas);
  };

  const agregarTituloAPestana = (pestanaIndex: number, titulo: Titulo) => {
    const nuevasPestanas = [...pestanas];
    if (!nuevasPestanas[pestanaIndex].titulo_ids.includes(titulo.id)) {
      nuevasPestanas[pestanaIndex].titulo_ids.push(titulo.id);
      setPestanas(nuevasPestanas);
      actualizarTitulosSinAsignar(nuevasPestanas);
    }
  };

  const agregarTituloPersonalizado = () => {
    if (!nuevoTituloTexto.trim()) {
      setError('Ingresa un texto para el nuevo título');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Crear un nuevo título temporal con ID negativo para distinguirlo
    const nuevoId = -(titulos.length + titulosSinAsignar.length + 1);
    const nuevoTitulo: Titulo = {
      id: nuevoId,
      titulo: nuevoTituloTexto.trim(),
      tipo: 'personalizado',
      fila: 0,
      columna_letra: 'N/A'
    };

    // Agregar al array de títulos y títulos sin asignar
    titulos.push(nuevoTitulo);
    setTitulosSinAsignar([...titulosSinAsignar, nuevoTitulo]);
    setNuevoTituloTexto('');
    setExito(`✅ Título "${nuevoTitulo.titulo}" agregado`);
    setTimeout(() => setExito(null), 3000);
  };

  const quitarTituloDePestana = (pestanaIndex: number, tituloId: number) => {
    const nuevasPestanas = [...pestanas];
    nuevasPestanas[pestanaIndex].titulo_ids = 
      nuevasPestanas[pestanaIndex].titulo_ids.filter(id => id !== tituloId);
    setPestanas(nuevasPestanas);
    actualizarTitulosSinAsignar(nuevasPestanas);
  };

  const guardarAgrupaciones = async () => {
    try {
      setGuardando(true);
      setError(null);
      setExito(null);

      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${apiBaseUrl}/sesion-extraccion/${sessionId}/agrupaciones`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ agrupaciones: pestanas })
        }
      );

      const data = await response.json();
      if (data.success) {
        setExito('✅ Organización guardada correctamente');
        if (onGuardar) onGuardar();
        setTimeout(() => setExito(null), 3000);
      } else {
        setError(data.message || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setError('Error al guardar la organización');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando organización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Organizar en Pestañas
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Arrastra los títulos a las pestañas correspondientes para organizar el formulario
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setVistaPrevia(!vistaPrevia)} 
            variant="outline"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            {vistaPrevia ? 'Editar' : 'Vista Previa'}
          </Button>
          <Button onClick={agregarPestana} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Pestaña
          </Button>
          <Button onClick={guardarAgrupaciones} disabled={guardando} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {exito && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{exito}</AlertDescription>
        </Alert>
      )}

      {/* Agregar título personalizado */}
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            ✨ Crear Título Personalizado
          </CardTitle>
          <CardDescription>
            Agrega nuevos títulos que no están en el documento original
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={nuevoTituloTexto}
              onChange={(e) => setNuevoTituloTexto(e.target.value)}
              placeholder="Ej: Recursos adicionales, Notas importantes..."
              onKeyPress={(e) => e.key === 'Enter' && agregarTituloPersonalizado()}
              className="flex-1"
            />
            <Button 
              onClick={agregarTituloPersonalizado}
              disabled={!nuevoTituloTexto.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Títulos sin asignar */}
      <Card className="border-dashed border-2 border-yellow-300 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            📦 Títulos sin asignar ({titulosSinAsignar.length})
          </CardTitle>
          <CardDescription>
            Haz clic en un título para agregarlo a una pestaña
          </CardDescription>
        </CardHeader>
        <CardContent>
          {titulosSinAsignar.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              ✅ Todos los títulos están asignados a pestañas
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {titulosSinAsignar.map(titulo => (
                <Badge 
                  key={titulo.id}
                  variant="secondary"
                  className={`cursor-pointer hover:bg-yellow-200 p-2 transition-colors ${
                    titulo.tipo === 'personalizado' ? 'bg-green-100 border-green-300' : ''
                  }`}
                  title={titulo.tipo === 'personalizado' ? 'Título personalizado' : `Fila ${titulo.fila}, Columna ${titulo.columna_letra}`}
                >
                  <span className="mr-2">
                    {titulo.tipo === 'personalizado' ? '✨' :
                     titulo.tipo === 'cabecera' ? '📋' : 
                     titulo.tipo === 'titulo_seccion' ? '📑' : '📝'}
                  </span>
                  {titulo.titulo}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pestañas */}
      <div className="space-y-4">
        {pestanas.map((pestana, index) => (
          <Card key={index} className="border-2">
            <CardHeader className={`${COLORES_DISPONIBLES.find(c => c.value === pestana.color)?.class || 'bg-blue-500'} bg-opacity-10`}>
              <div className="flex items-start gap-4">
                {/* Controles de orden */}
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moverPestana(index, 'up')}
                    disabled={index === 0}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moverPestana(index, 'down')}
                    disabled={index === pestanas.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Configuración de pestaña */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-4">
                    {/* Selector de icono */}
                    <select
                      value={pestana.icono}
                      onChange={(e) => {
                        const nuevas = [...pestanas];
                        nuevas[index].icono = e.target.value;
                        setPestanas(nuevas);
                      }}
                      className="border rounded px-2 py-1 text-xl"
                    >
                      {ICONOS_DISPONIBLES.map(icono => (
                        <option key={icono.value} value={icono.value}>
                          {icono.label}
                        </option>
                      ))}
                    </select>

                    {/* Nombre de pestaña */}
                    <div className="flex-1">
                      <Input
                        value={pestana.nombre_pestana}
                        onChange={(e) => {
                          const nuevas = [...pestanas];
                          nuevas[index].nombre_pestana = e.target.value;
                          setPestanas(nuevas);
                        }}
                        placeholder="Nombre de la pestaña"
                        className="font-semibold"
                      />
                    </div>

                    {/* Selector de color */}
                    <div className="flex gap-1">
                      {COLORES_DISPONIBLES.map(color => (
                        <button
                          key={color.value}
                          onClick={() => {
                            const nuevas = [...pestanas];
                            nuevas[index].color = color.value;
                            setPestanas(nuevas);
                          }}
                          className={`w-6 h-6 rounded-full border-2 ${color.class} ${
                            pestana.color === color.value ? 'border-gray-900 scale-110' : 'border-gray-300'
                          } transition-transform`}
                          title={color.label}
                        />
                      ))}
                    </div>

                    {/* Botón eliminar */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => eliminarPestana(index)}
                      disabled={pestanas.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Descripción */}
                  <Input
                    value={pestana.descripcion || ''}
                    onChange={(e) => {
                      const nuevas = [...pestanas];
                      nuevas[index].descripcion = e.target.value;
                      setPestanas(nuevas);
                    }}
                    placeholder="Descripción opcional de la pestaña"
                    className="text-sm"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Títulos asignados */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">
                  Títulos en esta pestaña ({pestana.titulo_ids.length})
                </Label>
                
                {pestana.titulo_ids.length === 0 ? (
                  <div className="border-2 border-dashed rounded p-4 text-center text-gray-400">
                    Arrastra títulos aquí o haz clic en los títulos de arriba
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pestana.titulo_ids.map(tituloId => {
                      const titulo = titulos.find(t => t.id === tituloId);
                      return titulo ? (
                        <Badge 
                          key={tituloId}
                          className={`p-2 cursor-pointer hover:bg-red-100 transition-colors ${
                            titulo.tipo === 'personalizado' ? 'bg-green-50 border-green-300' : ''
                          }`}
                          onClick={() => quitarTituloDePestana(index, tituloId)}
                          title="Clic para quitar"
                        >
                          <span className="mr-2">
                            {titulo.tipo === 'personalizado' ? '✨' : '📝'}
                          </span>
                          {titulo.titulo} <span className="ml-2">✕</span>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Zona para agregar títulos */}
              {titulosSinAsignar.length > 0 && (
                <div className="border rounded p-2 bg-gray-50">
                  <Label className="text-xs text-gray-600 mb-2 block">
                    Agregar títulos a esta pestaña:
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {titulosSinAsignar.map(titulo => (
                      <Button
                        key={titulo.id}
                        size="sm"
                        variant="outline"
                        onClick={() => agregarTituloAPestana(index, titulo)}
                        className="text-xs h-7"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {titulo.titulo}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estadísticas */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{titulos.length}</div>
              <div className="text-sm text-gray-600">Títulos totales</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {titulos.length - titulosSinAsignar.length}
              </div>
              <div className="text-sm text-gray-600">Asignados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{titulosSinAsignar.length}</div>
              <div className="text-sm text-gray-600">Sin asignar</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
