-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTUAL', 'FIXO');

-- AlterTable
ALTER TABLE "commands" ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DECIMAL(10,2);
