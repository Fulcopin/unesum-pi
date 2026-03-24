# 📋 NUEVA PÁGINA: FORMULARIOS DINÁMICOS PARA DOCENTES

## 🎯 Objetivo
Crear una página separada donde el docente pueda ver y llenar formularios que se generan **100% dinámicamente** basados en las plantillas que el administrador crea al subir archivos Excel.

---

## 📍 Ubicación de la Nueva Página

**Ruta Frontend:** `/dashboard/docente/formularios`

**Archivo:** `app/dashboard/docente/formularios/page.tsx`

**Acceso:** Desde el dashboard del docente, nueva tarjeta "Formularios Dinámicos"

---

## 🔄 Diferencia con la Página Anterior

### ❌ Página Anterior (`/dashboard/docente/programa-analitico`)
- Campos **hardcodeados** (Carrera, Nivel, Asignatura, Código, etc.)
- Diseñada para un formato específico
- No se adapta a las plantillas del administrador

### ✅ Nueva Página (`/dashboard/docente/formularios`)
- Campos **100% dinámicos** desde la base de datos
- Se adapta automáticamente a cualquier plantilla que suba el admin
- Usa el sistema de plantillas (tablas: `plantillas_programa`, `secciones_plantilla`, `campos_seccion`)

---

## 🚀 Flujo Completo

### 1️⃣ **Administrador sube Excel**

```
POST /api/programa-analitico/upload
```

**Archivo:** `my-node-backend/src/controllers/programaAnaliticoController.js`
**Función:** `uploadExcel()`

**Proceso:**
1. Lee el archivo Excel con `xlsx`
2. Detecta secciones automáticamente (busca patrones como "ASIGNATURA", "UNIDADES TEMÁTICAS", etc.)
3. Identifica el tipo de cada sección:
   - `tabla` → si tiene encabezados de columnas
   - `texto_largo` → si es texto libre
4. Llama a `crearPlantillaDesdeExcel()` dentro de una transacción

**Ejemplo de detección:**
```javascript
// Detecta secciones especiales
const seccionesEspeciales = [
  { patron: 'ASIGNATURA', tipo: 'tabla' },
  { patron: 'UNIDADES TEMÁTICAS', tipo: 'tabla' },
  { patron: 'METODOLOGÍA', tipo: 'texto_largo' },
  { patron: 'BIBLIOGRAFÍA', tipo: 'texto_largo' }
];
```

**Salida en consola:**
```
✅ Plantilla creada: Programa Analítico FACI (ID: 3)
  📝 Sección creada: ASIGNATURA (tabla)
    🔹 Campo creado: ASIGNATURA
    🔹 Campo creado: PERIODO ACADÉMICO ORDINARIO (PAO)
    🔹 Campo creado: NIVEL
  📝 Sección creada: UNIDADES TEMÁTICAS (tabla)
    🔹 Campo creado: Unidad
    🔹 Campo creado: Tema
    🔹 Campo creado: Horas
  📝 Sección creada: METODOLOGÍA (texto_largo)
```

---

### 2️⃣ **Se crea la estructura en BD**

#### Tabla `plantillas_programa`
```sql
INSERT INTO plantillas_programa (nombre, descripcion, tipo, activa, usuario_creador_id)
VALUES ('Programa Analítico FACI', 'Plantilla generada automáticamente desde Excel', 'excel_import', true, 1);
```

#### Tabla `secciones_plantilla`
```sql
INSERT INTO secciones_plantilla (plantilla_id, nombre, descripcion, tipo, orden, obligatoria)
VALUES 
  (3, 'ASIGNATURA', 'Sección tipo tabla', 'tabla', 1, true),
  (3, 'UNIDADES TEMÁTICAS', 'Sección tipo tabla', 'tabla', 2, true),
  (3, 'METODOLOGÍA', 'Sección de texto largo', 'texto_largo', 3, true);
```

#### Tabla `campos_seccion` (solo para tipo 'tabla')
```sql
INSERT INTO campos_seccion (seccion_id, etiqueta, tipo_campo, orden, obligatorio)
VALUES 
  -- Campos de sección "ASIGNATURA" (ID: 10)
  (10, 'ASIGNATURA', 'texto', 1, false),
  (10, 'PERIODO ACADÉMICO ORDINARIO (PAO)', 'texto', 2, false),
  (10, 'NIVEL', 'texto', 3, false),
  
  -- Campos de sección "UNIDADES TEMÁTICAS" (ID: 11)
  (11, 'Unidad', 'texto', 1, false),
  (11, 'Tema', 'texto', 2, false),
  (11, 'Horas', 'texto', 3, false);
```

