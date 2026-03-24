# 📊 DÓNDE SE GUARDA EL CONTENIDO DEL FORMULARIO

## 🎯 Resumen Rápido

Cuando el docente llena y guarda el formulario del Programa Analítico, el contenido se guarda en **3 TABLAS**:

1. **`contenido_programa`** - Registro principal de cada sección
2. **`filas_tabla_programa`** - Filas de las tablas (cuando es tipo tabla)
3. **`valores_campo_programa`** - Valores individuales de cada celda

---

## 📋 EJEMPLO PRÁCTICO

### Formulario que ve el docente:

```
┌─────────────────────────────────────────────────────┐
│ 📝 DATOS GENERALES                                  │
├─────────────────────────────────────────────────────┤
│ Carrera:         [Ingeniería en Sistemas          ] │
│ Nivel:           [3er Nivel                       ] │
│ Asignatura:      [Programación Web                ] │
│ Código:          [PROG-301                        ] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📊 UNIDADES TEMÁTICAS                               │
├──────┬─────────────────────┬────────────────────────┤
│ Fila │ Unidad              │ Tema          │ Horas  │
├──────┼─────────────────────┼───────────────┼────────┤
│  1   │ [Unidad 1         ] │ [HTML y CSS ] │ [10  ] │
│  2   │ [Unidad 2         ] │ [JavaScript ] │ [15  ] │
└──────┴─────────────────────┴───────────────┴────────┘

┌─────────────────────────────────────────────────────┐
│ 📄 METODOLOGÍA                                      │
├─────────────────────────────────────────────────────┤
│ [La asignatura se desarrollará mediante...        ] │
│ [                                                  ] │
│ [                                                  ] │
└─────────────────────────────────────────────────────┘
```

---

## 💾 CÓMO SE GUARDA EN LA BASE DE DATOS

### 1️⃣ Tabla: `contenido_programa`
**Propósito:** Registro principal de cada sección llenada por el docente

```sql
┌────┬─────────────┬────────────┬─────────────┬──────────────────────────────┐
│ id │ programa_id │ seccion_id │ profesor_id │ contenido_texto              │
├────┼─────────────┼────────────┼─────────────┼──────────────────────────────┤
│ 1  │ 5           │ 1          │ 10          │ NULL (es tabla)              │
│ 2  │ 5           │ 2          │ 10          │ NULL (es tabla)              │
│ 3  │ 5           │ 3          │ 10          │ "La asignatura se..."        │
└────┴─────────────┴────────────┴─────────────┴──────────────────────────────┘
```

**Explicación:**
- **Fila 1:** Sección "Datos Generales" (tipo tabla) → `contenido_texto` es NULL
- **Fila 2:** Sección "Unidades Temáticas" (tipo tabla) → `contenido_texto` es NULL
- **Fila 3:** Sección "Metodología" (tipo texto_largo) → `contenido_texto` tiene el texto completo

---

### 2️⃣ Tabla: `filas_tabla_programa`
**Propósito:** Cada fila de las tablas (solo para secciones tipo "tabla")

```sql
┌────┬──────────────┬───────┐
│ id │ contenido_id │ orden │
├────┼──────────────┼───────┤
│ 1  │ 1            │ 1     │  ← Datos Generales: fila 1 (única fila)
│ 2  │ 2            │ 1     │  ← Unidades Temáticas: fila 1
│ 3  │ 2            │ 2     │  ← Unidades Temáticas: fila 2
└────┴──────────────┴───────┘
```

**Explicación:**
- `contenido_id = 1` → Apunta a la sección "Datos Generales" en `contenido_programa`
- `contenido_id = 2` → Apunta a la sección "Unidades Temáticas" en `contenido_programa`
- `orden` → Número de fila (1, 2, 3...)

---

### 3️⃣ Tabla: `valores_campo_programa`
**Propósito:** Valores individuales de cada celda de las tablas

```sql
┌────┬─────────┬──────────┬─────────────────────────┐
│ id │ fila_id │ campo_id │ valor                   │
├────┼─────────┼──────────┼─────────────────────────┤
│ 1  │ 1       │ 1        │ "Ingeniería en Sistemas"│  ← Datos Generales - Carrera
│ 2  │ 1       │ 2        │ "3er Nivel"             │  ← Datos Generales - Nivel
│ 3  │ 1       │ 3        │ "Programación Web"      │  ← Datos Generales - Asignatura
│ 4  │ 1       │ 4        │ "PROG-301"              │  ← Datos Generales - Código
│ 5  │ 2       │ 5        │ "Unidad 1"              │  ← Unidades - Fila 1 - Unidad
│ 6  │ 2       │ 6        │ "HTML y CSS"            │  ← Unidades - Fila 1 - Tema
│ 7  │ 2       │ 7        │ "10"                    │  ← Unidades - Fila 1 - Horas
│ 8  │ 3       │ 5        │ "Unidad 2"              │  ← Unidades - Fila 2 - Unidad
│ 9  │ 3       │ 6        │ "JavaScript"            │  ← Unidades - Fila 2 - Tema
│ 10 │ 3       │ 7        │ "15"                    │  ← Unidades - Fila 2 - Horas
└────┴─────────┴──────────┴─────────────────────────┘
```

**Explicación:**
- `fila_id` → Apunta a una fila específica en `filas_tabla_programa`
- `campo_id` → Apunta al campo/columna en `campos_seccion` (ej: campo_id=1 es "Carrera")
- `valor` → El texto ingresado por el docente

---

## 🔗 RELACIONES ENTRE TABLAS

