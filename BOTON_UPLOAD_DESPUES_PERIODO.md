# 🎯 UBICACIÓN DEL BOTÓN DE UPLOAD - DESPUÉS DE SELECCIONAR PERIODO

## 📍 **FLUJO VISUAL**

### **PASO 1: Pantalla Inicial (Sin Periodo Seleccionado)**

```
┌──────────────────────────────────────────────────────────────┐
│  Editor de Programa Analítico        [Nuevo] [Guardar] [PDF] │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Periodo: [Seleccione el periodo ▼]                          │
│                                                               │
│  ⚠️ Seleccione un periodo para continuar                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

### **PASO 2: Después de Seleccionar Periodo** ✨

```
┌──────────────────────────────────────────────────────────────┐
│  Editor de Programa Analítico        [Nuevo] [Guardar] [PDF] │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Periodo: [Primer Periodo PII 2026 ▼]  ✅                    │
│                                                               │
│  ────────────────────────────────────────────────────────    │
│                                                               │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  🟢 SECCIÓN VERDE - APARECE AUTOMÁTICAMENTE           ┃  │
│  ┃                                                        ┃  │
│  ┃  📤 Crear Programa Analítico desde Word               ┃  │
│  ┃  Sube un archivo Word y se validará contra la         ┃  │
│  ┃  plantilla maestra                                     ┃  │
│  ┃                                                        ┃  │
│  ┃  ┌──────────────────────────────────────┐             ┃  │
│  ┃  │ Asignatura:                          │             ┃  │
│  ┃  │ TI-301 - Programación II             │             ┃  │
│  ┃  └──────────────────────────────────────┘             ┃  │
│  ┃                                                        ┃  │
│  ┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃  │
│  ┃  ┃  📤 Subir Programa Analítico (.docx)        ┃  ┃  │
│  ┃  ┃                                              ┃  ┃  │
│  ┃  ┃  ← ¡HACER CLIC AQUÍ!                        ┃  ┃  │
│  ┃  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃  │
│  ┃                                                        ┃  │
│  ┃  ✓ Los campos de cabecera se llenarán automáticamente ┃  │
│  ┃                                                        ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎨 **CARACTERÍSTICAS DEL BOTÓN**

### **Color y Estilo:**
- 🟢 **Color**: Verde esmeralda (bg-emerald-600)
- 📐 **Tamaño**: Grande, ancho completo
- 🎨 **Fondo**: Gradiente verde claro
- 🔲 **Borde**: Verde esmeralda (border-emerald-300)
- ⚡ **Icono**: 📤 Upload

### **Ubicación:**
```
Selector de Periodo
        ↓
  (Línea divisoria)
        ↓
🟢 SECCIÓN VERDE APARECE
        ↓
    BOTÓN UPLOAD
```

---

## 🔄 **CONDICIONES DE VISIBILIDAD**

### ✅ **El botón SE MUESTRA cuando:**
1. Has seleccionado un periodo en el dropdown
2. `selectedPeriod` tiene un valor

### ❌ **El botón NO SE MUESTRA cuando:**
1. No has seleccionado ningún periodo
2. `selectedPeriod` está vacío

---

## 📱 **RESPONSIVE (Móvil vs Desktop)**

### **Desktop:**
```
┌────────────────────────────────────────────────┐
│  Periodo: [Primer Periodo PII 2026 ▼]         │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  📤 Crear Programa Analítico desde Word  │ │
│  │                                          │ │
│  │  [Botón grande ancho completo]          │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### **Móvil:**
```
┌──────────────────────┐
│  Periodo:            │
│  [Primer... ▼]       │
│                      │
│  ┌────────────────┐  │
│  │  📤 Crear      │  │
│  │  Programa      │  │
│  │                │  │
│  │  [Botón]       │  │
│  └────────────────┘  │
└──────────────────────┘
```

---

## 🎯 **FLUJO DE USUARIO COMPLETO**

```
1. Usuario abre la página
         ↓
2. Ve selector de periodo (sin botón)
         ↓
3. Selecciona periodo del dropdown
         ↓
4. 🎉 APARECE sección verde con botón
         ↓
5. Lee información (asignatura si existe)
         ↓
6. Hace clic en botón verde grande
         ↓
7. Se abre selector de archivos
         ↓
8. Selecciona archivo .docx
         ↓
9. Botón muestra "⏳ Procesando..."
         ↓
10. Sistema valida y procesa
         ↓
