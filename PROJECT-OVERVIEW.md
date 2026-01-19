# Proyecto: SmartStay Guide Backend

Este documento describe la arquitectura, modulos, flujos y endpoints del backend,
incluyendo la version actual con auth social (Firebase) y auth local (email/password).

## 1) Arquitectura general

- Framework: NestJS (TypeScript), arquitectura modular.
- Persistencia: PostgreSQL con Prisma ORM y multi-schema.
- Auth: Firebase Admin SDK (social login) y auth local con JWT propio.
- Integraciones: Stripe (billing), proveedores IoT (Nuki/Sonoff/Shelly/Raixer).
- Documentacion: Swagger UI en `/docs`.

### Capas principales

1. Controllers: exponen endpoints HTTP, validan DTOs y delegan logica.
2. Services: logica de negocio, acceso a Prisma, integraciones externas.
3. Prisma: acceso tipado a la base de datos multi-schema.

## 2) Base de datos (PostgreSQL + Prisma)

Se usan schemas separados para dominios:

- `core`: users, companies, roles, activity_logs, translations.
- `geo`: cities, zones, zone_neighborhoods.
- `units`: units, media, wifi, features, rules, guides, surveys.
- `devices`: device_types, devices, access_credentials, access_logs.
- `partners`: partner_types, partners, partner_zones.
- `billing`: partner_plans, plan_prices, billing_accounts, subscriptions, invoices, payments, billing_history.

Extensiones requeridas:

- `postgis` (geography)
- `pgcrypto` (UUID)
- `btree_gist`

### RBAC (Roles y permisos)

`core.roles` incluye `permissions` (array de strings). Esto permite asignar permisos
por rol desde la BD. Los guards consultan `permissions` y, si no existen, caen a rol
basico.

Ejemplo de permisos:

- `admin:access`
- `admin:*`

## 3) Autenticacion y autorizacion

### 3.1 Auth social (Firebase)

Flujo:

1) Frontend autentica con Google/Facebook usando Firebase SDK.
2) Frontend obtiene `idToken`.
3) Backend valida el token con Firebase Admin SDK.
4) Se crea/vincula usuario local con `POST /auth/firebase/ensure-user`.

Notas:

- `FirebaseAuthGuard` valida tokens y agrega `firebaseUser` al request.
- `firebaseUser` incluye `role` y `permissions` cargados desde BD.

### 3.2 Auth local (email/password)

Flujo:

1) Registro con `POST /auth/local/register` (email/password).
2) Login con `POST /auth/local/login`.
3) El backend emite un token `Local` (JWT propio) con rol y permisos.
4) Cliente usa `Authorization: Local <token>`.

Notas:

- Requiere `JWT_SECRET`.
- Puede desactivarse con `LOCAL_AUTH_ENABLED=false`.

### 3.3 Guards y roles

- `FirebaseAuthGuard`: valida Firebase o token `Local`.
- `AdminGuard`: permite acceso si `permissions` contiene `admin:access` o `admin:*`.
  Si no hay permisos, valida rol `ADMIN`/`SUPER_ADMIN`.

### 3.4 Roles recomendados (base)

Propuesta inicial de roles y permisos:

- `SUPER_ADMIN`
  - `admin:*`
  - Acceso total a gestion, configuraciones y auditoria.
- `ADMIN`
  - `admin:access`
  - `admin:users:read`, `admin:users:write`
  - `admin:companies:read`, `admin:companies:write`
  - `admin:stats:read`
- `MANAGER`
  - `manager:apartments:read`, `manager:apartments:write`
  - `manager:apartments:publish`
  - `manager:uploads:write`
  - `manager:secrets:read`
- `PARTNER`
  - `partners:read`
  - `partners:write` (si se habilita panel de partners)
- `SUPPORT`
  - `support:read`
  - `support:impersonate` (opcional, solo si se implementa)
- `GUEST`
  - `public:read`
  - `survey:write`

Notas:
- Ajustar permisos segun necesidades reales.
- Mantener permisos finos evita over-privilege.
- El guard actual usa `admin:*` y `admin:access`. Se pueden agregar guards por permiso
  para otros modulos en una fase futura.

## 4) Flujos funcionales principales

### 4.1 Gestion de apartamentos (Manager)

- Crear/listar/actualizar/borrar apartamentos.
- Upload de imagenes con validaciones de tipo y tamano.
- Acceso a datos sensibles (accessCode) con permisos.

Detalle de flujo (manager):
1) Cliente obtiene token (Firebase o Local).
2) Llama a `/api/manager/apartments` para crear o listar.
3) Subidas de imagen con `/api/manager/upload/*`.
4) Acceso a secretos via `/api/manager/apartments/:id/secrets`.

### 4.2 Public API (Guest)

