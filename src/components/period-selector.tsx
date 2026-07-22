"use client"

import { Button } from "@/components/ui/button"
import { getPeriodRange, type PeriodPreset } from "@/lib/period"

export type PeriodSelectorValue = { preset: PeriodPreset; start: string; end: string }

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
  { value: "personalizado", label: "Personalizado" },
]

/**
 * Seletor de periodo com atalhos (Hoje/Semana/Mes/Ano/Personalizado) — vive
 * em components/ (nao em financeiro/) pensando em reuso futuro fora do
 * Financeiro. Resolve o preset em datas reais via getPeriodRange sempre que
 * o valor muda; em "Personalizado" delega o range para os dois inputs de
 * data, no mesmo estilo ja usado em cash-flow-view.tsx.
 */
export function PeriodSelector({
  value,
  customStart,
  customEnd,
  onChange,
}: {
  value: PeriodPreset
  customStart?: string
  customEnd?: string
  onChange: (next: PeriodSelectorValue) => void
}) {
  function selectPreset(preset: PeriodPreset) {
    if (preset === "personalizado") {
      const fallback = getPeriodRange("hoje")
      onChange({
        preset,
        start: customStart ?? fallback.start,
        end: customEnd ?? fallback.end,
      })
      return
    }
    onChange({ preset, ...getPeriodRange(preset) })
  }

  function handleCustomStartChange(start: string) {
    if (!start) return
    onChange({ preset: "personalizado", start, end: customEnd ?? start })
  }

  function handleCustomEndChange(end: string) {
    if (!end) return
    onChange({ preset: "personalizado", start: customStart ?? end, end })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          onPress={() => selectPreset(option.value)}
        >
          {option.label}
        </Button>
      ))}

      {value === "personalizado" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart ?? ""}
            onChange={(event) => handleCustomStartChange(event.target.value)}
            className="h-8 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span className="text-body-sm text-muted-foreground">até</span>
          <input
            type="date"
            value={customEnd ?? ""}
            onChange={(event) => handleCustomEndChange(event.target.value)}
            className="h-8 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      ) : null}
    </div>
  )
}
