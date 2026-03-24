# ✅ Sistema de Comparación de Documentos - Completado

## 📋 Resumen

Se ha implementado exitosamente el sistema de comparación de títulos entre Programa Analítico y Syllabus para el rol de **Comisión Académica**.

---

## 🎯 Funcionalidades Implementadas

### 1. **Panel de Comisión Académica** (`/dashboard/comision`)
- ✅ **4 Módulos disponibles:**
  1. 📘 **Extraer Programa Analítico** - Subir y extraer títulos de archivos Excel/Word
  2. ✨ **Extraer Syllabus** - Subir y extraer títulos con selección de periodo académico
  3. 🔄 **Comparar Documentos** - Sistema de comparación entre ambos documentos
  4. 📋 **Syllabus Extraídos** - Visualizar syllabus guardados

### 2. **Sistema de Comparación** (`/dashboard/comision/comparar-documentos`)

#### Características:
- **Selección de Sesiones:** Dropdowns para elegir sesión de Syllabus y Programa Analítico
- **Algoritmo de Similitud:** Levenshtein-based con umbral del 60%
- **4 Categorías de Resultados:**
  - ✅ **En Ambos** (Verde) - Coincidencias exactas
  - 📘 **Solo en Syllabus** (Azul) - Títulos únicos del Syllabus
  - 🟣 **Solo en P.A.** (Morado) - Títulos únicos del Programa Analítico
  - ⚠️ **Similares** (Amarillo) - Títulos con 60%+ similitud (muestra %)
- **Exportación:** Botón para descargar resultados en formato TXT
- **Estadísticas:** Contadores en badges para cada categoría

---

## 🛠️ Archivos Creados/Modificados

### **Backend**

#### 1. **Controller** (`my-node-backend/src/controllers/comparacionController.js`)
```javascript
// Funciones principales:
- calcularSimilitud(str1, str2): Algoritmo Levenshtein para calcular similitud
- compararTitulos(req, res): Endpoint que procesa la comparación

// Lógica:
1. Recibe syllabus_session_id y programa_analitico_session_id
2. Obtiene títulos de ambas tablas
3. Normaliza a minúsculas
4. Categoriza en 4 grupos
5. Retorna JSON con resultados + estadísticas
```

#### 2. **Routes** (`my-node-backend/src/routes/comparacionRoutes.js`)
```javascript
POST /api/comparacion/comparar-titulos
- Middleware: authenticate + authorize(['administrador', 'comision', 'comision_academica'])
- Controller: comparacionController.compararTitulos
```

#### 3. **Routes Registration** (`my-node-backend/src/routes/index.js`)
```javascript
// Línea 21: Import
const comparacionRoutes = require('./comparacionRoutes');

// Línea 51: Registro
router.use('/comparacion', comparacionRoutes);
```

### **Frontend**

#### 4. **Página de Comparación** (`app/dashboard/comision/comparar-documentos/page.tsx`)
- 441 líneas
- Componentes:
  - 2 Select dropdowns (Syllabus y Programa Analítico)
  - Tabs con 4 pestañas de resultados
  - Botón de exportación a TXT
  - Badges con contadores
  - Cards para mostrar títulos
  - Similares con porcentaje de similitud

#### 5. **Extractor de Syllabus** (`app/dashboard/comision/syllabus/extraer-titulos/page.tsx`)
- 226 líneas
- Upload de archivos Excel/Word
- Selección de periodo académico
- Visualización de resultados
- Botón "Organizar en Pestañas"

#### 6. **Extractor de Programa Analítico** (`app/dashboard/comision/programa-analitico/extraer-titulos/page.tsx`)
- 15 líneas
- Reutiliza componente del admin
- Protected route para comision

---

## 🔐 Seguridad y Permisos

### Roles Autorizados:
- ✅ `administrador`
- ✅ `comision`
- ✅ `comision_academica`

### Middleware Stack:
1. **authenticate** - Verifica JWT token válido
2. **authorize([...roles])** - Verifica rol del usuario

---

## 📊 Algoritmo de Comparación

### **Levenshtein Distance**
```javascript
function calcularSimilitud(str1, str2) {
  // 1. Normalizar a minúsculas
  // 2. Calcular distancia de Levenshtein
  // 3. Retornar similitud como número 0-1
  return 1 - (distance / maxLength);
}
```

### **Umbral de Similitud:** 60% (0.6)
- Exacta: 100% (1.0) → "En Ambos"
- Similar: 60%-99% → "Similares" (con %)
- Diferente: <60% → "Solo en X"

---

## 🚀 Cómo Usar

### 1. **Login**
```
URL: http://localhost:3000/login
Usuario: comision@unesum.edu.ec
Contraseña: comision123
```

### 2. **Extraer Syllabus**
1. Navegar a "Extraer Syllabus"
2. Seleccionar periodo académico
3. Subir archivo Excel/Word
4. Ver resultados con cantidad de títulos extraídos

### 3. **Extraer Programa Analítico**
1. Navegar a "Extraer Programa Analítico"
2. Subir archivo Excel/Word
3. Ver títulos extraídos

