"use server"

import { prisma } from "@/lib/prisma"
import { canManagePayables, requireSessionUser } from "@/lib/access"
import { saoPauloDayRange, shiftDateString, todaySaoPauloDateString } from "@/lib/datetime"
import type { PayableStatus, PaymentMethod } from "@/generated/prisma/client"

const SUMIDO_THRESHOLD_DAYS = 60

export type FaturamentoByPaymentMethod = { method: PaymentMethod; amount: number }
export type FaturamentoByProfessional = {
  professionalId: string
  professionalName: string
  amount: number
}

export type FaturamentoReport = {
  total: number
  byPaymentMethod: FaturamentoByPaymentMethod[]
  byProfessional: FaturamentoByProfessional[]
}

/**
 * Faturamento do periodo [startDate, endDate] (YYYY-MM-DD, mesmo formato de
 * saoPauloDayRange). So OWNER acessa (canManagePayables), mesma regra do
 * Financeiro.
 *
 * - total: soma das Transaction tipo RECEITA no periodo — e a mesma fonte
 *   de verdade usada no fluxo de caixa (getCashFlow), ja e o valor liquido
 *   (pos-desconto) gerado no fechamento de cada comanda.
 * - byPaymentMethod: soma de CommandPayment.amount por metodo, das comandas
 *   fechadas no periodo — pagamentos ja sao registrados sobre o valor
 *   liquido, sem precisar de nenhum ajuste.
 * - byProfessional: replica a formula de discountFactor de closeCommand
 *   (comandas/actions.ts) por comanda — itemsTotal, netTotal = itemsTotal -
 *   discountAmount, discountFactor = netTotal / itemsTotal — aplicada a
 *   cada CommandItem antes de agrupar por profissional. Isso rateia o
 *   desconto proporcionalmente entre todas as profissionais da comanda, em
 *   vez de descontar so de uma.
 */
export async function getFaturamentoReport(
  startDate: string,
  endDate: string
): Promise<FaturamentoReport> {
  const { businessId, role } = await requireSessionUser()
  if (!canManagePayables(role)) {
    throw new Error("Sem permissão para acessar relatórios.")
  }

  const { start } = saoPauloDayRange(startDate)
  const { end } = saoPauloDayRange(endDate)

  const [transactions, payments, commands] = await Promise.all([
    prisma.transaction.findMany({
      where: { businessId, type: "RECEITA", occurredAt: { gte: start, lt: end } },
      select: { amount: true },
    }),
    prisma.commandPayment.findMany({
      where: { command: { businessId, status: "FECHADA", closedAt: { gte: start, lt: end } } },
      select: { method: true, amount: true },
    }),
    prisma.command.findMany({
      where: { businessId, status: "FECHADA", closedAt: { gte: start, lt: end } },
      select: {
        discountAmount: true,
        items: {
          select: {
            unitPrice: true,
            quantity: true,
            professionalId: true,
            professional: { select: { name: true } },
          },
        },
      },
    }),
  ])

  const total = transactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0)

  const paymentsByMethod = new Map<PaymentMethod, number>()
  for (const payment of payments) {
    paymentsByMethod.set(
      payment.method,
      (paymentsByMethod.get(payment.method) ?? 0) + payment.amount.toNumber()
    )
  }
  const byPaymentMethod = Array.from(paymentsByMethod.entries())
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount)

  const byProfessionalMap = new Map<string, { professionalName: string; amount: number }>()
  for (const command of commands) {
    const itemsTotal = command.items.reduce(
      (sum, item) => sum + item.unitPrice.toNumber() * item.quantity,
      0
    )
    const netTotal = itemsTotal - command.discountAmount.toNumber()
    const discountFactor = itemsTotal > 0 ? netTotal / itemsTotal : 1

    for (const item of command.items) {
      const netItemValue = item.unitPrice.toNumber() * item.quantity * discountFactor
      const current = byProfessionalMap.get(item.professionalId)
      byProfessionalMap.set(item.professionalId, {
        professionalName: item.professional.name,
        amount: (current?.amount ?? 0) + netItemValue,
      })
    }
  }
  const byProfessional = Array.from(byProfessionalMap.entries())
    .map(([professionalId, value]) => ({
      professionalId,
      professionalName: value.professionalName,
      amount: value.amount,
    }))
    .sort((a, b) => b.amount - a.amount)

  return { total, byPaymentMethod, byProfessional }
}

export type ComissaoDetalheItem = {
  id: string
  description: string
  amount: number
  status: PayableStatus
  commandId: string | null
  clientName: string | null
  commandClosedAt: Date | null
  createdAt: Date
}

export type ComissaoByProfessional = {
  professionalId: string
  professionalName: string
  totalGerado: number
  totalPago: number
  totalPendente: number
  detalhe: ComissaoDetalheItem[]
}

export type ComissoesReport = {
  byProfessional: ComissaoByProfessional[]
}

