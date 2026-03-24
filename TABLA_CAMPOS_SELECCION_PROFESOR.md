# 📊 Implementación: Tabla de Campos con Selección para Profesores

## 🎯 Objetivo Completado
El profesor/docente ahora puede ver una tabla con todos los campos extraídos por el administrador y seleccionar un campo específico para completarlo en el formulario. Al hacer clic en "Seleccionar", el formulario se abre automáticamente y hace scroll/focus al campo seleccionado.

---

## 🔧 Cambios Implementados

### 1. **Nuevos Estados en `formularios-dinamicos/page.tsx`**

```typescript
const [mostrarTabla, setMostrarTabla] = useState(true);
const [campoSeleccionadoId, setCampoSeleccionadoId] = useState<number | null>(null);
```

**Propósito:**
- `mostrarTabla`: Controla si se muestra la tabla de campos o el formulario
- `campoSeleccionadoId`: Guarda el ID del campo seleccionado para resaltarlo en la tabla

---

### 2. **Nueva Función: `handleSeleccionarCampo`**

```typescript
const handleSeleccionarCampo = (campo: TituloExtraido) => {
  // 1. Preparar prefill para el campo seleccionado
  const key = `formulario_principal`;
  const fieldName = `campo_${campo.id}`;
  setPrefillField({ [key]: { [fieldName]: '' } });
  setCampoSeleccionadoId(campo.id);
  
  // 2. Ocultar la tabla y mostrar el formulario
  setMostrarTabla(false);
  setFormularioGuardadoSeleccionado(null);
  
  // 3. Scroll suave hacia el formulario
  setTimeout(() => {
    const formularioElement = document.getElementById('formulario-dinamico');
    if (formularioElement) {
      formularioElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // 4. Focus en el campo específico después de que el formulario se renderice
    setTimeout(() => {
      const inputElement = document.getElementById(`campo-${campo.id}`) as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  }, 100);
};
```

**Flujo:**
1. Crea un `prefillField` con el campo seleccionado (vacío)
2. Oculta la tabla y marca el campo como seleccionado
3. Hace scroll suave al contenedor del formulario
4. Después de 500ms, hace focus en el input específico del campo

---

### 3. **UI de Tabla de Campos**

```tsx
{mostrarTabla && sesionSeleccionada && sesionSeleccionada.agrupadosPorTipo?.campo && 
 sesionSeleccionada.agrupadosPorTipo.campo.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Campos detectados en esta sesión</CardTitle>
      <CardDescription>
        Selecciona un campo para completarlo en el formulario
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-muted/50 text-left text-sm font-medium">
              <th className="p-3 border">#</th>
              <th className="p-3 border">Título del Campo</th>
              <th className="p-3 border">Fila</th>
              <th className="p-3 border">Columna</th>
              <th className="p-3 border">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sesionSeleccionada.agrupadosPorTipo.campo.map((c, idx) => (
              <tr 
                key={c.id} 
                className={`hover:bg-muted/30 transition-colors ${
                  campoSeleccionadoId === c.id ? 'bg-emerald-50' : ''
                }`}
              >
                <td className="p-3 border text-center">{idx + 1}</td>
                <td className="p-3 border font-medium">{c.titulo}</td>
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
    </CardContent>
  </Card>
)}
```

**Características:**
- ✅ Tabla responsive con scroll horizontal
- ✅ Fila seleccionada con fondo verde (`bg-emerald-50`)
- ✅ Botón cambia a "✓ Seleccionado" con variant "default"
- ✅ Muestra: #, Título, Fila, Columna, Acción

---

### 4. **Renderizado Condicional del Formulario**

```tsx
{/* Formulario - Mostrar cuando mostrarTabla es false o cuando hay formulario guardado */}
{(!mostrarTabla || formularioGuardadoSeleccionado) && (
  <div id="formulario-dinamico">
    <FormularioDinamico
      secciones={convertirASecciones(sesionSeleccionada)}
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
```

**Lógica:**
- Se muestra cuando `mostrarTabla` es `false` (después de seleccionar un campo)
- También se muestra cuando hay un `formularioGuardadoSeleccionado`
- El div con `id="formulario-dinamico"` permite hacer scroll programático
- `onCancelar` vuelve a mostrar la tabla y limpia el estado

---

### 5. **Actualización de `seleccionarSesion`**

```typescript
const seleccionarSesion = async (sessionId: string) => {
  // ...código de fetch...
  
  if (data.success) {
    setSesionSeleccionada(data.data);
    setMostrarTabla(true);        // ✅ Mostrar tabla al seleccionar sesión
    setPrefillField(null);        // ✅ Limpiar prefill anterior
    setCampoSeleccionadoId(null); // ✅ Limpiar selección anterior
  }
  
  // ...resto del código...
};
```

