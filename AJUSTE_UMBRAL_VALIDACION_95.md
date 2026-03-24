# 📊 AJUSTE DE UMBRAL DE VALIDACIÓN - 95%
## Sistema de Validación de Syllabus

---

## ✅ CAMBIO REALIZADO

**ANTES:**
- Se requería **100% de coincidencia** (todos los campos sin excepción)
- Si faltaba UN solo título → **RECHAZO**

**AHORA:**
- Se requiere **95% o más de coincidencia**
- Permite que falten hasta el 5% de los campos
- Más flexible y realista

---

## 🎯 EJEMPLOS PRÁCTICOS

### Ejemplo 1: Plantilla con 100 campos

```
✅ ACEPTA:
- 100 campos encontrados → 100% ✅
- 99 campos encontrados  → 99%  ✅
- 98 campos encontrados  → 98%  ✅
- 97 campos encontrados  → 97%  ✅
- 96 campos encontrados  → 96%  ✅
- 95 campos encontrados  → 95%  ✅

❌ RECHAZA:
- 94 campos encontrados  → 94%  ❌
- 90 campos encontrados  → 90%  ❌
```

### Ejemplo 2: Plantilla con 50 campos

```
✅ ACEPTA:
- 50 campos encontrados → 100% ✅
- 49 campos encontrados → 98%  ✅
- 48 campos encontrados → 96%  ✅

❌ RECHAZA:
- 47 campos encontrados → 94%  ❌
- 45 campos encontrados → 90%  ❌
```

### Ejemplo 3: Plantilla con 20 campos

```
✅ ACEPTA:
- 20 campos encontrados → 100% ✅
- 19 campos encontrados → 95%  ✅

❌ RECHAZA:
- 18 campos encontrados → 90%  ❌
- 17 campos encontrados → 85%  ❌
```

---

## 🔧 ARCHIVOS MODIFICADOS

### 1. Backend - Validador

**Archivo:** `my-node-backend/src/utils/syllabusValidatorEditor.js`

**Cambio en línea ~291:**

```javascript
// ANTES:
const esValido = faltantes.length === 0;  // Requería 0 faltantes = 100%

// AHORA:
const UMBRAL_MINIMO = 95; // Porcentaje mínimo requerido
const esValido = porcentaje >= UMBRAL_MINIMO;  // Acepta 95% o más
```

### 2. Frontend - Mensajes

**Archivo:** `app/dashboard/admin/editor-syllabus/page.tsx`

**Cambio en mensajes de éxito (línea ~293):**

```typescript
// ANTES:
`Coincidencia: ${validacion.porcentaje_coincidencia || 100}%\n` +
`Campos requeridos: ${validacion.total_requeridos || 0}\n`

// AHORA:
`Coincidencia: ${validacion.porcentaje_coincidencia || 100}%\n` +
`Mínimo requerido: 95%\n` +
`Campos requeridos: ${validacion.total_requeridos || 0}\n`
```

**Cambio en mensajes de error (línea ~322):**

```typescript
// ANTES:
mensaje += `📊 Coincidencia: ${detalles.porcentaje_coincidencia || 0}%\n`;

// AHORA:
mensaje += `📊 Coincidencia: ${detalles.porcentaje_coincidencia || 0}% (mínimo requerido: 95%)\n`;
```

---

## 📋 FLUJO DE VALIDACIÓN ACTUALIZADO

```
┌─────────────────────────────────────────────────────────────────┐
│  1️⃣  Comisión sube documento Word                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  2️⃣  Sistema busca plantilla del periodo                         │
│     SELECT * FROM syllabi                                       │
│     WHERE periodo = X AND es_plantilla_referencia = true        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  3️⃣  Extrae títulos de ambos documentos                          │
│     Plantilla: campos con isHeader=true                         │
│     Word subido: títulos en negrita                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  4️⃣  Compara y calcula porcentaje                                │
│     encontrados = total - faltantes                             │
│     porcentaje = (encontrados / total) * 100                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  5️⃣  Evalúa contra umbral                                        │
│                                                                 │
│     if (porcentaje >= 95) {                                     │
│       ✅ ACEPTAR y guardar                                       │
│     } else {                                                    │
│       ❌ RECHAZAR con detalles                                   │
│     }                                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 MENSAJES AL USUARIO

### Mensaje de Éxito (≥95%)

```
✅ Syllabus validado y guardado exitosamente

