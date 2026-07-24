import Link from "next/link"
import { redirect } from "next/navigation"

import { canAccessDashboard, canViewDashboardFinancials, requireSessionUser } from "@/lib/access"
import { formatDecimalToBRL } from "@/lib/masks"
import { Badge } from "@/components/ui/badge"
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from "../agenda/status"
import type { FaturamentoByProfessional } from "../relatorios/actions"
import {
  getDashboardKpiTrends,
  getDashboardOwnCommission,
  getDashboardOwnerKpis,
  getDashboardRevenueChart,
  getDashboardTodayAppointments,
  type DashboardKpiTrend,
  type DashboardTodayAppointment,
} from "./actions"
import { RevenueChart } from "./revenue-chart"
import { Sparkline } from "./sparkline"

/**
 * Fase 2 do dashboard: Agenda de hoje (todos os papeis) + grafico de
 * receita com toggle 7/30 dias e desempenho de profissionais (OWNER-only).
 * O toggle de periodo e via searchParams (?period=7|30), sem estado de
 * cliente — mesmo padrao de navegacao usado em agenda/page.tsx (?date=).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { role } = await requireSessionUser()

  if (!canAccessDashboard(role)) {
    redirect("/login")
  }

  const { period: periodParam } = await searchParams
  const period: 7 | 30 = periodParam === "30" ? 30 : 7

  const todayAppointments = await getDashboardTodayAppointments()

  return (
    <div className="flex flex-col gap-8">
      <TodayAppointmentsSection appointments={todayAppointments} />

      {canViewDashboardFinancials(role) ? (
        <OwnerDashboard period={period} />
      ) : role === "PROFESSIONAL" ? (
        <ProfessionalDashboard />
      ) : (
        <p className="text-body-sm text-muted-foreground">
          Nenhum dado financeiro disponível para o seu perfil.
        </p>
      )}
    </div>
  )
}

async function OwnerDashboard({ period }: { period: 7 | 30 }) {
  const [kpis, trends, chartData] = await Promise.all([
    getDashboardOwnerKpis(),
    getDashboardKpiTrends(),
    getDashboardRevenueChart(period),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receita hoje"
          value={formatDecimalToBRL(kpis.revenueToday)}
          trend={{ ...trends.revenueToday, label: "vs ontem" }}
        />
        <KpiCard
          title="Receita do mês"
          value={formatDecimalToBRL(kpis.revenueMonth)}
          trend={{ ...trends.revenueMonth, label: "vs mês anterior" }}
        />
        <KpiCard
          title="Novos clientes no mês"
          value={String(kpis.newClientsThisMonth)}
          trend={{ ...trends.newClientsThisMonth, label: "vs mês anterior" }}
        />
        <KpiCard
          title="Clientes ativos"
          value={String(kpis.activeClients)}
          trend={{ ...trends.activeClients, label: "vs 30 dias atrás" }}
        />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-body font-medium text-foreground">Receita</h2>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            <PeriodLink period={7} active={period === 7} />
            <PeriodLink period={30} active={period === 30} />
          </div>
        </div>
        <RevenueChart data={chartData} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-medium text-foreground">Desempenho de profissionais</h2>
        <ProfessionalPerformanceTable byProfessional={kpis.byProfessional} />
      </section>
    </div>
  )
}

async function ProfessionalDashboard() {
  const commission = await getDashboardOwnCommission()
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <KpiCard
        title="Comissão gerada no mês"
        value={formatDecimalToBRL(commission.totalGeradoMes)}
      />
      <KpiCard title="Comissão pendente" value={formatDecimalToBRL(commission.totalPendente)} />
    </div>
  )
}

function TodayAppointmentsSection({
  appointments,
}: {
  appointments: DashboardTodayAppointment[]
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-body font-medium text-foreground">Agenda de hoje</h2>
      {appointments.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-5 text-body-sm text-muted-foreground">
          Nenhum agendamento para hoje.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-border text-micro text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Horário</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Serviço</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-4 py-2.5 text-foreground-secondary">{appointment.time}</td>
                    <td className="px-4 py-2.5 text-foreground">{appointment.clientName}</td>
                    <td className="px-4 py-2.5 text-foreground-secondary">
                      {appointment.serviceLabel}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
                        {STATUS_LABEL[appointment.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

function ProfessionalPerformanceTable({
  byProfessional,
}: {
  byProfessional: FaturamentoByProfessional[]
}) {
  if (byProfessional.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-body-sm text-muted-foreground">
        Nenhum atendimento faturado no mês.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-border text-micro text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Profissional</th>
              <th className="px-4 py-2.5 text-right font-medium">Faturamento no mês</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {byProfessional.map((row) => (
              <tr key={row.professionalId}>
                <td className="px-4 py-2.5 text-foreground">{row.professionalName}</td>
                <td className="px-4 py-2.5 text-right font-medium text-foreground">
                  {formatDecimalToBRL(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PeriodLink({ period, active }: { period: 7 | 30; active: boolean }) {
  return (
    <Link
      href={`/dashboard?period=${period}`}
      className={`rounded-md px-3 py-1 text-body-sm transition-colors ${
        active
          ? "bg-primary-light font-medium text-primary"
          : "text-foreground-secondary hover:text-foreground"
      }`}
    >
      {period} dias
    </Link>
  )
}

function KpiCard({
  title,
  value,
  trend,
}: {
  title: string
  value: string
  trend?: DashboardKpiTrend & { label: string }
}) {
  // changePct null ou > 0 -> success (ver invariante em pctChange: null so
  // ocorre quando o valor atual e positivo, entao e sempre um caso "positivo
  // sem base de comparacao", tratado visualmente como crescimento).
  const trendColorClass =
    trend == null || trend.changePct === 0
      ? "text-muted-foreground"
      : trend.changePct == null || trend.changePct > 0
        ? "text-success"
        : "text-error"

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
      <span className="text-body-sm text-foreground-secondary">{title}</span>
      <span className="text-h3 font-medium text-foreground">{value}</span>

      {trend ? (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            {trend.changePct == null ? (
              <span className={`text-micro font-medium ${trendColorClass}`}>▲ Novo</span>
            ) : trend.changePct === 0 ? (
              <span className="text-micro font-medium text-muted-foreground">0,0%</span>
            ) : (
              <span className={`text-micro font-medium ${trendColorClass}`}>
                {trend.changePct > 0 ? "▲" : "▼"} {Math.abs(trend.changePct).toFixed(1)}%
              </span>
            )}
            <span className="text-micro text-muted-foreground">{trend.label}</span>
          </div>

          <Sparkline data={trend.sparkline} className={`h-8 w-16 shrink-0 ${trendColorClass}`} />
        </div>
      ) : null}
    </div>
  )
}