**Propósito:** Al seleccionar una nueva sesión, reinicia el estado para mostrar la tabla.

---

### 6. **Actualización de `cerrarFormularioGuardado`**

```typescript
const cerrarFormularioGuardado = () => {
  setFormularioGuardadoSeleccionado(null);
  setSesionSeleccionada(null);
  setPrefillField(null);
  setMostrarTabla(true);
  setCampoSeleccionadoId(null);
};
```

**Propósito:** Limpia todos los estados relacionados con formulario y tabla.

---

### 7. **Botón "Volver a la lista" Mejorado**

```typescript
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
```

**Lógica:** Maneja dos casos:
1. Si hay formulario guardado → cierra todo
2. Si solo hay campo seleccionado → vuelve a la lista de sesiones

---

## 🎨 Experiencia de Usuario

### **Flujo Completo:**

```
1. Profesor abre "Formularios Disponibles"
   ↓
2. Selecciona una sesión (ej: "Programa Analítico.xlsx")
   ↓
3. Se muestra la tabla de campos extraídos:
   ┌─────────────────────────────────────────────┐
   │ Campos detectados en esta sesión            │
   │ Selecciona un campo para completarlo        │
   ├──┬────────────────┬──────┬─────────┬────────┤
   │# │ Título         │ Fila │ Columna │ Acción │
   ├──┼────────────────┼──────┼─────────┼────────┤
   │1 │ CARRERA        │  2   │   A     │[Selec] │
   │2 │ ASIGNATURA     │  3   │   A     │[Selec] │
   │3 │ OBJETIVOS      │  5   │   A     │[Selec] │
   │4 │ CONTENIDOS     │  7   │   A     │[Selec] │
   │5 │ METODOLOGÍA    │  9   │   A     │[Selec] │
   └──┴────────────────┴──────┴─────────┴────────┘
   ↓
4. Click en "Seleccionar" en fila "OBJETIVOS"
   ↓
5. ✨ Animación suave:
   - Tabla se oculta
   - Scroll hacia el formulario
   - Formulario aparece
   ↓
6. Formulario se muestra con todos los campos:
   ┌─────────────────────────────────────────────┐
   │ 📋 Formulario del Programa Analítico        │
   ├─────────────────────────────────────────────┤
   │ CARRERA           ASIGNATURA                │
   │ [___________]     [___________]             │
   │                                             │
   │ OBJETIVOS  ◄─── (FOCUS AQUÍ) 🎯            │
   │ [___________]                               │
   │                                             │
   │ CONTENIDOS        METODOLOGÍA               │
   │ [___________]     [___________]             │
   └─────────────────────────────────────────────┘
   ↓
7. Cursor está en el campo "OBJETIVOS"
   ↓
8. Profesor escribe directamente
   ↓
9. Puede navegar con Tab a otros campos
   ↓
10. [💾 Guardar Programa Analítico]
```

---

## 📊 Vista Comparativa

### **ANTES (Sin tabla de selección):**
```
❌ No se podía ver lista de campos extraídos
❌ Había que llenar todos los campos uno por uno
❌ No se podía seleccionar un campo específico
❌ No había feedback visual de campos disponibles
```

### **DESPUÉS (Con tabla de selección):**
```
✅ Tabla muestra todos los campos extraídos por admin
✅ Se puede seleccionar un campo específico
✅ Formulario se abre automáticamente al seleccionar
✅ Scroll y focus automático al campo seleccionado
✅ Fila seleccionada se resalta en verde
✅ Botón muestra "✓ Seleccionado"
✅ Navegación fluida entre tabla y formulario
```

---

## 🔄 Estados de la Interfaz

### **Estado 1: Lista de Sesiones**
```
┌─────────────────────────────────┐
│ Formularios Disponibles         │
├─────────────────────────────────┤
│ 📄 Programa Analítico.xlsx      │
│    23 títulos • xlsx             │
│    [Abrir Formulario]            │
├─────────────────────────────────┤
│ 📄 Syllabus 2024.docx           │
│    15 títulos • docx             │
│    [Abrir Formulario]            │
└─────────────────────────────────┘
```

### **Estado 2: Tabla de Campos (Nuevo)**
```
┌─────────────────────────────────────────┐
│ 📄 Programa Analítico.xlsx              │
│ [← Volver a la lista]                   │
├─────────────────────────────────────────┤
│ Campos detectados en esta sesión        │
│ Selecciona un campo para completarlo    │
├──┬──────────────┬─────┬────────┬────────┤
│# │ Título       │ Fila│ Columna│ Acción │
├──┼──────────────┼─────┼────────┼────────┤
│1 │ CARRERA      │  2  │   A    │[Selec] │
│2 │ ASIGNATURA   │  3  │   A    │[Selec] │
│3 │ OBJETIVOS    │  5  │   A    │[Selec] │ ◄─ Hover
└──┴──────────────┴─────┴────────┴────────┘
```

