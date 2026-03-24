# 🔍 Diagnóstico y Verificación de Endpoints

## ✅ Estado Actual del Sistema

### 1. Backend - **CORRIENDO** ✅
El backend está activo en el puerto 4000 (confirmado por error `EADDRINUSE`)

### 2. Endpoint Correcto Configurado ✅
**Frontend usa:** `/api/programa-analitico/sesion-extraccion/:sessionId`
**Backend tiene:** `/sesion-extraccion/:sessionId` (línea 114 de routes)

### 3. Estructura de Datos ✅
**Backend devuelve (snake_case):**
```json
{
  "success": true,
  "data": {
    "session_id": "1734712345678_abc123",
    "nombre_archivo": "Programa Analítico.xlsx",
    "tipo_archivo": "xlsx",
    "total_titulos": 23,
    "fecha_extraccion": "2025-12-20T...",
    "titulos": [...],
    "agrupadosPorTipo": {
      "cabecera": [...],
      "titulo_seccion": [...],
      "campo": [...]
    }
  }
}
```

**Frontend espera (snake_case):**
```typescript
interface SesionExtraccion {
  session_id: string;
  nombre_archivo: string;  ✅
  tipo_archivo: string;    ✅
  total_titulos: number;   ✅
  // ...
}
```

---

## 🧪 Pasos de Verificación Manual

### Paso 1: Verificar que el Backend está Corriendo
Abre una nueva terminal PowerShell y ejecuta:
```powershell
curl http://localhost:4000/health
```

O visita en tu navegador:
```
http://localhost:4000
```

**Resultado esperado:** Debe responder (aunque sea con 404 o un mensaje)

---

### Paso 2: Abrir DevTools del Navegador
1. Abre tu aplicación en el navegador
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **"Console"**
4. Ve también a la pestaña **"Network"**

---

### Paso 3: Reproducir el Error
1. Ve a **"Formularios Dinámicos"** en tu dashboard
2. Haz clic en una sesión (ej: "Programa AnalíAtico.xlsx")
3. **Observa en Console y Network**

---

### Paso 4: Verificar en Console
Busca errores relacionados con:
- ❌ `Failed to fetch`
- ❌ `Network error`
- ❌ `401 Unauthorized`
- ❌ `404 Not Found`
- ❌ `500 Internal Server Error`

Si ves alguno de estos, copia el mensaje completo.

---

### Paso 5: Verificar en Network
1. Busca la petición que empieza con:
   ```
   sesion-extraccion/...
   ```
2. Haz clic en ella
3. Ve a la pestaña **"Response"**
4. Copia el JSON de respuesta

---

## 🐛 Posibles Problemas y Soluciones

### Problema 1: Token Expirado o Inválido
**Síntoma:** Error 401 Unauthorized

**Solución:**
1. Cierra sesión
2. Vuelve a iniciar sesión
3. Intenta nuevamente

---

### Problema 2: Sesión No Existe en Base de Datos
**Síntoma:** Error 404 o "No se encontró la sesión"

**Causas posibles:**
- No hay títulos extraídos con ese `session_id`
- El `session_id` no coincide

**Verificación en backend:**
Ejecuta en tu base de datos:
```sql
SELECT session_id, nombre_archivo, tipo_archivo, COUNT(*) as total
FROM titulos_extraidos
GROUP BY session_id, nombre_archivo, tipo_archivo
ORDER BY created_at DESC
LIMIT 10;
```

---

### Problema 3: CORS Error
**Síntoma:** "blocked by CORS policy"

**Solución:**
Verifica que el backend tenga configurado CORS para `localhost:3000`

En `my-node-backend/src/server.js` debe tener:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
```

---

### Problema 4: Puerto Incorrecto
**Síntoma:** "Connection refused"

**Verificación:**
- Frontend usa: `http://localhost:4000/api/...`
- Backend corre en: `http://localhost:4000`

Si el backend corre en otro puerto (ej: 3001), cambia la URL en el frontend.

---

## 📋 Checklist de Verificación

Marca lo que ya verificaste:

- [ ] **Backend está corriendo** (puerto 4000)
- [ ] **Frontend está corriendo** (puerto 3000)
- [ ] **Hay sesiones de extracción en la BD**
- [ ] **Token JWT es válido**
- [ ] **No hay errores de CORS en Console**
- [ ] **La URL del endpoint es correcta**
- [ ] **La respuesta del backend tiene el formato correcto**