11. Aparece modal con resultado
```

---

## 🎬 **ANIMACIÓN DEL BOTÓN**

### **Estado Normal:**
```
┌────────────────────────────────────────┐
│  📤 Subir Programa Analítico (.docx)   │
└────────────────────────────────────────┘
```

### **Hover (Mouse encima):**
```
┌────────────────────────────────────────┐
│  📤 Subir Programa Analítico (.docx)   │ ← Más oscuro
│                                        │
│  (Cursor: pointer)                     │
└────────────────────────────────────────┘
```

### **Cargando:**
```
┌────────────────────────────────────────┐
│  ⏳ Procesando...                       │ ← Spinner animado
└────────────────────────────────────────┘
```

### **Deshabilitado (sin periodo):**
```
┌────────────────────────────────────────┐
│  📤 Subir Programa Analítico (.docx)   │ ← Gris claro
│                                        │
│  (No clickeable)                       │
└────────────────────────────────────────┘
```

---

## 💡 **MENSAJES CONTEXTUALES**

### **CON Asignatura (URL: ?asignatura=31):**
```
┌──────────────────────────────────────────────┐
│  Asignatura:                                 │
│  TI-301 - Programación II                    │
│                                              │
│  [Botón Upload]                              │
│                                              │
│  ✓ Los campos de cabecera se llenarán       │
│    automáticamente                           │
└──────────────────────────────────────────────┘
```

### **SIN Asignatura (URL sin parámetro):**
```
┌──────────────────────────────────────────────┐
│  Sube un programa analítico en formato Word  │
│                                              │
│  [Botón Upload]                              │
│                                              │
│  Solo archivos Word (.docx)                  │
└──────────────────────────────────────────────┘
```

---

## 🔧 **CÓDIGO TÉCNICO**

### **Lógica de Visibilidad:**
```typescript
{selectedPeriod && (
  <div className="mt-6 pt-6 border-t">
    {/* Sección verde aparece aquí */}
  </div>
)}
```

### **Estilos del Botón:**
```css
className="
  w-full                     /* Ancho completo */
  bg-emerald-600            /* Verde esmeralda */
  hover:bg-emerald-700      /* Hover más oscuro */
  text-white                /* Texto blanco */
  font-semibold             /* Negrita */
  py-4                      /* Padding vertical */
  shadow-lg                 /* Sombra */
"
```

---

## ✅ **CHECKLIST PARA VER EL BOTÓN**

- [ ] Página cargada: `/dashboard/comision/crear-programa-analitico`
- [ ] Selector de periodo visible
- [ ] **HE SELECCIONADO UN PERIODO** ← CLAVE
- [ ] Sección verde aparece debajo
- [ ] Botón grande verde visible
- [ ] Al hacer clic, se abre selector de archivos

---

## 🐛 **TROUBLESHOOTING**

### **Problema: No veo el botón después de seleccionar periodo**

**Verificar en consola del navegador (F12):**
```javascript
console.log("Periodo seleccionado:", selectedPeriod);
// Debe mostrar: "Primer Periodo PII 2026" o similar
// Si muestra null o "", esa es la causa
```

**Solución:**
1. Hacer clic en el selector de periodo
2. Seleccionar una opción de la lista
3. El botón debe aparecer INMEDIATAMENTE

---

### **Problema: El botón aparece pero está gris/deshabilitado**

**Causa:** `isLoading = true`

**Solución:**
1. Esperar a que termine el proceso anterior
2. Recargar la página (F5)

---

## 📸 **CAPTURA SIMULADA - ANTES Y DESPUÉS**

### **ANTES (Sin periodo seleccionado):**
```
┌─────────────────────────────────────┐
│                                     │
│  Periodo: [Seleccione... ▼]        │
│                                     │
│  (Espacio vacío)                    │
│                                     │
└─────────────────────────────────────┘
```

### **DESPUÉS (Periodo seleccionado):**
```
┌─────────────────────────────────────┐
│                                     │
│  Periodo: [PII 2026 ▼] ✅          │
│                                     │
│  ═══════════════════════════════    │
│                                     │
│  ╔════════════════════════════════╗ │
│  ║  📤 Crear Programa Analítico  ║ │
│  ║                               ║ │
│  ║  [BOTÓN VERDE GRANDE]         ║ │
│  ╚════════════════════════════════╝ │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎓 **PARA USUARIOS FINALES**

### **Instrucciones Simples:**

1. **Selecciona el periodo** en el dropdown de arriba
2. **Aparecerá** una sección verde con un botón grande
3. **Haz clic** en el botón verde
4. **Selecciona** tu archivo Word (.docx)
5. **Espera** mientras se procesa (5-15 segundos)
6. **Revisa** el resultado en el modal que aparece

---

## 📊 **ESTADÍSTICAS DE VISIBILIDAD**

```
┌─────────────────────────────────────────┐
│  Condición         │  Botón Visible     │
├─────────────────────────────────────────┤
│  Sin periodo       │  ❌ NO             │
│  Con periodo       │  ✅ SÍ             │
│  Sin asignatura    │  ✅ SÍ (básico)    │
│  Con asignatura    │  ✅ SÍ (completo)  │
│  Cargando          │  ⏳ Deshabilitado  │
└─────────────────────────────────────────┘
```

---

## 🚀 **VENTAJAS DEL NUEVO DISEÑO**

✅ **Aparece justo cuando se necesita** (después de seleccionar periodo)
✅ **Color verde distintivo** (fácil de identificar)
✅ **Información contextual** (muestra asignatura si existe)
✅ **Botón grande y claro** (no se puede perder)
✅ **Mensajes de ayuda** (explica qué hará)
✅ **Feedback visual** (spinner mientras carga)

---

**¿Necesitas más ayuda?**
- Recarga la página y selecciona un periodo
- El botón debe aparecer inmediatamente
- Si no aparece, verifica la consola (F12) para errores
