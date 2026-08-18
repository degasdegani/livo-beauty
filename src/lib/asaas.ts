// Cliente da API do Asaas (gateway de pagamento das assinaturas). Ver
// docs/adr para a decisao de nao usar split de pagamento no MVP (CLAUDE.md,
// secao "Fora de escopo do MVP").

const ASAAS_BASE_URL =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3"

/**
 * Erro tipado com o status HTTP e o corpo de resposta do Asaas, para
 * debugar erro de validacao de campo sem adivinhar (a API do Asaas retorna
 * detalhe do campo invalido no corpo do erro).
 */
export class AsaasApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`Asaas API error (status ${status}): ${JSON.stringify(body)}`)
    this.name = "AsaasApiError"
    this.status = status
    this.body = body
  }
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: process.env.ASAAS_API_KEY ?? "",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new AsaasApiError(response.status, body)
  }

  return response.json() as Promise<T>
}

export type CreateAsaasCustomerParams = {
  name: string
  cpfCnpj: string
  email: string
  mobilePhone: string
}

export async function createAsaasCustomer(
  params: CreateAsaasCustomerParams
): Promise<{ id: string }> {
  return asaasFetch<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED"

export type CreateAsaasSubscriptionParams = {
  customerAsaasId: string
  billingType: AsaasBillingType
  cycle: "MONTHLY" | "YEARLY"
  value: string // decimal string vindo de PRICING, convertido pra Number aqui dentro
  nextDueDate: string // formato YYYY-MM-DD
  description: string
}

export async function createAsaasSubscription(
  params: CreateAsaasSubscriptionParams
): Promise<{ id: string }> {
  return asaasFetch<{ id: string }>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerAsaasId,
      billingType: params.billingType,
      cycle: params.cycle,
      value: Number(params.value),
      nextDueDate: params.nextDueDate,
      description: params.description,
    }),
  })
}

export type AsaasSubscription = {
  id: string
  customer: string
  status: string
  value: number
  cycle: "MONTHLY" | "YEARLY"
  billingType: AsaasBillingType
  nextDueDate: string // formato YYYY-MM-DD
}

export async function getAsaasSubscription(
  asaasSubscriptionId: string
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${asaasSubscriptionId}`, {
    method: "GET",
  })
}

export type AsaasSubscriptionPayment = {
  id: string
  invoiceUrl: string
  status: string
}

export async function getAsaasSubscriptionPayments(
  asaasSubscriptionId: string
): Promise<{ data: AsaasSubscriptionPayment[] }> {
  return asaasFetch<{ data: AsaasSubscriptionPayment[] }>(
    `/subscriptions/${asaasSubscriptionId}/payments`,
    { method: "GET" }
  )
}

export async function cancelAsaasSubscription(
  asaasSubscriptionId: string
): Promise<void> {
  await asaasFetch(`/subscriptions/${asaasSubscriptionId}`, { method: "DELETE" })
}
