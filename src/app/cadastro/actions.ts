"use server"

import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { signIn } from "@/lib/auth"
import { toDateInputValue } from "@/lib/datetime"
import { claimFoundingSlot, releaseFoundingSlot } from "@/lib/billing/founding-slots"
import { PRICING } from "@/lib/billing/pricing"
import {
  AsaasApiError,
  createAsaasCustomer,
  createAsaasSubscription,
  getAsaasSubscriptionPayments,
} from "@/lib/asaas"
import { signupSchema } from "./schema"

export type SignupFormState = { error?: string }

const CYCLE_PRICE_KEY = { MONTHLY: "monthly", YEARLY: "yearly" } as const

/** "Salão de Teste" -> "salao-de-teste". Sem acento, sem espaco, so a-z0-9-. */
function slugifyBusinessName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "negocio"
}

/**
 * Business.slug e unico mas o nome do negocio nao precisa ser — dois saloes
 * podem se chamar igual. Tenta o slug "limpo" primeiro, sufixo aleatorio se
 * colidir (ate 5 tentativas antes de cair num sufixo maior/quase certo de
 * ser unico).
 */
async function buildUniqueBusinessSlug(
  name: string,
  slugExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugifyBusinessName(name)
  let candidate = base

  for (let attempt = 0; attempt < 5; attempt++) {
    if (!(await slugExists(candidate))) return candidate
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export async function signupBusiness(
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const parsed = signupSchema.safeParse({
    businessName: formData.get("businessName"),
    businessType: formData.get("businessType"),
    responsibleName: formData.get("responsibleName"),
    email: formData.get("email"),
    password: formData.get("password"),
    document: formData.get("document"),
    phone: formData.get("phone"),
    cycle: formData.get("cycle"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const {
    businessName,
    businessType,
    responsibleName,
    email,
    password,
    document,
    phone,
    cycle,
  } = parsed.data

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: "Este e-mail já está em uso. Tente outro ou faça login." }
  }

  // Reserva a vaga ANTES da transacao — se a transacao falhar depois disso,
  // o catch abaixo libera a vaga de volta (nunca deixar presa).
  const isFounding = await claimFoundingSlot()
  const priceKey = CYCLE_PRICE_KEY[cycle]
  const price = (isFounding ? PRICING.founding : PRICING.standard)[priceKey]
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  let created: {
    business: { id: string }
    user: { id: string }
    subscription: { id: string }
  }

  try {
    created = await prisma.$transaction(async (tx) => {
      const slug = await buildUniqueBusinessSlug(businessName, async (candidate) => {
        const existing = await tx.business.findUnique({
          where: { slug: candidate },
          select: { id: true },
        })
        return existing !== null
      })

      const business = await tx.business.create({
        data: { name: businessName, slug, businessType },
      })

      const passwordHash = await bcrypt.hash(password, 10)
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          role: "OWNER",
          businessId: business.id,
        },
      })

      const subscription = await tx.subscription.create({
        data: {
          businessId: business.id,
          cycle,
          status: "TRIALING",
          priceAtSignup: price,
          isFoundingMember: isFounding,
          trialEndsAt,
        },
      })

      return { business, user, subscription }
    })
  } catch (error) {
    if (isFounding) await releaseFoundingSlot()
    console.error("Falha ao criar Business/User/Subscription no cadastro:", error)
    return { error: "Não foi possível criar sua conta. Tente novamente." }
  }

  // Chamadas ao Asaas ficam FORA da transacao (rede externa). Se qualquer
  // uma falhar, e uma falha COMPENSADA: desfaz manualmente tudo que a
  // transacao ja commitou, nao so repassa o erro.
  try {
    const customer = await createAsaasCustomer({
      name: responsibleName,
      cpfCnpj: document,
      email,
      mobilePhone: phone,
    })

    const asaasSubscription = await createAsaasSubscription({
      customerAsaasId: customer.id,
      billingType: "UNDEFINED",
      cycle,
      value: price,
      nextDueDate: toDateInputValue(trialEndsAt),
      description: `LIVO Beauty — assinatura ${cycle === "MONTHLY" ? "mensal" : "anual"}`,
    })

    const payments = await getAsaasSubscriptionPayments(asaasSubscription.id)
    const invoiceUrl = payments.data[0]?.invoiceUrl ?? null

    await prisma.subscription.update({
      where: { id: created.subscription.id },
      data: {
        asaasCustomerId: customer.id,
        asaasSubscriptionId: asaasSubscription.id,
        checkoutUrl: invoiceUrl,
      },
    })
  } catch (error) {
    await prisma.subscription.delete({ where: { id: created.subscription.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: created.user.id } }).catch(() => {})
    await prisma.business.delete({ where: { id: created.business.id } }).catch(() => {})
    if (isFounding) await releaseFoundingSlot()

    if (error instanceof AsaasApiError) {
      console.error("Asaas API error no cadastro (status, body):", error.status, error.body)
    } else {
      console.error("Erro inesperado ao processar pagamento no cadastro:", error)
    }

    return {
      error: "Não foi possível processar seu cadastro. Tente novamente em instantes.",
    }
  }

  try {
    await signIn("credentials", { email, password, redirect: false })
  } catch (error) {
    // Conta e assinatura ja existem e estao ok — so a autenticacao
    // automatica falhou. Mesmo fallback ja usado no cadastro de profissional
    // (convite/actions.ts): manda pro login em vez de quebrar o fluxo.
    console.error("Falha ao autenticar automaticamente apos cadastro:", error)
    redirect("/login?cadastro=sucesso")
  }

  redirect("/cadastro/confirmacao")
}
