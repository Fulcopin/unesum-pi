# Auto-Completar Campos en Programa Analítico

## 🎯 Objetivo

Auto-completar y bloquear los campos:
- **ASIGNATURA**: Con código y nombre de la asignatura
- **PERIODO ACADÉMICO ORDINARIO (PAO)**: Con el periodo seleccionado
- **NIVEL**: Con el nivel de la asignatura

## ✅ Implementación

### 1. Estado para Información de Asignatura

Ya agregado en línea ~53:
```typescript
const [asignaturaInfo, setAsignaturaInfo] = useState<any>(null);
```

### 2. Cargar Información de Asignatura

Ya agregado en el useEffect inicial (línea ~76-113):
```typescript
// Si hay asignaturaIdParam, cargar info de la asignatura
if (asignaturaIdParam) {
  promises.push(
    apiRequest(`/api/asignatura/${asignaturaIdParam}`).catch(err => {
      console.error("Error al cargar asignatura:", err);
      return { data: null };
    })
  );
}

// ...

// Guardar info de la asignatura
if (asignaturaData?.data) {
  setAsignaturaInfo(asignaturaData.data);
  console.log('✅ Información de asignatura cargada:', {
    id: asignaturaData.data.id,
    nombre: asignaturaData.data.nombre,
    codigo: asignaturaData.data.codigo,
    nivel: asignaturaData.data.nivel
  });
}
```

### 3. Funciones Helper (AGREGAR después de línea 936)

Agregar estas dos funciones después de `handleEditProgramaAnalitico`:

```typescript
  // 🔥 FUNCIÓN HELPER: Auto-completar celdas con información de la asignatura
  const getAutoFilledContent = (cell: TableCell, rowIndex: number, cellIndex: number): string => {
    if (!asignaturaInfo) return cell.content;
    
    const content = cell.content.toUpperCase().trim();
    
    // Detectar si la celda actual debería tener información automática
    // Buscar en la fila anterior si hay un encabezado que indique qué información va aquí
    if (rowIndex > 0 && tableData[rowIndex - 1]) {
      const headerCell = tableData[rowIndex - 1].cells[cellIndex];
      const headerText = headerCell?.content.toUpperCase().trim() || "";
      
      // Si la celda de arriba dice "ASIGNATURA"
      if (headerText.includes("ASIGNATURA") && (!content || content === "")) {
        return `${asignaturaInfo.codigo || ""} - ${asignaturaInfo.nombre || ""}`;
      }
      
      // Si la celda de arriba dice "PERIODO" o "PAO"
      if ((headerText.includes("PERIODO") || headerText.includes("PAO")) && (!content || content === "")) {
        return selectedPeriod || "";
      }
      
      // Si la celda de arriba dice "NIVEL"
      if (headerText.includes("NIVEL") && (!content || content === "")) {
        return asignaturaInfo.nivel?.nombre || "";
      }
    }
    
    return cell.content;
  };

  // 🔥 FUNCIÓN: Determinar si una celda debe ser readonly (bloqueada)
  const isCellReadOnly = (cell: TableCell, rowIndex: number, cellIndex: number): boolean => {
    if (!asignaturaInfo || !cell.isEditable) return false;
    
    // Buscar en la fila anterior si hay un encabezado
    if (rowIndex > 0 && tableData[rowIndex - 1]) {
      const headerCell = tableData[rowIndex - 1].cells[cellIndex];
      const headerText = headerCell?.content.toUpperCase().trim() || "";
      
      // Bloquear celdas debajo de ASIGNATURA, PERIODO, NIVEL
      if (headerText.includes("ASIGNATURA") || 
          headerText.includes("PERIODO") || 
          headerText.includes("PAO") ||
          headerText.includes("NIVEL")) {
        return true;
      }
    }
    
    return false;
  };
```

### 4. Usar las Funciones en el Renderizado de Celdas

En la línea ~1273 donde se renderiza el contenido de la celda, REEMPLAZAR:

**ANTES** (línea ~1290):
```typescript
<div className="whitespace-pre-wrap leading-normal break-words">
  {cell.content || <span className="opacity-0">.</span>}
</div>
```

**DESPUÉS**:
```typescript
<div className="whitespace-pre-wrap leading-normal break-words">
  {getAutoFilledContent(cell, rowIndex, cellIndex) || <span className="opacity-0">.</span>}
</div>
```

### 5. Deshabilitar Edición en Celdas Bloqueadas

En la línea ~1267 donde está el `onDoubleClick`, MODIFICAR:

**ANTES**:
```typescript
onDoubleClick={() => cell.isEditable && startEditing(cell.id, cell.content)}
```

**DESPUÉS**:
```typescript
onDoubleClick={() => {
  const isReadOnly = isCellReadOnly(cell, rowIndex, cellIndex);
  if (cell.isEditable && !isReadOnly) {
    startEditing(cell.id, getAutoFilledContent(cell, rowIndex, cellIndex));
  }
}}
```

### 6. Agregar Estilo Visual para Celdas Bloqueadas

En la línea ~1241 donde está el className del `<td>`, MODIFICAR:

**ANTES**:
```typescript
className={`border border-gray-300 relative hover:ring-1 hover:ring-emerald-400 transition-all cursor-pointer ${
  selectedCells.includes(cell.id) ? 'bg-emerald-100 ring-2 ring-emerald-500' : ''
} ${isHeader ? 'font-bold text-center' : ''}`}
```

**DESPUÉS**:
```typescript
className={`border border-gray-300 relative hover:ring-1 hover:ring-emerald-400 transition-all ${
  isCellReadOnly(cell, rowIndex, cellIndex) ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
} ${
  selectedCells.includes(cell.id) ? 'bg-emerald-100 ring-2 ring-emerald-500' : ''
} ${isHeader ? 'font-bold text-center' : ''}`}
```

## 🎯 Resultado

Con estos cambios:

1. **Asignatura**: Se llena automáticamente con `TI-301 - Programación Web`
2. **Periodo**: Se llena con `"Primer Periodo PII 2026"`
3. **Nivel**: Se llena con el nombre del nivel (ej: `"Tercer Nivel"`)
4. **Celdas bloqueadas**: Tienen fondo gris (`bg-gray-100`) y cursor `not-allowed`
5. **No se pueden editar**: Al hacer doble click no se activa el modo de edición

## 📊 Ejemplo Visual

```
┌────────────┬──────────────────────┬────────────┐
│ ASIGNATURA │ PERIODO ACADÉMICO... │ NIVEL      │
├────────────┼──────────────────────┼────────────┤
│ TI-301 -   │ Primer Periodo PII   │ Tercer     │
│ Program... │ 2026                 │ Nivel      │
│ [BLOQUEADA]│ [BLOQUEADA]          │ [BLOQUEADA]│
└────────────┴──────────────────────┴────────────┘
```

## 📝 Instrucciones de Implementación

1. Agregar las dos funciones helper después de `handleEditProgramaAnalitico`
2. Modificar el renderizado del contenido de celda (usar `getAutoFilledContent`)
3. Modificar el `onDoubleClick` para verificar `isCellReadOnly`
4. Modificar el `className` del `<td>` para agregar estilos visuales

## ✅ Verificación

Después de implementar:
1. Acceder desde una asignatura: `?asignatura=31`
2. Seleccionar un periodo
3. Crear un nuevo programa o cargar uno existente
4. Verificar que los campos se llenen automáticamente
5. Intentar editar esos campos → Debería estar bloqueado

## 📅 Fecha
**4 de febrero de 2026**
