# 🎯 GUÍA VISUAL: DÓNDE ENCONTRAR EL BOTÓN DE EXTRAER TÍTULOS

## 📍 UBICACIÓN DEL BOTÓN

El botón **"Extraer Títulos de Syllabus"** está en la página de **Gestión de Syllabus**.

### **PASO 1: Ir a Gestión de Syllabus**

```
URL: http://localhost:3000/dashboard/admin/syllabus
```

### **PASO 2: Buscar en la parte superior derecha**

```
┌────────────────────────────────────────────────────────────────────────┐
│  Syllabus Registrados                                                   │
│  Visualiza y gestiona todos los syllabus del sistema                    │
│                                                                          │
│  ┌──────────────────────────────┐  ┌────────────────────────┐          │
│  │ 📤 Extraer Títulos Syllabus  │  │ 📤 Subir Documento     │          │
│  │                               │  │    Word                │          │
│  └──────────────────────────────┘  └────────────────────────┘          │
│           BOTÓN MORADO ↑                  BOTÓN BLANCO ↑               │
│           (Nuevo)                         (Existente)                   │
└────────────────────────────────────────────────────────────────────────┘
```

## 🎨 CARACTERÍSTICAS DEL BOTÓN

### **Color:**
- 🟣 **Morado** (`bg-purple-600`)
- Hover: Morado oscuro (`hover:bg-purple-700`)

### **Icono:**
- 📤 Upload (icono de subir)

### **Texto:**
- "Extraer Títulos de Syllabus"

### **Posición:**
- **Esquina superior derecha** de la sección "Syllabus Registrados"
- **A la izquierda** del botón "Subir Documento Word"
- **Antes** del botón "Crear Nuevo Syllabus"

---

## 🖼️ REPRESENTACIÓN VISUAL

```
════════════════════════════════════════════════════════════════════
                    GESTIÓN DE SYLLABUS
════════════════════════════════════════════════════════════════════

┌─ Lista de Syllabus ───────────────────────── Subir Documento ───┐
│                                                                   │
│   ╔══════════════════════════════════════════════════════════╗  │
│   ║  Syllabus Registrados                                     ║  │
│   ║  Visualiza y gestiona todos los syllabus del sistema      ║  │
│   ║                                                            ║  │
│   ║  ┏━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━━━━━┓  ║  │
│   ║  ┃ 📤 Extraer Títulos     ┃  ┃ 📤 Subir Documento  ┃  ║  │
│   ║  ┃    de Syllabus         ┃  ┃    Word             ┃  ║  │
│   ║  ┗━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━━━━━┛  ║  │
│   ║      ↑ ESTE ES EL NUEVO        ↑ Este ya existía        ║  │
│   ║                                                            ║  │
│   ╚══════════════════════════════════════════════════════════╝  │
│                                                                   │
│   [Buscar por asignatura, código o profesor...]                  │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Fundamentos de Programación                    Aprobado │   │
│   │ Código: TI-03 | Período: PI 2025                     👁 ✏ 🗑 │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🚀 CÓMO USARLO

### **Opción 1: Desde Dashboard Admin**
```
1. http://localhost:3000/dashboard/admin
2. Click en tarjeta morada: "🔥 Extraer Títulos Syllabus"
3. ¡Listo!
```

### **Opción 2: Desde Gestión de Syllabus**
```
1. http://localhost:3000/dashboard/admin/syllabus
2. Buscar botón MORADO arriba a la derecha
3. Click en "📤 Extraer Títulos de Syllabus"
4. ¡Listo!
```

### **Opción 3: URL Directa**
```
http://localhost:3000/dashboard/admin/syllabus/extraer-titulos
```

---

## 🔍 SI NO VES EL BOTÓN

### **Solución 1: Recargar la página**
```
Presiona: Ctrl + R (Windows) o Cmd + R (Mac)
O mejor: Ctrl + Shift + R (hard refresh)
```

### **Solución 2: Verificar que el frontend esté corriendo**
```bash
# En la terminal, deberías ver:
✓ Ready in 3.2s
○ Local: http://localhost:3000
```

### **Solución 3: Limpiar caché del navegador**
```
1. Abrir DevTools: F12
2. Click derecho en el botón de recargar
3. Seleccionar "Vaciar caché y recargar página"
```

---

## 📸 COMPARACIÓN: ANTES vs DESPUÉS

### **ANTES:**
```
┌────────────────────────────────────────────────┐
│  Syllabus Registrados                          │
│                                                 │
│  ┌────────────────┐  ┌──────────────────────┐ │
│  │ 📤 Subir Doc   │  │ ➕ Crear Nuevo       │ │
│  └────────────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────┘
```

### **DESPUÉS (AHORA):**
```
┌────────────────────────────────────────────────────────────┐
│  Syllabus Registrados                                       │
│                                                              │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ 📤 Extraer   │  │ 📤 Subir Doc   │  │ ➕ Crear Nuevo │ │
│  │    Títulos   │  │                │  │                │ │
│  └──────────────┘  └────────────────┘  └────────────────┘ │
│       NUEVO!            Existente           Existente       │
└────────────────────────────────────────────────────────────┘
```

---

## ✨ DETALLES TÉCNICOS DEL BOTÓN

### **Código del botón:**
```tsx
<Link href="/dashboard/admin/syllabus/extraer-titulos">
  <Button className="bg-purple-600 hover:bg-purple-700">
    <Upload className="h-4 w-4 mr-2" />
    Extraer Títulos de Syllabus
  </Button>
</Link>
```

### **Ubicación en el archivo:**
- **Archivo:** `app/dashboard/admin/syllabus/page.tsx`
- **Líneas:** 150-155
- **Sección:** Dentro de `<CardHeader>` de "Syllabus Registrados"

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE HACER CLICK

1. **Te llevará a:** `/dashboard/admin/syllabus/extraer-titulos`
2. **Verás:** Formulario para subir archivo
3. **Subes:** Tu Excel o Word del Syllabus
4. **Click:** Botón "Extraer Títulos"
5. **Resultado:** Tabla con todos los títulos detectados
6. **Continúas:** A organizar en pestañas

---

## 📞 ¿NECESITAS MÁS AYUDA?

Si no ves el botón después de recargar:
1. Verifica que el archivo se haya guardado correctamente
2. Reinicia el servidor de desarrollo (npm run dev)
3. Limpia el caché del navegador
4. Usa la URL directa: http://localhost:3000/dashboard/admin/syllabus/extraer-titulos

---

## 🎉 ¡TODO LISTO!

El botón está ahí, es **MORADO**, tiene un icono de **📤**, dice **"Extraer Títulos de Syllabus"** y está en la esquina superior derecha de la sección "Syllabus Registrados".

**¡Recarga la página y verás el botón morado brillando! 🟣✨**
