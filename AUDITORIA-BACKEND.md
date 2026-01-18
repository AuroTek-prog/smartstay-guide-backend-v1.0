# 🔍 Auditoría Backend - SmartStay Guide Platform

**Fecha:** 18 de enero de 2026  
**Plataforma:** AuroTek-Guest / SmartStay Guide Backend  
**Stack:** NestJS 10.4.4 + Prisma 7.2.0 + PostgreSQL 18  
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)

---

## 📋 Resumen Ejecutivo

### ✅ Fortalezas Identificadas
- ✅ **Arquitectura modular** bien estructurada con separación de responsabilidades
- ✅ **Feature flags** correctamente implementados para todas las integraciones críticas
- ✅ **Logging completo** en ActivityLog, AccessLog y BillingHistory
- ✅ **Encriptación opcional** con AES-256-CBC para datos sensibles
- ✅ **Multi-schema PostgreSQL** con separación lógica (core, geo, units, devices, partners, billing)
- ✅ **Guards personalizados** para autenticación y roles
- ✅ **Factory pattern** para providers IoT (escalable)

### ⚠️ Riesgos Críticos Detectados
1. 🔴 **Endpoint público sin validación de token** para apertura de cerraduras
2. 🔴 **AdminGuard permite acceso sin autenticación** en modo demo
3. 🟡 **Falta de validación de `published=true`** en endpoints públicos
4. 🟡 **Exposición de datos sensibles** sin verificación granular de permisos
5. 🟡 **Falta de rate limiting** en endpoints críticos (open-lock, billing webhooks)
6. 🟡 **Validación de ownership** inconsistente entre módulos

---

## 🔐 Módulo: Autenticación (Firebase Auth)

### Observaciones

#### ✅ Aspectos Positivos
- **Feature flag funcional:** `FIREBASE_ENABLED` permite deshabilitar auth en desarrollo
- **FirebaseAuthGuard** correctamente implementado con Reflector
- **@OptionalAuth decorator** permite endpoints híbridos
- **Token verification** delegada a Firebase Admin SDK
- **User injection** en request para uso posterior (`request.firebaseUser`)

#### 🔴 Riesgos de Seguridad

**1. FirebaseAuthGuard permite acceso sin token cuando Firebase está deshabilitado**

```typescript
// src/modules/firebase-auth/firebase-auth.guard.ts:23-27
if (!this.firebaseAuthService.isEnabled()) {
  this.logger.debug('Firebase deshabilitado, permitiendo acceso sin auth');
  return true; // ⚠️ RIESGO: Cualquier endpoint con @UseGuards(FirebaseAuthGuard) es accesible
}
```

**Impacto:** En desarrollo/testing con `FIREBASE_ENABLED=false`, todos los endpoints protegidos con `FirebaseAuthGuard` son accesibles sin autenticación.

**Afectados:**
- ManagerController (CRUD apartamentos)
- BillingController (historial de pagos)
- AdminController (gestión usuarios) - *mitigado parcialmente por AdminGuard*

**Recomendación:**
```typescript
// Opción 1: Requerir un token de bypass en modo desarrollo
if (!this.firebaseAuthService.isEnabled()) {
  const devToken = request.headers['x-dev-token'];
  if (devToken !== process.env.DEV_BYPASS_TOKEN) {
    throw new UnauthorizedException('Dev token requerido');
  }
  return true;
}

// Opción 2: Inyectar usuario demo con permisos limitados
if (!this.firebaseAuthService.isEnabled()) {
  request.firebaseUser = {
    uid: 'demo-user',
    email: 'demo@smartstay.com',
    role: 'DEMO',
  };
  return true;
}
```

**2. AdminGuard permite acceso sin usuario en modo demo**

```typescript
// src/modules/admin/guards/admin.guard.ts:20-24
if (!user) {
  // CHANGE: En modo demo sin auth, permitir acceso
  return true; // ⚠️ RIESGO CRÍTICO: Cualquiera puede acceder a endpoints admin
}
```

**Impacto:** 
- Endpoint `/api/admin/users` (crear/modificar/eliminar usuarios) accesible sin autenticación
- Endpoint `/api/admin/stats` (estadísticas globales) expuesto públicamente
- Posible escalada de privilegios creando usuarios ADMIN

**Recomendación:**
```typescript
canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const user = request.firebaseUser || request.user;

  // NUNCA permitir acceso sin usuario en AdminGuard
  if (!user) {
    throw new ForbiddenException('Autenticación requerida para acceso admin');
  }

  if (user.role !== 'ADMIN') {
    throw new ForbiddenException('Requiere rol ADMIN');
  }

  return true;
}
```

