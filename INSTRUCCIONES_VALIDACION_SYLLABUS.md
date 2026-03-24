# 🎓 INSTRUCCIONES: Sistema de Validación de Syllabus

**Fecha:** 30 de enero de 2026  
**Estado:** ✅ COMPLETADO E IMPLEMENTADO

---

## 🎯 LO QUE SE IMPLEMENTÓ

### **Validación: 1 Syllabus por Materia por Periodo**

El sistema ahora valida que:
- ✅ Solo se puede subir **1 syllabus** por **materia** por **periodo**
- ✅ Solo se puede subir **1 programa analítico** por **materia** por **periodo**
- ✅ Si ya existe uno, el sistema te lo advierte
- ✅ Puedes eliminar el existente para subir uno nuevo

---

## 📋 FLUJO COMPLETO PARA COMISIÓN ACADÉMICA

### Paso 1: Acceder a Gestión de Asignaturas

1. Inicia sesión como **Comisión Académica**
2. Ve al menú **"Gestión de Asignaturas"**
3. Verás la lista de asignaturas de tu facultad/carrera

### Paso 2: Seleccionar Periodo Académico

**¡IMPORTANTE!** Antes de crear cualquier documento:

1. En la parte superior verás una tarjeta azul **"Periodo Académico"**
2. Selecciona el periodo para el cual deseas crear el syllabus
   - Ejemplo: "2024-1", "2024-2", "2025-1"
3. El periodo actual aparecerá marcado con "(Actual)"

**⚠️ Sin periodo seleccionado, los botones estarán deshabilitados**

### Paso 3: Crear Syllabus

1. Busca la asignatura en la lista
2. Verás dos indicadores:
   - ✅ Verde = Ya tiene documento
   - ❌ Gris = No tiene documento

3. Si **NO tiene syllabus**, verás el botón **"Crear Syllabus"**
4. Click en ese botón

### Paso 4: El Sistema Verifica Automáticamente

**CASO A: No existe syllabus para ese periodo**
```
✅ Te redirige al editor para crear el syllabus
```

**CASO B: Ya existe un syllabus para ese periodo**
```
⚠️ Aparecerá un mensaje:

"Ya existe un syllabus para 'Matemáticas I' en este periodo"

Syllabus existente: Syllabus Matemáticas 2024-1
Fecha de creación: 15/01/2024

¿Desea eliminarlo para subir uno nuevo?

[Aceptar] [Cancelar]
```

**Opciones:**
- **Aceptar** → Elimina el existente y abre el editor para crear uno nuevo
- **Cancelar** → Abre el existente para verlo/editarlo

---

## 🔍 EJEMPLOS PRÁCTICOS

### Ejemplo 1: Primera Creación (OK ✅)

```
Periodo seleccionado: 2024-1
Materia: Programación I
Estado: Sin syllabus

[Click en "Crear Syllabus"]
→ Sistema verifica: No existe
→ Redirige al editor
→ Creas el syllabus normalmente
→ Guardas: 201 Created ✅
```

### Ejemplo 2: Intento de Duplicado (BLOQUEADO ❌)

```
Periodo seleccionado: 2024-1
Materia: Programación I
Estado: Ya tiene syllabus

[Click en "Crear Syllabus"]
→ Sistema verifica: Ya existe
→ Alerta: "Ya existe un syllabus..."
→ Opción 1: Eliminar para crear nuevo
→ Opción 2: Ver el existente
```

### Ejemplo 3: Múltiples Periodos (OK ✅)

```
Periodo: 2024-1 → Crea syllabus ✅
Periodo: 2024-2 → Puede crear otro ✅
Periodo: 2025-1 → Puede crear otro ✅

RESULTADO: 3 syllabi diferentes para la misma materia
(uno por cada periodo)
```

---

## 🚀 CÓMO USAR EL SISTEMA

### Para Comisión Académica:

1. **Gestionar Asignaturas**: `/dashboard/comision/asignaturas`
   - Ver todas las asignaturas
   - Seleccionar periodo académico
   - Crear syllabus y programas

2. **Crear Syllabus**: Click en "Crear Syllabus"
   - Sistema verifica automáticamente
   - Si no existe, crea uno nuevo
   - Si existe, ofrece opciones

3. **Ver Syllabus Existente**: Click en "Ver Syllabus"
   - Puedes ver/editar el syllabus actual

### Para Profesores:

1. Los profesores ven los syllabi ya creados
2. Completan la información asignada
3. No pueden crear duplicados (validación automática)

---

## ✅ LO QUE SE MODIFICÓ EN EL CÓDIGO

### Backend (YA COMPLETADO ✅)

1. **Base de Datos**:
   - Agregada columna `asignatura_id` en tabla `syllabi`
   - Agregada columna `asignatura_id` en tabla `programas_analiticos`
   - Índices creados para optimización

2. **Controlador** (`syllabusController.js`):
   - Función `create`: Valida duplicados antes de crear
   - Función `verificarExistencia`: Verifica si ya existe syllabus
   - Respuestas: 201 (OK), 409 (Duplicado)

