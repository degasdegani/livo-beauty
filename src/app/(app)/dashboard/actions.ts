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
 * Serie diaria de receita no intervalo [startDateStr, endDateStr] (ambos
 * YYYY-MM-DD, inclusive). Uma unica query de Transaction RECEITA no periodo,
 * agrupada em memoria por dia em horario de Brasilia — dias sem nenhuma
 * transacao entram com amount 0 (nunca pulados), pra series e graficos
 * manterem o espacamento correto no eixo X. Sem gate proprio — quem chama
 * (getDashboardRevenueChart, getDashboardKpiTrends) ja checa
 * canViewDashboardFinancials antes.
 */
async function getRevenueDailySeries(
  startDateStr: string,
  endDateStr: string
): Promise<DashboardRevenuePoint[]> {
  const { businessId } = await requireSessionUser()

  const { start: rangeStart } = saoPauloDayRange(startDateStr)
  const { end: rangeEnd } = saoPauloDayRange(endDateStr)

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
  let cursor = startDateStr
  while (cursor <= endDateStr) {
    points.push({
      date: cursor,
      label: shortDateLabel(cursor),
      amount: amountByDate.get(cursor) ?? 0,
    })
    cursor = shiftDateString(cursor, 1)
  }

  return points
}

/**
 * Serie diaria de receita dos ultimos `days` dias (incluindo hoje), so OWNER
 * (canViewDashboardFinancials). So calcula o range e delega pra
 * getRevenueDailySeries.
 */
export async function getDashboardRevenueChart(days: 7 | 30): Promise<DashboardRevenuePoint[]> {
  const { role } = await requireSessionUser()
  if (!canViewDashboardFinancials(role)) {
    throw new Error("Sem permissão para acessar o gráfico de receita do dashboard.")
  }

  const today = todaySaoPauloDateString()
  return getRevenueDailySeries(shiftDateString(today, -(days - 1)), today)
}

/**
 * Variacao percentual de `current` em relacao a `previous`, arredondamento
 * fica a cargo de quem exibe. previous === 0 e um caso especial: nao ha base
 * de comparacao, entao retorna null em vez de Infinity/NaN — a UI mostra
 * "Novo" nesse caso. Se ambos forem 0, a variacao e 0 (nada mudou).
 *
 * INVARIANTE: com a logica atual, o retorno null so acontece quando
 * `current > 0` (previous === 0 e current > 0) — ou seja, null e sempre um
 * caso "positivo sem base de comparacao". A UI (KpiCard em page.tsx) depende
 * disso pra estilizar o badge "Novo" como crescimento (seta ▲, cor success).
 * Se esta funcao mudar pra retornar null em outro cenario nao-positivo, esse
 * branch da UI precisa ser revisado junto.
 */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0
  return ((current - previous) / previous) * 100
}

/** Soma corrida de um array de numeros — usado pros sparklines "cumulativos" (receita do mes, novos clientes). */
function cumulativeSum(values: number[]): number[] {
  let running = 0
  return values.map((value) => (running += value))
}

/**
 * Quantidade de dias decorridos no mes corrente ate hoje, contando o
 * primeiro dia (dia 1 = 1 dia decorrido). Usado pra recortar o "mesmo
 * intervalo de dias" no mes anterior nas comparacoes de tendencia.
 */
function daysElapsedInMonth(monthStartStr: string, todayStr: string): number {
  const [, , startDay] = monthStartStr.split("-").map(Number)
  const [, , todayDay] = todayStr.split("-").map(Number)
  return todayDay - startDay + 1
}

/** Ultimo dia (YYYY-MM-DD) do mes anterior ao de `dateStr`. */
function previousMonthLastDay(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number)
  const lastDayOfPrevMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(lastDayOfPrevMonth).padStart(2, "0")}`
}

/** Primeiro dia (YYYY-MM-DD) do mes anterior ao de `dateStr`. */
function previousMonthFirstDay(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`
}

export type DashboardKpiTrend = { changePct: number | null; sparkline: number[] }
export type DashboardKpiTrends = {
  revenueToday: DashboardKpiTrend
  revenueMonth: DashboardKpiTrend
  newClientsThisMonth: DashboardKpiTrend
  activeClients: DashboardKpiTrend
}

/**
 * Sparklines + variacao percentual dos 4 KPI cards do dashboard OWNER, so
 * OWNER (canViewDashboardFinancials). Cada trend usa a comparacao que faz
 * sentido pro tipo de metrica:
 *
 * - revenueToday: hoje vs ontem — a comparacao mais natural pra um numero
 *   que reseta todo dia. Sparkline = ultimos 7 dias de receita diaria.
 * - revenueMonth: mes corrente (ate hoje) vs "mesmo intervalo de dias" do
 *   mes anterior — NAO vs mes anterior inteiro, porque isso seria injusto
 *   no dia 3 do mes (comparando 3 dias de receita contra ~30). Sparkline =
 *   soma corrida da receita diaria desde o inicio do mes (curva sempre
 *   crescente, mostra o ritmo de acumulo).
 * - newClientsThisMonth: mesma logica de "mesmo intervalo de dias" do mes
 *   anterior, pelo mesmo motivo (nao penalizar/favorecer inicio de mes).
 *   Sparkline = contagem cumulativa de clientes novos dia a dia no mes.
 * - activeClients: hoje vs a mesma metrica calculada 30 dias atras — mostra
 *   se a base ativa esta crescendo ou encolhendo ao longo do ultimo mes,
 *   mais informativo que comparar contra ontem (janela de 90 dias muda
 *   pouco de um dia pro outro). Sparkline = clientes ativos em cada um dos
 *   ultimos 7 dias (7 janelas moveis de 90 dias, uma por dia).
 */
