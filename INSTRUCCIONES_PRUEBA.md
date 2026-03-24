# 🧪 INSTRUCCIONES DE PRUEBA - Sistema Comisión Académica

## 🎯 Objetivo
Probar el sistema completo de gestión de asignaturas para comisión académica.

---

## 📋 Pre-requisitos

### 1. Base de Datos PostgreSQL
- ✅ Servidor corriendo
- ✅ Base de datos `unesum` creada
- ✅ Tablas existentes (usuarios, facultades, carreras, mallas, asignaturas, syllabi, programas_analiticos)

### 2. Datos Iniciales Necesarios

#### A. Crear una Facultad (si no existe)
```sql
INSERT INTO facultades (nombre) 
VALUES ('Facultad de Ciencias de la Salud')
ON CONFLICT DO NOTHING;
```

#### B. Crear un Usuario Comisión Académica
```sql
INSERT INTO usuarios (
  nombres, 
  apellidos, 
  cedula_identidad, 
  correo_electronico, 
  rol, 
  facultad, 
  contraseña,
  estado
) VALUES (
  'María',
  'González',
  '1234567890',
  'comision@unesum.edu.ec',
  'comision_academica',
  'Facultad de Ciencias de la Salud',
  '$2b$10$hashedpassword...', -- Contraseña: "password123"
  true
)
ON CONFLICT (correo_electronico) DO UPDATE 
SET rol = 'comision_academica',
    facultad = 'Facultad de Ciencias de la Salud';
```

#### C. Crear una Carrera de Prueba
```sql
-- Primero obtener el ID de la facultad
SELECT id FROM facultades WHERE nombre = 'Facultad de Ciencias de la Salud';

-- Luego crear la carrera (reemplaza {facultad_id} con el ID obtenido)
INSERT INTO carreras (nombre, facultad_id)
VALUES ('Enfermería', {facultad_id})
ON CONFLICT DO NOTHING;
```

#### D. Crear Asignaturas de Prueba
```sql
-- Obtener IDs necesarios
SELECT id FROM carreras WHERE nombre = 'Enfermería';
SELECT id FROM nivel WHERE nombre LIKE 'Primer%' LIMIT 1;
SELECT id FROM organizacion LIMIT 1;

-- Crear asignaturas (reemplaza los IDs)
INSERT INTO asignaturas (nombre, codigo, carrera_id, nivel_id, organizacion_id, estado)
VALUES 
  ('Anatomía I', 'ENF-101', {carrera_id}, {nivel_id}, {org_id}, 'activo'),
  ('Fisiología I', 'ENF-102', {carrera_id}, {nivel_id}, {org_id}, 'activo'),
  ('Bioquímica', 'ENF-103', {carrera_id}, {nivel_id}, {org_id}, 'activo')
ON CONFLICT (codigo) DO NOTHING;
```

---

## 🚀 Paso 1: Iniciar los Servidores

### Terminal 1 - Backend
```powershell
cd my-node-backend
npm run dev
```

**Verificar:**
- ✅ Servidor corriendo en `http://localhost:4000`
- ✅ Mensaje: "Servidor corriendo en puerto 4000"
- ✅ Conexión a base de datos exitosa

### Terminal 2 - Frontend
```powershell
npm run dev
```

**Verificar:**
- ✅ Servidor corriendo en `http://localhost:3000`
- ✅ Mensaje: "Ready in X ms"
- ✅ Sin errores de compilación

---

## 🧪 Paso 2: Pruebas del Backend

### Test 1: Login
```powershell
# PowerShell
$body = @{
  email = "comision@unesum.edu.ec"
  password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$token = $response.token
Write-Host "Token: $token"
```

**Esperado:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nombres": "María",
    "apellidos": "González",
    "rol": "comision_academica",
    "facultad": "Facultad de Ciencias de la Salud"
  }
}
```

### Test 2: Obtener Estructura de Facultad
```powershell
# Usar el token obtenido en Test 1
$headers = @{
  "Authorization" = "Bearer $token"
}

$estructura = Invoke-RestMethod -Uri "http://localhost:4000/api/comision-academica/estructura-facultad" `
  -Method GET `
  -Headers $headers

$estructura | ConvertTo-Json -Depth 10
```

**Esperado:**
```json
{
  "success": true,
  "data": {
    "facultad": {
      "id": 1,
      "nombre": "Facultad de Ciencias de la Salud"
    },
    "carreras": [
      {
        "id": 1,
        "nombre": "Enfermería",
        "mallas": [...],
        "asignaturas": [
          {
            "id": 1,
            "nombre": "Anatomía I",
            "codigo": "ENF-101",
            "nivel": "Primer Nivel",
            "tiene_syllabus": false,
            "tiene_programa": false
          }
        ]
      }
    ]
  }
}
```

### Test 3: Obtener Carreras (debe filtrar por facultad)
```powershell
$carreras = Invoke-RestMethod -Uri "http://localhost:4000/api/carreras" `
  -Method GET `
  -Headers $headers

