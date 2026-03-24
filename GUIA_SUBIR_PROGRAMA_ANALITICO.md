# 🎯 GUÍA RÁPIDA: Cómo Subir y Validar Programa Analítico

## 📍 **UBICACIÓN DEL BOTÓN DE SUBIDA**

### **Para Comisión Académica:**

1. **Acceder a la página con parámetros:**
   ```
   /dashboard/comision/crear-programa-analitico?asignatura=31&periodo=Primer%20Periodo%20PII%202026
   ```

2. **Verás una sección destacada en AZUL con:**
   - 📋 Título: "Subir Programa Analítico con Validación Inteligente"
   - ✓ Lista de beneficios (auto-llenado, validación, etc.)
   - 📊 Información de la asignatura seleccionada
   - 🔵 **BOTÓN GRANDE AZUL**: "Subir Programa Analítico (.docx)"

3. **Al hacer clic en el botón:**
   - Se abre un selector de archivos
   - Solo acepta archivos `.docx` (Word moderno)
   - Se sube automáticamente al seleccionar

---

## 🔄 **FLUJO COMPLETO DEL PROCESO**

```
┌─────────────────────────────────────────────────────────────┐
│  1️⃣ ADMIN: Crear Plantilla Maestra                         │
│     • Sube programa analítico base                          │
│     • Lo guarda SIN asignatura (asignatura_id = NULL)       │
│     • Define periodo: "Primer Periodo PII 2026"             │
│                                                              │
│     📦 Resultado: Plantilla con estructura oficial          │
│        {                                                     │
│          "secciones": [                                      │
│            { "titulo": "DATOS INFORMATIVOS",                │
│              "tipo": "cabecera",                            │
│              "campos": ["ASIGNATURA", "PERIODO", "NIVEL"] },│
│            { "titulo": "OBJETIVOS", "tipo": "contenido" }   │
│          ]                                                   │
│        }                                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2️⃣ COMISIÓN: Acceder con Asignatura Específica            │
│     URL: ?asignatura=31&periodo=Primer%20Periodo%20PII%202026│
│                                                              │
│     ✅ Se carga información de la asignatura:               │
│        • Código: TI-301                                      │
│        • Nombre: Programación II                            │
│        • Nivel: Tercer Semestre                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3️⃣ DOCENTE/COMISIÓN: Preparar Word                        │
│     • Crear documento .docx                                 │
│     • Incluir secciones obligatorias                        │
│     • Dejar campos de cabecera VACÍOS o con placeholder    │
│                                                              │
│     Ejemplo de estructura:                                   │
│     ┌─────────────────────────────────┐                    │
│     │ DATOS INFORMATIVOS              │                    │
│     │                                 │                    │
│     │ ASIGNATURA: [vacío]             │                    │
│     │ PERIODO: [vacío]                │                    │
│     │ NIVEL: [vacío]                  │                    │
│     │                                 │                    │
│     │ OBJETIVOS DE LA ASIGNATURA      │                    │
│     │                                 │                    │
│     │ - Objetivo 1: Aplicar...        │                    │
│     │ - Objetivo 2: Desarrollar...    │                    │
│     │                                 │                    │
│     │ UNIDADES TEMÁTICAS              │                    │
│     │                                 │                    │
│     │ Unidad 1: Introducción          │                    │
│     │ Unidad 2: Conceptos Avanzados   │                    │
│     └─────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4️⃣ SUBIR ARCHIVO WORD                                     │
│     • Hacer clic en botón AZUL "Subir Programa Analítico"  │
│     • Seleccionar archivo .docx                             │
│     • Esperar procesamiento (5-15 segundos)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5️⃣ BACKEND: Validación Automática                         │
│                                                              │
│  A. Extraer secciones del Word:                            │
│     ✓ Detecta títulos (H1, H2, texto en MAYÚSCULAS)       │
│     ✓ Extrae contenido de texto plano                      │
│     ✓ Extrae tablas preservando estructura                 │
│                                                              │
│  B. Buscar plantilla maestra:                              │
│     ✓ Busca en DB: WHERE asignatura_id IS NULL             │
│                     AND periodo = "Primer Periodo..."       │
│                                                              │
│  C. Comparar estructura:                                    │
│     ✓ Normaliza títulos (quita tildes, minúsculas)        │
│     ✓ Calcula similitud (75%+ = match)                     │
│     ✓ Detecta secciones faltantes                          │
│     ✓ Calcula porcentaje total (mínimo 90%)                │
│                                                              │
│  D. Llenado quirúrgico:                                     │
│     🔒 CABECERA (tipo: "cabecera"):                        │
│        • ASIGNATURA → "TI-301 - Programación II"           │
│        • PERIODO → "Primer Periodo PII 2026"               │
│        • NIVEL → "Tercer Semestre"                         │
│        • Celdas marcadas como NO EDITABLES                 │
│                                                              │
│     📝 CONTENIDO (tipo: "contenido"):                      │
│        • OBJETIVOS → Del Word tal cual                     │
│        • METODOLOGÍA → Del Word tal cual                   │
│        • Celdas marcadas como EDITABLES                    │
│                                                              │
│     🚫 EXCLUSIÓN (tipo: "exclusion"):                      │
│        • UNIDADES TEMÁTICAS → Del Word, sin modificar      │
│        • CONTENIDOS → Del Word, sin modificar              │
│        • Preserva planificación del docente                │
│                                                              │
│  E. Generar JSON estructurado:                             │
│     {                                                       │
│       "tabs": [                                            │
│         {                                                  │
│           "id": "tab-1",                                   │
│           "title": "DATOS INFORMATIVOS",                   │
│           "rows": [                                        │
│             {                                              │
│               "cells": [                                   │
│                 { "content": "ASIGNATURA",                 │
│                   "isHeader": true,                        │
│                   "isEditable": false },                   │
│                 { "content": "TI-301 - Programación II",  │
│                   "isEditable": false }  // 🔒            │
│               ]                                            │
│             }                                              │
│           ]                                                │
│         }                                                  │
│       ]                                                    │
│     }                                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6️⃣ RESULTADO DE VALIDACIÓN                                │
│                                                              │
│  ✅ CASO EXITOSO (≥90% coincidencia):                      │
│     ┌─────────────────────────────────────┐               │
│     │ ✅ ¡Validación Exitosa!             │               │
│     │                                     │               │
│     │ 📊 Coincidencia: 100%               │               │
│     │ 📊 Secciones: 9/9 ✓                 │               │
│     │                                     │               │
│     │ ✓ El documento cumple con           │               │
│     │   la estructura requerida           │               │
│     │                                     │               │
│     │ Los campos de cabecera se han       │               │
│     │ llenado automáticamente.            │               │
│     │                                     │               │
│     │ [Continuar] → Ir al editor          │               │
│     └─────────────────────────────────────┘               │
│                                                              │
│  ❌ CASO FALLIDO (<90% coincidencia):                      │
│     ┌─────────────────────────────────────┐               │
│     │ ⚠️ Validación Incompleta            │               │
│     │                                     │               │
│     │ 📊 Coincidencia: 67% (mín: 90%)     │               │
│     │ 📊 Secciones: 6/9 ✗                 │               │
│     │                                     │               │
│     │ ❌ Secciones Faltantes:             │               │
│     │    ✗ METODOLOGÍA                    │               │
│     │    ✗ EVALUACIÓN                     │               │
│     │    ✗ BIBLIOGRAFÍA                   │               │
│     │                                     │               │
│     │ 💡 Cómo resolver:                   │               │
│     │    1. Descargue la plantilla        │               │
│     │    2. Incluya las secciones         │               │
│     │       faltantes                     │               │
│     │    3. Vuelva a subir el documento   │               │
│     │                                     │               │
│     │ [Entendido]                         │               │
│     └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7️⃣ EDICIÓN Y GUARDADO                                     │
│                                                              │
│  • El programa se carga en el editor de tablas              │
│  • Campos de cabecera aparecen BLOQUEADOS 🔒               │
│  • Campos de contenido son EDITABLES ✏️                    │
│  • Al guardar, se asocia a la asignatura específica        │
│                                                              │
│  📦 Guardado en DB:                                         │
│     INSERT INTO programas_analiticos                        │
│     (nombre, periodo, asignatura_id, datos_tabla)           │
│     VALUES (                                                │
│       'Programa Analítico - Programación II',              │
│       'Primer Periodo PII 2026',                           │
│       31,  ← Asignatura específica                         │
│       { ...JSON con estructura completa... }               │
│     )                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🖼️ **SCREENSHOTS DE LA INTERFAZ**

### **Pantalla Inicial (Sin Programa Cargado):**

```
┌────────────────────────────────────────────────────────────────┐
│  Editor de Programa Analítico                [Nuevo] [Guardar] │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ 📋 Subir Programa Analítico con Validación Inteligente │   │
│  │                                                         │   │
│  │ Sube un archivo Word (.docx) y el sistema lo validará │   │
│  │ automáticamente contra la plantilla maestra del periodo│   │
│  │                                                         │   │
│  │ ✓ Auto-llenado de datos oficiales                      │   │
│  │ ✓ Validación de estructura (90%+)                      │   │
│  │ ✓ Preserva contenido del docente                       │   │
│  │ ✓ Detecta secciones faltantes                          │   │
│  │                                                         │   │
│  │ Asignatura seleccionada:                               │   │
│  │ TI-301 - Programación II                               │   │
│  │ Nivel: Tercer Semestre                                 │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────┐       │   │
│  │  │  📤 Subir Programa Analítico (.docx)        │       │   │
│  │  └─────────────────────────────────────────────┘       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Periodo: [Primer Periodo PII 2026 ▼]                         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### **Después de Subir (Validación Exitosa):**

