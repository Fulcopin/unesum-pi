# 🔧 SOLUCIÓN: Mostrar Solo UNA Carrera en Comisión Académica

## 🎯 Objetivo
Que el usuario de comisión académica vea **SOLO una carrera** (la suya) en lugar de todas las carreras de la facultad.

---

## 📋 Pasos para Solucionar

### PASO 1: Ejecutar el Diagnóstico en Neon SQL Editor
Abre el archivo `DIAGNOSTICO_CARRERA_ID.sql` y ejecuta las consultas una por una.

**Consulta más importante:**
```sql
SELECT 
  id, 
  nombres, 
  apellidos, 
  correo_electronico, 
  rol, 
  facultad, 
  carrera, 
  carrera_id
FROM usuarios
WHERE id = 3;
```

**❓ Pregunta clave:** ¿El campo `carrera_id` es NULL o tiene un número?

---

### CASO A: Si `carrera_id` es NULL (el problema más probable)

**Esto significa:** El backend está enviando TODAS las carreras porque el usuario NO tiene una carrera específica asignada.

**SOLUCIÓN:**

1. **Encuentra el ID de la carrera que quieres asignar:**
```sql
SELECT id, nombre, facultad_id
FROM carreras
WHERE nombre LIKE '%Eléctrica%'
ORDER BY nombre;
```
Supongamos que te devuelve `id = 6` para "Ingeniería Eléctrica y Potencia"

2. **Asigna esa carrera al usuario:**
```sql
UPDATE usuarios 
SET carrera_id = 6  -- ⚠️ Reemplaza 6 con el ID real
WHERE id = 3;
```

3. **Verifica que se guardó:**
```sql
SELECT u.id, u.nombres, u.carrera_id, c.nombre as carrera_asignada
FROM usuarios u
LEFT JOIN carreras c ON u.carrera_id = c.id
WHERE u.id = 3;
```
Deberías ver: `carrera_id = 6` y `carrera_asignada = "Ingeniería Eléctrica y Potencia"`

4. **Reinicia el backend:**
```powershell
# En la terminal de PowerShell:
cd my-node-backend
npm run dev
```

5. **Limpia el caché del navegador:**
   - Abre DevTools (F12)
   - Ve a la pestaña "Application" o "Almacenamiento"
   - Busca "Local Storage"
   - Encuentra `http://localhost:3000`
   - Haz clic derecho → "Clear" o "Borrar"
   - **O simplemente cierra sesión y vuelve a iniciar**

6. **Recarga la página:**
   - Ve a http://localhost:3000/dashboard/comision/asignaturas
   - Deberías ver SOLO una carrera

---

### CASO B: Si `carrera_id` YA tiene un número (no es NULL)

**Esto significa:** El backend DEBERÍA estar enviando solo una carrera, pero algo está fallando.

**SOLUCIÓN:**

1. **Verifica que el backend tenga los logs nuevos:**
Abre `my-node-backend/src/controllers/comisionAcademicaController.js` y busca esta línea:
```javascript
console.log('👤 Usuario:', {
```

Si NO existe, los cambios no se guardaron. En ese caso, ejecuta:
```powershell
cd my-node-backend
npm run dev
```

2. **Revisa los logs del backend:**
Cuando recargues la página, deberías ver en la terminal del backend:
```
👤 Usuario: { id: 3, nombre: '...', carrera_id: 6 }
🎓 ✅ CASO 1: Usuario tiene carrera_id asignada: 6
📦 RESPUESTA (CASO 1 - Una sola carrera): { facultad: '...', total_carreras: 1, carrera: 'Ingeniería Eléctrica y Potencia' }
```

Si ves:
```
🏫 ⚠️ CASO 2: Usuario NO tiene carrera_id, usando facultad: ...
📦 RESPUESTA (CASO 2 - Todas las carreras): { total_carreras: 13, carreras: [...] }
```
Entonces el problema es que `carrera_id` es NULL en la base de datos. Ve al **CASO A**.

3. **Si los logs muestran CASO 1 pero el frontend sigue mostrando muchas carreras:**
   - Borra el localStorage del navegador (paso 5 del CASO A)
   - Cierra sesión y vuelve a iniciar sesión
   - Recarga con Ctrl+Shift+R (recarga forzada)

---

## 🔍 Verificación Final

Una vez completados los pasos, deberías ver:

✅ **En la base de datos:**
```sql
SELECT carrera_id FROM usuarios WHERE id = 3;
-- Resultado: 6 (o el ID de tu carrera)
```

✅ **En los logs del backend:**
```
🎓 ✅ CASO 1: Usuario tiene carrera_id asignada: 6
📦 RESPUESTA (CASO 1 - Una sola carrera): { total_carreras: 1 }
```

✅ **En el frontend:**
- Arriba dice: "Tu Carrera: Ingeniería Eléctrica y Potencia" (en verde)
- NO aparece el selector de carreras
- Solo se ven las asignaturas de esa carrera

---

## ❓ Si Sigue Sin Funcionar

Ejecuta esto y mándame el resultado:

```sql
-- 1. Usuario actual
SELECT id, nombres, apellidos, rol, facultad, carrera, carrera_id
FROM usuarios WHERE id = 3;

-- 2. Carrera asignada
SELECT c.id, c.nombre, f.nombre as facultad
FROM carreras c
JOIN facultades f ON c.facultad_id = f.id
WHERE c.id = (SELECT carrera_id FROM usuarios WHERE id = 3);

-- 3. Todas las carreras de la facultad
SELECT COUNT(*) as total FROM carreras 
WHERE facultad_id = (
  SELECT facultad_id FROM carreras 
  WHERE id = (SELECT carrera_id FROM usuarios WHERE id = 3)
);
```

Y también muéstrame:
- Screenshot de la consola del backend (terminal)
- Screenshot del frontend
- El resultado de las 3 consultas SQL anteriores
