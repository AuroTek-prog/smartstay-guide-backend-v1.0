# 🔄 PLAN DE MIGRACIÓN: AuroTek-Guest-v1 → smartstay-guide-backend

## ✅ FASE 1: PREPARACIÓN (NO ROMPE NADA)

### 1.1 Backup del repositorio viejo
- [x] Clonar aurotek-guest-v1/backend a carpeta temporal
- [ ] Crear branch `legacy-backup` en git

### 1.2 Análisis de dependencias críticas
- [ ] Listar todas las env vars necesarias
- [ ] Documentar APIs externas (Firebase, Stripe, Raixer)
- [ ] Identificar endpoints usados por el frontend

---

## 🔧 FASE 2: EXTENDER SCHEMA (ADITIVO, NO DESTRUCTIVO)

### 2.1 Añadir campos faltantes a tablas existentes

**Company (ya existe en nuevo backend):**
```prisma
// CHANGE: Añadir campos del modelo viejo
logoURL     String?
taxId       String?
address     String?
phone       String?
```

**Unit → Apartment (mapeo):**
```prisma
// CHANGE: Extender tabla Unit con campos de Apartment
model Unit {
  // ... campos existentes ...
  
  // NUEVOS CAMPOS de AuroTek-guest-v1:
  images          Json?        // { portada, acceso, gallery }
  hostName        String?
  hostPhone       String?
  hostPhoto       String?
  wifiPasswordEnc Bytes?       // CHANGE: Ya existe como password en UnitWifi
  accessType      String?      // keybox, keypad, smart, physical
  accessCode      String?      // Encriptado
  accessInstructions Json?
  languages       String[]     @default(["es"])
  published       Boolean      @default(false)
  lat             Float?       // CHANGE: Migrar a PostGIS location
  lng             Float?       // CHANGE: Migrar a PostGIS location
}
```

### 2.2 Añadir tablas completamente nuevas

**User (no existe en nuevo backend):**
```prisma
// CHANGE: Nueva tabla para autenticación
model User {
  id            String    @id @default(cuid())
  firebaseUid   String    @unique
  email         String    @unique
  displayName   String?
  photoURL      String?
  role          UserRole  @default(MANAGER)
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  companies     UserCompany[]  // CHANGE: Relación con tabla existente
  partners      Partner[]      // CHANGE: Relación con tabla existente
  billingCustomer BillingCustomer?
  activityLogs  ActivityLog[]

  @@map("users")
  @@schema("core")  // CHANGE: Añadir a schema core
}

enum UserRole {
  ADMIN
  MANAGER
  PARTNER
  SUPPORT
}
```

**ActivityLog (nueva):**
```prisma
model ActivityLog {
  id          String   @id @default(cuid())
  userId      String?
  entityType  String   // "apartment", "partner", "device"
  entityId    String
  action      String   // "created", "updated", "deleted"
  details     Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entityType, entityId])
  @@map("activity_logs")
  @@schema("core")
}
```

**AccessLog (nueva):**
```prisma
model AccessLog {
  id          String   @id @default(cuid())
  unitId      String   @map("unit_id") @db.Uuid  // CHANGE: unit en lugar de apartment
  deviceId    String?  @map("device_id") @db.Uuid
  action      String   // "unlock", "lock", "view"
  success     Boolean
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now()) @map("created_at")

  unit        Unit     @relation(fields: [unitId], references: [id])
  device      Device?  @relation(fields: [deviceId], references: [id])

  @@index([unitId])
  @@index([deviceId])
  @@map("access_logs")
  @@schema("devices")
}
```

### 2.3 Extender Device con providers

```prisma
// CHANGE: Añadir enums de providers
enum DeviceProvider {
  RAIXER
  SHELLY
  SONOFF
  HOME_ASSISTANT
  EWELINK
  NUKI
  OTHER
}

// CHANGE: Añadir campos a Device
model Device {
  // ... campos existentes ...
  
  providerEnum  DeviceProvider?  @map("provider_enum")  // CHANGE: No sobrescribir provider String
  config        Json?             // Configuración específica del provider
  instructions  Json?             // Instrucciones para huéspedes
  detailsKey    String?           // Clave de traducción
  
  accessLogs    AccessLog[]       // CHANGE: Nueva relación
}
```

---

## 🔌 FASE 3: MÓDULOS Y LÓGICA (ADITIVO)

### 3.1 Crear módulo Auth (Firebase)

**Archivos a crear:**
- `src/modules/auth/auth.module.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/firebase.service.ts`
- `src/modules/auth/guards/firebase-auth.guard.ts`
- `src/modules/auth/decorators/current-user.decorator.ts`

**NO ROMPE:** Endpoints existentes siguen sin auth hasta que decidamos protegerlos

### 3.2 Extender módulo Billing (Stripe)

**Archivos a crear:**
- `src/modules/billing/stripe.service.ts`
- `src/modules/billing/webhooks.controller.ts`
- `src/modules/billing/billing.controller.ts`

**NO ROMPE:** Estructura básica ya existe, solo añadimos implementación

### 3.3 Crear módulo IoT (Providers)

**Archivos a crear:**
- `src/modules/iot/iot.module.ts`
- `src/modules/iot/iot.service.ts`
- `src/modules/iot/providers/raixer.provider.ts`
- `src/modules/iot/providers/shelly.provider.ts`
- `src/modules/iot/providers/sonoff.provider.ts`
- `src/modules/iot/providers/base.provider.ts`

**NO ROMPE:** Son servicios nuevos, no afectan a código existente

### 3.4 Migrar endpoints del frontend

