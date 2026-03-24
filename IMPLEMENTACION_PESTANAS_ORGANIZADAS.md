# 🗂️ Sistema de Organización por Pestañas/Viñetas

## 🎯 Objetivo

Permitir que el **administrador** organice los 23 títulos extraídos en diferentes **pestañas/viñetas** para que el formulario del docente se vea más organizado y profesional.

---

## 📊 Diseño de la Base de Datos

### Nueva Tabla: `agrupaciones_titulos`

```sql
CREATE TABLE agrupaciones_titulos (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  nombre_pestana VARCHAR(100) NOT NULL,
  orden INTEGER NOT NULL,
  titulo_ids INTEGER[] NOT NULL,  -- Array de IDs de títulos
  color VARCHAR(20) DEFAULT 'blue',
  icono VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES titulos_extraidos(session_id)
);

CREATE INDEX idx_agrupaciones_session ON agrupaciones_titulos(session_id);
```

**Ejemplo de datos:**
```json
{
  "id": 1,
  "session_id": "1734712345678_abc",
  "nombre_pestana": "Datos Generales",
  "orden": 1,
  "titulo_ids": [1, 2, 3, 4, 5],
  "color": "blue",
  "icono": "📋"
},
{
  "id": 2,
  "session_id": "1734712345678_abc",
  "nombre_pestana": "Objetivos",
  "orden": 2,
  "titulo_ids": [6, 7, 8],
  "color": "purple",
  "icono": "🎯"
},
{
  "id": 3,
  "session_id": "1734712345678_abc",
  "nombre_pestana": "Contenidos",
  "orden": 3,
  "titulo_ids": [9, 10, 11, 12, 13, 14, 15],
  "color": "green",
  "icono": "📚"
}
```

---

## 🔧 Implementación Backend

### 1. Modelo Sequelize

**Archivo:** `my-node-backend/src/models/AgrupacionTitulo.js`

```javascript
module.exports = (sequelize, DataTypes) => {
  const AgrupacionTitulo = sequelize.define('AgrupacionTitulo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    nombre_pestana: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    titulo_ids: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: []
    },
    color: {
      type: DataTypes.STRING(20),
      defaultValue: 'blue'
    },
    icono: {
      type: DataTypes.STRING(50),
      defaultValue: '📋'
    }
  }, {
    tableName: 'agrupaciones_titulos',
    timestamps: true,
    underscored: true
  });

  return AgrupacionTitulo;
};
```

---

### 2. Controlador

**Archivo:** `my-node-backend/src/controllers/programaAnaliticoController.js`

```javascript
// Obtener agrupaciones de una sesión
exports.obtenerAgrupaciones = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const AgrupacionTitulo = db.AgrupacionTitulo;

    const agrupaciones = await AgrupacionTitulo.findAll({
      where: { session_id: sessionId },
      order: [['orden', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: agrupaciones
    });
  } catch (error) {
    console.error('Error al obtener agrupaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener agrupaciones'
    });
  }
};

// Guardar agrupaciones
exports.guardarAgrupaciones = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { agrupaciones } = req.body;
    const AgrupacionTitulo = db.AgrupacionTitulo;

    // Eliminar agrupaciones anteriores
    await AgrupacionTitulo.destroy({
      where: { session_id: sessionId }
    });

    // Crear nuevas agrupaciones
    const nuevasAgrupaciones = await AgrupacionTitulo.bulkCreate(
      agrupaciones.map(ag => ({
        session_id: sessionId,
        nombre_pestana: ag.nombre_pestana,
        orden: ag.orden,
        titulo_ids: ag.titulo_ids,
        color: ag.color || 'blue',
        icono: ag.icono || '📋'
      }))
    );

    return res.status(200).json({
      success: true,
      data: nuevasAgrupaciones,
      message: 'Agrupaciones guardadas correctamente'
    });
  } catch (error) {
    console.error('Error al guardar agrupaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al guardar agrupaciones'
    });
  }
};
```

---

### 3. Rutas

**Archivo:** `my-node-backend/src/routes/programaAnaliticoRoutes.js`

