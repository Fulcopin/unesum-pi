# 🚀 Pasos para que funcione Gestión de Asignaturas

## ✅ Paso 1: Actualizar tu usuario en la base de datos

Abre el **SQL Editor** de Neon (https://console.neon.tech) y ejecuta:

```sql
-- Asignar facultad a tu usuario
UPDATE usuarios 
SET facultad = 'Facultad de Ciencias Técnicas'
WHERE id = 3;

-- Verificar que se actualizó correctamente
SELECT id, nombres, apellidos, correo_electronico, rol, facultad 
FROM usuarios 
WHERE id = 3;
```

**Resultado esperado**: Deberías ver que el campo `facultad` ahora dice "Facultad de Ciencias Técnicas"

---

## ✅ Paso 2: Verificar que tienes asignaturas en esa facultad

```sql
-- Ver las carreras de tu facultad
SELECT c.id, c.nombre, c.facultad_id 
FROM carreras c
INNER JOIN facultades f ON c.facultad_id = f.id
WHERE f.nombre = 'Facultad de Ciencias Técnicas';

-- Ver las asignaturas disponibles (reemplaza CARRERA_ID con el ID de arriba)
SELECT id, nombre, codigo, carrera_id
FROM asignaturas
WHERE carrera_id = CARRERA_ID
LIMIT 10;
```

**Si NO tienes asignaturas**, necesitas crearlas primero:

```sql
-- Ejemplo: Crear asignaturas de prueba (ajusta el carrera_id según tu caso)
INSERT INTO asignaturas (nombre, codigo, carrera_id, estado)
VALUES 
  ('Programación I', 'PROG-001', 1, true),
  ('Matemáticas I', 'MAT-001', 1, true),
  ('Base de Datos', 'BD-001', 1, true);
```

---

## ✅ Paso 3: Iniciar el servidor Backend

Abre una **terminal PowerShell** y ejecuta:

```powershell
cd my-node-backend
npm run dev
```

**Resultado esperado**: 
```
🚀 Servidor corriendo en puerto 4000
📊 Base de datos conectada
```

**Si hay errores**, revisa:
- ¿Está correcto tu archivo `.env` con la URL de Neon?
- ¿Las credenciales de la base de datos son correctas?

---

## ✅ Paso 4: Iniciar el servidor Frontend

Abre **otra terminal PowerShell** y ejecuta:

```powershell
npm run dev
```

**Resultado esperado**: 
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

---

## ✅ Paso 5: Probar el sistema

1. **Inicia sesión** como comisión académica:
   - URL: http://localhost:3000/login
   - Email: comision@unesum.edu.ec
   - Contraseña: (tu contraseña)

2. **Ve al dashboard**:
   - URL: http://localhost:3000/dashboard/comision

3. **Haz clic en "Gestión de Asignaturas"**:
   - URL: http://localhost:3000/dashboard/comision/asignaturas

4. **Deberías ver**:
   - Tu facultad en el header: "Facultad de Ciencias Técnicas"
   - Botones de las carreras
   - Lista de asignaturas con botones "Crear Syllabus" y "Crear Programa"

---

## 🔍 Solución de Problemas

### Error: "Error al cargar la estructura"

**Causa**: El backend no está corriendo o no puede conectarse a la base de datos.

**Solución**:
1. Verifica que el backend esté corriendo en http://localhost:4000
2. Abre http://localhost:4000/api/auth/test (debería responder algo)
3. Revisa la consola del backend para ver errores

### Error: "El usuario no tiene una facultad asignada"

**Causa**: No ejecutaste el UPDATE en la base de datos.

**Solución**:
Ejecuta el Paso 1 nuevamente en el SQL Editor de Neon.

### Error: 404 Not Found

**Causa**: Las rutas del backend no están registradas.

**Solución**:
1. Detén el backend (Ctrl+C)
2. Reinicia con: `cd my-node-backend && npm run dev`

### No aparecen asignaturas

**Causa**: Tu facultad no tiene carreras o las carreras no tienen asignaturas.

**Solución**:
Ejecuta el Paso 2 para crear asignaturas de prueba.

---

## 📝 Resumen de URLs

| Descripción | URL |
|-------------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:4000 |
| Login | http://localhost:3000/login |
| Dashboard Comisión | http://localhost:3000/dashboard/comision |
| Gestión Asignaturas | http://localhost:3000/dashboard/comision/asignaturas |
| API Test | http://localhost:4000/api/auth/test |

---

## ✨ ¡Listo!

Si todo funciona correctamente, deberías poder:
- ✅ Ver tu facultad
- ✅ Seleccionar una carrera
- ✅ Ver la lista de asignaturas
- ✅ Ver estadísticas (total, con syllabus, con programa, etc.)
- ✅ Hacer clic en "Crear Syllabus" o "Crear Programa"
- ✅ Ser redirigido al editor correspondiente

**¿Sigues teniendo problemas?** Dime exactamente qué error ves en:
1. La consola del navegador (F12 → Console)
2. La terminal del backend
3. La pantalla del frontend
