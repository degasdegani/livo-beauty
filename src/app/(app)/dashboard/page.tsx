import { redirect } from "next/navigation"

import { canAccessDashboard, canViewDashboardFinancials, requireSessionUser } from "@/lib/access"
import { formatDecimalToBRL } from "@/lib/masks"
import { getDashboardOwnCommission, getDashboardOwnerKpis } from "./actions"

/**
 * Fase 1 do dashboard: so acesso + KPIs em numeros simples, sem grafico e
 * sem agenda do dia (Fase 2). Conteudo varia por role:
 * - OWNER: 4 KPIs financeiros (getDashboardOwnerKpis).
 * - PROFESSIONAL: comissao propria do mes (getDashboardOwnCommission).
 * - STAFF: placeholder — a secao principal dela (agenda do dia) vem na Fase 2.
 */
export default async function DashboardPage() {
  const { role } = await requireSessionUser()

  if (!canAccessDashboard(role)) {
    redirect("/login")
  }

  if (canViewDashboardFinancials(role)) {
    const kpis = await getDashboardOwnerKpis()
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Receita hoje" value={formatDecimalToBRL(kpis.revenueToday)} />
        <KpiCard title="Receita do mês" value={formatDecimalToBRL(kpis.revenueMonth)} />
        <KpiCard title="Novos clientes no mês" value={String(kpis.newClientsThisMonth)} />
        <KpiCard title="Clientes ativos" value={String(kpis.activeClients)} />
      </div>
    )
  }

  if (role === "PROFESSIONAL") {
    const commission = await getDashboardOwnCommission()
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Comissão gerada no mês"
          value={formatDecimalToBRL(commission.totalGeradoMes)}
        />
        <KpiCard
          title="Comissão pendente"
          value={formatDecimalToBRL(commission.totalPendente)}
        />
      </div>
    )
  }

  return (
    <p className="text-body-sm text-muted-foreground">
      Nenhum dado financeiro disponível para o seu perfil.
    </p>
  )
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
      <span className="text-body-sm text-foreground-secondary">{title}</span>
      <span className="text-h3 font-medium text-foreground">{value}</span>
    </div>
  )
}
