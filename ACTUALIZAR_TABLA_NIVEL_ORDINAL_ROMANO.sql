-- Agrega columnas ordinal y romano a la tabla public.nivel
ALTER TABLE public.nivel
ADD COLUMN IF NOT EXISTS ordinal VARCHAR(30),
ADD COLUMN IF NOT EXISTS romano VARCHAR(20);

-- Normaliza datos existentes usando nombre/codigo cuando sea posible
UPDATE public.nivel
SET
  ordinal = COALESCE(
    NULLIF(ordinal, ''),
    CASE
      WHEN lower(nombre) LIKE '%primer%' OR lower(nombre) LIKE '%primero%' THEN 'primero'
      WHEN lower(nombre) LIKE '%segundo%' THEN 'segundo'
      WHEN lower(nombre) LIKE '%tercer%' OR lower(nombre) LIKE '%tercero%' THEN 'tercero'
      WHEN lower(nombre) LIKE '%cuarto%' THEN 'cuarto'
      WHEN lower(nombre) LIKE '%quinto%' THEN 'quinto'
      WHEN lower(nombre) LIKE '%sexto%' THEN 'sexto'
      WHEN lower(nombre) LIKE '%septimo%' THEN 'septimo'
      WHEN lower(nombre) LIKE '%octavo%' THEN 'octavo'
      WHEN lower(nombre) LIKE '%noveno%' THEN 'noveno'
      WHEN lower(nombre) LIKE '%decimo%' THEN 'decimo'
      WHEN codigo ~ '^[0-9]+$' THEN
        CASE codigo::int
          WHEN 1 THEN 'primero'
          WHEN 2 THEN 'segundo'
          WHEN 3 THEN 'tercero'
          WHEN 4 THEN 'cuarto'
          WHEN 5 THEN 'quinto'
          WHEN 6 THEN 'sexto'
          WHEN 7 THEN 'septimo'
          WHEN 8 THEN 'octavo'
          WHEN 9 THEN 'noveno'
          WHEN 10 THEN 'decimo'
          ELSE NULL
        END
      ELSE NULL
    END
  ),
  romano = COALESCE(
    NULLIF(romano, ''),
    CASE
      WHEN lower(nombre) LIKE '%primer%' OR lower(nombre) LIKE '%primero%' THEN 'I'
      WHEN lower(nombre) LIKE '%segundo%' THEN 'II'
      WHEN lower(nombre) LIKE '%tercer%' OR lower(nombre) LIKE '%tercero%' THEN 'III'
      WHEN lower(nombre) LIKE '%cuarto%' THEN 'IV'
      WHEN lower(nombre) LIKE '%quinto%' THEN 'V'
      WHEN lower(nombre) LIKE '%sexto%' THEN 'VI'
      WHEN lower(nombre) LIKE '%septimo%' THEN 'VII'
      WHEN lower(nombre) LIKE '%octavo%' THEN 'VIII'
      WHEN lower(nombre) LIKE '%noveno%' THEN 'IX'
      WHEN lower(nombre) LIKE '%decimo%' THEN 'X'
      WHEN codigo ~ '^[0-9]+$' THEN
        CASE codigo::int
          WHEN 1 THEN 'I'
          WHEN 2 THEN 'II'
          WHEN 3 THEN 'III'
          WHEN 4 THEN 'IV'
          WHEN 5 THEN 'V'
          WHEN 6 THEN 'VI'
          WHEN 7 THEN 'VII'
          WHEN 8 THEN 'VIII'
          WHEN 9 THEN 'IX'
          WHEN 10 THEN 'X'
          ELSE NULL
        END
      ELSE NULL
    END
  );

-- Verificacion rapida
SELECT id, codigo, nombre, ordinal, romano, estado
FROM public.nivel
ORDER BY id;
