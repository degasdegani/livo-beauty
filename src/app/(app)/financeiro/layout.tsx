import type { ReactNode } from "react"
import { notFound } from "next/navigation"

import { canManagePayables, requireSessionUser } from "@/lib/access"
import { FinanceiroTabs } from "./financeiro-tabs"

export default async function FinanceiroLayout({
  children,
}: {
  children: ReactNode
}) {
  const { role } = await requireSessionUser()
  if (!canManagePayables(role)) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">Financeiro</h1>
        <p className="text-body-sm text-foreground-secondary">
          Contas a pagar e fluxo de caixa do salão.
        </p>
      </div>

      <FinanceiroTabs />

      {children}
    </div>
  )
}
