"use client"

import * as React from "react"

import { formatDecimalToBRL } from "@/lib/masks"
import { getCashFlow, type CashFlowResult } from "../actions"

export function CashFlowView({
  initialStartDate,
  initialEndDate,
  initialResult,
}: {
  initialStartDate: string
  initialEndDate: string
  initialResult: CashFlowResult
}) {
  const [startDate, setStartDate] = React.useState(initialStartDate)
  const [endDate, setEndDate] = React.useState(initialEndDate)
  const [result, setResult] = React.useState(initialResult)
  const [isPending, startTransition] = React.useTransition()

  function reload(nextStartDate: string, nextEndDate: string) {
    startTransition(async () => {
      const nextResult = await getCashFlow(nextStartDate, nextEndDate)
      setResult(nextResult)
    })
  }

  function handleStartDateChange(value: string) {
    if (!value) return
    setStartDate(value)
    reload(value, endDate)
  }

  function handleEndDateChange(value: string) {
    if (!value) return
    setEndDate(value)
    reload(startDate, value)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(event) => handleStartDateChange(event.target.value)}
          className="h-8 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="text-body-sm text-muted-foreground">até</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => handleEndDateChange(event.target.value)}
          className="h-8 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

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
