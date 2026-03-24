# Extracción con IA - Google Generative AI (Gemini)

## Descripción

Esta funcionalidad permite extraer automáticamente datos de archivos Excel y Word usando la IA de Google (Gemini). La IA analiza el contenido del documento y extrae las secciones, tablas y metadatos de forma estructurada.

## Configuración

### 1. Obtener API Key de Google AI

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API Key
4. Copia la API Key generada

### 2. Configurar el Backend

Edita el archivo `.env` en la carpeta `my-node-backend` y agrega tu API Key:

```env
GOOGLE_AI_API_KEY=tu_api_key_aqui
```

### 3. Reiniciar el Backend

```bash
cd my-node-backend
npm run dev
```

## Uso

1. Accede al panel de administrador
2. Ve a **Programas Analíticos**
3. Haz clic en el botón **"Extraer con IA"** (color morado)
4. Selecciona un archivo Excel (.xlsx, .xls) o Word (.docx, .doc)
5. Haz clic en **"Extraer Datos con Google AI"**
6. Espera mientras la IA procesa el documento
7. Revisa los datos extraídos:
   - **Metadatos**: Información general (asignatura, período, docente, carrera)
   - **Secciones**: Lista de secciones con su contenido
8. Puedes **copiar** el JSON o **descargar** los datos extraídos

## Características

- ✅ Soporta archivos Excel (.xlsx, .xls)
- ✅ Soporta archivos Word (.docx, .doc)
- ✅ Extracción automática de secciones
- ✅ Detección de tablas y su estructura
- ✅ Identificación de metadatos del documento
- ✅ Exportación a JSON
- ✅ Interfaz visual para revisar resultados

## Endpoints de API

### Extraer con IA
```
POST /api/programa-analitico/ia/extraer
Content-Type: multipart/form-data

Body:
- archivo: File (Excel o Word)

Response:
{
  "success": true,
  "datos": {
    "secciones": [...],
    "metadatos": {...}
  },
  "archivo": {
    "nombre": "archivo.xlsx",
    "tipo": "xlsx",
    "tamaño": 12345
  }
}
```

### Verificar Estado de IA
```
GET /api/programa-analitico/ia/status

Response:
{
  "success": true,
  "configurado": true/false,
  "message": "Estado de la configuración"
}
```

## Solución de Problemas

### Error: "GOOGLE_AI_API_KEY no está configurada"
- Verifica que hayas agregado la API Key en el archivo `.env`
- Reinicia el servidor backend después de agregar la key

### Error: "Error al conectar con Google AI"
- Verifica que tu API Key sea válida
- Asegúrate de tener conexión a internet
- Verifica que no hayas excedido los límites de uso de la API

### Datos extraídos incorrectos
- La IA puede no detectar correctamente algunos formatos
- Intenta con un archivo más estructurado
- Verifica que el documento tenga secciones claramente identificables

## Costos

Google AI ofrece un tier gratuito generoso. Para uso normal de extracción de documentos, generalmente no hay costos. Consulta los [precios de Google AI](https://ai.google.dev/pricing) para más detalles.

## Archivos Relacionados

- Backend Controller: `my-node-backend/src/controllers/iaExtractorController.js`
- Frontend Modal: `components/programa-analitico/ia-extractor-modal.tsx`
- Rutas: `my-node-backend/src/routes/programaAnaliticoRoutes.js`