#### 🟡 Mejoras Sugeridas

**1. Implementar decorador @RequireRole**
```typescript
// src/modules/firebase-auth/decorators/require-role.decorator.ts
export const RequireRole = (...roles: string[]) => 
  applyDecorators(SetMetadata('roles', roles), UseGuards(FirebaseAuthGuard, RolesGuard));

// Uso:
@RequireRole('ADMIN', 'MANAGER')
@Get('sensitive-data')
async getSensitiveData() {}
```

**2. Validar roles contra base de datos**
Actualmente el role solo existe en el objeto `firebaseUser` inyectado. Debería validarse contra `User.role` en Prisma.

---

## 🏢 Módulo: Manager (CRUD Apartamentos)

### Observaciones

#### ✅ Aspectos Positivos
- **ActivityLog completo** en todas las operaciones (create, update, delete, publish)
- **Encriptación de accessCode** con EncryptionService (AES-256-CBC)
- **Soft delete** en lugar de eliminación física (`published=false`)
- **Validación de ownership** mediante `getUserCompanyId()`
- **DTOs bien definidos** con class-validator

#### 🔴 Riesgos de Seguridad

**1. Validación de ownership puede omitirse en modo demo**

```typescript
// src/modules/manager/manager.service.ts:33-42
const userCompanies = await this.prisma.userCompany.findMany({
  where: { userId },
  select: { companyId: true },
});

if (!userCompanies || userCompanies.length === 0) {
  // ⚠️ RIESGO: Sin Firebase Auth, userId='demo-user' puede no tener compañías
  throw new ForbiddenException('Usuario no asociado a ninguna compañía');
}
```

**Impacto:** En desarrollo sin Firebase Auth, el usuario `demo-user` puede no tener compañías asociadas, bloqueando testing.

**Recomendación:**
```typescript
if (!userCompanies || userCompanies.length === 0) {
  // Crear compañía demo si no existe
  if (userId === 'demo-user' && process.env.NODE_ENV !== 'production') {
    const demoCompany = await this.ensureDemoCompany();
    return demoCompany.id;
  }
  throw new ForbiddenException('Usuario no asociado a ninguna compañía');
}
```

**2. Endpoint GET /apartments/:id/secrets expone datos sensibles**

```typescript
// src/modules/manager/manager.controller.ts:66-77
@Get(':id/secrets')
async getSecrets(@CurrentUser() user: any, @Param('id') apartmentId: string) {
  const userId = user?.uid || 'demo-user';
  return this.managerService.getApartmentSecrets(userId, apartmentId);
}
```

**Problema:** 
- El accessCode se retorna **desencriptado** en plain text
- No hay validación adicional más allá de ownership (companyId)
- No se registra en ActivityLog el acceso a datos sensibles

**Recomendación:**
```typescript
async getApartmentSecrets(userId: string, apartmentId: string, reason?: string) {
  // ... validaciones existentes ...

  // AGREGAR: Registrar acceso a datos sensibles
  await this.prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'VIEW_SECRETS',
      targetEntity: 'APARTMENT',
      targetId: apartmentId,
      metadata: { reason: reason || 'API_REQUEST', ip: requestIp },
    },
  });

  // AGREGAR: Ofuscar parcialmente el código
  const maskedCode = decryptedAccessCode?.replace(/./g, (c, i) => 
    i < decryptedAccessCode.length - 2 ? '*' : c
  );

  return {
    ...apartment,
    accessCode: decryptedAccessCode, // Solo para usuarios con permiso explícito
    accessCodeMasked: maskedCode,
  };
}
```

#### 🟡 Mejoras Sugeridas

**1. Validar que published=true solo se puede setear con permisos admin**
```typescript
// En updateApartment()
if (dto.published === true && user.role !== 'ADMIN') {
  throw new ForbiddenException('Solo administradores pueden publicar apartamentos');
}
```

**2. Implementar auditoría de cambios (diff)**
```typescript
await this.prisma.activityLog.create({
  data: {
    // ... campos existentes ...
    metadata: {
      changes: {
        before: { name: apartment.name, published: apartment.published },
        after: { name: dto.name, published: dto.published },
      },
    },
  },
});
```

---

## 🌐 Módulo: Public API (Endpoints Públicos)

### Observaciones

