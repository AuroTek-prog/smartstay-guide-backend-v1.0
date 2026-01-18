#!/usr/bin/env pwsh
# Script temporal para aplicar migración FASE 1

Write-Host "Aplicando migración FASE 1..." -ForegroundColor Green

# Ejecutar migración con confirmación automática
$env:PRISMA_MIGRATE_SKIP_GENERATE = "false"
npx prisma migrate dev --name fase1_extend_schema_aurotek

Write-Host "Migración completada" -ForegroundColor Green