```
programas_analiticos (id=5, nombre="Programa Analítico de Prog Web")
    ↓
contenido_programa (id=1, programa_id=5, seccion_id=1, profesor_id=10)
    ↓
filas_tabla_programa (id=1, contenido_id=1, orden=1)
    ↓
valores_campo_programa:
    - (id=1, fila_id=1, campo_id=1, valor="Ingeniería en Sistemas")
    - (id=2, fila_id=1, campo_id=2, valor="3er Nivel")
    - (id=3, fila_id=1, campo_id=3, valor="Programación Web")
    - (id=4, fila_id=1, campo_id=4, valor="PROG-301")
```

---

## 🔍 CÓMO VERIFICAR EN LA BASE DE DATOS

### Opción 1: Ejecutar queries en pgAdmin o cliente PostgreSQL

Abre el archivo: `my-node-backend/scripts/verificar-contenido-guardado.sql`

### Opción 2: Consultas rápidas

```sql
-- Ver cuántos contenidos hay guardados
SELECT COUNT(*) FROM contenido_programa;

-- Ver cuántas filas de tablas hay
SELECT COUNT(*) FROM filas_tabla_programa;

-- Ver cuántos valores hay guardados
SELECT COUNT(*) FROM valores_campo_programa;

-- Ver último contenido guardado (simple)
SELECT * FROM contenido_programa ORDER BY updated_at DESC LIMIT 5;
```

### Opción 3: Ver contenido completo de un programa

```sql
-- Ver Datos Generales del programa ID 1
SELECT 
  cs.etiqueta as campo,
  vcp.valor
FROM valores_campo_programa vcp
INNER JOIN filas_tabla_programa ftp ON vcp.fila_id = ftp.id
INNER JOIN contenido_programa cp ON ftp.contenido_id = cp.id
INNER JOIN campos_seccion cs ON vcp.campo_id = cs.id
WHERE cp.programa_id = 1  -- Cambiar por el ID del programa
  AND ftp.orden = 1       -- Primera fila (Datos Generales)
ORDER BY cs.orden;
```

---

## 📍 UBICACIÓN EN EL CÓDIGO

**Archivo:** `my-node-backend/src/controllers/programaAnaliticoController.js`

**Función:** `guardarContenidoDocente()` - Líneas 1043-1211

### Flujo del código:

```javascript
exports.guardarContenidoDocente = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { contenido } = req.body;
    
    // Recorrer cada sección del contenido
    for (const [seccionId, datos] of Object.entries(contenido)) {
      
      if (datos.tipo === 'texto_largo') {
        // 1. Guardar en contenido_programa.contenido_texto
        await ContenidoPrograma.findOrCreate({...});
        
      } else if (datos.tipo === 'tabla') {
        // 2. Crear registro en contenido_programa
        const contenidoExistente = await ContenidoPrograma.findOrCreate({...});
        
        // 3. Eliminar filas antiguas
        await FilaTablaPrograma.destroy({...});
        
        // 4. Guardar nuevas filas
        for (let i = 0; i < datos.filas.length; i++) {
          // Crear fila en filas_tabla_programa
          const nuevaFila = await FilaTablaPrograma.create({...});
          
          // 5. Guardar valores de cada campo
          for (const [campoId, valor] of Object.entries(fila.valores)) {
            // Guardar en valores_campo_programa
            await ValorCampoPrograma.create({...});
          }
        }
      }
    }
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
  }
};
```

---

## 🎨 DIAGRAMA VISUAL COMPLETO

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Formulario)                        │
├─────────────────────────────────────────────────────────────────┤
│  Datos Generales:                                               │
│    Carrera: [Ingeniería en Sistemas]                           │
│    Nivel: [3er Nivel]                                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼ POST /api/programa-analitico/:id/guardar-contenido
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Controller)                         │
├─────────────────────────────────────────────────────────────────┤
│  programaAnaliticoController.guardarContenidoDocente()         │
│                                                                 │
│  1. Crea registro en contenido_programa                        │
│  2. Crea fila en filas_tabla_programa                          │
│  3. Crea valores en valores_campo_programa                     │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  contenido_programa                                             │
│  ┌────┬─────────────┬────────────┬─────────────┐              │
│  │ 1  │ 5           │ 1          │ 10          │              │
│  └────┴─────────────┴────────────┴─────────────┘              │
│         │                                                       │
│         └──> filas_tabla_programa                              │
│              ┌────┬──────────────┬───────┐                     │
│              │ 1  │ 1            │ 1     │                     │
│              └────┴──────────────┴───────┘                     │
│                     │                                           │
│                     └──> valores_campo_programa                │
│                          ┌────┬─────────┬──────────┬─────────┐│
│                          │ 1  │ 1       │ 1        │ "Ing..."││
│                          │ 2  │ 1       │ 2        │ "3er..."││
│                          └────┴─────────┴──────────┴─────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ RESUMEN

- **Texto largo (ej: Metodología):** Se guarda SOLO en `contenido_programa.contenido_texto`
- **Tablas (ej: Datos Generales, Unidades):** Se guarda en las 3 tablas relacionadas
- **Cada celda de una tabla:** Un registro en `valores_campo_programa`
- **Transaction:** Todo se guarda en una transacción, si falla algo, se hace rollback completo

---

## 🔧 PARA VERIFICAR SI SE GUARDÓ:

1. Abre pgAdmin o tu cliente de PostgreSQL
2. Conecta a la base de datos de Neon
3. Ejecuta las queries del archivo `verificar-contenido-guardado.sql`
4. O ejecuta esta query simple:

```sql
SELECT COUNT(*) as total FROM valores_campo_programa;
```

Si retorna > 0, significa que hay contenido guardado.
