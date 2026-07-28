-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('INTERNAL', 'PUBLIC_BOOKING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NOVO_AGENDAMENTO_PUBLICO');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "clientReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "publicManageToken" TEXT,
ADD COLUMN     "source" "AppointmentSource" NOT NULL DEFAULT 'INTERNAL';

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "appointmentId" TEXT,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_professionalId_read_idx" ON "notifications"("professionalId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_publicManageToken_key" ON "appointments"("publicManageToken");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
