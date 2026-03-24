# 🎯 VALIDACIÓN DE SYLLABUS PARA COMISIÓN ACADÉMICA

## 📋 OBJETIVO

Cuando la **Comisión Académica** suba un Word de syllabus en el editor, el sistema debe:

1. ✅ **Validar automáticamente** contra la plantilla del administrador para ese periodo
2. ❌ **Rechazar** si faltan campos requeridos (con lista de faltantes)
3. ✅ **Permitir guardar** solo si cumple con la estructura

---

## 🔧 ESTADO ACTUAL

### ✅ Backend Ya Está Listo

El backend **YA TIENE** la funcionalidad completa:

- ✅ Ruta: `POST /api/syllabi/upload-validado`
- ✅ Permisos: Ya incluye `comision_academica`
- ✅ Validación: Compara contra `plantilla.datos_syllabus`
- ✅ Respuesta: Retorna detalles si hay campos faltantes

```javascript
// my-node-backend/src/routes/syllabus.routes.js (línea 77)
router.post('/upload-validado', 
  authorize(['profesor', 'comision', 'comision_academica']), // ✅ Ya incluye comision_academica
  upload.single('file'), 
  syllabusController.subirSyllabusConValidacion
);
```

### ⚠️ Frontend Necesita Actualización

El editor de admin (`/dashboard/admin/editor-syllabus`) **NO usa** la validación porque:
- Admin crea la plantilla, no necesita validarse contra sí mismo
- Procesa el Word localmente con mammoth (sin enviar al backend)

La comisión académica actualmente **usa la misma ruta** que el admin, por eso no hay validación.

---

## 🚀 SOLUCIÓN RECOMENDADA

### Opción 1: Modificar el Editor Existente (Recomendado)

Detectar si el usuario es Comisión Académica y usar el endpoint de validación:

**Archivo a modificar**: `app/dashboard/admin/editor-syllabus/page.tsx`

**Ubicación**: Función `handleSyllabusUpload` (línea 257)

**Cambios necesarios**:

