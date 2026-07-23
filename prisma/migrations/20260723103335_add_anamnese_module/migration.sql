-- CreateEnum
CREATE TYPE "AnamneseFieldType" AS ENUM ('TEXT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "AnamnesePhotoKind" AS ENUM ('ANTES', 'DEPOIS', 'GERAL');

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "requiresAnamnese" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "anamnese_records" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "allergies" TEXT,
    "medications" TEXT,
    "healthConditions" TEXT,
    "previousProcedures" TEXT,
    "contraindications" TEXT,
    "notes" TEXT,
    "customFields" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anamnese_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anamnese_consents" (
    "id" TEXT NOT NULL,
    "anamneseRecordId" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "dataSnapshot" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "registeredByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anamnese_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anamnese_custom_fields" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "AnamneseFieldType" NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anamnese_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anamnese_photos" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "anamneseRecordId" TEXT,
    "appointmentId" TEXT,
    "kind" "AnamnesePhotoKind" NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anamnese_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anamnese_access_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anamnese_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "anamnese_records_clientId_key" ON "anamnese_records"("clientId");

-- CreateIndex
CREATE INDEX "anamnese_records_businessId_idx" ON "anamnese_records"("businessId");

-- CreateIndex
CREATE INDEX "anamnese_consents_anamneseRecordId_idx" ON "anamnese_consents"("anamneseRecordId");

-- CreateIndex
CREATE INDEX "anamnese_custom_fields_businessId_idx" ON "anamnese_custom_fields"("businessId");

-- CreateIndex
CREATE INDEX "anamnese_photos_businessId_idx" ON "anamnese_photos"("businessId");

-- CreateIndex
CREATE INDEX "anamnese_photos_clientId_idx" ON "anamnese_photos"("clientId");

-- CreateIndex
CREATE INDEX "anamnese_photos_appointmentId_idx" ON "anamnese_photos"("appointmentId");

-- CreateIndex
CREATE INDEX "anamnese_access_logs_clientId_idx" ON "anamnese_access_logs"("clientId");

-- AddForeignKey
ALTER TABLE "anamnese_records" ADD CONSTRAINT "anamnese_records_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_records" ADD CONSTRAINT "anamnese_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_consents" ADD CONSTRAINT "anamnese_consents_anamneseRecordId_fkey" FOREIGN KEY ("anamneseRecordId") REFERENCES "anamnese_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_custom_fields" ADD CONSTRAINT "anamnese_custom_fields_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_photos" ADD CONSTRAINT "anamnese_photos_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_photos" ADD CONSTRAINT "anamnese_photos_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_photos" ADD CONSTRAINT "anamnese_photos_anamneseRecordId_fkey" FOREIGN KEY ("anamneseRecordId") REFERENCES "anamnese_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_photos" ADD CONSTRAINT "anamnese_photos_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