#### Tabla `programas_analiticos` (vincula programa con plantilla)
```sql
INSERT INTO programas_analiticos (nombre, plantilla_id, usuario_id, archivo_excel)
VALUES ('Programa FACI 2025-1', 3, 1, 'programa_1733456789_syllabus.xlsx');
```

---

### 3️⃣ **Docente accede a Formularios**

**Página:** `/dashboard/docente/formularios`

**Endpoint usado:**
```
GET /api/programa-analitico/disponibles
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "nombre": "Programa FACI 2025-1",
      "plantilla_id": 3,
      "plantilla": {
        "id": 3,
        "nombre": "Programa Analítico FACI",
        "descripcion": "Plantilla generada automáticamente desde Excel",
        "secciones": [
          {
            "id": 10,
            "nombre": "ASIGNATURA",
            "tipo": "tabla",
            "orden": 1,
            "obligatoria": true,
            "campos": [
              { "id": 45, "etiqueta": "ASIGNATURA", "tipo_campo": "texto", "orden": 1 },
              { "id": 46, "etiqueta": "PERIODO ACADÉMICO ORDINARIO (PAO)", "tipo_campo": "texto", "orden": 2 },
              { "id": 47, "etiqueta": "NIVEL", "tipo_campo": "texto", "orden": 3 }
            ]
          },
          {
            "id": 11,
            "nombre": "UNIDADES TEMÁTICAS",
            "tipo": "tabla",
            "orden": 2,
            "campos": [
              { "id": 48, "etiqueta": "Unidad", "tipo_campo": "texto", "orden": 1 },
              { "id": 49, "etiqueta": "Tema", "tipo_campo": "texto", "orden": 2 },
              { "id": 50, "etiqueta": "Horas", "tipo_campo": "texto", "orden": 3 }
            ]
          },
          {
            "id": 12,
            "nombre": "METODOLOGÍA",
            "tipo": "texto_largo",
            "orden": 3,
            "campos": []
          }
        ]
      }
    }
  ]
}
```

---

### 4️⃣ **Docente selecciona programa y ve formulario dinámico**

**Componente:** `components/programa-analitico/formulario-dinamico.tsx`

**Proceso de renderizado:**

#### A. Primera sección tipo "tabla" → Formulario simple (Datos Generales)
```tsx
{/* Renderizar como campos de formulario (no tabla) */}
<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
  <h4>ASIGNATURA</h4>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>ASIGNATURA *</Label>
      <Input placeholder="ASIGNATURA" />
    </div>
    <div>
      <Label>PERIODO ACADÉMICO ORDINARIO (PAO) *</Label>
      <Input placeholder="PERIODO ACADÉMICO ORDINARIO (PAO)" />
    </div>
    <div>
      <Label>NIVEL *</Label>
      <Input placeholder="NIVEL" />
    </div>
  </div>
</div>
```

#### B. Demás secciones tipo "tabla" → Tabla editable con filas
```tsx
<Tabs>
  <TabsContent value="unidades-tematicas">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Unidad</TableHead>
          <TableHead>Tema</TableHead>
          <TableHead>Horas</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Filas dinámicas con botón agregar/eliminar */}
      </TableBody>
    </Table>
    <Button onClick={agregarFila}>+ Agregar Fila</Button>
  </TabsContent>
</Tabs>
```

#### C. Secciones tipo "texto_largo" → Textarea
```tsx
<TabsContent value="metodologia">
  <Textarea 
    rows={8}
    placeholder="Ingrese el contenido para METODOLOGÍA"
  />
</TabsContent>
```

---

### 5️⃣ **Docente llena y guarda el formulario**

**Endpoint:**
```
POST /api/programa-analitico/:id/guardar-contenido
```

**Body enviado:**
```json
{
  "profesor_id": 10,
  "contenido": {
    "10": {  // ID de sección "ASIGNATURA"
      "tipo": "tabla",
      "filas": [
        {
          "valores": {
            "45": "Programación Web",           // Campo "ASIGNATURA"
            "46": "2025-1",                     // Campo "PERIODO ACADÉMICO"
            "47": "3er Nivel"                   // Campo "NIVEL"
          }
        }
      ]
    },
    "11": {  // ID de sección "UNIDADES TEMÁTICAS"
      "tipo": "tabla",
      "filas": [
        {
          "valores": {
            "48": "Unidad 1",
            "49": "HTML y CSS",
            "50": "10"
          }
        },
        {
          "valores": {
            "48": "Unidad 2",
            "49": "JavaScript",
            "50": "15"
          }
        }
      ]
    },
    "12": {  // ID de sección "METODOLOGÍA"
      "tipo": "texto_largo",
      "contenido": "La asignatura se desarrollará mediante clases teóricas y prácticas..."
    }
  }
}
```

---

### 6️⃣ **Backend guarda en tablas normalizadas**

**Función:** `guardarContenidoDocente()` en `programaAnaliticoController.js`

