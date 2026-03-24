# Flujo Definitivo: Programa Analítico por Periodo

## 🎯 Concepto Clave

**El admin guarda programas por PERIODO (no por asignatura)**
**La comisión accede por PERIODO y lo asocia a su asignatura**

## ✅ Flujo Implementado

### 1️⃣ Administrador - Crea Programa por Periodo

**Pantalla**: `/dashboard/admin/programa-analitico`

**Proceso**:
1. Selecciona **periodo**: "Primer Periodo PII 2026"
2. (Opcional) Selecciona carrera/asignatura si quiere uno específico
3. Crea la tabla del programa analítico
4. Guarda

**Resultado en BD**:
```json
{
  "id": 47,
  "nombre": "ProgramaAnalitico",
  "periodo": "Primer Periodo PII 2026",
  "asignatura_id": null,  // SIN asignatura
  "datos_tabla": { "tabs": [...] }
}
```

### 2️⃣ Comisión - Accede por Asignatura y Periodo

**Pantalla**: `/dashboard/comision/crear-programa-analitico?asignatura=31`

**Proceso**:
1. Sistema carga **TODOS** los programas analíticos disponibles
2. Comisión selecciona **periodo**: "Primer Periodo PII 2026"
3. Sistema busca en este orden:

#### Búsqueda Priorizada:

**PRIORIDAD 1**: Programa específico de esta asignatura + periodo
```typescript
programas.find(p => 
  p.periodo === "Primer Periodo PII 2026" && 
  p.asignatura_id === 31
)
```
✅ **Si encuentra**: Carga ese programa (versión específica de la asignatura)

**PRIORIDAD 2**: Programa general del periodo (del admin)
```typescript
programas.find(p => 
  p.periodo === "Primer Periodo PII 2026" && 
  p.asignatura_id === null
)
```
✅ **Si encuentra**: Carga el programa base del admin

❌ **Si no encuentra ninguno**: Editor vacío

### 3️⃣ Comisión - Guarda el Programa

**Decisión CREATE vs UPDATE**:

```typescript
// Verifica si el programa cargado YA pertenece a esta asignatura
const programaCargado = savedprogramas.find(p => p.id === activeProgramaAnalitico.id);
const esDeEstaAsignatura = 
  programaCargado.asignatura_id === asignaturaActual;

if (esDeEstaAsignatura) {
  // UPDATE: Ya es de esta asignatura
  PUT /api/programa-analitico/50
} else {
  // CREATE: Es un programa general o de otra asignatura
  POST /api/programa-analitico
}
```

## 📊 Ejemplos Reales

### Ejemplo 1: Primera vez - Programación Web

**Estado inicial en BD**:
```
ID 47 | periodo: "Primer..." | asignatura_id: null | (Admin)
```

**Comisión ejecuta**:
1. Accede: `?asignatura=31` (Programación Web)
2. Selecciona periodo: "Primer Periodo PII 2026"
3. Sistema busca:
   - ¿Programa con asignatura_id=31? **NO**
   - ¿Programa general del periodo? **SÍ (ID 47)**
4. Carga programa ID 47
5. Modifica y guarda

**Logs**:
```
🔄 Periodo seleccionado: Primer Periodo PII 2026
📌 Asignatura actual: 31

✅ [2] Programa GENERAL del admin encontrado:
   id: 47
   periodo: "Primer Periodo PII 2026"
   mensaje: "Al guardar se creará una copia para esta asignatura"

💾 Guardando programa analítico:
   - Programa cargado ID: 47
   - Asignatura del programa: null
   - Asignatura actual: 31
   - Es actualización?: false
   - Método: POST
```

**Resultado en BD**:
```
ID 47 | periodo: "Primer..." | asignatura_id: null  | (Admin - intacto)
ID 50 | periodo: "Primer..." | asignatura_id: 31    | (Programación Web)
```

### Ejemplo 2: Segunda vez - Programación Web

**Estado actual en BD**:
```
ID 47 | periodo: "Primer..." | asignatura_id: null  | (Admin)
ID 50 | periodo: "Primer..." | asignatura_id: 31    | (Programación Web)
```

**Comisión ejecuta**:
1. Accede: `?asignatura=31`
2. Selecciona periodo: "Primer Periodo PII 2026"
3. Sistema busca:
   - ¿Programa con asignatura_id=31? **SÍ (ID 50)**
4. Carga programa ID 50 (su propia versión)
5. Modifica y guarda

