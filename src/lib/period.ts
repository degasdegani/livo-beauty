import { shiftDateString, todaySaoPauloDateString } from "@/lib/datetime"

export type PeriodPreset = "hoje" | "semana" | "mes" | "ano" | "personalizado"

export type PeriodRange = { start: string; end: string }

/**
 * Dias desde a segunda-feira mais recente, dado o retorno de Date.getUTCDay()
 * (0 = domingo .. 6 = sabado). Segunda = 0, domingo = 6.
 */
function daysSinceMonday(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7
}

/**
 * Resolve um preset de periodo (Hoje/Semana/Mes/Ano/Personalizado) para um
 * range [start, end] no formato YYYY-MM-DD, em horario de Brasilia — mesmo
 * formato de string consumido por saoPauloDayRange (lib/datetime). O "fim"
 * de todo preset fixo e sempre hoje (nao o fim do periodo calendario), ja
 * que os relatorios olham para tras, nao para o futuro.
 */
export function getPeriodRange(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string
): PeriodRange {
  const today = todaySaoPauloDateString()

  switch (preset) {
    case "hoje":
      return { start: today, end: today }

    case "semana": {
      const [year, month, day] = today.split("-").map(Number)
      const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
      const monday = shiftDateString(today, -daysSinceMonday(dayOfWeek))
      return { start: monday, end: today }
    }

    case "mes": {
      const [year, month] = today.split("-")
      return { start: `${year}-${month}-01`, end: today }
    }

    case "ano": {
      const [year] = today.split("-")
      return { start: `${year}-01-01`, end: today }
    }

    case "personalizado": {
      if (!customStart || !customEnd) {
        throw new Error("Periodo personalizado exige data inicial e final.")
      }
      return { start: customStart, end: customEnd }
    }
  }
}