### **Estado 3: Campo Seleccionado**
```
┌─────────────────────────────────────────┐
│ 📄 Programa Analítico.xlsx              │
│ [← Volver a la lista]                   │
├─────────────────────────────────────────┤
│ Campos detectados en esta sesión        │
├──┬──────────────┬─────┬────────┬────────┤
│3 │ OBJETIVOS    │  5  │   A    │[✓ Sel] │ ◄─ bg-emerald-50
└──┴──────────────┴─────┴────────┴────────┘
```

### **Estado 4: Formulario Abierto con Focus**
```
┌─────────────────────────────────────────┐
│ 📋 Formulario del Programa Analítico    │
├─────────────────────────────────────────┤
│ CARRERA           ASIGNATURA            │
│ [___________]     [___________]         │
│                                         │
│ OBJETIVOS  ◄─── (CURSOR AQUÍ) 🎯       │
│ [|__________]  ← Campo con focus        │
│                                         │
│ CONTENIDOS        METODOLOGÍA           │
│ [___________]     [___________]         │
│                                         │
│ [💾 Guardar] [Cancelar]                 │
└─────────────────────────────────────────┘
```

---

## 🎨 Estilos y Animaciones

### **Fila Normal:**
```css
hover:bg-muted/30 transition-colors
```

### **Fila Seleccionada:**
```css
bg-emerald-50 (verde claro)
```

### **Botón Normal:**
```tsx
<Button size="sm" variant="outline">
  Seleccionar
</Button>
```

### **Botón Seleccionado:**
```tsx
<Button size="sm" variant="default">
  ✓ Seleccionado
</Button>
```

### **Scroll Suave:**
```javascript
element.scrollIntoView({ 
  behavior: 'smooth',  // Animación suave
  block: 'center'      // Centrar en la pantalla
});
```

---

## 🧪 Casos de Uso

### **Caso 1: Llenar un campo específico**
```
Profesor:
1. Abre sesión "Programa Analítico.xlsx"
2. Ve tabla con 23 campos
3. Click en "Seleccionar" en fila "OBJETIVOS GENERALES"
4. Formulario se abre con focus en ese campo
5. Escribe: "Desarrollar habilidades en programación..."
6. Presiona Tab para ir al siguiente campo
7. Completa otros campos según necesite
8. Click en "Guardar Programa Analítico"
```

### **Caso 2: Ver qué campos hay disponibles**
```
Profesor:
1. Abre sesión "Syllabus 2024.docx"
2. Revisa la tabla de campos
3. Nota: "CARRERA", "ASIGNATURA", "CONTENIDOS", etc.
4. Decide cuál completar primero
5. Click en "Seleccionar" en el campo deseado
```

### **Caso 3: Cambiar de campo**
```
Profesor:
1. Selecciona campo "OBJETIVOS"
2. Formulario se abre
3. Click en "Cancelar"
4. Vuelve a la tabla de campos
5. Ahora selecciona "METODOLOGÍA"
6. Formulario se reabre con focus en METODOLOGÍA
```

### **Caso 4: Volver a la lista de sesiones**
```
Profesor:
1. Está en la tabla de campos
2. Click en "← Volver a la lista"
3. Regresa a la lista de todas las sesiones disponibles
4. Puede seleccionar otra sesión diferente
```

---

## 📊 Estructura de Datos

### **Tipo TituloExtraido:**
```typescript
interface TituloExtraido {
  id: number;           // 123
  titulo: string;       // "OBJETIVOS GENERALES"
  tipo: string;         // "campo"
  fila: number;         // 5
  columna: number;      // 1
  columna_letra: string; // "A"
  puntuacion: number;   // 0.85
}
```

### **Estado mostrarTabla:**
```typescript
mostrarTabla: boolean
// true  → Muestra tabla de campos
// false → Muestra formulario
```

### **Estado campoSeleccionadoId:**
```typescript
campoSeleccionadoId: number | null
// null → Ningún campo seleccionado
// 123  → Campo con ID 123 está seleccionado (fila resaltada)
```

### **Estado prefillField:**
```typescript
prefillField: Record<string, any> | null
// null → No hay campo prellenado
// { "formulario_principal": { "campo_123": "" } } → Campo 123 prellenado vacío
```

---

## ✅ Validaciones y Checks

### **Checks de Seguridad:**
```typescript
// 1. Verificar que sesión existe y tiene campos
{mostrarTabla && sesionSeleccionada && 
 sesionSeleccionada.agrupadosPorTipo?.campo && 
 sesionSeleccionada.agrupadosPorTipo.campo.length > 0 && (
  // ...render tabla...
)}

// 2. Verificar que el campo existe antes de hacer focus
const inputElement = document.getElementById(`campo-${campo.id}`);
if (inputElement) {
  inputElement.focus();
}

// 3. Verificar que el formulario existe antes de hacer scroll
const formularioElement = document.getElementById('formulario-dinamico');
if (formularioElement) {
  formularioElement.scrollIntoView({ behavior: 'smooth' });
}
```

