"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { canManagePayables, requireSessionUser } from "@/lib/access"
import { registerPayablePayment } from "@/lib/payables"
import { saoPauloDayRange } from "@/lib/datetime"
import type { PayableKind, PayableStatus } from "@/generated/prisma/client"

export type PayableListItem = {
  id: string
  kind: PayableKind
  status: PayableStatus
  description: string
  amount: number
  paidAmount: number
  remainingAmount: number
  dueDate: Date | null
  paidAt: Date | null
  professionalName: string | null
  supplierName: string | null
  createdAt: Date
}

/**
 * Lista de contas a pagar do negocio, com valor ja pago e valor restante
 * calculados a partir da soma de PayablePayment (nao persistidos na propria
 * Payable, pra nao arriscar desincronia). So OWNER acessa (canManagePayables).
 */
export async function listPayables(
  filters: { kind?: PayableKind; status?: PayableStatus } = {}
): Promise<PayableListItem[]> {
  const { businessId, role } = await requireSessionUser()
  if (!canManagePayables(role)) {
    throw new Error("Sem permissão para acessar o financeiro.")
  }

  const payables = await prisma.payable.findMany({
    where: {
      businessId,
      ...(filters.kind ? { kind: filters.kind } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      payments: { select: { amount: true } },
      professional: { select: { name: true } },
      supplier: { select: { name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  })

  return payables.map((payable) => {
    const amount = payable.amount.toNumber()
    const paidAmount = payable.payments.reduce(
      (sum, payment) => sum + payment.amount.toNumber(),
      0
    )

    return {
      id: payable.id,
      kind: payable.kind,
      status: payable.status,
      description: payable.description,
      amount,
      paidAmount,
      remainingAmount: Math.max(amount - paidAmount, 0),
      dueDate: payable.dueDate,
      paidAt: payable.paidAt,
      professionalName: payable.professional?.name ?? null,
      supplierName: payable.supplier?.name ?? null,
      createdAt: payable.createdAt,
    }
  })
}

export type PayableDetailPayment = {
  id: string
  amount: number
  paidAt: Date
  createdByName: string | null
}

export type PayableDetail = {
  id: string
  kind: PayableKind
  status: PayableStatus
  description: string
  amount: number
  paidAmount: number
  remainingAmount: number
  dueDate: Date | null
  paidAt: Date | null
  professionalName: string | null
  supplierName: string | null
  payments: PayableDetailPayment[]
}

export type PayableDetailResult =
  | { error: string; detail?: undefined }
  | { error?: undefined; detail: PayableDetail }

/** Detalhe de uma Payable + historico de pagamentos. So OWNER acessa (canManagePayables). */
export async function getPayableDetail(payableId: string): Promise<PayableDetailResult> {
  const { businessId, role } = await requireSessionUser()
  if (!canManagePayables(role)) {
    throw new Error("Sem permissão para acessar o financeiro.")
  }

  const payable = await prisma.payable.findFirst({
    where: { id: payableId, businessId },
    include: {
      professional: { select: { name: true } },
      supplier: { select: { name: true } },
      payments: {
        orderBy: { paidAt: "asc" },
        include: { createdBy: { select: { name: true } } },
      },
    },
  })
  if (!payable) return { error: "Conta a pagar não encontrada." }

  const amount = payable.amount.toNumber()
  const paidAmount = payable.payments.reduce(
    (sum, payment) => sum + payment.amount.toNumber(),
    0
  )

  return {
    detail: {
      id: payable.id,
      kind: payable.kind,
      status: payable.status,
      description: payable.description,
      amount,
      paidAmount,
      remainingAmount: Math.max(amount - paidAmount, 0),
      dueDate: payable.dueDate,
      paidAt: payable.paidAt,
      professionalName: payable.professional?.name ?? null,
      supplierName: payable.supplier?.name ?? null,
      payments: payable.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toNumber(),
        paidAt: payment.paidAt,
        createdByName: payment.createdBy.name,
      })),
    },
  }
}

export type PayPayableResult = { error?: string }

/**
 * Registra pagamento (parcial ou total) de uma Payable do proprio negocio.
 * So OWNER (canManagePayables) — mesma regra usada pra ver a tela.
 */
export async function payPayable(
  payableId: string,
  amountCents: number
): Promise<PayPayableResult> {
  const { userId, businessId, role } = await requireSessionUser()
  if (!canManagePayables(role)) {
    throw new Error("Sem permissão para registrar pagamento.")
  }

  const payable = await prisma.payable.findFirst({
    where: { id: payableId, businessId },
    select: { id: true },
  })
  if (!payable) return { error: "Conta a pagar não encontrada." }

  const result = await prisma.$transaction((tx) =>
    registerPayablePayment(tx, payableId, amountCents, userId)
  )
  if (result.error) return { error: result.error }

  revalidatePath("/financeiro")

  return {}
}

export type CashFlowResult = {
  totalReceita: number
  totalDespesa: number
  balance: number
}

/**
 * Soma de Transaction (RECEITA - DESPESA) do negocio no periodo
 * [startDate, endDate], ambos no formato YYYY-MM-DD (mesmo padrao de
 * saoPauloDayRange em lib/datetime). So OWNER acessa (canManagePayables).
 */
export async function getCashFlow(
  startDate: string,
  endDate: string
): Promise<CashFlowResult> {
  const { businessId, role } = await requireSessionUser()
  if (!canManagePayables(role)) {
    throw new Error("Sem permissão para acessar o financeiro.")
  }

  const { start } = saoPauloDayRange(startDate)
  const { end } = saoPauloDayRange(endDate)

  const transactions = await prisma.transaction.findMany({
    where: { businessId, occurredAt: { gte: start, lt: end } },
    select: { type: true, amount: true },
  })

  const totalReceita = transactions
    .filter((transaction) => transaction.type === "RECEITA")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0)
  const totalDespesa = transactions
    .filter((transaction) => transaction.type === "DESPESA")
    .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0)

  return {
    totalReceita,
    totalDespesa,
    balance: totalReceita - totalDespesa,
  }
}