#### ✅ Aspectos Positivos
- **Endpoint `/api/public/guide/:slug`** genera guías dinámicas completas
- **Filtrado por zona** para partners (visibilidad geográfica)
- **OrderBy isTop** prioriza partners destacados
- **Media filtering** por purpose (portada, gallery)

#### 🔴 Riesgos de Seguridad CRÍTICOS

**1. Endpoint `/api/public/actions/open-lock` EXPUESTO SIN AUTENTICACIÓN**

```typescript
// src/modules/public-api/public-api.controller.ts:36-40
@Post('actions/open-lock')
@ApiOperation({ summary: 'Open lock device (requires token)' })
async openLock(@Body() body: { slug: string; deviceId: string; token?: string }) {
  return this.publicApiService.openLock(body.slug, body.deviceId, body.token);
}
```

```typescript
// src/modules/public-api/public-api.service.ts:171-210
async openLock(slug: string, deviceId: string, token?: string) {
  // VALIDACIÓN INEXISTENTE: ⚠️ RIESGO CRÍTICO
  // 1. No valida el token contra ninguna fuente
  // 2. No verifica que el usuario tenga permisos sobre el apartment
  // 3. No valida que deviceId pertenezca al apartment slug

  const device = await this.prisma.device.findUnique({
    where: { id: deviceId },
    include: { unit: true },
  });

  if (!device) {
    throw new NotFoundException('Device not found');
  }

  // TODO: Validar token temporal contra AccessCredential
  // ⚠️ PENDIENTE: Sin validación, cualquiera puede abrir la cerradura

  const result = await this.iotService.openLock(device);
  return result;
}
```

**Impacto:** 
- **Cualquier persona con deviceId puede abrir cerraduras** sin autenticación
- **No hay rate limiting**: Ataques de fuerza bruta posibles
- **No se valida el token**: El parámetro `token` es decorativo
- **Sin geofencing**: Aperturas remotas no autorizadas

**Recomendación URGENTE:**
```typescript
async openLock(slug: string, deviceId: string, token: string, ip?: string) {
  // 1. VALIDAR TOKEN TEMPORAL
  const credential = await this.prisma.accessCredential.findFirst({
    where: {
      deviceId,
      validFrom: { lte: new Date() },
      validTo: { gte: new Date() },
      revoked: false,
      // Agregar campo tokenHash para validación
      tokenHash: this.hashToken(token),
    },
  });

  if (!credential) {
    // Log intento no autorizado
    await this.logUnauthorizedAccess(slug, deviceId, ip);
    throw new UnauthorizedException('Token inválido o expirado');
  }

  // 2. VALIDAR ASOCIACIÓN device ↔ apartment
  const device = await this.prisma.device.findFirst({
    where: {
      id: deviceId,
      unit: { slug },
      active: true,
    },
    include: { unit: true },
  });

  if (!device) {
    throw new NotFoundException('Device not found for this apartment');
  }

  // 3. RATE LIMITING (implementar con Redis)
  const rateLimitKey = `lock:${deviceId}:${ip}`;
  const attempts = await redis.incr(rateLimitKey);
  await redis.expire(rateLimitKey, 60); // 1 minuto

  if (attempts > 3) {
    throw new TooManyRequestsException('Too many attempts. Try again later.');
  }

  // 4. GEOFENCING (opcional)
  if (device.unit.lat && device.unit.lng) {
    const distance = this.calculateDistance(ip, device.unit.lat, device.unit.lng);
    if (distance > 500) { // 500 metros
      throw new ForbiddenException('Debes estar cerca del apartamento');
    }
  }

  // 5. EJECUTAR APERTURA Y REGISTRAR
  const result = await this.iotService.openLock(device);

  // 6. REVOCAR TOKEN (one-time use)
  await this.prisma.accessCredential.update({
    where: { id: credential.id },
    data: { revoked: true },
  });

  return result;
}
```

**2. Falta validación `published=true` en endpoints públicos**

```typescript
// src/modules/public-api/public-api.service.ts:13-15
const unit = await this.prisma.unit.findUnique({
  where: { slug },
  // ⚠️ FALTA: where: { slug, published: true }
  include: { ... }
});
```

**Impacto:** Apartamentos no publicados son accesibles vía API pública.

**Recomendación:**
```typescript
const unit = await this.prisma.unit.findUnique({
  where: { slug },
  include: { ... },
});

if (!unit || !unit.published) {
  throw new NotFoundException('Apartment not found');
}
```

#### 🟡 Mejoras Sugeridas