**Endpoints críticos del frontend AuroTek-guest-v1:**
- `GET /api/public/guide/:slug?lang=es` → **YA EXISTE** ✅
- `GET /api/public/recommendations/:slug` → **YA EXISTE** ✅
- `POST /api/public/actions/open-lock` → **YA EXISTE** ✅
- `POST /api/manager/apartments` → Crear en módulo units
- `GET /api/manager/apartments` → Crear en módulo units
- `POST /api/webhooks/stripe` → Crear en billing

**ESTRATEGIA:** Mapear endpoints del backend viejo a los nuevos nombres/estructura

---

## 🔐 FASE 4: SEGURIDAD Y ENCRIPTACIÓN

### 4.1 Servicio de encriptación

**Archivo a crear:**
- `src/common/encryption.service.ts`

**Funciones:**
```typescript
// CHANGE: Migrar del backend viejo
encrypt(text: string): string
decrypt(encrypted: string): string
encryptJson(data: object): string
decryptJson(encrypted: string): object
```

**Campos a encriptar:**
- `UnitWifi.password`
- `Unit.accessCode`
- `Device.credentials`

**NO ROMPE:** Es servicio nuevo, campos sensibles se migran después

### 4.2 Activity Logs

**Middleware a crear:**
- `src/middleware/activity-logger.middleware.ts`

**NO ROMPE:** Es logging adicional, no afecta funcionamiento

---

## 📦 FASE 5: VARIABLES DE ENTORNO

### 5.1 Consolidar .env

**Nuevas variables a añadir:**
```env
# Firebase (del backend viejo)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Stripe (del backend viejo)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Encriptación (del backend viejo)
ENCRYPTION_KEY=
ENCRYPTION_IV=

# Raixer API (del backend viejo)
RAIXER_API_URL=
RAIXER_API_KEY=
```

**NO ROMPE:** Solo añadir, no modificar las existentes

---

## 🧪 FASE 6: TESTING Y VALIDACIÓN

### 6.1 Tests de regresión

**Verificar que sigan funcionando:**
- [ ] `GET /companies` → Lista empresas
- [ ] `GET /units` → Lista apartamentos
- [ ] `GET /api/public/guide/:slug` → Guía pública
- [ ] `POST /companies` → Crear empresa
- [ ] `POST /units` → Crear apartamento

### 6.2 Tests nuevos

**Verificar funcionalidad migrada:**
- [ ] Firebase Auth funciona
- [ ] Stripe webhooks procesan eventos
- [ ] Raixer API abre cerraduras
- [ ] Encriptación/desencriptación de WiFi

---

## ⚠️ ZONAS DE RIESGO IDENTIFICADAS

### RIESGO 1: Nombres de tablas diferentes
**Problema:** `Apartment` (viejo) vs `Unit` (nuevo)  
**Solución:** Mantener `Unit` como nombre estándar, mapear en DTOs

### RIESGO 2: Lat/Lng vs PostGIS
**Problema:** Backend viejo usa Float, nuevo usa geography  
**Solución:** Migrar datos con script de conversión, mantener ambos temporalmente

### RIESGO 3: Schema único vs multi-schema
**Problema:** Viejo tiene todo en public, nuevo usa 6 schemas  
**Solución:** Mapear correctamente en Prisma con `@@schema()`

### RIESGO 4: Endpoints del frontend
**Problema:** Frontend espera rutas específicas (`/api/manager/apartments`)  
**Solución:** Crear alias/redirects a nuevos endpoints o mantener ambos

---

## 📊 PRIORIZACIÓN

### PRIORIDAD ALTA (Crítico para frontend)
1. ✅ Endpoints públicos → **YA FUNCIONAN**
2. 🟡 Firebase Auth → **NECESARIO**
3. 🟡 Encriptación WiFi/códigos → **NECESARIO**
4. 🟡 IoT Raixer → **NECESARIO**

### PRIORIDAD MEDIA (Importante)
5. 🟡 Stripe integration
6. 🟡 Activity logs
7. 🟡 Access logs
8. 🟡 Gestión de imágenes

### PRIORIDAD BAJA (Nice to have)
9. ⚪ Email notifications
10. ⚪ Advanced analytics
11. ⚪ Multi-provider IoT completo

---

## ✅ CHECKPOINT DE VALIDACIÓN

Después de cada fase, verificar:

```bash
# Backend sigue arrancando
npm run start:dev

# Tests pasan
npm test

# Swagger sigue funcionando
curl http://localhost:3000/docs

# Frontend se conecta
# (probar con frontend existente)
```

---

## 🚀 ORDEN DE EJECUCIÓN SUGERIDO

1. ✅ Extender schema Prisma (Fase 2)
2. ✅ Crear migración y aplicar
3. ✅ Crear módulo Auth + Firebase (Fase 3.1)
4. ✅ Crear servicio Encriptación (Fase 4.1)
5. ✅ Extender módulo IoT (Fase 3.3)
6. ✅ Conectar Stripe (Fase 3.2)
7. ✅ Añadir Activity Logs (Fase 4.2)
8. ✅ Configurar .env (Fase 5)
9. ✅ Testing completo (Fase 6)

---

## 📝 NOTAS IMPORTANTES

- ⚠️ **NO eliminar** código del backend viejo hasta validar todo
- ⚠️ **Mantener backup** de la base de datos antes de cada migración
- ⚠️ **Probar frontend** después de cada cambio mayor
- ⚠️ **Documentar** cada endpoint que cambie de ruta
- ✅ **Versionado** de API si hay breaking changes

