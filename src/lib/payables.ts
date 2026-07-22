import type { Prisma } from "@/generated/prisma/client"

const AMOUNT_TOLERANCE_CENTS = 1

export type RegisterPayablePaymentResult =
  | { error: string; paymentId?: undefined }
  | { error?: undefined; paymentId: string }

/**
 * Registra um pagamento (parcial ou total) de uma Payable, dentro da
 * transacao (tx) aberta por quem chama — mesmo padrao de
 * openCommandForAppointment em lib/commands.ts. Cria o PayablePayment, a
 * Transaction (DESPESA) correspondente, e atualiza o status da Payable
 * (PARCIAL ou PAGO) com base na soma de todos os pagamentos ja registrados.
 */
export async function registerPayablePayment(
  tx: Prisma.TransactionClient,
  payableId: string,
  amountCents: number,
  userId: string
): Promise<RegisterPayablePaymentResult> {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { error: "Valor do pagamento deve ser maior que zero." }
  }

  const payable = await tx.payable.findUnique({
    where: { id: payableId },
    include: { payments: { select: { amount: true } } },
  })
  if (!payable) return { error: "Conta a pagar não encontrada." }

  if (payable.status === "PAGO" || payable.status === "CANCELADO") {
    return { error: "Esta conta já está paga ou cancelada." }
  }

  const paidSoFarCents = payable.payments.reduce(
    (sum, payment) => sum + Math.round(payment.amount.toNumber() * 100),
    0
  )
  const totalAmountCents = Math.round(payable.amount.toNumber() * 100)
  const newTotalPaidCents = paidSoFarCents + amountCents

  if (newTotalPaidCents > totalAmountCents + AMOUNT_TOLERANCE_CENTS) {
    return { error: "O valor pago não pode ultrapassar o valor da conta." }
  }

  const payment = await tx.payablePayment.create({
    data: {
      payableId,
      amount: amountCents / 100,
      createdByUserId: userId,
    },
  })

  await tx.transaction.create({
    data: {
      businessId: payable.businessId,
      type: "DESPESA",
      amount: amountCents / 100,
      description: payable.description,
      payableId,
    },
  })

  const isFullyPaid = Math.abs(newTotalPaidCents - totalAmountCents) <= AMOUNT_TOLERANCE_CENTS

  await tx.payable.update({
    where: { id: payableId },
    data: isFullyPaid
      ? { status: "PAGO", paidAt: new Date() }
      : { status: "PARCIAL" },
  })

  return { paymentId: payment.id }
}
