-- CreateTable
CREATE TABLE "asaas_webhook_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asaas_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_asaasSubscriptionId_idx" ON "subscriptions"("asaasSubscriptionId");
