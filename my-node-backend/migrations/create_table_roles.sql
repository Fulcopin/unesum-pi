-- =============================================================
-- Migración: tabla `roles` (catálogo de roles del sistema)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(50)  NOT NULL UNIQUE,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_codigo ON public.roles (codigo);
CREATE INDEX IF NOT EXISTS idx_roles_estado ON public.roles (estado);

-- Roles por defecto
INSERT INTO public.roles (codigo, nombre, descripcion) VALUES
  ('administrador',      'Administrador',       'Acceso total al sistema'),
  ('comision_academica', 'Comisión Académica',  'Gestión de syllabus y programas analíticos'),
  ('docente',            'Docente',             'Acceso a módulos de docente'),
  ('direccion',          'Dirección',           'Dirección de carrera'),
  ('decano',             'Decano',              'Decano de facultad'),
  ('subdecano',          'Subdecano',           'Subdecano de facultad'),
  ('estudiante',         'Estudiante',          'Acceso de estudiante')
ON CONFLICT (codigo) DO NOTHING;
