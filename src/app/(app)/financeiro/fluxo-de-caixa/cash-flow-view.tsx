"use client"

import * as React from "react"

import { PeriodSelector, type PeriodSelectorValue } from "@/components/period-selector"
import { formatDecimalToBRL } from "@/lib/masks"
import type { PeriodPreset } from "@/lib/period"
import { getCashFlow, type CashFlowResult } from "../actions"

export function CashFlowView({
  initialPreset,
  initialStart,
  initialEnd,
  initialResult,
}: {
  initialPreset: PeriodPreset
  initialStart: string
  initialEnd: string
  initialResult: CashFlowResult
}) {
  const [period, setPeriod] = React.useState<PeriodSelectorValue>({
    preset: initialPreset,
    start: initialStart,
    end: initialEnd,
  })
  const [result, setResult] = React.useState(initialResult)
  const [isPending, startTransition] = React.useTransition()

  function handlePeriodChange(next: PeriodSelectorValue) {
    setPeriod(next)
    startTransition(async () => {
      const nextResult = await getCashFlow(next.start, next.end)
      setResult(nextResult)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PeriodSelector
        value={period.preset}
        customStart={period.preset === "personalizado" ? period.start : undefined}
        customEnd={period.preset === "personalizado" ? period.end : undefined}
        onChange={handlePeriodChange}
      />

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
          <span className="text-body-sm text-foreground-secondary">
            Total receita
          </span>
          <span className="text-h3 font-medium text-success">
            {formatDecimalToBRL(result.totalReceita)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
          <span className="text-body-sm text-foreground-secondary">
            Total despesa
          </span>
          <span className="text-h3 font-medium text-error">
            {formatDecimalToBRL(result.totalDespesa)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
          <span className="text-body-sm text-foreground-secondary">Saldo</span>
          <span className="text-h3 font-medium text-foreground">
            {formatDecimalToBRL(result.balance)}
          </span>
        </div>
      </div>
    </div>
  )
}
