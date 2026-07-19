"use server"

import { unstable_rethrow } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireProfessionalId } from "@/lib/session"

export type PushSubscriptionResult = { success: boolean; error?: string }

type PushSubscriptionInput = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export async function subscribeToPush(
  subscription: PushSubscriptionInput
): Promise<PushSubscriptionResult> {
  try {
    const professionalId = await requireProfessionalId()

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return { success: false, error: "Dados de inscrição inválidos." }
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        professionalId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        professionalId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    })

    return { success: true }
  } catch (error) {
    unstable_rethrow(error)
    const message =
      error instanceof Error ? error.message : "Erro ao ativar notificações."
    return { success: false, error: message }
  }
}

export async function unsubscribeFromPush(
  endpoint: string
): Promise<PushSubscriptionResult> {
  try {
    const professionalId = await requireProfessionalId()

    if (!endpoint) {
      return { success: false, error: "Endpoint inválido." }
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, professionalId },
    })

    return { success: true }
  } catch (error) {
    unstable_rethrow(error)
    const message =
      error instanceof Error ? error.message : "Erro ao desativar notificações."
    return { success: false, error: message }
  }
}
