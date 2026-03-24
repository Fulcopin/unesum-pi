# 📍 UBICACIÓN DEL BOTÓN DE SUBIDA - GUÍA VISUAL

## 🎯 **DÓNDE ESTÁ EL BOTÓN**

### **Paso 1: Acceder a la URL correcta**

```
✅ URL CORRECTA:
/dashboard/comision/crear-programa-analitico?asignatura=31&periodo=Primer%20Periodo%20PII%202026

❌ URL INCORRECTA (no mostrará el botón):
/dashboard/comision/crear-programa-analitico
```

### **Paso 2: Ver la pantalla inicial**

Cuando accedas con la URL correcta y estés logueado como **comisión_academica**, verás:

```
┌──────────────────────────────────────────────────────────────────┐
│  Editor de Programa Analítico            [Nuevo] [Guardar] [PDF] │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  🔵 SECCIÓN AZUL - AQUÍ ESTÁ EL BOTÓN                      ┃  │
│  ┃                                                             ┃  │
│  ┃  📋 Subir Programa Analítico con Validación Inteligente    ┃  │
│  ┃                                                             ┃  │
│  ┃  Sube un archivo Word (.docx) y el sistema lo validará    ┃  │
│  ┃  automáticamente contra la plantilla maestra del periodo   ┃  │
│  ┃                                                             ┃  │
│  ┃  ✓ Auto-llenado de datos oficiales                         ┃  │
│  ┃  ✓ Validación de estructura (90%+)                         ┃  │
│  ┃  ✓ Preserva contenido del docente                          ┃  │
│  ┃  ✓ Detecta secciones faltantes                             ┃  │
│  ┃                                                             ┃  │
│  ┃  ┌─────────────────────────────────────────┐               ┃  │
│  ┃  │ Asignatura seleccionada:                │               ┃  │
│  ┃  │ TI-301 - Programación II                │               ┃  │
│  ┃  │ Nivel: Tercer Semestre                  │               ┃  │
│  ┃  └─────────────────────────────────────────┘               ┃  │
│  ┃                                                             ┃  │
│  ┃  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┃  │
│  ┃  ┃  📤 Subir Programa Analítico (.docx)               ┃  ┃  │
│  ┃  ┃                                                     ┃  ┃  │
│  ┃  ┃  ← ¡HACER CLIC AQUÍ!                                ┃  ┃  │
│  ┃  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┃  │
│  ┃                                                             ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                   │
│  Periodo: [Primer Periodo PII 2026 ▼]                            │
│                                                                   │
│  ... resto del contenido ...                                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎨 **CARACTERÍSTICAS VISUALES DEL BOTÓN**

- **Color**: 🔵 Azul (bg-blue-600)
- **Tamaño**: Grande, ocupa todo el ancho
- **Icono**: 📤 Upload
- **Texto**: "Subir Programa Analítico (.docx)"
- **Ubicación**: Dentro de una sección azul destacada
- **Visible solo para**: comision_academica con ?asignatura=ID

---

## 🔄 **QUÉ PASA AL HACER CLIC**

```
1. Hacer clic en el botón azul
         ↓
2. Se abre selector de archivos del sistema
         ↓
3. Seleccionar archivo .docx
         ↓
4. Se cierra el selector automáticamente
         ↓
5. Aparece texto "Procesando documento..." con animación ⏳
         ↓
6. Backend procesa el archivo (5-15 segundos)
         ↓
7. Aparece modal con resultado de validación
         ↓
8. Si es exitoso → Se carga en el editor
   Si falla → Muestra errores específicos
```

---

## 📱 **ALTERNATIVA: Modal de Selección**

También puedes acceder al botón desde el **botón "Nuevo"**:

```
Clic en [Nuevo] 
         ↓
┌──────────────────────────────────────────┐
│  Seleccionar Programa Analítico          │
├──────────────────────────────────────────┤
│                                           │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  📤 Subir Nuevo Word (.docx)      ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                           │
│  O seleccione uno existente:             │
│                                           │
│  □ Programa Analítico - Mat 1            │
│  □ Programa Analítico - Mat 2            │
│                                           │
└──────────────────────────────────────────┘
```

---

## ✅ **CHECKLIST PARA VER EL BOTÓN**

- [ ] Estoy logueado como `comision_academica`
- [ ] La URL tiene `?asignatura=31` (o cualquier ID válido)
- [ ] La URL tiene `&periodo=...` (opcional pero recomendado)
- [ ] He seleccionado un periodo en el dropdown
- [ ] Veo la información de la asignatura (TI-301, etc.)
- [ ] Veo la sección azul destacada
- [ ] Veo el botón grande azul con icono 📤

Si **NO ves el botón**, verifica:

1. **Rol**: `console.log(user?.rol)` → debe ser "comision_academica"
2. **Parámetro**: `console.log(asignaturaIdParam)` → debe tener un número
3. **Periodo**: Debe haber seleccionado uno en el dropdown

---

## 🎯 **FLUJO COMPLETO RESUMIDO**

```
Admin → Crea plantilla maestra (asignatura_id = NULL)
    ↓
