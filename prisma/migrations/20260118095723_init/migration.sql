CREATE SCHEMA IF NOT EXISTS "core";
CREATE SCHEMA IF NOT EXISTS "units";

-- CreateTable
CREATE TABLE "core"."translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "language" CHAR(2) NOT NULL,
    "value" TEXT NOT NULL,
    "context" TEXT,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units"."guide_generated" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unit_id" UUID NOT NULL,
    "language" CHAR(2) NOT NULL,
    "payload_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_generated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units"."surveys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units"."survey_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "survey_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "answers_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "translations_key_language_key" ON "core"."translations"("key", "language");

-- CreateIndex
CREATE UNIQUE INDEX "guide_generated_unit_id_language_key" ON "units"."guide_generated"("unit_id", "language");

-- AddForeignKey
ALTER TABLE "units"."guide_generated" ADD CONSTRAINT "guide_generated_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "units"."surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units"."survey_responses" ADD CONSTRAINT "survey_responses_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"."units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
