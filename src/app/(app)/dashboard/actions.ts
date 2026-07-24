"use server"

import { prisma } from "@/lib/prisma"
import { canViewDashboardFinancials, requireSessionUser } from "@/lib/access"
import { requireProfessionalId } from "@/lib/session"
import { saoPauloDayRange, shiftDateString, todaySaoPauloDateString } from "@/lib/datetime"
import { getPeriodRange } from "@/lib/period"
import { getFaturamentoReport } from "../relatorios/actions"

const ACTIVE_CLIENT_WINDOW_DAYS = 90

export type DashboardOwnerKpis = {
  revenueToday: number
  revenueMonth: number
  newClientsThisMonth: number
  activeClients: number
}

/**
 * KPIs financeiros do dashboard, so OWNER (canViewDashboardFinancials).
 *
 * - revenueToday/revenueMonth: reaproveita getFaturamentoReport (mesma fonte
 *   de verdade do relatorio de Faturamento), chamado com (hoje, hoje) e
 *   (primeiro dia do mes corrente, hoje) — sem reimplementar calculo de
 *   fuso horario.
 * - newClientsThisMonth: clientes cadastrados no mes corrente.
 * - activeClients: clientes com pelo menos um sinal de atividade recente
 *   (comanda fechada OU agendamento) nos ultimos 90 dias — OR no where,
 *   nao exige as duas condicoes.
 */
export async function getDashboardOwnerKpis(): Promise<DashboardOwnerKpis> {
  const { businessId, role } = await requireSessionUser()
  if (!canViewDashboardFinancials(role)) {
    throw new Error("Sem permissão para acessar os KPIs financeiros do dashboard.")
  }

  const today = todaySaoPauloDateString()
  const { start: monthStart } = getPeriodRange("mes")

  const [faturamentoHoje, faturamentoMes] = await Promise.all([
    getFaturamentoReport(today, today),
    getFaturamentoReport(monthStart, today),
  ])

  const { start: monthRangeStart } = saoPauloDayRange(monthStart)
  const { end: monthRangeEnd } = saoPauloDayRange(today)

  const activeSinceStr = shiftDateString(today, -ACTIVE_CLIENT_WINDOW_DAYS)
  const { start: activeSince } = saoPauloDayRange(activeSinceStr)

  const [newClientsThisMonth, activeClients] = await Promise.all([
    prisma.client.count({
      where: { businessId, createdAt: { gte: monthRangeStart, lt: monthRangeEnd } },
    }),
    prisma.client.count({
      where: {
        businessId,
        OR: [
          { commands: { some: { status: "FECHADA", closedAt: { gte: activeSince } } } },
          { appointments: { some: { startAt: { gte: activeSince } } } },
        ],
      },
    }),
  ])

  return {
    revenueToday: faturamentoHoje.total,
    revenueMonth: faturamentoMes.total,
    newClientsThisMonth,
    activeClients,
  }
}

export type DashboardOwnCommission = {
  totalGeradoMes: number
  totalPendente: number
}

/**
 * Comissao do proprio profissional logado, mes corrente. So role
 * PROFESSIONAL — checagem inline (nao passa por canViewDashboardFinancials,
 * que e so-OWNER; nem por canManagePayables, que e a tela de gestao).
 * Mesma logica de soma de getComissoesReport, filtrada para um unico
 * profissional (o da sessao) e sem o gate de OWNER.
 */
export async function getDashboardOwnCommission(): Promise<DashboardOwnCommission> {
  const { role } = await requireSessionUser()
  if (role !== "PROFESSIONAL") {
    throw new Error("Disponível apenas para profissionais.")
  }

  const professionalId = await requireProfessionalId()
  const { start: monthStart } = getPeriodRange("mes")
  const today = todaySaoPauloDateString()
  const { start } = saoPauloDayRange(monthStart)
  const { end } = saoPauloDayRange(today)

  const payables = await prisma.payable.findMany({
    where: {
      kind: "COMISSAO",
      professionalId,
      command: { closedAt: { gte: start, lt: end } },
    },
    select: {
      amount: true,
      payments: { select: { amount: true } },
    },
  })

  let totalGeradoMes = 0
  let totalPago = 0
  for (const payable of payables) {
    totalGeradoMes += payable.amount.toNumber()
    totalPago += payable.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0)
  }

  return { totalGeradoMes, totalPendente: totalGeradoMes - totalPago }
}
