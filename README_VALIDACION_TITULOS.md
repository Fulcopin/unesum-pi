# 📋 Sistema de Validación de Títulos en Syllabus

## 🎯 ¿Qué hace?

Valida automáticamente que los syllabus subidos por profesores tengan **la misma estructura** (títulos en negrita) que el syllabus de referencia del administrador.

```
┌─────────────────────────────────────────────────────────┐
│  Admin sube plantilla → Sistema extrae títulos          │
│                        ↓                                 │
│  Profesor sube syllabus → Sistema compara títulos       │
│                        ↓                                 │
│  ✅ Tiene todos → Se guarda                             │
│  ❌ Faltan títulos → Se rechaza con detalle             │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementación en 3 Pasos (25 minutos)

### 1️⃣ Ejecutar SQL en Neon (2 min)

```sql
ALTER TABLE syllabi ADD COLUMN es_plantilla_referencia BOOLEAN DEFAULT false;
ALTER TABLE syllabi ADD COLUMN titulos_extraidos JSONB;
CREATE INDEX idx_syllabi_plantilla_periodo ON syllabi (periodo, es_plantilla_referencia);
```

### 2️⃣ Reiniciar Backend (1 min)

```powershell
cd my-node-backend
npm run dev
```

### 3️⃣ Probar con Postman (15 min)

**Admin sube plantilla:**
```http
POST /api/syllabi/plantilla/upload
Body: file (Word), nombre, periodo
```

**Profesor sube syllabus:**
```http
POST /api/syllabi/upload-validado
Body: file (Word), nombre, periodo, materias
```

---

## 📚 Documentación Completa

| Archivo | Propósito | Tiempo |
|---------|-----------|--------|
| [INDICE_VALIDACION_TITULOS.md](INDICE_VALIDACION_TITULOS.md) | 📑 Índice completo | 2 min |
| [RESUMEN_EJECUTIVO_VALIDACION_TITULOS.md](RESUMEN_EJECUTIVO_VALIDACION_TITULOS.md) | 📊 Vista general | 10 min |
| [GUIA_RAPIDA_VALIDACION_TITULOS.md](GUIA_RAPIDA_VALIDACION_TITULOS.md) | 🎓 Guía visual | 5 min |
| [SISTEMA_VALIDACION_TITULOS_SYLLABUS.md](SISTEMA_VALIDACION_TITULOS_SYLLABUS.md) | 🔧 Docs técnicas | 20 min |
| [EJEMPLOS_REQUESTS_POSTMAN.md](EJEMPLOS_REQUESTS_POSTMAN.md) | 📮 Testing API | 5 min |
| [MIGRACION_VALIDACION_TITULOS.sql](MIGRACION_VALIDACION_TITULOS.sql) | 🗄️ Script SQL | - |

---

## 🎯 Ejemplo Visual

### Plantilla del Admin
```
┌────────────────────────────┐
│ **DATOS GENERALES**        │ ← En negrita
│ Código: _______            │
│                            │
│ **HORARIO DE CLASES**      │ ← En negrita
│ Lunes: 8:00 - 10:00        │
└────────────────────────────┘
```

### Syllabus del Profesor

#### ✅ VÁLIDO
```
┌────────────────────────────┐
│ **DATOS GENERALES**        │ ✓
│ **HORARIO DE CLASES**      │ ✓
└────────────────────────────┘
```
→ Se guarda exitosamente

#### ❌ INVÁLIDO
```
┌────────────────────────────┐
│ **DATOS GENERALES**        │ ✓
│ Horario de Clases          │ ✗ No está en negrita
└────────────────────────────┘
```
→ Se rechaza con mensaje:
```
❌ Títulos que faltan:
   1. HORARIO DE CLASES
```

---

## 🔌 Nuevas Rutas API

| Endpoint | Método | Rol | Descripción |
|----------|--------|-----|-------------|
| `/api/syllabi/plantilla/upload` | POST | Admin | Subir plantilla |
| `/api/syllabi/:id/marcar-plantilla` | POST | Admin | Marcar como plantilla |
| `/api/syllabi/plantilla/:periodo` | GET | Todos | Ver títulos requeridos |
| `/api/syllabi/upload-validado` | POST | Profesor | Subir con validación |

---

## 💻 Archivos de Código

- ✅ `my-node-backend/src/utils/syllabusValidator.js` (246 líneas)
- ✅ `my-node-backend/src/controllers/syllabusController.js` (+370 líneas)
- ✅ `my-node-backend/src/routes/syllabus.routes.js` (+4 rutas)
- ✅ `my-node-backend/src/models/syllabi.js` (+2 campos)
- ✅ `my-node-backend/src/migrations/20260111000000-add-plantilla-referencia-to-syllabi.js`

---

## ✅ Estado: COMPLETO

**Todo listo para usar. Solo ejecuta la migración SQL y reinicia el backend.**

---

## 📞 Ayuda Rápida

- **¿Cómo empiezo?** → [INDICE_VALIDACION_TITULOS.md](INDICE_VALIDACION_TITULOS.md)
- **¿Cómo funciona?** → [GUIA_RAPIDA_VALIDACION_TITULOS.md](GUIA_RAPIDA_VALIDACION_TITULOS.md)
- **¿Cómo probar?** → [EJEMPLOS_REQUESTS_POSTMAN.md](EJEMPLOS_REQUESTS_POSTMAN.md)

---

**Fecha:** 11 de enero de 2026  
**Versión:** 1.0  
**Estado:** ✅ Documentación completa
