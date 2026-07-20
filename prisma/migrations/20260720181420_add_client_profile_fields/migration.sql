-- CreateEnum
CREATE TYPE "ClientOrigin" AS ENUM ('INDICACAO', 'INSTAGRAM', 'GOOGLE', 'FACHADA', 'OUTRO');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressNeighborhood" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "addressZipCode" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "origin" "ClientOrigin";
