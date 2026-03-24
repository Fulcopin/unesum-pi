# 🚀 GUÍA RÁPIDA: Sistema de Validación de Títulos

## 📝 Resumen en 3 Pasos

### 1️⃣ ADMIN SUBE PLANTILLA (Una vez por periodo)
```
Admin sube syllabus_plantilla.docx para periodo "2025-1"
    ↓
Sistema extrae títulos en negrita automáticamente
    ↓
Se guardan como "títulos requeridos" para ese periodo
```

### 2️⃣ PROFESOR SUBE SYLLABUS (Cada vez que sube)
```
Profesor sube mi_syllabus.docx para periodo "2025-1"
    ↓
Sistema extrae títulos del documento del profesor
    ↓
Sistema compara con títulos requeridos de la plantilla
    ↓
✅ Si tiene todos → Se guarda
❌ Si faltan algunos → Se rechaza con detalle
```

### 3️⃣ PROFESOR CORRIGE Y VUELVE A SUBIR
```
Profesor ve mensaje: "Faltan los títulos: HORARIO DE CLASES, VISADO"
    ↓
Profesor agrega esos títulos en negrita en su documento
    ↓
Vuelve a subir → Ahora pasa la validación ✅
```

---

## 🎯 Ejemplo Visual

### PLANTILLA DEL ADMIN (syllabus_plantilla.docx)

```
┌─────────────────────────────────────┐
│ **DATOS GENERALES**                 │ ← En negrita
│ Código: _________                   │
│                                     │
│ **HORARIO DE CLASES**               │ ← En negrita
│ Lunes: 8:00 - 10:00                 │
│                                     │
│ **VISADO**                          │ ← En negrita
│ Firma: __________                   │
└─────────────────────────────────────┘
```

**Títulos extraídos automáticamente:**
1. DATOS GENERALES
2. HORARIO DE CLASES
3. VISADO

---

### SYLLABUS DEL PROFESOR (mi_syllabus.docx)

#### ✅ CASO VÁLIDO:

```
┌─────────────────────────────────────┐
│ **DATOS GENERALES**                 │ ✓
│ Código: PROG-101                    │
│                                     │
│ **HORARIO DE CLASES**               │ ✓
│ Martes: 10:00 - 12:00              │
│                                     │
│ **VISADO**                          │ ✓
│ Firma: Juan Pérez                   │
└─────────────────────────────────────┘
```

**Resultado:** ✅ **APROBADO** - Tiene los 3 títulos requeridos

---

#### ❌ CASO INVÁLIDO:

```
┌─────────────────────────────────────┐
│ **DATOS GENERALES**                 │ ✓
│ Código: PROG-101                    │
│                                     │
│ Horario de Clases                   │ ✗ No está en negrita
│ Martes: 10:00 - 12:00              │
│                                     │
│ (No tiene VISADO)                   │ ✗ Falta completamente
└─────────────────────────────────────┘
```

**Resultado:** ❌ **RECHAZADO**

**Mensaje de Error:**
```
❌ El syllabus no cumple con la estructura requerida.

📊 Coincidencia: 33.3%
📋 Títulos requeridos: 3
✅ Títulos encontrados: 1
❌ Títulos faltantes: 2

⚠️ Títulos que faltan en su documento:
   1. HORARIO DE CLASES
   2. VISADO

💡 Por favor, asegúrese de incluir todos los títulos 
   requeridos en su documento (en negrita).
```

---

## 🔧 Comandos Rápidos

### 1. Ejecutar Migración en Neon
```sql
-- Copiar y pegar en Neon SQL Editor:
ALTER TABLE syllabi ADD COLUMN IF NOT EXISTS es_plantilla_referencia BOOLEAN DEFAULT false;
ALTER TABLE syllabi ADD COLUMN IF NOT EXISTS titulos_extraidos JSONB;
CREATE INDEX IF NOT EXISTS idx_syllabi_plantilla_periodo ON syllabi (periodo, es_plantilla_referencia);
```

### 2. Reiniciar Backend
```powershell
cd my-node-backend
npm run dev
```

### 3. Probar con Postman