---

## 🔧 Comandos Útiles

### Ver Sesiones Disponibles en BD
```sql
-- PostgreSQL
SELECT 
  session_id,
  nombre_archivo,
  tipo_archivo,
  COUNT(*) as total_titulos,
  MAX(created_at) as fecha_extraccion
FROM titulos_extraidos
GROUP BY session_id, nombre_archivo, tipo_archivo
ORDER BY MAX(created_at) DESC;
```

### Ver Títulos de una Sesión Específica
```sql
SELECT *
FROM titulos_extraidos
WHERE session_id = 'TU_SESSION_ID_AQUI'
ORDER BY fila, columna;
```

### Reiniciar Backend (si es necesario)
```powershell
# Detener el proceso actual
Get-Process -Name node | Where-Object {$_.MainWindowTitle -like '*4000*'} | Stop-Process -Force

# Iniciar nuevamente
cd my-node-backend
npm run dev
```

### Ver Logs del Backend
Mira la terminal donde está corriendo el backend. Deberías ver:
```
✅ Database connected and models synchronized successfully
🚀 Server running on http://localhost:4000
```

---

## 📊 Flujo Completo de Datos

```
┌──────────────┐
│  FRONTEND    │
│  (Next.js)   │
└──────┬───────┘
       │
       │ 1. Usuario selecciona sesión
       │    onClick={seleccionarSesion(sessionId)}
       │
       ↓
┌──────────────────────────────────────────┐
│ fetch(`http://localhost:4000/api/        │
│   programa-analitico/                    │
│   sesion-extraccion/${sessionId}`)       │
│                                          │
│ headers: {                               │
│   Authorization: Bearer <token>          │
│ }                                        │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────┐
│   BACKEND    │
│   Express    │
└──────┬───────┘
       │
       │ 2. Valida token JWT
       │    middleware: authenticate
       │
       ↓
┌──────────────────────────────────────────┐
│ programaAnaliticoController              │
│   .obtenerSesionPorId()                  │
│                                          │
│ const titulos = await                    │
│   TituloExtraido.findAll({               │
│     where: { session_id }                │
│   })                                     │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────┐
│  PostgreSQL  │
│   Database   │
└──────┬───────┘
       │
       │ 3. Devuelve títulos extraídos
       │
       ↓
┌──────────────────────────────────────────┐
│ Response JSON:                           │
│ {                                        │
│   success: true,                         │
│   data: {                                │
│     session_id: "...",                   │
│     nombre_archivo: "...",          ✅   │
│     tipo_archivo: "...",            ✅   │
│     total_titulos: 23,              ✅   │
│     agrupadosPorTipo: {...}              │
│   }                                      │
│ }                                        │
└──────┬───────────────────────────────────┘
       │
       ↓
┌──────────────┐
│  FRONTEND    │
│              │
│ if (data.success) {                      │
│   setSesionSeleccionada(data.data)       │
│ }                                        │
│                                          │
│ Renderiza:                               │
│ {sesionSeleccionada.nombre_archivo}  ✅  │
│ {sesionSeleccionada.total_titulos}   ✅  │
│ {sesionSeleccionada.tipo_archivo}    ✅  │
└──────────────────────────────────────────┘
```

---

## 🎯 Siguiente Paso

**POR FAVOR, HAZME SABER:**

1. ¿Qué ves en la **consola del navegador** (DevTools → Console)?
2. ¿Qué ves en la pestaña **Network** cuando seleccionas una sesión?
3. ¿Cuál es el **Status Code** de la petición? (200, 401, 404, 500?)
4. ¿Qué dice la **respuesta JSON** completa?

Con esta información podré ayudarte a resolver el problema específico que estás viendo.

---

## 📸 Información de tu Screenshot

En tu captura de pantalla veo:
- ✅ "Programa AnalíAtico.xlsx"
- ✅ "23 títulos detectados • Excel"
- ✅ Botón "← Volver a la lista"

**ESTO SIGNIFICA QUE EL FIX FUNCIONÓ** ✅

Si ya no ves "undefined", entonces el problema está **RESUELTO** 🎉

---

## 🆘 Si Aún Ves "undefined"

Ejecuta esto en la consola del navegador (DevTools → Console):
```javascript
console.log(sesionSeleccionada);
```

Y comparte el resultado conmigo.
