# 🎓 Editor de Syllabus y Programa Analítico - Comisión Académica

## ✅ Solución Implementada

Para evitar duplicación de código y mantener un único editor actualizado, la **Comisión Académica** comparte los mismos editores que el administrador, pero con permisos específicos.

### 📂 Estructura de Archivos

```
app/dashboard/
├── admin/
│   ├── editor-syllabus/page.tsx          ← Editor principal
│   └── programa-analitico/
│       └── editar/[id]/page.tsx          ← Editor de programa analítico
└── comision/
    ├── editor-syllabus/                   ← ACCESO DIRECTO (misma funcionalidad)
    └── editor-programa-analitico/         ← ACCESO DIRECTO (misma funcionalidad)
```

### 🔐 Permisos Actualizados

Los siguientes archivos ya tienen permisos para `comision_academica`:

#### 1. **Editor de Syllabus** (`/dashboard/admin/editor-syllabus`)
```tsx
// Ya actualizado en: app/dashboard/admin/editor-syllabus/page.tsx
<ProtectedRoute allowedRoles={["administrador", "comision_academica"]}>
```

#### 2. **Editor de Programa Analítico** (`/dashboard/admin/programa-analitico/editar/[id]`)
```tsx
// Ya actualizado en: app/dashboard/admin/programa-analitico/editar/[id]/page.tsx
<ProtectedRoute allowedRoles={["administrador", "comision_academica"]}>
```

#### 3. **Backend - Middleware** (✅ YA IMPLEMENTADO)
```javascript
// my-node-backend/src/middlewares/auth.middleware.js
if (decoded.rol === 'administrador' || decoded.rol === 'comision_academica' || decoded.rol === 'comision') {
  user = await Usuario.findByPk(decoded.id);
}
```

#### 4. **Backend - Rutas** (✅ YA IMPLEMENTADO)
Todos los endpoints necesarios ya tienen permisos para `comision_academica`:
- `/api/periodo` - GET, POST, PUT, DELETE
- `/api/syllabus-extraction/*` - Todas las rutas
- `/api/programas-analiticos/*` - Todas las rutas
- `/api/programa-analitico/*` - Todas las rutas
- `/api/syllabi/*` - Todas las rutas

### 🚀 URLs de Acceso

#### Para Comisión Académica:
1. **Editor de Syllabus:**
   ```
   http://localhost:3000/dashboard/admin/editor-syllabus
   ```

2. **Editor de Programa Analítico (por ID):**
   ```
   http://localhost:3000/dashboard/admin/programa-analitico/editar/[id]
   ```

3. **Lista de Programas Analíticos:**
   ```
   http://localhost:3000/dashboard/admin/programa-analitico
   ```

4. **Editor JSON de Programa Analítico:**
   ```
   http://localhost:3000/dashboard/admin/programa-analitico/editar/[id]
   ```
   (Usa el componente `EditorSeccionesJSON` que creamos)

### 📋 Dashboard de Comisión Académica

Para facilitar el acceso, actualiza el dashboard de comisión con enlaces directos:

**Archivo:** `app/dashboard/comision/page.tsx`

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, BookOpen, Edit } from "lucide-react"
import Link from "next/link"

// Dentro del componente, agregar estas tarjetas:

<Card>
  <CardHeader>
    <div className="flex items-center gap-3">
      <FileText className="h-8 w-8 text-emerald-600" />
      <div>
        <CardTitle>Editor de Syllabus</CardTitle>
        <CardDescription>Crear y editar syllabus con pestañas</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <Link href="/dashboard/admin/editor-syllabus">
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
        <Edit className="mr-2 h-4 w-4" />
        Abrir Editor de Syllabus
      </Button>
    </Link>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <div className="flex items-center gap-3">
      <BookOpen className="h-8 w-8 text-blue-600" />
      <div>
        <CardTitle>Programas Analíticos</CardTitle>
        <CardDescription>Gestionar programas analíticos</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <Link href="/dashboard/admin/programa-analitico">
      <Button className="w-full bg-blue-600 hover:bg-blue-700">
        <BookOpen className="mr-2 h-4 w-4" />
        Ver Programas Analíticos
      </Button>
    </Link>
  </CardContent>
</Card>
```

### 🎨 Ventajas de esta Solución

✅ **Sin Duplicación:** Un solo código mantener
✅ **Actualizaciones Automáticas:** Cualquier mejora se aplica a ambos roles
✅ **Permisos Correctos:** Backend valida el rol `comision_academica`
✅ **Experiencia Consistente:** Misma interfaz para admin y comisión
✅ **Fácil Mantenimiento:** No hay que actualizar dos editores

### 🔧 Verificación de Acceso

1. **Login como Comisión Académica**
2. **Navegar a:** `http://localhost:3000/dashboard/admin/editor-syllabus`
3. **Verificar:** Debes tener acceso completo
4. **Probar:** Subir archivo, editar, guardar

### 📝 Notas Importantes

- Los `ProtectedRoute` ya están actualizados con `comision_academica`
- El middleware de backend ya reconoce este rol
- Todos los endpoints necesarios ya tienen permisos
- No necesitas crear archivos duplicados en `/dashboard/comision/editor-syllabus/`

### 🚦 Estado Actual

| Componente | Estado | Ubicación |
|------------|--------|-----------|
| Editor Syllabus | ✅ Funcional | `/dashboard/admin/editor-syllabus` |
| Editor Programa Analítico (JSON) | ✅ Funcional | `/dashboard/admin/programa-analitico/editar/[id]` |
| Permisos Backend | ✅ Configurados | Todos los controladores y rutas |
| Middleware Auth | ✅ Actualizado | `auth.middleware.js` |
| Dashboard Comisión | ⚠️ Agregar enlaces | `app/dashboard/comision/page.tsx` |

### ✨ Próximo Paso

Actualiza el dashboard de comisión académica (`app/dashboard/comision/page.tsx`) con los enlaces directos a los editores. Así los usuarios de comisión tendrán acceso fácil sin tener que recordar las URLs de admin.

---

**Documentación relacionada:**
- `PERMISOS_COMISION_ACADEMICA.md` - Permisos actualizados
- `IMPLEMENTACION_EDITOR_JSON_COMPLETO.md` - Editor JSON
- `RESUMEN_SISTEMA_JSON_COMPLETO.md` - Sistema completo
