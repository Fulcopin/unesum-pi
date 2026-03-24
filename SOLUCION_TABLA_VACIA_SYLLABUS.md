# ✅ SOLUCIÓN: Tabla Vacía en Syllabus

## 🔴 PROBLEMA IDENTIFICADO

**Síntoma:** Al abrir el syllabus "Syllabus PI 2025", se muestra el título pero la tabla aparece completamente vacía (sin filas ni columnas).

**Causa:** El campo `datos_syllabus` en la base de datos tiene la estructura básica pero **sin contenido** (sin rows):

```json
{
  "id": 3,
  "name": "Syllabus PI 2025",
  "tabs": [
    {
      "id": "tab-123456",
      "title": "General",
      "rows": []  // ❌ VACÍO
    }
  ]
}
```

---

## ✅ SOLUCIONES IMPLEMENTADAS

### 1. Función para Inicializar Tabla Vacía

**Archivo:** `app/dashboard/admin/editor-syllabus/page.tsx`  
**Línea:** ~607

```typescript
const initializeEmptyTable = (rows: number = 5, cols: number = 3) => {
  console.log(`🎨 Inicializando tabla vacía: ${rows} filas x ${cols} columnas`);
  const newRows: TableRow[] = [];
  for (let r = 0; r < rows; r++) {
    const rowId = `r-${Date.now()}-${r}`;
    const cells: TableCell[] = [];
    for (let c = 0; c < cols; c++) {
      cells.push({
        id: `c-${rowId}-${c}`,
        content: "",
        isHeader: r === 0, // Primera fila como headers
        rowSpan: 1,
        colSpan: 1,
        isEditable: true
      });
    }
    newRows.push({ id: rowId, cells });
  }
  handleUpdateActiveTabRows(newRows);
  console.log("✅ Tabla inicializada con éxito");
};
```

**¿Qué hace?**
- Crea una tabla con el número de filas y columnas especificado
- La primera fila se marca como headers (isHeader: true)
- Todas las celdas son editables
- Se inserta en el tab activo

### 2. Botón Visible "Crear Tabla Inicial"

**Archivo:** `app/dashboard/admin/editor-syllabus/page.tsx`  
**Línea:** ~1013

```typescript
{tableData.length === 0 ? (
  <tr>
    <td className="p-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-2" ...>
            {/* Ícono de tabla */}
          </svg>
          <p className="text-lg font-medium text-gray-600">La tabla está vacía</p>
          <p className="text-sm text-gray-500 mt-1">Crea una tabla inicial o sube un archivo Word</p>
        </div>
        <Button 
          onClick={() => initializeEmptyTable(5, 3)} 
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Tabla Inicial (5x3)
        </Button>
      </div>
    </td>
  </tr>
) : (
  // Tabla normal con filas
  tableData.map((row) => { ... })
)}
```

**¿Qué hace?**
- Detecta cuando `tableData.length === 0`
- Muestra un mensaje amigable con ícono
- Ofrece un botón verde para crear tabla de 5 filas x 3 columnas
- Si hay datos, muestra la tabla normal

### 3. Fallback en Funciones de Agregar Fila/Columna

**Archivo:** `app/dashboard/admin/editor-syllabus/page.tsx`  
**Línea:** ~622-640

```typescript
const addRowAt=(idx:number)=>{
  // Si la tabla está vacía, inicializar primero
  if(!tableData.length) {
    console.log("⚠️ Tabla vacía, inicializando...");
    initializeEmptyTable(3, 3);
    return;
  }
  // ... código normal para agregar fila ...
}

const addColumnAt=(idx:number)=>{
  // Si la tabla está vacía, inicializar primero
  if(!tableData.length) {
    console.log("⚠️ Tabla vacía, inicializando...");
    initializeEmptyTable(3, 3);
    return;
  }
  // ... código normal para agregar columna ...
}
```

**¿Qué hace?**
- Antes retornaba sin hacer nada si la tabla estaba vacía
- Ahora inicializa automáticamente una tabla de 3x3
- Permite usar botones "+ Fila" y "+ Col" incluso con tabla vacía

---

## 🎯 CÓMO USAR LA SOLUCIÓN

### Opción 1: Botón "Crear Tabla Inicial" (RECOMENDADO)

1. Abre el syllabus vacío
2. Verás un mensaje: **"La tabla está vacía"**
3. Click en el botón verde: **"Crear Tabla Inicial (5x3)"**
4. Se creará una tabla con:
   - **5 filas** (primera fila son headers)
   - **3 columnas**
   - Todas las celdas editables
5. Haz doble clic en cualquier celda para editarla
6. Click en **"Guardar"** cuando termines

### Opción 2: Usar Botones de la Barra de Herramientas

1. Intenta hacer clic en **"+ Fila ↑"** o **"+ Col ←"**
2. Automáticamente se creará una tabla de 3x3
3. Se agregará la fila/columna solicitada

### Opción 3: Subir Archivo Word

1. Click en botón **"Nuevo"** arriba
2. Click en **"Subir Nuevo Word (.docx)"**
3. Selecciona tu archivo Word con la estructura
4. Se extraerá automáticamente el contenido