**Logs**:
```
🔄 Periodo seleccionado: Primer Periodo PII 2026
📌 Asignatura actual: 31

✅ [1] Programa ESPECÍFICO encontrado:
   id: 50
   asignatura_id: 31
   periodo: "Primer Periodo PII 2026"

💾 Guardando programa analítico:
   - Programa cargado ID: 50
   - Asignatura del programa: 31
   - Asignatura actual: 31
   - Es actualización?: true
   - Método: PUT
```

**Resultado en BD**:
```
ID 47 | periodo: "Primer..." | asignatura_id: null  | (Admin - intacto)
ID 50 | periodo: "Primer..." | asignatura_id: 31    | (Actualizado)
```

### Ejemplo 3: Primera vez - Bases de Datos

**Estado actual en BD**:
```
ID 47 | periodo: "Primer..." | asignatura_id: null  | (Admin)
ID 50 | periodo: "Primer..." | asignatura_id: 31    | (Programación Web)
```

**Comisión ejecuta**:
1. Accede: `?asignatura=32` (Bases de Datos)
2. Selecciona periodo: "Primer Periodo PII 2026"
3. Sistema busca:
   - ¿Programa con asignatura_id=32? **NO**
   - ¿Programa general del periodo? **SÍ (ID 47)**
4. Carga programa ID 47 (base del admin)
5. Modifica y guarda

**Resultado en BD**:
```
ID 47 | periodo: "Primer..." | asignatura_id: null  | (Admin - intacto)
ID 50 | periodo: "Primer..." | asignatura_id: 31    | (Programación Web)
ID 51 | periodo: "Primer..." | asignatura_id: 32    | (Bases de Datos)
```

## 🎯 Puntos Clave

### ✅ Correcto:
1. **Admin guarda por PERIODO** (sin asignatura)
2. **Comisión busca por PERIODO** (no por asignatura)
3. **Comisión guarda CON asignatura_id** (crea versión específica)
4. **Programa original del admin NUNCA se modifica**
5. **Cada asignatura tiene su propia versión del periodo**

### ❌ Evitado:
1. ~~Buscar solo por asignatura_id~~ (ahora busca por periodo)
2. ~~Modificar el programa original~~ (ahora crea copias)
3. ~~Filtrar al cargar~~ (ahora carga todos y filtra por periodo)

## 🔍 Logs del Sistema

### Cuando Comisión Selecciona Periodo:
```
🔄 Periodo seleccionado: Primer Periodo PII 2026
📌 Asignatura actual: 31
📋 Programas disponibles: [
  { id: 47, periodo: "Primer...", asignatura_id: null },
  { id: 48, periodo: "Segundo...", asignatura_id: null },
  { id: 50, periodo: "Primer...", asignatura_id: 31 }
]

Buscando prioridad 1: específico para asignatura 31
✅ [1] Programa ESPECÍFICO encontrado: { id: 50, asignatura_id: 31 }
Cargando programa ID 50...
```

O si es primera vez:
```
Buscando prioridad 1: específico para asignatura 32
❌ No encontrado

Buscando prioridad 2: general del periodo
✅ [2] Programa GENERAL del admin encontrado: { id: 47, asignatura_id: null }
💡 Al guardar se creará una copia para esta asignatura
Cargando programa ID 47...
```

## 📝 Resumen del Flujo

```
ADMIN                        COMISIÓN
  |                             |
  |-- Selecciona PERIODO        |
  |-- Crea programa             |
  |-- Guarda (sin asignatura)   |
  |                             |
  |                             |-- Accede por ASIGNATURA
  |                             |-- Selecciona PERIODO
  |                             |-- Sistema busca:
  |                             |   1. ¿Ya hay para esta asignatura+periodo?
  |                             |   2. Si no, ¿hay general del periodo?
  |                             |-- Carga el encontrado
  |                             |-- Modifica
  |                             |-- Guarda con asignatura_id
  |                             |   (CREATE si es general)
  |                             |   (UPDATE si ya era suya)
  |
  |-- Programa original         |-- Cada asignatura tiene
  |   permanece intacto         |   su propia versión
```

## 📅 Fecha de Implementación
**4 de febrero de 2026**

## ✅ Estado Final
- ✅ Admin guarda por periodo
- ✅ Comisión accede por periodo
- ✅ Búsqueda priorizada correcta
- ✅ No modifica originales
- ✅ Logs detallados del flujo