**1. Implementar sistema de tokens temporales**
```typescript
// Generar token temporal al hacer check-in
async generateAccessToken(apartmentId: string, validHours: number = 24) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await this.prisma.accessCredential.create({
    data: {
      deviceId: apartmentId, // O deviceId específico
      tokenHash,
      validFrom: new Date(),
      validTo: new Date(Date.now() + validHours * 60 * 60 * 1000),
      revoked: false,
    },
  });

  return token; // Enviar por email/SMS al huésped
}
```

**2. Logging de intentos de acceso no autorizados**
```typescript
async logUnauthorizedAccess(slug: string, deviceId: string, ip: string) {
  await this.prisma.accessLog.create({
    data: {
      unitId: (await this.prisma.unit.findUnique({ where: { slug } }))?.id,
      deviceId,
      success: false,
      message: 'Intento no autorizado',
      metadata: { ip, timestamp: new Date() },
    },
  });

  // Alerta a manager si hay múltiples intentos
  const recentAttempts = await this.prisma.accessLog.count({
    where: {
      deviceId,
      success: false,
      timestamp: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // 10 min
    },
  });

  if (recentAttempts >= 5) {
    await this.emailService.sendAccessFailedAlert(slug, 'Múltiples intentos no autorizados');
  }
}
```

---

## 🔌 Módulo: IoT (Apertura de Cerraduras)

### Observaciones

#### ✅ Aspectos Positivos
- **Factory pattern** permite agregar providers sin modificar código base
- **AccessLog registration** en todas las operaciones
- **6 providers soportados:** Raixer, Shelly, Sonoff, Home Assistant, Nuki, Generic
- **Feature flags** para cada provider
- **Retry logic** en RaixerProvider
- **Interface común** `IoTProviderInterface` garantiza consistencia

#### 🟡 Riesgos de Seguridad

**1. IoTController sin guards**

```typescript
// src/modules/iot/iot.controller.ts:29-40
@Post('/open-door')
@HttpCode(HttpStatus.OK)
async openDoor(@Body() dto: OpenDoorDto) {
  // ⚠️ SIN GUARD: Endpoint accesible sin autenticación
  const result = await this.iotService.openLockByDeviceId(dto.deviceId);
  return result;
}
```

**Impacto:** Endpoint de testing expuesto en producción.

**Recomendación:**
```typescript
@Post('/open-door')
@UseGuards(FirebaseAuthGuard, AdminGuard) // Solo admins
@ApiBearerAuth()
async openDoor(@Body() dto: OpenDoorDto, @CurrentUser() user: any) {
  this.logger.warn(`[MANUAL OPEN] Admin ${user.uid} abriendo ${dto.deviceId}`);
  const result = await this.iotService.openLockByDeviceId(dto.deviceId);
  return result;
}
```

**2. Providers almacenan credenciales en config JSON sin encriptar**

```typescript
// src/modules/iot/providers/generic.provider.ts:37-61
async openDoor(deviceId: string, config?: any) {
  // config puede contener: { auth: { token, password, apiKey } }
  // ⚠️ RIESGO: Almacenado en Device.config sin encriptar
  const client = this.createClient(config);
}
```

**Recomendación:**
```typescript
// Encriptar Device.config al guardar
const encryptedConfig = this.encryptionService.encrypt(JSON.stringify(config));
await this.prisma.device.update({
  where: { id: deviceId },
  data: { config: encryptedConfig },
});

// Desencriptar al leer
const decryptedConfig = JSON.parse(
  this.encryptionService.decrypt(device.config as string)
);
```

#### 🟡 Mejoras Sugeridas

