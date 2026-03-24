# Flujo Final Correcto: Programa Analítico - No Modificar el Original

## 🎯 Problema Resuelto

**Antes**: Comisión modificaba el programa ORIGINAL del administrador
**Ahora**: Comisión crea una COPIA específica para la asignatura

## ✅ Lógica Implementada

### Decisión CREATE vs UPDATE

```typescript
// Buscar el programa que está cargado actualmente
const programaCargado = savedprogramas.find(p => p.id === activeProgramaAnalitico.id);

// ¿Es actualización? SOLO si:
// 1. El programa YA tiene asignatura_id
// 2. Y esa asignatura_id coincide con la asignatura actual
const esActualizacionDeEstaAsignatura = 
  programaCargado && 
  programaCargado.asignatura_id && 
  programaCargado.asignatura_id.toString() === asignaturaIdParam;

const isUpdate = esActualizacionDeEstaAsignatura;
const method = isUpdate ? "PUT" : "POST";
```

### Casos de Uso:

#### Caso 1: Programa General del Admin (Primera vez)
```
Programa cargado: { id: 47, asignatura_id: null, periodo: "Primer..." }
Asignatura actual: 31

➡️ Resultado: CREATE (POST)
➡️ Se crea: { id: 50, asignatura_id: 31, periodo: "Primer..." }
➡️ Original (47) permanece intacto
```

#### Caso 2: Programa Ya Asignado a Esta Asignatura
```
Programa cargado: { id: 50, asignatura_id: 31, periodo: "Primer..." }
Asignatura actual: 31

➡️ Resultado: UPDATE (PUT)
➡️ Se actualiza: { id: 50, asignatura_id: 31, ... }
```

#### Caso 3: Programa de Otra Asignatura
```
Programa cargado: { id: 51, asignatura_id: 32, periodo: "Primer..." }
Asignatura actual: 31

➡️ Resultado: CREATE (POST)
➡️ Se crea: { id: 52, asignatura_id: 31, ... }
➡️ Original (51) permanece intacto
```

## 🔄 Flujo Completo Paso a Paso

### **Administrador** - Crea Base
1. Accede a `/dashboard/admin/programa-analitico`
2. Selecciona periodo: "Primer Periodo PII 2026"
3. NO selecciona asignatura (o la deja opcional)
4. Crea la tabla base del programa
5. Guarda → Se crea:
   ```json
   {
     "id": 47,
     "nombre": "ProgramaAnalitico",
     "periodo": "Primer Periodo PII 2026",
     "asignatura_id": null,
     "datos_tabla": { "tabs": [...] }
   }
   ```

### **Comisión** - Primera vez (Programación Web)
1. Accede a `/comision/crear-programa-analitico?asignatura=31`
2. Selecciona periodo: "Primer Periodo PII 2026"
3. Sistema busca:
   - ¿Hay programa para asignatura 31 + periodo? **NO**
   - ¿Hay programa general del periodo? **SÍ (ID 47)**
4. Sistema carga programa ID 47
5. Comisión modifica y guarda
6. Sistema verifica:
   ```
   programaCargado.asignatura_id = null
   asignaturaActual = 31
   ➡️ Son diferentes → CREATE
   ```
7. Se crea **NUEVO** registro:
   ```json
   {
     "id": 50,
     "nombre": "ProgramaAnalitico",
     "periodo": "Primer Periodo PII 2026",
     "asignatura_id": 31,
     "datos_tabla": { "tabs": [...] }  // Versión modificada
   }
   ```

### **Comisión** - Segunda vez (Programación Web)
1. Accede a `/comision/crear-programa-analitico?asignatura=31`
2. Selecciona periodo: "Primer Periodo PII 2026"
3. Sistema busca:
   - ¿Hay programa para asignatura 31 + periodo? **SÍ (ID 50)**
4. Sistema carga programa ID 50 (su versión específica)
5. Comisión modifica y guarda
6. Sistema verifica:
   ```
   programaCargado.asignatura_id = 31
   asignaturaActual = 31
   ➡️ Son iguales → UPDATE
   ```
7. Se **ACTUALIZA** el mismo registro (ID 50)

### **Comisión** - Primera vez (Bases de Datos)
1. Accede a `/comision/crear-programa-analitico?asignatura=32`
2. Selecciona periodo: "Primer Periodo PII 2026"
3. Sistema busca:
   - ¿Hay programa para asignatura 32 + periodo? **NO**
   - ¿Hay programa general del periodo? **SÍ (ID 47)**
4. Sistema carga programa ID 47 (el original del admin)
5. Comisión modifica y guarda
6. Sistema verifica:
   ```
   programaCargado.asignatura_id = null
   asignaturaActual = 32
   ➡️ Son diferentes → CREATE
   ```
7. Se crea **OTRO NUEVO** registro:
   ```json
   {
     "id": 51,
     "nombre": "ProgramaAnalitico",
     "periodo": "Primer Periodo PII 2026",
     "asignatura_id": 32,
     "datos_tabla": { "tabs": [...] }
   }
   ```

## 📊 Estado Final en Base de Datos

| id | nombre | periodo | asignatura_id | Descripción |
|----|--------|---------|---------------|-------------|
| 47 | ProgramaAnalitico | Primer Periodo PII 2026 | **NULL** | ✅ ORIGINAL del admin (intacto) |
| 50 | ProgramaAnalitico | Primer Periodo PII 2026 | **31** | Versión de Programación Web |
| 51 | ProgramaAnalitico | Primer Periodo PII 2026 | **32** | Versión de Bases de Datos |

## 🔍 Logs del Sistema

### Cuando Comisión Guarda (Primera vez):
```
💾 Guardando programa analítico:
   - Programa cargado ID: 47
   - Asignatura del programa: null
   - Asignatura actual: 31
   - Es actualización?: false
   - Método: POST
   - Endpoint: /api/programa-analitico

✅ Guardado completado:
   id: 50
   asignatura_id: 31
   periodo: "Primer Periodo PII 2026"
   accion: CREADO NUEVO
```

### Cuando Comisión Guarda (Segunda vez):
```
💾 Guardando programa analítico:
   - Programa cargado ID: 50
   - Asignatura del programa: 31
   - Asignatura actual: 31
   - Es actualización?: true
   - Método: PUT
   - Endpoint: /api/programa-analitico/50

✅ Guardado completado:
   id: 50
   asignatura_id: 31
   periodo: "Primer Periodo PII 2026"
   accion: ACTUALIZADO
```

## ✅ Ventajas de Este Flujo

1. **Protege el Original**: El programa del admin nunca se modifica
2. **Trazabilidad**: Cada asignatura tiene su propia versión
3. **Flexibilidad**: Cada materia puede personalizarse
4. **Reutilización**: Un programa base sirve para múltiples asignaturas
5. **Independencia**: Cambios en una asignatura no afectan a otras

## 🎯 Mensajes al Usuario

### Cuando crea nuevo:
```
¡Programa Analítico creado exitosamente para esta asignatura!

Se ha creado una nueva versión específica. El programa original permanece sin cambios.
```

### Cuando actualiza:
```
¡Programa Analítico actualizado exitosamente!
```

## 📝 Fecha de Implementación
**4 de febrero de 2026**

## ✅ Estado Final
- ✅ No modifica el programa original del admin
- ✅ Crea versiones específicas por asignatura
- ✅ Permite actualizar versiones específicas
- ✅ Protege la base de datos de sobrescrituras
- ✅ Logs claros de CREATE vs UPDATE