- Obtener guia completa, essentials, recomendaciones.
- Abrir cerradura con token one-time.

Detalle de flujo (public):
1) Cliente consume guia y secciones publicas por slug.
2) Para abrir cerradura, llama a `/api/public/actions/open-lock` con token one-time.
3) El backend valida token y registra intento/resultado.

### 4.3 Billing (Stripe)

- Crear Payment Intent.
- Webhook de Stripe con validacion de signature.
- Historial y estadisticas de billing.

Detalle de flujo (billing):
1) Frontend pide `/billing/create-payment-intent` con monto y metadata.
2) Stripe confirma el pago en frontend.
3) Stripe envia eventos a `/billing/webhook`.
4) El backend valida signature y registra en `billing_history`.

### 4.4 IoT

- Comandos para abrir cerraduras.
- Consultar estado de dispositivos.

Detalle de flujo (iot):
1) Admin autenticado llama a `/iot/open-door` o `/iot/device/:id/status`.
2) El provider activo ejecuta comando y retorna estado.

### 4.5 Analytics

- Metricas de apartamentos.
- Logs y estadisticas de acceso.

Detalle de flujo (analytics):
1) Admin consulta `/api/analytics/*`.
2) El backend agrega datos desde accesos y unidades.

## 5) Endpoints (resumen)

### Auth

- `POST /auth/local/register`
- `POST /auth/local/login`
- `GET /auth/firebase/status`
- `POST /auth/firebase/link`
- `POST /auth/firebase/unlink`
- `POST /auth/firebase/ensure-user`
- `GET /auth/firebase/me`

### Admin

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/companies`
- `GET /api/admin/stats`

### Manager

- `POST /api/manager/apartments`
- `GET /api/manager/apartments`
- `GET /api/manager/apartments/:id/secrets`
- `PUT /api/manager/apartments/:id`
- `DELETE /api/manager/apartments/:id`
- `POST /api/manager/apartments/:id/publish`

### Uploads

- `POST /api/manager/upload/image`
- `POST /api/manager/upload/images`
- `DELETE /api/manager/upload/image`
- `GET /api/manager/upload/images/:slug`

### Public API

- `GET /api/public/guide/:slug?lang=es`
- `GET /api/public/essentials/:slug?lang=es`
- `GET /api/public/recommendations/:slug`
- `POST /api/public/actions/open-lock`

### Units

- `GET /units`
- `GET /units/:id`
- `POST /units`
- `PATCH /units/:id`
- `DELETE /units/:id`

### Companies

- `GET /companies`
- `GET /companies/:id`
- `POST /companies`
- `PATCH /companies/:id`
- `DELETE /companies/:id`

### Guides

- `GET /guides/:slug/:language`
- `GET /guides/generate/:unitId/:language`

### Surveys

- `GET /surveys`
- `GET /surveys/:id`
- `POST /surveys/response`
- `GET /surveys/unit/:unitId`

### Billing

- `POST /billing/create-payment-intent`
- `POST /billing/webhook`
- `GET /billing/history`
- `GET /billing/payment-intent/:id`
- `GET /billing/stats`

### IoT

- `POST /iot/open-door`
- `GET /iot/device/:deviceId/status`

### Analytics

- `GET /api/analytics/apartments`
- `GET /api/analytics/access`
- `GET /api/analytics/access-stats`

### Health

- `GET /health`

## 6) Configuracion (variables de entorno)

Requeridas:

- `DATABASE_URL`

Auth local:

- `JWT_SECRET`
- `LOCAL_AUTH_ENABLED` (opcional, default true)

Firebase:

- `FIREBASE_ENABLED=true` (prod)
- `FIREBASE_SERVICE_ACCOUNT_PATH` o
  `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Stripe:

- `STRIPE_ENABLED`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_TEST_MODE`

## 7) Swagger

Swagger UI: `GET /docs`.
Las descripciones detalladas se exponen via decoradores en controllers y DTOs.

## 8) Notas de despliegue

- En produccion, `FIREBASE_ENABLED=true` y sin `DEV_BYPASS_TOKEN`.
- Ejecutar migraciones con `prisma migrate deploy`.
- Validar healthcheck en `/health`.

## 9) Mejoras futuras recomendadas

- Autorizacion granular: guards por permiso (`@RequirePermissions`) y politicas por dominio.
- Auditoria: trazabilidad detallada por cambios de usuarios/empresas/unidades.
- Limites y seguridad: rate limiting y proteccion de endpoints sensibles.
- Observabilidad: logs estructurados con request-id, trazas y metricas.
- Tests: suites de integracion para auth, billing, iot, public api.
- Uploads: mover archivos a storage externo (S3/GCS) con firmas.
- Seeds: seed de roles/permissions y data base para entornos de testing.
- OAuth server-side: si se desea login social sin SDK en frontend.
