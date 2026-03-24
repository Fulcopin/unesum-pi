# Sistema de Extracción de Syllabus desde Documentos Word

## Descripción

Este sistema permite subir un documento Word (.docx) de un syllabus y extraer automáticamente los títulos y contenido del documento para guardarlos en la base de datos de forma estructurada.

## Características

### Backend (Node.js + Express)

1. **Endpoint de Carga**: `POST /api/syllabi/upload`
   - Acepta archivos Word (.docx)
   - Requiere autenticación (token JWT)
   - Autorizado para roles: `profesor` y `administrador`

2. **Extracción de Títulos**
   - Detecta automáticamente los títulos del documento basándose en:
     - Líneas que terminan con ":"
     - Texto en mayúsculas (títulos cortos)
     - Formato numerado (ej: "1. TÍTULO")
   
3. **Estructura de Datos Guardada**
   ```json
   {
     "titulos": ["TÍTULO 1", "TÍTULO 2", ...],
     "contenido": {
       "TÍTULO 1": "Contenido del título 1...",
       "TÍTULO 2": "Contenido del título 2..."
     },
     "texto_completo": "Todo el texto del documento",
     "fecha_extraccion": "2025-11-16T..."
   }
   ```

### Frontend (Next.js + React)

1. **Página de Carga**: `/dashboard/admin/syllabus/subir-documento`
   - Formulario para subir documento Word
   - Campos requeridos:
     - Nombre del Syllabus
     - Periodo Académico
     - Materias (separadas por coma)
     - Archivo Word (.docx)

2. **Validaciones**
   - Solo acepta archivos .doc y .docx
   - Muestra vista previa del archivo seleccionado
   - Feedback visual del proceso de carga

3. **Resultado**
   - Muestra el ID del syllabus creado
   - Lista los títulos extraídos
   - Botones para ver el syllabus o subir otro documento

## Flujo de Uso

1. El usuario accede a "Gestión de Syllabus"
2. Click en "Subir Documento Word"
3. Completa el formulario:
   - Nombre del syllabus
   - Periodo académico
   - Materias
   - Selecciona el archivo .docx
4. Click en "Subir y Procesar Documento"
5. El sistema:
   - Sube el archivo al servidor
   - Lee el contenido con la librería `mammoth`
   - Extrae los títulos del documento
   - Guarda todo en la base de datos (campo JSONB)
   - Elimina el archivo temporal
6. Muestra el resultado con los títulos extraídos
7. El usuario puede ver el syllabus completo o subir otro

## Tecnologías Utilizadas

### Backend
- **mammoth**: Librería para leer archivos .docx
- **multer**: Manejo de archivos multipart/form-data
- **Sequelize**: ORM para PostgreSQL
- **PostgreSQL**: Base de datos con soporte JSONB

### Frontend
- **Next.js 14**: Framework React
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos
- **shadcn/ui**: Componentes UI

## Estructura de Base de Datos

### Tabla: `syllabi`

```sql
CREATE TABLE syllabi (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  periodo TEXT NOT NULL,
  materias TEXT NOT NULL,
  datos_syllabus JSONB NOT NULL,  -- Aquí se guardan los títulos y contenido
  usuario_id BIGINT REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP  -- Soft delete
);
```

## Mejoras Futuras

1. **Reconocimiento de Formato**
   - Detectar estilos de Word (Título 1, Título 2, etc.)
   - Extraer tablas y listas
   - Mantener formato de negritas, cursivas

2. **Validación de Contenido**
   - Verificar que el documento tenga las secciones requeridas
   - Validar completitud del syllabus

3. **Plantillas**
   - Sistema de plantillas predefinidas
   - Validación contra plantillas
   - Mapeo automático de campos

4. **Previsualización**
   - Mostrar vista previa antes de guardar
   - Permitir editar títulos extraídos
   - Reorganizar secciones

5. **Exportación**
   - Generar PDF desde los datos guardados
   - Exportar a diferentes formatos
   - Plantillas de impresión

## Instalación

### Backend

```bash
cd my-node-backend
npm install mammoth
```

### Frontend

No requiere instalación adicional (usa fetch nativo)

## Configuración

Asegúrate de que el backend esté corriendo en `http://localhost:4000` o actualiza la URL en:
- `app/dashboard/admin/syllabus/subir-documento/page.tsx`

## Uso de la API

### Subir Documento

```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('nombre', 'Nombre del Syllabus');
formData.append('periodo', '2025-1');
formData.append('materias', 'Programación, Web');

const response = await fetch('http://localhost:4000/api/syllabi/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
// result.data contiene el syllabus creado con los títulos extraídos
```

## Solución de Problemas

### Error: "No se ha proporcionado ningún archivo"
- Verifica que estés enviando el archivo con el nombre de campo 'file'

### Error: "Error al procesar el documento"
- Verifica que el archivo sea un .docx válido
- Algunos documentos muy antiguos (.doc) pueden no ser compatibles

### Los títulos no se extraen correctamente
- El algoritmo busca patrones específicos
- Considera ajustar la lógica de detección en `syllabusController.js`
- Puedes personalizar la expresión regular para tu formato específico

## Soporte

Para problemas o sugerencias, contacta al equipo de desarrollo.
