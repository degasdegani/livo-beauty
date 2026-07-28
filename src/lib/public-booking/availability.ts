import {
  AGENDA_WINDOW_END_MINUTES,
  AGENDA_WINDOW_START_MINUTES,
} from "@/app/(app)/agenda/constants"
import {
  hasAppointmentConflict,
  hasProfessionalBlockConflict,
} from "@/lib/appointment-conflicts"
import {
  combineSaoPauloDateAndMinutes,
  shiftDateString,
  todaySaoPauloDateString,
} from "@/lib/datetime"
import { prisma } from "@/lib/prisma"

import {
  PUBLIC_BOOKING_MAX_WINDOW_DAYS,
  PUBLIC_BOOKING_MIN_NOTICE_HOURS,
} from "./constants"

// Nao importar de day-calendar.tsx ("use client") em codigo de servidor —
// mesma armadilha documentada em agenda/constants.ts.
const SLOT_MINUTES = 30

export type AvailableSlot = { time: string; professionalId: string }

function formatMinutes(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0")
  const mm = String(minutes % 60).padStart(2, "0")
  return `${hh}:${mm}`
}

export async function getAvailableSlotsForDate(params: {
  businessId: string
  serviceId: string
  professionalId?: string | null
  dateStr: string
}): Promise<AvailableSlot[]> {
  const { businessId, serviceId, professionalId, dateStr } = params

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
  })
  if (!service) return []

  const candidates = professionalId
    ? await prisma.professional.findMany({
        where: {
          id: professionalId,
          businessId,
          category: "SERVICE_PROVIDER",
          active: true,
          services: { some: { serviceId } },
        },
        take: 1,
      })
    : await prisma.professional.findMany({
        where: {
          businessId,
          category: "SERVICE_PROVIDER",
          active: true,
          services: { some: { serviceId } },
        },
      })
  if (candidates.length === 0) return []

  const maxDateStr = shiftDateString(
    todaySaoPauloDateString(),
    PUBLIC_BOOKING_MAX_WINDOW_DAYS
  )
  if (dateStr > maxDateStr) return []

  const minNoticeThreshold = new Date(
    Date.now() + PUBLIC_BOOKING_MIN_NOTICE_HOURS * 60 * 60 * 1000
  )

  const result: AvailableSlot[] = []

  for (const candidate of candidates) {
    for (
      let startMinutes = AGENDA_WINDOW_START_MINUTES;
      startMinutes + service.durationMinutes <= AGENDA_WINDOW_END_MINUTES;
      startMinutes += SLOT_MINUTES
    ) {
      const startAt = combineSaoPauloDateAndMinutes(dateStr, startMinutes)
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000)

      if (startAt < minNoticeThreshold) continue

      if (await hasAppointmentConflict(candidate.id, startAt, endAt)) continue
      if (await hasProfessionalBlockConflict(candidate.id, startAt, endAt)) continue

      result.push({ time: formatMinutes(startMinutes), professionalId: candidate.id })
    }
  }

  return result
}
