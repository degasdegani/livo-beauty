-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "businesses_inviteCode_key" ON "businesses"("inviteCode");