#### Tabla `contenido_programa`
```sql
INSERT INTO contenido_programa (programa_id, seccion_id, profesor_id, contenido_texto)
VALUES 
  (25, 10, 10, NULL),  -- Sección "ASIGNATURA" (tabla)
  (25, 11, 10, NULL),  -- Sección "UNIDADES TEMÁTICAS" (tabla)
  (25, 12, 10, 'La asignatura se desarrollará mediante...');  -- "METODOLOGÍA" (texto)
```

#### Tabla `filas_tabla_programa` (solo para tipo 'tabla')
```sql
INSERT INTO filas_tabla_programa (contenido_id, orden)
VALUES 
  -- Para sección "ASIGNATURA" (contenido_id: 101)
  (101, 1),  -- fila_id: 201
  
  -- Para sección "UNIDADES TEMÁTICAS" (contenido_id: 102)
  (102, 1),  -- fila_id: 202
  (102, 2);  -- fila_id: 203
```

#### Tabla `valores_campo_programa`
```sql
INSERT INTO valores_campo_programa (fila_id, campo_id, valor)
VALUES 
  -- Fila 1 de "ASIGNATURA"
  (201, 45, 'Programación Web'),
  (201, 46, '2025-1'),
  (201, 47, '3er Nivel'),
  
  -- Fila 1 de "UNIDADES TEMÁTICAS"
  (202, 48, 'Unidad 1'),
  (202, 49, 'HTML y CSS'),
  (202, 50, '10'),
  
  -- Fila 2 de "UNIDADES TEMÁTICAS"
  (203, 48, 'Unidad 2'),
  (203, 49, 'JavaScript'),
  (203, 50, '15');
```

---

### 7️⃣ **Docente vuelve a abrir el formulario (carga datos guardados)**

**Endpoint:**
```
GET /api/programa-analitico/:id/contenido-docente?profesor_id=10
```

**Función:** `getContenidoDocente()` en `programaAnaliticoController.js`

**Query SQL ejecutada:**
```sql
-- Para secciones tipo 'texto_largo'
SELECT 
  cp.id,
  cp.seccion_id,
  cp.contenido_texto,
  sp.nombre as seccion_nombre,
  sp.tipo as seccion_tipo
FROM contenido_programa cp
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
WHERE cp.programa_id = 25 
  AND cp.profesor_id = 10
  AND sp.tipo = 'texto_largo';

-- Para secciones tipo 'tabla'
SELECT 
  cp.id as contenido_id,
  cp.seccion_id,
  sp.nombre as seccion_nombre,
  ftp.id as fila_id,
  ftp.orden as fila_orden,
  vcp.campo_id,
  vcp.valor,
  cs.etiqueta as campo_nombre
FROM contenido_programa cp
INNER JOIN secciones_plantilla sp ON cp.seccion_id = sp.id
INNER JOIN filas_tabla_programa ftp ON ftp.contenido_id = cp.id
INNER JOIN valores_campo_programa vcp ON vcp.fila_id = ftp.id
INNER JOIN campos_seccion cs ON cs.id = vcp.campo_id
WHERE cp.programa_id = 25 
  AND cp.profesor_id = 10
  AND sp.tipo = 'tabla'
ORDER BY sp.orden, ftp.orden, cs.orden;
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "contenido": {
      "10": {  // Sección "ASIGNATURA"
        "tipo": "tabla",
        "filas": [
          {
            "valores": {
              "45": "Programación Web",
              "46": "2025-1",
              "47": "3er Nivel"
            }
          }
        ]
      },
      "11": {  // Sección "UNIDADES TEMÁTICAS"
        "tipo": "tabla",
        "filas": [
          {
            "valores": {
              "48": "Unidad 1",
              "49": "HTML y CSS",
              "50": "10"
            }
          },
          {
            "valores": {
              "48": "Unidad 2",
              "49": "JavaScript",
              "50": "15"
            }
          }
        ]
      },
      "12": {  // Sección "METODOLOGÍA"
        "tipo": "texto_largo",
        "contenido": "La asignatura se desarrollará mediante clases teóricas y prácticas..."
      }
    }
  }
}
```

El formulario se llena automáticamente con estos datos.

---

## 🎨 Características de la Nueva Página

### ✨ Interfaz Visual

#### Vista de Lista (Tarjetas)
```
┌─────────────────────────────────────┐
│ 📄 Programa FACI 2025-1            │
│ ✓ Plantilla: Programa Analítico    │
│    FACI                             │
│ 3 secciones                         │
│                                     │
│ Creado: 06/12/2025                  │
│ [🖊️ Llenar Formulario]              │
└─────────────────────────────────────┘
```

