-- DropForeignKey
ALTER TABLE "anamnese_custom_fields" DROP CONSTRAINT "anamnese_custom_fields_businessId_fkey";

-- DropForeignKey
ALTER TABLE "anamnese_photos" DROP CONSTRAINT "anamnese_photos_businessId_fkey";

-- DropForeignKey
ALTER TABLE "anamnese_records" DROP CONSTRAINT "anamnese_records_businessId_fkey";

-- AddForeignKey
ALTER TABLE "anamnese_records" ADD CONSTRAINT "anamnese_records_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_custom_fields" ADD CONSTRAINT "anamnese_custom_fields_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnese_photos" ADD CONSTRAINT "anamnese_photos_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
