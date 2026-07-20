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

export function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

/** Data corrente (ex: "2026-07-18") em horario de Brasilia, formato YYYY-MM-DD. */
export function todaySaoPauloDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function isValidDateString(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** dateStr (YYYY-MM-DD) + minutos desde meia-noite -> Date, em horario de Brasilia. */
export function combineSaoPauloDateAndMinutes(
  dateStr: string,
  minutesSinceMidnight: number
): Date {
  const hh = String(Math.floor(minutesSinceMidnight / 60)).padStart(2, "0")
  const mm = String(minutesSinceMidnight % 60).padStart(2, "0")
  return new Date(`${dateStr}T${hh}:${mm}:00-03:00`)
}

/** Faixa [inicio, fim) do dia (00:00 a 00:00 do dia seguinte) em horario de Brasilia. */
export function saoPauloDayRange(dateStr: string): { start: Date; end: Date } {
  const start = combineSaoPauloDateAndMinutes(dateStr, 0)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

/** dateStr (YYYY-MM-DD) +/- N dias, sem depender do fuso horario do navegador. */
export function shiftDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Data sem horario (ex: data de nascimento). Armazenada ao meio-dia UTC —
 * qualquer fuso do processo (-12h a +14h) ainda cai no mesmo dia calendario
 * ao formatar de volta, sem depender de America/Sao_Paulo.
 */
export function parseDateOnlyInput(value: string): Date {
  return new Date(`${value}T12:00:00Z`)
}

/** Date armazenado (ver parseDateOnlyInput) -> valor para <input type="date">. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Rotulo por extenso (ex: "sexta-feira, 18 de julho de 2026") para o cabecalho da agenda. */
export function formatSaoPauloDateLabel(dateStr: string): string {
  // Meio-dia evita qualquer ambiguidade de fronteira de dia ao converter.
  const date = new Date(`${dateStr}T12:00:00-03:00`)
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}