/**
 * Comissoes do periodo [startDate, endDate] (YYYY-MM-DD). So OWNER acessa
 * (canManagePayables).
 *
 * Criterio de periodo: filtra pela data de fechamento da Command relacionada
 * (Command.closedAt), nao por Payable.createdAt. Motivo: a comissao "pertence"
 * ao periodo em que o atendimento foi de fato realizado e pago (mesmo
 * criterio do relatorio de Faturamento), nao ao instante de criacao do
 * registro — que hoje coincide (Payable e criada dentro da mesma transacao
 * do fechamento em closeCommand), mas semanticamente o que importa e quando
 * a comanda fechou. Isso tambem faz Faturamento e Comissoes sempre baterem
 * ao usar o mesmo periodo.
 */
export async function getComissoesReport(
  startDate: string,
  endDate: string
): Promise<ComissoesReport> {
  const { businessId, role } = await requireSessionUser()
  if (!canManagePayables(role)) {
    throw new Error("Sem permissão para acessar relatórios.")
  }

  const { start } = saoPauloDayRange(startDate)
  const { end } = saoPauloDayRange(endDate)

  const payables = await prisma.payable.findMany({
    where: {
      businessId,
      kind: "COMISSAO",
      professionalId: { not: null },
      command: { closedAt: { gte: start, lt: end } },
    },
    include: {
      professional: { select: { id: true, name: true } },
      payments: { select: { amount: true } },
      command: { select: { id: true, closedAt: true, client: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })

  const byProfessionalMap = new Map<
    string,
    { professionalName: string; totalGerado: number; totalPago: number; detalhe: ComissaoDetalheItem[] }
  >()

  for (const payable of payables) {
    if (!payable.professionalId || !payable.professional) continue

    const amount = payable.amount.toNumber()
    const paidAmount = payable.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0)

    const current = byProfessionalMap.get(payable.professionalId) ?? {
      professionalName: payable.professional.name,
      totalGerado: 0,
      totalPago: 0,
      detalhe: [],
    }

    current.totalGerado += amount
    current.totalPago += paidAmount
    current.detalhe.push({
      id: payable.id,
      description: payable.description,
      amount,
      status: payable.status,
      commandId: payable.command?.id ?? null,
      clientName: payable.command?.client.name ?? null,
      commandClosedAt: payable.command?.closedAt ?? null,
      createdAt: payable.createdAt,
    })

    byProfessionalMap.set(payable.professionalId, current)
  }

  const byProfessional = Array.from(byProfessionalMap.entries())
    .map(([professionalId, value]) => ({
      professionalId,
      professionalName: value.professionalName,
      totalGerado: value.totalGerado,
      totalPago: value.totalPago,
      totalPendente: value.totalGerado - value.totalPago,
      detalhe: value.detalhe,
    }))
    .sort((a, b) => b.totalGerado - a.totalGerado)

  return { byProfessional }
}

export type ClienteReportItem = {
  clientId: string
  clientName: string
  totalGasto: number
  visitas: number
  ticketMedio: number
  ultimaVisita: Date | null
}

export type ClientesReport = {
  ranking: ClienteReportItem[]
  sumidos: ClienteReportItem[]
}

/**
 * Visao consolidada de clientes — historico completo, sem filtro de
 * periodo (decisao: e um retrato de "quem sao seus clientes" ate hoje, nao
 * uma metrica de um recorte de tempo; ranking e recencia so fazem sentido
 * olhando toda a base). So OWNER acessa (canManagePayables).
 *
 * - ranking: clientes com ao menos 1 comanda fechada, por totalGasto desc.
 * - sumidos: dentre esses, os com ultimaVisita ha mais de 60 dias, por
 *   ultimaVisita asc (o mais sumido primeiro).
 */
export async function getClientesReport(): Promise<ClientesReport> {
  const { businessId, role } = await requireSessionUser()
  if (!canManagePayables(role)) {
    throw new Error("Sem permissão para acessar relatórios.")
  }

  const clients = await prisma.client.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      commands: {
        where: { status: "FECHADA" },
        select: {
          closedAt: true,
          discountAmount: true,
          items: { select: { unitPrice: true, quantity: true } },
        },
      },
    },
  })

  const withVisits: ClienteReportItem[] = []
  for (const client of clients) {
    if (client.commands.length === 0) continue

    let totalGasto = 0
    let ultimaVisita: Date | null = null
    for (const command of client.commands) {
      const itemsTotal = command.items.reduce(
        (sum, item) => sum + item.unitPrice.toNumber() * item.quantity,
        0
      )
      totalGasto += itemsTotal - command.discountAmount.toNumber()

      if (command.closedAt && (!ultimaVisita || command.closedAt > ultimaVisita)) {
        ultimaVisita = command.closedAt
      }
    }

    const visitas = client.commands.length
    withVisits.push({
      clientId: client.id,
      clientName: client.name,
      totalGasto,
      visitas,
      ticketMedio: visitas > 0 ? totalGasto / visitas : 0,
      ultimaVisita,
    })
  }

  const ranking = [...withVisits].sort((a, b) => b.totalGasto - a.totalGasto)

  const cutoffDateStr = shiftDateString(todaySaoPauloDateString(), -SUMIDO_THRESHOLD_DAYS)
  const { start: cutoff } = saoPauloDayRange(cutoffDateStr)
  const sumidos = withVisits
    .filter((client) => client.ultimaVisita && client.ultimaVisita < cutoff)
    .sort((a, b) => (a.ultimaVisita as Date).getTime() - (b.ultimaVisita as Date).getTime())

  return { ranking, sumidos }
}
