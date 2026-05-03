-- =====================================================================
-- MIGRACIÓN: Tablas M2M para Profesor ↔ Niveles y Profesor ↔ Paralelos
-- Ejecutar en pgAdmin o psql sobre la base de datos del sistema
-- =====================================================================

-- ── 1. TABLA profesor_niveles ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profesor_niveles (
    id          SERIAL PRIMARY KEY,
    profesor_id INTEGER NOT NULL,
    nivel_id    BIGINT  NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT profesor_niveles_profesor_fkey
        FOREIGN KEY (profesor_id) REFERENCES public.profesores(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT profesor_niveles_nivel_fkey
        FOREIGN KEY (nivel_id)    REFERENCES public.nivel(id)      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT profesor_niveles_unique
        UNIQUE (profesor_id, nivel_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_niv_profesor ON public.profesor_niveles (profesor_id);
CREATE INDEX IF NOT EXISTS idx_prof_niv_nivel    ON public.profesor_niveles (nivel_id);

-- ── 2. TABLA profesor_paralelos ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profesor_paralelos (
    id          SERIAL PRIMARY KEY,
    profesor_id INTEGER NOT NULL,
    paralelo_id BIGINT  NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT profesor_paralelos_profesor_fkey
        FOREIGN KEY (profesor_id)  REFERENCES public.profesores(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT profesor_paralelos_paralelo_fkey
        FOREIGN KEY (paralelo_id)  REFERENCES public.paralelo(id)   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT profesor_paralelos_unique
        UNIQUE (profesor_id, paralelo_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_par_profesor ON public.profesor_paralelos (profesor_id);
CREATE INDEX IF NOT EXISTS idx_prof_par_paralelo ON public.profesor_paralelos (paralelo_id);

-- ── 3. Migrar datos existentes (nivel_id / paralelo_id actuales) ──
-- Copia los valores actuales de nivel_id y paralelo_id a las nuevas tablas
-- para no perder información ya cargada.

INSERT INTO public.profesor_niveles (profesor_id, nivel_id)
SELECT id, nivel_id
FROM public.profesores
WHERE nivel_id IS NOT NULL
ON CONFLICT (profesor_id, nivel_id) DO NOTHING;

INSERT INTO public.profesor_paralelos (profesor_id, paralelo_id)
SELECT id, paralelo_id
FROM public.profesores
WHERE paralelo_id IS NOT NULL
ON CONFLICT (profesor_id, paralelo_id) DO NOTHING;

-- ── 4. VERIFICACIÓN ───────────────────────────────────────────────
SELECT 'profesor_niveles'  AS tabla, COUNT(*) AS registros FROM public.profesor_niveles
UNION ALL
SELECT 'profesor_paralelos', COUNT(*) FROM public.profesor_paralelos;