```javascript
// Agrupaciones de títulos
router.get('/sesion-extraccion/:sessionId/agrupaciones', 
  authenticate, 
  programaAnaliticoController.obtenerAgrupaciones
);

router.post('/sesion-extraccion/:sessionId/agrupaciones', 
  authenticate, 
  authorize(['admin']), 
  programaAnaliticoController.guardarAgrupaciones
);
```

---

## 🎨 Implementación Frontend - Vista Admin

### Componente: `OrganizadorPestanas.tsx`

**Archivo:** `components/programa-analitico/organizador-pestanas.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, GripVertical } from 'lucide-react';

interface Titulo {
  id: number;
  titulo: string;
  tipo: string;
}

interface Pestana {
  id?: number;
  nombre_pestana: string;
  orden: number;
  titulo_ids: number[];
  color: string;
  icono: string;
}

export function OrganizadorPestanas({ 
  sessionId, 
  titulos 
}: { 
  sessionId: string; 
  titulos: Titulo[] 
}) {
  const [pestanas, setPestanas] = useState<Pestana[]>([]);
  const [titulosSinAsignar, setTitulosSinAsignar] = useState<Titulo[]>(titulos);
  const [guardando, setGuardando] = useState(false);

  // Cargar agrupaciones existentes
  useEffect(() => {
    cargarAgrupaciones();
  }, [sessionId]);

  const cargarAgrupaciones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:4000/api/programa-analitico/sesion-extraccion/${sessionId}/agrupaciones`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setPestanas(data.data);
        actualizarTitulosSinAsignar(data.data);
      }
    } catch (error) {
      console.error('Error al cargar agrupaciones:', error);
    }
  };

  const actualizarTitulosSinAsignar = (pestanasActuales: Pestana[]) => {
    const idsAsignados = pestanasActuales.flatMap(p => p.titulo_ids);
    const sinAsignar = titulos.filter(t => !idsAsignados.includes(t.id));
    setTitulosSinAsignar(sinAsignar);
  };

  const agregarPestana = () => {
    const nuevaPestana: Pestana = {
      nombre_pestana: `Pestaña ${pestanas.length + 1}`,
      orden: pestanas.length,
      titulo_ids: [],
      color: 'blue',
      icono: '📋'
    };
    setPestanas([...pestanas, nuevaPestana]);
  };

  const agregarTituloAPestana = (pestanaIndex: number, tituloId: number) => {
    const nuevasPestanas = [...pestanas];
    nuevasPestanas[pestanaIndex].titulo_ids.push(tituloId);
    setPestanas(nuevasPestanas);
    actualizarTitulosSinAsignar(nuevasPestanas);
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
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `http://localhost:4000/api/programa-analitico/sesion-extraccion/${sessionId}/agrupaciones`,
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
        alert('✅ Agrupaciones guardadas correctamente');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('❌ Error al guardar agrupaciones');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Organizar en Pestañas</h2>
        <div className="flex gap-2">
          <Button onClick={agregarPestana} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Pestaña
          </Button>
          <Button onClick={guardarAgrupaciones} disabled={guardando}>
            <Save className="h-4 w-4 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar Organización'}
          </Button>
        </div>
      </div>

      {/* Títulos sin asignar */}
      <Card>
        <CardHeader>
          <CardTitle>
            Títulos sin asignar ({titulosSinAsignar.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {titulosSinAsignar.map(titulo => (
              <Badge 
                key={titulo.id}
                variant="secondary"
                className="cursor-move p-2"
                draggable
              >
                {titulo.titulo}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pestañas */}
      <div className="space-y-4">
        {pestanas.map((pestana, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-gray-400" />
                <Input
                  value={pestana.nombre_pestana}
                  onChange={(e) => {
                    const nuevas = [...pestanas];
                    nuevas[index].nombre_pestana = e.target.value;
                    setPestanas(nuevas);
                  }}
                  className="max-w-xs"
                />
                <select
                  value={pestana.icono}
                  onChange={(e) => {
                    const nuevas = [...pestanas];
                    nuevas[index].icono = e.target.value;
                    setPestanas(nuevas);
                  }}
                  className="border rounded px-2 py-1"
                >
                  <option value="📋">📋 Formulario</option>
                  <option value="🎯">🎯 Objetivos</option>
                  <option value="📚">📚 Contenidos</option>
                  <option value="✍️">✍️ Metodología</option>
                  <option value="📊">📊 Evaluación</option>
                  <option value="📖">📖 Bibliografía</option>
                </select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const nuevas = pestanas.filter((_, i) => i !== index);
                    setPestanas(nuevas);
                    actualizarTitulosSinAsignar(nuevas);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pestana.titulo_ids.map(tituloId => {
                  const titulo = titulos.find(t => t.id === tituloId);
                  return titulo ? (
                    <Badge 
                      key={tituloId}
                      className="p-2 cursor-pointer hover:bg-red-100"
                      onClick={() => quitarTituloDePestana(index, tituloId)}
                    >
                      {titulo.titulo} ✕
                    </Badge>
                  ) : null;
                })}
              </div>

              {/* Drop zone */}
              <div className="mt-4 border-2 border-dashed rounded p-4 min-h-[50px]">
                <p className="text-sm text-gray-500 text-center">
                  Arrastra títulos aquí o selecciónalos de arriba
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 📱 Vista del Docente con Pestañas

### Modificación en `FormularioDinamico.tsx`

```tsx
// Renderizar con pestañas si hay agrupaciones
{agrupaciones && agrupaciones.length > 0 ? (
  <Tabs defaultValue={`tab-${agrupaciones[0].id}`}>
    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${agrupaciones.length}, 1fr)` }}>
      {agrupaciones.map(pestana => (
        <TabsTrigger key={pestana.id} value={`tab-${pestana.id}`}>
          <span className="mr-2">{pestana.icono}</span>
          {pestana.nombre_pestana}
        </TabsTrigger>
      ))}
    </TabsList>

    {agrupaciones.map(pestana => (
      <TabsContent key={pestana.id} value={`tab-${pestana.id}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pestana.titulo_ids.map(tituloId => {
            const campo = campos.find(c => c.id === tituloId);
            return campo ? renderCampo(campo) : null;
          })}
        </div>
      </TabsContent>
    ))}
  </Tabs>
) : (
  // Vista normal sin pestañas
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {campos.map(campo => renderCampo(campo))}
  </div>
)}
```

---

## 🎯 Flujo Completo

### 1. Admin extrae títulos
```
Excel/Word → Backend → 23 títulos guardados
```

### 2. Admin organiza en pestañas
```
Vista Admin:
┌─────────────────────────────────────────┐
│ Títulos sin asignar (23)                │
│ [CARRERA] [ASIGNATURA] [CÓDIGO]...      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📋 Datos Generales                      │
│ [CARRERA] [ASIGNATURA] [CÓDIGO]         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🎯 Objetivos                            │
│ [Objetivo General] [Objetivos Esp.]     │
└─────────────────────────────────────────┘

[+ Agregar Pestaña] [💾 Guardar]
```

### 3. Docente ve formulario organizado
```
┌──────────────────────────────────────────┐
│ [📋 Datos] [🎯 Objetivos] [📚 Contenido] │
├──────────────────────────────────────────┤
│                                          │
│  📋 Datos Generales                      │
│                                          │
│  Carrera: [_________________]            │
│  Asignatura: [_________________]         │
│  Código: [_________________]             │
│                                          │
└──────────────────────────────────────────┘
```

---

## ✅ Beneficios

1. **Organización visual** - Formulario más limpio
2. **Navegación fácil** - Pestañas claras
3. **Personalizable** - Admin controla la estructura
4. **Reutilizable** - Misma organización para todos los docentes
5. **Escalable** - Funciona con cualquier número de campos

---

## 🚀 Próximos Pasos

1. Crear migración de base de datos
2. Implementar modelo Sequelize
3. Crear controladores y rutas
4. Desarrollar componente OrganizadorPestanas
5. Modificar FormularioDinamico para soportar pestañas
6. Agregar drag & drop para facilitar organización

---

**Fecha:** 20 de diciembre de 2025  
**Estado:** 📋 DISEÑO COMPLETO - Listo para implementar
