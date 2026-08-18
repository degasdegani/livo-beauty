import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { releaseFoundingSlot } from "@/lib/billing/founding-slots"
import { cancelAsaasSubscription } from "@/lib/asaas"

const PAST_DUE_GRACE_DAYS = 3

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // a) PAST_DUE ha mais de 3 dias -> BLOCKED
  const graceThreshold = new Date(now.getTime() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000)

  const overdueBlocked = await prisma.subscription.findMany({
    where: { status: "PAST_DUE", pastDueSince: { lte: graceThreshold } },
    select: { id: true },
  })

  for (const subscription of overdueBlocked) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "BLOCKED", blockedAt: now },
    })
  }

  // b) TRIALING expirado sem conversao -> CANCELED (libera vaga fundadora)
  const expiredTrials = await prisma.subscription.findMany({
    where: { status: "TRIALING", trialEndsAt: { lte: now } },
    select: { id: true, isFoundingMember: true, asaasSubscriptionId: true },
  })

  for (const subscription of expiredTrials) {
    // Best-effort: se o Asaas estiver fora do ar (ou a assinatura ja nao
    // existir la), loga e segue marcando CANCELED localmente mesmo assim —
    // uma assinatura orfa ativa no Asaas e recuperavel manualmente depois,
    // travar o cron inteiro por causa de UMA assinatura problematica afeta
    // todas as outras da rodada.
    if (subscription.asaasSubscriptionId) {
      try {
        await cancelAsaasSubscription(subscription.asaasSubscriptionId)
      } catch (error) {
        console.error(
          "Falha ao cancelar assinatura no Asaas (trial expirado), seguindo mesmo assim:",
          subscription.asaasSubscriptionId,
          error
        )
      }
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELED" },
    })

    if (subscription.isFoundingMember) {
      await releaseFoundingSlot()
    }
  }

  return NextResponse.json({
    blocked: overdueBlocked.length,
    trialsCanceled: expiredTrials.length,
  })
}