Comisión → Accede con ?asignatura=31
    ↓
Ve sección azul con botón grande
    ↓
Hace clic → Sube .docx
    ↓
Sistema valida (90%+ requerido)
    ↓
Llena ASIGNATURA, PERIODO, NIVEL automáticamente
    ↓
Preserva UNIDADES TEMÁTICAS del docente
    ↓
Guarda en BD con asignatura_id = 31
```

---

## 🆘 **SI NO VES EL BOTÓN**

### **Opción 1: Usar el modal "Nuevo"**
1. Hacer clic en botón "Nuevo" (esquina superior derecha)
2. En el modal, hacer clic en "📤 Subir Nuevo Word (.docx)"

### **Opción 2: Verificar en consola del navegador (F12)**
```javascript
// En la consola del navegador
console.log("Rol:", user?.rol);
console.log("Asignatura ID:", new URLSearchParams(window.location.search).get('asignatura'));
console.log("Periodo seleccionado:", selectedPeriod);
```

Si alguno es `null` o incorrecto, esa es la causa.

---

## 📸 **CAPTURA DE PANTALLA SIMULADA**

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ╔══════════════════════════════════════════════════════════╗  │
│  ║                     ZONA AZUL DESTACADA                  ║  │
│  ║                                                          ║  │
│  ║  📋 Subir Programa Analítico con Validación Inteligente ║  │
│  ║                                                          ║  │
│  ║  Sube un archivo Word (.docx) y el sistema lo validará ║  │
│  ║  automáticamente contra la plantilla maestra.           ║  │
│  ║                                                          ║  │
│  ║  ✓ Auto-llenado    ✓ Validación 90%+                   ║  │
│  ║  ✓ Preserva docente ✓ Detecta faltantes                ║  │
│  ║                                                          ║  │
│  ║  Asignatura: TI-301 - Programación II                  ║  │
│  ║  Nivel: Tercer Semestre                                 ║  │
│  ║                                                          ║  │
│  ║  ╔════════════════════════════════════════════════════╗ ║  │
│  ║  ║                                                    ║ ║  │
│  ║  ║   📤  Subir Programa Analítico (.docx)            ║ ║  │
│  ║  ║                                                    ║ ║  │
│  ║  ║              ← ¡BOTÓN AQUÍ!                        ║ ║  │
│  ║  ║                                                    ║ ║  │
│  ║  ╚════════════════════════════════════════════════════╝ ║  │
│  ║                                                          ║  │
│  ╚══════════════════════════════════════════════════════════╝  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Características del botón:**
- Fondo azul oscuro (#2563eb)
- Texto blanco
- Icono de upload a la izquierda
- Hover: Azul más oscuro (#1d4ed8)
- Altura: 6rem (py-6)
- Fuente grande: text-lg
- Sombra: shadow-lg

---

## 🎓 **PARA EL ADMIN: Crear Plantilla Maestra**

Antes de que la comisión pueda usar el sistema, el admin DEBE crear la plantilla:

```javascript
// En el dashboard del admin
const plantilla = {
  nombre: "Plantilla Oficial PII 2026",
  periodo: "Primer Periodo PII 2026",
  asignatura_id: null, // ← DEBE SER NULL
  datos_tabla: {
    secciones: [
      {
        titulo: "DATOS INFORMATIVOS",
        obligatoria: true,
        tipo: "cabecera",
        campos: ["ASIGNATURA", "PERIODO", "NIVEL"]
      },
      {
        titulo: "OBJETIVOS DE LA ASIGNATURA",
        obligatoria: true,
        tipo: "contenido"
      },
      {
        titulo: "UNIDADES TEMÁTICAS",
        obligatoria: true,
        tipo: "exclusion"
      }
    ]
  }
};

// Guardar en base de datos
await fetch('/api/programa-analitico', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(plantilla)
});
```

---

**¿Necesitas más ayuda?**
- Lee `GUIA_SUBIR_PROGRAMA_ANALITICO.md` para el flujo completo
- Lee `SISTEMA_VALIDACION_PROGRAMA_ANALITICO.md` para detalles técnicos
