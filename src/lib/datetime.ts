// Brasil nao tem horario de verao desde 2019 -> offset fixo -03:00.
// Evita depender do TZ do processo Node (ex: Vercel roda em UTC por padrao),
// que causaria agendamentos deslocados em 3h em producao.
const TIME_ZONE = "America/Sao_Paulo"

/** Date (instante UTC) -> valor para <input type="datetime-local"> em horario de Brasilia. */
export function toDatetimeLocalValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00"

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}

/** Valor de <input type="datetime-local"> (ex: "2026-07-18T14:30"), interpretado como horario de Brasilia -> Date. */
export function parseLocalDatetimeInput(value: string): Date {
  return new Date(`${value}:00-03:00`)
}

export function formatDateTimeBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatTimeBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