```
┌────────────────────────────────────────────────────────────────┐
│  Programa Analítico - Programación II          [Guardar] [PDF] │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📑 Pestañas:                                                   │
│  [DATOS INFORMATIVOS] [OBJETIVOS] [METODOLOGÍA] [UNIDADES]     │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ DATOS INFORMATIVOS                                      │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  ASIGNATURA       │ TI-301 - Programación II    🔒     │   │
│  │  PERIODO          │ Primer Periodo PII 2026     🔒     │   │
│  │  NIVEL            │ Tercer Semestre             🔒     │   │
│  │                                                         │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🔒 = Campo bloqueado (datos oficiales)                        │
│  ✏️ = Campo editable                                           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ **CONFIGURACIÓN NECESARIA**

### **1. Admin debe crear Plantilla Maestra:**

```javascript
// En el dashboard del admin
const plantilla = {
  nombre: "Plantilla PII 2026",
  periodo: "Primer Periodo PII 2026",
  asignatura_id: null, // ← IMPORTANTE: NULL para plantilla maestra
  datos_tabla: {
    version: "2.0",
    secciones: [
      {
        titulo: "DATOS INFORMATIVOS",
        obligatoria: true,
        tipo: "cabecera",
        campos: ["ASIGNATURA", "PERIODO", "NIVEL"]
      },
      {
        titulo: "CARACTERIZACIÓN DE LA ASIGNATURA",
        obligatoria: true,
        tipo: "contenido"
      },
      {
        titulo: "OBJETIVOS DE LA ASIGNATURA",
        obligatoria: true,
        tipo: "contenido"
      },
      {
        titulo: "UNIDADES TEMÁTICAS",
        obligatoria: true,
        tipo: "exclusion" // ← Preserva contenido del docente
      },
      {
        titulo: "METODOLOGÍA",
        obligatoria: true,
        tipo: "contenido"
      },
      {
        titulo: "EVALUACIÓN",
        obligatoria: true,
        tipo: "contenido"
      },
      {
        titulo: "BIBLIOGRAFÍA",
        obligatoria: true,
        tipo: "contenido"
      }
    ]
  }
};
```

### **2. Comisión debe acceder con parámetros:**

```
URL correcta:
/dashboard/comision/crear-programa-analitico?asignatura=31&periodo=Primer%20Periodo%20PII%202026

