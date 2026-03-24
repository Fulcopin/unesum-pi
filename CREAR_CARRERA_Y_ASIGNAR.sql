-- ===================================================================
-- CREAR CARRERA Y ASIGNAR A COMISIÓN ACADÉMICA
-- ===================================================================

-- PASO 1: Ver las facultades disponibles
SELECT id, nombre FROM facultades ORDER BY nombre;

-- PASO 2: Crear una nueva carrera
-- OPCIÓN A: Si ya sabes el ID de la facultad (por ejemplo, Facultad de Ciencias Técnicas = 8)
INSERT INTO carreras (nombre, facultad_id, created_at, updated_at)
VALUES ('Ingeniería en Sistemas', 8, NOW(), NOW())
RETURNING id, nombre;

-- OPCIÓN B: Crear varias carreras a la vez
INSERT INTO carreras (nombre, facultad_id, created_at, updated_at)
VALUES 
  ('Ingeniería en Sistemas', 8, NOW(), NOW()),
  ('Ingeniería en Redes', 8, NOW(), NOW()),
  ('Ingeniería en Software', 8, NOW(), NOW())
RETURNING id, nombre;

-- PASO 3: Ver las carreras que acabas de crear
SELECT c.id, c.nombre, f.nombre as facultad
FROM carreras c
INNER JOIN facultades f ON c.facultad_id = f.id
WHERE f.id = 8
ORDER BY c.nombre;

-- PASO 4: Agregar la columna carrera_id a usuarios (si no existe)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS carrera_id INTEGER;

-- PASO 5: Agregar foreign key constraint (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuarios_carrera'
  ) THEN
    ALTER TABLE usuarios
    ADD CONSTRAINT fk_usuarios_carrera
    FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- PASO 6: Asignar la carrera a tu usuario de comisión académica
-- REEMPLAZA 'ID_DE_LA_CARRERA' con el ID que obtuviste en el PASO 3
UPDATE usuarios 
SET carrera_id = ID_DE_LA_CARRERA,
    facultad = 'Facultad de Ciencias Técnicas'
WHERE id = 3;

-- Ejemplo: Si "Ingeniería en Sistemas" tiene ID = 10:
-- UPDATE usuarios SET carrera_id = 10, facultad = 'Facultad de Ciencias Técnicas' WHERE id = 3;

-- PASO 7: Verificar que todo está correcto
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

-- ===================================================================
-- PASO 8: Crear asignaturas para la carrera (OPCIONAL pero recomendado)
-- ===================================================================

-- REEMPLAZA 'ID_DE_LA_CARRERA' con el ID de tu carrera
INSERT INTO asignaturas (nombre, codigo, carrera_id, estado, created_at, updated_at)
VALUES 
  ('Programación I', 'PROG-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Programación II', 'PROG-102', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Matemáticas I', 'MAT-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Matemáticas II', 'MAT-102', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Base de Datos I', 'BD-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Base de Datos II', 'BD-102', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Estructuras de Datos', 'ED-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Algoritmos', 'ALG-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Redes de Computadoras', 'RC-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Sistemas Operativos', 'SO-101', ID_DE_LA_CARRERA, true, NOW(), NOW())
RETURNING id, nombre, codigo;

-- Ejemplo: Si tu carrera tiene ID = 10:
-- INSERT INTO asignaturas (nombre, codigo, carrera_id, estado, created_at, updated_at)
-- VALUES ('Programación I', 'PROG-101', 10, true, NOW(), NOW());

-- PASO 9: Verificar las asignaturas creadas
SELECT a.id, a.nombre, a.codigo, c.nombre as carrera
FROM asignaturas a
INNER JOIN carreras c ON a.carrera_id = c.id
WHERE a.carrera_id = ID_DE_LA_CARRERA
ORDER BY a.nombre;

-- ===================================================================
-- RESUMEN DE EJECUCIÓN
-- ===================================================================

/*
1. Ejecuta PASO 1 para ver facultades
2. Ejecuta PASO 2 para crear carrera (usa el ID de facultad correcto)
3. Ejecuta PASO 3 para ver el ID de la carrera creada
4. Ejecuta PASO 4 y 5 para agregar carrera_id a usuarios
5. Ejecuta PASO 6 usando el ID de la carrera del PASO 3
6. Ejecuta PASO 7 para verificar
7. Ejecuta PASO 8 para crear asignaturas (opcional)
8. Ejecuta PASO 9 para verificar asignaturas

Después:
- Reinicia el backend: cd my-node-backend && npm run dev
- Recarga el frontend: http://localhost:3000/dashboard/comision/asignaturas
*/