---

## 📊 RESULTADO ESPERADO

### Antes:
```
┌─────────────────────────────────────────┐
│ Syllabus PI 2025                        │
├─────────────────────────────────────────┤
│ [General]                               │
├─────────────────────────────────────────┤
│                                         │
│        (vacío - nada se muestra)        │
│                                         │
└─────────────────────────────────────────┘
```

### Después de click en "Crear Tabla Inicial":
```
┌─────────────────────────────────────────┐
│ Syllabus PI 2025          [💾 Guardar]  │
├─────────────────────────────────────────┤
│ [General]                               │
├─────────────────────────────────────────┤
│ + Fila ↑  + Col ←  - Fila  Vertical... │
├─────────────────────────────────────────┤
│ ┌──────────┬──────────┬──────────┐     │
│ │ Header 1 │ Header 2 │ Header 3 │     │
│ ├──────────┼──────────┼──────────┤     │
│ │          │          │          │     │
│ ├──────────┼──────────┼──────────┤     │
│ │          │          │          │     │
│ ├──────────┼──────────┼──────────┤     │
│ │          │          │          │     │
│ ├──────────┼──────────┼──────────┤     │
│ │          │          │          │     │
│ └──────────┴──────────┴──────────┘     │
└─────────────────────────────────────────┘
```

---

## 🔧 PERSONALIZAR TAMAÑO DE TABLA

Si quieres cambiar el tamaño por defecto, modifica en el código:

```typescript
// Para el botón visible
<Button onClick={() => initializeEmptyTable(10, 5)}>
  Crear Tabla Inicial (10x5)  // 10 filas, 5 columnas
</Button>

// Para el fallback automático
if(!tableData.length) {
  initializeEmptyTable(8, 4);  // 8 filas, 4 columnas
  return;
}
```

---

## 🧪 PRUEBA COMPLETA

### Paso 1: Recarga el navegador
```
Ctrl + Shift + R
```

### Paso 2: Verifica que aparezca el mensaje
1. Ve a `/dashboard/admin/editor-syllabus`
2. Click en "Modificar" en "Syllabus PI 2025"
3. Deberías ver el mensaje: **"La tabla está vacía"**
4. Deberías ver el botón verde: **"Crear Tabla Inicial (5x3)"**

### Paso 3: Crea la tabla
1. Click en el botón verde
2. Deberías ver una tabla con 5 filas y 3 columnas
3. La primera fila debe tener fondo gris (headers)

### Paso 4: Edita y guarda
1. Haz doble clic en una celda
2. Escribe algo (ej: "Campo 1")
3. Presiona Enter o haz clic fuera
4. Click en botón **"Guardar"** (azul, arriba a la derecha)
5. Espera mensaje: "¡Syllabus guardado exitosamente!"

### Paso 5: Verifica persistencia
1. Click en "Nuevo" (para cerrar el editor)
2. Vuelve a hacer clic en "Modificar" en "Syllabus PI 2025"
3. La tabla debe aparecer con los datos guardados

---

## 🐛 PROBLEMAS COMUNES

### Problema: El botón no aparece

**Causa:** El frontend no se recargó después del cambio

**Solución:**
```powershell
# Detén el frontend (Ctrl+C)
# Reinicia:
npm run dev
```

Luego en el navegador: `Ctrl + Shift + R`

### Problema: Sale error al crear la tabla

**Síntoma:** Error en consola al hacer clic

**Solución:**
1. Abre consola del navegador (F12)
2. Busca el error específico
3. Verifica que `handleUpdateActiveTabRows` existe
4. Verifica que `activeTab` no sea null

### Problema: La tabla se crea pero no se guarda

**Síntoma:** Al recargar, la tabla vuelve a estar vacía

**Solución:**
1. Después de crear la tabla, **debes hacer clic en "Guardar"**
2. El botón está arriba a la derecha (azul)
3. Espera el mensaje de confirmación
4. Si no aparece, revisa la consola (F12) para ver errores

---

## 📝 LOGS ESPERADOS EN LA CONSOLA

Cuando creas la tabla:
```bash
🎨 Inicializando tabla vacía: 5 filas x 3 columnas
✅ Tabla inicializada con éxito
```

Cuando guardas:
```bash
💾 Guardando syllabus...
📤 Enviando a: /api/syllabi/3
✅ Guardado exitosamente
```

---

## 🎨 PRÓXIMAS MEJORAS OPCIONALES

### 1. Selector de tamaño personalizado

Agregar un modal que pregunte cuántas filas y columnas:

```typescript
const [showSizeModal, setShowSizeModal] = useState(false);
const [customRows, setCustomRows] = useState(5);
const [customCols, setCustomCols] = useState(3);
```

### 2. Plantillas predefinidas

Botones para crear estructuras típicas:
- **Syllabus Estándar**: 20x4
- **Horario**: 10x6
- **Evaluación**: 8x5

### 3. Importar desde Excel

Permitir subir .xlsx además de .docx

---

**Fecha:** 2026-01-11  
**Estado:** ✅ Implementado y listo para probar  
**Archivos modificados:** `app/dashboard/admin/editor-syllabus/page.tsx`
