-- FASE 1: Extender schema con campos de AuroTek-guest-v1
-- Migración ADITIVA - NO elimina nada existente

-- Extender tabla companies
ALTER TABLE "core"."companies" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "core"."companies" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "core"."companies" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "core"."companies" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "core"."companies" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "core"."companies" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Extender tabla users
ALTER TABLE "core"."users" ADD COLUMN IF NOT EXISTS "firebase_uid" TEXT;
ALTER TABLE "core"."users" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "core"."users" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
ALTER TABLE "core"."users" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE "core"."users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Crear índice único para firebase_uid (solo si no existe NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "users_firebase_uid_key" ON "core"."users"("firebase_uid") WHERE "firebase_uid" IS NOT NULL;

-- Crear índice para firebase_uid
CREATE INDEX IF NOT EXISTS "users_firebase_uid_idx" ON "core"."users"("firebase_uid");

-- Extender tabla units
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "images" JSONB;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "host_name" TEXT;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "host_phone" TEXT;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "host_photo" TEXT;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "access_type" TEXT;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "access_code" TEXT;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "access_instructions" JSONB;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY['es']::TEXT[];
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "units"."units" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Extender tabla devices
ALTER TABLE "devices"."devices" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "devices"."devices" ADD COLUMN IF NOT EXISTS "config" JSONB;
ALTER TABLE "devices"."devices" ADD COLUMN IF NOT EXISTS "instructions" JSONB;
ALTER TABLE "devices"."devices" ADD COLUMN IF NOT EXISTS "details_key" TEXT;
ALTER TABLE "devices"."devices" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "devices"."devices" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Extender tabla partners
ALTER TABLE "partners"."partners" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE "partners"."partners" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "partners"."partners" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Crear índice para user_id en partners
CREATE INDEX IF NOT EXISTS "partners_user_id_idx" ON "partners"."partners"("user_id");

-- Crear tabla activity_logs
CREATE TABLE IF NOT EXISTS "core"."activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- Crear índices para activity_logs
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx" ON "core"."activity_logs"("user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_entity_type_entity_id_idx" ON "core"."activity_logs"("entity_type", "entity_id");

-- Crear tabla access_logs
CREATE TABLE IF NOT EXISTS "devices"."access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" UUID NOT NULL,
    "device_id" UUID,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- Crear índices para access_logs
CREATE INDEX IF NOT EXISTS "access_logs_unit_id_idx" ON "devices"."access_logs"("unit_id");
CREATE INDEX IF NOT EXISTS "access_logs_device_id_idx" ON "devices"."access_logs"("device_id");

-- Añadir foreign keys
ALTER TABLE "core"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "devices"."access_logs" ADD CONSTRAINT "access_logs_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "devices"."access_logs" ADD CONSTRAINT "access_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"."devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "partners"."partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
