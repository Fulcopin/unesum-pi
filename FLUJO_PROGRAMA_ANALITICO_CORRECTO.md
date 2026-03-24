# Flujo Correcto: Programa Analítico - Admin y Comisión

## 📋 Entendimiento del Problema

**Flujo Real:**
1. **Administrador** crea programas analíticos GENERALES (sin asignatura específica)
2. **Comisión Académica** accede por asignatura y puede:
   - Ver TODOS los programas disponibles
   - Seleccionar uno y asociarlo a la asignatura actual
   - Editarlo y guardarlo CON la asignatura_id

## ✅ Solución Implementada

### 1. Vista Comisión Académica

#### Carga de Datos:
```typescript
// 🔥 Cargar TODOS los programas (sin filtrar)
const programasEndpoint = "/api/programa-analitico";
```

**Antes**: Filtraba `?asignatura_id=31` → Solo veía programas ya asignados
**Ahora**: Carga todos → Puede ver y seleccionar cualquier programa

#### Lógica de Auto-carga por Periodo:
```typescript
// PRIORIDAD 1: Buscar específico para esta asignatura + periodo
let programa = savedprogramas.find(p => 
  p.periodo === selectedPeriod && 
  p.asignatura_id === asignaturaIdParam
);

// PRIORIDAD 2: Si no hay, buscar programa general del periodo
if (!programa) {
  programa = savedprogramas.find(p => 
    p.periodo === selectedPeriod && 
    !p.asignatura_id
  );
}
```

**Lógica:**
1. Primero busca si YA hay uno asignado a esta asignatura en este periodo
2. Si no, busca uno GENERAL (sin asignatura) del mismo periodo
3. Si encuentra, lo carga para editar
4. Si no encuentra, puede crear uno nuevo

#### Guardar Cambios:
```typescript
const payload = {
  nombre: activeProgramaAnalitico.name,
  periodo: selectedPeriod,
  datos_tabla: datosParaGuardar,
  asignatura_id: parseInt(asignaturaIdParam) // ✅ Asocia a la asignatura
}
```

**Resultado:**
- Si edita un programa general → Se crea una COPIA asociada a la asignatura
- Si edita uno ya asignado → Se actualiza ese registro

### 2. Vista Administrador

#### Selectores Agregados:
```tsx
<Select> {/* Carrera */}
<Select> {/* Asignatura (opcional) */}
<Select> {/* Periodo */}
```

**Puede:**
- Crear programas GENERALES (sin asignatura)
- Crear programas ESPECÍFICOS (con asignatura si lo desea)

## 🔄 Flujo Completo de Uso

### Escenario 1: Crear Programa General
1. **Admin** accede a `/dashboard/admin/programa-analitico`
2. **NO selecciona** carrera ni asignatura (o las deja vacías)
3. **Selecciona** periodo: "Primer Periodo PII 2026"
4. **Crea** la tabla del programa analítico
5. **Guarda** → Se guarda con:
   ```json
   {
     "nombre": "ProgramaAnalitico",
     "periodo": "Primer Periodo PII 2026",
     "asignatura_id": null,
     "datos_tabla": {...}
   }
   ```

### Escenario 2: Comisión Asigna Programa a Materia
1. **Comisión** accede desde asignaturas: `/comision/crear-programa-analitico?asignatura=31`
2. **Sistema** carga TODOS los programas disponibles
3. **Comisión** selecciona periodo: "Primer Periodo PII 2026"
4. **Sistema** busca:
   - ¿Hay programa para asignatura 31 + periodo? NO
   - ¿Hay programa general para periodo? SÍ → Lo carga
5. **Comisión** edita (opcional) y guarda
6. **Sistema** guarda con:
   ```json
   {
     "id": 49,  // Nuevo ID (se crea uno nuevo)
     "nombre": "ProgramaAnalitico",
     "periodo": "Primer Periodo PII 2026",
     "asignatura_id": 31,  // ✅ Ahora asociado
     "datos_tabla": {...}
   }
   ```

### Escenario 3: Edición de Programa Ya Asignado
1. **Comisión** accede: `?asignatura=31`
2. **Selecciona** periodo: "Primer Periodo PII 2026"
3. **Sistema** encuentra programa con `asignatura_id=31` → Lo carga
4. **Comisión** edita y guarda
5. **Sistema** actualiza el MISMO registro (ID 49)

## 📊 Estados en Base de Datos

### Tabla: programas_analiticos

| id | nombre | periodo | asignatura_id | datos_tabla |
|----|--------|---------|---------------|-------------|
| 47 | ProgramaAnalitico | Primer Periodo PII 2026 | NULL | {...} |
| 48 | ProgramaAnalitico | Segundo Periodo PII 2026 | NULL | {...} |
| 49 | ProgramaAnalitico | Primer Periodo PII 2026 | 31 | {...} |
| 50 | ProgramaAnalitico | Primer Periodo PII 2026 | 32 | {...} |

**Interpretación:**
- ID 47, 48: Programas GENERALES creados por admin
- ID 49: Programa asignado a asignatura 31 (Programación Web)
- ID 50: Programa asignado a asignatura 32 (Bases de Datos)

## 🎯 Beneficios del Flujo

1. **Reutilización**: Un programa general puede usarse como plantilla para múltiples asignaturas
2. **Flexibilidad**: Comisión puede editar sin afectar el original
3. **Control**: Admin crea generales, comisión asigna específicos
4. **Trazabilidad**: Se sabe qué programa está asignado a qué asignatura

## 🔍 Logs del Sistema

### Cuando Comisión Accede:
```
🔍 Cargando TODOS los programas desde: /api/programa-analitico
📌 Asignatura actual: 31

✅ Datos cargados para comisión:
   asignaturaActual: "31"
   totalProgramas: 4
   programasDetalle: [
     { id: 47, nombre: "...", periodo: "Primer...", asignatura_id: null },
     { id: 48, nombre: "...", periodo: "Segundo...", asignatura_id: null },
     { id: 49, nombre: "...", periodo: "Primer...", asignatura_id: 31 },
     { id: 50, nombre: "...", periodo: "Primer...", asignatura_id: 32 }
   ]
```

### Cuando Selecciona Periodo:
```
🔄 Cambiando periodo a: Primer Periodo PII 2026

🎯 PRIORIDAD 1: Buscar específico para asignatura 31
✅ Programa ESPECÍFICO encontrado para asignatura 31 + periodo: { id: 49, ... }

// O si no hay específico:
⚠️ No hay programa específico
🎯 PRIORIDAD 2: Buscar general
✅ Programa GENERAL encontrado: { id: 47, asignatura_id: null }
```

## 📝 Fecha de Implementación
**4 de febrero de 2026**

## ✅ Estado Actual
- ✅ Comisión carga TODOS los programas
- ✅ Prioriza específicos sobre generales
- ✅ Guarda con asignatura_id al editar
- ✅ Admin puede crear generales o específicos
