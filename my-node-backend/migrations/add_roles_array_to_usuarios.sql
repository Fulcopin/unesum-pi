-- =============================================================
-- Migración: agregar columna `roles` (JSONB array) a `usuarios`
-- y poblarla con el rol actual de cada usuario.
-- Fecha: 2026-04-26
-- =============================================================

-- 1) Agregar columna roles si no existe
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb NOT NULL;

-- 2) Poblar el array `roles` con [rol] para cada usuario que aún no tenga roles cargados
UPDATE public.usuarios
SET roles = jsonb_build_array(rol)
WHERE (roles IS NULL OR jsonb_typeof(roles) <> 'array' OR jsonb_array_length(roles) = 0)
  AND rol IS NOT NULL
  AND rol <> '';

-- 3) Índice GIN para búsquedas rápidas por rol dentro del array
CREATE INDEX IF NOT EXISTS idx_usuarios_roles_gin
  ON public.usuarios USING GIN (roles);

-- =============================================================
-- Verificación rápida (opcional):
--   SELECT id, nombres, apellidos, rol, roles FROM public.usuarios LIMIT 20;
-- =============================================================