$carreras | ConvertTo-Json -Depth 5
```

**Esperado:**
- Solo carreras de "Facultad de Ciencias de la Salud"
- No debe incluir carreras de otras facultades

### Test 4: Intentar Crear Carrera en Otra Facultad (debe fallar)
```powershell
# Intentar crear carrera en otra facultad
$body = @{
  nombre = "Carrera Test"
  facultad_id = 999  # ID de otra facultad
} | ConvertTo-Json

try {
  $result = Invoke-RestMethod -Uri "http://localhost:4000/api/carreras" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"
} catch {
  Write-Host "Error esperado: $($_.Exception.Message)"
}
```

**Esperado:**
- ❌ Error 403 Forbidden
- Mensaje: "No tienes permisos para crear carreras en otra facultad"

---

## 🖥️ Paso 3: Pruebas del Frontend

### Test 1: Login en la Interfaz

1. Abrir navegador: `http://localhost:3000/login`

2. Ingresar credenciales:
   - **Email:** comision@unesum.edu.ec
   - **Password:** password123

3. Clic en "Iniciar Sesión"

**Esperado:**
- ✅ Redirección a `/dashboard/comision`
- ✅ Ver mensaje: "Bienvenido, María"
- ✅ Ver header con rol: "Comisión Académica"

### Test 2: Acceder al Dashboard

URL: `http://localhost:3000/dashboard/comision`

**Verificar:**
- ✅ Se muestra "Panel de Comisión Académica"
- ✅ Se muestran 3 herramientas principales destacadas:
  - 🏫 Gestión de Asignaturas
  - 📝 Editor de Syllabus
  - 📄 Editor de Programa Analítico
- ✅ Se muestran otras herramientas en la parte inferior

### Test 3: Acceder a Gestión de Asignaturas

1. Clic en "Gestión de Asignaturas"

2. Esperar carga

**Verificar:**
- ✅ URL: `http://localhost:3000/dashboard/comision/asignaturas`
- ✅ Se muestra: "🏫 Gestión de Asignaturas"
- ✅ Se muestra: "Facultad: Facultad de Ciencias de la Salud"
- ✅ Se muestra botón de carrera: "Enfermería (3)" o similar
- ✅ Se muestran estadísticas:
  - Total: 3
  - Con Syllabus: 0
  - Con Programa: 0
  - Completas: 0
  - Pendientes: 3
- ✅ Se muestra lista de asignaturas:
  - Anatomía I [ENF-101]
  - Fisiología I [ENF-102]
  - Bioquímica [ENF-103]

### Test 4: Crear Syllabus para una Materia

1. Buscar "Anatomía I" en la lista

2. Verificar estado:
   - ✗ Syllabus
   - ✗ Programa

3. Clic en botón "Crear Syllabus"

**Verificar:**
- ✅ Redirección a `/dashboard/admin/editor-syllabus?asignatura=1&nueva=true`
- ✅ Editor se abre
- ✅ Se muestra título: "Editor de Syllabus"

4. En el editor:
   - Agregar una pestaña
   - Agregar contenido
   - Clic en "Guardar"

**Verificar:**
- ✅ Mensaje de éxito
- ✅ Datos guardados en BD

5. Regresar a Gestión de Asignaturas

**Verificar:**
- ✅ Anatomía I ahora muestra:
  - ✅ Syllabus
  - ✗ Programa
- ✅ Botón cambió a "Ver Syllabus"
- ✅ Estadísticas actualizadas:
  - Con Syllabus: 1
  - Pendientes: 2

### Test 5: Verificar Filtrado de Facultad

1. En la consola del navegador (F12), ejecutar:
```javascript
// Intentar obtener carreras de otra facultad manualmente
fetch('http://localhost:4000/api/carreras', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

**Verificar:**
- ✅ Solo retorna carreras de tu facultad
- ✅ No incluye carreras de otras facultades

---

## 📊 Paso 4: Verificación en Base de Datos

### Verificar Syllabus Creado
```sql
SELECT 
  s.id,
  s.asignatura_id,
  a.nombre as asignatura,
  a.codigo,
  s.created_at
FROM syllabi s
JOIN asignaturas a ON a.id = s.asignatura_id
WHERE a.nombre = 'Anatomía I';
```

**Esperado:**
- ✅ Un registro de syllabus para Anatomía I
- ✅ Tiene timestamp de creación

### Verificar Relaciones
```sql
SELECT 
  f.nombre as facultad,
  c.nombre as carrera,
  COUNT(a.id) as total_asignaturas,
  COUNT(s.id) as con_syllabus,
  COUNT(pa.id) as con_programa
