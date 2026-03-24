-- ============================================
-- CONFIGURACIÓN DE UNA SOLA CARRERA PARA COMISIÓN ACADÉMICA
-- ============================================
-- Ejecuta estos pasos en orden en el SQL Editor de Neon

-- PASO 1: Verificar facultades existentes y obtener el ID
-- --------------------------------------------------------
SELECT id, nombre FROM facultades ORDER BY nombre;
-- Anota el ID de "Facultad de Ciencias Técnicas" (probablemente es 8)


-- PASO 2: Crear solo UNA carrera (Ingeniería Eléctrica y Potencia)
-- -----------------------------------------------------------------
INSERT INTO carreras (nombre, facultad_id)
VALUES ('Ingeniería Eléctrica y Potencia', 8);
-- Cambia el 8 por el ID real de tu facultad si es diferente


-- PASO 3: Verificar que la carrera se creó correctamente y obtener su ID
-- -----------------------------------------------------------------------
SELECT c.id, c.nombre, f.nombre as facultad 
FROM carreras c
JOIN facultades f ON c.facultad_id = f.id
WHERE c.nombre = 'Ingeniería Eléctrica y Potencia';
-- Anota el ID de la carrera (por ejemplo: 6)


-- PASO 4: Verificar la columna carrera_id en usuarios
-- ---------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'carrera_id';
-- Si NO aparece nada, ejecuta el PASO 4b


-- PASO 4b (SOLO si carrera_id no existe): Agregar columna carrera_id
-- -------------------------------------------------------------------
-- ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS carrera_id INTEGER;
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_carrera_id_fkey 
--   FOREIGN KEY (carrera_id) REFERENCES carreras(id) 
--   ON UPDATE CASCADE ON DELETE SET NULL;
-- (Ya lo tienes, así que NO ejecutes esto)


-- PASO 5: Asignar la carrera al usuario de comisión académica
-- -----------------------------------------------------------
-- Primero verifica qué usuario es (id = 3 según tu contexto)
SELECT id, nombres, apellidos, correo_electronico, rol, facultad, carrera, carrera_id
FROM usuarios
WHERE id = 3;

-- Luego asigna la carrera (reemplaza 6 con el ID real de la carrera del PASO 3)
UPDATE usuarios 
SET carrera_id = 6  -- ⚠️ REEMPLAZA 6 con el ID de la carrera del PASO 3
WHERE id = 3;


-- PASO 6: Verificar la asignación
-- -------------------------------
SELECT u.id, u.nombres, u.apellidos, u.rol, u.facultad, u.carrera, 
       u.carrera_id, c.nombre as carrera_asignada
FROM usuarios u
LEFT JOIN carreras c ON u.carrera_id = c.id
WHERE u.id = 3;
-- Deberías ver carrera_id = 6 y carrera_asignada = "Ingeniería Eléctrica y Potencia"


-- PASO 7: (OPCIONAL) Crear algunas asignaturas de ejemplo para esa carrera
-- -------------------------------------------------------------------------
-- Primero obtén el ID de un nivel existente
SELECT id, nombre FROM niveles ORDER BY nombre LIMIT 5;

-- Luego crea asignaturas (reemplaza 6 con el ID de tu carrera y 1 con un nivel_id válido)
INSERT INTO asignaturas (nombre, codigo, carrera_id, nivel_id, estado)
VALUES 
('Circuitos Eléctricos I', 'ELE-101', 6, 1, true),
('Máquinas Eléctricas', 'ELE-201', 6, 2, true),
('Sistemas de Potencia', 'ELE-301', 6, 3, true),
('Protecciones Eléctricas', 'ELE-401', 6, 4, true),
('Subestaciones Eléctricas', 'ELE-501', 6, 5, true);


-- PASO 8: Verificar las asignaturas creadas
-- -----------------------------------------
SELECT a.id, a.codigo, a.nombre, c.nombre as carrera, n.nombre as nivel
FROM asignaturas a
JOIN carreras c ON a.carrera_id = c.id
LEFT JOIN niveles n ON a.nivel_id = n.id
WHERE c.nombre = 'Ingeniería Eléctrica y Potencia'
ORDER BY a.codigo;


-- ============================================
-- RESUMEN DE IDs IMPORTANTES (anótalos aquí después de ejecutar)
-- ============================================
-- Facultad ID: _______
-- Carrera ID: _______
-- Usuario ID: 3
-- Nivel IDs: _______ (lista de niveles disponibles)


-- ============================================
-- VERIFICACIÓN FINAL COMPLETA
-- ============================================
SELECT 
  u.id as usuario_id,
  u.nombres || ' ' || u.apellidos as usuario,
  u.rol,
  f.nombre as facultad,
  c.nombre as carrera_asignada,
  COUNT(a.id) as total_asignaturas
FROM usuarios u
LEFT JOIN carreras c ON u.carrera_id = c.id
LEFT JOIN facultades f ON c.facultad_id = f.id
LEFT JOIN asignaturas a ON a.carrera_id = c.id
WHERE u.id = 3
GROUP BY u.id, u.nombres, u.apellidos, u.rol, f.nombre, c.nombre;

-- Deberías ver:
-- usuario_id = 3
-- carrera_asignada = "Ingeniería Eléctrica y Potencia"
-- total_asignaturas = 5 (si ejecutaste el PASO 7)
