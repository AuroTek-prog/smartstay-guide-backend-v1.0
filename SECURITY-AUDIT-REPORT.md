# 🔒 Security Audit Report - SmartStay Guide Backend

**Fecha:** 18/1/2026, 13:17:36
**Archivos escaneados:** 31
**Endpoints analizados:** 50

## 📊 Resumen

| Severidad | Total | Corregidos |
|-----------|-------|------------|
| 🔴 Crítico | 1 | 0 |
| 🟡 Alto | 1 | 0 |
| 🟠 Medio | 0 | 0 |
| 🟢 Bajo | 0 | 0 |

## 🔍 Vulnerabilidades Detectadas

### 🔓 AUTHENTICATION_MISSING

**🟡 HIGH** - iot.controller.ts:54

Endpoint IoT sin autenticación

```typescript
@Get('/device/:deviceId/status')
```

**Corrección sugerida:**

```typescript
@UseGuards(FirebaseAuthGuard, AdminGuard)
```

⏳ **Auto-corregible** (ejecutar con --apply)

---

### 🚨 AUTHENTICATION_BYPASS

**🔴 CRITICAL** - public-api.controller.ts:37

Endpoint open-lock público sin validación de token

```typescript
@ApiOperation({ summary: 'Get recommendations (partners) for apartment' })
  async getRecommendations(@Param('slug') slug: string) {
    return this.publicApiService.getRecommendations(slug);
  }

  @Post('actions/open-lock')
  @ApiOperation({ summary: 'Open lock device (requires valid one-time token)' })
  async openLock(
    @Body() body: { slug: string; deviceId: string; token: string },
    @Req() request: Request,
```

**Corrección sugerida:**

```typescript
// SECURITY FIX: Validación completa de token
async openLock(slug: string, deviceId: string, token: string, ip?: string) {
  // 1. Validar token temporal
  const credential = await this.prisma.accessCredential.findFirst({
    where: {
      deviceId,
      validFrom: { lte: new Date() },
      validTo: { gte: new Date() },
      revoked: false,
    },
  });

  if (!credential) {
    await this.logUnauthorizedAccess(slug, deviceId, ip);
    throw new UnauthorizedException('Token inválido o expirado');
  }

  // 2. Validar asociación device ↔ apartment
  const device = await this.prisma.device.findFirst({
    where: {
      id: deviceId,
      unit: { slug, published: true },
      active: true,
    },
    include: { unit: true },
  });

  if (!device) {
    throw new NotFoundException('Device not found for this apartment');
  }

  // 3. Ejecutar apertura
  const result = await this.iotService.openLock(device);

  // 4. Revocar token (one-time use)
  await this.prisma.accessCredential.update({
    where: { id: credential.id },
    data: { revoked: true },
  });

  return result;
}

private async logUnauthorizedAccess(slug: string, deviceId: string, ip: string) {
  await this.prisma.accessLog.create({
    data: {
      unitId: (await this.prisma.unit.findUnique({ where: { slug } }))?.id,
      deviceId,
      success: false,
      message: 'Intento no autorizado',
      metadata: { ip, timestamp: new Date() },
    },
  });
}
```

⏳ **Auto-corregible** (ejecutar con --apply)

---

## ✅ Correcciones Aplicadas

No se aplicaron correcciones (ejecutado en modo dry-run).
Para aplicar correcciones: `ts-node scripts/security-audit-and-fix.ts --apply`


## 📋 Recomendaciones Adicionales


### 1. Rate Limiting
Implementar rate limiting global usando @nestjs/throttler:
```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
})
```

### 2. Helmet para Headers de Seguridad
```typescript
import helmet from 'helmet';
app.use(helmet());
```

### 3. Validación Global de DTOs
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### 4. Sistema de Tokens Temporales
Implementar generación de tokens con hash SHA-256 para apertura de cerraduras.

### 5. Logging Estructurado
Migrar a Winston para logging en producción con rotación de archivos.

### 6. Monitoring y Alertas
Integrar Sentry para error tracking y alertas en tiempo real.

### 7. 2FA para Admins
Implementar autenticación de dos factores con TOTP (Google Authenticator).

### 8. Circuit Breaker para IoT
Implementar circuit breaker para providers externos y evitar cascading failures.