Coincidencia: 97%
Mínimo requerido: 95%
Campos requeridos: 100
Campos encontrados: 97
```

### Mensaje de Rechazo (<95%)

```
❌ El syllabus NO cumple con la estructura requerida

📊 Coincidencia: 92% (mínimo requerido: 95%)
📋 Total requeridos: 100
✅ Encontrados: 92

❌ Campos Faltantes (8):
   • Horario de clases
   • Horario para tutorías
   • Prerrequisito
   • Correquisito
   • Nivel
   • Paralelo/s
   • Campo de formación
   • Modalidad
```

---

## ⚙️ AJUSTAR EL UMBRAL (Si se necesita)

Si en el futuro quieres cambiar el porcentaje mínimo requerido:

**Archivo:** `my-node-backend/src/utils/syllabusValidatorEditor.js`

**Línea ~291:**

```javascript
// Cambiar este valor:
const UMBRAL_MINIMO = 95;  // ← Cambiar a 90, 98, etc.

// Ejemplos:
// const UMBRAL_MINIMO = 90;  // Más permisivo (acepta 90%+)
// const UMBRAL_MINIMO = 98;  // Más estricto (requiere 98%+)
// const UMBRAL_MINIMO = 100; // Volver al comportamiento anterior
```

**No olvides reiniciar el servidor backend después del cambio:**
```bash
npm run dev
```

---

## 🧪 CASOS DE PRUEBA

### Caso 1: 100% de coincidencia
```
Plantilla: 50 campos
Word: 50 campos (todos coinciden)
Resultado: ✅ ACEPTADO (100%)
```

### Caso 2: 98% de coincidencia
```
Plantilla: 50 campos
Word: 49 campos (falta 1)
Resultado: ✅ ACEPTADO (98%)
Faltante: "Horario para tutorías"
```

### Caso 3: 95% de coincidencia (límite exacto)
```
Plantilla: 100 campos
Word: 95 campos (faltan 5)
Resultado: ✅ ACEPTADO (95%)
Faltantes: 5 campos menores
```

### Caso 4: 94% de coincidencia (rechazado)
```
Plantilla: 100 campos
Word: 94 campos (faltan 6)
Resultado: ❌ RECHAZADO (94%)
Motivo: No alcanza el 95% mínimo
```

---

## 💡 RECOMENDACIONES

1. **Para Comisión Académica:**
   - Asegurarse de que el Word tenga TODOS los títulos principales en negrita
   - Si falta 1-2 títulos secundarios, el documento puede pasar (95-98%)
   - Si faltan más de 5%, será rechazado

2. **Para Administrador:**
   - Revisar periódicamente los syllabi con 95-99% de coincidencia
   - Verificar qué campos están faltando frecuentemente
   - Considerar si esos campos deben ser obligatorios o no

3. **Ajustar umbral según necesidad:**
   - **95%**: Balance entre flexibilidad y control (ACTUAL)
   - **98%**: Más estricto, solo permite 1-2 campos faltantes
   - **90%**: Más permisivo, acepta hasta 10% de campos faltantes
   - **100%**: Sin tolerancia, todos los campos obligatorios

---

## 📊 LOGS DEL SISTEMA

Cuando se valida un documento, el backend muestra:

```bash
🔍 Comparando títulos...
   Campos requeridos: 100
   Títulos en Word: 97
   
   ✓ Encontrado: "Código de Asignatura"
   ✓ Encontrado: "Nombre de la asignatura"
   ❌ Falta: "Horario de clases"
   ✓ Encontrado: "Prerrequisito"
   ...

📊 Resultado:
   Coincidencia: 97% (mínimo requerido: 95%)
   Encontrados: 97/100
   Faltantes: 3
   Extras: 0
   ✅ VÁLIDO
```

---

## 🔄 VOLVER AL COMPORTAMIENTO ANTERIOR

Si quieres volver a requerir 100%:

```javascript
// En syllabusValidatorEditor.js línea ~291:
const UMBRAL_MINIMO = 100;  // Requerir 100% sin tolerancia
```

---

**Fecha de cambio:** 2026-01-11  
**Versión:** 2.1  
**Estado:** ✅ Implementado y probado
