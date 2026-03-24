# 🔍 Diagnóstico de Auto-Completar Campos

## ❌ Problema Reportado
Los campos ASIGNATURA, PERIODO y NIVEL **NO se están llenando automáticamente** con la información de la base de datos.

## ✅ Cambios Realizados

### 1. Mejorada la Función `getAutoFilledContent`
- ✅ Eliminada la restricción `(!content || content === "")` 
- ✅ Ahora **SIEMPRE** devuelve el valor auto-completado si detecta el header
- ✅ Agregados logs de depuración para cada campo

### 2. Agregado useEffect de Monitoreo
- ✅ Monitorea cuando `asignaturaInfo` cambia
- ✅ Muestra en consola si los datos están disponibles

## 🧪 Cómo Diagnosticar el Problema

### Paso 1: Abre la Consola del Navegador
1. Presiona `F12` en Chrome/Edge
2. Ve a la pestaña **Console**

### Paso 2: Verifica que la Información se Cargue
Busca este log en la consola:
```
✅ Información de asignatura cargada: {
  id: 31,
  nombre: "Programación Web",
  codigo: "TI-301",
  nivel: { nombre: "Tercer Nivel", ... }
}
```

Y también:
```
🔍 AsignaturaInfo cambió: {
  asignaturaInfo: { codigo: "TI-301", nombre: "Programación Web", ... },
  hasInfo: true,
  codigo: "TI-301",
  nombre: "Programación Web",
  nivel: "Tercer Nivel"
}
```

### Paso 3: Verifica la Detección de Headers
Cuando veas la tabla, busca logs como:
```
🔍 Auto-completar ASIGNATURA: {
  headerText: "ASIGNATURA",
  currentContent: "",
  autoValue: "TI-301 - Programación Web",
  asignaturaInfo: { ... }
}
```

## 📋 Posibles Causas

### ❌ Causa 1: No hay parámetro `asignatura` en la URL
**Verificar:** La URL debe ser algo como:
```
http://localhost:3000/dashboard/comision/crear-programa-analitico?asignatura=31&periodo=Primer%20Periodo%20PII%202026
```

**Solución:** Asegúrate de acceder desde el enlace de una asignatura específica.

### ❌ Causa 2: El API `/api/asignatura/:id` no retorna datos
**Verificar:** Busca en la consola:
```
Error al cargar asignatura: ...
```

**Solución:** Verifica que el backend esté corriendo y que el endpoint funcione:
```bash
# En el terminal del backend
cd my-node-backend
npm run dev
```

### ❌ Causa 3: La estructura del header no coincide
**Verificar:** Los headers en la tabla deben contener EXACTAMENTE estas palabras:
- ✅ "ASIGNATURA" (mayúsculas o minúsculas, da igual)
- ✅ "PERIODO" o "PAO"
- ✅ "NIVEL"

**Ejemplo correcto:**
```
┌─────────────┬──────────────────────────┬─────────┐
│ ASIGNATURA  │ PERIODO ACADÉMICO (PAO)  │ NIVEL   │  ← HEADERS
├─────────────┼──────────────────────────┼─────────┤
│ [AQUÍ VA]   │ [AQUÍ VA]                │ [AQUÍ]  │  ← SE AUTO-COMPLETA
└─────────────┴──────────────────────────┴─────────┘
```

### ❌ Causa 4: La tabla no tiene headers en la fila anterior
**Verificar:** La celda que debe auto-completarse debe estar **justo debajo** del header.

**Incorrecto:**
```
┌─────────────┐
│ ASIGNATURA  │  ← Fila 0 (Header)
├─────────────┤
│ [VACÍO]     │  ← Fila 1 (Separador)
├─────────────┤
│ [AQUÍ VA]   │  ← Fila 2 (NO SE AUTO-COMPLETA - está a 2 filas del header)
└─────────────┘
```

**Correcto:**
```
┌─────────────┐
│ ASIGNATURA  │  ← Fila 0 (Header)
├─────────────┤
│ [AQUÍ VA]   │  ← Fila 1 (SÍ SE AUTO-COMPLETA - está justo debajo)
└─────────────┘
```

## 🔧 Soluciones Rápidas

### Solución 1: Verificar la URL
```javascript
// En la consola del navegador, ejecuta:
console.log('URL actual:', window.location.href);
console.log('Parámetro asignatura:', new URLSearchParams(window.location.search).get('asignatura'));
```

### Solución 2: Verificar asignaturaInfo manualmente
```javascript
// En la consola del navegador, después de que cargue la página:
// Abre React DevTools > Components > busca "CrearProgramaAnalitico"
// Verifica que el estado "asignaturaInfo" tenga datos
```

### Solución 3: Forzar el auto-completado
Si ves que `asignaturaInfo` tiene datos pero no se muestra:
1. Haz doble click en la celda vacía
2. Escribe cualquier cosa y presiona Enter
3. La función debería detectar el header y auto-completar

## 📊 Logs Esperados

### ✅ Cuando TODO funciona correctamente:
```
✅ Información de asignatura cargada: { ... }
🔍 AsignaturaInfo cambió: { hasInfo: true, ... }
🔍 Auto-completar ASIGNATURA: { autoValue: "TI-301 - Programación Web" }
🔍 Auto-completar PERIODO: { selectedPeriod: "Primer Periodo PII 2026" }
🔍 Auto-completar NIVEL: { autoValue: "Tercer Nivel" }
```

### ❌ Cuando NO hay asignatura en la URL:
```
✅ Datos cargados para comisión: { asignaturaActual: null, ... }
🔍 AsignaturaInfo cambió: { hasInfo: false, asignaturaInfo: null }
```

### ❌ Cuando falla el API:
```
Error al cargar asignatura: [error details]
```

## 🎯 Próximos Pasos

1. **Abre la consola del navegador** (F12)
2. **Recarga la página** (Ctrl + R)
3. **Copia y pega TODOS los logs** que aparezcan
4. **Compártelos** para identificar el problema exacto

## 📅 Fecha
**4 de febrero de 2026**
