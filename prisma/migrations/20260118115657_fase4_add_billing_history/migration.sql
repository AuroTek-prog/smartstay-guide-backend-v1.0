-- CreateTable for BillingHistory (FASE 4: Stripe Billing)
CREATE TABLE IF NOT EXISTS "billing"."billing_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "company_id" UUID,
    "unit_id" UUID,
    "stripe_event_id" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_payment_id" TEXT,
    "stripe_invoice_id" TEXT,
    "event_type" TEXT NOT NULL,
    "amount" INTEGER,
    "currency" TEXT DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "billing_history_stripe_event_id_key" ON "billing"."billing_history"("stripe_event_id");
CREATE INDEX IF NOT EXISTS "billing_history_user_id_idx" ON "billing"."billing_history"("user_id");
CREATE INDEX IF NOT EXISTS "billing_history_company_id_idx" ON "billing"."billing_history"("company_id");
CREATE INDEX IF NOT EXISTS "billing_history_unit_id_idx" ON "billing"."billing_history"("unit_id");
CREATE INDEX IF NOT EXISTS "billing_history_stripe_event_id_idx" ON "billing"."billing_history"("stripe_event_id");
CREATE INDEX IF NOT EXISTS "billing_history_stripe_customer_id_idx" ON "billing"."billing_history"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "billing_history_created_at_idx" ON "billing"."billing_history"("created_at");
CREATE INDEX IF NOT EXISTS "billing_history_status_idx" ON "billing"."billing_history"("status");

-- AddForeignKey (con ON DELETE SET NULL para no romper al eliminar usuarios/companies/units)
ALTER TABLE "billing"."billing_history" ADD CONSTRAINT "billing_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing"."billing_history" ADD CONSTRAINT "billing_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "core"."companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing"."billing_history" ADD CONSTRAINT "billing_history_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