FROM facultades f
LEFT JOIN carreras c ON c.facultad_id = f.id
LEFT JOIN asignaturas a ON a.carrera_id = c.id
LEFT JOIN syllabi s ON s.asignatura_id = a.id
LEFT JOIN programas_analiticos pa ON pa.asignatura_id = a.id
WHERE f.nombre = 'Facultad de Ciencias de la Salud'
GROUP BY f.nombre, c.nombre;
```

**Esperado:**
- ✅ Facultad de Ciencias de la Salud
- ✅ Carrera Enfermería
- ✅ 3 asignaturas
- ✅ 1 con syllabus (después de crear)
- ✅ 0 con programa

---

## ✅ Checklist de Pruebas Completadas

### Backend:
- [ ] Login exitoso
- [ ] Token JWT válido
- [ ] Endpoint estructura-facultad funcional
- [ ] Filtrado automático por facultad
- [ ] Validación de permisos (403 en otras facultades)
- [ ] CRUD de carreras con permisos
- [ ] CRUD de mallas con permisos
- [ ] CRUD de asignaturas con permisos

### Frontend:
- [ ] Login en interfaz
- [ ] Dashboard carga correctamente
- [ ] Gestión de asignaturas accesible
- [ ] Se muestra facultad correcta
- [ ] Lista de carreras visible
- [ ] Estadísticas calculadas correctamente
- [ ] Lista de asignaturas mostrada
- [ ] Botones contextuales aparecen
- [ ] Crear syllabus redirige correctamente
- [ ] Guardar syllabus funciona
- [ ] Estados se actualizan después de guardar

### Seguridad:
- [ ] No puede ver otras facultades
- [ ] No puede crear en otras facultades
- [ ] No puede editar de otras facultades
- [ ] No puede eliminar de otras facultades
- [ ] Token expira correctamente
- [ ] Redirección al login si no autenticado

### Base de Datos:
- [ ] Datos se guardan correctamente
- [ ] Relaciones son válidas
- [ ] No hay datos huérfanos
- [ ] Constraints funcionan

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: "No se cargan las carreras"
**Solución:**
```sql
-- Verificar que el usuario tiene facultad asignada
SELECT id, nombres, rol, facultad FROM usuarios 
WHERE correo_electronico = 'comision@unesum.edu.ec';

-- Si facultad es NULL, actualizar:
UPDATE usuarios 
SET facultad = 'Facultad de Ciencias de la Salud'
WHERE correo_electronico = 'comision@unesum.edu.ec';
```

### Problema 2: "Error 403 Forbidden"
**Causa:** El usuario no tiene permisos
**Solución:**
```sql
-- Verificar el rol
UPDATE usuarios 
SET rol = 'comision_academica'
WHERE correo_electronico = 'comision@unesum.edu.ec';
```

### Problema 3: "No aparecen asignaturas"
**Solución:**
```sql
-- Verificar que las asignaturas están vinculadas correctamente
SELECT 
  a.id,
  a.nombre,
  a.codigo,
  c.nombre as carrera,
  f.nombre as facultad
FROM asignaturas a
JOIN carreras c ON c.id = a.carrera_id
JOIN facultades f ON f.id = c.facultad_id
WHERE f.nombre = 'Facultad de Ciencias de la Salud';
```

### Problema 4: "Token inválido o expirado"
**Solución:**
1. Hacer logout
2. Volver a hacer login
3. Verificar que el token se guarda en localStorage

---

## 📝 Notas Finales

### Testing Exitoso Significa:
✅ Usuario puede loguearse
✅ Ve solo datos de su facultad
✅ Puede crear carreras en su facultad
✅ Puede crear asignaturas
✅ Puede crear syllabus
✅ Puede crear programas analíticos
✅ No puede acceder a otras facultades
✅ Estadísticas se actualizan
✅ Interfaz es responsive

### Próximos Pasos Después de Testing:
1. Documentar bugs encontrados
2. Agregar más asignaturas de prueba
3. Probar con múltiples usuarios
4. Probar con múltiples facultades
5. Optimizar consultas si es necesario
6. Agregar logs para debugging
7. Implementar notificaciones
8. Agregar exportación de reportes

---

## 🎉 ¡Listo para Producción!

Si todas las pruebas pasan, el sistema está listo para:
- ✅ Ser usado en ambiente de desarrollo
- ✅ Demos con usuarios reales
- ✅ Feedback y mejoras
- ⏳ Deploy a producción (después de más testing)

---

**Fecha:** Enero 10, 2026
**Versión:** 1.0.0
**Estado:** 🧪 EN TESTING
