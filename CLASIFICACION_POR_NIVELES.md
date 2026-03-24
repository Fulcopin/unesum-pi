# 🎓 CLASIFICACIÓN POR NIVELES - IMPLEMENTADO

**Fecha:** 31 de enero de 2026  
**Estado:** ✅ COMPLETADO

---

## 🎯 QUÉ SE IMPLEMENTÓ

### Agrupación Automática por Niveles

Las asignaturas ahora se **agrupan y clasifican automáticamente por nivel académico**:

- ✅ **Nivel I** → Todas las asignaturas de primer nivel
- ✅ **Nivel II** → Todas las asignaturas de segundo nivel
- ✅ **Nivel III, IV, V...** → Y así sucesivamente
- ✅ **Sin nivel** → Asignaturas que no tienen nivel asignado

---

## 📊 INTERFAZ MEJORADA

### Antes (Lista Simple):
```
Asignaturas de Ingeniería
├─ Matemáticas I (Nivel I)
├─ Programación II (Nivel II)
├─ Física I (Nivel I)
├─ Base de Datos (Nivel II)
```

### Ahora (Agrupadas por Nivel):
```
┌─ Nivel I ──────────────────┐
│ • Matemáticas I            │
│ • Física I                 │
│ • Química General          │
└────────────────────────────┘

┌─ Nivel II ─────────────────┐
│ • Programación II          │
│ • Base de Datos            │
│ • Cálculo Diferencial      │
└────────────────────────────┘

┌─ Nivel III ────────────────┐
│ • Ingeniería de Software   │
│ • Redes de Computadoras    │
└────────────────────────────┘
```

---

## 🔧 CAMBIOS TÉCNICOS

### 1. Nueva Función `agruparPorNivel`

**Ubicación:** `app/dashboard/comision/asignaturas/page.tsx`

**Funcionalidad:**
- Recibe array de asignaturas
- Las agrupa por el campo `nivel`
- Ordena los niveles de forma inteligente:
  - Niveles romanos: I, II, III, IV, V, VI, VII, VIII, IX, X
  - Niveles numéricos: 1, 2, 3, 4, 5...
  - "Sin nivel" siempre al final

**Código:**
```typescript
const agruparPorNivel = (asignaturas: Asignatura[]) => {
  const grupos: { [key: string]: Asignatura[] } = {};
  
  // Agrupar por nivel
  asignaturas.forEach(asignatura => {
    const nivelKey = asignatura.nivel || 'Sin nivel';
    if (!grupos[nivelKey]) {
      grupos[nivelKey] = [];
    }
    grupos[nivelKey].push(asignatura);
  });
  
  // Ordenar niveles (I, II, III...)
  const nivelesOrdenados = Object.keys(grupos).sort(...);
  
  return nivelesOrdenados.map(nivel => ({
    nivel,
    asignaturas: grupos[nivel]
  }));
};
```

### 2. Interfaz Reorganizada

Cada nivel ahora tiene su propia tarjeta (Card) con:
- **Header con gradiente** azul-índigo
- **Icono** GraduationCap
- **Contador** de asignaturas en ese nivel
- **Lista de asignaturas** dentro del nivel

### 3. Debug Automático

Se agregó `console.log` para verificar qué niveles llegan del backend:

```typescript
console.log('🔍 DEBUG - Estructura recibida:', {
  facultad: data.data.facultad?.nombre,
  totalAsignaturas: data.data.carreras?.[0]?.asignaturas?.length,
  niveles: [...new Set(data.data.carreras?.[0]?.asignaturas?.map(a => a.nivel))]
});
```

Abre la consola del navegador (F12) para ver esta información.

---

## 🔍 DIAGNÓSTICO: "No me encuentra nada en niveles"

### Posibles Causas:

#### 1. **Niveles NULL en Base de Datos**

Si en la BD las asignaturas tienen `nivel_id = NULL`:

**Solución:**
```sql
-- Verificar asignaturas sin nivel
SELECT id, nombre, codigo, nivel_id 
FROM asignaturas 
WHERE carrera_id = TU_CARRERA_ID;

-- Actualizar asignaturas sin nivel
UPDATE asignaturas 
SET nivel_id = 1  -- ID del nivel correspondiente
WHERE codigo LIKE 'MAT101%';  -- Ejemplo para Matemáticas I
```

#### 2. **Relación no Configurada**

Verificar que el backend incluya el nivel:

**Archivo:** `my-node-backend/src/controllers/comisionAcademicaController.js`

```javascript
{
  model: db.Asignatura,
  as: 'asignaturas',
  required: false,
  include: [
    {
      model: db.Nivel,  // ✅ DEBE ESTAR ESTO
      as: 'nivel',
      attributes: ['id', 'nombre']
    }
  ]
}
```

#### 3. **Tabla `niveles` Vacía**

Verificar que existan niveles en la BD:

```sql
-- Ver niveles existentes
SELECT * FROM niveles;

-- Si está vacía, crear niveles
INSERT INTO niveles (nombre, descripcion) VALUES
('Nivel I', 'Primer nivel'),
('Nivel II', 'Segundo nivel'),
('Nivel III', 'Tercer nivel'),
('Nivel IV', 'Cuarto nivel'),
('Nivel V', 'Quinto nivel');
```

---

## 🧪 CÓMO PROBAR

### 1. Iniciar Servidores

```powershell
# Terminal 1 - Backend
cd my-node-backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

### 2. Acceder a la Página

```
http://localhost:3000/dashboard/comision/asignaturas
```

### 3. Verificar en Consola (F12)

Busca el log:
```
🔍 DEBUG - Estructura recibida: {
  facultad: "Facultad de Ingeniería",
  totalAsignaturas: 15,
  niveles: ["Nivel I", "Nivel II", "Nivel III", "Sin nivel"]
}
```

**Si ves `niveles: [null]` o `niveles: ["Sin nivel"]`:**
- El problema está en la **base de datos**
- Las asignaturas no tienen `nivel_id` asignado

### 4. Verificar Visualmente

Deberías ver tarjetas separadas:

```
┌─────────────────────────────────┐
│ 🎓 Nivel I                      │
│ 3 asignaturas                   │
├─────────────────────────────────┤
│ ☐ Matemáticas I                 │
│ ☐ Física I                      │
│ ☐ Programación I                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🎓 Nivel II                     │
│ 2 asignaturas                   │
├─────────────────────────────────┤
│ ☐ Cálculo Diferencial           │
│ ☐ Base de Datos                 │
└─────────────────────────────────┘
```

---

## 🔧 SOLUCIÓN RÁPIDA

### Si no aparecen niveles:

#### Opción 1: Verificar BD (PostgreSQL)

```sql
-- Ver asignaturas con sus niveles
SELECT 
  a.id,
  a.nombre AS asignatura,
  a.codigo,
  a.nivel_id,
  n.nombre AS nivel
FROM asignaturas a
LEFT JOIN niveles n ON a.nivel_id = n.id
WHERE a.carrera_id = TU_CARRERA_ID
ORDER BY n.nombre;
```

**Si `nivel` es NULL** → Asignar niveles:

```sql
-- Ejemplo: Asignar materias de primer año a Nivel I
UPDATE asignaturas 
SET nivel_id = (SELECT id FROM niveles WHERE nombre = 'Nivel I' LIMIT 1)
WHERE codigo LIKE '%101' OR codigo LIKE '%1%';

-- Ejemplo: Asignar materias de segundo año a Nivel II
UPDATE asignaturas 
SET nivel_id = (SELECT id FROM niveles WHERE nombre = 'Nivel II' LIMIT 1)
WHERE codigo LIKE '%201' OR codigo LIKE '%2%';
```

#### Opción 2: Crear Niveles si no Existen

```sql
-- Verificar si existen niveles
SELECT COUNT(*) FROM niveles;

-- Si es 0, crear niveles:
INSERT INTO niveles (nombre, descripcion, estado) VALUES
('Nivel I', 'Primer nivel académico', 'activo'),
('Nivel II', 'Segundo nivel académico', 'activo'),
('Nivel III', 'Tercer nivel académico', 'activo'),
('Nivel IV', 'Cuarto nivel académico', 'activo'),
('Nivel V', 'Quinto nivel académico', 'activo'),
('Nivel VI', 'Sexto nivel académico', 'activo'),
('Nivel VII', 'Séptimo nivel académico', 'activo'),
('Nivel VIII', 'Octavo nivel académico', 'activo'),
('Nivel IX', 'Noveno nivel académico', 'activo'),
('Nivel X', 'Décimo nivel académico', 'activo');
```

---

## ✅ CHECKLIST

- [x] ✅ Función `agruparPorNivel` implementada
- [x] ✅ Ordenamiento inteligente (I, II, III...)
- [x] ✅ Interfaz con tarjetas por nivel
- [x] ✅ Debug console.log agregado
- [ ] ⏳ Verificar datos en base de datos
- [ ] ⏳ Asignar `nivel_id` a asignaturas sin nivel
- [ ] ⏳ Probar en navegador

---

## 📞 SIGUIENTE PASO

**EJECUTA ESTO AHORA:**

```powershell
# 1. Iniciar backend
cd my-node-backend
npm run dev
```

Luego en **OTRA TERMINAL**:

```powershell
# 2. Iniciar frontend
npm run dev
```

Luego:
1. Abre http://localhost:3000/dashboard/comision/asignaturas
2. Abre la consola (F12)
3. Busca el log de debug
4. Copia aquí los niveles que aparecen

**Y te ayudo a resolver si hay algún problema en la BD** 🚀