**Admin sube plantilla:**
```
POST http://localhost:4000/api/syllabi/plantilla/upload
Authorization: Bearer <token_admin>
Content-Type: multipart/form-data

Body:
- file: [syllabus_plantilla.docx]
- nombre: "Plantilla 2025-1"
- periodo: "2025-1"
```

**Profesor sube syllabus:**
```
POST http://localhost:4000/api/syllabi/upload-validado
Authorization: Bearer <token_profesor>
Content-Type: multipart/form-data

Body:
- file: [mi_syllabus.docx]
- nombre: "Syllabus Programación"
- periodo: "2025-1"
- materias: "Programación 1"
```

---

## ❓ FAQ

### ¿Qué pasa si el admin no sube plantilla para un periodo?
**R:** Los profesores NO podrán subir syllabus para ese periodo. Recibirán el error:
```
"No existe una plantilla de referencia para el periodo 2025-1. Contacte al administrador."
```

### ¿Los títulos deben ser exactamente iguales?
**R:** NO. El sistema normaliza:
- "Horario de Clases" = "HORARIO DE CLASES" = "Horario para Clases"
- Ignora acentos, puntuación y espacios extras

### ¿Qué pasa si el profesor pone un título extra que no está en la plantilla?
**R:** NO hay problema. El sistema solo verifica que **todos los títulos requeridos estén presentes**. Puede tener títulos adicionales.

### ¿Cómo puedo ver qué títulos se requieren para un periodo?
**R:** Usar el endpoint:
```
GET http://localhost:4000/api/syllabi/plantilla/2025-1
```

---

## 📊 Endpoints Resumidos

| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| POST | `/api/syllabi/plantilla/upload` | Admin | Subir plantilla con títulos |
| POST | `/api/syllabi/:id/marcar-plantilla` | Admin | Marcar syllabus como plantilla |
| GET | `/api/syllabi/plantilla/:periodo` | Todos | Ver títulos requeridos |
| POST | `/api/syllabi/upload-validado` | Profesor/Comisión | Subir con validación |

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `MIGRACION_VALIDACION_TITULOS.sql` en Neon
- [ ] Verificar que las columnas se crearon correctamente
- [ ] Reiniciar backend (`npm run dev`)
- [ ] Admin: Subir plantilla de referencia para periodo activo
- [ ] Profesor: Intentar subir syllabus con validación
- [ ] Verificar que funciona correctamente

---

## 🎓 Ejemplo Completo Paso a Paso

### PASO 1: Admin Configura Plantilla

```bash
# Admin abre Postman
POST http://localhost:4000/api/syllabi/plantilla/upload
Authorization: Bearer eyJhbGci...

# Selecciona archivo Word con estructura base
# El Word tiene estos títulos en negrita:
# - DATOS GENERALES
# - CÓDIGO DE ASIGNATURA
# - NOMBRE DE LA ASIGNATURA
# - HORARIO DE CLASES
# - VISADO

# Respuesta:
{
  "success": true,
  "total_titulos": 5,
  "titulos_requeridos": [...]
}
```

### PASO 2: Profesor Sube Syllabus

```bash
# Profesor abre frontend o Postman
POST http://localhost:4000/api/syllabi/upload-validado
Authorization: Bearer eyJhbGci...

# Selecciona su archivo Word
# Su documento tiene 4 de los 5 títulos (falta VISADO)

# Respuesta:
{
  "success": false,
  "message": "El syllabus no cumple con la estructura requerida",
  "detalles": {
    "titulos_faltantes": ["VISADO"]
  }
}
```

### PASO 3: Profesor Corrige y Reenvía

```bash
# Profesor agrega sección "VISADO" en negrita en su documento
# Vuelve a subir

POST http://localhost:4000/api/syllabi/upload-validado
# ...mismo proceso

# Respuesta:
{
  "success": true,
  "message": "✅ Syllabus validado y guardado exitosamente",
  "validacion": {
    "porcentaje_coincidencia": 100
  }
}
```

---

## 🎉 ¡Listo!

El sistema ahora valida automáticamente que todos los syllabus tengan la estructura correcta antes de guardarlos.