**1. Implementar circuit breaker para providers externos**
```typescript
// Para evitar intentos repetidos cuando un provider está caído
class CircuitBreaker {
  async execute(fn: () => Promise<any>) {
    if (this.isOpen()) {
      throw new ServiceUnavailableException('Provider temporalmente no disponible');
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

**2. Agregar telemetría de providers**
```typescript
await this.prisma.deviceMetrics.create({
  data: {
    deviceId,
    provider: device.provider,
    action: 'OPEN_LOCK',
    success: result.success,
    responseTime: Date.now() - startTime,
    errorCode: result.errorCode,
  },
});
```

---

## 💳 Módulo: Billing (Stripe Integration)

### Observaciones

#### ✅ Aspectos Positivos
- **Webhook signature validation** con `stripe.webhooks.constructEvent()`
- **BillingHistory completo** para todos los eventos Stripe
- **Feature flag** `STRIPE_ENABLED` y `STRIPE_TEST_MODE`
- **Idempotency** usando `stripe.idempotencyKey`
- **Error handling** robusto en webhooks

#### 🔴 Riesgos de Seguridad

**1. Webhook endpoint sin rate limiting**

```typescript
// src/modules/billing/billing.controller.ts:40-75
@Post('webhook')
@HttpCode(HttpStatus.OK)
async handleStripeWebhook(
  @Req() req: RawBodyRequest<Request>,
  @Headers('stripe-signature') signature: string,
) {
  // ⚠️ SIN RATE LIMITING: Ataques DDoS posibles
  return this.webhookService.handleWebhook(req.rawBody, signature);
}
```

**Recomendación:**
```typescript
// Implementar rate limiting con @nestjs/throttler
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests por minuto
@Post('webhook')
async handleStripeWebhook(...)
```

**2. Manejo de eventos duplicados**

Stripe puede enviar el mismo webhook múltiples veces. Actualmente no hay deduplicación.

**Recomendación:**
```typescript
// Antes de procesar el evento
const existingEvent = await this.prisma.stripeWebhookEvent.findUnique({
  where: { eventId: event.id },
});

if (existingEvent) {
  this.logger.log(`Evento duplicado ignorado: ${event.id}`);
  return { received: true };
}

// Marcar como procesado
await this.prisma.stripeWebhookEvent.create({
  data: { eventId: event.id, type: event.type, processedAt: new Date() },
});
```

#### 🟡 Mejoras Sugeridas

**1. Agregar notificaciones de eventos críticos**
```typescript
// En handlePaymentIntentSucceeded()
await this.emailService.sendPaymentConfirmation(
  customer.email,
  paymentIntent.amount / 100,
  paymentIntent.currency
);
```

**2. Implementar refunds automáticos para cancelaciones**
```typescript
async handleCancellation(apartmentId: string) {
  const lastPayment = await this.prisma.billingHistory.findFirst({
    where: { 
      targetId: apartmentId,
      status: 'completed',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (lastPayment && this.isRefundable(lastPayment)) {
    await stripe.refunds.create({
      payment_intent: lastPayment.stripePaymentIntentId,
      reason: 'requested_by_customer',
    });
  }
}
```

---

## 👨‍💼 Módulo: Admin (Panel de Administración)

### Observaciones

#### ✅ Aspectos Positivos
- **bcrypt password hashing** (10 rounds) para usuarios con contraseña
- **Soft delete** de usuarios (`active=false`)
- **ActivityLog** en todas las operaciones admin
- **Role validation** con AdminGuard

#### 🔴 Riesgos de Seguridad

**1. AdminGuard permite bypass completo (ya mencionado arriba)**

**2. Endpoint POST /api/admin/users permite escalada de privilegios**

```typescript
// src/modules/admin/admin.service.ts:49-77
async createUser(adminId: string, data: CreateUserDto) {
  // ⚠️ RIESGO: Cualquier admin puede crear otros admins
  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await this.prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: data.role, // ← Permite crear role='ADMIN'
      active: true,
    },
  });
}
```

**Recomendación:**
```typescript
// Solo SUPER_ADMIN puede crear otros ADMIN
if (data.role === 'ADMIN') {
  const adminUser = await this.prisma.user.findUnique({
    where: { id: adminId },
    select: { role: true },
  });

  if (adminUser?.role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Solo SUPER_ADMIN puede crear administradores');
  }
}
```

**3. GET /api/admin/stats expone métricas sensibles**

```typescript
// src/modules/admin/admin.service.ts:181-231
async getStats() {
  // ⚠️ Retorna datos sensibles sin filtrado por compañía
  const [totalUsers, totalCompanies, totalApartments, recentActivity] = 
    await Promise.all([...]);

  return { totalUsers, totalCompanies, totalApartments, recentActivity };
}
```

**Impacto:** Admin de una compañía puede ver estadísticas globales de todas las compañías.

**Recomendación:**
```typescript
async getStats(adminId: string) {
  const admin = await this.prisma.user.findUnique({ where: { id: adminId } });

  // Si no es SUPER_ADMIN, filtrar por su compañía
  if (admin.role !== 'SUPER_ADMIN') {
    const companyId = await this.getUserCompanyId(adminId);
    return this.getCompanyStats(companyId);
  }

  // SUPER_ADMIN ve todo
  return this.getGlobalStats();
}
```

#### 🟡 Mejoras Sugeridas

**1. Implementar 2FA para cuentas admin**
```typescript
async enableTwoFactor(userId: string) {
  const secret = speakeasy.generateSecret();
  await this.prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret.base32 },
  });
  return { qrCode: secret.otpauth_url };
}
```

**2. Auditoría de cambios en usuarios**
```typescript
await this.prisma.activityLog.create({
  data: {
    userId: adminId,
    action: 'UPDATE_USER',
    targetEntity: 'USER',
    targetId: user.id,
    metadata: {
      changes: {
        role: { old: oldRole, new: newRole },
        active: { old: oldActive, new: newActive },
      },
    },
  },
});
```

---

## 📧 Módulo: Email (Notificaciones)

### Observaciones

#### ✅ Aspectos Positivos
- **Stub implementation** funcional para testing
- **Feature flag** `EMAIL_ENABLED` previene envíos accidentales
- **Métodos tipados** para diferentes tipos de notificaciones

#### 🟡 Riesgos de Seguridad

**1. Sin validación de email addresses**

```typescript
// src/modules/email/email.service.ts:25-38
async sendApartmentConfirmation(email: string, apartmentData: any) {
  // ⚠️ RIESGO: email no validado, posible email injection
  if (!this.enabled) {
    this.logger.debug(`[EMAIL SKIP] Confirmación a ${email}`);
    return { sent: false };
  }
}
```

**Recomendación:**
```typescript
private validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async sendApartmentConfirmation(email: string, apartmentData: any) {
  if (!this.validateEmail(email)) {
    throw new BadRequestException('Email inválido');
  }
  // ...
}
```

**2. Sin rate limiting para notificaciones**

Posible spam si un atacante obtiene acceso a endpoints que disparan emails.

**Recomendación:**
```typescript
// Implementar cola de emails con Bull
@InjectQueue('email')
private emailQueue: Queue;

