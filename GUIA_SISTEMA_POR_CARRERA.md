# 🎯 SISTEMA DE GESTIÓN POR CARRERA ESPECÍFICA

## ✅ Paso 1: Ejecutar en Neon (SQL Editor)

```sql
-- 1. Agregar columna carrera_id a usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS carrera_id INTEGER;

-- 2. Agregar foreign key
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_carrera
FOREIGN KEY (carrera_id) 
REFERENCES carreras(id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- 3. Ver carreras disponibles de tu facultad
SELECT c.id, c.nombre, f.nombre as facultad
FROM carreras c
INNER JOIN facultades f ON c.facultad_id = f.id
WHERE f.nombre = 'Facultad de Ciencias Técnicas'
ORDER BY c.nombre;

-- 4. Asignar una carrera específica a tu usuario
-- REEMPLAZA 'ID_DE_LA_CARRERA' con el ID real que viste arriba
UPDATE usuarios 
SET carrera_id = ID_DE_LA_CARRERA
WHERE id = 3;

-- Ejemplo: Si la carrera "Ingeniería en Sistemas" tiene ID = 1:
-- UPDATE usuarios SET carrera_id = 1 WHERE id = 3;

-- 5. Verificar que se asignó correctamente
SELECT 
  u.id, 
  u.nombres, 
  u.apellidos, 
  u.correo_electronico,
  u.rol, 
  u.facultad,
  u.carrera_id,
  c.nombre as carrera_asignada,
  f.nombre as facultad_de_la_carrera
FROM usuarios u
LEFT JOIN carreras c ON u.carrera_id = c.id
LEFT JOIN facultades f ON c.facultad_id = f.id
WHERE u.id = 3;
```

## ✅ Paso 2: Reiniciar el Backend

Detén el backend (Ctrl+C) y vuelve a iniciarlo:

```powershell
cd my-node-backend
npm run dev
```

## ✅ Paso 3: Probar

1. Recarga la página: http://localhost:3000/dashboard/comision/asignaturas
2. Deberías ver:
   - **Solo tu carrera asignada** (no todas las carreras de la facultad)
   - Las asignaturas de esa carrera específica
   - Botones "Crear Syllabus" y "Crear Programa" para cada asignatura

## 🎯 Lógica del Sistema

El sistema ahora funciona así:

### Si el usuario tiene `carrera_id`:
- ✅ Muestra **SOLO** esa carrera
- ✅ Muestra las asignaturas de esa carrera
- ✅ No puede ver otras carreras de la facultad

### Si el usuario tiene `facultad` pero NO tiene `carrera_id`:
- ✅ Muestra **TODAS** las carreras de la facultad
- ✅ Puede gestionar todas las asignaturas de todas las carreras

### Si el usuario NO tiene ni `facultad` ni `carrera_id`:
- ❌ Error: "El usuario no tiene una facultad ni carrera asignada"

## 📊 Ejemplo de Uso

### Usuario 1: Comisión Académica de Carrera Específica
```sql
UPDATE usuarios SET carrera_id = 1, facultad = 'Facultad de Ciencias Técnicas' WHERE id = 3;
```
→ Ve SOLO las asignaturas de "Ingeniería en Sistemas"

### Usuario 2: Comisión Académica de Facultad Completa
```sql
UPDATE usuarios SET carrera_id = NULL, facultad = 'Facultad de Ciencias Técnicas' WHERE id = 4;
```
→ Ve TODAS las carreras y asignaturas de "Facultad de Ciencias Técnicas"

## 🔍 Verificar Asignaturas

Para verificar que tu carrera tiene asignaturas:

```sql
-- Ver asignaturas de una carrera específica
SELECT a.id, a.nombre, a.codigo, c.nombre as carrera
FROM asignaturas a
INNER JOIN carreras c ON a.carrera_id = c.id
WHERE c.id = TU_CARRERA_ID
ORDER BY a.nombre;
```

Si no hay asignaturas, créalas:

```sql
-- Crear asignaturas de ejemplo (ajusta el carrera_id)
INSERT INTO asignaturas (nombre, codigo, carrera_id, estado)
VALUES 
  ('Programación I', 'PROG-001', TU_CARRERA_ID, true),
  ('Matemáticas I', 'MAT-001', TU_CARRERA_ID, true),
  ('Base de Datos', 'BD-001', TU_CARRERA_ID, true),
  ('Estructuras de Datos', 'ED-001', TU_CARRERA_ID, true),
  ('Redes de Computadoras', 'RC-001', TU_CARRERA_ID, true);
```

## ✨ Resultado Final

Después de seguir estos pasos, cuando entres a:
http://localhost:3000/dashboard/comision/asignaturas

Verás:

```
┌─────────────────────────────────────────────────┐
│  Facultad de Ciencias Técnicas                  │
├─────────────────────────────────────────────────┤
│  [Ingeniería en Sistemas] ← Tu carrera          │
├─────────────────────────────────────────────────┤
│  📚 Asignaturas de Ingeniería en Sistemas       │
│                                                 │
│  1. Programación I        [Crear Syllabus]     │
│                          [Crear Programa]      │
│                                                 │
│  2. Matemáticas I         [Crear Syllabus]     │
│                          [Crear Programa]      │
│                                                 │
│  3. Base de Datos         [Crear Syllabus]     │
│                          [Crear Programa]      │
└─────────────────────────────────────────────────┘
```

## 🚨 Troubleshooting

### Error: "No se pueden cargar las asignaturas"
- Verifica que tu usuario tenga `carrera_id` asignado
- Verifica que esa carrera tenga asignaturas

### No aparece ninguna carrera
- Ejecuta: `SELECT * FROM usuarios WHERE id = 3;`
- Verifica que `carrera_id` no sea NULL

### Aparecen todas las carreras (no solo la mía)
- Asegúrate de que `carrera_id` esté configurado en la base de datos
- Reinicia el backend después de actualizar la base de datos
