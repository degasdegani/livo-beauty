"use server"

import { prisma } from "@/lib/prisma"
import { canViewDashboardFinancials, getAppointmentsVisibleToUser, requireSessionUser } from "@/lib/access"
import { requireProfessionalId } from "@/lib/session"
import { formatTimeBR, saoPauloDayRange, shiftDateString, todaySaoPauloDateString } from "@/lib/datetime"
import { getPeriodRange } from "@/lib/period"
import { getFaturamentoReport, type FaturamentoByProfessional } from "../relatorios/actions"
import type { AppointmentStatus } from "@/generated/prisma/client"

const ACTIVE_CLIENT_WINDOW_DAYS = 90

export type DashboardTodayAppointment = {
  id: string
  time: string
  clientName: string
  serviceLabel: string
  status: AppointmentStatus
}

/**
 * Agenda do dia do dashboard — disponivel para todos os papeis, sem gate de
 * canViewDashboardFinancials (nao e dado financeiro). Reaproveita
 * getAppointmentsVisibleToUser (mesmo recorte por role usado em
 * agenda/page.tsx: OWNER/STAFF veem tudo, PROFESSIONAL so os proprios).
 * Diferente da Agenda, aqui e so uma lista — sem os campos de layout de
 * grade (startMinutes, room, etc), nem o filtro por professionalIds do
 * negocio (o where de getAppointmentsVisibleToUser ja basta).
 */
export async function getDashboardTodayAppointments(): Promise<DashboardTodayAppointment[]> {
  const appointmentsVisibleWhere = await getAppointmentsVisibleToUser()
  const { start, end } = saoPauloDayRange(todaySaoPauloDateString())

  const appointments = await prisma.appointment.findMany({
    where: {
      ...appointmentsVisibleWhere,
      startAt: { gte: start, lt: end },
    },
    include: {
      client: true,
      services: { include: { service: true } },
    },
    orderBy: { startAt: "asc" },
  })

  return appointments.map((appointment) => ({
    id: appointment.id,
    time: formatTimeBR(appointment.startAt),
    clientName: appointment.client.name,
    serviceLabel: appointment.services.map((service) => service.service.name).join(", "),
    status: appointment.status,
  }))
}

export type DashboardOwnerKpis = {
  revenueToday: number
  revenueMonth: number
  newClientsThisMonth: number
  activeClients: number
  byProfessional: FaturamentoByProfessional[]
}

/**
 * KPIs financeiros do dashboard, so OWNER (canViewDashboardFinancials).
 *
 * - revenueToday/revenueMonth/byProfessional: reaproveita getFaturamentoReport
 *   (mesma fonte de verdade do relatorio de Faturamento), chamado com
 *   (hoje, hoje) e (primeiro dia do mes corrente, hoje) — sem reimplementar
 *   calculo de fuso horario. byProfessional vem pronto do relatorio do mes,
 *   ja ordenado por valor desc, sem query adicional (reaproveitado tambem
 *   pela secao "Desempenho de profissionais" da Fase 2).
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
    byProfessional: faturamentoMes.byProfessional,
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

export type DashboardRevenuePoint = { date: string; label: string; amount: number }

/** Date (instante) -> YYYY-MM-DD em horario de Brasilia — so pra agrupar a Transaction por dia do grafico. */
function saoPauloDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/** YYYY-MM-DD -> "DD/MM", rotulo curto pro eixo X do grafico. */
function shortDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-")
  return `${day}/${month}`
}

/**
 * Serie diaria de receita dos ultimos `days` dias (incluindo hoje), so OWNER
 * (canViewDashboardFinancials). Uma unica query de Transaction RECEITA no
 * periodo, agrupada em memoria por dia em horario de Brasilia — dias sem
 * nenhuma transacao entram com amount 0 (nunca pulados), pra o grafico
 * manter o espacamento correto no eixo X.
 */
export async function getDashboardRevenueChart(days: 7 | 30): Promise<DashboardRevenuePoint[]> {
  const { businessId, role } = await requireSessionUser()
  if (!canViewDashboardFinancials(role)) {
    throw new Error("Sem permissão para acessar o gráfico de receita do dashboard.")
  }

  const today = todaySaoPauloDateString()
  const { start: rangeStart } = saoPauloDayRange(shiftDateString(today, -(days - 1)))
  const { end: rangeEnd } = saoPauloDayRange(today)

  const transactions = await prisma.transaction.findMany({
    where: { businessId, type: "RECEITA", occurredAt: { gte: rangeStart, lt: rangeEnd } },
    select: { amount: true, occurredAt: true },
  })

  const amountByDate = new Map<string, number>()
  for (const transaction of transactions) {
    const dateStr = saoPauloDateString(transaction.occurredAt)
    amountByDate.set(dateStr, (amountByDate.get(dateStr) ?? 0) + transaction.amount.toNumber())
  }

  const points: DashboardRevenuePoint[] = []
  for (let i = 0; i < days; i++) {
    const dateStr = shiftDateString(today, -(days - 1) + i)
    points.push({
      date: dateStr,
      label: shortDateLabel(dateStr),
      amount: amountByDate.get(dateStr) ?? 0,
    })
  }

  return points
}