#### Vista de Formulario
```
┌─────────────────────────────────────┐
│ ← Volver a la lista                 │
│                                     │
│ Programa FACI 2025-1                │
│ 📋 Plantilla: Programa Analítico    │
│     FACI                            │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 📝 ASIGNATURA                    │ │
│ │ [Input: ASIGNATURA]              │ │
│ │ [Input: PERIODO ACADÉMICO]       │ │
│ │ [Input: NIVEL]                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Tab: 2. Unidades Temáticas]        │
│ [Tab: 3. Metodología]               │
│                                     │
│ [💾 Guardar] [Cancelar]             │
└─────────────────────────────────────┘
```

### 🔒 Seguridad
- Autenticación requerida (rol: "profesor" o "docente")
- Token JWT en headers
- Validación de permisos en backend
- Transacciones en BD para consistencia

### 🎯 Ventajas sobre Sistema Anterior

| Característica | Sistema Anterior | Nuevo Sistema |
|---|---|---|
| Campos | Hardcodeados | Dinámicos desde BD |
| Adaptabilidad | Ninguna | 100% flexible |
| Escalabilidad | Limitada | Ilimitada |
| Mantenimiento | Manual | Automático |
| Tipos de sección | Solo tablas | Tablas + Texto largo |
| Plantillas | No soporta | Totalmente soportado |

---

## 📊 Endpoints Usados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/programa-analitico/disponibles` | Lista programas con plantillas |
| GET | `/api/programa-analitico/:id/plantilla` | Obtiene estructura de plantilla |
| GET | `/api/programa-analitico/:id/contenido-docente` | Obtiene contenido guardado |
| POST | `/api/programa-analitico/:id/guardar-contenido` | Guarda contenido del docente |

---

## 🧪 Cómo Probar

### 1. Asegúrate de que el backend esté corriendo
```powershell
cd my-node-backend
npm start
```

### 2. Asegúrate de que Next.js esté corriendo
```powershell
npm run dev
```

### 3. Como Administrador
1. Login como admin
2. Ve a `/dashboard/admin/programa-analitico`
3. Sube un archivo Excel con estructura de programa analítico
4. Verifica en la consola que la plantilla se creó correctamente

### 4. Como Docente
1. Login como docente
2. Ve a `/dashboard/docente` 
3. Click en "Formularios Dinámicos"
4. Deberías ver las tarjetas de programas disponibles
5. Click en "Llenar Formulario"
6. Los campos mostrados serán exactamente los del Excel que subió el admin

---

## 🐛 Solución de Problemas

### Problema: No aparecen programas
**Solución:** Verifica que el admin haya subido al menos un Excel y que se haya creado la plantilla.

**Query SQL para verificar:**
```sql
SELECT 
  pa.id,
  pa.nombre,
  pa.plantilla_id,
  pp.nombre as plantilla_nombre
FROM programas_analiticos pa
LEFT JOIN plantillas_programa pp ON pa.plantilla_id = pp.id
WHERE pa.plantilla_id IS NOT NULL;
```

### Problema: Campos no aparecen en el formulario
**Solución:** Verifica que la plantilla tenga secciones y campos.

**Query SQL:**
```sql
SELECT 
  pp.nombre as plantilla,
  sp.nombre as seccion,
  sp.tipo,
  COUNT(cs.id) as num_campos
FROM plantillas_programa pp
LEFT JOIN secciones_plantilla sp ON sp.plantilla_id = pp.id
LEFT JOIN campos_seccion cs ON cs.seccion_id = sp.id
GROUP BY pp.id, sp.id
ORDER BY pp.id, sp.orden;
```

### Problema: Error al guardar
**Solución:** Abre la consola del navegador (F12) y verifica los logs. El backend también muestra logs detallados.

---

## 📝 Archivos Modificados

1. ✅ Creado: `app/dashboard/docente/formularios/page.tsx`
2. ✅ Modificado: `app/dashboard/docente/page.tsx` (agregada tarjeta de acceso)
3. ✅ Modificado: `components/programa-analitico/formulario-dinamico.tsx` (ya estaba listo)
4. ✅ Backend: `my-node-backend/src/controllers/programaAnaliticoController.js` (ya estaba listo)
5. ✅ Backend: `my-node-backend/src/routes/programaAnaliticoRoutes.js` (ya estaba listo)

---

## 🎉 Resumen

Ahora tienes **DOS sistemas paralelos**:

1. **Sistema Legacy** (`/dashboard/docente/programa-analitico`)
   - Campos hardcodeados
   - Para compatibilidad con código anterior

2. **Sistema Nuevo** (`/dashboard/docente/formularios`)
   - 100% dinámico
   - Basado en plantillas de Excel del admin
   - Escalable y mantenible

El docente puede usar el que prefiera, pero el recomendado es el **nuevo sistema de formularios dinámicos**.
