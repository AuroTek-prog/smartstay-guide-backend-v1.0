-- CreateTable
CREATE TABLE "core"."countries" (
    "id" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legal_name" TEXT,
    "tax_id" TEXT,
    "country_id" CHAR(2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."roles" (
    "id" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."user_companies" (
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "role_id" TEXT,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("user_id","company_id")
);

-- CreateTable
CREATE TABLE "core"."user_units" (
    "user_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "role" TEXT,

    CONSTRAINT "user_units_pkey" PRIMARY KEY ("user_id","unit_id")
);

-- CreateTable
CREATE TABLE "geo"."cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_id" CHAR(2),
    "center" geography,
    "polygon" geography,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo"."zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID,
    "slug" TEXT,
    "name" TEXT,
    "polygon" geography,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo"."zone_neighborhoods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zone_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "zone_neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units"."units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city_id" UUID,
    "zone_id" UUID,
    "location" geography,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units"."unit_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" UUID NOT NULL,
    "media_type" TEXT,
    "purpose" TEXT,
    "url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units"."unit_wifi" (
    "unit_id" UUID NOT NULL,
    "network" TEXT,
    "password" BYTEA,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_wifi_pkey" PRIMARY KEY ("unit_id")
);

-- CreateTable
CREATE TABLE "units"."features" (
    "id" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units"."unit_features" (
    "unit_id" UUID NOT NULL,
    "feature_id" TEXT NOT NULL,

    CONSTRAINT "unit_features_pkey" PRIMARY KEY ("unit_id","feature_id")
);

-- CreateTable
CREATE TABLE "units"."rules" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "ui_semantic" TEXT,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units"."unit_rules" (
    "unit_id" UUID NOT NULL,
    "rule_id" TEXT NOT NULL,

    CONSTRAINT "unit_rules_pkey" PRIMARY KEY ("unit_id","rule_id")
);

-- CreateTable
CREATE TABLE "devices"."device_types" (
    "id" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "device_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices"."devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" UUID,
    "type_id" TEXT,
    "external_device_id" TEXT,
    "provider" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices"."access_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "device_id" UUID,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "access_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners"."partner_types" (
    "id" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "partner_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners"."partners" (
    "company_id" UUID NOT NULL,
    "type_id" TEXT,
    "description" TEXT,
    "image" TEXT,
    "location" geography,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_top" BOOLEAN NOT NULL DEFAULT false,
    "redirect_url" TEXT,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "partners"."partner_zones" (
    "company_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,

    CONSTRAINT "partner_zones_pkey" PRIMARY KEY ("company_id","zone_id")
);

-- CreateTable
CREATE TABLE "billing"."partner_plans" (
    "id" TEXT NOT NULL,
    "priority" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "partner_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."plan_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" TEXT,
    "price" DECIMAL(65,30),
    "currency" CHAR(3),
    "valid_from" DATE,
    "valid_to" DATE,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."billing_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "provider" TEXT,
    "external_customer_id" TEXT,
    "currency" CHAR(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "billing_account_id" UUID,
    "plan_id" TEXT,
    "external_subscription_id" TEXT,
    "status" TEXT,
    "start_date" DATE,
    "end_date" DATE,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "billing_account_id" UUID,
    "external_invoice_id" TEXT,
    "amount" DECIMAL(65,30),
    "currency" CHAR(3),
    "status" TEXT,
    "issued_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID,
    "external_payment_id" TEXT,
    "provider" TEXT,
    "amount" DECIMAL(65,30),
    "status" TEXT,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "core"."companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "core"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "geo"."cities"("slug");

-- CreateIndex
CREATE INDEX "zones_city_id_idx" ON "geo"."zones"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_slug_key" ON "units"."units"("slug");

-- CreateIndex
CREATE INDEX "units_company_id_idx" ON "units"."units"("company_id");

-- CreateIndex
CREATE INDEX "units_city_id_idx" ON "units"."units"("city_id");

-- CreateIndex
CREATE INDEX "units_zone_id_idx" ON "units"."units"("zone_id");

-- CreateIndex
CREATE INDEX "partners_type_id_idx" ON "partners"."partners"("type_id");

-- CreateIndex
CREATE INDEX "subscriptions_company_id_idx" ON "billing"."subscriptions"("company_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "billing"."subscriptions"("plan_id");

-- AddForeignKey
ALTER TABLE "core"."companies" ADD CONSTRAINT "companies_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "core"."countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."user_companies" ADD CONSTRAINT "user_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."user_companies" ADD CONSTRAINT "user_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."user_companies" ADD CONSTRAINT "user_companies_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "core"."roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."user_units" ADD CONSTRAINT "user_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."user_units" ADD CONSTRAINT "user_units_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo"."cities" ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "core"."countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo"."zones" ADD CONSTRAINT "zones_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "geo"."cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geo"."zone_neighborhoods" ADD CONSTRAINT "zone_neighborhoods_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "geo"."zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."units" ADD CONSTRAINT "units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."units" ADD CONSTRAINT "units_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "geo"."cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."units" ADD CONSTRAINT "units_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "geo"."zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."unit_media" ADD CONSTRAINT "unit_media_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."unit_wifi" ADD CONSTRAINT "unit_wifi_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."unit_features" ADD CONSTRAINT "unit_features_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."unit_features" ADD CONSTRAINT "unit_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "units"."features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."unit_rules" ADD CONSTRAINT "unit_rules_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."unit_rules" ADD CONSTRAINT "unit_rules_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "units"."rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices"."devices" ADD CONSTRAINT "devices_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices"."devices" ADD CONSTRAINT "devices_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "devices"."device_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices"."access_credentials" ADD CONSTRAINT "access_credentials_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"."devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners"."partners" ADD CONSTRAINT "partners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners"."partners" ADD CONSTRAINT "partners_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "partners"."partner_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners"."partner_zones" ADD CONSTRAINT "partner_zones_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "partners"."partners"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners"."partner_zones" ADD CONSTRAINT "partner_zones_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "geo"."zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."plan_prices" ADD CONSTRAINT "plan_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing"."partner_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."billing_accounts" ADD CONSTRAINT "billing_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."billing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing"."partner_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."invoices" ADD CONSTRAINT "invoices_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."billing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