async sendApartmentConfirmation(email: string, apartmentData: any) {
  await this.emailQueue.add('send-confirmation', {
    email,
    apartmentData,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}
```

#### 🟡 Mejoras Sugeridas

**1. Implementar templates HTML**
```typescript
async sendApartmentConfirmation(email: string, apartmentData: any) {
  const template = await this.renderTemplate('apartment-confirmation', {
    apartmentName: apartmentData.name,
    checkInDate: apartmentData.checkIn,
    accessCode: apartmentData.accessCode, // ⚠️ Ofuscar parcialmente
  });

  await this.sendEmail(email, 'Confirmación de Reserva', template);
}
```

**2. Tracking de emails enviados**
```typescript
await this.prisma.emailLog.create({
  data: {
    recipient: email,
    type: 'CONFIRMATION',
    status: 'SENT',
    provider: this.provider,
    messageId: result.messageId,
  },
});
```

---

## 📊 Módulo: Analytics

### Observaciones

#### ✅ Aspectos Positivos
- **Métricas agregadas** eficientes con Prisma aggregations
- **Filtros opcionales** por compañía
- **Paginación** en access logs

#### 🟡 Riesgos de Seguridad

**1. Endpoints sin guards**

```typescript
// src/modules/analytics/analytics.controller.ts:18-49
@Get('apartments')
async getApartmentMetrics(@Query('companyId') companyId?: string) {
  // ⚠️ SIN GUARD: Cualquiera puede ver métricas
  return this.analyticsService.getApartmentMetrics(companyId);
}
```

**Recomendación:**
```typescript
@UseGuards(FirebaseAuthGuard, AdminGuard)
@Get('apartments')
async getApartmentMetrics(
  @CurrentUser() user: any,
  @Query('companyId') companyId?: string
) {
  // Validar que el usuario tenga acceso a la compañía solicitada
  if (companyId && user.role !== 'SUPER_ADMIN') {
    const hasAccess = await this.validateCompanyAccess(user.id, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Sin acceso a esta compañía');
    }
  }

  return this.analyticsService.getApartmentMetrics(companyId);
}
```

**2. Access logs exponen información sensible**

```typescript
// src/modules/analytics/analytics.service.ts:53-76
async getAccessLogs(limit: number = 50) {
  const logs = await this.prisma.accessLog.findMany({
    take: limit,
    orderBy: { timestamp: 'desc' },
    include: {
      unit: { select: { slug: true, name: true } },
      device: { select: { name: true, provider: true } },
    },
  });
  // ⚠️ Retorna deviceId, provider, metadata sin filtrado
}
```

**Recomendación:**
```typescript
async getAccessLogs(userId: string, limit: number = 50) {
  const userCompanyId = await this.getUserCompanyId(userId);

  const logs = await this.prisma.accessLog.findMany({
    where: {
      unit: { companyId: userCompanyId }, // Filtrar por compañía del usuario
    },
    take: limit,
    orderBy: { timestamp: 'desc' },
    select: {
      timestamp: true,
      success: true,
      message: true,
      unit: { select: { name: true } },
      // NO exponer deviceId ni metadata completa
    },
  });
}
```

---

## 🗄️ Base de Datos (Prisma Schema)

### Observaciones

#### ✅ Aspectos Positivos
- **Multi-schema architecture** bien definida
- **Cascading deletes** configurados correctamente
- **Indexes** en foreign keys principales
- **Default values** sensatos
- **Relations bidireccionales** completas

#### 🟡 Riesgos de Integridad

**1. UnitWifi.password almacenado como Bytes**

```prisma
model UnitWifi {
  password  Bytes?  // ⚠️ ¿Está encriptado o es plain bytes?
}
```

**Recomendación:** Documentar si debe encriptarse con EncryptionService antes de almacenar.

**2. Unit.accessCode como String**

```prisma
model Unit {
  accessCode  String?  @map("access_code") // Encriptado
}
```

**Problema:** No hay constraint que garantice que esté encriptado.

**Recomendación:** Agregar validación a nivel aplicación:
```typescript
// En ManagerService.createApartment()
if (dto.accessCode && !this.isEncrypted(dto.accessCode)) {
  throw new BadRequestException('accessCode debe estar encriptado');
}
```

**3. Falta campo `deletedAt` en modelos con soft delete**

Actualmente se usa `active=false` o `published=false`, pero no hay timestamp de eliminación.

**Recomendación:**
```prisma
model User {
  // ... campos existentes
  deletedAt DateTime? @map("deleted_at")
}
```

**4. Device.config como Json sin validación de schema**

```prisma
model Device {
  config  Json?  // ⚠️ Cualquier estructura JSON válida
}
```

**Recomendación:** Validar config según provider:
```typescript
class DeviceConfigValidator {
  static validate(provider: string, config: any) {
    const schema = this.schemas[provider];
    if (!schema) throw new Error('Unknown provider');
    return schema.parse(config); // Zod validation
  }
}
```

---

## 🔄 Flujo de Datos Dinámicos

### Observaciones

#### ✅ Guías Dinámicas (Guides Generation)

**Correcto:**
- GuidesService genera guías basadas en `Unit` + `UnitRule` + `Partner` (por zona)
- Cacheo en tabla `GuideGenerated` con `updatedAt`
- Inclusión de devices activos
- Partners ordenados por `isTop`

**Falta validar:**
- ¿Se regeneran las guías al actualizar UnitRule?
- ¿Qué pasa si se cambia la zona del apartment?

**Recomendación:**
```typescript
// En ManagerService.updateApartment()
if (dto.zoneId && dto.zoneId !== apartment.zoneId) {
  // Invalidar guías generadas
  await this.prisma.guideGenerated.deleteMany({
    where: { unitId: apartment.id },
  });
  this.logger.log(`[INVALIDATE] Guías regeneradas para ${apartment.slug}`);
}
```

#### ✅ Partners por Zona

**Correcto:**
- Relación `PartnerZone` M:N entre Partner y Zone
- Filtrado correcto en `public-api.service.ts:40-54`

**Posible mejora:**
```typescript
// Agregar prioridad numérica además de isTop
model PartnerZone {
  partnerId String
  zoneId    String
  priority  Int @default(0) // ← Ordenamiento fino
  @@id([partnerId, zoneId])
}
```

---

## 🚨 Resumen de Riesgos por Severidad

### 🔴 CRÍTICOS (Acción inmediata requerida)

1. **Endpoint `/api/public/actions/open-lock` sin validación de token**
   - Cualquiera con `deviceId` puede abrir cerraduras
   - Sin rate limiting
   - Sin logging de intentos no autorizados

2. **AdminGuard permite acceso sin autenticación en modo demo**
   - Endpoints admin completamente expuestos
   - Posible creación de usuarios ADMIN sin control

3. **FirebaseAuthGuard bypaseable con `FIREBASE_ENABLED=false`**
   - Todos los endpoints protegidos accesibles sin autenticación en desarrollo

### 🟡 ALTOS (Acción requerida)

4. **Falta validación `published=true` en endpoints públicos**
   - Apartamentos no publicados accesibles vía API

5. **Endpoint `/apartments/:id/secrets` expone accessCode desencriptado**
   - Sin logging de acceso a datos sensibles
   - Sin ofuscación parcial

6. **IoTController sin guards**
   - Endpoint de testing `/iot/open-door` expuesto en producción

7. **Billing webhook sin rate limiting**
   - Vulnerable a ataques DDoS

8. **Device.config almacena credenciales sin encriptar**
   - Tokens de providers IoT en plain JSON

### 🟢 MEDIOS (Mejora recomendada)

9. **Analytics endpoints sin guards**
10. **Email service sin validación de addresses**
11. **Falta deduplicación de webhooks Stripe**
12. **Sin 2FA para cuentas admin**
13. **Falta circuit breaker para providers IoT**
14. **Sin telemetría de operaciones IoT**

---

## ✅ Recomendaciones Generales

### 1. Seguridad

```typescript
// ✅ IMPLEMENTAR: Rate limiting global
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100, // 100 requests por minuto
    }),
  ],
})
export class AppModule {}
```

```typescript
// ✅ IMPLEMENTAR: Helmet para headers de seguridad
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
}
```

```typescript
// ✅ IMPLEMENTAR: CORS configurado correctamente
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});
```

### 2. Validación y DTOs

```typescript
// ✅ AGREGAR: ValidationPipe global
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, // Remueve propiedades no definidas en DTO
  forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
  transform: true,
}));
```

### 3. Logging y Monitoring

```typescript
// ✅ IMPLEMENTAR: Structured logging con Winston
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const logger = WinstonModule.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'combined.log',
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});
```

### 4. Testing

```typescript
// ✅ IMPLEMENTAR: Tests para endpoints críticos
describe('PublicApiController', () => {
  it('should reject open-lock without valid token', async () => {
    await request(app.getHttpServer())
      .post('/api/public/actions/open-lock')
      .send({ slug: 'test', deviceId: 'device123', token: 'invalid' })
      .expect(401);
  });

  it('should not expose unpublished apartments', async () => {
    await request(app.getHttpServer())
      .get('/api/public/guide/unpublished-slug')
      .expect(404);
  });
});
```

### 5. Feature Flags Consistency

```typescript
// ✅ CENTRALIZAR: Feature flag service
@Injectable()
export class FeatureFlagService {
  constructor(private config: ConfigService) {}

