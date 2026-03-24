-- ===================================================================
-- CREAR CARRERAS PARA LA FACULTAD DE CIENCIAS TÉCNICAS
-- ===================================================================

-- PASO 1: Ver las facultades disponibles
SELECT id, nombre FROM facultades ORDER BY nombre;

-- PASO 2: Crear carreras para Facultad de Ciencias Técnicas (ID = 8)
-- Ajusta el facultad_id según lo que viste en el PASO 1

INSERT INTO carreras (nombre, facultad_id, created_at, updated_at)
VALUES 
  -- Ingenierías en Computación
  ('Ingeniería en Sistemas', 8, NOW(), NOW()),
  ('Ingeniería en Software', 8, NOW(), NOW()),
  ('Ingeniería en Tecnologías de la Información', 8, NOW(), NOW()),
  ('Ingeniería en Redes y Telecomunicaciones', 8, NOW(), NOW()),
  ('Ingeniería en Computación', 8, NOW(), NOW()),
  
  -- Ingenierías Técnicas
  ('Ingeniería Civil', 8, NOW(), NOW()),
  ('Ingeniería Eléctrica', 8, NOW(), NOW()),
  ('Ingeniería Electrónica', 8, NOW(), NOW()),
  ('Ingeniería Mecánica', 8, NOW(), NOW()),
  ('Ingeniería Industrial', 8, NOW(), NOW()),
  
  -- Ingenierías Especializadas
  ('Ingeniería Ambiental', 8, NOW(), NOW()),
  ('Ingeniería en Automatización', 8, NOW(), NOW()),
  ('Ingeniería en Mecatrónica', 8, NOW(), NOW())
RETURNING id, nombre;

-- PASO 3: Ver todas las carreras creadas
SELECT c.id, c.nombre, f.nombre as facultad
FROM carreras c
INNER JOIN facultades f ON c.facultad_id = f.id
WHERE f.id = 8
ORDER BY c.nombre;

-- PASO 4: Agregar columna carrera_id a usuarios (si no existe)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS carrera_id INTEGER;

-- PASO 5: Agregar foreign key constraint
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

-- PASO 6: Asignar una carrera al usuario de comisión académica
-- REEMPLAZA 'ID_DE_LA_CARRERA' con el ID de la carrera que quieras asignar
UPDATE usuarios 
SET carrera_id = ID_DE_LA_CARRERA,
    facultad = 'Facultad de Ciencias Técnicas'
WHERE id = 3;

-- Ejemplo: Para asignar "Ingeniería en Sistemas" (suponiendo que tiene ID = 10)
-- UPDATE usuarios SET carrera_id = 10, facultad = 'Facultad de Ciencias Técnicas' WHERE id = 3;

-- PASO 7: Verificar la asignación
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
-- PASO 8: CREAR ASIGNATURAS PARA LA CARRERA SELECCIONADA
-- ===================================================================

-- Ejemplo: Asignaturas para Ingeniería en Sistemas (ID = 10)
-- REEMPLAZA 'ID_DE_LA_CARRERA' con el ID de tu carrera

INSERT INTO asignaturas (nombre, codigo, carrera_id, estado, created_at, updated_at)
VALUES 
  -- Primer Nivel
  ('Fundamentos de Programación', 'PROG-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Matemáticas I', 'MAT-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Introducción a la Computación', 'COMP-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Física I', 'FIS-101', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  
  -- Segundo Nivel
  ('Programación Orientada a Objetos', 'PROG-102', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Matemáticas II', 'MAT-102', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Estructuras de Datos', 'ED-201', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Física II', 'FIS-102', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  
  -- Tercer Nivel
  ('Base de Datos I', 'BD-201', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Algoritmos y Complejidad', 'ALG-301', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Arquitectura de Computadores', 'ARQ-301', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Matemáticas Discretas', 'MAT-301', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  
  -- Cuarto Nivel
  ('Base de Datos II', 'BD-202', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Sistemas Operativos', 'SO-401', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Redes de Computadoras I', 'RC-401', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Ingeniería de Software I', 'IS-401', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  
  -- Quinto Nivel
  ('Desarrollo Web', 'WEB-501', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Redes de Computadoras II', 'RC-402', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Ingeniería de Software II', 'IS-402', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Inteligencia Artificial', 'IA-501', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  
  -- Sexto Nivel
  ('Programación Móvil', 'MOV-601', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Seguridad Informática', 'SEG-601', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Computación en la Nube', 'CLOUD-601', ID_DE_LA_CARRERA, true, NOW(), NOW()),
  ('Gestión de Proyectos', 'GP-601', ID_DE_LA_CARRERA, true, NOW(), NOW())
RETURNING id, nombre, codigo;

-- PASO 9: Verificar las asignaturas creadas
SELECT 
  a.id, 
  a.nombre, 
  a.codigo, 
  c.nombre as carrera,
  f.nombre as facultad
FROM asignaturas a
INNER JOIN carreras c ON a.carrera_id = c.id
INNER JOIN facultades f ON c.facultad_id = f.id
WHERE a.carrera_id = ID_DE_LA_CARRERA
ORDER BY a.nombre;

-- ===================================================================
-- RESUMEN DE PASOS
-- ===================================================================

/*
ORDEN DE EJECUCIÓN:

1. Ejecuta PASO 1 → Ver las facultades (anota el ID de "Facultad de Ciencias Técnicas")

2. Ejecuta PASO 2 → Crear carreras (ajusta el facultad_id si es diferente de 8)

3. Ejecuta PASO 3 → Ver las carreras creadas (anota el ID de la carrera que quieras asignar)

4. Ejecuta PASO 4 y 5 → Agregar carrera_id a usuarios

5. Ejecuta PASO 6 → Asignar carrera al usuario (usa el ID del paso 3)

6. Ejecuta PASO 7 → Verificar que el usuario tiene la carrera asignada

7. Ejecuta PASO 8 → Crear asignaturas (usa el ID de carrera del paso 3)

8. Ejecuta PASO 9 → Verificar las asignaturas

9. Reinicia el backend: cd my-node-backend && npm run dev

10. Recarga: http://localhost:3000/dashboard/comision/asignaturas
*/

-- ===================================================================
-- EJEMPLO COMPLETO CON IDs ESPECÍFICOS
-- ===================================================================

-- Si tu facultad tiene ID = 8 y quieres asignar "Ingeniería en Sistemas" (ID = 10):

/*
-- Crear carreras
INSERT INTO carreras (nombre, facultad_id, created_at, updated_at)
VALUES ('Ingeniería en Sistemas', 8, NOW(), NOW()) RETURNING id, nombre;
-- Supongamos que devuelve ID = 10

-- Asignar al usuario
UPDATE usuarios SET carrera_id = 10, facultad = 'Facultad de Ciencias Técnicas' WHERE id = 3;

-- Crear asignaturas
INSERT INTO asignaturas (nombre, codigo, carrera_id, estado, created_at, updated_at)
VALUES 
  ('Programación I', 'PROG-101', 10, true, NOW(), NOW()),
  ('Matemáticas I', 'MAT-101', 10, true, NOW(), NOW());
*/
