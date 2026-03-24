# Solución Completa: Programa Analítico con Asignatura

## 📋 Problema Identificado

El administrador guardaba programas analíticos SIN asociarlos a una asignatura específica (`asignatura_id = null`), por lo que cuando la comisión académica buscaba por `?asignatura_id=31`, no encontraba ningún programa.

## ✅ Soluciones Implementadas

### 1. **Base de Datos**
- **Agregada columna `periodo`** a la tabla `programas_analiticos`
- **Creados índices** para optimizar búsquedas:
  - `idx_programas_analiticos_periodo`
  - `idx_programas_analiticos_asignatura_periodo`

**Archivo**: `my-node-backend/migrations/20260204_add_periodo_to_programas_analiticos.sql`

### 2. **Modelo Sequelize**
- **Actualizado** `programas_analiticos.js` para incluir el campo `periodo`

```javascript
periodo: {
  type: DataTypes.STRING(50),
  allowNull: true
}
```

**Archivo**: `my-node-backend/src/models/programas_analiticos.js`

### 3. **Vista Administrador**
Se agregaron selectores para asociar cada programa con una asignatura específica:

#### Estados Agregados:
```typescript
const [carreras, setCarreras] = useState<any[]>([])
const [asignaturas, setAsignaturas] = useState<any[]>([])
const [selectedCarrera, setSelectedCarrera] = useState<string>("")
const [selectedAsignatura, setSelectedAsignatura] = useState<string>("")
```

#### Carga de Datos:
- **Carreras**: Se cargan al iniciar
- **Asignaturas**: Se cargan dinámicamente cuando se selecciona una carrera

#### UI Mejorada:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <Select> {/* Carrera */}
  <Select> {/* Asignatura (deshabilitado si no hay carrera) */}
  <Select> {/* Periodo */}
</div>
```

#### Validación al Guardar:
```typescript
if (!selectedAsignatura) return alert("Por favor, seleccione una asignatura antes de guardar.")
```

#### Payload Actualizado:
```typescript
const payload = {
  nombre: activeProgramaAnalitico.name || 'ProgramaAnalitico',
  periodo: selectedPeriod,
  materias: activeProgramaAnalitico.name || 'ProgramaAnalitico',
  datos_tabla: datosParaGuardar,
  ...(selectedAsignatura && { asignatura_id: parseInt(selectedAsignatura) })
}
```

**Archivo**: `app/dashboard/admin/programa-analitico/page.tsx`

### 4. **Vista Comisión Académica**
Ya estaba configurada correctamente para:
- Leer `asignatura_id` desde la URL (`?asignatura=31`)
- Filtrar programas por esa asignatura
- Cargar automáticamente el programa del periodo seleccionado
- Incluir `asignatura_id` al guardar

**Archivo**: `app/dashboard/comision/crear-programa-analitico/page.tsx`

## 🎯 Flujo Completo

### Administrador:
1. **Accede** a `/dashboard/admin/programa-analitico`
2. **Selecciona**:
   - Carrera (ej: "Tecnologías de la Información")
   - Asignatura (ej: "Programación Web")
   - Periodo (ej: "Primer Periodo PII 2026")
3. **Crea/edita** el programa analítico en la tabla
4. **Guarda**: El sistema asocia automáticamente:
   - `asignatura_id`: 31
   - `periodo`: "Primer Periodo PII 2026"
   - `datos_tabla`: JSON completo de la tabla

### Comisión Académica:
1. **Accede** desde lista de asignaturas: `/dashboard/comision/crear-programa-analitico?asignatura=31`
2. **Sistema carga** automáticamente:
   - Solo programas de esa asignatura (ID 31)
   - Lista de periodos disponibles
3. **Selecciona periodo**: "Primer Periodo PII 2026"
4. **Sistema carga** automáticamente el programa guardado por el admin
5. **Puede editar** la tabla con todas las funcionalidades
6. **Guarda**: Actualiza el mismo programa

### Profesores y otros roles:
- También pueden ver los programas analíticos asociados a sus asignaturas
- Mismo flujo que comisión académica

## 📊 Estructura de Datos Guardada

```json
{
  "id": 48,
  "nombre": "ProgramaAnalitico",
  "periodo": "Primer Periodo PII 2026",
  "asignatura_id": 31,
  "usuario_id": 1,
  "datos_tabla": {
    "version": "2.0",
    "metadata": { "author": "Administrador" },
    "tabs": [
      {
        "id": "tab-1",
        "title": "Datos Generales",
        "rows": [
          {
            "id": "row-1",
            "cells": [
              {
                "id": "cell-1",
                "content": "Universidad Estatal del Sur de Manabí",
                "colSpan": 1,
                "rowSpan": 1,
                "isEditable": true,
                "backgroundColor": "#fff",
                "textColor": "#000",
                "textAlign": "left"
              }
            ]
          }
        ]
      }
    ]
  },
  "createdAt": "2026-02-04T...",
  "updatedAt": "2026-02-04T..."
}
```

## 🔍 Logs del Backend

Cuando se busca por asignatura:
```
🔍 ========================================
🔍 GET /programa-analitico - Parámetros recibidos:
🔍 Query params: { asignatura_id: '31' }
🔍 ========================================
✅ Filtro aplicado: asignatura_id = 31

Executing (default): SELECT "programas_analiticos"."id", "programas_analiticos"."nombre", "programas_analiticos"."periodo", "programas_analiticos"."datos_tabla", ...
WHERE "programas_analiticos"."asignatura_id" = '31'

📊 Programas encontrados: 1
📋 Primer programa:
   - ID: 48
   - Nombre: ProgramaAnalitico
   - Asignatura ID: 31
   - Periodo: Primer Periodo PII 2026
```

## ✅ Beneficios

1. **Organización**: Cada programa analítico está asociado a una asignatura específica
2. **Control**: El administrador define qué asignatura corresponde cada programa
3. **Acceso directo**: Comisión y profesores ven solo programas de sus asignaturas
4. **Colaboración**: Todos trabajan sobre el mismo documento guardado por el admin
5. **Trazabilidad**: Se mantiene registro de quién creó y editó cada programa

## 🚀 Próximos Pasos

1. ✅ **Probar el flujo completo**:
   - Admin crea programa para asignatura 31
   - Comisión accede y ve el programa
   - Comisión edita y guarda cambios

2. **Validaciones adicionales** (opcional):
   - Prevenir duplicados: Un solo programa por asignatura + periodo
   - Permisos: Solo admin puede crear, comisión solo edita

3. **Mejoras de UX** (opcional):
   - Mostrar nombre de asignatura en el título
   - Breadcrumb: Carrera > Asignatura > Programa Analítico
   - Historial de cambios

## 📝 Fecha de Implementación
**4 de febrero de 2026**