export async function getDashboardKpiTrends(): Promise<DashboardKpiTrends> {
  const { businessId, role } = await requireSessionUser()
  if (!canViewDashboardFinancials(role)) {
    throw new Error("Sem permissão para acessar as tendências dos KPIs do dashboard.")
  }

  const today = todaySaoPauloDateString()
  const yesterday = shiftDateString(today, -1)
  const { start: monthStart } = getPeriodRange("mes")

  const prevMonthStart = previousMonthFirstDay(monthStart)
  const prevMonthLastDay = previousMonthLastDay(monthStart)
  const daysElapsed = daysElapsedInMonth(monthStart, today)
  const daysInPrevMonth = Number(prevMonthLastDay.split("-")[2])
  const prevMonthEquivalentEnd = shiftDateString(
    prevMonthStart,
    Math.min(daysElapsed - 1, daysInPrevMonth - 1)
  )

  /**
   * Janela [start, end) de atividade "ativo em `dateStr`": dos 90 dias
   * anteriores ate o fim do proprio `dateStr` (nao ate agora) — sem o `lt`,
   * toda query de "ativo num dia do passado" contaria atividade ate hoje,
   * achatando o sparkline e invalidando a comparacao com dias anteriores.
   */
  const activeWindowForDay = (dateStr: string) => {
    const { start } = saoPauloDayRange(shiftDateString(dateStr, -ACTIVE_CLIENT_WINDOW_DAYS))
    const { end } = saoPauloDayRange(dateStr)
    return { start, end }
  }
  const activeClientsMonthAgoWindow = activeWindowForDay(shiftDateString(today, -30))

  const [
    revenueTodaySparklinePoints,
    revenueMonthSeries,
    faturamentoHoje,
    faturamentoOntem,
    faturamentoMesAtual,
    faturamentoMesAnteriorEquivalente,
    newClientsThisMonthByDay,
    newClientsPrevMonthEquivalentCount,
    activeClientsByDay,
    activeClientsMonthAgo,
  ] = await Promise.all([
    getRevenueDailySeries(shiftDateString(today, -6), today),
    getRevenueDailySeries(monthStart, today),
    getFaturamentoReport(today, today),
    getFaturamentoReport(yesterday, yesterday),
    getFaturamentoReport(monthStart, today),
    getFaturamentoReport(prevMonthStart, prevMonthEquivalentEnd),
    prisma.client.findMany({
      where: {
        businessId,
        createdAt: { gte: saoPauloDayRange(monthStart).start, lt: saoPauloDayRange(today).end },
      },
      select: { createdAt: true },
    }),
    prisma.client.count({
      where: {
        businessId,
        createdAt: {
          gte: saoPauloDayRange(prevMonthStart).start,
          lt: saoPauloDayRange(prevMonthEquivalentEnd).end,
        },
      },
    }),
    Promise.all(
      Array.from({ length: 7 }, (_, i) => shiftDateString(today, -6 + i)).map((dateStr) => {
        const { start, end } = activeWindowForDay(dateStr)
        return prisma.client.count({
          where: {
            businessId,
            OR: [
              { commands: { some: { status: "FECHADA", closedAt: { gte: start, lt: end } } } },
              { appointments: { some: { startAt: { gte: start, lt: end } } } },
            ],
          },
        })
      })
    ),
    prisma.client.count({
      where: {
        businessId,
        OR: [
          {
            commands: {
              some: {
                status: "FECHADA",
                closedAt: { gte: activeClientsMonthAgoWindow.start, lt: activeClientsMonthAgoWindow.end },
              },
            },
          },
          {
            appointments: {
              some: { startAt: { gte: activeClientsMonthAgoWindow.start, lt: activeClientsMonthAgoWindow.end } },
            },
          },
        ],
      },
    }),
  ])

  const newClientsByDate = new Map<string, number>()
  for (const client of newClientsThisMonthByDay) {
    const dateStr = saoPauloDateString(client.createdAt)
    newClientsByDate.set(dateStr, (newClientsByDate.get(dateStr) ?? 0) + 1)
  }
  const newClientsDailyCounts: number[] = []
  let cursor = monthStart
  while (cursor <= today) {
    newClientsDailyCounts.push(newClientsByDate.get(cursor) ?? 0)
    cursor = shiftDateString(cursor, 1)
  }
  const newClientsThisMonthCount = newClientsDailyCounts.reduce((sum, n) => sum + n, 0)

  return {
    revenueToday: {
      changePct: pctChange(faturamentoHoje.total, faturamentoOntem.total),
      sparkline: revenueTodaySparklinePoints.map((point) => point.amount),
    },
    revenueMonth: {
      changePct: pctChange(faturamentoMesAtual.total, faturamentoMesAnteriorEquivalente.total),
      sparkline: cumulativeSum(revenueMonthSeries.map((point) => point.amount)),
    },
    newClientsThisMonth: {
      changePct: pctChange(newClientsThisMonthCount, newClientsPrevMonthEquivalentCount),
      sparkline: cumulativeSum(newClientsDailyCounts),
    },
    activeClients: {
      changePct: pctChange(activeClientsByDay[activeClientsByDay.length - 1], activeClientsMonthAgo),
      sparkline: activeClientsByDay,
    },
  }
}