3. **Rutas** (`syllabus.routes.js`):
   - Nueva ruta: `GET /api/syllabi/verificar-existencia`
   - Autorización para 3 roles

### Frontend (RECIÉN COMPLETADO ✅)

1. **Página de Asignaturas** (`app/dashboard/comision/asignaturas/page.tsx`):
   - ✅ Selector de periodo académico (tarjeta azul)
   - ✅ Carga automática de periodos desde API
   - ✅ Selección automática del periodo actual
   - ✅ Función `verificarYCrearSyllabus`: Verifica antes de crear
   - ✅ Función `eliminarSyllabus`: Elimina y recarga datos
   - ✅ Botones deshabilitados sin periodo seleccionado
   - ✅ Alertas con opciones (ver existente o eliminar)

---

## 🧪 PRUEBAS A REALIZAR

### Test 1: Verificar Selector de Periodo

```bash
1. Entrar a /dashboard/comision/asignaturas
2. Ver tarjeta azul "Periodo Académico"
3. Verificar que aparecen los periodos
4. Verificar que el actual está marcado
```

### Test 2: Crear Primer Syllabus

```bash
1. Seleccionar periodo "2024-1"
2. Elegir una materia sin syllabus
3. Click en "Crear Syllabus"
4. Verificar que redirige al editor
5. Completar y guardar
6. Verificar mensaje "✅ Syllabus creado"
```

### Test 3: Intentar Duplicado

```bash
1. Mismo periodo "2024-1"
2. Misma materia del Test 2
3. Click en "Crear Syllabus"
4. Verificar alerta: "Ya existe un syllabus..."
5. Verificar botones: [Aceptar] [Cancelar]
6. Probar ambas opciones
```

### Test 4: Múltiples Periodos

```bash
1. Periodo "2024-1" → Crear syllabus ✅
2. Periodo "2024-2" → Crear otro ✅
3. Verificar que ambos existen
4. Verificar que no interfieren entre sí
```

---

## ❓ PREGUNTAS FRECUENTES

### ¿Puedo subir más de un syllabus para una materia?

**SÍ**, pero solo **UNO por periodo**:
- Periodo 2024-1: 1 syllabus ✅
- Periodo 2024-2: 1 syllabus ✅
- Total: 2 syllabi (diferentes periodos)

### ¿Qué pasa si me equivoqué al subir?

El sistema te ofrece **eliminar el existente** para subir uno nuevo.

### ¿Puedo editar un syllabus ya subido?

SÍ, click en **"Ver Syllabus"** y podrás editarlo.

### ¿Por qué no puedo crear syllabus?

Verifica:
1. ¿Seleccionaste un periodo académico? (tarjeta azul)
2. ¿Tienes permisos de Comisión Académica?
3. ¿El backend está corriendo en el puerto 4000?

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: "Por favor seleccione un periodo"

**Solución:** Selecciona un periodo en la tarjeta azul antes de crear documentos.

### Error: "Ya existe un syllabus..."

**Esto NO es un error**, es la validación funcionando correctamente.

**Opciones:**
1. Ver el existente (Cancelar)
2. Eliminarlo para crear nuevo (Aceptar)

### No aparecen periodos en el selector

**Posible causa:** Backend no responde

**Solución:**
```bash
cd my-node-backend
npm run dev
```

### Botones deshabilitados

**Causa:** No has seleccionado periodo

**Solución:** Selecciona periodo en tarjeta azul

---

## 🎯 SIGUIENTE PASO: INICIAR SERVIDORES

### 1. Iniciar Backend

```powershell
cd my-node-backend
npm run dev
```

**Debe mostrar:**
```
Server is running on port 4000
Base de datos conectada exitosamente
```

### 2. Iniciar Frontend (en otra terminal)

```powershell
# Desde la raíz del proyecto
npm run dev
```

**Debe mostrar:**
```
- ready started server on 0.0.0.0:3000
✓ Compiled
```

### 3. Probar en el Navegador

```
http://localhost:3000/dashboard/comision/asignaturas
```

---

## ✅ CHECKLIST FINAL

- [x] ✅ Base de datos: columna `asignatura_id` agregada
- [x] ✅ Backend: validación en `create` implementada
- [x] ✅ Backend: endpoint `/verificar-existencia` creado
- [x] ✅ Frontend: selector de periodo agregado
- [x] ✅ Frontend: verificación antes de crear implementada
- [x] ✅ Frontend: manejo de duplicados con alertas
- [x] ✅ Frontend: botones deshabilitados sin periodo
- [ ] ⏳ Servidores iniciados y probados
- [ ] ⏳ Test de flujo completo realizado

---

## 📞 AYUDA

Si tienes problemas:
1. Verifica que ambos servidores estén corriendo
2. Revisa la consola del navegador (F12)
3. Revisa logs del backend
4. Verifica que el token JWT es válido
5. Consulta el archivo `GUIA_COMPLETA_SYLLABUS_POR_MATERIA.md`

---

**🎉 ¡Sistema de validación completamente implementado!**

**Ahora ejecuta los comandos para iniciar los servidores y prueba el flujo completo.**