### 4. **Comparar Documentos**
1. Navegar a "Comparar Documentos"
2. Seleccionar sesión de Syllabus (dropdown)
3. Seleccionar sesión de Programa Analítico (dropdown)
4. Clic en "Comparar Documentos"
5. Ver resultados en 4 pestañas:
   - **En Ambos:** Títulos idénticos
   - **Solo Syllabus:** Títulos que faltan en P.A.
   - **Solo P.A.:** Títulos que faltan en Syllabus
   - **Similares:** Títulos parecidos con % de similitud
6. (Opcional) Clic en "Exportar" para descargar TXT

---

## 🎨 Diseño Visual

### Colores Temáticos:
- **Módulo Programa Analítico:** 🔵 Azul (`bg-blue-600`)
- **Módulo Syllabus:** 🟣 Morado (`bg-purple-600`)
- **Módulo Comparación:** 🟠 Naranja (`bg-orange-600`)
- **Resultados:**
  - En Ambos: 🟢 Verde (`bg-green-500`)
  - Solo Syllabus: 🔵 Azul (`bg-blue-500`)
  - Solo P.A.: 🟣 Morado (`bg-purple-500`)
  - Similares: 🟡 Amarillo (`bg-yellow-500`)

### Iconos:
- 📤 Upload (Extractores)
- ✨ Sparkles (Syllabus)
- 🔄 GitCompare (Comparación)
- ✅ CheckCircle2 (En Ambos)
- ❌ XCircle (Solo en X)
- ⚠️ AlertCircle (Similares)

---

## 📡 Endpoints API

### POST `/api/comparacion/comparar-titulos`
**Request Body:**
```json
{
  "syllabus_session_id": "abc123",
  "programa_analitico_session_id": 456
}
```

**Response:**
```json
{
  "enAmbos": ["Título 1", "Título 2"],
  "soloEnSyllabus": ["Título A"],
  "soloEnProgramaAnalitico": ["Título B"],
  "similares": [
    {
      "syllabus": "Título Similar 1",
      "programaAnalitico": "Titulo Similar 1",
      "similitud": 85
    }
  ],
  "estadisticas": {
    "totalSyllabus": 10,
    "totalProgramaAnalitico": 8,
    "enAmbos": 5,
    "soloEnSyllabus": 3,
    "soloEnProgramaAnalitico": 2,
    "similares": 2
  }
}
```

**Errores:**
- `400` - Faltan parámetros (session IDs)
- `404` - No se encontraron títulos
- `500` - Error interno del servidor

---

## 🔧 Configuración Técnica

### Backend:
- **Puerto:** 4000
- **Base de Datos:** PostgreSQL (Neon)
- **ORM:** Sequelize
- **Autenticación:** JWT Bearer tokens

### Frontend:
- **Puerto:** 3000
- **Framework:** Next.js 14 (App Router)
- **UI:** shadcn/ui + TailwindCSS
- **HTTP Client:** Axios

### Modelos de Base de Datos:
- `TituloExtraidoSyllabus` - Títulos del Syllabus
  - Campo clave: `session_id` (VARCHAR 255)
- `TituloExtraidoProgramaAnalitico` - Títulos del Programa Analítico
  - Campo clave: `sesion_id` (INTEGER)

---

## ✅ Checklist de Implementación

- [x] Crear controller de comparación
- [x] Crear routes de comparación
- [x] Registrar routes en index.js
- [x] Crear página de comparación frontend
- [x] Crear extractores para comision
- [x] Actualizar dashboard de comision
- [x] Configurar permisos y autorización
- [x] Implementar algoritmo de similitud
- [x] Agregar exportación a TXT
- [x] Mostrar estadísticas con badges
- [x] Reiniciar servidor backend
- [x] Verificar funcionamiento

---

## 🐛 Solución de Problemas

### Problema: "Cannot find module auth.middleware"
**Solución:** Cambiar import de `'../middleware/auth.middleware'` a `'../middlewares/auth.middleware'` (plural)

### Problema: Servidor no carga nuevas rutas
**Solución:** Reiniciar servidor con `npm run dev` en `my-node-backend`

### Problema: 401 Unauthorized
**Solución:** Verificar que el usuario tenga rol `comision` o `comision_academica` en la base de datos

---

## 📝 Notas Adicionales

### Pendientes (Opcionales):
- [ ] Crear páginas "organizar-pestanas" para comision (actualmente redirigen a admin)
- [ ] Fix lint errors en comparacionController.js (8 advertencias de estilo)
- [ ] Optimizar algoritmo con Set en lugar de Array para búsquedas

### Mejoras Futuras:
- Comparación histórica (comparar múltiples sesiones)
- Exportar a Excel/PDF además de TXT
- Gráficos de visualización de similitudes
- Sugerencias automáticas de corrección
- Notificaciones por email con resultados

---

## 🎉 Estado: COMPLETADO

✅ **Backend:** Operativo en http://localhost:4000
✅ **Frontend:** Operativo en http://localhost:3000
✅ **Base de Datos:** Conectada (Neon PostgreSQL)
✅ **Autenticación:** JWT funcionando
✅ **Comparación:** Sistema completo y funcional

---

**Última actualización:** Diciembre 2024
**Implementado por:** GitHub Copilot AI Assistant
