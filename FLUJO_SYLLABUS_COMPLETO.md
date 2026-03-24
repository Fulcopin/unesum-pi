# 📋 FLUJO COMPLETO: SISTEMA SYLLABUS CON PESTAÑAS

## 🎯 RESUMEN
El sistema permite al **Administrador** subir archivos Syllabus (Excel/Word), extraer títulos automáticamente, organizarlos en pestañas, y que el **Docente** visualice un formulario organizado con esas pestañas.

---

## 🔄 FLUJO PASO A PASO

### **ROL: ADMINISTRADOR** 👨‍💼

#### **PASO 1: Subir y Extraer Títulos**
1. **Accede a:** `http://localhost:3000/dashboard/admin/syllabus/extraer-titulos`
2. **Haz clic en:** "Seleccionar archivo"
3. **Sube:** Un archivo Excel (.xlsx) o Word (.docx) con el Syllabus
4. **Haz clic en:** Botón "Extraer Títulos"
5. **Resultado:** El sistema detecta automáticamente los títulos del documento
6. **Verás:** Una tabla con todos los títulos detectados (número, título, ubicación, puntuación)
7. **Haz clic en:** "Continuar a Organizar Pestañas →"

**¿Qué hace el sistema?**
- Lee el archivo Excel o Word
- Detecta títulos usando inteligencia artificial (celdas combinadas, mayúsculas, palabras clave)
- Guarda los títulos en la tabla `titulos_extraidos_syllabus`
- Genera un `session_id` único para esta extracción

---

#### **PASO 2: Organizar Títulos en Pestañas**
1. **Llegas a:** `http://localhost:3000/dashboard/admin/syllabus/organizar-pestanas?sessionId=xxx`
2. **Verás:** Todos los títulos extraídos en una lista
3. **Opciones de organización:**
   - **Crear Pestaña Nueva:** Botón "+ Nueva Pestaña"
   - **Dar nombre a la pestaña:** Por ejemplo: "Datos Generales", "Objetivos", "Metodología"
   - **Escoger color:** Blue, Green, Purple, Orange, Red
   - **Escoger ícono:** 📋, 🎯, 📖, ✍️, 📊
   - **Arrastrar títulos:** Drag & drop de títulos a las pestañas
   - **Reordenar:** Arrastra las pestañas para cambiar su orden

4. **Ejemplo de organización:**
```
┌─────────────────────────────────────┐
│ 📋 Datos Generales (Blue)           │
├─────────────────────────────────────┤
│ • Asignatura                        │
│ • Periodo Académico                 │
│ • Nivel                             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎯 Objetivos (Purple)               │
├─────────────────────────────────────┤
│ • Objetivos de la Asignatura       │
│ • Competencias                      │
│ • Resultados de Aprendizaje        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📖 Contenido (Green)                │
├─────────────────────────────────────┤
│ • Contenido de la Asignatura       │
│ • Unidades Temáticas               │
│ • Descripción                      │
└─────────────────────────────────────┘
```

5. **Haz clic en:** "Guardar Organización"
6. **Resultado:** Las pestañas se guardan en `agrupaciones_titulos_syllabus`

**¿Qué hace el sistema?**
- Carga los títulos de la sesión desde la base de datos
- Permite crear pestañas y asignar títulos a cada una
- Guarda la organización en formato JSON con arrays de IDs
- Los docentes verán exactamente estas pestañas en sus formularios

---

### **ROL: DOCENTE** 👨‍🏫

#### **PASO 3: Ver y Llenar Formulario Organizado**
1. **Accede a:** `http://localhost:3000/dashboard/docente/syllabus-formularios`
2. **Verás:** Lista de sesiones de Syllabus disponibles
3. **Selecciona:** Una sesión de extracción (aparece el nombre del archivo)
4. **Resultado:** 
   - Si el admin organizó pestañas: ✅ Banner verde "Pestañas organizadas por el administrador"
   - Si no hay organización: ⚠️ Banner amarillo "Sin organización de pestañas"

5. **Vista con pestañas organizadas:**
```
┌──────────────────────────────────────────────┐
│ ✅ Pestañas organizadas por el administrador │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ [📋 Datos Generales 5] [🎯 Objetivos 3]     │
│ [📖 Contenido 4]                             │
└──────────────────────────────────────────────┘

Pestaña: Datos Generales
┌──────────────────────────────────────────────┐
│ • Asignatura                 [Seleccionar]   │
│ • Periodo Académico         [Seleccionar]   │
│ • Nivel                     [Seleccionar]   │
└──────────────────────────────────────────────┘
```

6. **Acciones del docente:**
   - Hacer clic en cada título para ver sus campos
   - Llenar el formulario con los datos del Syllabus
   - Cambiar entre pestañas usando los tabs
   - Guardar el formulario completado

---

## 🗂️ ESTRUCTURA DE ARCHIVOS CREADOS

