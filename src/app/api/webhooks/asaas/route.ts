import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { parseDateOnlyInput } from "@/lib/datetime"
import { getAsaasSubscription } from "@/lib/asaas"
import { Prisma } from "@/generated/prisma/client"

// Webhook do Asaas (gateway de pagamento). Registrado manualmente no painel
// Asaas (Integracoes > Webhooks) — ver docs/adr. NAO mexer na exigencia de
// SEMPRE responder 2xx rapido: resposta nao-2xx faz o Asaas re-enfileirar e,
// em casos recorrentes, interromper a fila de sincronizacao da conta INTEIRA
// (afeta o LIVO Barber tambem, mesma conta Asaas). So a falha de
// autenticacao (401) e excecao a essa regra.

type AsaasWebhookPayload = {
  id?: string
  event?: string
  payment?: {
    id?: string
    subscription?: string
    status?: string
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("asaas-access-token")

  if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: AsaasWebhookPayload
  try {
    payload = await request.json()
  } catch {
    // Corpo ilegivel nao e algo que reprocessar vai consertar — loga e
    // responde 200 pra nao entrar em loop de reentrega.
    console.error("Webhook Asaas: corpo da requisicao nao e JSON valido.")
    return NextResponse.json({ ignored: true })
  }

  const { id: eventId, event, payment } = payload

  if (!eventId || !event) {
    console.error("Webhook Asaas: payload sem id/event.", payload)
    return NextResponse.json({ ignored: true })
  }

  // Idempotencia: tenta criar a linha do evento. Se ja existir (unique
  // constraint em "id"), e reentrega "at least once" do Asaas — nao e erro,
  // so nao reprocessa.
  try {
    await prisma.asaasWebhookEvent.create({ data: { id: eventId, event } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    throw error
  }

  const asaasSubscriptionId = payment?.subscription

  if (!asaasSubscriptionId) {
    return NextResponse.json({ ignored: true })
  }

  const subscription = await prisma.subscription.findFirst({
    where: { asaasSubscriptionId },
  })

  if (!subscription) {
    // Evento de uma cobranca que nao e desta assinatura (ou de outra origem
    // na mesma conta Asaas, ex: LIVO Barber). Nao e erro nosso.
    return NextResponse.json({ ignored: true })
  }

  try {
    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        const asaasSubscription = await getAsaasSubscription(asaasSubscriptionId)

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            pastDueSince: null,
            blockedAt: null,
            currentPeriodEnd: parseDateOnlyInput(asaasSubscription.nextDueDate),
          },
        })
        break
      }

      case "PAYMENT_OVERDUE": {
        // So transiciona ACTIVE -> PAST_DUE. Se ja estiver PAST_DUE/BLOCKED,
        // nao sobrescreve pastDueSince (evita resetar a contagem de carencia
        // por reentrega duplicada do mesmo evento ou eventos fora de ordem).
        // TRIALING nao e afetado aqui — expiracao de trial e responsabilidade
        // do cron /api/cron/subscription-billing, nao deste evento.
        if (subscription.status === "ACTIVE") {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "PAST_DUE", pastDueSince: new Date() },
          })
        }
        break
      }

      default:
        // Sem acao automatica pra outros eventos neste MVP (ex: estorno,
        // exclusao) — fica pra revisao manual no painel do Asaas.
        console.log(`Webhook Asaas: evento "${event}" recebido, sem acao automatica.`)
    }
  } catch (error) {
    // Erro de verdade processando um evento que reconhecemos (ex: Asaas fora
    // do ar, banco indisponivel) — aqui SIM queremos que o Asaas reentregue,
    // diferente dos casos acima (evento ignorado de proposito).
    console.error("Webhook Asaas: falha ao processar evento", event, error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