  isFirebaseEnabled(): boolean {
    return this.config.get('FIREBASE_ENABLED') === 'true';
  }

  isStripeEnabled(): boolean {
    return this.config.get('STRIPE_ENABLED') === 'true';
  }

  isEncryptionEnabled(): boolean {
    return this.config.get('ENCRYPTION_ENABLED') === 'true';
  }

  // Usar en lugar de verificaciones dispersas
}
```

---

## 📝 Plan de Acción Prioritario

### Fase 1: Críticos (1-2 días)

1. ✅ Implementar validación de token en `/api/public/actions/open-lock`
2. ✅ Eliminar bypass en AdminGuard
3. ✅ Agregar validación `published=true` en endpoints públicos
4. ✅ Agregar guards a IoTController y AnalyticsController

### Fase 2: Altos (3-5 días)

5. ✅ Implementar rate limiting global
6. ✅ Encriptar Device.config
7. ✅ Agregar deduplicación de webhooks
8. ✅ Implementar logging de acceso a datos sensibles

### Fase 3: Medios (1-2 semanas)

9. ✅ Implementar 2FA para admins
10. ✅ Circuit breaker para providers IoT
11. ✅ Email validation y queueing
12. ✅ Telemetría y monitoring

---

## 🎯 Conclusión

El backend de SmartStay Guide está **bien arquitecturado** con una separación clara de responsabilidades, logging completo y feature flags funcionales. Sin embargo, presenta **riesgos críticos de seguridad** que deben ser atendidos con urgencia, especialmente:

1. La **apertura de cerraduras sin autenticación** en el endpoint público
2. El **acceso admin sin validación** en modo demo
3. La **falta de rate limiting** en endpoints críticos

Una vez implementadas las correcciones de Fase 1 y 2, la plataforma estará lista para producción con un nivel de seguridad **robusto y profesional**.

---

**Auditor:** GitHub Copilot (Claude Sonnet 4.5)  
**Metodología:** Análisis estático de código + Revisión de lógica de negocio + Threat modeling  
**Fecha:** 18 de enero de 2026