```typescript
// 1. Importar useAuth para obtener el rol del usuario
import { useAuth } from "@/contexts/auth-context"

// 2. En el componente, obtener el usuario
export default function EditorSyllabusPage() {
  const { token, getToken, user } = useAuth() // ✅ Agregar 'user'
  
  // ... resto del código ...

  const handleSyllabusUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = ""; 

    setIsLoading(true);

    // 🆕 NUEVO: Si es comisión académica, usar validación
    if (user?.rol === 'comision_academica') {
      await handleUploadConValidacion(file);
      return;
    }

    // Si es admin, continuar con el flujo normal
    try {
      const { value: html } = await mammoth.convertToHtml(/* ... */);
      // ... resto del código existente ...
    }
  };

  // 🆕 NUEVA FUNCIÓN: Upload con validación para comisión académica
  const handleUploadConValidacion = async (file: File) => {
    try {
      // Verificar que haya un periodo seleccionado
      if (!selectedPeriod) {
        alert("❌ Por favor seleccione un periodo académico antes de subir el documento");
        setIsLoading(false);
        return;
      }

      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nombre', file.name.replace(/\.docx?$/i, ''));
      formData.append('periodo', selectedPeriod); // ID del periodo
      formData.append('materias', activeSyllabus?.metadata?.subject || 'Sin especificar');

      // Enviar al endpoint de validación
      const currentToken = token || getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/syllabi/upload-validado`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ✅ VALIDACIÓN EXITOSA
        alert(`✅ Syllabus validado y guardado exitosamente\n\n` +
              `Coincidencia: ${result.data.validacion.porcentaje_coincidencia}%\n` +
              `Campos requeridos: ${result.data.validacion.total_requeridos}\n` +
              `Campos encontrados: ${result.data.validacion.encontrados}`);
        
        // Recargar la lista de syllabi guardados
        const syllabiData = await apiRequest("/api/syllabi");
        const syllabiArray = Array.isArray(syllabiData?.data) ? syllabiData.data : [];
        setSavedSyllabi(syllabiArray);
        
        // Cargar el syllabus recién guardado
        if (result.data.id) {
          loadSyllabusFromSaved(result.data.id);
        }
      } else {
        // ❌ VALIDACIÓN FALLIDA
        const detalles = result.detalles || {};
        const faltantes = detalles.faltantes || [];
        const extras = detalles.extras || [];
        
        let mensaje = `❌ El syllabus NO cumple con la estructura requerida\n\n`;
        mensaje += `📊 Coincidencia: ${detalles.porcentaje_coincidencia || 0}%\n`;
        mensaje += `📋 Total requeridos: ${detalles.total_requeridos || 0}\n`;
        mensaje += `✅ Encontrados: ${detalles.encontrados || 0}\n\n`;
        
        if (faltantes.length > 0) {
          mensaje += `❌ Campos Faltantes (${faltantes.length}):\n`;
          faltantes.slice(0, 10).forEach((campo: string) => {
            mensaje += `   • ${campo}\n`;
          });
          if (faltantes.length > 10) {
            mensaje += `   ... y ${faltantes.length - 10} más\n`;
          }
        }
        
        if (extras.length > 0) {
          mensaje += `\n⚠️ Campos Extra (${extras.length}):\n`;
          extras.slice(0, 5).forEach((campo: string) => {
            mensaje += `   • ${campo}\n`;
          });
        }
        
        mensaje += `\n💡 Por favor, revise el documento y asegúrese de que contenga todos los campos requeridos según la plantilla del administrador.`;
        
        alert(mensaje);
      }
    } catch (error: any) {
      console.error('Error en validación:', error);
      alert(`❌ Error al validar el syllabus: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ... resto del código ...
}
```

---

## 📝 PASOS DE IMPLEMENTACIÓN

### Paso 1: Modificar el Editor (archivo `page.tsx`)

1. **Ubicar** el archivo: `app/dashboard/admin/editor-syllabus/page.tsx`

2. **Agregar `user`** a la desestructuración del hook `useAuth`:
   ```typescript
   const { token, getToken, user } = useAuth()
   ```

3. **Modificar `handleSyllabusUpload`** para detectar rol y bifurcar:
   ```typescript
   const handleSyllabusUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (!file) return;
     
     setIsLoading(true);
     
     // Si es comisión académica, usar validación
     if (user?.rol === 'comision_academica') {
       await handleUploadConValidacion(file);
       return;
     }
     
     // Admin continúa con flujo normal
     // ... código existente ...
   };
   ```

4. **Agregar la nueva función** `handleUploadConValidacion` (código completo arriba)

5. **Guardar** y probar

### Paso 2: Crear Plantilla de Referencia (Admin)

Antes de que comisión académica pueda validar, el admin debe:

1. Crear un syllabus completo en el editor
2. Guardar ese syllabus
3. Marcarlo como plantilla usando:
   ```bash
   POST /api/syllabi/{id}/marcar-plantilla
   Body: { "periodo": "Primer Periodo PII 2026" }
   ```

### Paso 3: Probar el Flujo Completo

1. **Login como Comisión Académica**
2. Ir a `/dashboard/admin/editor-syllabus` (misma ruta, pero con diferente comportamiento)
3. Seleccionar un **periodo académico**
4. Hacer clic en "Subir Nuevo Word (.docx)"
5. Seleccionar un archivo Word

**Resultado esperado**:
- Si el Word cumple estructura → ✅ Se guarda y carga en el editor
- Si el Word NO cumple → ❌ Alerta con lista de campos faltantes

---

## 🎨 MEJORA DE UX (Opcional)

### Mostrar Indicador de Validación en la UI

Agregar un badge o mensaje que indique que la comisión académica está usando validación:

```typescript
{user?.rol === 'comision_academica' && (
  <Alert className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Modo Validación Activo</AlertTitle>
    <AlertDescription>
      Los documentos que suba serán validados automáticamente contra la plantilla del administrador
      para el periodo seleccionado. Solo se guardarán si cumplen con todos los campos requeridos.
    </AlertDescription>
  </Alert>
)}
```

### Mostrar Preview de Campos Requeridos

Agregar un botón para ver qué campos son requeridos:

```typescript
<Button 
  variant="outline" 
  onClick={async () => {
    if (!selectedPeriod) {
      alert("Seleccione un periodo primero");
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/syllabi/plantilla/${selectedPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        const campos = data.data.titulos_requeridos || [];
        alert(`📋 Campos Requeridos (${campos.length}):\n\n` + campos.join('\n'));
      }
    } catch (err) {
      alert("Error al obtener plantilla");
    }
  }}
>
  Ver Campos Requeridos
</Button>
```

---

## 🔍 VERIFICACIÓN

### Backend (Ya completado ✅)

```bash
# Verificar que la ruta permite comision_academica
curl http://localhost:4000/api/syllabi/upload-validado \
  -H "Authorization: Bearer <token_comision_academica>" \
  -F "file=@syllabus.docx" \
  -F "nombre=Test" \
  -F "periodo=Primer Periodo PII 2026" \
  -F "materias=Ciencias"
```

### Frontend (Pendiente)

1. Login como comisión académica
2. Ir al editor
3. Subir Word → Debe mostrar alerta de validación

---

## 📚 DOCUMENTOS RELACIONADOS

- `IMPLEMENTACION_VALIDACION_SYLLABUS_COMPLETA.md` - Documentación técnica completa
- `PRUEBAS_VALIDACION_SYLLABUS.md` - Guía de pruebas
- `my-node-backend/src/utils/syllabusValidatorEditor.js` - Código de validación
- `my-node-backend/src/controllers/syllabusController.js` - Endpoint `subirSyllabusConValidacion`

---

## ✅ CHECKLIST

- [ ] Modificar `handleSyllabusUpload` para detectar rol
- [ ] Agregar función `handleUploadConValidacion`
- [ ] Agregar importación de `user` desde `useAuth`
- [ ] Probar como admin (debe funcionar igual que antes)
- [ ] Crear plantilla de referencia (admin)
- [ ] Marcar plantilla para un periodo
- [ ] Probar como comisión académica (debe validar)
- [ ] Probar con Word válido → Debe guardarse
- [ ] Probar con Word inválido → Debe rechazarse
- [ ] Verificar que la alerta muestra campos faltantes

---

## 🆘 TROUBLESHOOTING

### "No existe una plantilla de referencia para el periodo X"

**Causa**: No hay plantilla marcada para ese periodo.

**Solución**:
1. Admin debe crear un syllabus completo
2. Guardarlo en la BD
3. Marcarlo como plantilla con el endpoint

### "La plantilla no contiene configuración del editor"

**Causa**: El syllabus marcado como plantilla no tiene `datos_syllabus`.

**Solución**:
- La plantilla DEBE ser creada en el editor visual del admin
- No puede ser un syllabus subido vía Word

### La validación siempre rechaza

**Causa**: Los campos del Word no coinciden exactamente con los de la plantilla.

**Solución**:
- Revisar logs del backend para ver qué campos busca
- Asegurarse de que el Word tenga títulos en **negrita**
- Los títulos deben coincidir con los `content` de celdas con `isHeader: true` del editor

---

**Fecha**: 11 de Enero de 2026  
**Estado**: Backend completo ✅ | Frontend pendiente ⏳  
**Próximo paso**: Modificar `page.tsx` del editor
