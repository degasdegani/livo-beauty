-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('ABERTA', 'FECHADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CommandItemType" AS ENUM ('SERVICO', 'PRODUTO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "PayableStatus" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PayableKind" AS ENUM ('COMISSAO', 'FORNECEDOR', 'DESPESA_MANUAL', 'OUTRO');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "hasReception" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "commands" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "clientId" TEXT NOT NULL,
    "status" "CommandStatus" NOT NULL DEFAULT 'ABERTA',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_items" (
    "id" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "type" "CommandItemType" NOT NULL,
    "serviceId" TEXT,
    "productId" TEXT,
    "professionalId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_payments" (
    "id" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_products" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "professional_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "commandId" TEXT,
    "payableId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" "PayableKind" NOT NULL,
    "status" "PayableStatus" NOT NULL DEFAULT 'PENDENTE',
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "professionalId" TEXT,
    "supplierId" TEXT,
    "commandId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commands_appointmentId_key" ON "commands"("appointmentId");

-- CreateIndex
CREATE INDEX "commands_businessId_idx" ON "commands"("businessId");

-- CreateIndex
CREATE INDEX "command_items_commandId_idx" ON "command_items"("commandId");

-- CreateIndex
CREATE INDEX "command_payments_commandId_idx" ON "command_payments"("commandId");

-- CreateIndex
CREATE UNIQUE INDEX "professional_products_professionalId_productId_key" ON "professional_products"("professionalId", "productId");

-- CreateIndex
CREATE INDEX "transactions_businessId_idx" ON "transactions"("businessId");

-- CreateIndex
CREATE INDEX "payables_businessId_idx" ON "payables"("businessId");

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_items" ADD CONSTRAINT "command_items_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_items" ADD CONSTRAINT "command_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_items" ADD CONSTRAINT "command_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_items" ADD CONSTRAINT "command_items_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_payments" ADD CONSTRAINT "command_payments_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "commands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_products" ADD CONSTRAINT "professional_products_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_products" ADD CONSTRAINT "professional_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
