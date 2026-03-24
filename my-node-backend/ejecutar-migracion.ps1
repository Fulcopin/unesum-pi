# Script para ejecutar la migración de agrupaciones_titulos
# Windows PowerShell

Write-Host "🚀 Ejecutando migración de agrupaciones_titulos..." -ForegroundColor Cyan

# Variables de conexión (ajusta según tu configuración)
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "neondb"  # Cambia esto por el nombre de tu base de datos
$DB_USER = "postgres"  # Cambia esto por tu usuario

# Ruta al archivo SQL
$SQL_FILE = "migrations\create-agrupaciones-titulos.sql"

# Ejecutar migración
Write-Host "📊 Conectando a la base de datos..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SQL_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migración ejecutada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Verificando tabla creada..." -ForegroundColor Yellow
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d agrupaciones_titulos"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Tabla 'agrupaciones_titulos' creada correctamente!" -ForegroundColor Green
        Write-Host "🎉 Ya puedes reiniciar el backend con: npm run dev" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ Error al ejecutar la migración" -ForegroundColor Red
    Write-Host "Verifica tus credenciales y que PostgreSQL esté corriendo" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Nota: Si la tabla ya existe, puedes ignorar el error" -ForegroundColor Gray
