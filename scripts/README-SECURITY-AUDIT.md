# 🔒 Security Audit & Fix Script

Script automatizado de auditoría y corrección de seguridad para SmartStay Guide Backend.

## 📋 Características

- ✅ Escaneo completo de controladores, guards y servicios
- ✅ Detección automática de vulnerabilidades
- ✅ Correcciones automáticas aplicables
- ✅ Reporte detallado en Markdown y JSON
- ✅ Modo dry-run para análisis sin modificaciones

## 🚀 Uso

### 1. Modo Dry-Run (Solo Análisis)

```bash
npm run security:audit
```

o

```bash
ts-node scripts/security-audit-and-fix.ts
```

Este modo:
- Escanea todos los archivos
- Detecta vulnerabilidades
- Genera reportes
- **NO modifica ningún archivo**

### 2. Modo Apply (Aplicar Correcciones)

```bash
npm run security:fix
```

o

```bash
ts-node scripts/security-audit-and-fix.ts --apply
```

Este modo:
- Escanea todos los archivos
- Detecta vulnerabilidades
- **Aplica correcciones automáticas**
- Genera reportes con cambios aplicados

## 📊 Vulnerabilidades Detectadas

El script detecta:

### 🔴 Críticas
- **AUTHENTICATION_BYPASS**: Endpoints críticos sin validación de token
- **AUTHORIZATION_MISSING**: Endpoints admin sin AdminGuard
- Bypass en guards (return true incondicional)

### 🟡 Altas
- **AUTHENTICATION_MISSING**: Endpoints IoT sin autenticación
- **DATA_ENCRYPTION**: Datos sensibles sin encriptar
- Credenciales en Device.config sin cifrado

### 🟠 Medias
- **DATA_EXPOSURE**: Endpoints públicos exponiendo datos sensibles
- **VALIDATION_MISSING**: Falta validación published=true
- **AUDIT_LOGGING**: Operaciones críticas sin logging

## 🔧 Correcciones Automáticas

### 1. Admin Guard Fix
```typescript
// ANTES
if (!user) {
  return true; // ⚠️ BYPASS
}

// DESPUÉS
if (!user) {
  throw new ForbiddenException('Autenticación requerida');
}
```

### 2. Firebase Guard Fix
```typescript
// ANTES
if (!this.firebaseAuthService.isEnabled()) {
  return true; // ⚠️ BYPASS
}

// DESPUÉS
if (!this.firebaseAuthService.isEnabled()) {
  const devToken = request.headers['x-dev-token'];
  if (process.env.NODE_ENV !== 'production' && devToken === process.env.DEV_BYPASS_TOKEN) {
    request.firebaseUser = { uid: 'demo-user', role: 'DEMO' };
    return true;
  }
  throw new UnauthorizedException('Firebase Auth requerido');
}
```

### 3. Open Lock Endpoint Fix
```typescript
// ANTES
async openLock(slug: string, deviceId: string, token?: string) {
  // Sin validación de token
}

// DESPUÉS
async openLock(slug: string, deviceId: string, token: string) {
  // Validar token contra AccessCredential
  const credential = await this.prisma.accessCredential.findFirst({
    where: { deviceId, validFrom: { lte: now }, validTo: { gte: now }, revoked: false }
  });
  if (!credential) throw new UnauthorizedException('Token inválido');
  
  // Ejecutar y revocar token (one-time use)
  await this.prisma.accessCredential.update({
    where: { id: credential.id },
    data: { revoked: true }
  });
}
```

### 4. IoT Controller Guards
```typescript
// ANTES
@Post('/open-door')
async openDoor(@Body() dto: OpenDoorDto) { }

// DESPUÉS
@UseGuards(FirebaseAuthGuard)
@Post('/open-door')
async openDoor(@Body() dto: OpenDoorDto) { }
```

### 5. Published Validation
```typescript
// ANTES
const unit = await this.prisma.unit.findUnique({ where: { slug } });

// DESPUÉS
const unit = await this.prisma.unit.findUnique({ where: { slug } });
if (!unit || !unit.published) {
  throw new NotFoundException('Apartment not found');
}
```

## 📄 Reportes Generados

### SECURITY-AUDIT-REPORT.md
Reporte completo en Markdown con:
- Resumen de vulnerabilidades
- Detalle por categoría
- Código vulnerable y corrección sugerida
- Estado de corrección (aplicada/pendiente/manual)
- Recomendaciones adicionales

### security-audit-report.json
Reporte en JSON para procesamiento automatizado:
```json
{
  "timestamp": "2026-01-18T...",
  "filesScanned": 25,
  "endpointsAnalyzed": 50,
  "issuesFound": [...],
  "issuesFixed": [...],
  "summary": {
    "critical": 3,
    "high": 5,
    "medium": 6,
    "low": 0
  }
}
```

## 🛡️ Categorías de Vulnerabilidades

| Categoría | Descripción | Severidad Típica |
|-----------|-------------|------------------|
| AUTHENTICATION_BYPASS | Bypass de autenticación | 🔴 Crítica |
| AUTHORIZATION_MISSING | Falta de autorización | 🔴 Crítica |
| AUTHENTICATION_MISSING | Sin autenticación | 🟡 Alta |
| DATA_ENCRYPTION | Datos sin encriptar | 🟡 Alta |
| DATA_EXPOSURE | Exposición de datos sensibles | 🟠 Media |
| VALIDATION_MISSING | Validaciones faltantes | 🟠 Media |
| AUDIT_LOGGING | Falta de logging | 🟠 Media |

## 📋 Checklist Pre-Producción

Antes de desplegar a producción, verificar:

- [ ] Ejecutar `npm run security:audit` y resolver issues críticos/altos
- [ ] Aplicar correcciones: `npm run security:fix`
- [ ] Validar que `FIREBASE_ENABLED=true` en producción
- [ ] Configurar `DEV_BYPASS_TOKEN` solo en desarrollo
- [ ] Implementar rate limiting (ThrottlerModule)
- [ ] Configurar helmet para headers de seguridad
- [ ] Habilitar CORS solo para dominios permitidos
- [ ] Configurar logging estructurado (Winston)
- [ ] Implementar monitoreo (Sentry/DataDog)
- [ ] Habilitar 2FA para cuentas admin

## 🔄 Integración CI/CD

### GitHub Actions

```yaml
name: Security Audit

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run security:audit
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: SECURITY-AUDIT-REPORT.md
```

## 📞 Soporte

Para problemas o sugerencias, consultar:
- [AUDITORIA-BACKEND.md](../AUDITORIA-BACKEND.md) - Auditoría completa manual
- [FASES_7-10_SUMMARY.md](../FASES_7-10_SUMMARY.md) - Documentación de módulos

## 📝 Licencia

Uso interno - SmartStay Guide Backend