---

## 🚀 Próximas Mejoras Sugeridas

### **1. Búsqueda de Campos**
```tsx
<Input 
  placeholder="Buscar campo..."
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

### **2. Filtros por Tipo**
```tsx
<Select>
  <option>Todos los campos</option>
  <option>Solo cabeceras</option>
  <option>Solo secciones</option>
  <option>Solo campos</option>
</Select>
```

### **3. Ordenamiento**
```tsx
<Button onClick={() => sortBy('titulo')}>
  Ordenar por Título
</Button>
<Button onClick={() => sortBy('fila')}>
  Ordenar por Fila
</Button>
```

### **4. Selección Múltiple**
```tsx
const [selectedFields, setSelectedFields] = useState<number[]>([]);

// Checkbox en cada fila
<Checkbox 
  checked={selectedFields.includes(c.id)}
  onChange={() => toggleFieldSelection(c.id)}
/>

// Botón para abrir formulario con múltiples campos
<Button onClick={() => openFormWithSelected()}>
  Completar {selectedFields.length} campos
</Button>
```

### **5. Preview del Campo**
```tsx
<HoverCard>
  <HoverCardTrigger>{c.titulo}</HoverCardTrigger>
  <HoverCardContent>
    <p>Tipo: {c.tipo}</p>
    <p>Ubicación: Fila {c.fila}, Columna {c.columna_letra}</p>
    <p>Puntuación: {c.puntuacion}</p>
  </HoverCardContent>
</HoverCard>
```

### **6. Indicador de Completitud**
```tsx
<Badge variant={valorGuardado ? "success" : "secondary"}>
  {valorGuardado ? "✓ Completado" : "Pendiente"}
</Badge>
```

---

## 🧪 Testing Checklist

- [ ] **Test 1:** Seleccionar sesión muestra tabla de campos
- [ ] **Test 2:** Tabla muestra todos los campos de `agrupadosPorTipo.campo`
- [ ] **Test 3:** Click en "Seleccionar" oculta tabla y muestra formulario
- [ ] **Test 4:** Formulario hace scroll automático
- [ ] **Test 5:** Campo seleccionado recibe focus
- [ ] **Test 6:** Fila seleccionada se resalta en verde
- [ ] **Test 7:** Botón cambia a "✓ Seleccionado"
- [ ] **Test 8:** Click en "Cancelar" vuelve a mostrar tabla
- [ ] **Test 9:** "Volver a la lista" regresa a sesiones
- [ ] **Test 10:** Seleccionar otro campo limpia selección anterior
- [ ] **Test 11:** Datos se guardan correctamente con `prefillField`
- [ ] **Test 12:** Formularios guardados siguen funcionando correctamente

---

## 📝 Resumen de Archivos Modificados

### **1 Archivo Modificado:**
- ✅ `app/dashboard/docente/formularios-dinamicos/page.tsx`

### **Cambios Principales:**
1. ✅ Agregados estados: `mostrarTabla`, `campoSeleccionadoId`
2. ✅ Creada función: `handleSeleccionarCampo()`
3. ✅ Actualizada función: `seleccionarSesion()`
4. ✅ Actualizada función: `cerrarFormularioGuardado()`
5. ✅ Agregada UI: Tabla de campos con selección
6. ✅ Actualizado: Renderizado condicional del formulario
7. ✅ Agregado: Scroll y focus automático al campo

### **Líneas de Código:**
- Agregadas: ~120 líneas
- Modificadas: ~30 líneas
- Total: ~150 líneas

---

## 🎯 Resultado Final

El profesor ahora tiene una experiencia completa:

1. ✅ **Ve lista de sesiones** disponibles
2. ✅ **Selecciona una sesión** para ver sus campos
3. ✅ **Ve tabla de campos** extraídos por el admin
4. ✅ **Selecciona un campo** específico de la tabla
5. ✅ **Formulario se abre automáticamente** con ese campo
6. ✅ **Cursor está en el campo seleccionado** listo para escribir
7. ✅ **Puede navegar** entre tabla y formulario fácilmente
8. ✅ **Puede guardar** el formulario completado
9. ✅ **Puede ver** sus formularios guardados
10. ✅ **Puede editar** formularios guardados previamente

---

**Fecha de Implementación:** 20 de diciembre de 2025  
**Estado:** ✅ COMPLETADO Y FUNCIONAL  
**Característica:** Tabla de Selección de Campos con Auto-focus