❌ INCORRECTO:
/dashboard/comision/crear-programa-analitico
(Sin parámetros, no se mostrará la sección de upload)
```

---

## 🐛 **TROUBLESHOOTING**

### **Problema 1: No veo el botón azul de subida**

**Causas posibles:**
- No hay parámetro `?asignatura=ID` en la URL
- No estás logueado como `comision_academica`

**Solución:**
```
1. Verificar URL: ?asignatura=31
2. Verificar rol en user.rol === 'comision_academica'
3. Recargar la página
```

### **Problema 2: "No existe una plantilla maestra"**

**Causa:**
- El admin no ha creado la plantilla para ese periodo

**Solución:**
```sql
-- Verificar plantillas existentes
SELECT * FROM programas_analiticos 
WHERE asignatura_id IS NULL;

-- Si está vacío, el admin debe crear la plantilla
```

### **Problema 3: "Coincidencia 60% (mínimo 90%)"**

**Causa:**
- Los títulos del Word no coinciden con la plantilla

**Solución:**
```
1. Descargar plantilla oficial del admin
2. Copiar EXACTAMENTE los títulos de sección
3. Variaciones permitidas:
   - Sin tildes: "METODOLOGIA" = "METODOLOGÍA" ✓
   - Minúsculas: "metodología" = "METODOLOGÍA" ✓
   - Espacios: "  METODOLOGÍA  " = "METODOLOGÍA" ✓
```

---

## 📝 **RESUMEN RÁPIDO**

1. **Admin**: Crea plantilla maestra (asignatura_id = NULL)
2. **Comisión**: Accede con `?asignatura=31&periodo=...`
3. **Hacer clic**: Botón AZUL grande "Subir Programa Analítico"
4. **Seleccionar**: Archivo .docx
5. **Esperar**: Validación automática (5-15 seg)
6. **Ver resultado**: Modal con estadísticas
7. **Editar**: Si es válido, se carga en el editor
8. **Guardar**: Botón "Guardar" en la esquina superior

---

**¿Necesitas ayuda adicional?**
- Revisa `SISTEMA_VALIDACION_PROGRAMA_ANALITICO.md` para documentación técnica completa
- Contacta al equipo de desarrollo con logs y screenshots