### **Backend:**
```
my-node-backend/
├── migrations/
│   ├── create-titulos-extraidos-syllabus.sql
│   └── create-agrupaciones-titulos-syllabus.sql
├── src/
│   ├── models/
│   │   ├── TituloExtraidoSyllabus.js
│   │   ├── AgrupacionTituloSyllabus.js
│   │   └── index.js (registrados aquí)
│   ├── controllers/
│   │   └── syllabusExtractionController.js
│   └── routes/
│       ├── syllabusExtractionRoutes.js
│       └── index.js (registrado aquí)
```

### **Frontend:**
```
app/
└── dashboard/
    ├── admin/
    │   └── syllabus/
    │       ├── extraer-titulos/
    │       │   └── page.tsx
    │       └── organizar-pestanas/
    │           └── page.tsx
    └── docente/
        └── syllabus-formularios/
            └── page.tsx
```

---

## 🔗 ENDPOINTS DE LA API

### **Para Administradores:**
- POST `/api/syllabus-extraction/extraer-titulos` - Subir archivo y extraer títulos
- GET `/api/syllabus-extraction/sesiones` - Listar todas las sesiones
- GET `/api/syllabus-extraction/sesion/:sessionId/titulos` - Ver títulos de una sesión
- GET `/api/syllabus-extraction/sesion/:sessionId/agrupaciones` - Ver organización de pestañas
- POST `/api/syllabus-extraction/sesion/:sessionId/agrupaciones` - Guardar organización
- DELETE `/api/syllabus-extraction/sesion/:sessionId/agrupaciones` - Eliminar organización

### **Para Docentes:**
- GET `/api/syllabus-extraction/sesiones` - Ver sesiones disponibles
- GET `/api/syllabus-extraction/sesion/:sessionId/titulos` - Ver títulos
- GET `/api/syllabus-extraction/sesion/:sessionId/agrupaciones` - Ver organización

---

## 📊 TABLAS EN BASE DE DATOS

### **titulos_extraidos_syllabus**
```sql
- id (PK)
- session_id (índice)
- nombre_archivo
- tipo_archivo (Excel/Word)
- usuario_id (FK → usuarios)
- titulo
- tipo (cabecera/titulo_seccion/campo)
- fila, columna, columna_letra
- puntuacion (confianza de detección)
- tiene_dos_puntos, longitud_texto
- es_mayuscula, es_negrita
- created_at, updated_at
```

### **agrupaciones_titulos_syllabus**
```sql
- id (PK)
- session_id (índice)
- nombre_pestana ("Datos Generales", "Objetivos", etc.)
- descripcion (opcional)
- orden (0, 1, 2...)
- titulo_ids (ARRAY de INTEGER [1, 5, 7, 12])
- color ("blue", "green", "purple")
- icono ("📋", "🎯", "📖")
- created_at, updated_at
```

---

## ✅ CÓMO PROBAR TODO EL FLUJO

### **1. Preparar archivos de prueba:**
- Busca un archivo Excel con Syllabus o crea uno simple
- Asegúrate que tenga títulos claros (ej: ASIGNATURA, OBJETIVOS, CONTENIDO)

### **2. Iniciar servidores:**
```bash
# Terminal 1 - Backend
cd my-node-backend
node src/server.js
# Debe decir: Server running on http://localhost:4000

# Terminal 2 - Frontend
npm run dev
# Debe decir: Ready on http://localhost:3000
```

### **3. Login como Administrador:**
```
URL: http://localhost:3000/login
Usuario: admin@unesum.edu.ec (o tu usuario admin)
Contraseña: tu contraseña
```

### **4. Extraer títulos:**
```
URL: http://localhost:3000/dashboard/admin/syllabus/extraer-titulos
Acción: Subir archivo → Ver títulos → Continuar
```

### **5. Organizar pestañas:**
```
URL: http://localhost:3000/dashboard/admin/syllabus/organizar-pestanas
Acción: Crear 3 pestañas → Arrastrar títulos → Guardar
```

### **6. Ver como docente:**
```
Logout → Login como docente
URL: http://localhost:3000/dashboard/docente/syllabus-formularios
Resultado: Ver formulario con pestañas organizadas ✅
```

---

## 🎨 COMPONENTES REUTILIZADOS

El sistema reutiliza componentes existentes:
- **OrganizadorPestanas** - Para drag & drop de títulos
- **FormularioDinamico** - Para mostrar formulario con tabs
- **UI Components** - Button, Card, Badge, Alert, Input, Tabs

Solo cambiamos los endpoints de API de `programa-analitico` a `syllabus-extraction`.

---

## 🐛 DEBUGGING

Si algo no funciona:

1. **Revisa el backend:**
```bash
# Ver logs del servidor
# Debe mostrar las consultas SQL de Syllabus
```

2. **Revisa la base de datos:**
```sql
-- Ver títulos extraídos
SELECT * FROM titulos_extraidos_syllabus ORDER BY created_at DESC LIMIT 10;

-- Ver agrupaciones
SELECT * FROM agrupaciones_titulos_syllabus ORDER BY created_at DESC;
```

3. **Revisa el navegador:**
```javascript
// Abre DevTools → Console
// Verás los logs de las peticiones fetch()
```

---

## 🎉 ¡LISTO!

Ahora tienes un sistema completo de Syllabus con pestañas organizables, idéntico al de Programa Analítico pero para documentos Syllabus.
